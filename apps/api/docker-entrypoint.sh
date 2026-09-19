#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy --config prisma/prisma.config.ts

if [ "$RUN_DB_SEED" = "true" ]; then
  echo "Running seeds..."
  npx prisma db seed --config prisma/prisma.config.ts
else
  echo "Skipping seeds. Set RUN_DB_SEED=true to enable."
fi

echo "Starting server..."
exec node dist/main.js
