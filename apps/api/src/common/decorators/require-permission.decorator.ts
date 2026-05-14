import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  resource: string;
  action: string;
}

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);
