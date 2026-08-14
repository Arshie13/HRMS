import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('users', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: user.tenantId },
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  @Post()
  @RequirePermission('users', 'create')
  async create(@CurrentUser() user: RequestUser, @Body() body: { email: string; name?: string; password: string; roleId?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId: user.tenantId,
          email: body.email.toLowerCase(),
          name: body.name ?? null,
          passwordHash,
          roleId: body.roleId ?? null,
        },
        include: { role: true },
      });
      return created;
    });
  }

  @Put(':id/role')
  @RequirePermission('users', 'update')
  assignRole(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { roleId: string },
  ) {
    if (!body.roleId) throw new BadRequestException('roleId is required');
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const target = await tx.user.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!target) throw new NotFoundException('User not found');

      const role = await tx.role.findFirst({
        where: { id: body.roleId, tenantId: user.tenantId },
      });
      if (!role) throw new NotFoundException('Role not found');

      return tx.user.update({
        where: { id },
        data: { roleId: body.roleId },
        include: { role: true },
      });
    });
  }
}
