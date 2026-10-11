# Cargar un mes de suscripción

El comando crea contrato, período mensual y factura pendiente para un tenant existente. No registra pagos, no activa cobertura y no reemplaza el seed general.

## Local: revisar y aplicar

```sh
make tenant-subscription
make shell-api
```

Dentro del container API, reemplazá `TU_SLUG` por el tenant elegido. Este ejemplo crea un plan si no existe; sus prestaciones son ilustrativas, no una política comercial aprobada:

```sh
pnpm run tenant:subscription \
  --tenant TU_SLUG --plan BASE --price 20 \
  --start 2026-10-11 --due-date 2026-10-14 \
  --create-plan --plan-name 'Centro Base' \
  --features '{"allow_doctor_login":false,"allow_expense_tracking":true}' \
  --limits '{"max_doctors":5,"max_staff_users":2}'
```

Esto es **solo vista previa**. Ajustá las fechas y agregá `--apply` al mismo comando para escribir.

Para un plan existente, también podés usar el wrapper desde la raíz:

```sh
make tenant-subscription ARGS='--tenant TU_SLUG --plan BASE --price 20 --start 2026-11-11 --due-date 2026-11-14'
```

## Railway

Primero debe estar desplegada una imagen que incluya la migración y este comando. No se publica automáticamente al editar el repo.

Entrá al container API indicando proyecto, servicio y entorno explícitamente:

```sh
railway ssh --project PROJECT_ID --service API_SERVICE_ID --environment production
cd /app/apps/api
```

Ejecutá el mismo comando `pnpm run tenant:subscription` primero sin `--apply`. Para escribir en Railway/producción requiere **`--apply --allow-production`**. No uses `railway run` para este flujo: ejecuta localmente con variables remotas.

## Comportamiento y límites

| Caso                                                                                 | Resultado                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Sin `--apply` o con `--dry-run`                                                      | Valida y muestra; no escribe ni audita.               |
| Plan inexistente                                                                     | Exige `--create-plan`, nombre, features y limits.     |
| Plan existente                                                                       | No modifica su configuración ni precio de catálogo.   |
| Mismo tenant, plan, precio y período                                                 | Reutiliza el período y factura; no duplica auditoría. |
| Mes siguiente                                                                        | Debe comenzar cuando termina el último período.       |
| Cambio de precio, plan del período existente o contrato suspendido/cancelado/en mora | Rechaza; requiere un flujo contractual separado.      |
| Error durante la carga                                                               | Revierte la transacción, incluida la auditoría.       |

- Las fechas se interpretan en `America/Caracas`. Un mes es calendario; 31 de enero termina el 28/29 de febrero. El período excluye su fecha final.
- `--due-date` es explícito y vence al final del día indicado; para una factura nueva no puede preceder su emisión. Repetir una carga existente no modifica su vencimiento.
- Features admite valores booleanos; limits, enteros no negativos. Los snapshots preservan la configuración del plan al crear cada período.
- El contrato nuevo usa el estado `ACTIVE` del schema, pero **sin período vigente**. No significa acceso activado: `subscriptionPeriodId` no se establece ni cambia. El flujo de cobro/activación sigue pendiente de implementación.
- La factura queda `PENDING` y se identifica con `SUB-<UUID>`. Esta numeración es interna, no una definición de factura fiscal.
- Cada escritura se registra mediante `AuditLog`, con origen `tenant:subscription` y sin atribuirla a un usuario de la aplicación.
- El comando bloquea el tenant y el código de plan durante la escritura para serializar cargas concurrentes. Esto protege este comando, no otros futuros escritores que ignoren esos bloqueos.

## Verificación

Dentro del container API:

```sh
pnpm run test:e2e --runInBand subscription-command.e2e-spec.ts subscription-provision.e2e-spec.ts
pnpm run typecheck
pnpm run lint
```

Las pruebas de base de datos usan fixtures temporales y rollback; no asignan suscripciones a tenants existentes.

### Evidencia TDD

| Unidad                          | RED                                        | GREEN                                                                       |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| Parámetros y fechas             | Módulo inexistente                         | 11 pruebas pasan.                                                           |
| Aprovisionamiento transaccional | Módulo inexistente                         | 9 pruebas pasan, incluida reversión de auditoría.                           |
| Catálogo de auditoría           | 4 entidades rechazadas                     | 6 pruebas pasan.                                                            |
| Layout productivo               | Importación falla sin fuentes de auditoría | Ayuda, preview y bloqueo de escritura pasan con las tres fuentes incluidas. |

El layout productivo se verificó en un directorio temporal dentro de Docker, no mediante un build ni una ejecución en Railway.
