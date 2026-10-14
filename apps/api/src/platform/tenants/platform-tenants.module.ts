import { Module } from '@nestjs/common';

import { PlatformTenantProvisioningService } from './platform-tenant-provisioning.service';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';

@Module({
  controllers: [PlatformTenantsController],
  providers: [PlatformTenantsService, PlatformTenantProvisioningService],
})
export class PlatformTenantsModule {}
