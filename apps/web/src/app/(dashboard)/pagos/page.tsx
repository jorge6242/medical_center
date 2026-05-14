'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { pdf } from '@react-pdf/renderer';
import { FileDown, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { DoctorReceiptPDF } from '@/features/payments/components/doctor-receipt-pdf';
import DoctorReceiptModal from '@/features/payments/components/doctor-receipt-modal';
import { PaymentForm } from '@/features/payments/components/payment-form';
import { getReceipt } from '@/features/payments/services/receipts.service';
import {
  useCreatePaymentAdjustment,
  usePayments,
  useVoidPayment,
} from '@/features/payments/hooks/use-payments';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { formatDate, formatUsd } from '@/shared/utils/format';

function statusVariant(status: string) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'VOIDED') return 'error';
  return 'warning';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    COMPLETED: 'Completado',
    VOIDED: 'Anulado',
    PROCESSING: 'Procesando',
    INITIATED: 'Iniciado',
  };
  return map[status] ?? status;
}

function itemTypeLabel(itemType: string) {
  return itemType === 'CONSULTATION' ? 'Consulta' : 'Laboratorio';
}

function itemTypeVariant(itemType: string) {
  return itemType === 'CONSULTATION' ? 'success' : 'secondary';
}

const adjustmentSchema = z.object({
  description: z.string().min(3, 'Descripción requerida'),
  amountUsd: z.number().min(0, 'Monto requerido'),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

async function downloadReceipt(paymentId: string) {
  const data = await getReceipt(paymentId);
  const blob = await pdf(<DoctorReceiptPDF data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export default function PagosPage() {
  const { data: payments = [], isLoading } = usePayments();
  const { mutate: doVoid, isPending: voiding } = useVoidPayment();
  const { mutate: doAddAdjustment, isPending: adjusting } = useCreatePaymentAdjustment();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const selectedPayment = payments.find((payment) => payment.id === selectedPaymentId) ?? null;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { description: '', amountUsd: 0 },
  });

  const openAdjustments = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setShowAdjustmentModal(true);
  };

  const submitAdjustment = (data: AdjustmentFormData) => {
    if (!selectedPaymentId) return;
    doAddAdjustment(
      { id: selectedPaymentId, dto: data },
      {
        onSuccess: () => {
          reset();
          setShowAdjustmentModal(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Pagos</h1>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo pago
        </Button>
      </div>

      <Card>
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
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Total servicio</th>
                  <th className="pb-3 pr-4 font-medium">Total pagado USD</th>
                  <th className="pb-3 pr-4 font-medium">IGTF</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-on-surface-variant">
                      {p.id.slice(0, 8)}…
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={itemTypeVariant(p.item?.itemType ?? 'CONSULTATION')}>
                        {itemTypeLabel(p.item?.itemType ?? 'CONSULTATION')}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium text-on-surface">
                      {formatUsd(p.totalServiceUsd)}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">
                      {formatUsd(p.totalPaidUsd)}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">
                      {formatUsd(p.totalIgtfUsd)}
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatDate(p.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                    </td>
                    <td className="flex items-center gap-1 py-3">
                      {p.status === 'COMPLETED' && p.item?.itemType === 'CONSULTATION' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void downloadReceipt(p.id)}
                          title="Descargar recibo"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status === 'COMPLETED' && p.item?.itemType === 'CONSULTATION' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPaymentId(p.id);
                            setShowReceiptModal(true);
                          }}
                          title="Ver recibo"
                        >
                          Ver
                        </Button>
                      )}
                      {p.status === 'COMPLETED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={voiding}
                          onClick={() => doVoid(p.id)}
                          className="text-error hover:text-error"
                        >
                          Anular
                        </Button>
                      )}
                      {p.status === 'COMPLETED' && (
                        <Button variant="ghost" size="sm" onClick={() => openAdjustments(p.id)}>
                          Ajustes
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      No hay pagos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nuevo pago"
        className="max-w-4xl"
      >
        <PaymentForm onClose={() => setShowNewModal(false)} />
      </Modal>

      {/* Receipt preview modal (view-only) */}
      <DoctorReceiptModal
        paymentId={selectedPaymentId}
        open={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedPaymentId(null);
        }}
      />

      <Modal
        open={showAdjustmentModal}
        onClose={() => {
          setShowAdjustmentModal(false);
          setSelectedPaymentId(null);
          reset();
        }}
        title="Registrar ajuste"
      >
        {selectedPayment && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-surface-variant p-3 text-sm">
              <p className="font-medium text-on-surface">Pago {selectedPayment.id.slice(0, 8)}…</p>
              <p className="text-on-surface-variant">Total: {formatUsd(selectedPayment.totalPaidUsd)}</p>
            </div>

            <form onSubmit={handleSubmit(submitAdjustment)} className="flex flex-col gap-4">
              <Input {...register('description')} id="description" label="Descripción" error={errors.description?.message} />
              <Input
                {...register('amountUsd', { valueAsNumber: true })}
                id="amountUsd"
                label="Monto USD"
                type="number"
                step="0.01"
                error={errors.amountUsd?.message}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAdjustmentModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={adjusting}>
                  Guardar ajuste
                </Button>
              </div>
            </form>

            {selectedPayment.adjustments.length > 0 && (
              <div className="space-y-2 border-t border-outline-variant pt-4">
                <p className="text-sm font-medium text-on-surface">Ajustes previos</p>
                {selectedPayment.adjustments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-surface-variant px-3 py-2 text-sm">
                    <span className="text-on-surface-variant">{a.description}</span>
                    <span className="font-medium text-on-surface">{formatUsd(a.amountUsd)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
