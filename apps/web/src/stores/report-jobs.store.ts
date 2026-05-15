import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReportJobItem {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  filename?: string;
  error?: string;
  createdAt: string;
}

interface ReportJobsState {
  jobs: ReportJobItem[];
  addJob: (job: ReportJobItem) => void;
  updateJob: (jobId: string, updates: Partial<ReportJobItem>) => void;
  removeJob: (jobId: string) => void;
  clearCompleted: () => void;
  cleanupStaleJobs: () => void;
}

export const useReportJobsStore = create<ReportJobsState>()(
  persist(
    (set) => ({
      jobs: [],
      addJob: (job) =>
        set((state) => ({
          jobs: [job, ...state.jobs].slice(0, 20), // Keep last 20
        })),
      updateJob: (jobId, updates) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.jobId === jobId ? { ...j, ...updates } : j
          ),
        })),
      removeJob: (jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.jobId !== jobId),
        })),
      clearCompleted: () =>
        set((state) => ({
          jobs: state.jobs.filter(
            (j) => j.status === 'pending' || j.status === 'processing'
          ),
        })),
      cleanupStaleJobs: () =>
        set((state) => ({
          jobs: state.jobs.map((j) => {
            // Mark as failed if processing for more than 5 minutes
            if (j.status === 'processing') {
              const created = new Date(j.createdAt).getTime();
              const now = Date.now();
              if (now - created > 5 * 60 * 1000) {
                return { ...j, status: 'failed' as const, error: 'Tiempo de generación excedido' };
              }
            }
            return j;
          }),
        })),
    }),
    {
      name: 'report-jobs-storage',
    }
  )
);
