import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/request-user';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseTime(timeStr: string, base: Date): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async resolveEmployee(
    tenantId: string,
    user: RequestUser,
    employeeId?: string,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      if (employeeId) {
        return tx.employee.findFirst({
          where: { id: employeeId, tenantId },
        });
      }
      // self-service: match authenticated user's email
      return tx.employee.findFirst({
        where: { email: user.email, tenantId },
      });
    });
  }

  async today(tenantId: string, user: RequestUser) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user);
      if (!emp) return null;
      const day = startOfDay(new Date());
      return tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: emp.id,
            date: day,
          },
        },
        include: { corrections: true },
      });
    });
  }

  async clockIn(tenantId: string, user: RequestUser, employeeId?: string, ip?: string, userAgent?: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user, employeeId);
      if (!emp) throw new NotFoundException('Employee not found');

      const day = startOfDay(new Date());
      const existing = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: day },
        },
      });
      if (existing) {
        if (!existing.clockOut) throw new BadRequestException('Already clocked in');
        throw new BadRequestException('Already clocked out for today');
      }

      const holiday = await tx.holiday.findFirst({
        where: { tenantId, date: day },
      });

      return tx.attendance.create({
        data: {
          tenantId,
          employeeId: emp.id,
          date: day,
          clockIn: new Date(),
          status: holiday ? 'holiday' : 'present',
          ip,
          userAgent,
        },
      });
    });
  }

  async clockOut(tenantId: string, user: RequestUser, employeeId?: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user, employeeId);
      if (!emp) throw new NotFoundException('Employee not found');

      const day = startOfDay(new Date());
      const record = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: day },
        },
      });
      if (!record) throw new BadRequestException('Not clocked in today');
      if (record.clockOut) throw new BadRequestException('Already clocked out');

      const clockOut = new Date();
      const clockIn = record.clockIn ?? clockOut;
      const breakMinutes =
        record.breakStart && record.breakEnd
          ? diffMinutes(record.breakEnd, record.breakStart)
          : 0;
      const workedMinutes = Math.max(0, diffMinutes(clockOut, clockIn) - breakMinutes);
      const totalHours = Number((workedMinutes / 60).toFixed(2));

      // Compare against assigned shift, if any
      const assignment = await tx.employeeShift.findFirst({
        where: {
          employeeId: emp.id,
          tenantId,
          effectiveFrom: { lte: day },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }],
        },
        include: { shift: true },
        orderBy: { effectiveFrom: 'desc' },
      });

      let lateMinutes = 0;
      let undertimeMinutes = 0;
      let overtimeMinutes = 0;

      if (assignment && !assignment.shift.flexible) {
        const scheduledStart = parseTime(assignment.shift.startTime, day);
        const scheduledEnd = parseTime(assignment.shift.endTime, day);
        lateMinutes = Math.max(0, diffMinutes(clockIn, scheduledStart));
        undertimeMinutes = Math.max(0, diffMinutes(scheduledEnd, clockOut));
        overtimeMinutes = Math.max(0, diffMinutes(clockOut, scheduledEnd));
      }

      return tx.attendance.update({
        where: { id: record.id },
        data: {
          clockOut,
          totalHours,
          lateMinutes,
          undertimeMinutes,
          overtimeMinutes,
          status: record.status === 'holiday' ? 'holiday' : 'present',
        },
      });
    });
  }

  async breakStart(tenantId: string, user: RequestUser, employeeId?: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user, employeeId);
      if (!emp) throw new NotFoundException('Employee not found');
      const day = startOfDay(new Date());
      const record = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: day },
        },
      });
      if (!record?.clockIn) throw new BadRequestException('Clock in first');
      if (record.breakStart && !record.breakEnd) {
        throw new BadRequestException('Break already started');
      }
      return tx.attendance.update({
        where: { id: record.id },
        data: { breakStart: new Date(), breakEnd: null },
      });
    });
  }

  async breakEnd(tenantId: string, user: RequestUser, employeeId?: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user, employeeId);
      if (!emp) throw new NotFoundException('Employee not found');
      const day = startOfDay(new Date());
      const record = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: day },
        },
      });
      if (!record?.breakStart) throw new BadRequestException('No break in progress');
      return tx.attendance.update({
        where: { id: record.id },
        data: { breakEnd: new Date() },
      });
    });
  }

  async list(
    tenantId: string,
    employeeId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    return this.prisma.withTenant(tenantId, (tx) => {
      const where: Prisma.AttendanceWhereInput = { tenantId };
      if (employeeId) where.employeeId = employeeId;
      if (dateFrom) where.date = { ...(where.date as object), gte: new Date(dateFrom) };
      if (dateTo) where.date = { ...(where.date as object), lte: new Date(dateTo) };
      return tx.attendance.findMany({
        where,
        include: { employee: true, corrections: true },
        orderBy: { date: 'desc' },
      });
    });
  }

  async createCorrection(
    tenantId: string,
    user: RequestUser,
    dto: { attendanceId?: string; field: string; requestedValue: string; reason: string },
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const emp = await this.resolveEmployee(tenantId, user);
      if (!emp) throw new NotFoundException('Employee not found');

      let attendanceId = dto.attendanceId;
      if (!attendanceId) {
        const day = startOfDay(new Date(dto.requestedValue));
        const rec = await tx.attendance.findUnique({
          where: {
            tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: day },
          },
        });
        attendanceId = rec?.id;
      }

      const current = attendanceId
        ? await tx.attendance.findFirst({
            where: { id: attendanceId, tenantId, employeeId: emp.id },
          })
        : null;
      const currentValue =
        dto.field === 'clock_in' ? current?.clockIn : current?.clockOut;

      return tx.attendanceCorrection.create({
        data: {
          tenantId,
          employeeId: emp.id,
          attendanceId,
          field: dto.field,
          currentValue: currentValue ?? null,
          requestedValue: new Date(dto.requestedValue),
          reason: dto.reason,
        },
        include: { employee: true },
      });
    }).then((correction) => {
      this.events.emit('attendance.correction.submitted', {
        tenantId,
        employeeEmail: correction.employee.email,
        employeeName: `${correction.employee.firstName} ${correction.employee.lastName}`,
        extra: correction.reason,
      });
      return correction;
    });
  }

  async listCorrections(tenantId: string, employeeId?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.attendanceCorrection.findMany({
        where: { tenantId, ...(employeeId ? { employeeId } : {}) },
        include: { employee: true, attendance: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async reviewCorrection(
    tenantId: string,
    id: string,
    userId: string,
    approve: boolean,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const corr = await tx.attendanceCorrection.findFirst({
        where: { id, tenantId },
      });
      if (!corr) throw new NotFoundException('Correction not found');
      if (corr.status !== 'pending') {
        throw new BadRequestException('Correction already reviewed');
      }

      if (approve && corr.attendanceId) {
        const data =
          corr.field === 'clock_in'
            ? { clockIn: corr.requestedValue }
            : { clockOut: corr.requestedValue };
        await tx.attendance.update({
          where: { id: corr.attendanceId },
          data,
        });
      }

      return tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: approve ? 'approved' : 'rejected',
          reviewedById: userId,
          reviewedAt: new Date(),
        },
        include: { employee: true },
      });
    }).then((correction) => {
      this.events.emit('attendance.correction.resolved', {
        tenantId,
        employeeEmail: correction.employee.email,
        employeeName: `${correction.employee.firstName} ${correction.employee.lastName}`,
        extra: `Your correction was ${correction.status}.`,
      });
      return correction;
    });
  }

  // --- shifts ---

  listShifts(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.shift.findMany({
        where: { tenantId },
        include: { _count: { select: { employeeShifts: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  createShift(tenantId: string, dto: any) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.shift.create({ data: { ...dto, tenantId } }),
    );
  }

  updateShift(tenantId: string, id: string, dto: any) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exists = await tx.shift.findFirst({ where: { id, tenantId } });
      if (!exists) throw new NotFoundException('Shift not found');
      return tx.shift.update({ where: { id }, data: dto });
    });
  }

  deleteShift(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exists = await tx.shift.findFirst({ where: { id, tenantId } });
      if (!exists) throw new NotFoundException('Shift not found');
      return tx.shift.delete({ where: { id } });
    });
  }

  assignShift(tenantId: string, dto: { employeeId: string; shiftId: string; effectiveFrom: string; effectiveTo?: string }) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.employeeShift.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          shiftId: dto.shiftId,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
        include: { employee: true, shift: true },
      }),
    );
  }

  listAssignments(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.employeeShift.findMany({
        where: { tenantId },
        include: { employee: true, shift: true },
        orderBy: { effectiveFrom: 'desc' },
      }),
    );
  }
}
