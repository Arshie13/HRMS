import { Controller, Get, Post, Put, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('teams')
export class TeamsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('teams', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.findMany({
        where: { tenantId: user.tenantId },
        include: { _count: { select: { employees: true } } },
      }),
    );
  }

  @Post()
  @RequirePermission('teams', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.create({ data: { ...body, tenantId: user.tenantId } }),
    );
  }

  @Put(':id')
  @RequirePermission('teams', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.update({ where: { id, tenantId: user.tenantId }, data: body }),
    );
  }

  @Delete(':id')
  @RequirePermission('teams', 'delete')
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.delete({ where: { id, tenantId: user.tenantId } }),
    );
  }
}
