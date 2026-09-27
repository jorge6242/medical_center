'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createUser,
  deactivateUser,
  getUsers,
  updateUser,
  type CreateUserDto,
  type UpdateUserDto,
} from '../services/users.service';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: getUsers });
}

export function useCreateUser(onSuccess?: (user: Awaited<ReturnType<typeof createUser>>) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createUser(dto),
    onSuccess: (user) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.(user);
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) => updateUser(id, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.();
    },
  });
}
