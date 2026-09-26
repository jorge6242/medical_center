import { Controller, Get, UseGuards } from '@nestjs/common';

import { RolesService } from './roles.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, AclGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('users', 'create')
  findAvailable(@CurrentUser() user: JwtPayload) {
    return this.rolesService.findAvailableRoles(user.tenantId);
  }
}
