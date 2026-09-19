import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsUUID()
  declare patientId: string;

  @IsUUID()
  declare consultationId: string;

  @IsString()
  declare templateType: string;

  @IsString()
  @IsOptional()
  declare templateVersion?: string;

  @IsObject()
  @IsOptional()
  declare templateSnapshot?: Record<string, unknown>;

  @IsObject()
  declare clinicalData: Record<string, unknown>;
}
