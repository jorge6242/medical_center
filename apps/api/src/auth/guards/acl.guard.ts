import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { INTERNAL_REQUEST_KEY } from '../../common/decorators/internal-request.decorator';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from '../../common/decorators/require-permission.decorator';
import { RolesService } from '../../roles/roles.service';

import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_REQUEST_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isInternal) return true;

    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    await this.rolesService.assertRoleVersionCurrent(
      user.tenantId,
      user.role,
      user.roleVersion,
    );

    const hasPermission = user.permissions.some(
      (p) => p.resource === required.resource && p.action === required.action,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${required.resource}:${required.action}`,
      );
    }
    return true;
  }
}
