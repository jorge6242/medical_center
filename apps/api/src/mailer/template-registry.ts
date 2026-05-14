import { receiptEmailTemplate } from './templates';

export const TEMPLATE_REGISTRY = {
  receiptEmail: receiptEmailTemplate,
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
