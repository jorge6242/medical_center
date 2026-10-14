import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';
import { type PlatformAuthGuard } from '../../platform/auth/platform-auth.guard';
import { PlatformRealm } from '../../platform/auth/platform-realm.decorator';

import type { RequestContextService } from '../../common/context';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import type { ExecutionContext } from '@nestjs/common';

class PlatformController {
  @PlatformRealm()
  platformHandler(): void {}
}

class TenantController {
  tenantHandler(): void {}
}

function contextFor(
  controller: new () => object,
  handlerName: string,
): ExecutionContext {
  const handler = controller.prototype[handlerName] as () => void;
  return {
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let requestContext: jest.Mocked<Pick<RequestContextService, 'enterWith'>>;
  let platformGuard: { canActivate: jest.Mock };

  beforeEach(() => {
    requestContext = {
      enterWith: jest.fn(),
    };
    platformGuard = { canActivate: jest.fn().mockResolvedValue(true) };

    guard = new JwtAuthGuard(
      new Reflector(),
      requestContext as unknown as RequestContextService,
      platformGuard as unknown as PlatformAuthGuard,
    );
  });

  it('delegates platform-realm routes to the platform guard', async () => {
    const context = contextFor(PlatformController, 'platformHandler');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(platformGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('does not run the platform guard on tenant routes', () => {
    const context = contextFor(TenantController, 'tenantHandler');
    const passportSpy = jest
      .spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype) as {
          canActivate: (ctx: ExecutionContext) => unknown;
        },
        'canActivate',
      )
      .mockReturnValue(true);

    guard.canActivate(context);

    expect(platformGuard.canActivate).not.toHaveBeenCalled();
    expect(passportSpy).toHaveBeenCalledWith(context);
    passportSpy.mockRestore();
  });

  it('stores request context from the validated JWT payload', () => {
    const user: JwtPayload = {
      sub: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      doctorId: null,
      permissions: [],
      roleVersion: 1,
    };

    const result = guard.handleRequest(null, user);

    expect(result).toBe(user);
    expect(requestContext.enterWith).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        correlationId: expect.any(String),
      }),
    );
  });

  it('throws unauthorized when user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
    expect(requestContext.enterWith).not.toHaveBeenCalled();
  });
});
