import { Controller, Get, UseGuards } from '@nestjs/common';

import { RolesService } from './roles.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { RoleResponseDto } from './dto/role-response.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, AclGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<RoleResponseDto[]> {
    return this.rolesService.findAllRoles(user.tenantId);
  }

  @Get('assignable')
  @RequirePermission('users', 'update')
  findAssignable(@CurrentUser() user: JwtPayload): Promise<RoleResponseDto[]> {
    return this.rolesService.findAssignableRoles(user.tenantId);
  }
}
