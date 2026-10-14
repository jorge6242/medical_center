import { writePlatformAudit } from './platform-audit';
import {
  withPlatformAuditContext,
  platformAuditTrace,
} from './platform-audit-context';

const actor = {
  id: 'admin-a',
  username: 'admin-a',
  name: 'Admin',
  sessionId: 'session-a',
};
const entry = {
  action: 'UPDATE',
  entity: 'Tenant',
  entityId: 'tenant-a',
  changedFields: ['name'],
};

describe('Platform audit request tracing', () => {
  it('writes trusted request and correlation IDs consistently within a platform operation', async () => {
    const tx = { platformAuditLog: { create: jest.fn() } };
    await withPlatformAuditContext('HTTP', async () => {
      const trace = platformAuditTrace();
      await writePlatformAudit(tx as never, actor, entry);
      await writePlatformAudit(tx as never, actor, entry);
      expect(
        tx.platformAuditLog.create.mock.calls.map(([arg]) => ({
          requestId: arg.data.requestId,
          correlationId: arg.data.correlationId,
        })),
      ).toEqual([trace, trace]);
      expect(trace.requestId).toMatch(/^http:[0-9a-f-]+$/);
      expect(trace.correlationId).toMatch(/^http:[0-9a-f-]+$/);
    });
  });

  it('isolates parallel request contexts and gives system/bootstrap a distinct fallback', async () => {
    const traces = await Promise.all(
      [1, 2].map(() =>
        withPlatformAuditContext('HTTP', async () => {
          const first = platformAuditTrace();
          await Promise.resolve();
          expect(platformAuditTrace()).toEqual(first);
          return first;
        }),
      ),
    );
    const [first, second] = traces;
    if (!first || !second) throw new Error('Expected two request traces');
    expect(first.requestId).not.toBe(second.requestId);
    expect(platformAuditTrace().requestId).toMatch(/^system:[0-9a-f-]+$/);
    await withPlatformAuditContext('SYSTEM', async () =>
      expect(platformAuditTrace().correlationId).toMatch(/^system:/),
    );
  });
});
