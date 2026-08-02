import { Controller, Get, Post, Put, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('departments', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.department.findMany({
        where: { tenantId: user.tenantId },
        include: { children: true, _count: { select: { employees: true } } },
      }),
    );
  }

  @Post()
  @RequirePermission('departments', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.department.create({ data: { ...body, tenantId: user.tenantId } }),
    );
  }

  @Put(':id')
  @RequirePermission('departments', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.department.update({ where: { id, tenantId: user.tenantId }, data: body }),
    );
  }

  @Delete(':id')
  @RequirePermission('departments', 'delete')
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.department.delete({ where: { id, tenantId: user.tenantId } }),
    );
  }
}
