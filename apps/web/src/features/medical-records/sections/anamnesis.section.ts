import type { MedicalRecordSection } from '../schemas/types';

export const anamnesisSection: MedicalRecordSection = {
  title: 'Anamnesis',
  fields: [
    { name: 'anamnesis.motivoConsulta', label: 'Motivo de consulta', type: 'textarea', required: true },
    { name: 'anamnesis.enfermedadActual', label: 'Enfermedad actual', type: 'textarea' },
  ],
};
