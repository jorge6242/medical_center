# Unidad 1.2 — contratos frontend

Estado: implementada; pendiente revisión independiente. No implementa aún la pantalla.

## Alcance

- `usePatient(id)` consulta detalle y separa caché por ID; ID vacío deshabilita petición.
- `ConsultationQuery.patientId` se serializa preservando filtros/paginación existentes.
- DTO PATCH incluye documento, sin casts; representante de respuesta no se descarta.
- `documentType` reutiliza tipo del DTO de alta: enum shared carece de M/P de Prisma; no modificarlo aquí evita ampliar alcance.
- Sin llamadas a informes/antecedentes ni cambios al selector de consultas elegibles.

## TDD y comandos reales

Todos los comandos runtime dentro del contenedor web existente:
`docker compose -f docker-compose.dev.yml exec -T web <comando>`.

| Paso             | Comando / resultado                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net       | `pnpm run test --runInBand --silent`: 21 suites, 179 tests PASS, 91.435 s, antes de editar fuentes.                                                                                                                                                                                                              |
| RED              | `pnpm run test --runInBand --runTestsByPath src/features/patients/hooks/patient-contracts.test.tsx`: 5 fallos / 2 PASS. `patientId` esperado patient-a, recibido null; historial mostró consulta-null. Tres fallos adicionales por export usePatient inexistente: ausencia de API, NO una aserción de regresión. |
| GREEN            | Mismo comando focalizado: 7/7 PASS, 1.076 s.                                                                                                                                                                                                                                                                     |
| Triangulación    | Con/sin patientId; ID vacío/no vacío; navegación A/B tanto en detalle como historial; documento PATCH + representante en respuesta.                                                                                                                                                                              |
| Refactor         | Solo formato en tests/fixture. Se corrigió wrapper local de rerender para conservar QueryClientProvider; fallo del propio test, no de producción.                                                                                                                                                                |
| Gates            | `pnpm run typecheck` y ESLint de cinco archivos tocados: PASS. Prettier check tests/fixture y servicio consultas: PASS.                                                                                                                                                                                          |
| Formato heredado | Prettier check hook y servicio patients marca warnings de comillas/estilo; snapshots originales por stdin también fallan (exit 1). Se mantuvo estilo original, sin reformateo masivo.                                                                                                                            |

## Guía y límites

Leída antes del código: `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (Next 16.2.4). Hooks cliente, servicios puros; sin APIs de routing nuevas.
No ejecuté builds, instalación, recreación de contenedores, commits, E2E ni despliegues. Engram no disponible; evidencia persistida en OpenSpec.

## Diff de unidad

Fuentes: 13 adiciones / 0 eliminaciones. Tests nuevos 186 líneas; fixture 16. Evidencia 35 líneas: total 250 líneas, inferior a 400. El conteo excluye cambios paralelos API/documentación global de otros agentes.

## Key Learnings:

1. El enum compartido de documentos no contiene M/P aunque Prisma sí; usarlo como restricción nueva rompería compatibilidad de menores/pasaportes.
2. El helper renderWithClient devuelve rerender estándar: al reutilizarlo debe conservarse explícitamente QueryClientProvider.
