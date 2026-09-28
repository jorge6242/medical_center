import { registerAs } from '@nestjs/config';

export const mailerConfig = registerAs('mailer', () => ({
  apiKey: process.env['RESEND_API_KEY'],
  from: process.env['RESEND_FROM_EMAIL'],
}));
