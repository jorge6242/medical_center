import { type AsyncLocalStorage } from 'node:async_hooks';

import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { REQUEST_CONTEXT } from './request-context.interface';

import type { RequestContext } from './request-context.interface';

@Injectable()
export class RequestContextService {
  constructor(
    @Inject(REQUEST_CONTEXT)
    private readonly storage: AsyncLocalStorage<RequestContext>,
  ) {}

  getStore(): RequestContext | undefined {
    return this.storage.getStore();
  }

  enterWith(context: RequestContext): void {
    this.storage.enterWith(context);
  }

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  requireTenant(): RequestContext {
    const context = this.getStore();
    if (!context?.tenantId) {
      throw new InternalServerErrorException('Request context not available');
    }
    return context;
  }
}
