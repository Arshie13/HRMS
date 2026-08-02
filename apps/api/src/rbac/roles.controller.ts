import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('roles')
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('roles', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findMany({
        where: { tenantId: user.tenantId },
        include: { _count: { select: { users: true } } },
        orderBy: { isSystem: 'desc' },
      }),
    );
  }

  @Post()
  @RequirePermission('roles', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          description: body.description ?? null,
          permissions: (body.permissions ?? {}) as Prisma.InputJsonValue,
          isSystem: false,
        },
      }),
    );
  }

  @Put(':id')
  @RequirePermission('roles', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.role.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing) throw new NotFoundException('Role not found');
      if (existing.isSystem) {
        throw new BadRequestException('System roles cannot be modified');
      }
      return tx.role.update({
        where: { id },
        data: {
          name: body.name ?? existing.name,
          description:
            body.description !== undefined ? body.description : existing.description,
          permissions: (body.permissions ?? existing.permissions) as Prisma.InputJsonValue,
        },
      });
    });
  }

  @Delete(':id')
  @RequirePermission('roles', 'delete')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.role.findFirst({
        where: { id, tenantId: user.tenantId },
        include: { _count: { select: { users: true } } },
      });
      if (!existing) throw new NotFoundException('Role not found');
      if (existing.isSystem) {
        throw new BadRequestException('System roles cannot be deleted');
      }
      if (existing._count.users > 0) {
        throw new BadRequestException(
          'Role is assigned to users and cannot be deleted',
        );
      }
      return tx.role.delete({ where: { id } });
    });
  }

  @Get(':id/permissions')
  @RequirePermission('roles', 'read')
  permissions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({
        where: { id, tenantId: user.tenantId },
        select: { id: true, permissions: true },
      }),
    );
  }
}
