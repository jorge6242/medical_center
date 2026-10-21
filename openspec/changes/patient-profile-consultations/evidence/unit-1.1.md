# Unidad 1.1 — contrato PATCH de paciente

## Estado

**IMPLEMENTADA y verificada en suite unitaria API mockeada.** No equivale a integración HTTP/DB real.

## Safety net y reparación previa autorizada

- Ejecución original: **6 pasan / 2 fallan / 8 total**, exit 1.
- `includes the patient age in lookup results`: fixture antigua sin `representatives`, requerido por el código existente.
- `returns clinicalHistory in patient detail responses`: expectativa antigua no admitía el include de representantes que GET ya realizaba.
- Coordinador autorizó SOLO reparar esas dos fixtures/expectativas, sin fuente; siguiente ejecución **8/8 pasan**. Esto NO se atribuye como RED de la funcionalidad.

## TDD Cycle Evidence

| Tarea | Safety net                       | RED                                                                       | GREEN | Triangulación                                                                | Refactor                                    |
| ----- | -------------------------------- | ------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| 1.1   | 8/8 después de reparación previa | 11 pasan / 1 falla: representatives null en PATCH, esperados dos vínculos | 12/12 | Menor con dos vínculos; adulto sin vínculos; rechazo tenant ajeno / inactivo | No requerido; solo formato de líneas nuevas |

## Cambio y garantías comprobadas

- `PatientsService.update`: recarga final conserva `{id,tenantId}` e incluye representantes con el mismo include que GET.
- La respuesta preserva documento automático, historia clínica y ambos vínculos al actualizar nombre; no expone tenantId.
- Payload sin representante ni historia no escribe relaciones ni reemplaza historia; Prisma recibe undefined para campos omitidos, no null.
- Tenant ajeno/inactivo: falla antes de update/reload; filtro incluye tenant e isActive.
- No cambios a selector PAID sin informe, consultas, DTOs, esquema, asociación singular/aditiva, campos opcionales o eliminación.

## Comandos ejecutados (Docker API existente)

Prefijo de todos los comandos:

```sh
docker compose -f docker-compose.dev.yml exec -T -w /app/apps/api api
```

1. `pnpm test --runInBand patients.service.spec.ts`: baseline 6/8; reparado 8/8; RED 11/12; GREEN 12/12.
2. `pnpm run typecheck`: pasa (tsc --noEmit).
3. `pnpm exec eslint src/patients/patients.service.ts src/patients/patients.service.spec.ts --max-warnings 0`: pasa.
4. `pnpm exec prettier --check src/patients/patients.service.ts src/patients/patients.service.spec.ts`: primer intento detectó SOLO formato en líneas nuevas del test; corregido sin reformatear líneas ajenas.

## Límites

- Primer intento de Docker bloqueado por socket; ejecutado después mediante escalación autorizada.
- Warning ts-jest Node16/isolatedModules preexistente, no modificado.
- No builds, instalaciones, recreaciones, migraciones, escrituras DB, commits ni despliegues.
- Engram no disponible; evidencia persistida aquí. El coordinador consolida tasks/progress/state.
- Verificación final tras formato: **12/12 pasan**, Prettier pasa, exit 0; `git diff --check` pasa.
- Diff unidad medido: API fuente +5/-0, test +129/-0 y evidencia 40 líneas nuevas: **174 líneas**, con reserva de 60 todavía <400.
