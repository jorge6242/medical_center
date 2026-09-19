import { anamnesisSection } from '../sections/anamnesis.section';
import { obstetricEcoSection } from '../sections/obstetric-eco.section';
import { resolutionSection } from '../sections/resolution.section';
import type { MedicalRecordTemplate } from './types';

export const obstetricsTemplate: MedicalRecordTemplate = {
  type: 'OBSTETRICS_ECO',
  version: '1.0.0',
  label: 'Obstetricia / Ecografía',
  sections: [anamnesisSection, obstetricEcoSection, resolutionSection],
};
