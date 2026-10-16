import type { HomeStats, HomeStatsAlert } from '@/features/stats/services/stats.service';

export const homeStatsAlertFixture: HomeStatsAlert = {
  severity: 'warning',
  title: 'Honorarios pendientes',
  message: 'Hay 2 doctores con honorarios por liquidar.',
};

export const homeStatsFixture: HomeStats = {
  patientsToday: 7,
  doctorsToday: 3,
  pendingPayoutDoctors: 2,
  pendingPayoutAmountUsd: '150.50',
  alerts: [homeStatsAlertFixture],
};
