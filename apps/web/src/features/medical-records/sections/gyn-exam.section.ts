import type { MedicalRecordSection } from '../schemas/types';

export const gynExamSection: MedicalRecordSection = {
  title: 'Examen físico ginecológico',
  fields: [
    { name: 'examenFisicoGinecologico.mamas', label: 'Mamas', type: 'textarea' },
    { name: 'examenFisicoGinecologico.vulvaPerine', label: 'Vulva / periné', type: 'textarea' },
    { name: 'examenFisicoGinecologico.especuloscopia', label: 'Especuloscopía', type: 'textarea' },
    { name: 'examenFisicoGinecologico.tactoVaginal', label: 'Tacto vaginal', type: 'textarea' },
    { name: 'examenFisicoGinecologico.colposcopia', label: 'Colposcopía', type: 'textarea' },
  ],
};
