'use client';

import { useQuery } from '@tanstack/react-query';

import { getAssignableRoles, getRoles } from '../services/roles.service';

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: getRoles });
}

export function useAssignableRoles() {
  return useQuery({
    queryKey: ['roles', 'assignable'],
    queryFn: getAssignableRoles,
  });
}
