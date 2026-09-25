import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BootstrapAccessLinkDto {
  @IsString()
  declare tenantSlug: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  declare expiresInDays?: number;
}
