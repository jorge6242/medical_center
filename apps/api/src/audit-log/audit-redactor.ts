import { Prisma } from '@prisma/client';

const SENSITIVE_KEY =
  /(password|secret|token|jwt|cookie|authorization|account(number)?|bank|document|phone|email|clinical|history|anamnesis|medical)/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  if (typeof value !== 'object' || value === null) {
    return typeof value === 'string' &&
      /(bearer\s|eyJ[a-zA-Z0-9_-]+\.)/i.test(value)
      ? '[REDACTED]'
      : value;
  }
  return redactRecord(value as Record<string, unknown>);
}

export function redactRecord(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, nested]) => [key, redactValue(nested)]),
  );
}

export function redact(value: unknown): unknown {
  return redactValue(value);
}
