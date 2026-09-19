import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';

import type { RequestContextService } from '../../common/context';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let requestContext: jest.Mocked<Pick<RequestContextService, 'enterWith'>>;

  beforeEach(() => {
    requestContext = {
      enterWith: jest.fn(),
    };

    guard = new JwtAuthGuard(new Reflector(), requestContext as unknown as RequestContextService);
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
    expect(requestContext.enterWith).toHaveBeenCalledWith({
      userId: 'user-1',
      tenantId: 'tenant-1',
    });
  });

  it('throws unauthorized when user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    expect(requestContext.enterWith).not.toHaveBeenCalled();
  });
});
