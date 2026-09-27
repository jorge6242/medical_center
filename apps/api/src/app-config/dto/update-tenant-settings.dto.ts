import { IsEmail, IsOptional } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsEmail()
  declare email?: string;
}
