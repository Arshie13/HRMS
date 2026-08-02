import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';
import {
  ClockInOutDto,
  ListAttendanceDto,
  CreateCorrectionDto,
} from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Get('today')
  @RequirePermission('attendance', 'read')
  today(@CurrentUser() user: RequestUser) {
    return this.attendance.today(user.tenantId, user);
  }

  @Post('clock-in')
  @RequirePermission('attendance', 'create')
  clockIn(
    @CurrentUser() user: RequestUser,
    @Body() dto: ClockInOutDto,
    @Req() req: Request,
  ) {
    return this.attendance.clockIn(
      user.tenantId,
      user,
      dto.employeeId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('clock-out')
  @RequirePermission('attendance', 'update')
  clockOut(@CurrentUser() user: RequestUser, @Body() dto: ClockInOutDto) {
    return this.attendance.clockOut(user.tenantId, user, dto.employeeId);
  }

  @Post('break-start')
  @RequirePermission('attendance', 'create')
  breakStart(@CurrentUser() user: RequestUser, @Body() dto: ClockInOutDto) {
    return this.attendance.breakStart(user.tenantId, user, dto.employeeId);
  }

  @Post('break-end')
  @RequirePermission('attendance', 'create')
  breakEnd(@CurrentUser() user: RequestUser, @Body() dto: ClockInOutDto) {
    return this.attendance.breakEnd(user.tenantId, user, dto.employeeId);
  }

  @Get()
  @RequirePermission('attendance', 'read')
  list(@CurrentUser() user: RequestUser, @Query() q: ListAttendanceDto) {
    return this.attendance.list(
      user.tenantId,
      q.employeeId,
      q.dateFrom,
      q.dateTo,
    );
  }

  @Get('corrections')
  @RequirePermission('attendance', 'read')
  listCorrections(
    @CurrentUser() user: RequestUser,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendance.listCorrections(user.tenantId, employeeId);
  }

  @Post('corrections')
  @RequirePermission('attendance', 'create')
  createCorrection(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCorrectionDto,
  ) {
    return this.attendance.createCorrection(user.tenantId, user, dto);
  }

  @Put('corrections/:id/approve')
  @RequirePermission('attendance', 'approve')
  approveCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendance.reviewCorrection(user.tenantId, id, user.userId, true);
  }

  @Put('corrections/:id/reject')
  @RequirePermission('attendance', 'approve')
  rejectCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendance.reviewCorrection(user.tenantId, id, user.userId, false);
  }
}
