import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { IsPlatformTenantId } from '../../common/platform-tenant-id';

export class PlatformAuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;

  @IsOptional()
  @IsPlatformTenantId()
  declare targetTenantId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  declare entity?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  declare action?: string;

  @IsOptional()
  @IsDateString()
  declare from?: string;

  @IsOptional()
  @IsDateString()
  declare to?: string;
}
