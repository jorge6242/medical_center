import { Prisma } from '@prisma/client';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { RequestContextService } from '../common/context';
import type { PrismaClient } from '@prisma/client';

const AUDITED_MODELS = new Set([
  'Patient',
  'Doctor',
  'User',
  'Specialty',
  'Service',
  'ExpenseCategory',
  'DoctorBankAccount',
  'ExchangeRate',
  'SystemConfig',
]);

const AUDITED_OPERATIONS = new Set(['create', 'update', 'updateMany']);

type MutationArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type ModelDelegate = {
  findUnique(args: {
    where: Record<string, unknown>;
  }): Promise<Record<string, unknown> | null>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getModelDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function getMutationArgs(args: unknown): MutationArgs {
  if (!isRecord(args)) {
    return {};
  }

  return {
    where: isRecord(args['where']) ? args['where'] : undefined,
    data: isRecord(args['data']) ? args['data'] : undefined,
  };
}

function getComparableValue(value: unknown): unknown {
  if (!isRecord(value) || !('set' in value)) {
    return value;
  }

  return value['set'];
}

function valuesAreEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getChangedFields(
  oldValues: Record<string, unknown> | undefined,
  newValues: Record<string, unknown>,
): string[] {
  if (!oldValues) {
    return Object.keys(newValues);
  }

  return Object.entries(newValues)
    .filter(
      ([field, value]) =>
        !valuesAreEqual(getComparableValue(value), oldValues[field]),
    )
    .map(([field]) => field);
}

function getEntityId(result: unknown): string {
  if (isRecord(result) && typeof result['id'] === 'string') {
    return result['id'];
  }

  return 'bulk';
}

async function findOldValues(
  prisma: PrismaClient,
  model: string,
  args: MutationArgs,
): Promise<Record<string, unknown> | undefined> {
  if (!args.where || !('id' in args.where)) {
    return undefined;
  }

  const delegateName = getModelDelegateName(model);
  const delegate = (prisma as unknown as Record<string, ModelDelegate>)[
    delegateName
  ];

  if (!delegate) {
    return undefined;
  }

  return (await delegate.findUnique({ where: args.where })) ?? undefined;
}

export async function executeWithAudit<TArgs, TResult>(params: {
  prisma: PrismaClient;
  requestContext: RequestContextService;
  auditLogService: AuditLogService;
  model: string | undefined;
  operation: string;
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
}): Promise<TResult> {
  const {
    prisma,
    requestContext,
    auditLogService,
    model,
    operation,
    args,
    query,
  } = params;

  if (
    !model ||
    !AUDITED_MODELS.has(model) ||
    !AUDITED_OPERATIONS.has(operation)
  ) {
    return query(args);
  }

  const mutationArgs = getMutationArgs(args);
  const oldValues =
    operation === 'update'
      ? await findOldValues(prisma, model, mutationArgs)
      : undefined;

  const result = await query(args);
  const context = requestContext.getStore();

  if (!context || !mutationArgs.data) {
    return result;
  }

  await auditLogService.log({
    tenantId: context.tenantId,
    userId: context.userId,
    action: operation.toUpperCase(),
    entity: model,
    entityId: getEntityId(result),
    oldValues,
    newValues: mutationArgs.data,
    changedFields: getChangedFields(oldValues, mutationArgs.data),
  });

  return result;
}

export function buildAuditExtension(
  prisma: PrismaClient,
  requestContext: RequestContextService,
  auditLogService: AuditLogService,
) {
  return Prisma.defineExtension({
    name: 'audit-log-extension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return executeWithAudit({
            prisma,
            requestContext,
            auditLogService,
            model,
            operation,
            args,
            query,
          });
        },
      },
    },
  });
}
