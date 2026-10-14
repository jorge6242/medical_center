import { randomUUID } from 'node:crypto';

import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { RequestContextService } from '../../common/context';
import { INTERNAL_REQUEST_KEY } from '../../common/decorators/internal-request.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PLATFORM_REALM_KEY } from '../../platform/auth/platform-auth.constants';
import { PlatformAuthGuard } from '../../platform/auth/platform-auth.guard';

import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
    private readonly platformGuard: PlatformAuthGuard,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_REQUEST_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isInternal) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isPlatformRealm = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_REALM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPlatformRealm) return this.platformGuard.canActivate(context);

    return super.canActivate(context);
  }

  handleRequest<T extends JwtPayload>(
    err: Error | null,
    user: T | null | false,
  ): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }
    this.requestContext.enterWith({
      userId: user.sub,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      correlationId:
        this.requestContext.getStore?.()?.correlationId ?? randomUUID(),
    });
    return user;
  }
}
