FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @centro-medico/shared build
RUN cd apps/api && npx prisma generate --config prisma/prisma.config.ts
RUN pnpm --filter api build

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api

RUN chmod +x ./docker-entrypoint.sh

USER nestjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
