'use client';

import { Button } from '@/shared/components/ui/button';

export function UncertainMutationNotice({
  retry,
  pending,
}: {
  readonly retry: () => void;
  readonly pending: boolean;
}) {
  return (
    <div role="alert" className="rounded-lg border border-outline p-4 text-sm">
      <p>
        El resultado es incierto. No cierres ni cambies de pantalla: reintentá la operación original
        para confirmar su resultado, sin duplicarla.
      </p>
      <Button type="button" variant="outline" isLoading={pending} onClick={retry}>
        Reintentar operación original
      </Button>
    </div>
  );
}
