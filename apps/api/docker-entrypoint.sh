#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy --config prisma/prisma.config.ts

echo "Running seeds..."
npx prisma db seed --config prisma/prisma.config.ts

echo "Starting server..."
exec node dist/main.js
