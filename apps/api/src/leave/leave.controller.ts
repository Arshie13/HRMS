import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';

@Controller('leave-types')
export class LeaveTypesController {
  constructor(private leave: LeaveService) {}

  @Get()
  @RequirePermission('leaves', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.leave.listTypes(user.tenantId);
  }

  @Post()
  @RequirePermission('leaves', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.leave.createType(user.tenantId, body);
  }

  @Put(':id')
  @RequirePermission('leaves', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.leave.updateType(user.tenantId, id, body);
  }
}

@Controller('leave-balances')
export class LeaveBalancesController {
  constructor(private leave: LeaveService) {}

  @Get()
  @RequirePermission('leaves', 'read')
  list(
    @CurrentUser() user: RequestUser,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leave.listBalances(user.tenantId, employeeId);
  }
}

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leave: LeaveService) {}

  @Post()
  @RequirePermission('leaves', 'create')
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.leave.createRequest(user.tenantId, user, body);
  }

  @Get()
  @RequirePermission('leaves', 'read')
  list(
    @CurrentUser() user: RequestUser,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.leave.listRequests(user.tenantId, employeeId, status);
  }

  @Get(':id')
  @RequirePermission('leaves', 'read')
  get(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.leave.getRequest(user.tenantId, id);
  }

  @Put(':id/approve')
  @RequirePermission('leaves', 'approve')
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.review(user.tenantId, id, user.userId, true);
  }

  @Put(':id/reject')
  @RequirePermission('leaves', 'approve')
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.review(user.tenantId, id, user.userId, false);
  }

  @Put(':id/cancel')
  @RequirePermission('leaves', 'update')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.cancel(user.tenantId, user, id);
  }
}
