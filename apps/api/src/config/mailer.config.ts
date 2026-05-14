import { registerAs } from '@nestjs/config';

export const mailerConfig = registerAs('mailer', () => ({
  host: process.env['MAIL_HOST'],
  port: Number(process.env['MAIL_PORT'] ?? 587),
  user: process.env['MAIL_USER'],
  pass: process.env['MAIL_PASS'],
  from: process.env['MAIL_FROM'],
}));
