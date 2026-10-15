# Propuesta — Fase 1: contrato de color consistente

## Objetivo

Preparar toda la UI inventariada para un tema futuro, sin implementar dark mode. El usuario autorizó continuar automáticamente **solo la fase 1** el 2026-10-15. La autorización automática no elimina el gate de tamaño ni equivale a aprobación visual.

## Alcance

- Definir semántica y pares claros para success/warning, superficies contenedoras y scrim; mantener el contrato existente.
- Reemplazar paletas locales por tokens en pantallas, Badge, estados, controles nativos y Sonner.
- Revisar pares texto/fondo, foco, hover, disabled, bordes, elevación e iconos en los 128 TSX alcanzables y las 41 páginas registradas.
- Aislar impresión HTML de colores de pantalla y documentar PDFs, logos, recursos no usados y Bull Board como excepciones explícitas.
- Añadir protección estática ejecutable y verificar render real por estado, sin confundir ambas evidencias.

No incluye selector, persistencia de tema, paleta oscura, nuevas dependencias de testing visual, cambios de backend ni limpieza de componentes antiguos no alcanzables.

## Estrategia

Extender el design system actual en `apps/web/src/app/globals.css` y componentes compartidos; cambios quirúrgicos en consumidores. Conservar IDs de `checklist.md`. Tests con `node:test` ya presente en frontend, ejecutados dentro de Docker, en ciclos RED → GREEN → REFACTOR. Ningún build.

## Entrega y rollback

Forecast preliminar: implementación y tests 450–750 líneas; documentación de planificación 200–320 líneas adicionales; evidencia visual variable. **Chained PRs recomendadas; decisión requerida antes de apply** con estrategia `ask-on-risk`. Proponer slices autónomos inferiores a 400 líneas: fundamentos, consumidores/integración y verificación. No abrir PRs ni crear commits sin pedido. Revertir una unidad completa con sus tests; sin migraciones ni cambios de datos.

## Éxito

Todos los hallazgos fase 1 resueltos o con excepción justificada, referencias de token válidas, pares coherentes, checks Docker aprobados y validación visual trazable. Hasta entonces la fase 2 permanece bloqueada.

## Decisión posterior de entrega — 2026-10-15

El usuario autorizó explícitamente una única entrega sin divisiones y modo automático: `delivery_strategy: exception-ok`, `size:exception`. Esto resuelve el gate de tamaño descrito arriba; no autoriza fase 2 ni elimina Strict TDD. Apply bloqueado por Docker inaccesible; evidencia en [apply-progress.md](apply-progress.md).

## Fase 2 autorizada — 2026-10-15

Usuario solicita switch claro/oscuro, sin modo sistema; ejecución automática y entrega única size:exception. Fase 1 aceptada según acceptance.md.

Implementar preferencia por navegador (localStorage exclusivo para tema, nunca credenciales), fallback claro ante ausencia/error/valor inválido; cambiar html[data-theme] antes del primer paint mediante script estático sin datos del usuario. No se encontró CSP en frontend/compose; futura CSP deberá autorizar ese script por hash/nonce. Usar @theme no-inline para conservar referencias runtime de utilidades; mismos 31 roles claros y oscuros, color-scheme y elevación. Switch accesible en shell tenant/plataforma; Sonner consume theme. Impresión/PDF conservan paleta documental y logos no se recolorean. Sin dependencias, backend, builds ni commits.

- [x] P2.1 Tests RED de preferencia/inicialización y paleta; implementar GREEN.
- [x] P2.2 Contexto cliente mínimo, switch y shell; sin duplicar estado servidor.
- [x] P2.3 Ejecutar suites, typecheck/lint dirigido y registrar límites visuales.
- [ ] P2.4 Aceptación visual del tema oscuro separada; no heredar aceptación fase 1.
