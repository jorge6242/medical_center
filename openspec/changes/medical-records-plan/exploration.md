# Exploration: Medical Records First Slice

## Current state

- No existe feature de medical records en API ni en web.
- El dominio ya tiene `Patient`, `Consultation`, `Doctor`, `Payment` y `DoctorReceipt`.
- Las consultas se crean dentro de `apps/api/src/payments/payments.service.ts`.
- Ya existe infraestructura de PDFs/reports, así que no conviene abrir otra estrategia en esta fase.

## Relevant files/modules

- `apps/api/prisma/schema.prisma`
- `apps/api/src/payments/payments.service.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/stats/stats.service.ts`
- `apps/web/src/app/(dashboard)/inicio/page.tsx`
- `apps/web/src/app/(dashboard)/pacientes/page.tsx`
- `apps/web/src/app/(dashboard)/pagos/page.tsx`
- `packages/shared/src/interfaces/index.ts`
- `packages/shared/src/dtos.ts`

## Gaps vs plan

- Falta el modelo `MedicalRecord`.
- Falta `Patient.clinicalHistory`.
- Falta módulo backend, DTOs y contratos compartidos.
- Falta una página de detalle de paciente para mostrar historial y records.

## Risks / conflicts

- El plan original proponía BullMQ para PDFs, pero eso duplica estrategia respecto al resto del proyecto.
- El plan usa `any` en JSONB, algo incompatible con TypeScript strict del repo.
- La UI propuesta asume rutas y componentes que no existen todavía.

## Recommended initial slice

1. Agregar `Patient.clinicalHistory`.
2. Crear `MedicalRecord` con relación 1:1 a `Consultation`.
3. Exponer create/read/list mínimas.
4. Montar una vista thin de paciente para empezar a consumir los datos.
