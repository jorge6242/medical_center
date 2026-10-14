import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PLATFORM_ACCESS_COOKIE } from './platform-auth.constants';
import { PlatformAuthService } from './platform-auth.service';

import type { PlatformIdentity } from './platform-auth.service';

type PlatformRequest = {
  cookies?: Record<string, string | undefined>;
  platformAdmin?: PlatformIdentity;
};

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly platformAuth: PlatformAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    const token = request.cookies?.[PLATFORM_ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException();

    request.platformAdmin = await this.platformAuth.verifyToken(token);
    return true;
  }
}
