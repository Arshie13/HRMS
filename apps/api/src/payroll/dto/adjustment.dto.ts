import { IsString, IsNumber, Min } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString()
  reason!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}
