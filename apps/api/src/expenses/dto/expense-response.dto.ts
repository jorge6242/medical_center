import type { ExpenseStatus } from '@prisma/client';

export class ExpenseResponseDto {
  declare id: string;
  declare categoryId: string;
  declare categoryName: string;
  declare description: string;
  declare amountUsd: string;
  declare amountBs: string | null;
  declare status: ExpenseStatus;
  declare voidedBy: string | null;
  declare voidReason: string | null;
  declare createdAt: Date;
}
