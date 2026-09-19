import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { RequestContextService } from '../../common/context';
import { INTERNAL_REQUEST_KEY } from '../../common/decorators/internal-request.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isInternal = this.reflector.getAllAndOverride<boolean>(INTERNAL_REQUEST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isInternal) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<T extends JwtPayload>(err: Error | null, user: T | null | false): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }
    this.requestContext.enterWith({
      userId: user.sub,
      tenantId: user.tenantId,
    });
    return user;
  }
}
