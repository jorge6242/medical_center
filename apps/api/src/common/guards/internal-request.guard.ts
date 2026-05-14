import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { INTERNAL_REQUEST_KEY } from '../decorators/internal-request.decorator';

@Injectable()
export class InternalRequestGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(INTERNAL_REQUEST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isInternal) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const secret = process.env['API_INTERNAL_SECRET'];
    const provided = request.headers['x-internal-secret'];

    if (!secret || provided !== secret) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
