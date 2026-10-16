'use client';

import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';
import { useLabOrders, useLabOrder } from '@/features/lab-orders/hooks/use-lab-orders';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { LabPaymentForm } from '@/features/lab-orders/components/lab-payment-form';
import { LabOrderForm } from '@/features/lab-orders/components/lab-order-form';
import { DataTable } from '@/shared/components/ui/data-table';
import { LabOrdersToolbar } from '@/features/lab-orders/components/lab-orders-toolbar';
import { getLabOrderColumns } from '@/features/lab-orders/components/lab-orders-columns';
import type {
  LabOrderDetail,
  LabOrderListItem,
} from '@/features/lab-orders/services/lab-orders.service';

export default function OrdenesLaboratorioPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<LabOrderDetail | null>(null);
  const paymentPending = useCallback((pending: boolean, order: LabOrderDetail) => {
    setPaymentOrder(pending ? order : null);
  }, []);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const closeOrderForm = () => {
    if (!creatingOrder) setShowLabOrderModal(false);
  };
  const {
    data: selectedOrder,
    isFetching: detailLoading,
    isError: detailFailed,
    error: detailError,
    refetch: retryDetail,
  } = useLabOrder(selectedOrderId ?? '');

  const { data, isLoading, isError, error } = useLabOrders({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
    status,
  });

  const currentOrder = paymentOrder ?? selectedOrder;
  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Órdenes de Laboratorio</h1>
        <Button onClick={() => setShowLabOrderModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva orden
        </Button>
      </div>

      <Card className="p-4">
        {isError ? (
          <p role="alert">{error.message}</p>
        ) : (
          <DataTable<LabOrderListItem>
            data={orders}
            columns={getLabOrderColumns()}
            toolbar={
              <LabOrdersToolbar
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
              onPay: (order: LabOrderListItem) => {
                if (!paymentOrder) setSelectedOrderId(order.id);
              },
            }}
          />
        )}
      </Card>

      <Modal
        open={!!selectedOrderId}
        onClose={() => {
          if (!paymentOrder) setSelectedOrderId(null);
        }}
        title="Pagar orden de laboratorio"
        className="max-w-lg"
      >
        {!paymentOrder && detailFailed ? (
          <div>
            <p role="alert">{detailError.message}</p>
            <Button onClick={() => void retryDetail()}>Reintentar</Button>
          </div>
        ) : !paymentOrder && detailLoading ? (
          <div className="py-8 text-center text-on-surface-variant">Cargando...</div>
        ) : !paymentOrder && selectedOrder && selectedOrder.id !== selectedOrderId ? (
          <p role="alert">El detalle no corresponde a la orden seleccionada</p>
        ) : !paymentOrder && selectedOrder && selectedOrder.status !== 'PENDING' ? (
          <p role="alert">La orden ya no está pendiente</p>
        ) : currentOrder ? (
          <LabPaymentForm
            order={currentOrder}
            onPendingChange={paymentPending}
            onClose={() => {
              setPaymentOrder(null);
              setSelectedOrderId(null);
            }}
          />
        ) : (
          <div className="py-8 text-center text-on-surface-variant">Cargando...</div>
        )}
      </Modal>

      <Modal
        open={showLabOrderModal}
        onClose={closeOrderForm}
        title="Nueva orden de laboratorio"
        className="max-w-lg"
      >
        <LabOrderForm
          onSuccess={() => setShowLabOrderModal(false)}
          onCancel={closeOrderForm}
          onPendingChange={setCreatingOrder}
        />
      </Modal>
    </div>
  );
}
