import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { ShiftsController } from './shifts.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController, ShiftsController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
