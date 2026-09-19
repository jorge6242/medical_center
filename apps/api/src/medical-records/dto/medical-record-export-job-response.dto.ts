export class MedicalRecordExportJobResponseDto {
  jobId!: string;
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  progress!: number;
  format!: string;
  filename?: string;
  sizeBytes?: number;
  error?: string;
  createdAt!: Date;
  completedAt?: Date;
}
