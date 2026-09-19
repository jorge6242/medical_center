import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateDoctorProfileDto {
  @IsString()
  @Length(2, 100)
  declare name: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsString()
  declare phone?: string;
}
