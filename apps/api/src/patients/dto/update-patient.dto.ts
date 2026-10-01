import { DocumentType, GenderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { RepresentativeDto } from './create-patient.dto';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  declare name?: string;

  /**
   * Solo se puede cambiar el tipo de documento junto con el documentId.
   * Caso principal: promover un menor (M) a venezolano (V) cuando obtiene cédula.
   */
  @IsOptional()
  @IsEnum(DocumentType)
  declare documentType?: DocumentType;

  /**
   * Requerido si se envía documentType y éste no es M.
   * Si se envía documentType M, el backend ignora este campo (ID ya fue generado).
   */
  @ValidateIf(
    (o: UpdatePatientDto) =>
      o.documentType !== undefined && o.documentType !== DocumentType.M,
  )
  @IsString()
  @MinLength(6)
  declare documentId?: string;

  @IsOptional()
  @IsString()
  declare phone?: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @IsOptional()
  @IsDateString()
  declare birthDate?: string;

  @IsOptional()
  @IsEnum(GenderType)
  declare gender?: GenderType;

  @IsOptional()
  @IsObject()
  declare clinicalHistory?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => RepresentativeDto)
  declare representative?: RepresentativeDto;
}
