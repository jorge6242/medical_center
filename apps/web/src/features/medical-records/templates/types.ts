import type { MedicalRecordSection } from '../schemas/types';

export interface MedicalRecordTemplate {
  type: string;
  version: string;
  label: string;
  sections: MedicalRecordSection[];
}
