import { IsString, IsDateString, IsEnum } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsDateString()
  payDate!: string;

  @IsString()
  @IsEnum(['semi-monthly', 'monthly'])
  scheduleType!: 'semi-monthly' | 'monthly';
}
