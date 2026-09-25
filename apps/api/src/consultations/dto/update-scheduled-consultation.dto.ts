import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateScheduledConsultationDto {
  @Type(() => Date)
  @IsDate()
  declare date: Date;

  @IsOptional()
  @IsString()
  declare notes?: string;
}
