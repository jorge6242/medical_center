import { seedDemoTenant } from '../prisma/seeders/demo/demo-tenant.seeder';
import { seedTenant } from '../prisma/seeders/tenant.seeder';

import type { PrismaClient } from '@prisma/client';

const UUID = 'a174b163-08d8-4d24-8d83-f918b66ee2a1';
const LEGACY = 'tenant-demo-001';
const makeDatabase = (initial: { id: string; slug: string }[] = []) => {
  const rows = [...initial];
  const findUnique = jest.fn(
    async ({ where }: { where: { id?: string; slug?: string } }) =>
      rows.find((row) =>
        where.id ? row.id === where.id : row.slug === where.slug,
      ) ?? null,
  );
  const upsert = jest.fn(
    async ({
      where,
      create,
      update,
    }: {
      where: { slug?: string; id?: string };
      create: { id: string; slug: string };
      update: { slug?: string };
    }) => {
      const existing = rows.find((row) =>
        where.id ? row.id === where.id : row.slug === where.slug,
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      rows.push({ ...create });
      return create;
    },
  );
  const update = jest.fn(
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { slug: string };
    }) => {
      const existing = rows.find((row) => row.id === where.id);
      if (!existing) throw new Error('missing fixture');
      Object.assign(existing, data);
      return existing;
    },
  );
  return {
    rows,
    findUnique,
    upsert,
    prisma: {
      tenant: { findUnique, upsert, update },
    } as unknown as PrismaClient,
  };
};

describe('Demo tenant seed identifier', () => {
  beforeEach(() =>
    jest.spyOn(console, 'warn').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());
  it('creates deterministic UUID and reuses it on subsequent runs', async () => {
    const db = makeDatabase();
    const id = await seedTenant(db.prisma);
    expect(id).toBe(UUID);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(await seedDemoTenant(db.prisma)).toBe(id);
    expect(await seedTenant(db.prisma)).toBe(id);
    expect(db.rows).toHaveLength(1);
  });
  it.each(['centro-medico-demo', 'centro-medico-demo-demo'])(
    'reuses legacy PK with %s without rewriting it',
    async (slug) => {
      const db = makeDatabase([{ id: LEGACY, slug }]);
      expect(await seedTenant(db.prisma)).toBe(LEGACY);
      expect(await seedDemoTenant(db.prisma)).toBe(LEGACY);
      expect(db.rows).toHaveLength(1);
      expect(db.rows[0]?.id).toBe(LEGACY);
    },
  );
  it.each(['centro-medico-demo', 'centro-medico-demo-demo'])(
    'resolves existing slug %s with another persisted ID',
    async (slug) => {
      const db = makeDatabase([{ id: 'existing-opaque-id', slug }]);
      expect(await seedTenant(db.prisma)).toBe('existing-opaque-id');
      expect(await seedDemoTenant(db.prisma)).toBe('existing-opaque-id');
      expect(db.rows).toHaveLength(1);
    },
  );
  it('fails closed when historic ID and demo slug identify different tenants', async () => {
    const db = makeDatabase([
      { id: LEGACY, slug: 'renamed-demo' },
      { id: 'other-tenant', slug: 'centro-medico-demo' },
    ]);
    await expect(seedTenant(db.prisma)).rejects.toThrow(
      'Identidad demo ambigua',
    );
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.rows).toHaveLength(2);
  });
});
