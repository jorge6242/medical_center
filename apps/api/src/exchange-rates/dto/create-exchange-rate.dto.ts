import { IsDateString, IsNumber, IsPositive } from 'class-validator';

export class CreateExchangeRateDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  declare rate: number;

  @IsDateString()
  declare date: string;
}
