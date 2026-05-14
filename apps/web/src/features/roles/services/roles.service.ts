import { apiJson } from '@/config/api';

export interface PermissionResponse {
  id: string;
  resource: string;
  action: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  permissions: PermissionResponse[];
}

export const getRoles = (): Promise<RoleResponse[]> =>
  apiJson('/roles');
