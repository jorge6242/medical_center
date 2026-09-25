import { IsString, MinLength } from 'class-validator';

export class VoidDoctorPayoutDto {
  @IsString()
  @MinLength(3)
  declare reason: string;
}
