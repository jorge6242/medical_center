'use client';

import { useEffect, useRef, useState } from 'react';

import { pdf } from '@react-pdf/renderer';
import { FileDown } from 'lucide-react';

import { useAppConfig } from '@/features/config/hooks/use-app-config';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { useNotification } from '@/shared/hooks/use-notification';
import { formatBs, formatDate, formatUsd } from '@/shared/utils/format';

import { useDoctorPayout } from '../hooks/use-doctor-payouts';
import { DoctorPayoutPDF } from './doctor-payout-pdf';

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

export function DoctorPayoutDetailPanel({ payoutId }: { payoutId: string }) {
  const { data: payout, isLoading, isFetching, error } = useDoctorPayout(payoutId);
  const { data: appConfig } = useAppConfig();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const downloadGeneration = useRef(0);
  const notification = useNotification();
  useEffect(() => {
    downloadGeneration.current += 1;
    setIsDownloading(false);
    setDownloadError('');
    return () => {
      downloadGeneration.current += 1;
    };
  }, [payoutId]);

  if (isLoading) return <Card className="p-4">Cargando pago de honorarios...</Card>;
  if (error)
    return (
      <Card role="alert" className="p-4">
        {error.message}
      </Card>
    );
  if (!payout || payout.id !== payoutId)
    return (
      <Card role="alert" className="p-4">
        Pago de honorarios no encontrado.
      </Card>
    );

  const downloadPdf = async () => {
    if (isFetching || isDownloading) return;
    const generation = ++downloadGeneration.current;
    setIsDownloading(true);
    setDownloadError('');
    try {
      const blob = await pdf(
        <DoctorPayoutPDF payout={payout} tenantName={appConfig?.tenant.name} />,
      ).toBlob();
      if (generation !== downloadGeneration.current) return;
      downloadBlob(blob, `pago-honorarios-${payout.id}.pdf`);
      notification.success('El comprobante de pago de honorarios se descargó correctamente');
    } catch (downloadError: unknown) {
      if (generation !== downloadGeneration.current) return;
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : 'No se pudo generar el comprobante de pago de honorarios';
      setDownloadError(message);
      notification.error(message);
    } finally {
      if (generation === downloadGeneration.current) setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {downloadError && <p role="alert">{downloadError}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Detalle de pago de honorarios</h1>
          <p className="text-sm text-on-surface-variant">
            Consultas incluidas y monto pagado al profesional.
          </p>
        </div>
        <Button onClick={downloadPdf} isLoading={isDownloading} disabled={isFetching}>
          <FileDown className="h-4 w-4" />
          Descargar detalle PDF
        </Button>
      </div>
      <Card className="p-4">
        <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Doctor" value={payout.doctorName} />
          <DetailItem label="Cédula" value={payout.doctorDocument} />
          <DetailItem label="Fecha" value={formatDate(payout.createdAt)} />
          <DetailItem label="Método" value={payout.paymentMethod.replaceAll('_', ' ')} />
          <DetailItem label="Referencia" value={payout.referenceNumber ?? 'Sin referencia'} />
          <DetailItem label="Estado" value={payout.status === 'COMPLETED' ? 'Pagada' : 'Anulada'} />
        </dl>
      </Card>
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-on-surface">Total de pago de honorarios</h2>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <DetailItem label="Total a pagar" value={formatUsd(payout.amountUsd)} />
          <DetailItem
            label="Tasa BCV"
            value={payout.bcvExchangeRate ? `${payout.bcvExchangeRate} Bs/USD` : 'No registrada'}
          />
          <DetailItem
            label="Equivalente BCV"
            value={payout.equivalentBs ? formatBs(payout.equivalentBs) : 'No disponible'}
          />
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-on-surface">Consultas detalladas</h2>
        <div className="mt-4 divide-y divide-outline-variant">
          {payout.items.map((item) => (
            <div key={item.paymentId} className="py-3 text-sm">
              <p className="font-medium text-on-surface">
                {item.patientName}
                {item.patientDocument ? ` · ${item.patientDocument}` : ''}
              </p>
              <p className="text-on-surface-variant">
                {item.consultationDate ? formatDate(item.consultationDate) : 'Sin fecha registrada'}
              </p>
              <p className="mt-1 text-on-surface">
                {item.services
                  .map((service) => `${service.serviceName} · ${service.specialtyName}`)
                  .join(' · ') || item.description}
              </p>
            </div>
          ))}
        </div>
      </Card>
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
