import { parseSubscriptionCommand } from '../prisma/subscription-command';

const args = [
  '--tenant',
  'example',
  '--plan',
  'BASE',
  '--price',
  '20.00',
  '--start',
  '2026-10-11',
  '--due-date',
  '2026-10-14',
];

describe('subscription command', () => {
  it('defaults to preview and computes one calendar month in Caracas', () => {
    const command = parseSubscriptionCommand(args);
    expect(command.apply).toBe(false);
    expect(command.startsAt.toISOString()).toBe('2026-10-11T04:00:00.000Z');
    expect(command.endsAt.toISOString()).toBe('2026-11-11T04:00:00.000Z');
    expect(command.dueAt.toISOString()).toBe('2026-10-15T03:59:59.999Z');
  });

  it('clamps the end to the last day of the next month', () => {
    const command = parseSubscriptionCommand(
      args.map((value) => (value === '2026-10-11' ? '2026-01-31' : value)),
    );
    expect(command.endsAt.toISOString()).toBe('2026-02-28T04:00:00.000Z');
  });

  it.each(
    [
      [...args, '--unknown'],
      [...args, '--price', '30'],
      args.map((value) => (value === '20.00' ? '-1' : value)),
      args.map((value) => (value === '20.00' ? '20.001' : value)),
      args.map((value) => (value === '2026-10-11' ? '2026-02-30' : value)),
      [...args, '--apply', '--dry-run'],
      [...args, '--create-plan'],
      [
        ...args,
        '--create-plan',
        '--plan-name',
        'Base',
        '--features',
        '{"x":"yes"}',
        '--limits',
        '{}',
      ],
    ].map((invalid) => [invalid]),
  )('rejects invalid or ambiguous input: %j', (invalid) => {
    expect(() => parseSubscriptionCommand(invalid)).toThrow();
  });

  it('requires explicit production authorization only for writes', () => {
    expect(() => parseSubscriptionCommand([...args, '--apply'], true)).toThrow(
      '--allow-production',
    );
    expect(parseSubscriptionCommand(args, true).apply).toBe(false);
    expect(
      parseSubscriptionCommand([...args, '--apply', '--allow-production'], true)
        .apply,
    ).toBe(true);
  });
});
