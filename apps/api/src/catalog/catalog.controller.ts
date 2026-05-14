import { Controller, Get } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('services')
  @Public()
  findServices() {
    return this.catalogService.findServices();
  }
}
