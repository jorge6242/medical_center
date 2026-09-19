import { anamnesisSection } from '../sections/anamnesis.section';
import { gynExamSection } from '../sections/gyn-exam.section';
import { obstetricEcoSection } from '../sections/obstetric-eco.section';
import { resolutionSection } from '../sections/resolution.section';
import type { MedicalRecordTemplate } from './types';

export const gynObstetricsTemplate: MedicalRecordTemplate = {
  type: 'GYNECOLOGY_OBSTETRICS',
  version: '1.0.0',
  label: 'Ginecología / Obstetricia',
  sections: [anamnesisSection, gynExamSection, obstetricEcoSection, resolutionSection],
};
