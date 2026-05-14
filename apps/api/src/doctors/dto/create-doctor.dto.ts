import { AccountType, DocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
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


export class CreateBankAccountDto {
  @IsString()
  @Length(2, 100)
  declare bankName: string;

  @IsEnum(AccountType)
  declare accountType: AccountType;

  @IsString()
  @Length(10, 30)
  declare accountNumber: string;

  @IsString()
  @Length(6, 12)
  declare documentId: string;

  @IsOptional()
  @IsString()
  declare phone?: string;
}

export class CreateDoctorDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @Length(6, 12)
  declare documentId: string;

  @IsString()
  @Length(2, 100)
  declare name: string;

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

  @IsArray()
  @IsUUID('4', { each: true })
  declare specialtyIds: string[];

  @ValidateNested()
  @Type(() => CreateBankAccountDto)
  declare bankAccount: CreateBankAccountDto;
}
