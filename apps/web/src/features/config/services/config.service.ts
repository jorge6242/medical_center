import { apiJson } from '@/config/api';

export interface ConfigInitResponse {
  tenant: { name: string; slug: string; logoUrl: string | null };
  systemConfig: { igtfRate: number };
  exchangeRate: { rate: number; date: string; source: 'MANUAL' | 'API' } | null;
}

export const getInitConfig = (): Promise<ConfigInitResponse> => apiJson('/config/init');
