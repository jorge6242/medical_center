'use client';

import React, { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !paymentId) return;
    let mounted = true;
    setLoading(true);
    void getReceipt(paymentId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [open, paymentId]);

  async function handleDownload() {
    if (!data) return;
    const blob = await pdf(<DoctorReceiptPDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <Modal open={open} onClose={onClose} title="Ver recibo" className="max-w-3xl">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 rounded-full bg-surface-variant animate-pulse" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <DoctorReceiptView data={data} />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleDownload} className="mr-2">
              Descargar PDF
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-on-surface-variant">No se pudo cargar el recibo.</div>
      )}
    </Modal>
  );
}

export default DoctorReceiptModal;
