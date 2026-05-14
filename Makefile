.PHONY: setup dev down down-v restart restart-api restart-web \
        logs logs-api logs-web logs-db shell-api shell-web shell-db \
        db-migrate db-deploy db-seed db-studio deps-sync prod prod-down

# ── Setup ─────────────────────────────────────────────────────────────────────

setup: ## Primera vez: build + start + espera hasta que API esté lista
	@echo "[1/4] Building images..."
	@docker compose -f docker-compose.dev.yml build
	@echo "[2/4] Starting containers..."
	@docker compose -f docker-compose.dev.yml up -d
	@echo "[3/4] Waiting for database..."
	@n=0; until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U postgres -q 2>/dev/null; do \
		n=$$((n+1)); \
		if [ $$n -ge 30 ]; then echo "ERROR: DB timeout (60s)" && exit 1; fi; \
		printf "."; sleep 2; \
	done; echo " ready"
	@echo "[4/4] Waiting for API (migrations + seeds)..."
	@n=0; until curl -sf http://localhost:3001/health > /dev/null 2>&1; do \
		n=$$((n+1)); \
		if [ $$n -ge 60 ]; then echo "ERROR: API timeout (120s)" && exit 1; fi; \
		printf "."; sleep 2; \
	done; echo " ready"
	@echo ""
	@echo "Setup complete."
	@echo "  API -> http://localhost:3001"
	@echo "  Web -> http://localhost:3000"

# ── Desarrollo ────────────────────────────────────────────────────────────────

dev: ## Levantar entorno dev completo en background (DB + API + Web)
	docker compose -f docker-compose.dev.yml up -d

api: ## Iniciar backend (hot reload) en el container API
	docker compose -f docker-compose.dev.yml up -d api
	docker compose -f docker-compose.dev.yml exec api pnpm --filter api run start:dev

web: ## Iniciar frontend (hot reload) en el container Web
	docker compose -f docker-compose.dev.yml up -d web
	docker compose -f docker-compose.dev.yml exec web pnpm --filter web run dev

down: ## Bajar todos los containers dev
	docker compose -f docker-compose.dev.yml down

down-v: ## Bajar containers + eliminar volúmenes — BORRA DATOS DB
	docker compose -f docker-compose.dev.yml down -v

restart: ## Reiniciar todos los containers dev
	docker compose -f docker-compose.dev.yml restart

restart-api: ## Reiniciar solo el container API
	docker compose -f docker-compose.dev.yml restart api

restart-web: ## Reiniciar solo el container Web
	docker compose -f docker-compose.dev.yml restart web

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail logs del API (alias de logs-api)
	docker compose -f docker-compose.dev.yml logs -f api

logs-api: ## Tail logs del API
	docker compose -f docker-compose.dev.yml logs -f api

logs-web: ## Tail logs del Web
	docker compose -f docker-compose.dev.yml logs -f web

logs-db: ## Tail logs de la DB
	docker compose -f docker-compose.dev.yml logs -f db

# ── Shells ────────────────────────────────────────────────────────────────────

shell-api: ## Shell dentro del container API
	docker compose -f docker-compose.dev.yml exec api sh

shell-web: ## Shell dentro del container Web
	docker compose -f docker-compose.dev.yml exec web sh

shell-db: ## psql dentro del container DB
	docker compose -f docker-compose.dev.yml exec db psql -U postgres -d centro_medico

deps-sync: ## Regenera pnpm-lock.yaml dentro de Docker
	docker compose -f docker-compose.dev.yml exec -T api pnpm install --lockfile-only --ignore-scripts

# ── Prisma ────────────────────────────────────────────────────────────────────

db-generate: ## Regenera Prisma Client (correr después de cambiar schema.prisma)
	docker compose -f docker-compose.dev.yml exec api sh -c "cd /app/apps/api && npx prisma generate --config prisma/prisma.config.ts"

db-migrate: ## Desarrollo — detecta cambios en schema, genera y aplica migración
	docker compose -f docker-compose.dev.yml exec api pnpm run db:migrate

db-deploy: ## Producción — aplica migraciones existentes (no genera nuevas)
	docker compose -f docker-compose.dev.yml exec api pnpm run db:deploy

db-seed: ## Corre prisma/seed.ts
	docker compose -f docker-compose.dev.yml exec api pnpm run db:seed

db-studio: ## Abre Prisma Studio (UI explorador de DB)
	docker compose -f docker-compose.dev.yml exec api pnpm run db:studio

# ── Producción ────────────────────────────────────────────────────────────────

prod: ## Levantar entorno producción
	docker compose up -d

prod-down: ## Bajar entorno producción
	docker compose down
