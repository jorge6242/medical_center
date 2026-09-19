import type { MedicalRecordSection } from './types';

export const gynecologySchema: MedicalRecordSection[] = [
  {
    title: 'Anamnesis',
    fields: [
      { name: 'anamnesis.motivoConsulta', label: 'Motivo de consulta', type: 'textarea', required: true },
      { name: 'anamnesis.enfermedadActual', label: 'Enfermedad actual', type: 'textarea' },
    ],
  },
  {
    title: 'Examen físico ginecológico',
    fields: [
      { name: 'examenFisicoGinecologico.mamas', label: 'Mamas', type: 'textarea' },
      { name: 'examenFisicoGinecologico.vulvaPerine', label: 'Vulva / periné', type: 'textarea' },
      { name: 'examenFisicoGinecologico.especuloscopia', label: 'Especuloscopía', type: 'textarea' },
      { name: 'examenFisicoGinecologico.tactoVaginal', label: 'Tacto vaginal', type: 'textarea' },
      { name: 'examenFisicoGinecologico.colposcopia', label: 'Colposcopía', type: 'textarea' },
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
