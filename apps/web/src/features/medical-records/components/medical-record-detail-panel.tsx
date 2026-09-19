'use client';

import { useState } from 'react';

import { pdf } from '@react-pdf/renderer';
import { Printer } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/utils/format';

import { useMedicalRecord } from '../hooks/use-medical-records';
import { MedicalRecordPDF } from './medical-record-pdf';
import { resolveTemplate } from '../templates/template-resolver';
import type { MedicalRecordField } from '../schemas/types';
import type { MedicalRecordDetail } from '../services/medical-records.service';

const SHOW_TECHNICAL_DATA = false;

interface MedicalRecordDetailPanelProps {
  medicalRecordId: string;
}

export function MedicalRecordDetailPanel({ medicalRecordId }: MedicalRecordDetailPanelProps) {
  const { data, isLoading } = useMedicalRecord(medicalRecordId);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const template = data ? resolveTemplate(data.templateType, data.templateSnapshot) : undefined;
  const sections = template?.sections ?? [];

  if (isLoading) {
    return <Card className="p-4">Cargando informe médico...</Card>;
  }

  if (!data) {
    return <Card className="p-4">Informe médico no encontrado.</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleDownloadPdf(data, setExportError, setIsExporting)}
          className="mr-2"
          isLoading={isExporting}
        >
          Descargar PDF
        </Button>
        <Button type="button" variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {exportError && (
        <Card className="border-error bg-error-container p-3 text-sm text-on-error-container print:hidden">
          {exportError}
        </Card>
      )}

      <Card className="p-4 print:border-0 print:p-0 print:shadow-none">
        <h1 className="text-2xl font-bold text-on-surface">Informe médico</h1>
        <p className="text-sm text-on-surface-variant">Consulta: {data.consultationId}</p>
        <p className="text-sm text-on-surface-variant">Especialidad: {data.specialtyName}</p>
        <p className="text-sm text-on-surface-variant">Plantilla: {data.templateType} (v{data.templateVersion})</p>
        <p className="text-sm text-on-surface-variant">Estado: {data.status}</p>
        <p className="text-sm text-on-surface-variant">Fecha: {formatDate(data.recordedAt)}</p>
      </Card>

      {sections.map((section) => (
        <Card key={section.title} className="p-4 print:border-0 print:p-0 print:shadow-none">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = getNestedValue(data.clinicalData, field.name);
              return <FieldValue key={field.name} field={field} value={value} />;
            })}
          </div>
        </Card>
      ))}

      {SHOW_TECHNICAL_DATA && (
        <details className="rounded-lg border border-outline p-4 print:hidden">
          <summary className="cursor-pointer text-sm font-medium text-on-surface-variant">Ver datos técnicos</summary>
          <pre className="mt-3 overflow-auto rounded-lg bg-surface-container-high p-3 text-sm">
            {JSON.stringify(data.clinicalData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function FieldValue({ field, value }: { field: MedicalRecordField; value: unknown }) {
  const displayValue = formatValue(field, value);

  return (
    <div className="rounded-lg border border-outline p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{field.label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-on-surface">{displayValue}</p>
    </div>
  );
}

function formatValue(field: MedicalRecordField, value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Sin registrar';
  if (field.type === 'date' && typeof value === 'string') return formatDate(value);
  return String(value);
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

function handlePrint() {
  window.print();
}

async function handleDownloadPdf(
  data: MedicalRecordDetail,
  setExportError: (value: string | null) => void,
  setIsExporting: (value: boolean) => void,
) {
  setExportError(null);
  setIsExporting(true);

  try {
    const blob = await pdf(<MedicalRecordPDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error: unknown) {
    setExportError(error instanceof Error ? error.message : 'No se pudo generar el PDF');
  } finally {
    setIsExporting(false);
  }
}
