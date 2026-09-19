import { Controller, Get } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('services')
  @RequirePermission('payments', 'read')
  findServices(@CurrentUser() user: JwtPayload) {
    return this.catalogService.findServices(user.tenantId);
  }

  @Get('laboratories')
  @RequirePermission('payments', 'read')
  findLaboratoryTests(@CurrentUser() user: JwtPayload) {
    return this.catalogService.findLaboratoryTests(user.tenantId);
  }
}
