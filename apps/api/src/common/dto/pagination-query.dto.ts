import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit = 10;

  @IsString()
  @IsOptional()
  search?: string;
}
