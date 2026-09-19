import type { MedicalRecordSection } from '../schemas/types';

export const obstetricEcoSection: MedicalRecordSection = {
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
};
