import { Module } from '@nestjs/common';
import {
  LeaveTypesController,
  LeaveBalancesController,
  LeaveRequestsController,
} from './leave.controller';
import { HolidaysController } from './holidays.controller';
import { LeaveService } from './leave.service';

@Module({
  controllers: [
    LeaveTypesController,
    LeaveBalancesController,
    LeaveRequestsController,
    HolidaysController,
  ],
  providers: [LeaveService],
})
export class LeaveModule {}
