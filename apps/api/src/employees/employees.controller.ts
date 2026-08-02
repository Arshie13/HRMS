import { Controller, Get, Post, Put, Delete, Param, Body, ParseUUIDPipe, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';
import { isPrivileged, ownEmployeeId } from '../common/auth/self-scope';

@Controller('employees')
export class EmployeesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('employees', 'read')
  list(@CurrentUser() user: RequestUser, @Query() q: any) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const privileged = await isPrivileged(tx, user.tenantId, user);
      const ownId = privileged ? null : await ownEmployeeId(tx, user.tenantId, user);

      const where: any = { tenantId: user.tenantId };
      if (!privileged) where.id = ownId; // self-service: own profile only
      if (q.status) where.status = q.status;
      if (q.departmentId) where.departmentId = q.departmentId;
      if (q.teamId) where.teamId = q.teamId;
      if (q.search) {
        where.OR = [
          { firstName: { contains: q.search, mode: 'insensitive' } },
          { lastName: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
          { employeeId: { contains: q.search, mode: 'insensitive' } },
        ];
      }
      return tx.employee.findMany({
        where,
        include: { department: true, team: true },
        orderBy: { createdAt: 'desc' },
        skip: q.page ? (q.page - 1) * (q.limit || 20) : 0,
        take: q.limit || 20,
      });
    });
  }

  @Get(':id')
  @RequirePermission('employees', 'read')
  get(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const privileged = await isPrivileged(tx, user.tenantId, user);
      if (!privileged) {
        const ownId = await ownEmployeeId(tx, user.tenantId, user);
        if (ownId !== id) throw new NotFoundException('Employee not found');
      }
      const employee = await tx.employee.findFirst({
        where: { id, tenantId: user.tenantId },
        include: { department: true, team: true, documents: true, histories: { orderBy: { changedAt: 'desc' } } },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      return employee;
    });
  }

  @Post()
  @RequirePermission('employees', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.employee.create({
        data: { ...body, tenantId: user.tenantId },
      }),
    );
  }

  @Put(':id')
  @RequirePermission('employees', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const old = await tx.employee.findFirstOrThrow({ where: { id, tenantId: user.tenantId } });
      const updated = await tx.employee.update({ where: { id }, data: body });

      const changes: any[] = [];
      for (const [key, val] of Object.entries(body)) {
        if (key === 'tenantId') continue;
        if (JSON.stringify((old as any)[key]) !== JSON.stringify(val)) {
          changes.push({
            tenantId: user.tenantId,
            employeeId: id,
            eventType: key === 'status' ? 'status_change' : key === 'monthlySalary' || key === 'dailyRate' ? 'salary_change' : key === 'position' ? 'position_change' : key === 'departmentId' ? 'department_change' : 'contract_update',
            oldValue: { [key]: (old as any)[key] },
            newValue: { [key]: val },
          });
        }
      }
      if (changes.length > 0) {
        await tx.employeeHistory.createMany({ data: changes });
      }

      return updated;
    });
  }

  @Delete(':id')
  @RequirePermission('employees', 'delete')
  archive(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.employee.update({
        where: { id, tenantId: user.tenantId },
        data: { status: 'terminated' },
      }),
    );
  }

  @Post(':id/documents')
  @RequirePermission('employees', 'update')
  uploadDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.employeeDocument.create({
        data: { ...body, tenantId: user.tenantId, employeeId: id },
      }),
    );
  }

  @Delete(':id/documents/:docId')
  @RequirePermission('employees', 'update')
  deleteDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.employeeDocument.delete({
        where: { id: docId, tenantId: user.tenantId, employeeId: id },
      }),
    );
  }
}
