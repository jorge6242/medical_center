# Seguimiento del diagnóstico de dark mode

## Estado vigente — aceptación 2026-10-15

**Fase 1 cerrada y aceptada; fase 2 lista para planificación, no implementada.** Ver [acceptance.md](acceptance.md): 29/29 tests y revisión independiente, más QA global declarada por usuario para vistas/estados/notificaciones/nativos/impresión/PDF. FDM-G001–G005 se cierran a nivel de fase con límites W01/W02 y excepción de evidencia granular registrados allí. **FDM-T001 cumplido:** cierre registrado; T002–T008 y H001 siguen pendientes.

Las tablas inferiores conservan la línea base y evidencia histórica por ID. Las casillas FDM-R/C y H no se marcan como ejecución individual: no hay procedimiento/capturas/roles/mediciones por fila. «Pendiente» en esas tablas describe evidencia granular no disponible, NO un bloqueo vigente de fase 1 ni un defecto confirmado. Su aceptación global remite a acceptance.md y no se hereda para dark mode.

Fecha de línea base: **2026-10-15**. Este archivo registra el seguimiento y el **orden de trabajo pedido por el usuario**; la planificación fase 1 está en proposal/spec/design/tasks. Usuario autorizó ejecución automática de fase 1 en entrega única size:exception; ninguna casilla se cierra por esa autorización.

## Cómo leer y actualizar

- **Inspeccionado**: evidencia de código relevada en esta fecha.
- **Actualizado**: código modificado para resolver el punto; 15 TSX y CSS global, ver evidencia de apply.
- **Validado**: aceptación visual comprobada; actualmente **ninguno**. Los checks estáticos se registran aparte.
- Estado **pendiente**: brecha estática conocida sin resolución.
- Estado **requiere validación**: riesgo/consistencia que debe comprobarse; no implica defecto visual demostrado.
- Estado **excepción a confirmar**: alcance legítimamente distinto o no alcanzable que necesita política explícita.

Todos los hallazgos y archivos de abajo están inspeccionados estáticamente; las casillas de aceptación permanecen abiertas y la columna Actualizado registra ediciones, no validación. Para cerrar una fila, registrar fecha, decisión/cambio, archivos, procedimiento y evidencia; no marcar validación por haber editado CSS. Mantener los IDs aunque se reordenen filas y agregar nuevos sin reutilizar IDs.

## Orden obligatorio

1. **Fase 1:** limpieza y alineamiento de TODOS los componentes con tokens y design system.
2. **Fase 2:** tema del design system para aplicar dark mode.

La fase 2 queda **bloqueada** hasta auditar y cerrar fase 1. Cierre exige UI alineada, semántica de tokens faltantes definida, excepciones documentadas y evidencia de aceptación estática y visual. Las casillas de abajo son seguimiento pendiente, no resultados ejecutados.

## Fase 1 — Limpieza y alineamiento

### Hallazgos y límites — 31 puntos

El ID FDM-H001 se conserva en fase 2; los IDs restantes mantienen su identidad.

| Seguimiento  | Estado                    | Área                                  | Fuente / evidencia                                                                                                                                                                                                                                                  | Contexto pendiente                                                                                  |
| ------------ | ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [ ] FDM-H002 | actualizado; QA pendiente | Tokens de estado ausentes             | `apps/web/src/features/doctors/components/doctor-form.tsx:254,262,273; apps/web/src/features/lab-orders/components/lab-payment-form.tsx:310; apps/web/src/features/payments/components/consultation-payment-form.tsx:510`                                           | text-success y text-warning sin definición local.                                                   |
| [ ] FDM-H003 | actualizado; QA pendiente | Tokens de superficie ausentes         | `apps/web/src/features/medical-records/components/medical-records-create-panel.tsx:46; apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx:97; apps/web/src/features/medical-records/components/patient-medical-records-panel.tsx:121` | surface-container y surface-container-high sin definición local.                                    |
| [ ] FDM-H004 | actualizado; QA pendiente | Pantalla de error                     | `apps/web/src/app/error.tsx:18–22`                                                                                                                                                                                                                                  | Grises y blanco directos, incluido hover.                                                           |
| [ ] FDM-H005 | actualizado; QA pendiente | Pantalla 404                          | `apps/web/src/app/not-found.tsx:6–10`                                                                                                                                                                                                                               | Grises y blanco directos, incluido hover.                                                           |
| [ ] FDM-H006 | actualizado; QA pendiente | Carga global                          | `apps/web/src/app/loading.tsx:5–6`                                                                                                                                                                                                                                  | Spinner y texto en grises directos.                                                                 |
| [ ] FDM-H007 | actualizado; QA pendiente | Onboarding                            | `apps/web/src/app/onboarding/page.tsx:76,105,119,126`                                                                                                                                                                                                               | Éxito, validación y error con paleta directa.                                                       |
| [ ] FDM-H008 | actualizado; QA pendiente | Mi perfil                             | `apps/web/src/app/(dashboard)/mi-perfil/page.tsx:47–54,127,135,218,221`                                                                                                                                                                                             | Estados, mensajes y errores con paleta directa.                                                     |
| [ ] FDM-H009 | actualizado; QA pendiente | Badge compartido                      | `apps/web/src/shared/components/ui/badge.tsx:11–12`                                                                                                                                                                                                                 | Success/warning fijan paletas claras; propagan a consumidores.                                      |
| [ ] FDM-H010 | actualizado; QA pendiente | Scrim de modal                        | `apps/web/src/shared/components/ui/modal.tsx:30–34`                                                                                                                                                                                                                 | Negro/40 intencional para overlay; no hay token scrim documentado.                                  |
| [ ] FDM-H011 | requiere validación       | Estados Button                        | `apps/web/src/shared/components/ui/button.tsx:6–14`                                                                                                                                                                                                                 | Hover /90, disabled opacity-50, focus y destructive son tokenizados; contraste no medido.           |
| [ ] FDM-H012 | requiere validación       | Controles compartidos                 | `apps/web/src/shared/components/ui/input.tsx:22–34; apps/web/src/shared/components/ui/select.tsx:18–27; apps/web/src/shared/components/ui/lookup-combobox.tsx:83–116`                                                                                               | Focus, error, placeholder y selección deben comprobarse; no son defectos visuales confirmados.      |
| [ ] FDM-H013 | requiere validación       | Switch                                | `apps/web/src/shared/components/ui/switch.tsx:17–19`                                                                                                                                                                                                                | Track/thumb usan tokens; falta confirmar contrato de foco/disabled y contraste.                     |
| [ ] FDM-H014 | requiere validación       | Tabla compartida                      | `apps/web/src/shared/components/ui/data-table.tsx:54–133`                                                                                                                                                                                                           | Cabecera, filas, skeleton, vacío, paginación y disabled sin validación visual.                      |
| [ ] FDM-H015 | actualizado; QA pendiente | Pares de hover                        | `apps/web/src/features/lab-orders/components/lab-payment-form.tsx:280; apps/web/src/features/payments/components/consultation-payment-form.tsx:481`                                                                                                                 | text-primary sobre hover:bg-primary-container; revisar par semántico, no afirmar contraste fallido. |
| [ ] FDM-H016 | requiere validación       | Bordes con opacidad                   | `apps/web/src/features/platform-subscriptions/components/platform-billing-panel.tsx:57,188,384; apps/web/src/features/platform-audit/components/platform-audit-page.tsx:129; apps/web/src/features/platform-tenants/components/platform-tenants-list.tsx:95`        | outline/40 es derivado de token; validar sobre superficies oscuras.                                 |
| [ ] FDM-H017 | actualizado; QA pendiente | Herencia de texto                     | `apps/web/src/shared/components/ui/card.tsx:16; selects de plataforma y agenda enumerados en inventory.md §4`                                                                                                                                                       | on-background heredado dentro de surface; hoy coinciden, futura paleta podría separarlos.           |
| [ ] FDM-H018 | actualizado; QA pendiente | Inputs auditoría                      | `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx:32–45`                                                                                                                                                                                                       | Dos inputs sin className/tokens, fuera de Input compartido.                                         |
| [ ] FDM-H019 | actualizado; QA pendiente | Checkboxes nativos                    | `apps/web/src/features/consultations/components/schedule-consultation-form.tsx:335,339; apps/web/src/features/doctor-payouts/components/doctor-payout-form.tsx:196–205`                                                                                             | Sin accent-color/color-scheme propios; comprobar estados nativos.                                   |
| [ ] FDM-H020 | requiere validación       | Fechas y selects nativos              | `apps/web/src/app/(dashboard)/reportes/page.tsx:382–417; inventory.md §4`                                                                                                                                                                                           | Calendario, iconos, options y selects/textareas heredados sin color-scheme dark.                    |
| [ ] FDM-H021 | actualizado; QA pendiente | Toasts                                | `apps/web/src/app/providers.tsx:17; apps/web/src/shared/hooks/use-notification.ts:7–9`                                                                                                                                                                              | Toaster richColors sin integración de tema; no se inspeccionaron defaults internos.                 |
| [ ] FDM-H022 | actualizado; QA pendiente | Overlays y dropdowns                  | `apps/web/src/shared/components/ui/modal.tsx:30–47; apps/web/src/shared/components/ui/lookup-combobox.tsx:100–116`                                                                                                                                                  | Paneles tokenizados; dropdown usa shadow-lg fuera de elevation-N; no portales propios encontrados.  |
| [ ] FDM-H023 | requiere validación       | SVG e iconos UI                       | `apps/web/src/shared/components/ui/button.tsx:47–58; apps/web/src/features/lab-orders/components/lab-order-form.tsx:51–55; apps/web/src/features/payments/components/consultation-payment-form.tsx:228–232`                                                         | currentColor/none correcto estáticamente; revisar contraste heredado.                               |
| [ ] FDM-H024 | excepción a confirmar     | PDFs impresos                         | `apps/web/src/features/{reports,doctor-payouts,consultations,payments,medical-records}/components/*-pdf.tsx; inventory.md §6`                                                                                                                                       | Cinco archivos con paleta documental separada; confirmar que no sigan tema de pantalla.             |
| [ ] FDM-H025 | actualizado; QA pendiente | Impresión HTML                        | `apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx:46,64,69,81,93,134–135`                                                                                                                                                           | window.print sin paleta print; distinto de PDF generado.                                            |
| [ ] FDM-H026 | excepción a confirmar     | Logos tenant                          | `apps/web/src/app/(auth)/login/login-form.tsx:66; apps/web/src/shared/components/ui/sidebar.tsx:56; apps/web/src/features/tenant-settings/components/tenant-settings-form.tsx:209`                                                                                  | Mantener identidad de marca; validar legibilidad con logos reales no inspeccionados.                |
| [ ] FDM-H027 | excepción a confirmar     | UI externa Bull Board                 | `apps/web/src/app/(dashboard)/admin/queues/page.tsx:19`                                                                                                                                                                                                             | Abre otra aplicación, no hereda tokens frontend; política de alcance pendiente.                     |
| [ ] FDM-H028 | excepción a confirmar     | SVG de plantilla sin uso encontrado   | `apps/web/public/{file,vercel,next,globe,window}.svg`                                                                                                                                                                                                               | Tienen paleta fija, pero sin referencias en src; no contarlos como UI renderizada.                  |
| [ ] FDM-H029 | excepción a confirmar     | Componentes antiguos no alcanzables   | `apps/web/src/shared/components/Sidebar.tsx; apps/web/src/shared/components/Topbar.tsx`                                                                                                                                                                             | Sin imports encontrados; no borrar ni modificar por este diagnóstico.                               |
| [ ] FDM-H030 | requiere validación       | Elevación y opacidades                | `apps/web/src/app/globals.css:37–39; apps/web/src/shared/components/ui/lookup-combobox.tsx:100; apps/web/src/app/(dashboard)/inicio/page.tsx:150,162,175`                                                                                                           | Sombras negras y capas/opacity requieren criterio visual, no defecto confirmado.                    |
| [ ] FDM-H031 | requiere validación       | Cobertura de ramas y accesibilidad    | `Todas las rutas y componentes registrados abajo`                                                                                                                                                                                                                   | Navegador, permisos, estados, contraste, foco y recursos remotos aún no verificados.                |
| [ ] FDM-H032 | excepción a confirmar     | Charts/canvas y dependencias externas | `apps/web/src; apps/web/package.json`                                                                                                                                                                                                                               | No gráficos/canvas propios encontrados. Internos de node_modules y contenido remoto no auditados.   |

## Rutas — 41 páginas inspeccionadas; 3 actualizadas; 0 validadas

Las redirecciones/wrappers se conservan en el inventario: su comprobación será de navegación y composición, no una obligación de duplicar pruebas. El listado no determina pruebas ni prioridad de implementación.

| Seguimiento  | Fuente                                                                | Estado              | Actualizado | Validado |
| ------------ | --------------------------------------------------------------------- | ------------------- | ----------- | -------- |
| [ ] FDM-R001 | `apps/web/src/app/(auth)/login/page.tsx`                              | requiere validación | no          | no       |
| [ ] FDM-R002 | `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx`               | requiere validación | sí          | no       |
| [ ] FDM-R003 | `apps/web/src/app/(dashboard)/admin/configuracion-centro/page.tsx`    | requiere validación | no          | no       |
| [ ] FDM-R004 | `apps/web/src/app/(dashboard)/admin/doctores/[id]/editar/page.tsx`    | requiere validación | no          | no       |
| [ ] FDM-R005 | `apps/web/src/app/(dashboard)/admin/doctores/[id]/page.tsx`           | requiere validación | no          | no       |
| [ ] FDM-R006 | `apps/web/src/app/(dashboard)/admin/doctores/nuevo/page.tsx`          | requiere validación | no          | no       |
| [ ] FDM-R007 | `apps/web/src/app/(dashboard)/admin/doctores/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R008 | `apps/web/src/app/(dashboard)/admin/especialidades/page.tsx`          | requiere validación | no          | no       |
| [ ] FDM-R009 | `apps/web/src/app/(dashboard)/admin/laboratorios/page.tsx`            | requiere validación | no          | no       |
| [ ] FDM-R010 | `apps/web/src/app/(dashboard)/admin/queues/page.tsx`                  | requiere validación | no          | no       |
| [ ] FDM-R011 | `apps/web/src/app/(dashboard)/admin/roles/page.tsx`                   | requiere validación | no          | no       |
| [ ] FDM-R012 | `apps/web/src/app/(dashboard)/admin/usuarios/[id]/editar/page.tsx`    | requiere validación | no          | no       |
| [ ] FDM-R013 | `apps/web/src/app/(dashboard)/admin/usuarios/nuevo/page.tsx`          | requiere validación | no          | no       |
| [ ] FDM-R014 | `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R015 | `apps/web/src/app/(dashboard)/agenda/page.tsx`                        | requiere validación | no          | no       |
| [ ] FDM-R016 | `apps/web/src/app/(dashboard)/catalogo/page.tsx`                      | requiere validación | no          | no       |
| [ ] FDM-R017 | `apps/web/src/app/(dashboard)/consultas/[id]/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R018 | `apps/web/src/app/(dashboard)/consultas/page.tsx`                     | requiere validación | no          | no       |
| [ ] FDM-R019 | `apps/web/src/app/(dashboard)/egresos/page.tsx`                       | requiere validación | no          | no       |
| [ ] FDM-R020 | `apps/web/src/app/(dashboard)/especialidades/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R021 | `apps/web/src/app/(dashboard)/inicio/page.tsx`                        | requiere validación | no          | no       |
| [ ] FDM-R022 | `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx`           | requiere validación | no          | no       |
| [ ] FDM-R023 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/[id]/page.tsx`   | requiere validación | no          | no       |
| [ ] FDM-R024 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/nueva/page.tsx`  | requiere validación | no          | no       |
| [ ] FDM-R025 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/page.tsx`        | requiere validación | no          | no       |
| [ ] FDM-R026 | `apps/web/src/app/(dashboard)/medical-records/[id]/page.tsx`          | requiere validación | no          | no       |
| [ ] FDM-R027 | `apps/web/src/app/(dashboard)/mi-perfil/page.tsx`                     | requiere validación | sí          | no       |
| [ ] FDM-R028 | `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R029 | `apps/web/src/app/(dashboard)/pacientes/page.tsx`                     | requiere validación | no          | no       |
| [ ] FDM-R030 | `apps/web/src/app/(dashboard)/pagos/page.tsx`                         | requiere validación | no          | no       |
| [ ] FDM-R031 | `apps/web/src/app/(dashboard)/reportes/page.tsx`                      | requiere validación | no          | no       |
| [ ] FDM-R032 | `apps/web/src/app/onboarding/page.tsx`                                | requiere validación | sí          | no       |
| [ ] FDM-R033 | `apps/web/src/app/page.tsx`                                           | requiere validación | no          | no       |
| [ ] FDM-R034 | `apps/web/src/app/platform/(panel)/auditoria/page.tsx`                | requiere validación | no          | no       |
| [ ] FDM-R035 | `apps/web/src/app/platform/(panel)/page.tsx`                          | requiere validación | no          | no       |
| [ ] FDM-R036 | `apps/web/src/app/platform/(panel)/tenants/[id]/page.tsx`             | requiere validación | no          | no       |
| [ ] FDM-R037 | `apps/web/src/app/platform/(panel)/tenants/[id]/suscripcion/page.tsx` | requiere validación | no          | no       |
| [ ] FDM-R038 | `apps/web/src/app/platform/(panel)/tenants/nuevo/page.tsx`            | requiere validación | no          | no       |
| [ ] FDM-R039 | `apps/web/src/app/platform/(panel)/tenants/page.tsx`                  | requiere validación | no          | no       |
| [ ] FDM-R040 | `apps/web/src/app/platform/login/page.tsx`                            | requiere validación | no          | no       |
| [ ] FDM-R041 | `apps/web/src/app/tenant-not-found/page.tsx`                          | requiere validación | no          | no       |

## Componentes / archivos TSX alcanzables — 128 inspeccionados; 15 actualizados; 0 validados

La unidad es **archivo TSX**, no función React: un archivo puede exportar varios componentes. Incluye las páginas y entradas especiales, por eso estos conteos no se suman a las 41 rutas. Las dependencias inmediatas y hallazgos por archivo están en [inventory.md §8](inventory.md#8-inventario-exhaustivo-tsx-alcanzable). Un componente sin color literal puede heredar un problema compartido o tener estados aún no ejercitados.

| Seguimiento  | Fuente                                                                                   | Estado                | Actualizado | Validado |
| ------------ | ---------------------------------------------------------------------------------------- | --------------------- | ----------- | -------- |
| [ ] FDM-C001 | `apps/web/src/app/(auth)/login/login-form.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C002 | `apps/web/src/app/(auth)/login/page.tsx`                                                 | requiere validación   | no          | no       |
| [ ] FDM-C003 | `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx`                                  | requiere validación   | sí          | no       |
| [ ] FDM-C004 | `apps/web/src/app/(dashboard)/admin/configuracion-centro/page.tsx`                       | requiere validación   | no          | no       |
| [ ] FDM-C005 | `apps/web/src/app/(dashboard)/admin/doctores/[id]/editar/page.tsx`                       | requiere validación   | no          | no       |
| [ ] FDM-C006 | `apps/web/src/app/(dashboard)/admin/doctores/[id]/page.tsx`                              | requiere validación   | no          | no       |
| [ ] FDM-C007 | `apps/web/src/app/(dashboard)/admin/doctores/nuevo/page.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C008 | `apps/web/src/app/(dashboard)/admin/doctores/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C009 | `apps/web/src/app/(dashboard)/admin/especialidades/page.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C010 | `apps/web/src/app/(dashboard)/admin/laboratorios/page.tsx`                               | requiere validación   | no          | no       |
| [ ] FDM-C011 | `apps/web/src/app/(dashboard)/admin/queues/page.tsx`                                     | requiere validación   | no          | no       |
| [ ] FDM-C012 | `apps/web/src/app/(dashboard)/admin/roles/page.tsx`                                      | requiere validación   | no          | no       |
| [ ] FDM-C013 | `apps/web/src/app/(dashboard)/admin/usuarios/[id]/editar/page.tsx`                       | requiere validación   | no          | no       |
| [ ] FDM-C014 | `apps/web/src/app/(dashboard)/admin/usuarios/nuevo/page.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C015 | `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C016 | `apps/web/src/app/(dashboard)/agenda/page.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C017 | `apps/web/src/app/(dashboard)/catalogo/page.tsx`                                         | requiere validación   | no          | no       |
| [ ] FDM-C018 | `apps/web/src/app/(dashboard)/consultas/[id]/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C019 | `apps/web/src/app/(dashboard)/consultas/page.tsx`                                        | requiere validación   | no          | no       |
| [ ] FDM-C020 | `apps/web/src/app/(dashboard)/egresos/page.tsx`                                          | requiere validación   | no          | no       |
| [ ] FDM-C021 | `apps/web/src/app/(dashboard)/especialidades/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C022 | `apps/web/src/app/(dashboard)/inicio/page.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C023 | `apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx`                              | requiere validación   | no          | no       |
| [ ] FDM-C024 | `apps/web/src/app/(dashboard)/layout.tsx`                                                | requiere validación   | no          | no       |
| [ ] FDM-C025 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/[id]/page.tsx`                      | requiere validación   | no          | no       |
| [ ] FDM-C026 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/nueva/page.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C027 | `apps/web/src/app/(dashboard)/liquidaciones-doctores/page.tsx`                           | requiere validación   | no          | no       |
| [ ] FDM-C028 | `apps/web/src/app/(dashboard)/medical-records/[id]/page.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C029 | `apps/web/src/app/(dashboard)/mi-perfil/page.tsx`                                        | requiere validación   | sí          | no       |
| [ ] FDM-C030 | `apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C031 | `apps/web/src/app/(dashboard)/pacientes/page.tsx`                                        | requiere validación   | no          | no       |
| [ ] FDM-C032 | `apps/web/src/app/(dashboard)/pagos/page.tsx`                                            | requiere validación   | no          | no       |
| [ ] FDM-C033 | `apps/web/src/app/(dashboard)/reportes/page.tsx`                                         | requiere validación   | no          | no       |
| [ ] FDM-C034 | `apps/web/src/app/error.tsx`                                                             | requiere validación   | sí          | no       |
| [ ] FDM-C035 | `apps/web/src/app/layout.tsx`                                                            | requiere validación   | no          | no       |
| [ ] FDM-C036 | `apps/web/src/app/loading.tsx`                                                           | requiere validación   | sí          | no       |
| [ ] FDM-C037 | `apps/web/src/app/not-found.tsx`                                                         | requiere validación   | sí          | no       |
| [ ] FDM-C038 | `apps/web/src/app/onboarding/page.tsx`                                                   | requiere validación   | sí          | no       |
| [ ] FDM-C039 | `apps/web/src/app/page.tsx`                                                              | requiere validación   | no          | no       |
| [ ] FDM-C040 | `apps/web/src/app/platform/(panel)/auditoria/page.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C041 | `apps/web/src/app/platform/(panel)/layout.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C042 | `apps/web/src/app/platform/(panel)/page.tsx`                                             | requiere validación   | no          | no       |
| [ ] FDM-C043 | `apps/web/src/app/platform/(panel)/tenants/[id]/page.tsx`                                | requiere validación   | no          | no       |
| [ ] FDM-C044 | `apps/web/src/app/platform/(panel)/tenants/[id]/suscripcion/page.tsx`                    | requiere validación   | no          | no       |
| [ ] FDM-C045 | `apps/web/src/app/platform/(panel)/tenants/nuevo/page.tsx`                               | requiere validación   | no          | no       |
| [ ] FDM-C046 | `apps/web/src/app/platform/(panel)/tenants/page.tsx`                                     | requiere validación   | no          | no       |
| [ ] FDM-C047 | `apps/web/src/app/platform/login/page.tsx`                                               | requiere validación   | no          | no       |
| [ ] FDM-C048 | `apps/web/src/app/providers.tsx`                                                         | requiere validación   | sí          | no       |
| [ ] FDM-C049 | `apps/web/src/app/tenant-not-found/page.tsx`                                             | requiere validación   | no          | no       |
| [ ] FDM-C050 | `apps/web/src/features/audit-logs/components/audit-log-table.tsx`                        | requiere validación   | no          | no       |
| [ ] FDM-C051 | `apps/web/src/features/auth/components/auth-hydrator.tsx`                                | requiere validación   | no          | no       |
| [ ] FDM-C052 | `apps/web/src/features/consultations/components/consultation-detail-panel.tsx`           | requiere validación   | no          | no       |
| [ ] FDM-C053 | `apps/web/src/features/consultations/components/consultation-detail-pdf.tsx`             | excepción a confirmar | no          | no       |
| [ ] FDM-C054 | `apps/web/src/features/consultations/components/schedule-consultation-form.tsx`          | requiere validación   | no          | no       |
| [ ] FDM-C055 | `apps/web/src/features/doctor-payouts/components/doctor-payout-detail-panel.tsx`         | requiere validación   | no          | no       |
| [ ] FDM-C056 | `apps/web/src/features/doctor-payouts/components/doctor-payout-form.tsx`                 | requiere validación   | no          | no       |
| [ ] FDM-C057 | `apps/web/src/features/doctor-payouts/components/doctor-payout-pdf.tsx`                  | excepción a confirmar | no          | no       |
| [ ] FDM-C058 | `apps/web/src/features/doctors/components/doctor-columns.tsx`                            | requiere validación   | no          | no       |
| [ ] FDM-C059 | `apps/web/src/features/doctors/components/doctor-create-page.tsx`                        | requiere validación   | no          | no       |
| [ ] FDM-C060 | `apps/web/src/features/doctors/components/doctor-detail-page.tsx`                        | requiere validación   | no          | no       |
| [ ] FDM-C061 | `apps/web/src/features/doctors/components/doctor-edit-page.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C062 | `apps/web/src/features/doctors/components/doctor-form.tsx`                               | requiere validación   | no          | no       |
| [ ] FDM-C063 | `apps/web/src/features/doctors/components/doctor-toolbar.tsx`                            | requiere validación   | no          | no       |
| [ ] FDM-C064 | `apps/web/src/features/doctors/components/verification-badge.tsx`                        | requiere validación   | no          | no       |
| [ ] FDM-C065 | `apps/web/src/features/expenses/components/expense-columns.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C066 | `apps/web/src/features/expenses/components/expense-form.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C067 | `apps/web/src/features/expenses/components/expense-toolbar.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C068 | `apps/web/src/features/lab-orders/components/lab-order-form.tsx`                         | requiere validación   | no          | no       |
| [ ] FDM-C069 | `apps/web/src/features/lab-orders/components/lab-orders-columns.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C070 | `apps/web/src/features/lab-orders/components/lab-orders-toolbar.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C071 | `apps/web/src/features/lab-orders/components/lab-payment-form.tsx`                       | requiere validación   | sí          | no       |
| [ ] FDM-C072 | `apps/web/src/features/labs/components/lab-test-columns.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C073 | `apps/web/src/features/labs/components/lab-test-toolbar.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C074 | `apps/web/src/features/labs/components/laboratory-price-catalog.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C075 | `apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx`       | requiere validación   | sí          | no       |
| [ ] FDM-C076 | `apps/web/src/features/medical-records/components/medical-record-dynamic-form.tsx`       | requiere validación   | no          | no       |
| [ ] FDM-C077 | `apps/web/src/features/medical-records/components/medical-record-pdf.tsx`                | excepción a confirmar | no          | no       |
| [ ] FDM-C078 | `apps/web/src/features/medical-records/components/medical-records-create-panel.tsx`      | requiere validación   | no          | no       |
| [ ] FDM-C079 | `apps/web/src/features/medical-records/components/paid-consultation-columns.tsx`         | requiere validación   | no          | no       |
| [ ] FDM-C080 | `apps/web/src/features/medical-records/components/patient-medical-records-panel.tsx`     | requiere validación   | no          | no       |
| [ ] FDM-C081 | `apps/web/src/features/patients/components/patient-columns.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C082 | `apps/web/src/features/patients/components/patient-form.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C083 | `apps/web/src/features/patients/components/patient-representative-section.tsx`           | requiere validación   | no          | no       |
| [ ] FDM-C084 | `apps/web/src/features/patients/components/patient-toolbar.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C085 | `apps/web/src/features/payments/components/consultation-payment-form.tsx`                | requiere validación   | sí          | no       |
| [ ] FDM-C086 | `apps/web/src/features/payments/components/doctor-receipt-modal.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C087 | `apps/web/src/features/payments/components/doctor-receipt-pdf.tsx`                       | excepción a confirmar | no          | no       |
| [ ] FDM-C088 | `apps/web/src/features/payments/components/doctor-receipt-view.tsx`                      | requiere validación   | no          | no       |
| [ ] FDM-C089 | `apps/web/src/features/payments/components/payment-columns.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C090 | `apps/web/src/features/payments/components/payment-form.tsx`                             | requiere validación   | no          | no       |
| [ ] FDM-C091 | `apps/web/src/features/payments/components/payment-toolbar.tsx`                          | requiere validación   | no          | no       |
| [ ] FDM-C092 | `apps/web/src/features/platform-audit/components/platform-audit-page.tsx`                | requiere validación   | no          | no       |
| [ ] FDM-C093 | `apps/web/src/features/platform-auth/components/platform-login-form.tsx`                 | requiere validación   | no          | no       |
| [ ] FDM-C094 | `apps/web/src/features/platform-auth/components/platform-session-recovery.tsx`           | requiere validación   | no          | no       |
| [ ] FDM-C095 | `apps/web/src/features/platform-auth/components/platform-shell.tsx`                      | requiere validación   | no          | no       |
| [ ] FDM-C096 | `apps/web/src/features/platform-dashboard/components/platform-dashboard-page.tsx`        | requiere validación   | no          | no       |
| [ ] FDM-C097 | `apps/web/src/features/platform-shared/platform-pending-operations.tsx`                  | requiere validación   | no          | no       |
| [ ] FDM-C098 | `apps/web/src/features/platform-shared/uncertain-mutation-notice.tsx`                    | requiere validación   | no          | no       |
| [ ] FDM-C099 | `apps/web/src/features/platform-subscriptions/components/platform-billing-panel.tsx`     | requiere validación   | no          | no       |
| [ ] FDM-C100 | `apps/web/src/features/platform-subscriptions/components/platform-contract-panel.tsx`    | requiere validación   | no          | no       |
| [ ] FDM-C101 | `apps/web/src/features/platform-subscriptions/components/platform-subscription-page.tsx` | requiere validación   | no          | no       |
| [ ] FDM-C102 | `apps/web/src/features/platform-tenants/components/platform-tenant-activation-modal.tsx` | requiere validación   | no          | no       |
| [ ] FDM-C103 | `apps/web/src/features/platform-tenants/components/platform-tenant-create-form.tsx`      | requiere validación   | no          | no       |
| [ ] FDM-C104 | `apps/web/src/features/platform-tenants/components/platform-tenant-detail.tsx`           | requiere validación   | no          | no       |
| [ ] FDM-C105 | `apps/web/src/features/platform-tenants/components/platform-tenants-list.tsx`            | requiere validación   | no          | no       |
| [ ] FDM-C106 | `apps/web/src/features/reports/components/report-excel.tsx`                              | requiere validación   | no          | no       |
| [ ] FDM-C107 | `apps/web/src/features/reports/components/report-export-sidebar.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C108 | `apps/web/src/features/reports/components/report-pdf.tsx`                                | excepción a confirmar | no          | no       |
| [ ] FDM-C109 | `apps/web/src/features/specialties/components/specialty-columns.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C110 | `apps/web/src/features/specialties/components/specialty-form.tsx`                        | requiere validación   | no          | no       |
| [ ] FDM-C111 | `apps/web/src/features/specialties/components/specialty-toolbar.tsx`                     | requiere validación   | no          | no       |
| [ ] FDM-C112 | `apps/web/src/features/tenant-settings/components/tenant-settings-form.tsx`              | requiere validación   | no          | no       |
| [ ] FDM-C113 | `apps/web/src/features/tenant-settings/components/tenant-subscription-card.tsx`          | requiere validación   | no          | no       |
| [ ] FDM-C114 | `apps/web/src/shared/components/form/form-actions.tsx`                                   | requiere validación   | no          | no       |
| [ ] FDM-C115 | `apps/web/src/shared/components/form/form-error.tsx`                                     | requiere validación   | no          | no       |
| [ ] FDM-C116 | `apps/web/src/shared/components/ui/badge.tsx`                                            | requiere validación   | sí          | no       |
| [ ] FDM-C117 | `apps/web/src/shared/components/ui/button.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C118 | `apps/web/src/shared/components/ui/card.tsx`                                             | requiere validación   | sí          | no       |
| [ ] FDM-C119 | `apps/web/src/shared/components/ui/data-table.tsx`                                       | requiere validación   | no          | no       |
| [ ] FDM-C120 | `apps/web/src/shared/components/ui/debounced-search-input.tsx`                           | requiere validación   | no          | no       |
| [ ] FDM-C121 | `apps/web/src/shared/components/ui/filter-select.tsx`                                    | requiere validación   | no          | no       |
| [ ] FDM-C122 | `apps/web/src/shared/components/ui/input.tsx`                                            | requiere validación   | no          | no       |
| [ ] FDM-C123 | `apps/web/src/shared/components/ui/lookup-combobox.tsx`                                  | requiere validación   | sí          | no       |
| [ ] FDM-C124 | `apps/web/src/shared/components/ui/modal.tsx`                                            | requiere validación   | sí          | no       |
| [ ] FDM-C125 | `apps/web/src/shared/components/ui/select.tsx`                                           | requiere validación   | no          | no       |
| [ ] FDM-C126 | `apps/web/src/shared/components/ui/sidebar.tsx`                                          | requiere validación   | no          | no       |
| [ ] FDM-C127 | `apps/web/src/shared/components/ui/switch.tsx`                                           | requiere validación   | sí          | no       |
| [ ] FDM-C128 | `apps/web/src/shared/components/ui/topbar.tsx`                                           | requiere validación   | no          | no       |

## Gate de cierre de fase 1 — todos pendientes

- [ ] FDM-G001 — **pendiente:** todos los archivos/rutas inventariados alineados; evidencia estática vinculada a FDM-R/FDM-C, sin confundir archivos con cantidad de componentes.
- [ ] FDM-G002 — **pendiente:** tokens faltantes definidos con nombres y semántica; pares de contenido/superficie y estados documentados, no solo valores hex agregados.
- [ ] FDM-G003 — **excepción a confirmar:** PDFs, impresión HTML, logos, scrim, assets sin uso y Bull Board con política explícita y responsable de validación.
- [ ] FDM-G004 — **requiere validación:** UI existente alineada comprobada visualmente en rutas y estados aplicables; registrar navegador, recursos, procedimiento y resultados.
- [ ] FDM-G005 — **pendiente:** auditoría de cierre de fase 1 registrada con evidencia estática y visual separadas; ningún hallazgo sin resolver o excepción sin documentar.

**Fase 2 no puede empezar si queda abierto cualquiera de estos gates.** No hay cierre ni aprobación implícitos por persistir este documento.

## Fase 2 — Tema del design system / dark mode

Estado: **bloqueada por fase 1**. Requisitos de seguimiento; ninguna decisión de implementación tomada.

| Seguimiento  | Estado    | Área             | Fuente / evidencia                                                                                           | Contexto pendiente                                                        |
| ------------ | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [ ] FDM-H001 | pendiente | Contrato de tema | `apps/web/src/app/globals.css:3–40; apps/web/src/app/layout.tsx:13–15; apps/web/src/app/providers.tsx:11–18` | Paleta oscura, activación y preferencia ausentes; no se aprobó mecanismo. |

- [ ] FDM-T001 — **pendiente:** registrar cierre autorizado del gate fase 1 antes de comenzar.
- [ ] FDM-T002 — **pendiente:** resolver si el requisito es oscuro fijo o claro/oscuro/sistema; ámbito y persistencia de preferencia, sin asumir respuesta.
- [ ] FDM-T003 — **pendiente:** aprobar paleta y pares semánticos del tema oscuro del design system, incluidos estados, superficies y elevación.
- [ ] FDM-T004 — **pendiente:** documentar cómo se aplica el tema y se evita inconsistencia inicial/hidratación; herramienta aún no elegida.
- [ ] FDM-T005 — **pendiente:** aplicar el tema sobre los componentes alineados y las excepciones aprobadas, sin reintroducir paletas locales divergentes.
- [ ] FDM-T006 — **requiere validación:** comprobar estáticamente todas las referencias a tokens y aplicación del tema; no reemplaza validación visual.
- [ ] FDM-T007 — **requiere validación:** repetir matriz FDM-R/FDM-C para tema oscuro, todos los estados y recursos reales; registrar contraste, foco y regresión.
- [ ] FDM-T008 — **requiere validación:** comprobar por separado toasts, controles nativos, impresión HTML, PDFs, marca y UI externa según sus políticas.

## Evidencia futura por cierre

Para cualquier FDM-H/R/C/G/T cerrado: ID, fecha, archivo/cambio o excepción, aceptación **estática**, aceptación **visual**, procedimiento, resultado y limitaciones. Hasta que esa evidencia exista, **inspeccionado no significa actualizado ni validado**.

## Evidencia de apply — 2026-10-15 (sin cierre visual)

Las referencias de línea y «Contexto pendiente» de las tablas describen el diagnóstico original; esta sección y `apply-progress.md` registran la resolución posterior. **Actualizado no es validado**: las casillas de aceptación de H/R/C/G siguen abiertas por falta de QA real. Las rutas/TSX no editados reciben mejoras compartidas sin afirmación de render individual.

| IDs                      | Evidencia estática posterior                                                                                                                                                                             | Aceptación visual                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| H002/H003                | 33 tokens definidos en globals.css; 11 nuevos, 4 referencias ausentes resueltas. Suite verifica definiciones reales y contraste opaco de pares success/warning.                                          | Pendiente                                           |
| H004–H009                | error/not-found/loading/onboarding/mi-perfil/Badge usan tokens. Guard AST ya no reporta paletas locales en 128 TSX alcanzables, excepto 5 PDFs delimitados.                                              | Pendiente                                           |
| H010/H017/H022           | Scrim semántico, Card/modal con on-surface, dropdown con elevación compartida; controles nativos base emparejados.                                                                                       | Pendiente                                           |
| H011–H014/H016/H023/H030 | Inspección de tokens/estados; switch añade foco peer/disabled. Opacidades/bordes derivados se preservan sin evidencia de defecto visual.                                                                 | Pendiente, no afirmar contraste ni foco renderizado |
| H015                     | Hover de pago/laboratorio empareja primary-container/on-primary-container. No cambió cálculo ni flujo de pagos.                                                                                          | Pendiente                                           |
| H018–H021                | Auditoría reutiliza Input; contrato base nativo light/accent/focus/disabled. Sonner light explícito y adapter normal/success/warning/error/info/loading/action/cancel/close; API/CSS 2.x inspeccionadas. | Pendiente, incluidos controles del SO               |
| H024–H029/H032           | Políticas y límites explícitos en inventory.md §9; PDFs/marca/externos/sin uso preservados.                                                                                                              | Excepciones documentadas, falta confirmación de QA  |
| H025                     | Historia clínica tiene ámbito documental print; superficie/textos remapeados a papel/tinta independientes de pantalla.                                                                                   | Impresión real y PDF separado pendientes            |
| H031 y FDM-R/C           | Grafo AST: 41 páginas/128 TSX; 3 páginas y 15 TSX editados. Guards no ejecutan React/Tailwind ni prueban ramas, roles o recursos remotos.                                                                | 0 rutas y 0 TSX validados visualmente               |

**Automatizado:** 29/29 tests (13 de contrato/analizador + 16 existentes), typecheck aprobado, lint/formato dirigido aprobado. Lint global: 6 errores/3 warnings previos; evidencia de HEAD original para el archivo tocado en apply-progress.md. Ningún build.

G001/G002/G003 tienen evidencia estática de implementación/política, pero NO se cierran hasta revisión independiente y aceptación visual donde aplica. G004/G005 y fase 2 siguen bloqueados. No se implementó dark mode ni selector/persistencia.

## Fase 2 — claro/oscuro

- [x] P2-T01 Store/bootstrap con preferencia explícita, fallback claro y tolerancia storage; 8 pruebas de lógica/mock.
- [x] P2-T02 Paleta runtime31roles, 3elevaciones y13pares opacos; 2contratos CSS/paleta.
- [x] P2-T03 Switch tenant/plataforma y Toaster suscriptores aislados; no contexto global, fetch ni invalidación.
- [x] P2-T04 Regresiones39/39, typecheck/lint dirigido; deuda global6errores3warnings conservada.
- [ ] P2-V01 Switch autenticado teclado/foco y cambio visual; persistencia/reload/hydration sin flash.
- [ ] P2-V02 Estados/rutas/contraste efectivo, Sonner/nativos/logos y documentos en oscuro.
- [ ] P2-V03 Aceptación visual fase2 explícita. No conteos profiler ni QA general certificados por contratos fuente.
