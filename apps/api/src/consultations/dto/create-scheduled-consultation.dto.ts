import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateScheduledConsultationDto {
  @IsString()
  @IsNotEmpty()
  declare patientId: string;

  @IsString()
  @IsNotEmpty()
  declare doctorId: string;

  @Type(() => Date)
  @IsDate()
  declare startsAt: Date;

  @Type(() => Date)
  @IsDate()
  declare endsAt: Date;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  declare doctorServiceIds: string[];

  @IsOptional()
  @IsString()
  declare notes?: string;

  @IsBoolean()
  declare sendEmailNotification: boolean;
}
