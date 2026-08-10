import { IsString, IsNumber, IsOptional, Matches, Min, Max } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdatePayrollSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'nightDiffStart must be in HH:mm format' })
  nightDiffStart?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'nightDiffEnd must be in HH:mm format' })
  nightDiffEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  nightDiffRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  otRegularDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  otRestDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  otRegularHoliday?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  otSpecialHoliday?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  otRestDayHoliday?: number;
}
