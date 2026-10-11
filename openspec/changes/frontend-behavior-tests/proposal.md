# Proposal: Pruebas frontend orientadas a riesgo

## Intent

Crear un plan físico y verificable. Hoy `apps/web/package.json` no declara runner ni script de tests; el relevamiento no encontró suites frontend. Tests API no prueban UI. Priorizar Inicio y cobro protege operaciones y demo.

## Scope

### In Scope

- Inventario trazable de 34 rutas: 15 altas, 14 medias, 2 bajas diferidas y 3 auxiliares sin suite propia.
- Roadmap futuro de infraestructura, unitarias selectivas, componentes/integración y E2E críticos.
- Escenarios, tareas y registro de progreso con evidencia de ejecución; formularios compartidos se prueban una vez.
- Validación del contrato de negocio antes de fijar expectativas contradictorias con el código.

### Out of Scope

- Esta entrega no implementa tests, instala dependencias ni modifica aplicación.
- No cambiar reglas de negocio, backend, DB ni arquitectura general.
- No exigir 100% de líneas/rutas; no snapshots masivos, títulos, CSS o pruebas duplicadas de wrappers.
- Suites propias para roles/colas diferidas; auxiliares cubiertas solo por navegación si aporta valor.

## Capabilities

### New Capabilities

- `frontend-behavior-testing`: cobertura por riesgo, infraestructura futura y trazabilidad ruta → escenario → tarea → evidencia, sin confundir planificación con cobertura ejecutada.

### Modified Capabilities

- Ninguna. `payment-list-ssp`, `consultations-list-ssp`, `data-table-ssp` y `onboarding-token-management` son referencias; no se alteran sus requisitos.

## Approach

Separar unitarias de lógica propia, componentes interactivos con dependencias controladas y flujos reales E2E. Implementación futura en bloques: infraestructura → Inicio/cobro → restantes altas → medias. Separar fixtures de mocks. TDD obligatorio una vez habilitado runner frontend, siempre dentro de Docker y sin build. Prever PRs encadenadas autónomas de menos de 400 líneas; `ask-on-risk` requiere resolver entrega antes de apply, no autoriza implementación ahora.

## Affected Areas

| Área                                                | Impacto                                     |
| --------------------------------------------------- | ------------------------------------------- |
| `openspec/changes/frontend-behavior-tests/`         | Nueva documentación y seguimiento           |
| `apps/web/src/features/`, `src/shared/`, `src/app/` | Futura cobertura selectiva                  |
| `apps/web/package.json`, `pnpm-lock.yaml`           | Futura infraestructura, no modificada ahora |

## Risks

| Riesgo                         | Probabilidad | Mitigación                                                           |
| ------------------------------ | ------------ | -------------------------------------------------------------------- |
| Consolidadas suites sin runner | Alta         | Infraestructura primero                                              |
| Congelar bugs como contrato    | Media        | Resolver borrado permanente de especialidades y diferencias de specs |
| Tests duplicados/frágiles      | Media        | Afirmar efectos observables; wrappers sin suite redundante           |

## Rollback Plan

Revertir únicamente estos documentos; no afecta runtime. En implementación futura, revertir cada slice autónomo con sus tests y configuración, sin cambios de datos.

## Dependencies

Runner compatible, Docker, contratos confirmados y autorización posterior.

## Success Criteria

- [ ] Las 34 rutas tienen ID, riesgo, capa y estado inicial honesto.
- [ ] Las 29 recomendadas quedan trazadas a escenarios/tareas; las 5 exclusiones justificadas.
- [ ] Ningún progreso de tests se marca terminado sin evidencia reproducible.
