import { IsString, MinLength } from 'class-validator';

export class VoidConsultationDto {
  @IsString()
  @MinLength(5)
  declare reason: string;
}
