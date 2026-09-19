import { anamnesisSection } from '../sections/anamnesis.section';
import { gynExamSection } from '../sections/gyn-exam.section';
import { resolutionSection } from '../sections/resolution.section';
import type { MedicalRecordTemplate } from './types';

export const gynecologyTemplate: MedicalRecordTemplate = {
  type: 'GYNECOLOGY_ONLY',
  version: '1.0.0',
  label: 'Ginecología',
  sections: [anamnesisSection, gynExamSection, resolutionSection],
};
