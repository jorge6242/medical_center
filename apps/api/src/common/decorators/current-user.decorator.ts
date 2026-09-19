import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  // tenantId is required for AsyncLocalStorage audit context.
  tenantId: string;
  email: string;
  role: string;
  doctorId: string | null;
  permissions: Array<{ resource: string; action: string }>;
  roleVersion: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
