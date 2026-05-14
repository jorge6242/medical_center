'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { usePatients } from '@/features/patients/hooks/use-patients';
import { useLabTests } from '@/features/labs/hooks/use-labs';
import { useCreateLabOrder } from '@/features/lab-orders/hooks/use-lab-orders';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { formatUsd } from '@/shared/utils/format';

export default function NuevaOrdenLaboratorioPage() {
  const router = useRouter();
  const { data: patients = [] } = usePatients();
  const { data: labTests = [] } = useLabTests();

  const [patientId, setPatientId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const { mutate, isPending, error } = useCreateLabOrder((data) => {
    setSuccess(true);
    setTimeout(() => {
      router.push(`/laboratorio/ordenes/${data.id}`);
    }, 1500);
  });

  const selectedTests = labTests.filter((t) => selectedTestIds.includes(t.id));
  const total = selectedTests.reduce((sum, t) => sum + parseFloat(t.priceUsd), 0);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (!patientId || selectedTestIds.length === 0) return;
    mutate({ patientId, labTestIds: selectedTestIds });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-on-surface">Nueva Orden de Laboratorio</h1>

      {success && (
        <div className="mb-6 rounded-lg bg-primary-container px-4 py-3 text-sm font-medium text-on-primary-container">
          Orden creada exitosamente. Redirigiendo...
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Patient Selection */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Paciente</p>
          <Select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            label="Seleccionar paciente"
            options={[
              { value: '', label: 'Seleccionar...' },
              ...patients.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.documentType}-${p.documentId})`,
              })),
            ]}
          />
        </Card>

        {/* Tests Selection */}
        <Card>
          <p className="mb-3 text-sm font-semibold text-on-surface">Tests</p>
          {labTests.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No hay tests disponibles</p>
          ) : (
            <div className="flex flex-col gap-2">
              {labTests.map((test) => {
                const selected = selectedTestIds.includes(test.id);
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => toggleTest(test.id)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline bg-surface text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="text-sm font-medium">{test.name}</span>
                    <span className="text-sm">{formatUsd(test.priceUsd)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {selectedTestIds.length === 0 && (
            <p className="mt-2 text-xs text-error">Selecciona al menos un test</p>
          )}
        </Card>

        {/* Total */}
        {total > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">Total</span>
              <span className="text-lg font-bold text-primary">{formatUsd(total)}</span>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error.message}
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            isLoading={isPending}
            disabled={!patientId || selectedTestIds.length === 0}
            className="px-8"
          >
            Crear orden
          </Button>
        </div>
      </div>
    </div>
  );
}
