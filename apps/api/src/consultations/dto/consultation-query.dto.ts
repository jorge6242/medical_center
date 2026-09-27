import { ConsultationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ConsultationQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declare date?: Date;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare doctorId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
