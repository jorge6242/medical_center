'use client';

import { useState } from 'react';

import { FileDown, Loader2 } from 'lucide-react';

import { useConsolidatedReports, useDetailReports, useGenerateReport } from '@/features/reports/hooks/use-reports';
import { useReportJobsStore } from '@/stores/report-jobs.store';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { formatUsd, formatDate } from '@/shared/utils/format';

import type { QueryReportsParams, GenerateReportParams } from '@/features/reports/services/reports.service';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<'consolidado' | 'detalle'>('consolidado');
  const today = new Date();
  const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(todayStr);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [type, setType] = useState<'all' | 'consultation' | 'lab' | 'expense'>('all');

  const params: QueryReportsParams = { from, to, groupBy, type };
  const { data: consolidated = [], isLoading: loadingConsolidated } = useConsolidatedReports(params);
  const { data: detail = [], isLoading: loadingDetail } = useDetailReports(params);
  const { mutate: generate, isPending: generating } = useGenerateReport();
  const addJob = useReportJobsStore((s) => s.addJob);

  const handleExport = (format: 'pdf' | 'excel') => {
    const payload: GenerateReportParams = {
      from,
      to,
      type: type === 'all' ? 'consultation' : type,
      format,
      groupBy,
    };

    generate(payload, {
      onSuccess: (job) => {
        addJob({
          jobId: job.jobId,
          status: job.status,
          progress: job.progress,
          format: job.format,
          filename: job.filename,
          createdAt: job.createdAt,
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Reportes</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={generating}
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={generating}
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('consolidado')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'consolidado'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Consolidado
        </button>
        <button
          onClick={() => setActiveTab('detalle')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'detalle'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Detalle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant">Agrupar por</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
          >
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
          >
            <option value="all">Todos</option>
            <option value="consultation">Consultas</option>
            <option value="lab">Laboratorios</option>
            <option value="expense">Egresos</option>
          </select>
        </div>
      </div>

      {/* Consolidado Table */}
      {activeTab === 'consolidado' && (
        <Card>
          {loadingConsolidated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : consolidated.length === 0 ? (
            <p className="py-12 text-center text-on-surface-variant">No hay datos para el período seleccionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="pb-3 pr-4 font-medium">Período</th>
                    <th className="pb-3 pr-4 font-medium text-right">Consultas</th>
                    <th className="pb-3 pr-4 font-medium text-right">Laboratorios</th>
                    <th className="pb-3 pr-4 font-medium text-right">Ingresos</th>
                    <th className="pb-3 pr-4 font-medium text-right">Egresos</th>
                    <th className="pb-3 font-medium text-right">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidated.map((row) => (
                    <tr key={row.period} className="border-b border-outline-variant last:border-0">
                      <td className="py-3 pr-4 text-on-surface">{row.period}</td>
                      <td className="py-3 pr-4 text-right text-on-surface">{formatUsd(row.income.consultationsUsd)}</td>
                      <td className="py-3 pr-4 text-right text-on-surface">{formatUsd(row.income.laboratoriesUsd)}</td>
                      <td className="py-3 pr-4 text-right font-medium text-success">{formatUsd(row.income.totalUsd)}</td>
                      <td className="py-3 pr-4 text-right font-medium text-error">{formatUsd(row.expenses.totalUsd)}</td>
                      <td className="py-3 text-right font-bold text-on-surface">{formatUsd(row.net.usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Detalle Table */}
      {activeTab === 'detalle' && (
        <Card>
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detail.length === 0 ? (
            <p className="py-12 text-center text-on-surface-variant">No hay datos para el período seleccionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Tipo</th>
                    <th className="pb-3 pr-4 font-medium">Descripción</th>
                    <th className="pb-3 pr-4 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((row) => (
                    <tr key={row.id} className="border-b border-outline-variant last:border-0">
                      <td className="py-3 pr-4 text-on-surface">{formatDate(row.date)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.recordType === 'CONSULTATION' ? 'bg-primary-container text-on-primary-container' :
                          row.recordType === 'LAB' ? 'bg-secondary-container text-on-secondary-container' :
                          'bg-tertiary-container text-on-tertiary-container'
                        }`}>
                          {row.recordType === 'CONSULTATION' ? 'Consulta' : row.recordType === 'LAB' ? 'Lab' : 'Egreso'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-on-surface">{row.description}</td>
                      <td className="py-3 pr-4 text-right font-medium text-on-surface">{formatUsd(row.amountUsd)}</td>
                      <td className="py-3 text-on-surface-variant">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
