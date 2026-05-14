'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { useRoles } from '@/features/roles/hooks/use-roles';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

const ACTION_LABELS: Record<string, string> = {
  create: 'Crear',
  read: 'Ver',
  update: 'Editar',
  delete: 'Desactivar/Anular',
};

const RESOURCE_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  doctors: 'Doctores',
  payments: 'Pagos',
  expenses: 'Egresos',
  reports: 'Reportes',
  specialties: 'Especialidades',
  users: 'Usuarios',
  roles: 'Roles',
};

export default function RolesPage() {
  const { data: roles = [], isLoading } = useRoles();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-on-surface">Roles y Permisos</h1>

      <Card>
        {isLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-variant" />)}</div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {roles.map((role) => (
              <div key={role.id}>
                <button
                  type="button"
                  onClick={() => toggle(role.id)}
                  className="flex w-full items-center gap-2 py-3 text-left"
                >
                  {expanded.has(role.id) ? <ChevronDown className="h-4 w-4 text-on-surface-variant" /> : <ChevronRight className="h-4 w-4 text-on-surface-variant" />}
                  <span className="font-medium capitalize text-on-surface">{role.name}</span>
                  <Badge variant="default">{role.permissions.length} permisos</Badge>
                </button>
                {expanded.has(role.id) && (
                  <div className="mb-3 ml-6">
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((p) => (
                        <span key={p.id} className="rounded-full bg-primary-container px-3 py-1 text-xs text-on-primary-container">
                          {RESOURCE_LABELS[p.resource] ?? p.resource} · {ACTION_LABELS[p.action] ?? p.action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {roles.length === 0 && <p className="py-8 text-center text-on-surface-variant">No hay roles</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
