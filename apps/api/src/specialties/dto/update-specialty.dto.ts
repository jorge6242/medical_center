import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateSpecialtyDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;
}
