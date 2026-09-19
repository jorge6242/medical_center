'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { ExpenseForm } from '@/features/expenses/components/expense-form';
import { getExpenseColumns } from '@/features/expenses/components/expense-columns';
import { ExpenseToolbar } from '@/features/expenses/components/expense-toolbar';
import { usePaginatedExpenses, useVoidExpense } from '@/features/expenses/hooks/use-expenses';
import type { ExpenseResponse } from '@/features/expenses/services/expenses.service';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Modal } from '@/shared/components/ui/modal';
import { formatUsd } from '@/shared/utils/format';

export default function EgresosPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const { mutate: doVoid, isPending: voiding } = useVoidExpense();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseResponse | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data, isLoading } = usePaginatedExpenses({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search,
  });

  const expenses = data?.data ?? [];
  const meta = data?.meta;

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
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nuevo egreso
        </Button>
      </div>

      <Card className="p-4">
        <DataTable
          data={expenses}
          columns={getExpenseColumns()}
          toolbar={<ExpenseToolbar search={search} onSearchChange={(value) => {
            setSearch(value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }} />}
          isLoading={isLoading}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          meta={{
            onView: (expense: ExpenseResponse) => {
              setSelectedExpense(expense);
              setShowViewModal(true);
            },
            onVoid: (expense: ExpenseResponse) => setVoidingId(expense.id),
          }}
        />
      </Card>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo egreso">
        <ExpenseForm onClose={() => setShowCreateModal(false)} />
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
                <p className="font-medium text-on-surface">{selectedExpense.status}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">Registro</p>
                <p className="font-medium text-on-surface">{new Date(selectedExpense.createdAt).toLocaleDateString('es-VE')}</p>
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
              onClick={() => {
                setVoidingId(null);
                setVoidReason('');
              }}
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
