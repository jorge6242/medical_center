import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateScheduledConsultationDto {
  @IsUUID('4')
  declare patientId: string;

  @IsUUID('4')
  declare doctorId: string;

  @Type(() => Date)
  @IsDate()
  declare date: Date;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  declare doctorServiceIds: string[];

  @IsOptional()
  @IsString()
  declare notes?: string;

  @IsBoolean()
  declare sendEmailNotification: boolean;
}
