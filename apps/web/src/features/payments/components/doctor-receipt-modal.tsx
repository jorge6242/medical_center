'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { getReceipt } from '@/features/payments/services/receipts.service';
import DoctorReceiptView from './doctor-receipt-view';
import { pdf } from '@react-pdf/renderer';
import { DoctorReceiptPDF } from '@/features/payments/components/doctor-receipt-pdf';
import type { ReceiptData } from '@/features/payments/services/receipts.service';

interface Props {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
}

export function DoctorReceiptModal({ paymentId, open, onClose }: Props) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !paymentId) return;
    let mounted = true;
    setLoading(true);
    setDownloading(false);
    setError(null);
    setDownloadError(null);
    setData(null);
    void getReceipt(paymentId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'No se pudo cargar el recibo';
        setError(message);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
      generation.current += 1;
    };
  }, [open, paymentId]);

  async function handleDownload() {
    if (!data || downloading) return;
    const currentGeneration = generation.current;
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await pdf(<DoctorReceiptPDF data={data} />).toBlob();
      if (currentGeneration !== generation.current) return;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: unknown) {
      if (currentGeneration === generation.current)
        setDownloadError(err instanceof Error ? err.message : 'No se pudo descargar el recibo');
    } finally {
      if (currentGeneration === generation.current) setDownloading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ver recibo" className="max-w-3xl">
      {loading ? (
        <div role="status" className="flex items-center justify-center py-8">
          Cargando recibo…
          <div className="h-8 w-8 rounded-full bg-surface-variant animate-pulse" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <DoctorReceiptView data={data} />
          {downloadError && <p role="alert">{downloadError}</p>}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handleDownload}
              isLoading={downloading}
              className="mr-2"
            >
              Descargar PDF
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="py-6 text-center text-on-surface-variant">
          {error}
        </div>
      ) : (
        <div className="py-6 text-center text-on-surface-variant">No se pudo cargar el recibo.</div>
      )}
    </Modal>
  );
}

export default DoctorReceiptModal;
