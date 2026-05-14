import { apiJson } from '@/config/api';

export interface HomeStatsAlert {
  severity: 'info' | 'warning';
  title: string;
  message: string;
}

export interface HomeStats {
  patientsToday: number;
  doctorsToday: number;
  canceledDoctorsThisMonth: number;
  pendingPayoutDoctors: number;
  pendingPayoutAmountUsd: string;
  alerts: HomeStatsAlert[];
}

export const getHomeStats = (): Promise<HomeStats> => apiJson('/stats/home');
