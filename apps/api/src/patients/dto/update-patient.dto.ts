import { GenderType } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';


export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;

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
