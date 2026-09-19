export type TemplateType = 'GENERIC' | 'GYNECOLOGY_ONLY' | 'OBSTETRICS_ECO' | 'GYNECOLOGY_OBSTETRICS';

export interface MedicalRecordField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface MedicalRecordSection {
  title: string;
  fields: MedicalRecordField[];
}
