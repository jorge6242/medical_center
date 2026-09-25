import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @MinLength(2)
  declare name: string;

  @IsString()
  @MinLength(2)
  declare lastName: string;

  @IsString()
  @IsOptional()
  declare identificationNumber?: string;

  @IsString()
  @MinLength(8)
  declare password: string;

  @IsString()
  @IsNotEmpty()
  declare roleId: string;
}
