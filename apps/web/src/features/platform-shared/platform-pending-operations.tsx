'use client';

import { useSyncExternalStore } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { useNotification } from '@/shared/hooks/use-notification';
import {
  mutationRegistryVersion,
  pendingMutationOperations,
  replayMutationAttempt,
  subscribeMutationRegistry,
} from './mutation-registry';

export function PlatformPendingOperations({
  actorId,
  csrfToken,
}: {
  readonly actorId: string;
  readonly csrfToken: string;
}) {
  useSyncExternalStore(subscribeMutationRegistry, mutationRegistryVersion, () => 0);
  const operations = pendingMutationOperations(actorId);
  const queryClient = useQueryClient();
  const notify = useNotification();
  const replay = useMutation({
    mutationFn: (operation: string) => replayMutationAttempt(actorId, operation, csrfToken),
    onSuccess: () => {
      notify.success('Operación original confirmada. Se actualizaron los datos.');
      void queryClient.invalidateQueries({ queryKey: ['platform'] });
    },
    onError: (error: Error) => notify.error(error.message),
  });
  if (!operations.length) return null;
  return (
    <section role="alert" className="m-4 rounded-lg border border-outline bg-surface p-4">
      <p>
        Hay operaciones con resultado incierto de esta sesión de navegador. Confirmalas reintentando
        el payload original; no registres el mismo cobro ni otra alta nueva.
      </p>
      {operations.map((operation) => (
        <div key={operation} className="mt-2 flex items-center gap-3">
          <span className="text-sm">{operation}</span>
          <Button
            variant="outline"
            type="button"
            isLoading={replay.isPending}
            onClick={() => replay.mutate(operation)}
          >
            Confirmar operación original
          </Button>
        </div>
      ))}
    </section>
  );
}
