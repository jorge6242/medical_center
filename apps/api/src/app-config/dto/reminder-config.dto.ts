import { ReminderType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';

export class ReminderConfigDto {
  @IsEnum(ReminderType)
  declare type: ReminderType;

  @IsBoolean()
  declare isActive: boolean;

  @IsBoolean()
  declare sendToPatient: boolean;

  @IsBoolean()
  declare sendToDoctor: boolean;

  @IsBoolean()
  declare sendToAdmin: boolean;
}

export class UpdateReminderConfigsDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReminderConfigDto)
  declare reminderConfigs?: ReminderConfigDto[];
}
