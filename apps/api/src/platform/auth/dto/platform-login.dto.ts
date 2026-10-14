import { IsString, Length } from 'class-validator';

export class PlatformLoginDto {
  @IsString()
  @Length(3, 32)
  declare username: string;

  @IsString()
  @Length(1, 128)
  declare password: string;
}
