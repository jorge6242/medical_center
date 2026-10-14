import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  PLATFORM_JWT_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_SECRET'))
    .required(),
  PLATFORM_ALLOWED_ORIGINS: Joi.string().allow('').optional(),
  APP_TIMEZONE: Joi.string().default('America/Caracas'),
  API_INTERNAL_SECRET: Joi.string().min(32).required(),
  RESEND_API_KEY: Joi.string().pattern(/^re_/).required(),
  RESEND_FROM_EMAIL: Joi.string().min(3).required(),
  AUDIT_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  TRACE_RETENTION_DAYS: Joi.number().integer().min(1).max(3650).default(30),
  S3_ENDPOINT: Joi.string().uri().allow('').optional(),
  S3_REGION: Joi.string().allow('').default('auto'),
  S3_BUCKET: Joi.string().allow('').optional(),
  S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  S3_SIGNED_URL_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(604800)
    .default(43200),
});
