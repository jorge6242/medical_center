'use client';

import { useMemo, useState } from 'react';

import { pdf } from '@react-pdf/renderer';
import { FileDown, Loader2 } from 'lucide-react';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import type { OnChangeFn } from '@tanstack/react-table';

import { ConsolidatedReportPDF, DetailReportPDF } from '@/features/reports/components/report-pdf';
import { generateConsolidatedExcel, generateDetailExcel } from '@/features/reports/components/report-excel';
import { useConsolidatedReports, useDetailReports } from '@/features/reports/hooks/use-reports';
import { useReportJobsStore } from '@/stores/report-jobs.store';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { DataTable } from '@/shared/components/ui/data-table';
import { Input } from '@/shared/components/ui/input';
import { formatUsd, formatDate } from '@/shared/utils/format';

import type { QueryReportsParams } from '@/features/reports/services/reports.service';
import type { ConsolidatedRecord, DetailRecord } from '@/features/reports/services/reports.service';

type TabKey = 'consolidado' | 'detalle';

type TabState = {
  pagination: PaginationState;
  search: string;
};

const INITIAL_TAB_STATE: Record<TabKey, TabState> = {
  consolidado: { pagination: { pageIndex: 0, pageSize: 10 }, search: '' },
  detalle: { pagination: { pageIndex: 0, pageSize: 10 }, search: '' },
};

const consolidatedColumns: ColumnDef<ConsolidatedRecord>[] = [
  { accessorKey: 'period', header: 'Período', cell: ({ row }) => row.original.period },
  { accessorKey: 'income.consultationsUsd', header: 'Consultas', cell: ({ row }) => formatUsd(row.original.income.consultationsUsd) },
  { accessorKey: 'income.laboratoriesUsd', header: 'Laboratorios', cell: ({ row }) => formatUsd(row.original.income.laboratoriesUsd) },
  { accessorKey: 'income.totalUsd', header: 'Ingresos', cell: ({ row }) => formatUsd(row.original.income.totalUsd) },
  { accessorKey: 'expenses.totalUsd', header: 'Egresos', cell: ({ row }) => formatUsd(row.original.expenses.totalUsd) },
  { accessorKey: 'net.usd', header: 'Neto', cell: ({ row }) => formatUsd(row.original.net.usd) },
];

const detailColumns: ColumnDef<DetailRecord>[] = [
  { accessorKey: 'date', header: 'Fecha', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'recordType', header: 'Tipo', cell: ({ row }) => (row.original.recordType === 'CONSULTATION' ? 'Consulta' : row.original.recordType === 'LAB' ? 'Lab' : 'Egreso') },
  { accessorKey: 'description', header: 'Descripción', cell: ({ row }) => row.original.description },
  { accessorKey: 'amountUsd', header: 'Monto', cell: ({ row }) => formatUsd(row.original.amountUsd) },
  { accessorKey: 'status', header: 'Estado', cell: ({ row }) => row.original.status },
];

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('consolidado');
  const [isExporting, setIsExporting] = useState(false);
  const [tabState, setTabState] = useState<Record<TabKey, TabState>>(INITIAL_TAB_STATE);
  const today = new Date();
  const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(todayStr);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [type, setType] = useState<'all' | 'consultation' | 'lab' | 'expense'>('all');

  const consolidatedParams = useMemo<QueryReportsParams>(() => ({
    from,
    to,
    groupBy,
    type,
    page: tabState.consolidado.pagination.pageIndex + 1,
    limit: tabState.consolidado.pagination.pageSize,
    search: tabState.consolidado.search,
  }), [from, to, groupBy, type, tabState.consolidado]);

  const detailParams = useMemo<QueryReportsParams>(() => ({
    from,
    to,
    groupBy,
    type,
    page: tabState.detalle.pagination.pageIndex + 1,
    limit: tabState.detalle.pagination.pageSize,
    search: tabState.detalle.search,
  }), [from, to, groupBy, type, tabState.detalle]);

  const { data: consolidatedData, isLoading: loadingConsolidated } = useConsolidatedReports(consolidatedParams);
  const { data: detailData, isLoading: loadingDetail } = useDetailReports(detailParams);
  const addJob = useReportJobsStore((s) => s.addJob);
  const updateJob = useReportJobsStore((s) => s.updateJob);

  const consolidated = consolidatedData?.data ?? [];
  const consolidatedMeta = consolidatedData?.meta;
  const detail = detailData?.data ?? [];
  const detailMeta = detailData?.meta;

  const setActiveTabState = (updater: (current: TabState) => TabState) => {
    setTabState((current) => ({
      ...current,
      [activeTab]: updater(current[activeTab]),
    }));
  };

  const handleSearchChange = (value: string) => {
    setActiveTabState((current) => ({
      ...current,
      search: value,
      pagination: { ...current.pagination, pageIndex: 0 },
    }));
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setActiveTabState((current) => ({
      ...current,
      pagination: typeof updater === 'function' ? updater(current.pagination) : updater,
    }));
  };

  const handleExportPDF = async () => {
    if (activeTab === 'consolidado' && !consolidated.length) return;
    if (activeTab === 'detalle' && !detail.length) return;
    
    setIsExporting(true);
    const jobId = `local-${crypto.randomUUID()}`;
    
    addJob({
      jobId,
      status: 'processing',
      progress: 50,
      format: 'pdf',
      filename: '',
      createdAt: new Date().toISOString(),
    });

    try {
      if (activeTab === 'consolidado' && consolidated.length > 0) {
        const blob = await pdf(<ConsolidatedReportPDF data={consolidated} periodStart={from} periodEnd={to} />).toBlob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-consolidado-${from}-al-${to}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          filename: `reporte-consolidado-${from}-al-${to}.pdf`,
        });
      } else if (activeTab === 'detalle' && detail.length > 0) {
        const blob = await pdf(<DetailReportPDF data={detail} periodStart={from} periodEnd={to} />).toBlob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-detalle-${from}-al-${to}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          filename: `reporte-detalle-${from}-al-${to}.pdf`,
        });
      } else {
        // No hay datos para el tab activo
        updateJob(jobId, {
          status: 'failed',
          progress: 0,
          filename: '',
          error: 'No hay datos para exportar',
        });
      }
    } catch {
      updateJob(jobId, {
        status: 'failed',
        progress: 0,
        filename: '',
        error: 'Error generando PDF',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (activeTab === 'consolidado' && !consolidated.length) return;
    if (activeTab === 'detalle' && !detail.length) return;
    
    setIsExporting(true);
    const jobId = `local-${crypto.randomUUID()}`;
    
    addJob({
      jobId,
      status: 'processing',
      progress: 50,
      format: 'excel',
      filename: '',
      createdAt: new Date().toISOString(),
    });

    try {
      if (activeTab === 'consolidado' && consolidated.length > 0) {
        const blob = generateConsolidatedExcel(consolidated, from, to);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-consolidado-${from}-al-${to}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          filename: `reporte-consolidado-${from}-al-${to}.xlsx`,
        });
      } else if (activeTab === 'detalle' && detail.length > 0) {
        const blob = generateDetailExcel(detail, from, to);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-detalle-${from}-al-${to}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          filename: `reporte-detalle-${from}-al-${to}.xlsx`,
        });
      } else {
        // No hay datos para el tab activo
        updateJob(jobId, {
          status: 'failed',
          progress: 0,
          filename: '',
          error: 'No hay datos para exportar',
        });
      }
    } catch {
      updateJob(jobId, {
        status: 'failed',
        progress: 0,
        filename: '',
        error: 'Error generando Excel',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Reportes</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || (activeTab === 'consolidado' ? consolidated.length === 0 : detail.length === 0)}
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || (activeTab === 'consolidado' ? consolidated.length === 0 : detail.length === 0)}
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
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
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
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
            onChange={(e) => setType(e.target.value as 'all' | 'consultation' | 'lab' | 'expense')}
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
          <DataTable
            data={consolidated}
            columns={consolidatedColumns}
            toolbar={(
              <div className="flex flex-1 items-center gap-3">
                <Input
                  value={tabState.consolidado.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar en consolidado"
                  className="max-w-sm"
                />
              </div>
            )}
            isLoading={loadingConsolidated}
            pagination={tabState.consolidado.pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={consolidatedMeta?.totalPages ?? 0}
            rowCount={consolidatedMeta?.total ?? 0}
          />
        </Card>
      )}

      {/* Detalle Table */}
      {activeTab === 'detalle' && (
        <Card>
          <DataTable
            data={detail}
            columns={detailColumns}
            toolbar={(
              <div className="flex flex-1 items-center gap-3">
                <Input
                  value={tabState.detalle.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar en detalle"
                  className="max-w-sm"
                />
              </div>
            )}
            isLoading={loadingDetail}
            pagination={tabState.detalle.pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={detailMeta?.totalPages ?? 0}
            rowCount={detailMeta?.total ?? 0}
          />
        </Card>
      )}
    </div>
  );
}
