import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { CreateExpenseDto } from './dto/create-expense.dto';
import type { ExpenseResponseDto } from './dto/expense-response.dto';
import type { VoidExpenseDto } from './dto/void-expense.dto';
import type { ExpenseStatus, Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<ExpenseResponseDto[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map((e) => this.toResponse(e));
  }

  async findOne(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!expense) throw new NotFoundException(`Egreso ${id} no encontrado`);
    return this.toResponse(expense);
  }

  async create(tenantId: string, userId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, isActive: true },
    });
    if (!category) throw new NotFoundException(`Categoría ${dto.categoryId} no encontrada`);

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        categoryName: category.name,
        description: dto.description,
        amountUsd: dto.amountUsd,
        amountBs: dto.amountBs,
        status: 'ACTIVE',
      },
    });
    return this.toResponse(expense);
  }

  async void(tenantId: string, userId: string, id: string, dto: VoidExpenseDto): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId } });
    if (!expense) throw new NotFoundException(`Egreso ${id} no encontrado`);
    if (expense.status === 'VOIDED') throw new BadRequestException('Egreso ya está anulado');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'VOIDED', voidedBy: userId, voidReason: dto.reason },
    });
    return this.toResponse(updated);
  }

  async findCategories() {
    return this.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  private toResponse(expense: {
    id: string;
    categoryId: string;
    categoryName: string;
    description: string;
    amountUsd: Prisma.Decimal;
    amountBs: Prisma.Decimal | null;
    status: ExpenseStatus;
    voidedBy: string | null;
    voidReason: string | null;
    createdAt: Date;
  }): ExpenseResponseDto {
    return {
      id: expense.id,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      description: expense.description,
      amountUsd: expense.amountUsd.toString(),
      amountBs: expense.amountBs?.toString() ?? null,
      status: expense.status,
      voidedBy: expense.voidedBy,
      voidReason: expense.voidReason,
      createdAt: expense.createdAt,
    };
  }
}
