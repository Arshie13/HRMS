import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/request-user';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  // --- leave types ---

  listTypes(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.leaveType.findMany({
        where: { tenantId },
        include: { _count: { select: { leaveRequests: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  createType(tenantId: string, dto: any) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.leaveType.create({
        data: {
          tenantId,
          name: dto.name,
          code: dto.code,
          isPaid: dto.isPaid ?? true,
          maxDaysPerYear: dto.maxDaysPerYear ?? 0,
          accrualRate: dto.accrualRate ?? 0,
          maxConsecutiveDays: dto.maxConsecutiveDays ?? null,
        },
      }),
    );
  }

  updateType(tenantId: string, id: string, dto: any) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exists = await tx.leaveType.findFirst({ where: { id, tenantId } });
      if (!exists) throw new NotFoundException('Leave type not found');
      return tx.leaveType.update({ where: { id }, data: dto });
    });
  }

  // --- balances ---

  async listBalances(tenantId: string, employeeId?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.leaveBalance.findMany({
        where: { tenantId, ...(employeeId ? { employeeId } : {}) },
        include: { employee: true, leaveType: true },
        orderBy: [{ year: 'desc' }, { leaveType: { name: 'asc' } }],
      }),
    );
  }

  private async ensureBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ) {
    const existing = await tx.leaveBalance.findUnique({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId,
          employeeId,
          leaveTypeId,
          year,
        },
      },
    });
    if (existing) return existing;

    const leaveType = await tx.leaveType.findFirst({
      where: { id: leaveTypeId, tenantId },
    });
    return tx.leaveBalance.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        year,
        balance: leaveType?.maxDaysPerYear ?? 0,
      },
    });
  }

  // --- requests ---

  async createRequest(
    tenantId: string,
    user: RequestUser,
    dto: {
      employeeId?: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      halfDay?: boolean;
      reason?: string;
    },
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = dto.employeeId
        ? await tx.employee.findFirst({
            where: { id: dto.employeeId, tenantId },
          })
        : await tx.employee.findFirst({
            where: { email: user.email, tenantId },
          });
      if (!emp) throw new NotFoundException('Employee not found');

      const leaveType = await tx.leaveType.findFirst({
        where: { id: dto.leaveTypeId, tenantId },
      });
      if (!leaveType) throw new NotFoundException('Leave type not found');

      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end < start) throw new BadRequestException('End date before start date');

      const days =
        Math.round(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
        ) + 1;
      const requestedDays = dto.halfDay ? 0.5 : days;

      if (leaveType.maxConsecutiveDays && days > leaveType.maxConsecutiveDays) {
        throw new BadRequestException(
          `Max consecutive days for ${leaveType.name} is ${leaveType.maxConsecutiveDays}`,
        );
      }

      // overlapping pending/approved requests
      const overlap = await tx.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId: emp.id,
          status: { in: ['pending', 'approved'] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (overlap) {
        throw new BadRequestException('Overlaps an existing leave request');
      }

      const year = start.getFullYear();
      const balance = await this.ensureBalance(
        tx,
        tenantId,
        emp.id,
        leaveType.id,
        year,
      );
      const available = balance.balance - balance.pendingDays;
      if (requestedDays > available) {
        throw new BadRequestException(
          `Insufficient ${leaveType.name} balance (${available} day(s) available)`,
        );
      }

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pendingDays: balance.pendingDays + requestedDays },
      });

      return tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          startDate: start,
          endDate: end,
          halfDay: dto.halfDay ?? false,
          reason: dto.reason ?? null,
        },
        include: { employee: true, leaveType: true },
      });
    }).then((request) => {
      this.events.emit('leave.requested', {
        tenantId,
        employeeEmail: request.employee.email,
        employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
        extra: request.reason ?? undefined,
      });
      return request;
    });
  }

  async listRequests(
    tenantId: string,
    employeeId?: string,
    status?: string,
  ) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.leaveRequest.findMany({
        where: {
          tenantId,
          ...(employeeId ? { employeeId } : {}),
          ...(status ? { status } : {}),
        },
        include: { employee: true, leaveType: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async getRequest(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const req = await tx.leaveRequest.findFirst({
        where: { id, tenantId },
        include: { employee: true, leaveType: true },
      });
      if (!req) throw new NotFoundException('Leave request not found');
      return req;
    });
  }

  private requestDays(req: {
    startDate: Date;
    endDate: Date;
    halfDay: boolean;
  }): number {
    const days =
      Math.round(
        (req.endDate.getTime() - req.startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    return req.halfDay ? 0.5 : days;
  }

  async review(
    tenantId: string,
    id: string,
    userId: string,
    approve: boolean,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const req = await tx.leaveRequest.findFirst({
        where: { id, tenantId },
      });
      if (!req) throw new NotFoundException('Leave request not found');
      if (req.status !== 'pending') {
        throw new BadRequestException('Request already reviewed');
      }

      const days = this.requestDays(req);
      const year = req.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year,
          },
        },
      });
      if (!balance) throw new BadRequestException('Leave balance not found');

      if (approve) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: balance.pendingDays - days,
            usedDays: balance.usedDays + days,
          },
        });
      } else {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: balance.pendingDays - days },
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: {
          status: approve ? 'approved' : 'rejected',
          reviewedById: userId,
          reviewedAt: new Date(),
        },
        include: { employee: true },
      });
    }).then((request) => {
      this.events.emit(approve ? 'leave.approved' : 'leave.rejected', {
        tenantId,
        employeeEmail: request.employee.email,
        employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
      });
      return request;
    });
  }

  async cancel(tenantId: string, user: RequestUser, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const req = await tx.leaveRequest.findFirst({
        where: { id, tenantId },
      });
      if (!req) throw new NotFoundException('Leave request not found');
      if (req.status !== 'pending') {
        throw new BadRequestException('Only pending requests can be cancelled');
      }

      const days = this.requestDays(req);
      const year = req.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            year,
          },
        },
      });
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: Math.max(0, balance.pendingDays - days) },
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    });
  }
}
