import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('holidays')
export class HolidaysController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('leaves', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.holiday.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { date: 'asc' },
      }),
    );
  }

  @Post()
  @RequirePermission('leaves', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.holiday.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          date: new Date(body.date),
          type: body.type ?? 'regular',
          recurring: body.recurring ?? false,
        },
      }),
    );
  }

  @Put(':id')
  @RequirePermission('leaves', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.holiday.update({
        where: { id, tenantId: user.tenantId },
        data: {
          ...body,
          date: body.date ? new Date(body.date) : undefined,
        },
      }),
    );
  }

  @Delete(':id')
  @RequirePermission('leaves', 'delete')
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.holiday.delete({ where: { id, tenantId: user.tenantId } }),
    );
  }
}
