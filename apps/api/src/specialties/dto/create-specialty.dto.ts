import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class CreateServicePriceDto {
  @IsString()
  @Length(2, 100)
  declare serviceName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  declare priceUsd: number;
}

export class CreateSpecialtyDto {
  @IsString()
  @Length(2, 100)
  declare name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServicePriceDto)
  declare services: CreateServicePriceDto[];
}
