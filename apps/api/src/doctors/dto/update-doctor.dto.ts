import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsString()
  declare phone?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  declare splitPercentage?: number;

  @IsOptional()
  @IsString()
  @Length(4, 20)
  declare medicalLicenseNumber?: string;
}
