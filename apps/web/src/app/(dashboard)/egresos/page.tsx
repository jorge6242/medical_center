'use client';

import { useState } from 'react';

import { Eye, Plus } from 'lucide-react';

import { ExpenseForm } from '@/features/expenses/components/expense-form';
import { useExpenses, useVoidExpense } from '@/features/expenses/hooks/use-expenses';
import type { ExpenseResponse } from '@/features/expenses/services/expenses.service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Modal } from '@/shared/components/ui/modal';
import { formatDate, formatUsd } from '@/shared/utils/format';

export default function EgresosPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { mutate: doVoid, isPending: voiding } = useVoidExpense();
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponse | null>(null);

  const handleVoid = (id: string) => {
    if (!voidReason.trim()) return;
    doVoid({ id, reason: voidReason });
    setVoidingId(null);
    setVoidReason('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Egresos</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo egreso
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
                  <th className="pb-3 pr-4 font-medium">Categoría</th>
                  <th className="pb-3 pr-4 font-medium">Descripción</th>
                  <th className="pb-3 pr-4 font-medium">Monto USD</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 font-medium text-on-surface">{e.categoryName}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{e.description}</td>
                    <td className="py-3 pr-4 text-on-surface">{formatUsd(e.amountUsd)}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{formatDate(e.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={e.status === 'ACTIVE' ? 'success' : 'error'}>
                        {e.status === 'ACTIVE' ? 'Activo' : 'Anulado'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(e);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        {e.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoidingId(e.id)}
                            className="text-error hover:text-error"
                          >
                            Anular
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No hay egresos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo egreso">
        <ExpenseForm onClose={() => setShowModal(false)} />
      </Modal>

      <Modal
        open={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedExpense(null);
        }}
        title="Detalle de egreso"
      >
        {selectedExpense && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-on-surface-variant">Categoría</p>
              <p className="font-medium text-on-surface">{selectedExpense.categoryName}</p>
            </div>
            <div>
              <p className="text-on-surface-variant">Descripción</p>
              <p className="font-medium text-on-surface">{selectedExpense.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-on-surface-variant">Monto USD</p>
                <p className="font-medium text-on-surface">{formatUsd(selectedExpense.amountUsd)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Monto Bs</p>
                <p className="font-medium text-on-surface">
                  {selectedExpense.amountBs ? formatUsd(selectedExpense.amountBs) : '—'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-on-surface-variant">Estado</p>
                <Badge variant={selectedExpense.status === 'ACTIVE' ? 'success' : 'error'}>
                  {selectedExpense.status === 'ACTIVE' ? 'Activo' : 'Anulado'}
                </Badge>
              </div>
              <div>
                <p className="text-on-surface-variant">Registro</p>
                <p className="font-medium text-on-surface">{formatDate(selectedExpense.createdAt)}</p>
              </div>
            </div>
            {selectedExpense.voidReason && (
              <div>
                <p className="text-on-surface-variant">Motivo de anulación</p>
                <p className="font-medium text-on-surface">{selectedExpense.voidReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!voidingId}
        onClose={() => { setVoidingId(null); setVoidReason(''); }}
        title="Anular egreso"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface-variant">
            Esta acción no se puede deshacer. Ingresa el motivo de la anulación.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="voidReason" className="text-sm font-medium text-on-surface">
              Motivo
            </label>
            <textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe el motivo de la anulación…"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setVoidingId(null); setVoidReason(''); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={voiding}
              disabled={!voidReason.trim()}
              onClick={() => voidingId && handleVoid(voidingId)}
            >
              Confirmar anulación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
