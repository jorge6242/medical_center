import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentAdjustmentDto {
  @IsString()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountUsd!: number;

  @IsOptional()
  @IsString()
  paymentDetailId?: string;
}
