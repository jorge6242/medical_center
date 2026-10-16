'use client';

import { useEffect, useState } from 'react';

import { usePatients } from '@/features/patients/hooks/use-patients';
import { useLaboratoryCatalog } from '@/features/labs/hooks/use-labs';
import { useCreateLabOrder } from '@/features/lab-orders/hooks/use-lab-orders';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { formatUsd } from '@/shared/utils/format';

interface LabOrderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

export function LabOrderForm({ onSuccess, onCancel, onPendingChange }: LabOrderFormProps) {
  const { data: patients = [], isFetching: patientsLoading, error: patientsError } = usePatients();
  const {
    data: labTests = [],
    isFetching: testsLoading,
    error: testsError,
  } = useLaboratoryCatalog();

  const [patientId, setPatientId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const { mutate, isPending, error } = useCreateLabOrder(() => {
    setSuccess(true);
    onSuccess?.();
  });

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const selectedTests = labTests.filter((t) => selectedTestIds.includes(t.id));
  const total = selectedTests.reduce((sum, t) => sum + parseFloat(t.priceUsd), 0);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (isPending || patientsLoading || testsLoading || patientsError || testsError) return;
    if (!patientId || selectedTestIds.length === 0) return;
    mutate({ patientId, labTestIds: selectedTestIds });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="rounded-full bg-primary-container p-4">
          <svg
            className="h-8 w-8 text-on-primary-container"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-on-surface">Orden creada exitosamente</p>
      </div>
    );
  }

  if (patientsError || testsError)
    return <p role="alert">{(patientsError ?? testsError)?.message}</p>;
  if (patientsLoading || testsLoading) return <p role="status">Cargando pacientes y tests...</p>;

  return (
    <div className="flex flex-col gap-5">
      {/* Patient Selection */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-on-surface">Paciente</p>
        <Select
          id="labPatientId"
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
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
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
        <p
          role="alert"
          className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
        >
          {error.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          isLoading={isPending}
          disabled={!patientId || selectedTestIds.length === 0}
        >
          Crear orden
        </Button>
      </div>
    </div>
  );
}
