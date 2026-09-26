import { Badge } from '@/shared/components/ui/badge';

type VerificationStatusConfig = {
  label: string;
  variant: 'success' | 'warning' | 'error';
};

const PENDING_CONFIG: VerificationStatusConfig = { label: 'Pendiente', variant: 'warning' };

const STATUS_CONFIG: Record<string, VerificationStatusConfig> = {
  VERIFIED: { label: 'Verificado', variant: 'success' },
  PENDING: PENDING_CONFIG,
  REJECTED: { label: 'Sin registro SACS', variant: 'error' },
  NOT_FOUND: { label: 'Cédula no encontrada', variant: 'error' },
};

interface VerificationBadgeProps {
  status: string;
}

export function VerificationBadge({ status }: VerificationBadgeProps) {
  const config = STATUS_CONFIG[status] ?? PENDING_CONFIG;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
