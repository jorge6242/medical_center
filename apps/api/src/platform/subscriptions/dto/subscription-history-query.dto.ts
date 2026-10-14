import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SubscriptionHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare periodPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare invoicePage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare paymentPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;
}
