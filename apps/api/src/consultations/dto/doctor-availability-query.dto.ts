import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class DoctorAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  declare doctorId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener el formato AAAA-MM-DD',
  })
  declare date: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declare startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declare endsAt?: Date;

  @IsOptional()
  @IsString()
  declare excludeConsultationId?: string;
}
