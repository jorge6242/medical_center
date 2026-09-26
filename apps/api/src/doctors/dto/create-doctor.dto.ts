import { AccountType, DocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DoctorServiceDto {
  @IsString()
  @Length(1, 100)
  declare specialtyId: string;

  @IsString()
  @Length(2, 100)
  declare serviceName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  declare priceUsd: number;
}

export class CreateBankAccountDto {
  @IsString()
  @Length(2, 100)
  declare bankName: string;

  @IsEnum(AccountType)
  declare accountType: AccountType;

  @IsString()
  @IsOptional()
  @Length(10, 30)
  declare accountNumber?: string;

  @IsString()
  declare documentId: string;

  @IsOptional()
  @IsString()
  declare phone?: string;
}

export class CreateDoctorDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @MinLength(6)
  declare documentId: string;

  @IsString()
  @Length(2, 100)
  declare name: string;

  @IsString()
  @Length(2, 100)
  declare lastName: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsString()
  declare phone?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  declare splitPercentage: number;

  @IsOptional()
  @IsString()
  @Length(4, 20)
  declare medicalLicenseNumber?: string;

  @IsString()
  @Length(1, 100)
  declare primarySpecialtyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorServiceDto)
  declare services: DoctorServiceDto[];

  @ValidateNested()
  @Type(() => CreateBankAccountDto)
  declare bankAccount: CreateBankAccountDto;
}
