import { apiJson } from '@/config/api';

import type { ReminderConfig, ReminderType } from '@/features/config/services/config.service';

export interface UpdateTenantLogoResponse {
  logoUrl: string | null;
}

export interface ReminderConfigInput {
  type: ReminderType;
  isActive: boolean;
  sendToPatient: boolean;
  sendToDoctor: boolean;
  sendToAdmin: boolean;
}

export interface UpdateTenantSettingsDto {
  email?: string;
  reminderConfigs?: ReminderConfigInput[];
}

export function updateTenantLogo(logo: File): Promise<UpdateTenantLogoResponse> {
  const formData = new FormData();
  formData.append('logo', logo);

  return apiJson<UpdateTenantLogoResponse>('/config/logo', {
    method: 'POST',
    body: formData,
  });
}

export function updateTenantSettings(
  dto: UpdateTenantSettingsDto,
): Promise<{ email: string | null; reminderConfigs: ReminderConfig[] }> {
  return apiJson('/config/tenant', { method: 'PATCH', body: JSON.stringify(dto) });
}
