import { apiJson } from '@/config/api';

export interface UpdateTenantLogoResponse {
  logoUrl: string | null;
}

export function updateTenantLogo(logo: File): Promise<UpdateTenantLogoResponse> {
  const formData = new FormData();
  formData.append('logo', logo);

  return apiJson<UpdateTenantLogoResponse>('/config/logo', {
    method: 'POST',
    body: formData,
  });
}
