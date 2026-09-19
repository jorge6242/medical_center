'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Card } from '@/shared/components/ui/card';

import { usePatientMedicalRecords } from '../hooks/use-medical-records';
import { MedicalRecordsCreatePanel } from './medical-records-create-panel';

interface PatientMedicalRecordsPanelProps {
  patientId: string;
}

export function PatientMedicalRecordsPanel({ patientId }: PatientMedicalRecordsPanelProps) {
  const { data, isLoading } = usePatientMedicalRecords(patientId);
  const [activeTab, setActiveTab] = useState<'records' | 'history'>('records');

  const groupedRecords = useMemo(() => {
    const records = data?.records ?? [];
    return records.reduce<Record<string, typeof records>>((acc, record) => {
      const key = record.specialtyName || 'Sin especialidad';
      acc[key] ??= [];
      acc[key].push(record);
      return acc;
    }, {});
  }, [data?.records]);

  if (isLoading) {
    return <Card className="p-4">Cargando historial clínico...</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'records'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Informes médicos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Historiales médicos
        </button>
      </div>

      {activeTab === 'records' ? (
        <div className="flex flex-col gap-4">
          <MedicalRecordsCreatePanel patientId={patientId} />

          <Card className="p-4">
            <h2 className="text-lg font-semibold">Informes médicos por especialidad</h2>
            <div className="mt-4 flex flex-col gap-4">
              {Object.keys(groupedRecords).length === 0 ? (
                <p className="text-sm text-on-surface-variant">Aún no hay informes médicos.</p>
              ) : (
                Object.entries(groupedRecords).map(([specialtyName, records]) => (
                  <div key={specialtyName} className="space-y-2">
                    <h3 className="text-sm font-semibold text-on-surface">{specialtyName}</h3>
                    <div className="flex flex-col gap-2">
                      {records.map((record) => (
                        <Link
                          key={record.id}
                          href={`/medical-records/${record.id}`}
                          className="rounded-lg border border-outline p-3 text-sm transition-colors hover:bg-surface-variant"
                        >
                          <p className="font-medium">{record.doctorName}</p>
                          <p className="text-on-surface-variant">{record.specialtyName}</p>
                          <p className="text-on-surface-variant">{record.templateType} (v{record.templateVersion})</p>
                          <p className="text-on-surface-variant">{record.recordedAt}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-4">
          <h2 className="text-lg font-semibold">Historiales médicos por especialidad</h2>
          <div className="mt-4 flex flex-col gap-4">
            <HistorySection
              title="Ginecología"
              data={data?.clinicalHistory?.antecedentesGinecologicos ?? null}
            />
            <HistorySection
              title="Obstetricia"
              data={data?.clinicalHistory?.antecedentesObstetricos ?? null}
            />
            <HistorySection
              title="Antecedentes personales"
              data={data?.clinicalHistory?.antecedentesPersonales ?? null}
            />
          </div>
        </Card>
      )}

    </div>
  );
}

function HistorySection({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <section className="rounded-lg border border-outline p-3">
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      <pre className="mt-2 overflow-auto rounded-md bg-surface-container-high p-3 text-xs text-on-surface-variant">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </section>
  );
}
