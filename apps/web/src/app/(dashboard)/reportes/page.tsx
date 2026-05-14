'use client';

import { useExpenses } from '@/features/expenses/hooks/use-expenses';
import { usePayments } from '@/features/payments/hooks/use-payments';
import { Card } from '@/shared/components/ui/card';
import { formatUsd } from '@/shared/utils/format';

export default function ReportesPage() {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.totalPaidUsd), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amountUsd), 0);
  const netTotal = paidTotal - expenseTotal;
  const projection = projectMonth(paidTotal, expenseTotal);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-on-surface">Reportes</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Ingresos cobrados" value={formatUsd(paidTotal)} />
        <MetricCard label="Egresos" value={formatUsd(expenseTotal)} />
        <MetricCard label="Neto" value={formatUsd(netTotal)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Proyección ingresos mes" value={formatUsd(projection.income)} />
        <MetricCard label="Proyección neta mes" value={formatUsd(projection.net)} />
      </div>

      <Card>
        <p className="text-sm text-on-surface-variant">
          Resumen calculado desde pagos y egresos activos existentes.
        </p>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-on-surface">{value}</p>
    </Card>
  );
}

function projectMonth(income: number, expenses: number): { income: number; net: number } {
  const today = new Date();
  const day = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const factor = day > 0 ? daysInMonth / day : 1;

  return {
    income: income * factor,
    net: (income - expenses) * factor,
  };
}
