'use client';

import { useAuthStore } from '@/stores/auth.store';
import { apiFetch } from '@/config/api';

export function Topbar() {
  const { email, role, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore API errors
    } finally {
      clearAuth();
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {email ?? 'Usuario'}
        </span>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
          {role ?? 'Sin rol'}
        </span>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        Cerrar sesión
      </button>
    </header>
  );
}