import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class LookupQueryDto {
  @IsString()
  @MinLength(2)
  declare q: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit = 20;

  @IsString()
  @IsOptional()
  declare cursor?: string;
}
