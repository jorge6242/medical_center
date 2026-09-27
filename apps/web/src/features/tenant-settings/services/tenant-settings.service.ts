import { apiJson } from '@/config/api';

export interface UpdateTenantLogoResponse {
  logoUrl: string | null;
}

export interface UpdateTenantSettingsDto {
  email?: string;
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
): Promise<{ email: string | null }> {
  return apiJson('/config/tenant', { method: 'PATCH', body: JSON.stringify(dto) });
}
