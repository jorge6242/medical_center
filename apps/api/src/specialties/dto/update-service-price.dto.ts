import { IsNumber, IsPositive } from 'class-validator';

export class UpdateServicePriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  declare priceUsd: number;
}
