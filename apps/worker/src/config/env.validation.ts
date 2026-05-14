import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  API_INTERNAL_URL: Joi.string().uri().default('http://api:3001'),
  API_INTERNAL_SECRET: Joi.string().min(32).required(),
});
