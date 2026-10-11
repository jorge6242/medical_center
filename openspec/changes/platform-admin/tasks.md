# Tareas — pendientes, no implementadas

## 1. Infraestructura y decisiones previas

- [ ] 1.1 Revisar esta propuesta/diseño/specs y resolver estrategia de entrega antes de apply.
- [ ] 1.2 Revisar/estabilizar dependencia SaaS local; identificar migraciones efectivamente aplicadas sin asumir producción.
- [ ] 1.3 Preflight de webSlug reservado admin, DNS/TLS/proxy/cookies y todos los guards globales.
- [ ] 1.4 Cerrar DTOs/transiciones/política CSRF con ejemplos request/response y matriz de errores.
- [ ] 1.5 Planificar migraciones aditivas/reversión de aplicación conservando tablas y centros existentes.

## 2. Implementación backend (Strict TDD Docker, por unidad)

- [ ] 2.1 RED: fixtures separadas de mocks para identidad/session/actor; migrar PlatformAdmin, PlatformSession, PlatformAuditLog y versiones/idempotencia; GREEN y refactor.
- [ ] 2.2 RED: bootstrap seguro/idempotente; GREEN comando Make/Docker sin signup público.
- [ ] 2.3 RED: login/logout/me, guard dispatcher, JWT cruzados/revocación; GREEN auth platform con clave/audience/purpose propios.
- [ ] 2.4 RED: cookies coexistentes, CSRF/origen y rate limit; GREEN protección platform sin debilitar tenant.
- [ ] 2.5 RED: listados/detalle/edición/activación/versiones y no clínica; GREEN tenants DTO/service/controllers.
- [ ] 2.6 RED: alta atómica, rollback y duplicados; GREEN aprovisionamiento seguro reutilizando lógica pura y auditoría transaccional.
- [ ] 2.7 RED: contratos/períodos/estados/snapshots; GREEN suscripciones sin suspensión/cobro automático.
- [ ] 2.8 RED: pagos Decimal, claves ajenas, concurrencia, sobrepago y VOID; GREEN ledger SaaS y recálculo transaccional.
- [ ] 2.9 RED: dashboard SaaS y auditoría paginada sin secretos; GREEN agregados/vistas globales.

## 3. Implementación frontend y routing

- [ ] 3.1 Crear realm/layout/login platform independientes; preservar routing tenant y separar redirect 401/caches/cookies.
- [ ] 3.2 Services/hooks TanStack Query, RHF/zod y skeletons para centros y alta/edición/confirmación de suspensión.
- [ ] 3.3 Pantallas contrato/períodos/facturas/pagos SaaS, confirmación de anulación y auditoría.
- [ ] 3.4 Dashboard global operativo/comercial sin datos clínicos.

## 4. Verificación y operación

- [ ] 4.1 Ejecutar tests backend unit/integration/e2e en Docker (RED/GREEN documentado por unidad); no builds.
- [ ] 4.2 Typecheck/lint de workspaces afectados dentro de Docker; formatear solo archivos propios.
- [ ] 4.3 Regresión manual de dos tenants: subdominio/acceso local/login/me/logout/ACL y flujos clínicos; probar coexistencia y rechazo cruzado.
- [ ] 4.4 Verificar cada escenario spec, concurrencia/idempotencia real DB y rollback de migraciones aditivas con aplicación previa.
- [ ] 4.5 Documentar bootstrap, despliegue admin/DNS/TLS, revocación y rollback sin pérdida de datos; revisión antes de activar producción.

## Review Workload Forecast

- Estimated changed lines: >400 (estimación preliminar 1800–3000, revisar con tareas refinadas).
- Chained PRs recommended: Yes.
- 400-line budget risk: High.
- Decision needed before apply: Yes.
- Delivery strategy: ask-on-risk, pendiente aprobación; NO size:exception concedida.

Slices recomendadas (<400 líneas CADA PR, subdividir si excede): (A) dependencia/schema/bootstrap; (B) auth/sesión; (C) guards/CSRF/regresión tenant; (D) gestión tenant; (E) alta transaccional; (F) contratos/períodos; (G) pagos/anulación; (H) shell/login UI; (I) tenants UI; (J) SaaS UI; (K) dashboard/auditoría/operación. Cada unidad incluye tests/docs; no separar pruebas para maquillar presupuesto. Dependencias aditivas no deben habilitar panel incompleto; activar exposición solo tras verificación conjunta.
