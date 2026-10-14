import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { PlatformIdentity } from './platform-auth.service';

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformIdentity => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ platformAdmin: PlatformIdentity }>();
    return request.platformAdmin;
  },
);
