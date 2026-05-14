import { Badge } from '@/shared/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  VERIFIED: { label: 'Verificado', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  REJECTED: { label: 'Rechazado', variant: 'error' },
  NOT_FOUND: { label: 'No encontrado', variant: 'error' },
};

interface VerificationBadgeProps {
  status: string;
}

export function VerificationBadge({ status }: VerificationBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <Badge variant={config!.variant}>{config!.label}</Badge>;
}
