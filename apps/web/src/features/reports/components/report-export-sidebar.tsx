'use client';

import { Download, FileSpreadsheet, FileText, Loader2, Trash2, XCircle } from 'lucide-react';
import { useEffect } from 'react';

import { useJobStatus } from '@/features/reports/hooks/use-reports';
import { useReportJobsStore, type ReportJobItem } from '@/stores/report-jobs.store';
import { Button } from '@/shared/components/ui/button';
import { apiJson } from '@/config/api';

function JobItem({ job }: { readonly job: ReportJobItem }) {
  const { data: status } = useJobStatus(
    (job.status === 'pending' || job.status === 'processing') ? job.jobId : null
  );
  const updateJob = useReportJobsStore((s) => s.updateJob);
  const removeJob = useReportJobsStore((s) => s.removeJob);

  useEffect(() => {
    if (status) {
      updateJob(job.jobId, {
        status: status.status,
        progress: status.progress,
        filename: status.filename,
      });
    }
  }, [status, job.jobId, updateJob]);

  const handleDownload = async () => {
    try {
      const blob = await apiJson<Blob>(`/reports/jobs/${job.jobId}/download`, { responseType: 'blob' } as RequestInit & { responseType?: 'json' | 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.filename || `reporte.${job.format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error descargando el reporte');
    }
  };

  const isPending = job.status === 'pending' || job.status === 'processing';
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  return (
    <div className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2">
      {job.format === 'pdf' ? (
        <FileText className="h-4 w-4 shrink-0 text-on-surface-variant" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-on-surface-variant" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-on-surface">
          {job.filename || `Reporte ${job.format}`}
        </p>
        <p className="text-[10px] text-on-surface-variant">
          {isPending && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Generando...</span>}
          {isCompleted && 'Listo para descargar'}
          {isFailed && 'Error al generar'}
        </p>
      </div>

      {isCompleted && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      )}

      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeJob(job.jobId)}>
        <Trash2 className="h-3 w-3 text-on-surface-variant" />
      </Button>
    </div>
  );
}

export function ReportExportSidebar() {
  const jobs = useReportJobsStore((s) => s.jobs);
  const clearCompleted = useReportJobsStore((s) => s.clearCompleted);

  if (jobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-l border-outline-variant bg-surface px-4 py-4 shadow-elevation-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Descargas</h3>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearCompleted}>
          Limpiar
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <JobItem key={job.jobId} job={job} />
        ))}
      </div>
    </div>
  );
}
