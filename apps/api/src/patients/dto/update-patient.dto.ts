import { GenderType } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';


export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;

  @IsOptional()
  @IsString()
  declare documentType?: string;

  @IsOptional()
  @IsString()
  declare documentId?: string;

  @IsOptional()
  @IsString()
  declare phone?: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsDateString()
  declare birthDate?: string;

  @IsOptional()
  @IsEnum(GenderType)
  declare gender?: GenderType;

  @IsOptional()
  @IsObject()
  declare clinicalHistory?: Record<string, unknown>;
}
