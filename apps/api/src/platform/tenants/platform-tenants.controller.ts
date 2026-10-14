import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PlatformTenantIdPipe } from '../common/platform-tenant-id';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantActivationDto } from './dto/tenant-activation.dto';
import { TenantListDto } from './dto/tenant-list.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PlatformTenantProvisioningService } from './platform-tenant-provisioning.service';
import { PlatformTenantsService } from './platform-tenants.service';
import { CurrentPlatformAdmin } from '../auth/current-platform-admin.decorator';
import { PlatformCsrfGuard } from '../auth/platform-csrf.guard';
import { PlatformRealm } from '../auth/platform-realm.decorator';

import type { PlatformIdentity } from '../auth/platform-auth.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Controller('platform/tenants')
@PlatformRealm()
@UseGuards(PlatformCsrfGuard)
export class PlatformTenantsController {
  constructor(
    private readonly tenants: PlatformTenantsService,
    private readonly provisioning: PlatformTenantProvisioningService,
  ) {}

  @Post()
  create(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateTenantDto,
  ) {
    return this.provisioning.create(admin, idempotencyKey, dto);
  }

  @Get()
  list(@Query() query: TenantListDto) {
    return this.tenants.list({
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
      name: query.name,
      slug: query.slug,
      isActive: query.isActive,
    });
  }

  @Get(':id')
  findOne(@Param('id', PlatformTenantIdPipe) id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenants.update(admin, id, dto);
  }

  @Post(':id/activation')
  setActivation(
    @CurrentPlatformAdmin() admin: PlatformIdentity,
    @Param('id', PlatformTenantIdPipe) id: string,
    @Body() dto: TenantActivationDto,
  ) {
    return this.tenants.setActivation(admin, id, dto);
  }
}
