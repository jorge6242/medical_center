import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { VoidExpenseDto } from './dto/void-expense.dto';
import { ExpensesService } from './expenses.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

import type { ExpenseResponseDto } from './dto/expense-response.dto';


@Controller('expenses')
@UseGuards(JwtAuthGuard, AclGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  @RequirePermission('expenses', 'read')
  findCategories() {
    return this.expensesService.findCategories();
  }

  @Get()
  @RequirePermission('expenses', 'read')
  findAll(@CurrentUser() user: JwtPayload): Promise<ExpenseResponseDto[]> {
    return this.expensesService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('expenses', 'read')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermission('expenses', 'create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.create(user.tenantId, user.sub, dto);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('expenses', 'delete')
  void(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.void(user.tenantId, user.sub, id, dto);
  }
}
