import { anamnesisSection } from '../sections/anamnesis.section';
import { resolutionSection } from '../sections/resolution.section';
import type { MedicalRecordTemplate } from './types';

export const genericTemplate: MedicalRecordTemplate = {
  type: 'GENERIC',
  version: '1.0.0',
  label: 'Informe médico general',
  sections: [anamnesisSection, resolutionSection],
};
