import { apiJson } from '@/config/api';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  identificationNumber: string | null;
  role: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  name: string;
  lastName: string;
  identificationNumber?: string;
  password: string;
  roleId: string;
}

export interface UpdateUserDto {
  email: string;
  name: string;
  lastName: string;
  identificationNumber?: string;
  password?: string;
  roleId: string;
}

export const getUsers = (): Promise<UserResponse[]> => apiJson('/users');

export const createUser = (dto: CreateUserDto): Promise<UserResponse> =>
  apiJson('/users', { method: 'POST', body: JSON.stringify(dto) });

export const deactivateUser = (id: string): Promise<UserResponse> =>
  apiJson(`/users/${id}`, { method: 'DELETE' });

export const updateUser = (id: string, dto: UpdateUserDto): Promise<UserResponse> =>
  apiJson(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
