'use client';

import { NAV_ITEMS } from '@/config/navigation.config';
import { useAuthStore } from '@/stores/auth.store';

export function useSidebarNav() {
  const permissions = useAuthStore((s) => s.permissions);
  const role = useAuthStore((s) => s.role);
  return NAV_ITEMS.filter((item) => {
    const hasPermission = permissions.some(
      (p) => p.resource === item.permission.resource && p.action === item.permission.action,
    );
    const hasRole = !item.visibleForRoles || (role !== null && item.visibleForRoles.includes(role));
    return hasPermission && hasRole;
  });
}
