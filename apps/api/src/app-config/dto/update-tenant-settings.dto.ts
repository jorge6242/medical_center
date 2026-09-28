import { Type } from 'class-transformer';
import { IsEmail, IsOptional, ValidateNested } from 'class-validator';

import { ReminderConfigDto } from './reminder-config.dto';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReminderConfigDto)
  declare reminderConfigs?: ReminderConfigDto[];
}
