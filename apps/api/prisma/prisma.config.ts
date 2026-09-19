import path from 'node:path';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env['DATABASE_URL'],
  },
  migrations: {
    seed: `ts-node --project ${path.join(__dirname, '..', 'tsconfig.json')} --transpile-only ${path.join(__dirname, 'seed.ts')}`,
  },
});
