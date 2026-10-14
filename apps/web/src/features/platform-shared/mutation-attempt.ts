export interface MutationAttempt<T> {
  key: string;
  payload: T;
}

// Sólo un rechazo previo a la escritura permite editar/reemplazar el intento.
const DEFINITE_REJECTIONS = [400, 401, 403, 404, 422, 429];

export function createMutationAttempt<T>(newKey: () => string) {
  let current: MutationAttempt<T> | null = null;
  let uncertain = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    prepare(payload: T): MutationAttempt<T> {
      if (uncertain && JSON.stringify(payload) !== JSON.stringify(current?.payload)) {
        throw new Error('Resultado incierto: reintentá la operación original antes de editarla');
      }
      current ??= { key: newKey(), payload: structuredClone(payload) };
      return structuredClone(current);
    },
    retry(): MutationAttempt<T> | null {
      return current ? structuredClone(current) : null;
    },
    failed(error: unknown): void {
      const status = error instanceof Error && 'status' in error ? error.status : undefined;
      if (!uncertain && typeof status === 'number' && DEFINITE_REJECTIONS.includes(status)) {
        current = null;
        uncertain = false;
        notify();
        return;
      }
      uncertain = current !== null;
      notify();
    },
    succeeded(): void {
      current = null;
      uncertain = false;
      notify();
    },
    isUncertain: () => uncertain,
  };
}
