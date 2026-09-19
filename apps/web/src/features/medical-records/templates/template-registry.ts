import type { MedicalRecordTemplate } from './types';
import { gynecologyTemplate } from './gynecology.template';
import { obstetricsTemplate } from './obstetrics.template';
import { gynObstetricsTemplate } from './gyn-obstetrics.template';
import { genericTemplate } from './generic.template';

export const templateRegistry: Record<string, MedicalRecordTemplate> = {
  [gynecologyTemplate.type]: gynecologyTemplate,
  [obstetricsTemplate.type]: obstetricsTemplate,
  [gynObstetricsTemplate.type]: gynObstetricsTemplate,
  [genericTemplate.type]: genericTemplate,
};

export function getTemplate(type: string): MedicalRecordTemplate | undefined {
  return templateRegistry[type];
}

export function getTemplateSections(type: string): MedicalRecordTemplate['sections'] {
  return getTemplate(type)?.sections ?? [];
}

export function getAllTemplateTypes(): string[] {
  return Object.keys(templateRegistry);
}
