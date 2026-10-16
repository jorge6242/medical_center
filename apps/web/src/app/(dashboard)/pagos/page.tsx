'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { pdf } from '@react-pdf/renderer';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { DoctorReceiptPDF } from '@/features/payments/components/doctor-receipt-pdf';
import DoctorReceiptModal from '@/features/payments/components/doctor-receipt-modal';
import { getPaymentColumns } from '@/features/payments/components/payment-columns';
import { PaymentToolbar } from '@/features/payments/components/payment-toolbar';
import { PaymentForm } from '@/features/payments/components/payment-form';
import { MedicalRecordsCreatePanel } from '@/features/medical-records/components/medical-records-create-panel';
import { getReceipt } from '@/features/payments/services/receipts.service';
import {
  useCreatePaymentAdjustment,
  usePaginatedPayments,
  useVoidPayment,
} from '@/features/payments/hooks/use-payments';
import type { PaymentResponse } from '@/features/payments/services/payments.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { formatUsd } from '@/shared/utils/format';

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
  const [showNewModal, setShowNewModal] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [receiptDownloading, setReceiptDownloading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [selectedMedicalRecordPayment, setSelectedMedicalRecordPayment] =
    useState<PaymentResponse | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const {
    data,
    isLoading,
    error: listError,
  } = usePaginatedPayments({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    status,
  });

  const { mutate: doVoid, isPending: voiding, error: voidError } = useVoidPayment();
  const {
    mutate: doAddAdjustment,
    isPending: adjusting,
    error: adjustmentError,
    reset: resetAdjustment,
  } = useCreatePaymentAdjustment();

  const payments = data?.data ?? [];
  const meta = data?.meta;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { description: '', amountUsd: 0 },
  });

  const openAdjustments = (payment: PaymentResponse) => {
    if (adjusting) return;
    resetAdjustment();
    setSelectedPayment(payment);
    setShowAdjustmentModal(true);
  };

  const openMedicalRecord = (payment: PaymentResponse) => {
    setSelectedMedicalRecordPayment(payment);
    setShowMedicalRecordModal(true);
  };

  const submitAdjustment = (data: AdjustmentFormData) => {
    if (!selectedPayment || adjusting) return;
    doAddAdjustment(
      { id: selectedPayment.id, dto: data },
      {
        onSuccess: () => {
          reset();
          setShowAdjustmentModal(false);
          setSelectedPayment(null);
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

      {voidError && <p role="alert">{voidError.message}</p>}
      {receiptError && <p role="alert">{receiptError}</p>}
      {receiptDownloading && <p role="status">Descargando recibo…</p>}
      <Card className="p-4">
        {listError && <p role="alert">{listError.message}</p>}
        {!listError && (
          <DataTable
            data={payments}
            columns={getPaymentColumns()}
            toolbar={
              <PaymentToolbar
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                status={status}
                onStatusChange={(value) => {
                  setStatus(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              />
            }
            isLoading={isLoading}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={meta?.totalPages ?? 0}
            rowCount={meta?.total ?? 0}
            meta={{
              voiding,
              onDownloadReceipt: async (payment: PaymentResponse) => {
                if (receiptDownloading) return;
                setReceiptDownloading(true);
                setReceiptError(null);
                try {
                  await downloadReceipt(payment.id);
                } catch (err: unknown) {
                  setReceiptError(
                    err instanceof Error ? err.message : 'No se pudo descargar el recibo',
                  );
                } finally {
                  setReceiptDownloading(false);
                }
              },
              onViewReceipt: (payment: PaymentResponse) => {
                setSelectedPayment(payment);
                setShowReceiptModal(true);
              },
              onVoid: (payment: PaymentResponse) => {
                if (!voiding) doVoid(payment.id);
              },
              onAdjustments: (payment: PaymentResponse) => {
                openAdjustments(payment);
              },
              onCreateMedicalRecord: (payment: PaymentResponse) => {
                openMedicalRecord(payment);
              },
            }}
          />
        )}
      </Card>

      <Modal
        open={showNewModal}
        onClose={() => {
          if (!paymentPending) setShowNewModal(false);
        }}
        title="Nuevo pago"
        className="max-w-4xl"
      >
        <PaymentForm onClose={() => setShowNewModal(false)} onPendingChange={setPaymentPending} />
      </Modal>

      {/* Receipt preview modal (view-only) */}
      <DoctorReceiptModal
        paymentId={selectedPayment?.id ?? null}
        open={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedPayment(null);
        }}
      />

      <Modal
        open={showAdjustmentModal}
        onClose={() => {
          if (adjusting) return;
          setShowAdjustmentModal(false);
          setSelectedPayment(null);
          reset();
          resetAdjustment();
        }}
        title="Registrar ajuste"
      >
        {selectedPayment && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-surface-variant p-3 text-sm">
              <p className="font-medium text-on-surface">Pago {selectedPayment.id.slice(0, 8)}…</p>
              <p className="text-on-surface-variant">
                Total: {formatUsd(selectedPayment.totalPaidUsdEquivalent)}
              </p>
            </div>

            {adjustmentError && <p role="alert">{adjustmentError.message}</p>}
            <form onSubmit={handleSubmit(submitAdjustment)} className="flex flex-col gap-4">
              <Input
                {...register('description')}
                id="description"
                label="Descripción"
                error={errors.description?.message}
              />
              <Input
                {...register('amountUsd', { valueAsNumber: true })}
                id="amountUsd"
                label="Monto USD"
                type="number"
                step="0.01"
                error={errors.amountUsd?.message}
              />
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={adjusting}
                  onClick={() => {
                    if (adjusting) return;
                    resetAdjustment();
                    setShowAdjustmentModal(false);
                  }}
                >
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
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-surface-variant px-3 py-2 text-sm"
                  >
                    <span className="text-on-surface-variant">{a.description}</span>
                    <span className="font-medium text-on-surface">{formatUsd(a.amountUsd)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showMedicalRecordModal}
        onClose={() => {
          setShowMedicalRecordModal(false);
          setSelectedMedicalRecordPayment(null);
        }}
        title="Nuevo informe médico"
        className="max-w-4xl"
      >
        {selectedMedicalRecordPayment?.item.patientId &&
        selectedMedicalRecordPayment.item.consultationId ? (
          <MedicalRecordsCreatePanel
            patientId={selectedMedicalRecordPayment.item.patientId}
            initialConsultationId={selectedMedicalRecordPayment.item.consultationId}
            onSuccess={() => {
              setShowMedicalRecordModal(false);
              setSelectedMedicalRecordPayment(null);
            }}
          />
        ) : (
          <p className="text-sm text-on-surface-variant">
            No se pudo abrir el informe médico para este pago.
          </p>
        )}
      </Modal>
    </div>
  );
}
