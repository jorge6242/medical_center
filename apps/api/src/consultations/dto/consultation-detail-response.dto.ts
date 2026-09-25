import type { ConsultationResponseDto } from './consultation-response.dto';

export interface ConsultationDetailResponseDto extends ConsultationResponseDto {
  doctorDocument: string;
  medicalRecordId: string | null;
}
