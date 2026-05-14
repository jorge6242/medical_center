import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLabTestCatalogDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  priceUsd!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLabTestCatalogDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  priceUsd?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
