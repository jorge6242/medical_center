import { createMutationAttempt } from './mutation-attempt';

type Executor = (payload: unknown, csrfToken: string, key: string) => Promise<unknown>;
interface Entry {
  actorId: string;
  operation: string;
  flow: ReturnType<typeof createMutationAttempt<unknown>>;
  executor?: Executor;
}

// Browser module lifetime survives App Router layout unmounts. RAM ONLY, no storage.
const attempts = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;
const scopeFor = (actorId: string, operation: string) => JSON.stringify([actorId, operation]);

export function getMutationAttempt<T>(actorId: string, operation: string) {
  const scope = scopeFor(actorId, operation);
  let entry = attempts.get(scope);
  if (!entry) {
    const flow = createMutationAttempt<unknown>(() => crypto.randomUUID());
    flow.subscribe(() => {
      version++;
      listeners.forEach((listener) => listener());
    });
    entry = { actorId, operation, flow };
    attempts.set(scope, entry);
  }
  return entry.flow as ReturnType<typeof createMutationAttempt<T>>;
}

export function registerMutationExecutor<T>(
  actorId: string,
  operation: string,
  executor: (payload: T, csrfToken: string, key: string) => Promise<unknown>,
) {
  getMutationAttempt<T>(actorId, operation);
  const entry = attempts.get(scopeFor(actorId, operation));
  if (entry) entry.executor = (payload, token, key) => executor(payload as T, token, key);
}

export function pendingMutationOperations(actorId: string): string[] {
  return [...attempts.values()]
    .filter((entry) => entry.actorId === actorId && entry.flow.isUncertain())
    .map((entry) => entry.operation);
}

export async function replayMutationAttempt(actorId: string, operation: string, csrfToken: string) {
  const entry = attempts.get(scopeFor(actorId, operation));
  const request = entry?.flow.retry();
  if (!entry?.executor || !request)
    throw new Error('No hay operación pendiente para este administrador');
  try {
    const result = await entry.executor(request.payload, csrfToken, request.key);
    entry.flow.succeeded();
    return result;
  } catch (error) {
    entry.flow.failed(error);
    throw error;
  }
}

export function subscribeMutationRegistry(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const mutationRegistryVersion = () => version;
