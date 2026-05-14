import { All, Controller, Next, Req, Res, UseGuards } from '@nestjs/common';

import { BullBoardService } from './bull-board.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { NextFunction, Request, Response } from 'express';

@Controller('queues')
@UseGuards(JwtAuthGuard, AclGuard)
export class BullBoardController {
  constructor(private readonly bullBoardService: BullBoardService) {}

  @All('bull-board')
  @RequirePermission('roles', 'read')
  handleRoot(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction): void {
    this.bullBoardService.getRouter()(req, res, next);
  }

  @All('bull-board/*')
  @RequirePermission('roles', 'read')
  handleNested(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction): void {
    this.bullBoardService.getRouter()(req, res, next);
  }
}
