.PHONY: setup dev down down-v restart restart-api restart-web \
        logs logs-api logs-web logs-db shell-api shell-web shell-db \
        db-migrate db-deploy db-seed db-studio deps-sync \
        tenant-provision tenant-access-link tenant-subscription \
        docker-build-api docker-build-web docker-build docker-push-api docker-push-web docker-push \
        docker-release-api docker-release-web

DOCKERHUB_USER ?= jorge6242
IMAGE_TAG ?= railway-mvp
DOCKER_PLATFORM ?= linux/amd64
NEXT_PUBLIC_API_URL ?= https://centromedicoapi-production.up.railway.app
ACCESS_LINK_DAYS ?= 7
API_IMAGE := $(DOCKERHUB_USER)/centro-medico-api:$(IMAGE_TAG)
WEB_IMAGE := $(DOCKERHUB_USER)/centro-medico-web:$(IMAGE_TAG)

# ── Setup ─────────────────────────────────────────────────────────────────────

setup: ## Primera vez: build + start containers base; API se inicia manualmente con make api
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
	@echo "[4/4] API manual start required: run 'make api'"
	@echo ""
	@echo "Setup complete."
	@echo "  API -> http://localhost:3001 (after make api)"
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
	docker compose -f docker-compose.dev.yml up -d --no-deps --no-build --force-recreate api

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
	# pnpm writes lockfiles atomically (temp file + rename), which cannot replace a bind mount.
	# Resolve from a minimal temporary workspace, then overwrite the mounted lockfile in place.
	docker compose -f docker-compose.dev.yml run --rm --no-deps api sh -ceu 'workspace=$$(mktemp -d); trap "rm -rf $$workspace" EXIT; mkdir -p "$$workspace/apps/api" "$$workspace/apps/web" "$$workspace/packages/shared"; cp /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml "$$workspace"; cp /app/apps/api/package.json "$$workspace/apps/api"; cp /app/apps/web/package.json "$$workspace/apps/web"; cp /app/packages/shared/package.json "$$workspace/packages/shared"; cd "$$workspace"; pnpm install --lockfile-only --ignore-scripts; cat pnpm-lock.yaml > /app/pnpm-lock.yaml'

# ── Prisma ────────────────────────────────────────────────────────────────────

db-generate: ## Regenera Prisma Client (correr después de cambiar schema.prisma)
	docker compose -f docker-compose.dev.yml exec api sh -c "cd /app/apps/api && npx prisma generate --config prisma/prisma.config.ts"

db-migrate: ## Desarrollo — name=Nombre; create_only=true genera sin aplicar
	docker compose -f docker-compose.dev.yml exec api pnpm run db:migrate $(if $(name),--name "$(name)") $(if $(filter true,$(create_only)),--create-only)

db-deploy: ## Producción — aplica migraciones existentes (no genera nuevas)
	docker compose -f docker-compose.dev.yml exec api pnpm run db:deploy

db-seed: ## Corre prisma/seed.ts
	docker compose -f docker-compose.dev.yml exec api pnpm run db:seed

db-studio: ## Abre Prisma Studio (UI explorador de DB)
	docker compose -f docker-compose.dev.yml exec api pnpm run db:studio

tenant-provision: ## Crea un tenant nuevo sin datos demo; requiere variables TENANT_* y ADMIN_*
	docker compose -f docker-compose.dev.yml exec -T \
		-e TENANT_NAME="$(TENANT_NAME)" \
		-e TENANT_SLUG="$(TENANT_SLUG)" \
		-e TENANT_LOGO_URL="$(TENANT_LOGO_URL)" \
		-e ADMIN_NAME="$(ADMIN_NAME)" \
		-e ADMIN_LAST_NAME="$(ADMIN_LAST_NAME)" \
		-e ADMIN_IDENTIFICATION_NUMBER="$(ADMIN_IDENTIFICATION_NUMBER)" \
		-e ADMIN_EMAIL="$(ADMIN_EMAIL)" \
		-e ADMIN_PASSWORD="$(ADMIN_PASSWORD)" \
		-e RESET_ADMIN_PASSWORD="$(RESET_ADMIN_PASSWORD)" \
		-e INITIAL_IGTF_RATE="$(INITIAL_IGTF_RATE)" \
		-e INITIAL_BCV_RATE="$(INITIAL_BCV_RATE)" \
		-e ACCESS_LINK_DAYS="$(ACCESS_LINK_DAYS)" \
		api pnpm run tenant:provision

tenant-access-link: ## Crea link temporal; requiere TENANT_SLUG (ACCESS_LINK_DAYS, default: 7)
	@test -n "$(TENANT_SLUG)" || (echo "ERROR: TENANT_SLUG is required" && exit 2)
	docker compose -f docker-compose.dev.yml exec -T api \
		pnpm run tenant:access-link -- \
		--slug "$(TENANT_SLUG)" \
		--expires-days "$(ACCESS_LINK_DAYS)"

tenant-subscription: ## Carga un mes; ARGS='--tenant ... --plan ...'; preview por defecto
	docker compose -f docker-compose.dev.yml exec -T api pnpm run tenant:subscription $(if $(ARGS),$(ARGS),--help)

# ── Docker Hub Images ─────────────────────────────────────────────────────────

docker-build-api: ## Build imagen API para Docker Hub
	docker buildx build --platform $(DOCKER_PLATFORM) -f apps/api/Dockerfile -t $(API_IMAGE) --load .

docker-build-web: ## Build imagen Web para Docker Hub
	docker buildx build --platform $(DOCKER_PLATFORM) --build-arg NEXT_PUBLIC_API_URL=$(NEXT_PUBLIC_API_URL) -f apps/web/Dockerfile -t $(WEB_IMAGE) --load .

docker-build: docker-build-api docker-build-web ## Build API + Web

docker-push-api: ## Push imagen API a Docker Hub
	docker push $(API_IMAGE)

docker-push-web: ## Push imagen Web a Docker Hub
	docker push $(WEB_IMAGE)

docker-push: docker-push-api docker-push-web ## Push API + Web

docker-release-api: docker-build-api docker-push-api ## Build + push API para Railway/Docker Hub

docker-release-web: docker-build-web docker-push-web ## Build + push Web para Railway/Docker Hub
