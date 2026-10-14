# Operación del panel de plataforma

## Estado y fronteras

El panel administra centros y pagos **SaaS**, no pagos médicos ni datos clínicos. `Tenant.isActive` y `TenantSubscription.status` son independientes: suspender una suscripción no bloquea automáticamente al centro. Desactivar un centro requiere motivo y confirmación.

Implementación local disponible; **NO implica habilitación ni validación de producción**. No se hicieron builds ni despliegues en esta tarea.

## Acceso y configuración

| Entorno                          | Login                                         |
| -------------------------------- | --------------------------------------------- |
| Local                            | http://localhost:3000/platform/login          |
| Producción, tras validar DNS/TLS | https://admin.goratechlabs.com/platform/login |

- API: `PLATFORM_JWT_SECRET` mínimo 32 caracteres, distinto de `JWT_SECRET`; no guardar secretos en Git.
- API: `PLATFORM_ALLOWED_ORIGINS=http://localhost:3000` local y origen admin HTTPS exacto en producción. Lista separada por comas, sin paths ni slash final.
- Web: `PLATFORM_API_URL` identifica la API accesible desde el servidor Next. En Docker dev el fallback es `http://api:3001`; producción requiere URL servidor válida (fallback a `NEXT_PUBLIC_API_URL`). Configurar en la generación de la imagen Next, pues rewrites forman parte de su configuración de despliegue; no se generaron imágenes aquí.
- El navegador llama `/api/platform/*` al mismo origen del panel; Next reenvía únicamente `/platform/*`. Conservar Origin, cookie y Set-Cookie. Los requests tenant continúan usando su URL habitual.
- Cookie platform host-only `platform_access_token`, HttpOnly, SameSite=Lax, Secure en producción, Path=/; no agregar Domain raíz ni cambiar a SameSite=None para esquivar un proxy mal configurado.
- Login exige Origin permitido y `x-platform-request: 1`. Mutaciones autenticadas exigen `x-csrf-token` ligado a sesión. CORS general tenant no reemplaza este control específico.
- Límite login actual en memoria: 5 fallos por cuenta/20 por IP en 15 minutos. Antes de múltiples réplicas, resolver almacenamiento compartido; no afirmar protección distribuida.

## Bootstrap y revocación

En desarrollo con contenedores ya activos:

```bash
make platform-bootstrap
```

El script solicita username (sugerencia interactiva `exiadmin`) y contraseña oculta + confirmación; no crea un administrador por defecto ni acepta contraseña como argumento. Existente: requiere confirmación para cambiar contraseña y revocar sesiones. No ejecutar automáticamente sobre producción; su operador debe usar el entorno Docker autorizado de esa instalación, no asumir que Railway tiene Compose.

Logout revoca solo sesión platform y limpia solo su cookie. Token expira en 8h. Cambiar contraseña por bootstrap incrementa versión/revoca sesiones; desactivar identidad hace fallar validación. Rotar secreto revoca todos los JWT platform y también invalida fingerprints HMAC de idempotencia existentes: **no rotar durante cobros/altas inciertos**; conciliar antes y planificar mantenimiento. No afecta JWT tenant.

## Resultado financiero incierto

Ante timeout, pérdida de respuesta, 409 o 5xx, el formulario conserva **clave y payload originales en RAM**. Usar “Reintentar operación original”; no editar y reenviar como operación nueva. Un rechazo inicial 400/401/403/404/422/429 permite corregir; tras un resultado ya incierto solo un éxito/replay resuelve el intento.

401 platform navega al login vía SPA, sin recargar. El registry RAM queda por encima del shell y separado por actor/operación. Tras reautenticación del mismo administrador, el banner global permite confirmar el payload original con nuevo CSRF, incluso si ya no aparece el modal de factura pagada. Otro administrador no recibe ese intento. No persistimos passwords ni payload financiero en localStorage.

Hay aviso beforeunload, pero cierre/recarga completa pierde RAM: conciliar factura/pagos/auditoría antes de registrar de nuevo. No asumir que un 401 implica que la escritura anterior falló. La recuperación SPA tiene tests de registry/evento; validar además flujo visual en navegador antes de producción.

Cada mutación/auth global guarda requestId/correlationId generados por servidor y disponibles en auditoría. IDs HTTP son independientes de encabezados cliente; bootstrap/System tienen contexto separado.

## Checklist ANTES de exponer producción

- [ ] Verificar en DB autorizada que ningún centro tenga `webSlug='admin'`; si existe, detener y acordar resolución, jamás renombrar automáticamente.
- [ ] DNS de admin y certificado TLS válidos; no modificar DNS de centros existentes.
- [ ] Aplicar migraciones aditivas existentes mediante procedimiento autorizado; respaldar y comprobar compatibilidad con aplicación anterior. Nunca prisma db push/down-v.
- [ ] Validar rewrite a API correcta, headers de proxy y Origin; cookies sin Domain y Secure visibles por navegador.
- [ ] Dos sesiones locales/producción coexistentes: login/me/logout en ambos realms; un logout no limpia el otro.
- [ ] Rechazo cruzado (tenant no entra platform; platform no entra clínica), CSRF y rate limit.
- [ ] Regresión manual en ambos centros: acceso por subdominio/enlace local, ACL y pagos médicos sin cambios.
- [ ] Confirmar límites de múltiples réplicas y confiabilidad de IP de cliente tras proxy.
- [ ] Revisión independiente del cambio grande autorizado; no habilitar únicamente porque tests unitarios pasan.

## Verificación local sin builds

```bash
docker compose -f docker-compose.dev.yml exec -T api pnpm exec jest --runInBand platform
docker compose -f docker-compose.dev.yml exec -T web sh -c 'node --test src/features/platform-shared/*.test.mjs'
docker compose -f docker-compose.dev.yml exec -T api pnpm run typecheck
docker compose -f docker-compose.dev.yml exec -T web pnpm run typecheck
docker compose -f docker-compose.dev.yml exec -T api pnpm run lint
docker compose -f docker-compose.dev.yml exec -T web pnpm run lint
```

Las pruebas web usan Node test runner y transpilan únicamente el módulo bajo prueba en memoria, sin artifacts/build ni dependencias nuevas. No equivalen a un runner de componentes React ni a validación visual/e2e navegador.

## Rollback conservador

Deshabilitar exposición admin/proxy platform en infraestructura y revertir aplicación compatible. Mantener tablas/migraciones/auditoría y datos de centros; NO DROP, DELETE masivo, reinicio de volúmenes ni reversión financiera silenciosa. Conservar `PLATFORM_JWT_SECRET` si quedan solicitudes inciertas. Facturas/pagos permanecen consultables por la versión compatible; corregir cobros mediante anulación explícita auditada, nunca borrado.

### Identidad demo en seeds

Los seeds nuevos usan el UUID determinístico `a174b163-08d8-4d24-8d83-f918b66ee2a1`. En bases existentes reutilizan `tenant-demo-001` o el ID ya asociado a `centro-medico-demo`/`centro-medico-demo-demo`, sin reescribir claves/FKs ni crear otro centro. Si varios tenants coinciden, el seed falla antes de escribir: revisá la identidad duplicada, no resetees datos. Todas las relaciones reciben el ID resuelto explícitamente.

**No uses un reseed para “convertir” IDs históricos**: el demo seed preexistente recrea consultas/pagos del centro demo. Este fix se validó con mocks; no se ejecutó reseed real. `@default(uuid())` sigue siendo generación para registros nuevos, no una restricción de formato para datos existentes.
