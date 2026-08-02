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
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import { RequirePermission } from '../common/auth/require-permission.decorator';
import { CreateShiftDto, AssignShiftDto } from './dto/attendance.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private attendance: AttendanceService) {}

  @Get()
  @RequirePermission('attendance', 'read')
  list(@CurrentUser() user: RequestUser) {
    return this.attendance.listShifts(user.tenantId);
  }

  @Post()
  @RequirePermission('attendance', 'create')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateShiftDto) {
    return this.attendance.createShift(user.tenantId, dto);
  }

  @Put(':id')
  @RequirePermission('attendance', 'update')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateShiftDto,
  ) {
    return this.attendance.updateShift(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('attendance', 'delete')
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attendance.deleteShift(user.tenantId, id);
  }

  @Post('assign')
  @RequirePermission('attendance', 'update')
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignShiftDto) {
    return this.attendance.assignShift(user.tenantId, dto);
  }

  @Get('assignments')
  @RequirePermission('attendance', 'read')
  assignments(@CurrentUser() user: RequestUser) {
    return this.attendance.listAssignments(user.tenantId);
  }
}
