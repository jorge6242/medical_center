import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

interface PlatformAuditTrace {
  requestId: string;
  correlationId: string;
}

const context = new AsyncLocalStorage<PlatformAuditTrace>();

function newTrace(source: 'HTTP' | 'SYSTEM'): PlatformAuditTrace {
  const prefix = source.toLowerCase();
  return {
    requestId: `${prefix}:${randomUUID()}`,
    correlationId: `${prefix}:${randomUUID()}`,
  };
}

// IDs server-generated: never trust a client-provided tracing header as audit identity.
export function withPlatformAuditContext<T>(
  source: 'HTTP' | 'SYSTEM',
  callback: () => T,
): T {
  return context.run(newTrace(source), callback);
}

export function platformAuditTrace(): PlatformAuditTrace {
  return context.getStore() ?? newTrace('SYSTEM');
}
