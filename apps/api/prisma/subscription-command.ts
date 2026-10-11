import { DateTime } from 'luxon';

const FLAGS = ['--apply', '--dry-run', '--allow-production', '--create-plan'];
const OPTIONS = [
  '--tenant',
  '--plan',
  '--price',
  '--start',
  '--due-date',
  '--plan-name',
  '--features',
  '--limits',
];

export interface SubscriptionCommand {
  tenantSlug: string;
  planCode: string;
  price: string;
  startsAt: Date;
  endsAt: Date;
  dueAt: Date;
  apply: boolean;
  newPlan?: {
    name: string;
    features: Record<string, boolean>;
    limits: Record<string, number>;
  };
}

function readOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = args[0] === '--' ? 1 : 0; index < args.length; index++) {
    const key = args[index];
    if (!key) throw new Error('Empty option');
    if (![...FLAGS, ...OPTIONS].includes(key) || options.has(key)) {
      throw new Error(`Unknown or repeated option: ${key}`);
    }
    if (FLAGS.includes(key)) {
      options.set(key, 'true');
      continue;
    }
    const value = args[++index];
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value for ${key}`);
    options.set(key, value);
  }
  return options;
}

function required(options: Map<string, string>, name: string): string {
  const value = options.get(name)?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseDate(value: string): DateTime {
  const date = DateTime.fromISO(value, { zone: 'America/Caracas' }).startOf(
    'day',
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !date.isValid) {
    throw new Error(`Invalid calendar date: ${value}; use YYYY-MM-DD`);
  }
  return date;
}

function parseObject(
  value: string,
  kind: 'features' | 'limits',
): Record<string, boolean | number> {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${kind} must be a JSON object`);
  }
  const entries = Object.entries(parsed);
  const valid = entries.every(([, entry]) =>
    kind === 'features'
      ? typeof entry === 'boolean'
      : typeof entry === 'number' && Number.isSafeInteger(entry) && entry >= 0,
  );
  if (!valid)
    throw new Error(
      `${kind} values must be ${kind === 'features' ? 'booleans' : 'non-negative integers'}`,
    );
  return Object.fromEntries(entries) as Record<string, boolean | number>;
}

function parseNewPlan(
  options: Map<string, string>,
): SubscriptionCommand['newPlan'] {
  const configuration = ['--plan-name', '--features', '--limits'];
  if (!options.has('--create-plan')) {
    if (configuration.some((key) => options.has(key)))
      throw new Error('Plan configuration requires --create-plan');
    return undefined;
  }
  return {
    name: required(options, '--plan-name'),
    features: parseObject(
      required(options, '--features'),
      'features',
    ) as Record<string, boolean>,
    limits: parseObject(required(options, '--limits'), 'limits') as Record<
      string,
      number
    >,
  };
}

export function parseSubscriptionCommand(
  args: string[],
  production = false,
): SubscriptionCommand {
  const options = readOptions(args);
  const apply = options.has('--apply');
  if (apply && options.has('--dry-run'))
    throw new Error('--apply and --dry-run are mutually exclusive');
  if (production && apply && !options.has('--allow-production'))
    throw new Error('Production writes require --allow-production');
  const price = required(options, '--price');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(price) || Number(price) <= 0)
    throw new Error('--price must be positive USD with at most two decimals');
  const start = parseDate(required(options, '--start'));
  return {
    tenantSlug: required(options, '--tenant'),
    planCode: required(options, '--plan'),
    price,
    startsAt: start.toJSDate(),
    endsAt: start.plus({ months: 1 }).toJSDate(),
    dueAt: parseDate(required(options, '--due-date')).endOf('day').toJSDate(),
    apply,
    newPlan: parseNewPlan(options),
  };
}
