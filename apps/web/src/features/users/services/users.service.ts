import { apiJson } from '@/config/api';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  roleId: string;
}

export const getUsers = (): Promise<UserResponse[]> =>
  apiJson('/users');

export const createUser = (dto: CreateUserDto): Promise<UserResponse> =>
  apiJson('/users', { method: 'POST', body: JSON.stringify(dto) });

export const deactivateUser = (id: string): Promise<UserResponse> =>
  apiJson(`/users/${id}`, { method: 'DELETE' });
