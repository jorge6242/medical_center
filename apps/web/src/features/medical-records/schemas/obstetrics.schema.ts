import type { MedicalRecordSection } from './types';

export const obstetricsSchema: MedicalRecordSection[] = [
  {
    title: 'Anamnesis',
    fields: [
      { name: 'anamnesis.motivoConsulta', label: 'Motivo de consulta', type: 'textarea', required: true },
      { name: 'anamnesis.enfermedadActual', label: 'Enfermedad actual', type: 'textarea' },
    ],
  },
  {
    title: 'Control obstétrico eco',
    fields: [
      { name: 'controlObstetricoEco.fechaUltimaRegla', label: 'FUR', type: 'date' },
      { name: 'controlObstetricoEco.fechaProbableParto', label: 'FPP', type: 'date' },
      { name: 'controlObstetricoEco.edadGestacionalSemanas', label: 'Edad gestacional (semanas)', type: 'number' },
      { name: 'controlObstetricoEco.estaticaFetal', label: 'Estática fetal', type: 'textarea' },
      { name: 'controlObstetricoEco.biometriaFetal', label: 'Biometría fetal', type: 'textarea' },
      { name: 'controlObstetricoEco.anatomiaFetal', label: 'Anatomía fetal', type: 'textarea' },
      { name: 'controlObstetricoEco.anexosFetales', label: 'Anexos fetales', type: 'textarea' },
    ],
  },
  {
    title: 'Resolución médica',
    fields: [
      { name: 'resolucionMedica.diagnosticos', label: 'Diagnósticos', type: 'textarea' },
      { name: 'resolucionMedica.planTrabajo', label: 'Plan de trabajo / exámenes', type: 'textarea' },
      { name: 'resolucionMedica.tratamiento', label: 'Tratamiento', type: 'textarea' },
    ],
  },
];
