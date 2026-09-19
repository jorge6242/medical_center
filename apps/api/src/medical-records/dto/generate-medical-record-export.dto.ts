import { IsEnum } from 'class-validator';

export enum MedicalRecordExportFormat {
  PDF = 'pdf',
}

export class GenerateMedicalRecordExportDto {
  @IsEnum(MedicalRecordExportFormat)
  format: MedicalRecordExportFormat = MedicalRecordExportFormat.PDF;
}
