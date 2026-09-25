import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateAccessLinkDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  declare expiresInDays?: number;
}
