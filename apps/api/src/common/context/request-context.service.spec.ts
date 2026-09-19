import { AsyncLocalStorage } from 'node:async_hooks';

import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService(new AsyncLocalStorage());
  });

  it('returns undefined outside a request context', () => {
    expect(service.getStore()).toBeUndefined();
  });

  it('stores context with enterWith', () => {
    const context = { userId: 'user-1', tenantId: 'tenant-1' };

    service.enterWith(context);

    expect(service.getStore()).toEqual(context);
  });

  it('isolates concurrent stores', async () => {
    const first = service.run(
      { userId: 'user-1', tenantId: 'tenant-1' },
      async () => {
        await Promise.resolve();
        return service.getStore();
      },
    );

    const second = service.run(
      { userId: 'user-2', tenantId: 'tenant-2' },
      async () => {
        await Promise.resolve();
        return service.getStore();
      },
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      { userId: 'user-1', tenantId: 'tenant-1' },
      { userId: 'user-2', tenantId: 'tenant-2' },
    ]);
  });
});
