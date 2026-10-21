# Unidad 2.1 — Ficha de lectura

## Alcance

Ficha personal, identificación humana, estado, contacto, fecha civil y todos los representantes. La ruta deja de montar informes/antecedentes sin eliminar componentes, datos ni endpoints. Sin edición ni consultas todavía: unidades 2.3/2.4 pendientes.

## TDD / verificación

| RED                                                                                                                                                                                                                                                                                                                           | GREEN                                                                     | Triangulación / refactor                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test escrito antes de producción; corrida inicial 9 fallos con errores del panel anterior. No se considera evidencia suficiente por esos errores. Repetición contra página original con HTTP clínico válido: 1 fallo de aserción (`Unable to find role="heading" and name "Ana Pérez"`), 8 omitidos; sin error de transporte. | 10/10 componentes/integración HTTP con servicios, hook, ACL y MSW reales. | Adulto/menor; dos representantes/ninguno; carga; 404/403/503 y reintento; red; fallo con caché; ID incorrecto/navegación; falta de permiso sin requests; ninguna llamada clínica. Formato y warning de non-null corregidos; suite verde después. |

Comandos ejecutados dentro del servicio `web`, usando `docker compose -f docker-compose.dev.yml exec -T web`:

- RED: `pnpm test --runInBand --runTestsByPath src/features/patients/components/patient-profile.test.tsx -t 'muestra ficha personal'` contra página original preservada en `/tmp/patient-profile-read-before/page.tsx`; luego restaurada versión GREEN.
- GREEN: `pnpm test --runInBand --runTestsByPath src/features/patients/components/patient-profile.test.tsx` → 10 pasan.
- `pnpm run typecheck` → pasa.
- `pnpm exec eslint src/features/patients/components/patient-profile.tsx src/features/patients/components/patient-profile.test.tsx 'src/app/(dashboard)/pacientes/[id]/page.tsx' --max-warnings 0` → pasa.
- `pnpm exec prettier --check` sobre esos mismos tres archivos → pasa; `--write` limitado a esos archivos.

## Evidencia y límites

- Guía local Next 16.2.4 leída antes de código: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`; conserva página servidor con `await params` y feature cliente.
- Safety net: ruta sin tests previos específicos; prueba nueva primero. No se ejecutó suite completa aquí: se reserva para cierre integrado.
- Diff de unidad: fuente nueva 123 + tests nuevos 223 + página 5 adiciones/13 eliminaciones + evidencia 23 = **387 líneas** (<400).
- Logs locales: `/tmp/patient-profile-read-semantic-red.log`, `/tmp/patient-profile-read-green.log` (este último corresponde a GREEN intermedio 9/9; la corrida final 10/10 consta en salida de herramienta).
- Engram no disponible: persistencia física OpenSpec. Sin builds, nuevas dependencias, migraciones, commits ni despliegues. No E2E ni garantía absoluta de ausencia de regresiones.
