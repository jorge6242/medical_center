import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplateString } from './render-template';

import type { TemplateDefinition } from './template.types';

const birthdayAdminNotificationEmailTemplateHtml = readFileSync(
  join(__dirname, 'birthday-admin-notification-email.template.html'),
  'utf8',
);

export interface BirthdayAdminNotificationEmailTemplateContext {
  centerName: string;
  logoUrl: string;
  adminName: string;
  patientName: string;
  patientEmail: string;
}

export const birthdayAdminNotificationEmailTemplate: TemplateDefinition<BirthdayAdminNotificationEmailTemplateContext> =
  {
    name: 'birthday-admin-notification',
    version: 1,
    category: 'notification',
    audience: 'admin',
    subject: '{{centerName}} — Notificación de cumpleaños enviada',
    render: (context) =>
      renderTemplateString(birthdayAdminNotificationEmailTemplateHtml, context),
  };
