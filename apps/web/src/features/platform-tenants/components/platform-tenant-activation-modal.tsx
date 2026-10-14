'use client';

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/modal';

interface Props {
  open: boolean;
  tenantName: string;
  nextIsActive: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function PlatformTenantActivationModal({
  open,
  tenantName,
  nextIsActive,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const action = nextIsActive ? 'Reactivar' : 'Desactivar';

  return (
    <Modal open={open} onClose={onClose} title={`${action} ${tenantName}`}>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <p className="text-sm text-on-surface-variant">
          {nextIsActive
            ? 'El centro vuelve a permitir el acceso de sus usuarios.'
            : 'Sus usuarios dejarán de poder iniciar sesión. Los datos se conservan.'}
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium text-on-surface">
          Motivo (obligatorio)
          <textarea
            className="min-h-24 rounded-lg border border-outline bg-surface p-3 text-sm"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={nextIsActive ? 'primary' : 'destructive'}
            disabled={!trimmed}
            isLoading={isPending}
            onClick={() => onConfirm(trimmed)}
          >
            {action}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
