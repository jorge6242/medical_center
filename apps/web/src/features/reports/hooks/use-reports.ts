import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getConsolidated,
  getDetail,
  generateReport,
  getJobStatus,
  type QueryReportsParams,
  type GenerateReportParams,
} from '../services/reports.service';

export function useConsolidatedReports(params: QueryReportsParams) {
  return useQuery({
    queryKey: ['reports', 'consolidated', params],
    queryFn: () => getConsolidated(params),
    enabled: !!params.from && !!params.to,
  });
}

export function useDetailReports(params: QueryReportsParams) {
  return useQuery({
    queryKey: ['reports', 'detail', params],
    queryFn: () => getDetail(params),
    enabled: !!params.from && !!params.to,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', 'jobs'] });
    },
  });
}

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['reports', 'jobs', jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      if (data?.state.data?.status === 'pending' || data?.state.data?.status === 'processing') {
        return 2000;
      }
      return false;
    },
  });
}
