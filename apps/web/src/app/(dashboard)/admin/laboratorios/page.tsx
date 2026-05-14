'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { formatUsd } from '@/shared/utils/format';

interface LabTest {
  id: string;
  name: string;
  priceUsd: string;
  isActive: boolean;
}

// Simulación de datos - en producción vendrían de la API
const mockLabTests: LabTest[] = [
  { id: '1', name: 'Hemograma Completo', priceUsd: '15.00', isActive: true },
  { id: '2', name: 'Glucosa en Sangre', priceUsd: '10.00', isActive: true },
  { id: '3', name: 'Perfil Lipídico', priceUsd: '25.00', isActive: true },
];

export default function LaboratoriosPage() {
  const [tests, setTests] = useState<LabTest[]>(mockLabTests);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState({ name: '', priceUsd: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTest) {
      setTests((prev) =>
        prev.map((t) => (t.id === editingTest.id ? { ...t, ...formData } : t)),
      );
    } else {
      setTests((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ...formData, isActive: true },
      ]);
    }
    setShowModal(false);
    setEditingTest(null);
    setFormData({ name: '', priceUsd: '' });
  };

  const toggleActive = (id: string) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Laboratorios</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo test
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="pb-3 pr-4 font-medium">Nombre</th>
                <th className="pb-3 pr-4 font-medium">Precio</th>
                <th className="pb-3 pr-4 font-medium">Estado</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="border-b border-outline-variant last:border-0">
                  <td className="py-3 pr-4 text-on-surface">{test.name}</td>
                  <td className="py-3 pr-4 text-on-surface">{formatUsd(test.priceUsd)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        test.isActive
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {test.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="flex items-center gap-2 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTest(test);
                        setFormData({ name: test.name, priceUsd: test.priceUsd });
                        setShowModal(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(test.id)}>
                      {test.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant">
                    No hay tests de laboratorio registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTest(null);
          setFormData({ name: '', priceUsd: '' });
        }}
        title={editingTest ? 'Editar test' : 'Nuevo test'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Precio USD"
            type="number"
            step="0.01"
            value={formData.priceUsd}
            onChange={(e) => setFormData((prev) => ({ ...prev, priceUsd: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
