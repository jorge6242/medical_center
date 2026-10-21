import { DocumentType, GenderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RepresentativeDto {
  @IsString()
  @Length(2, 100)
  declare name: string;

  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @MinLength(6)
  declare documentId: string;

  @IsOptional()
  @IsString()
  declare phone?: string;

  @IsString()
  @IsIn(['Madre', 'Padre', 'Tutor legal', 'Otro'])
  declare relationship: string;
}

export class CreatePatientDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @MinLength(6)
  declare documentId: string;

  @IsString()
  @Length(2, 100)
  declare name: string;

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

  @IsOptional()
  @Type(() => RepresentativeDto)
  @ValidateNested()
  declare representative?: RepresentativeDto;
}
