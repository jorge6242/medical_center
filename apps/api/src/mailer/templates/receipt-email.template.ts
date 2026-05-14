import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const receiptEmailTemplateHtml = readFileSync(
  join(__dirname, 'receipt-email.template.html'),
  'utf8',
);

export interface ReceiptEmailTemplateContext {
  receiptNumber: string;
  doctorName: string;
  doctorShare: string;
  paymentId: string;
}

export const receiptEmailTemplate: TemplateDefinition<ReceiptEmailTemplateContext> = {
  name: 'receipt-generated',
  version: 1,
  category: 'receipt',
  audience: 'doctor',
  subject: 'Recibo {{receiptNumber}}',
  render: (context) => renderTemplateString(receiptEmailTemplateHtml, context),
};
