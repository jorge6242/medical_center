import { IsString, Length } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @Length(2, 100)
  declare name: string;
}
