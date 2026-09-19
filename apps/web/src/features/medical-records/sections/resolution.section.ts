import type { MedicalRecordSection } from '../schemas/types';

export const resolutionSection: MedicalRecordSection = {
  title: 'Resolución médica',
  fields: [
    { name: 'resolucionMedica.diagnosticos', label: 'Diagnósticos', type: 'textarea' },
    { name: 'resolucionMedica.planTrabajo', label: 'Plan de trabajo / exámenes', type: 'textarea' },
    { name: 'resolucionMedica.tratamiento', label: 'Tratamiento', type: 'textarea' },
  ],
};
