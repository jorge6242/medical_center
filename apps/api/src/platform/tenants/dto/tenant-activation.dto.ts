import { IsBoolean, IsInt, IsString, Length, Min } from 'class-validator';

export class TenantActivationDto {
  @IsBoolean()
  declare isActive: boolean;

  @IsString()
  @Length(1, 500)
  declare reason: string;

  @IsInt()
  @Min(1)
  declare expectedVersion: number;
}
