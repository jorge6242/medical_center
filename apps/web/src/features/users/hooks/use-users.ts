'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createUser,
  deactivateUser,
  getUsers,
  type CreateUserDto,
} from '../services/users.service';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: getUsers });
}

export function useCreateUser(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createUser(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.();
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
