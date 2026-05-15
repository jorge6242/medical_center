'use client';

import { Download, FileSpreadsheet, FileText, Loader2, Trash2 } from 'lucide-react';

import { useReportJobsStore, type ReportJobItem } from '@/stores/report-jobs.store';
import { Button } from '@/shared/components/ui/button';

function JobItem({ job }: { readonly job: ReportJobItem }) {
  const removeJob = useReportJobsStore((s) => s.removeJob);

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
          {isFailed && `Error: ${job.error || 'Falló'}`}
        </p>
      </div>

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
