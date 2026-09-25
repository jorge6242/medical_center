import { AccountType, DocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { DoctorServiceDto } from './create-doctor.dto';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare bankName?: string;

  @IsOptional()
  @IsEnum(AccountType)
  declare accountType?: AccountType;

  @IsOptional()
  @IsString()
  declare accountNumber?: string | null;

  @IsString()
  declare documentId: string;

  @IsOptional()
  @IsString()
  declare phone?: string | null;
}

export class UpdateDoctorDto {
  @IsOptional()
  @IsEnum(DocumentType)
  declare documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @Length(6, 12)
  declare documentId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;

  @IsOptional()
  @IsEmail()
  declare email?: string | null;

  @IsOptional()
  @IsString()
  declare phone?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  declare splitPercentage?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  declare specialtyIds?: string[];

  @IsOptional()
  @IsString()
  @Length(4, 20)
  declare medicalLicenseNumber?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorServiceDto)
  declare services?: DoctorServiceDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBankAccountDto)
  declare bankAccount?: UpdateBankAccountDto;
}
