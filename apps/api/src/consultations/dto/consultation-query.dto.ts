import { ConsultationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ConsultationQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declare date?: Date;

  @IsOptional()
  @IsUUID('4')
  declare doctorId?: string;

  @IsOptional()
  @IsUUID('4')
  declare patientId?: string;

  @IsOptional()
  @IsEnum(ConsultationStatus)
  declare status?: ConsultationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  limit: number = 20;
}
