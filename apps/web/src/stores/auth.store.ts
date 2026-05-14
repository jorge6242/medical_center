'use client';

import { create } from 'zustand';

export interface Permission {
  resource: string;
  action: string;
}

interface AuthState {
  userId: string | null;
  email: string | null;
  role: string | null;
  permissions: Permission[];
  setAuth: (data: { userId: string; email: string; role: string; permissions: Permission[] }) => void;
  clearAuth: () => void;
  hasPermission: (resource: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  email: null,
  role: null,
  permissions: [],

  setAuth: (data) =>
    set({
      userId: data.userId,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
    }),

  clearAuth: () =>
    set({ userId: null, email: null, role: null, permissions: [] }),

  hasPermission: (resource, action) =>
    get().permissions.some((p) => p.resource === resource && p.action === action),
}));
