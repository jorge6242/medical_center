import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';

// Tenant.id is an opaque Prisma String: UUID defaults do not constrain historic IDs.
export const MAX_TENANT_ID_LENGTH = 128;
// Control characters must be rejected in opaque identifiers.
// eslint-disable-next-line no-control-regex
export const TENANT_ID_PATTERN = /^[^\s/\\?#\u0000-\u001f\u007f]+$/;

export function IsPlatformTenantId(): PropertyDecorator {
  return (target, propertyKey) => {
    IsString()(target, propertyKey);
    Length(1, MAX_TENANT_ID_LENGTH)(target, propertyKey);
    Matches(TENANT_ID_PATTERN)(target, propertyKey);
  };
}

@Injectable()
export class PlatformTenantIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (
      !value ||
      value.length > MAX_TENANT_ID_LENGTH ||
      !TENANT_ID_PATTERN.test(value)
    ) {
      throw new BadRequestException(
        'Identificador de tenant inválido (1-128 caracteres, sin espacios ni separadores de URL)',
      );
    }
    return value;
  }
}
