'use client';

import { useState } from 'react';

import { pdf } from '@react-pdf/renderer';
import { FileDown } from 'lucide-react';

import { MedicalRecordDetailPanel } from '@/features/medical-records/components/medical-record-detail-panel';
import { MedicalRecordPDF } from '@/features/medical-records/components/medical-record-pdf';
import { getMedicalRecord } from '@/features/medical-records/services/medical-records.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { useNotification } from '@/shared/hooks/use-notification';
import { formatDate, formatUsd } from '@/shared/utils/format';

import { useConsultationDetail } from '../hooks/use-consultations';
import { ConsultationDetailPDF } from './consultation-detail-pdf';

interface ConsultationDetailPanelProps {
  consultationId: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ConsultationDetailPanel({ consultationId }: ConsultationDetailPanelProps) {
  const { data: consultation, isLoading, error } = useConsultationDetail(consultationId);
  const [isDownloadingConsultation, setIsDownloadingConsultation] = useState(false);
  const [isDownloadingRecord, setIsDownloadingRecord] = useState(false);
  const notification = useNotification();

  if (isLoading) {
    return <Card className="p-4">Cargando consulta...</Card>;
  }

  if (!consultation) {
    return (
      <Card className="p-4">
        {error instanceof Error ? error.message : 'Consulta no encontrada.'}
      </Card>
    );
  }

  const downloadConsultationPdf = async () => {
    setIsDownloadingConsultation(true);

    try {
      const blob = await pdf(<ConsultationDetailPDF consultation={consultation} />).toBlob();
      downloadBlob(blob, `consulta-${consultation.id}.pdf`);
      notification.success('El detalle de la consulta se descargó correctamente');
    } catch (downloadError: unknown) {
      notification.error(
        downloadError instanceof Error
          ? downloadError.message
          : 'No se pudo generar el PDF de la consulta',
      );
    } finally {
      setIsDownloadingConsultation(false);
    }
  };

  const downloadMedicalRecordPdf = async () => {
    if (!consultation.medicalRecordId) {
      return;
    }

    setIsDownloadingRecord(true);

    try {
      const medicalRecord = await getMedicalRecord(consultation.medicalRecordId);
      const blob = await pdf(<MedicalRecordPDF data={medicalRecord} />).toBlob();
      downloadBlob(blob, `informe-medico-${medicalRecord.id}.pdf`);
      notification.success('El informe médico se descargó correctamente');
    } catch (downloadError: unknown) {
      notification.error(
        downloadError instanceof Error
          ? downloadError.message
          : 'No se pudo generar el PDF del informe médico',
      );
    } finally {
      setIsDownloadingRecord(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Detalle de consulta</h1>
          <p className="text-sm text-on-surface-variant">
            Información clínica y administrativa de la consulta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadConsultationPdf}
            isLoading={isDownloadingConsultation}
          >
            <FileDown className="h-4 w-4" />
            Descargar detalle PDF
          </Button>
          {consultation.medicalRecordId ? (
            <Button onClick={downloadMedicalRecordPdf} isLoading={isDownloadingRecord}>
              <FileDown className="h-4 w-4" />
              Descargar informe PDF
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="p-4">
        <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Fecha de consulta" value={formatDate(consultation.date)} />
          <DetailItem label="Estado" value={consultation.status} />
          <DetailItem
            label="Paciente"
            value={`${consultation.patientName} · ${consultation.patientDocument}`}
          />
          <DetailItem
            label="Doctor"
            value={`${consultation.doctorName} · ${consultation.doctorDocument}`}
          />
          <DetailItem
            label="Llegada confirmada"
            value={consultation.attendedAt ? formatDate(consultation.attendedAt) : 'Sin confirmar'}
          />
          <DetailItem label="Total de servicios" value={formatUsd(consultation.totalUsd)} />
          <DetailItem label="Notas" value={consultation.notes || 'Sin notas'} />
        </dl>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold text-on-surface">Especialidades y servicios</h2>
        <div className="mt-4 divide-y divide-outline-variant">
          {consultation.services.map((service, index) => (
            <div
              key={`${service.serviceName}-${index}`}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-on-surface">{service.serviceName}</p>
                <p className="text-on-surface-variant">{service.specialtyName}</p>
              </div>
              <p className="font-medium text-on-surface">{formatUsd(service.priceUsd)}</p>
            </div>
          ))}
        </div>
      </Card>

      {consultation.medicalRecordId ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-on-surface">Informe médico</h2>
          <MedicalRecordDetailPanel
            medicalRecordId={consultation.medicalRecordId}
            showActions={false}
          />
        </section>
      ) : (
        <Card className="p-4 text-sm text-on-surface-variant">
          Esta consulta todavía no tiene un informe médico.
        </Card>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-on-surface">{value}</dd>
    </div>
  );
}
