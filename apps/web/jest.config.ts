import type { Config } from 'jest';
import nextJest from 'next/jest.js';

process.env.TZ = 'America/Caracas';

const createJestConfig = nextJest({
  // Ruta a la app Next para cargar next.config.ts y variables .env en el entorno de test
  dir: './',
});

const config: Config = {
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  setupFiles: ['<rootDir>/src/test/polyfills.ts', '<rootDir>/src/test/fetch-polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/*.test.{ts,tsx}',
  ],
};

export default async () => {
  const resolved = await createJestConfig(config)();
  // next/jest añade exclusiones node_modules antes de las del usuario.
  // MSW y sus dependencias ESM deben pasar por SWC, también bajo pnpm.
  resolved.transformIgnorePatterns = [
    '/node_modules/.pnpm/(?!(msw|@mswjs\\+interceptors|until-async|rettime|@open-draft\\+[^/]+)@)',
    '/node_modules/(?!\\.pnpm/|msw/|@mswjs/|until-async/|rettime/|@open-draft/)',
  ];
  return resolved;
};
