'use client';

import { useState } from 'react';

import { Pencil, Plus, Search, UserX } from 'lucide-react';

import { PatientForm } from '@/features/patients/components/patient-form';
import { useDeactivatePatient, usePatients } from '@/features/patients/hooks/use-patients';
import type { PatientResponse } from '@/features/patients/services/patients.service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { formatDate } from '@/shared/utils/format';

export default function PacientesPage() {
  const { data: patients = [], isLoading } = usePatients();
  const deactivatePatient = useDeactivatePatient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null);
  const [search, setSearch] = useState('');

  const filtered = patients.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.documentId.includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Pacientes</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <Card>
        <div className="mb-4 max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cédula…"
            className="pl-9"
          />
          <Search className="-mt-[34px] ml-3 h-4 w-4 text-on-surface-variant" />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-variant" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Cédula</th>
                  <th className="pb-3 pr-4 font-medium">Teléfono</th>
                  <th className="pb-3 pr-4 font-medium">Registro</th>
                  <th className="pb-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 font-medium text-on-surface">{p.name}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">
                      {p.documentType}-{p.documentId}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{p.phone ?? '—'}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatDate(p.createdAt)}</td>
                    <td className="py-3">
                      <Badge variant={p.isActive ? 'success' : 'error'}>
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error"
                            onClick={() => deactivatePatient.mutate(p.id)}
                            title="Desactivar paciente"
                          >
                            <UserX className="h-4 w-4" />
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No se encontraron pacientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo paciente">
        <PatientForm onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPatient(null);
        }}
        title="Editar paciente"
      >
        <PatientForm
          patient={selectedPatient ?? undefined}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPatient(null);
          }}
        />
      </Modal>
    </div>
  );
}
