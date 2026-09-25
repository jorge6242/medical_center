import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { type AuditLogService } from '../audit-log/audit-log.service';
import {
  createPaginatedResponse,
  type PaginatedResponseDto,
} from '../common/dto/paginated-response.dto';
import { type PrismaService } from '../database/prisma.service';

import type { CreateExpenseDto } from './dto/create-expense.dto';
import type { ExpenseQueryDto } from './dto/expense-query.dto';
import type { ExpenseResponseDto } from './dto/expense-response.dto';
import type { VoidExpenseDto } from './dto/void-expense.dto';
import type { ExpenseStatus, Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async findAll(
    tenantId: string,
    query: ExpenseQueryDto,
  ): Promise<PaginatedResponseDto<ExpenseResponseDto>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { categoryName: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, expenses] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(
      expenses.map((expense) => this.toResponse(expense)),
      total,
      page,
      limit,
    );
  }

  async findOne(tenantId: string, id: string): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!expense) throw new NotFoundException(`Egreso ${id} no encontrado`);
    return this.toResponse(expense);
  }

  async create(
    tenantId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, tenantId, isActive: true },
    });
    if (!category)
      throw new NotFoundException(`Categoría ${dto.categoryId} no encontrada`);

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
    await this.auditLog?.log(
      {
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense.id,
        newValues: expense,
        changedFields: Object.keys(dto),
      },
      this.prisma,
    );
    return this.toResponse(expense);
  }

  async void(
    tenantId: string,
    userId: string,
    id: string,
    dto: VoidExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!expense) throw new NotFoundException(`Egreso ${id} no encontrado`);
    if (expense.status === 'VOIDED')
      throw new BadRequestException('Egreso ya está anulado');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.expense.updateMany({
        where: { id, tenantId },
        data: { status: 'VOIDED', voidedBy: userId, voidReason: dto.reason },
      });
      const result = await tx.expense.findFirstOrThrow({
        where: { id, tenantId },
      });
      await this.auditLog?.log(
        {
          action: 'VOID',
          entity: 'Expense',
          entityId: result.id,
          newValues: { status: result.status, voidReason: result.voidReason },
          changedFields: ['status', 'voidReason'],
        },
        tx,
      );
      return result;
    });
    return this.toResponse(updated);
  }

  async findCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
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
