import { DocumentType, GenderType } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';


export class CreatePatientDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @Length(6, 12)
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
}
