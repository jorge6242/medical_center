import { apiJson } from '@/config/api';

export type ReminderType = 'APPOINTMENT' | 'BIRTHDAY';

export interface ReminderConfig {
  id: string;
  tenantId: string;
  type: ReminderType;
  isActive: boolean;
  sendToPatient: boolean;
  sendToDoctor: boolean;
  sendToAdmin: boolean;
  hoursBefore: number | null;
  daysBefore: number | null;
}

export interface ConfigInitResponse {
  tenant: { name: string; slug: string; email: string | null; logoUrl: string | null };
  systemConfig: { igtfRate: number };
  exchangeRate: { rate: number; date: string; source: 'MANUAL' | 'API' } | null;
  reminderConfigs: ReminderConfig[];
}

export const getInitConfig = (): Promise<ConfigInitResponse> => apiJson('/config/init');
