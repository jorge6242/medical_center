'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Card } from '@/shared/components/ui/card';
import { formatDate, formatUsd } from '@/shared/utils/format';
import { useLabOrders, useLabOrder } from '@/features/lab-orders/hooks/use-lab-orders';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';
import { LabPaymentForm } from '@/features/lab-orders/components/lab-payment-form';
import { LabOrderForm } from '@/features/lab-orders/components/lab-order-form';

import type { LabOrderDetail } from '@/features/lab-orders/services/lab-orders.service';

function statusVariant(status: string) {
  if (status === 'PAID') return 'success';
  if (status === 'VOIDED') return 'error';
  return 'warning';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    VOIDED: 'Anulado',
  };
  return map[status] ?? status;
}

export default function OrdenesLaboratorioPage() {
  const { data: orders = [], isLoading } = useLabOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const { data: selectedOrder } = useLabOrder(selectedOrderId ?? '');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Órdenes de Laboratorio</h1>
        <Button onClick={() => setShowLabOrderModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva orden
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-4">
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
                  <th className="pb-3 pr-4 font-medium">Paciente</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-on-surface-variant">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="py-3 pr-4 text-on-surface">{order.patientName}</td>
                    <td className="py-3 pr-4 text-on-surface">{formatUsd(order.totalUsd)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatDate(order.createdAt)}</td>
                    <td className="py-3">
                      {order.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No hay órdenes de laboratorio
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title="Pagar orden de laboratorio"
        className="max-w-lg"
      >
        {selectedOrder ? (
          <LabPaymentForm
            order={selectedOrder}
            onClose={() => setSelectedOrderId(null)}
          />
        ) : (
          <div className="py-8 text-center text-on-surface-variant">Cargando...</div>
        )}
      </Modal>

      <Modal
        open={showLabOrderModal}
        onClose={() => setShowLabOrderModal(false)}
        title="Nueva orden de laboratorio"
        className="max-w-lg"
      >
        <LabOrderForm
          onSuccess={() => setShowLabOrderModal(false)}
          onCancel={() => setShowLabOrderModal(false)}
        />
      </Modal>
    </div>
  );
}
