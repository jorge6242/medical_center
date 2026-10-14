import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  declare name?: string;

  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsEmail()
  declare email?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 63)
  declare webSlug?: string;

  @IsInt()
  @Min(1)
  declare expectedVersion: number;
}
