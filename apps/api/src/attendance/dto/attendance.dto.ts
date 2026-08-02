import { IsOptional, IsString, IsDateString } from 'class-validator';

// NOTE: seeded/dev ids are UUIDv0 (version nibble 0). class-validator's
// IsUUID rejects them, so validate as plain strings here.
export class ClockInOutDto {
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class ListAttendanceDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CreateCorrectionDto {
  @IsOptional()
  @IsString()
  attendanceId?: string;

  @IsString()
  field!: string; // clock_in | clock_out

  @IsDateString()
  requestedValue!: string;

  @IsString()
  reason!: string;
}

export class CreateShiftDto {
  @IsString()
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  breakStart?: string;

  @IsOptional()
  @IsString()
  breakEnd?: string;

  @IsOptional()
  flexible?: boolean;
}

export class AssignShiftDto {
  @IsString()
  employeeId!: string;

  @IsString()
  shiftId!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
