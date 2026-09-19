import { apiJson } from '@/config/api';

export const completeOnboarding = (token: string, password: string): Promise<{ message: string }> =>
  apiJson(`/auth/onboarding/${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
