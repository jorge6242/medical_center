'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getMutationAttempt, registerMutationExecutor } from './mutation-registry';

export function useIdempotentAttempt<T>(
  operation: string,
  actorId: string | undefined,
  executor: (input: T, csrfToken: string, key: string) => Promise<unknown>,
) {
  const flow = useMemo(() => getMutationAttempt<T>(actorId ?? '', operation), [actorId, operation]);
  if (actorId) registerMutationExecutor(actorId, operation, executor);
  const uncertain = useSyncExternalStore(flow.subscribe, flow.isUncertain, () => false);

  useEffect(() => {
    if (!uncertain) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uncertain]);

  return {
    prepare(input: T) {
      if (!actorId) throw new Error('La sesión de plataforma no está disponible');
      return flow.prepare(input);
    },
    retry: flow.retry,
    uncertain,
    failed: flow.failed,
    succeeded: flow.succeeded,
  };
}
