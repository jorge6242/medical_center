# Proposal: Generalizar Doctor → Professional (multi-profesión)

## Intent

El centro atiende pacientes con médicos, psicólogos y fisioterapeutas, pero la entidad de negocio se modeló como `Doctor`. Hoy es imposible registrar un profesional no médico sin arrastrar conceptos médicos (licencia SACS) que no aplican. La entidad real del dominio es el **profesional de salud** (patrón `Practitioner` de HL7 FHIR, usado por HIS modernos tipo Servinte). El 80% del modelo actual (split, payouts, recibos, servicios, consultas) ya cuelga del prestador — solo tiene el nombre equivocado.

## Scope

### In Scope

- Renombrar modelos Prisma: `Doctor`→`Professional`, `DoctorBankAccount`→`ProfessionalBankAccount`, `DoctorService`→`ProfessionalService`, `DoctorPayout`→`ProfessionalPayout`, `DoctorReceipt`→`ProfessionalReceipt`; columnas `doctorId`→`professionalId` en `Consultation`, `MedicalRecord` y tablas hijas
- Enum `ProfessionType` (`PHYSICIAN | PSYCHOLOGIST | PHYSIOTHERAPIST`) + columna `professionType` (default `PHYSICIAN` para filas existentes)
- `medicalLicenseNumber` → `licenseNumber` (colegiatura genérica)
- Verificación SACS condicional: solo `PHYSICIAN`; no-médicos quedan `NOT_APPLICABLE`
- Renombrar módulo NestJS `doctors/` → `professionals/`, endpoints `/doctors` → `/professionals`, DTOs, y feature frontend `doctors/` → `professionals/`
- Claim JWT `doctorId` → `professionalId` (tokens viejos expiran en 8h)

### Out of Scope

- Renombrar el **rol ACL** `doctor` (toca seeds/JWT/nav de forma independiente; se evalúa después)
- Nuevos flujos de agenda/sesiones por profesión (la consulta actual ya sirve)
- Tabla-perfil por profesión (Opción B del análisis; solo si los campos divergen mucho a futuro)
- Nuevas especialidades seed de psicología/fisioterapia (el tenant las crea por catálogo)

## Capabilities

### New Capabilities

- `professional-profiles`: profesional multi-tipo con `professionType`, licencia genérica y verificación SACS condicional a `PHYSICIAN`

### Modified Capabilities

- `user-doctor-link`: la entidad vinculada pasa de `Doctor` a `Professional`; el claim JWT se renombra a `professionalId`

## Approach

Rename total con migración **sin pérdida de datos**: generar migración con `--create-only` y editarla a mano usando `ALTER TABLE ... RENAME` / `ALTER COLUMN ... RENAME` (Prisma detecta renames como drop+create). SACS cron/service filtra `professionType: PHYSICIAN`. Nombre elegido: `Professional` (UI: "Profesionales"); alineación FHIR `Practitioner` documentada en design.

**Estrategia Chained PRs (>400 líneas, 148 archivos):**

| PR  | Contenido                                                                                         | Base   |
| --- | ------------------------------------------------------------------------------------------------- | ------ |
| 1   | Schema + migración rename + enum + seeds                                                          | `main` |
| 2   | Módulo `professionals/` (ex-`doctors`) + SACS condicional                                         | PR 1   |
| 3   | Consumidores backend: payments, consultations, payouts, receipts, medical-records, reports, stats | PR 2   |
| 4   | Frontend: features, rutas `/profesionales`, services/hooks                                        | PR 3   |

## Affected Areas

| Area                                                                                           | Impact           | Description                                  |
| ---------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| `apps/api/prisma/schema.prisma` + migración                                                    | Modified         | Renames + `professionType` + `licenseNumber` |
| `apps/api/src/doctors/`                                                                        | Renamed          | Módulo completo → `professionals/`           |
| `apps/api/src/{payments,consultations,doctor-payouts,receipts,medical-records,reports,stats}/` | Modified         | Referencias `doctorId`/`doctor`              |
| `apps/api/src/auth/`                                                                           | Modified         | Claim JWT `professionalId`                   |
| `apps/web/src/features/{doctors,doctors-profile,doctor-payouts}/` + rutas dashboard            | Renamed/Modified | Features y llamadas API                      |
| `packages/shared/src/dtos.ts`                                                                  | Modified         | Tipos compartidos                            |

## Risks

| Risk                                  | Likelihood | Mitigation                                                                                 |
| ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Migración drop+create borra datos     | Med        | `--create-only` + edición manual a `RENAME`; verificar en dev antes de prod; backup previo |
| Rename parcial deja referencias rotas | Med        | PRs encadenados + `pnpm run typecheck` por PR; grep `doctor` residual = 0 al final         |
| Sesiones activas con claim viejo      | Low        | Expiran en 8h; forzar re-login en deploy                                                   |

## Rollback Plan

Cada PR revierte con `git revert` independiente. La migración tendrá down-migration con los `RENAME` inversos. En prod: restaurar backup de DB si la migración falla antes del deploy del código.

## Success Criteria

- [ ] Existe `Professional` con `professionType` y 0 columnas/tablas `doctor*` en el schema
- [ ] Un psicólogo se registra, presta servicios, cobra con split y recibe payout sin pasar por SACS
- [ ] SACS solo corre para `PHYSICIAN`
- [ ] `pnpm run typecheck && pnpm run lint` verde en ambas apps; grep residual de `doctor` (entidad) = 0
