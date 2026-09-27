import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  timezone: process.env['APP_TIMEZONE'] ?? 'America/Caracas',
  auditEnabled: process.env['AUDIT_ENABLED'] !== 'false',
  traceRetentionDays: parseInt(process.env['TRACE_RETENTION_DAYS'] ?? '30', 10),
}));
