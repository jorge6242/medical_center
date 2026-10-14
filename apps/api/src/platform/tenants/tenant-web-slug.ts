import { BadRequestException } from '@nestjs/common';

// Etiqueta DNS: 3 a 63 caracteres, minúsculas, sin guiones al inicio ni al final.
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const RESERVED_HOSTS = new Set(['admin', 'www', 'api']);

export function validateDnsLabel(value: string, field: string): string {
  if (!DNS_LABEL.test(value)) {
    throw new BadRequestException(
      `${field} debe tener 3-63 caracteres en minúsculas: letras, números y guiones internos`,
    );
  }
  return value;
}

export function validateWebSlug(value: string): string {
  validateDnsLabel(value, 'webSlug');
  if (RESERVED_HOSTS.has(value)) {
    throw new BadRequestException(`webSlug "${value}" está reservado`);
  }
  return value;
}
