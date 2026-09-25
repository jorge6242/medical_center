export default {
  'apps/api/**/*.ts': [
    'eslint --fix --max-warnings 0 --config apps/api/eslint.config.mjs',
    'prettier --write',
  ],
  'apps/web/**/*.{ts,tsx}': [
    'eslint --fix --max-warnings 0 --config apps/web/eslint.config.mjs',
    'prettier --write',
  ],
  'packages/shared/**/*.ts': ['prettier --write'],
  '*.{json,md,css}': ['prettier --write'],
};
