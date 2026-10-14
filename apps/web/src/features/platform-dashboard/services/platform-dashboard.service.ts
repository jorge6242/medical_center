import { apiJson } from '@/config/api';

export interface PlatformDashboardSummary {
  tenants: { active: number; inactive: number };
  subscriptionsByStatus: Record<string, number>;
  pendingBalanceUsd: string;
  confirmedRevenueMonthUsd: string;
  month: { from: string; to: string };
}

export const getPlatformDashboard = (): Promise<PlatformDashboardSummary> =>
  apiJson('/platform/dashboard');
