# Auditoría estática de tokens y dark mode — frontend

Fecha: 2026-10-15. Repositorio: raíz del proyecto

## Dictamen

Hay una base de design system propio (tokens semánticos y componentes compartidos), NO un dark mode implementado. Cambiar solo el layout o los colores de fondo NO garantiza alineación de todos los componentes: existen colores literales, tokens usados sin definición y superficies/controles de terceros o navegador fuera del contrato actual.

## Cobertura y límites

- Inventario completo de `apps/web/src`: 235 archivos; 230 fuentes .ts/.tsx/.css, 130 archivos TSX y 1 CSS. Los otros 5 archivos son cuatro tests .mjs y favicon.ico.
- 41 archivos page.tsx y 6 puntos de entrada especiales (layouts, error, loading, not-found): 47 raíces App Router.
- Grafo estático de imports locales desde esas raíces: 224 fuentes alcanzables, 128 TSX alcanzables. Solo 2 TSX sin referencias desde las raíces: Sidebar.tsx y Topbar.tsx antiguos fuera de ui/.
- Se inspeccionaron imports estáticos y dinámicos literales locales; no quedaron imports locales sin resolver. “Alcanzable” indica dependencia de una ruta, no que todos los permisos/ramas hayan sido renderizados.
- Búsqueda global de clases de color, variantes hover/focus/disabled/checked, literales hex/rgb/hsl, inline styles, SVG, imágenes, impresión, toasts, portales, charts y controles nativos.
- NO se abrió navegador, NO se verificaron contrastes ni capturas, NO se ejecutaron builds, tests ni herramientas Node/TypeScript. Ningún archivo del repositorio fue modificado.
- No se auditó implementación interna en node_modules ni el contenido remoto de logos, PDFs generados por backend o Bull Board externo.

## 1. Contrato de tokens actual

Fuente única encontrada: apps/web/src/app/globals.css:3–40.

- 22 tokens de color: primary/on-primary/primary-container/on-primary-container (5–8), secondary y equivalentes (11–14), surface/on-surface/surface-variant/on-surface-variant (17–20), outline/outline-variant (23–24), error y equivalentes (27–30), background/on-background (33–34).
- 3 tokens de elevación (37–39), con negro y opacidades fijadas. Los literales aquí SON la definición legítima de la paleta; no son fugas de color por sí mismos.
- Solo paleta clara. No selectores .dark/data-theme, prefers-color-scheme, color-scheme ni configuración de theme encontrada.
- apps/web/src/app/layout.tsx:13–15 aplica fondo/texto raíz sin tema.
- apps/web/src/app/providers.tsx:11–18 no contiene provider ni selección de tema.

### Tokens consumidos pero inexistentes en el contrato

- apps/web/src/features/medical-records/components/medical-records-create-panel.tsx:46 — bg-surface-container.
- apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx:97 — bg-surface-container-high.
- apps/web/src/features/medical-records/components/patient-medical-records-panel.tsx:121 — bg-surface-container-high.
- apps/web/src/features/doctors/components/doctor-form.tsx:254, 262, 273 — text-success, text-warning.
- apps/web/src/features/lab-orders/components/lab-payment-form.tsx:310 — text-success.
- apps/web/src/features/payments/components/consultation-payment-form.tsx:510 — text-success.

No hay definiciones CSS locales de --color-success, --color-warning, --color-surface-container ni --color-surface-container-high; tampoco se encontró configuración alternativa que los agregue. No se confirmó el CSS compilado (no build).

## 2. Colores directos en UI alcanzable

Conteo léxico verificable: 35 apariciones de utilidades de paleta Tailwind en 23 líneas de 7 archivos alcanzables; incluye 1 aparición intencional de scrim negro. No representa 35 componentes defectuosos. Globalmente hay 50 apariciones / 31 líneas / 9 archivos incluyendo dos componentes antiguos no alcanzables.

### apps/web/src/app/error.tsx

- Línea 18: `text-gray-900`.
- Línea 19: `text-gray-600`.
- Línea 22: `bg-gray-900 text-white bg-gray-800`.

### apps/web/src/app/loading.tsx

- Línea 5: `border-gray-200 border-t-gray-600`.
- Línea 6: `text-gray-500`.

### apps/web/src/app/(dashboard)/mi-perfil/page.tsx

- Línea 47: `bg-green-100 text-green-800`.
- Línea 49: `bg-yellow-100 text-yellow-800`.
- Línea 52: `bg-red-100 text-red-800`.
- Línea 54: `bg-gray-100 text-gray-800`.
- Línea 127: `text-red-500`.
- Línea 135: `text-red-500`.
- Línea 218: `text-green-600`.
- Línea 221: `text-red-600`.

### apps/web/src/app/onboarding/page.tsx

- Línea 76: `text-green-600`.
- Línea 105: `text-red-500`.
- Línea 119: `text-red-500`.
- Línea 126: `bg-red-50 text-red-600`.

### apps/web/src/app/not-found.tsx

- Línea 6: `text-gray-900`.
- Línea 7: `text-gray-600`.
- Línea 10: `bg-gray-900 text-white bg-gray-800`.

### apps/web/src/shared/components/ui/badge.tsx

- Línea 11: `bg-green-100 text-green-800`.
- Línea 12: `bg-amber-100 text-amber-800`.

### apps/web/src/shared/components/ui/modal.tsx

- Línea 31: `bg-black/40`.

**Clasificación:** error/not-found/loading, onboarding y perfil tienen colores visuales fuera del contrato; Badge success/warning propaga colores de paleta a cualquier consumidor. El overlay negro de Modal es una excepción funcional razonable, pero hoy no tiene un token “scrim” explícito. No se trata de pintar todo negro: los colores de estado necesitan pares foreground/container coherentes.

## 3. Estados y consistencia semántica

- Button tokenizado: apps/web/src/shared/components/ui/button.tsx:6–14. Hover primary/secondary/error usa opacidad /90; disabled usa opacity-50. Son derivados de tokens, NO literales; contraste efectivo depende de la superficie subyacente y debe verificarse por tema.
- Input/Select/Lookup: apps/web/src/shared/components/ui/input.tsx:22–34; apps/web/src/shared/components/ui/select.tsx:18–27; apps/web/src/shared/components/ui/lookup-combobox.tsx:83–100,116. Focus y error usan tokens. Dropdown custom NO usa portal: absolute + bg-surface + shadow-lg (elevación por defecto Tailwind, no elevation-N).
- Switch: apps/web/src/shared/components/ui/switch.tsx:17–19. Track checked usa primary; thumb checked usa on-primary; estado normal usa surface-variant/on-surface-variant. Es uso deliberado de tokens de contenido como relleno del thumb, no una fuga de paleta. No hay contrato específico de disabled/focus aquí.
- Tabla compartida: apps/web/src/shared/components/ui/data-table.tsx:54–100,110–133. Cabecera, filas, carga/skeleton, vacío y paginación consumen tokens; disabled de paginación se delega a Button.
- Botones auxiliares de pago apps/web/src/features/lab-orders/components/lab-payment-form.tsx:280 y apps/web/src/features/payments/components/consultation-payment-form.tsx:481 combinan text-primary con hover:bg-primary-container en vez de pasar a on-primary-container. No se afirma contraste fallido actual; el contrato no asegura el par semántico al cambiar paletas.
- apps/web/src/features/platform-subscriptions/components/platform-billing-panel.tsx:57,188,384; apps/web/src/features/platform-audit/components/platform-audit-page.tsx:129; apps/web/src/features/platform-tenants/components/platform-tenants-list.tsx:95 usan border-outline/40. Son tokens, pero la opacidad añade un nivel visual no centralizado.
- Algunos textos heredan on-background dentro de bg-surface en vez de declarar on-surface: Card no establece color (apps/web/src/shared/components/ui/card.tsx:16); selects de plataforma y filtros de agenda también heredan. Los colores actuales coinciden (#0f172a), pero una futura paleta con on-background distinto de on-surface rompería ese supuesto.

## 4. Controles nativos y UI sin capa compartida

- apps/web/src/app/(dashboard)/admin/auditoria/page.tsx:32–45 — dos inputs sin className/tokens; dependen del navegador/reset/herencia, no de Input compartido.
- Checkboxes nativos sin accent-color/color-scheme propio: apps/web/src/features/consultations/components/schedule-consultation-form.tsx:335,339 y apps/web/src/features/doctor-payouts/components/doctor-payout-form.tsx:196–205.
- Fechas de reportes: apps/web/src/app/(dashboard)/reportes/page.tsx:382–417 usan tokens en input/select, pero icono/calendario/options nativos no tienen color-scheme dark declarado.
- Selects/textareas que heredan color en vez de on-surface explícito: agenda:230; platform-billing-panel:120,292,319; platform-contract-panel:131; platform-audit-page:68; platform-tenant-create-form:168; platform-tenants-list:52; platform-tenant-activation-modal:39. Las rutas absolutas constan en el inventario de componentes debajo.

## 5. Toasts, overlays, SVG y charts

- Sonner: apps/web/src/app/providers.tsx:17 monta Toaster richColors sin theme, classNames, style ni tokens. Adaptación a tema NO implementada en nuestro código; no se inspeccionaron defaults de versión instalada.
- apps/web/src/shared/hooks/use-notification.ts:7–9 llama toast.success/error/info. Hay usos directos de toast en features y hooks, todos dependen del Toaster global.
- Modal: apps/web/src/shared/components/ui/modal.tsx:30–47. Overlay fixed, scrim bg-black/40; panel/bg/title/hover tokenizados. No createPortal encontrado en código propio.
- SVG de spinner/botones/formularios usan currentColor/none, por tanto heredan el color de texto: button.tsx:47–58; lab-order-form.tsx:51–55; consultation-payment-form.tsx:228–232. Íconos Lucide consumen clases o herencia.
- No librerías ni componentes de gráficos/canvas encontrados en fuentes frontend (no hay una capa chart independiente para alinear).
- Cinco SVG de plantilla en public tienen colores fijos (#666, #fff, #000), pero no tienen referencias encontradas en src: apps/web/public/file.svg; apps/web/public/vercel.svg; apps/web/public/next.svg; apps/web/public/globe.svg; apps/web/public/window.svg. No contarlos como UI actualmente renderizada.

## 6. Excepciones documentales y de marca

- Cinco archivos PDF con @react-pdf/renderer tienen paletas independientes, explícitas de documento impreso. No consumen CSS/Tailwind del navegador y NO deben oscurecerse automáticamente por el tema de la app.
- apps/web/src/features/doctor-payouts/components/doctor-payout-pdf.tsx:12, 15, 17, 20, 25, 32, 36 — colores fijos de encabezados, líneas, tablas y texto del documento.
- apps/web/src/features/medical-records/components/medical-record-pdf.tsx:13, 16, 17, 22, 25, 34, 38, 39, 40 — colores fijos de encabezados, líneas, tablas y texto del documento.
- apps/web/src/features/consultations/components/consultation-detail-pdf.tsx:8, 14, 19, 22, 28, 33, 36 — colores fijos de encabezados, líneas, tablas y texto del documento.
- apps/web/src/features/reports/components/report-pdf.tsx:10, 13, 14, 18, 21, 27, 34, 37 — colores fijos de encabezados, líneas, tablas y texto del documento.
- apps/web/src/features/payments/components/doctor-receipt-pdf.tsx:12, 15, 16, 21, 24, 28, 29, 33, 37, 38, 40, 41, 42 — colores fijos de encabezados, líneas, tablas y texto del documento.
- Recibo en pantalla apps/web/src/features/payments/components/doctor-receipt-view.tsx:23–34,98–114 consume tokens: NO confundirlo con doctor-receipt-pdf.
- Impresión HTML es otro caso: apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx:46,64,69,81,93,134–135 usa window.print y variantes print para visibilidad/bordes/sombra, pero no una paleta de impresión. Cambiar tokens globales a oscuro podría afectar esa impresión HTML (depende de opciones del navegador), aun cuando el PDF generado siga claro.
- Logos dinámicos: login/login-form.tsx:66; ui/sidebar.tsx:56; tenant-settings-form.tsx:209. Imagen tenant remota: identidad visual no se recolorea automáticamente. Legibilidad sobre superficie oscura debe comprobarse con logos reales; no se verificaron assets remotos.
- admin/queues/page.tsx:19 abre /queues/bull-board/ en pestaña externa: no hereda tokens del frontend. Contrato visual externo fuera del alcance de este inventario.

## 7. Alcance de todas las rutas

Cada page.tsx se incluye aunque sea redirección o contenido condicionado por permisos. Se auditó el grafo de dependencias, no sesiones autenticadas en cada ruta.

- `/login` → apps/web/src/app/(auth)/login/page.tsx:1.
- `/admin/auditoria` → apps/web/src/app/(dashboard)/admin/auditoria/page.tsx:1.
- `/admin/configuracion-centro` → apps/web/src/app/(dashboard)/admin/configuracion-centro/page.tsx:1.
- `/admin/doctores/[id]/editar` → apps/web/src/app/(dashboard)/admin/doctores/[id]/editar/page.tsx:1.
- `/admin/doctores/[id]` → apps/web/src/app/(dashboard)/admin/doctores/[id]/page.tsx:1.
- `/admin/doctores/nuevo` → apps/web/src/app/(dashboard)/admin/doctores/nuevo/page.tsx:1.
- `/admin/doctores` → apps/web/src/app/(dashboard)/admin/doctores/page.tsx:1.
- `/admin/especialidades` → apps/web/src/app/(dashboard)/admin/especialidades/page.tsx:1.
- `/admin/laboratorios` → apps/web/src/app/(dashboard)/admin/laboratorios/page.tsx:1.
- `/admin/queues` → apps/web/src/app/(dashboard)/admin/queues/page.tsx:1.
- `/admin/roles` → apps/web/src/app/(dashboard)/admin/roles/page.tsx:1.
- `/admin/usuarios/[id]/editar` → apps/web/src/app/(dashboard)/admin/usuarios/[id]/editar/page.tsx:1.
- `/admin/usuarios/nuevo` → apps/web/src/app/(dashboard)/admin/usuarios/nuevo/page.tsx:1.
- `/admin/usuarios` → apps/web/src/app/(dashboard)/admin/usuarios/page.tsx:1.
- `/agenda` → apps/web/src/app/(dashboard)/agenda/page.tsx:1.
- `/catalogo` → apps/web/src/app/(dashboard)/catalogo/page.tsx:1.
- `/consultas/[id]` → apps/web/src/app/(dashboard)/consultas/[id]/page.tsx:1.
- `/consultas` → apps/web/src/app/(dashboard)/consultas/page.tsx:1.
- `/egresos` → apps/web/src/app/(dashboard)/egresos/page.tsx:1.
- `/especialidades` → apps/web/src/app/(dashboard)/especialidades/page.tsx:1.
- `/inicio` → apps/web/src/app/(dashboard)/inicio/page.tsx:1.
- `/laboratorio/ordenes` → apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx:1.
- `/liquidaciones-doctores/[id]` → apps/web/src/app/(dashboard)/liquidaciones-doctores/[id]/page.tsx:1.
- `/liquidaciones-doctores/nueva` → apps/web/src/app/(dashboard)/liquidaciones-doctores/nueva/page.tsx:1.
- `/liquidaciones-doctores` → apps/web/src/app/(dashboard)/liquidaciones-doctores/page.tsx:1.
- `/medical-records/[id]` → apps/web/src/app/(dashboard)/medical-records/[id]/page.tsx:1.
- `/mi-perfil` → apps/web/src/app/(dashboard)/mi-perfil/page.tsx:1.
- `/pacientes/[id]` → apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx:1.
- `/pacientes` → apps/web/src/app/(dashboard)/pacientes/page.tsx:1.
- `/pagos` → apps/web/src/app/(dashboard)/pagos/page.tsx:1.
- `/reportes` → apps/web/src/app/(dashboard)/reportes/page.tsx:1.
- `/onboarding` → apps/web/src/app/onboarding/page.tsx:1.
- `/` → apps/web/src/app/page.tsx:1.
- `/platform/auditoria` → apps/web/src/app/platform/(panel)/auditoria/page.tsx:1.
- `/platform` → apps/web/src/app/platform/(panel)/page.tsx:1.
- `/platform/tenants/[id]` → apps/web/src/app/platform/(panel)/tenants/[id]/page.tsx:1.
- `/platform/tenants/[id]/suscripcion` → apps/web/src/app/platform/(panel)/tenants/[id]/suscripcion/page.tsx:1.
- `/platform/tenants/nuevo` → apps/web/src/app/platform/(panel)/tenants/nuevo/page.tsx:1.
- `/platform/tenants` → apps/web/src/app/platform/(panel)/tenants/page.tsx:1.
- `/platform/login` → apps/web/src/app/platform/login/page.tsx:1.
- `/tenant-not-found` → apps/web/src/app/tenant-not-found/page.tsx:1.

### Entradas especiales/layouts

- apps/web/src/app/(dashboard)/layout.tsx:1.
- apps/web/src/app/error.tsx:1.
- apps/web/src/app/layout.tsx:1.
- apps/web/src/app/loading.tsx:1.
- apps/web/src/app/not-found.tsx:1.
- apps/web/src/app/platform/(panel)/layout.tsx:1.

## 8. Inventario exhaustivo TSX alcanzable

Leyenda: **paleta directa** = utilidad literal; **token no definido** = dependencia CSS ausente; **PDF** = documento separado; **Toaster externo** = requiere integración; **sin literal detectado** NO significa validación visual. Todos heredan problemas de componentes compartidos que importan. Se muestran dependencias TSX inmediatas para reconocer esa propagación.

- apps/web/src/app/(auth)/login/login-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/app/(auth)/login/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: login-form.tsx.
- apps/web/src/app/(dashboard)/admin/auditoria/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: audit-log-table.tsx.
- apps/web/src/app/(dashboard)/admin/configuracion-centro/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: tenant-settings-form.tsx.
- apps/web/src/app/(dashboard)/admin/doctores/[id]/editar/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-edit-page.tsx.
- apps/web/src/app/(dashboard)/admin/doctores/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-detail-page.tsx.
- apps/web/src/app/(dashboard)/admin/doctores/nuevo/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-create-page.tsx.
- apps/web/src/app/(dashboard)/admin/doctores/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-columns.tsx, doctor-toolbar.tsx, button.tsx, card.tsx, data-table.tsx.
- apps/web/src/app/(dashboard)/admin/especialidades/page.tsx:1 — sin literal de paleta detectado.
- apps/web/src/app/(dashboard)/admin/laboratorios/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: lab-test-columns.tsx, lab-test-toolbar.tsx, button.tsx, card.tsx, data-table.tsx, input.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/admin/queues/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, badge.tsx, card.tsx.
- apps/web/src/app/(dashboard)/admin/roles/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, card.tsx.
- apps/web/src/app/(dashboard)/admin/usuarios/[id]/editar/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: page.tsx.
- apps/web/src/app/(dashboard)/admin/usuarios/nuevo/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: page.tsx.
- apps/web/src/app/(dashboard)/admin/usuarios/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx, card.tsx, input.tsx, modal.tsx, select.tsx.
- apps/web/src/app/(dashboard)/agenda/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: schedule-consultation-form.tsx, consultation-payment-form.tsx, button.tsx, card.tsx, data-table.tsx, input.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/catalogo/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: card.tsx.
- apps/web/src/app/(dashboard)/consultas/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: consultation-detail-panel.tsx.
- apps/web/src/app/(dashboard)/consultas/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: paid-consultation-columns.tsx, medical-records-create-panel.tsx, card.tsx, data-table.tsx, debounced-search-input.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/egresos/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: expense-form.tsx, expense-columns.tsx, expense-toolbar.tsx, button.tsx, card.tsx, data-table.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/especialidades/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: specialty-columns.tsx, specialty-form.tsx, specialty-toolbar.tsx, button.tsx, card.tsx, data-table.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/inicio/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, card.tsx, button.tsx, modal.tsx, input.tsx, consultation-payment-form.tsx, laboratory-price-catalog.tsx.
- apps/web/src/app/(dashboard)/laboratorio/ordenes/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: card.tsx, button.tsx, modal.tsx, lab-payment-form.tsx, lab-order-form.tsx, data-table.tsx, lab-orders-toolbar.tsx, lab-orders-columns.tsx.
- apps/web/src/app/(dashboard)/layout.tsx:1 — sin literal de paleta detectado. Dependencias UI: auth-hydrator.tsx, report-export-sidebar.tsx, sidebar.tsx, topbar.tsx.
- apps/web/src/app/(dashboard)/liquidaciones-doctores/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-payout-detail-panel.tsx.
- apps/web/src/app/(dashboard)/liquidaciones-doctores/nueva/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-payout-form.tsx, card.tsx.
- apps/web/src/app/(dashboard)/liquidaciones-doctores/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx.
- apps/web/src/app/(dashboard)/medical-records/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: medical-record-detail-panel.tsx.
- apps/web/src/app/(dashboard)/mi-perfil/page.tsx:1 — paleta directa en líneas 47, 49, 52, 54, 127, 135, 218, 221. Dependencias UI: card.tsx, button.tsx, input.tsx, badge.tsx.
- apps/web/src/app/(dashboard)/pacientes/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: patient-medical-records-panel.tsx.
- apps/web/src/app/(dashboard)/pacientes/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: patient-form.tsx, patient-columns.tsx, patient-toolbar.tsx, button.tsx, card.tsx, data-table.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/pagos/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-receipt-pdf.tsx, doctor-receipt-modal.tsx, payment-columns.tsx, payment-toolbar.tsx, payment-form.tsx, medical-records-create-panel.tsx, button.tsx, card.tsx, data-table.tsx, input.tsx, modal.tsx.
- apps/web/src/app/(dashboard)/reportes/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: report-pdf.tsx, report-excel.tsx, button.tsx, card.tsx, data-table.tsx, input.tsx.
- apps/web/src/app/error.tsx:1 — paleta directa en líneas 18, 19, 22.
- apps/web/src/app/layout.tsx:1 — sin literal de paleta detectado. Dependencias UI: providers.tsx.
- apps/web/src/app/loading.tsx:1 — paleta directa en líneas 5, 6.
- apps/web/src/app/not-found.tsx:1 — paleta directa en líneas 6, 7, 10.
- apps/web/src/app/onboarding/page.tsx:1 — paleta directa en líneas 76, 105, 119, 126. Dependencias UI: button.tsx, input.tsx, card.tsx.
- apps/web/src/app/page.tsx:1 — sin literal de paleta detectado.
- apps/web/src/app/platform/(panel)/auditoria/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-audit-page.tsx.
- apps/web/src/app/platform/(panel)/layout.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-shell.tsx.
- apps/web/src/app/platform/(panel)/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-dashboard-page.tsx.
- apps/web/src/app/platform/(panel)/tenants/[id]/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-tenant-detail.tsx.
- apps/web/src/app/platform/(panel)/tenants/[id]/suscripcion/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-subscription-page.tsx.
- apps/web/src/app/platform/(panel)/tenants/nuevo/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-tenant-create-form.tsx.
- apps/web/src/app/platform/(panel)/tenants/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-tenants-list.tsx.
- apps/web/src/app/platform/login/page.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-login-form.tsx.
- apps/web/src/app/providers.tsx:1 — Toaster externo sin tema. Dependencias UI: platform-session-recovery.tsx.
- apps/web/src/app/tenant-not-found/page.tsx:1 — sin literal de paleta detectado.
- apps/web/src/features/audit-logs/components/audit-log-table.tsx:1 — sin literal de paleta detectado.
- apps/web/src/features/auth/components/auth-hydrator.tsx:1 — sin literal de paleta detectado.
- apps/web/src/features/consultations/components/consultation-detail-panel.tsx:1 — sin literal de paleta detectado. Dependencias UI: medical-record-detail-panel.tsx, medical-record-pdf.tsx, button.tsx, card.tsx, consultation-detail-pdf.tsx.
- apps/web/src/features/consultations/components/consultation-detail-pdf.tsx:1 — PDF, paleta documental separada.
- apps/web/src/features/consultations/components/schedule-consultation-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx, input.tsx, lookup-combobox.tsx.
- apps/web/src/features/doctor-payouts/components/doctor-payout-detail-panel.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx, doctor-payout-pdf.tsx.
- apps/web/src/features/doctor-payouts/components/doctor-payout-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx, lookup-combobox.tsx, select.tsx, doctor-payout-pdf.tsx.
- apps/web/src/features/doctor-payouts/components/doctor-payout-pdf.tsx:1 — PDF, paleta documental separada.
- apps/web/src/features/doctors/components/doctor-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx, verification-badge.tsx.
- apps/web/src/features/doctors/components/doctor-create-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-form.tsx, button.tsx, card.tsx.
- apps/web/src/features/doctors/components/doctor-detail-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx.
- apps/web/src/features/doctors/components/doctor-edit-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: doctor-form.tsx, button.tsx, card.tsx.
- apps/web/src/features/doctors/components/doctor-form.tsx:1 — token no definido en 254, 262, 273. Dependencias UI: button.tsx, input.tsx, select.tsx.
- apps/web/src/features/doctors/components/doctor-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx.
- apps/web/src/features/doctors/components/verification-badge.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx.
- apps/web/src/features/expenses/components/expense-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/expenses/components/expense-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx, select.tsx.
- apps/web/src/features/expenses/components/expense-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx.
- apps/web/src/features/lab-orders/components/lab-order-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx, select.tsx.
- apps/web/src/features/lab-orders/components/lab-orders-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/lab-orders/components/lab-orders-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx, filter-select.tsx.
- apps/web/src/features/lab-orders/components/lab-payment-form.tsx:1 — token no definido en 310. Dependencias UI: button.tsx, input.tsx, select.tsx.
- apps/web/src/features/labs/components/lab-test-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/labs/components/lab-test-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx.
- apps/web/src/features/labs/components/laboratory-price-catalog.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/features/medical-records/components/medical-record-detail-panel.tsx:1 — token no definido en 97. Dependencias UI: card.tsx, button.tsx, medical-record-pdf.tsx.
- apps/web/src/features/medical-records/components/medical-record-dynamic-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx, input.tsx.
- apps/web/src/features/medical-records/components/medical-record-pdf.tsx:1 — PDF, paleta documental separada.
- apps/web/src/features/medical-records/components/medical-records-create-panel.tsx:1 — token no definido en 46. Dependencias UI: badge.tsx, card.tsx, select.tsx, medical-record-dynamic-form.tsx.
- apps/web/src/features/medical-records/components/paid-consultation-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/medical-records/components/patient-medical-records-panel.tsx:1 — token no definido en 121. Dependencias UI: card.tsx, medical-records-create-panel.tsx.
- apps/web/src/features/patients/components/patient-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/patients/components/patient-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx, select.tsx, patient-representative-section.tsx.
- apps/web/src/features/patients/components/patient-representative-section.tsx:1 — sin literal de paleta detectado. Dependencias UI: input.tsx.
- apps/web/src/features/patients/components/patient-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx.
- apps/web/src/features/payments/components/consultation-payment-form.tsx:1 — token no definido en 510. Dependencias UI: patient-form.tsx, button.tsx, card.tsx, input.tsx, lookup-combobox.tsx, modal.tsx, select.tsx.
- apps/web/src/features/payments/components/doctor-receipt-modal.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, modal.tsx, doctor-receipt-view.tsx, doctor-receipt-pdf.tsx.
- apps/web/src/features/payments/components/doctor-receipt-pdf.tsx:1 — PDF, paleta documental separada.
- apps/web/src/features/payments/components/doctor-receipt-view.tsx:1 — sin literal de paleta detectado. Dependencias UI: card.tsx.
- apps/web/src/features/payments/components/payment-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/payments/components/payment-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx, select.tsx.
- apps/web/src/features/payments/components/payment-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx, filter-select.tsx.
- apps/web/src/features/platform-audit/components/platform-audit-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/features/platform-auth/components/platform-login-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/features/platform-auth/components/platform-session-recovery.tsx:1 — sin literal de paleta detectado.
- apps/web/src/features/platform-auth/components/platform-shell.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, platform-pending-operations.tsx.
- apps/web/src/features/platform-dashboard/components/platform-dashboard-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/features/platform-shared/platform-pending-operations.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/features/platform-shared/uncertain-mutation-notice.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/features/platform-subscriptions/components/platform-billing-panel.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx, modal.tsx, uncertain-mutation-notice.tsx.
- apps/web/src/features/platform-subscriptions/components/platform-contract-panel.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/features/platform-subscriptions/components/platform-subscription-page.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, platform-billing-panel.tsx, platform-contract-panel.tsx.
- apps/web/src/features/platform-tenants/components/platform-tenant-activation-modal.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, modal.tsx.
- apps/web/src/features/platform-tenants/components/platform-tenant-create-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: uncertain-mutation-notice.tsx, button.tsx, input.tsx.
- apps/web/src/features/platform-tenants/components/platform-tenant-detail.tsx:1 — sin literal de paleta detectado. Dependencias UI: platform-tenant-activation-modal.tsx, button.tsx, input.tsx.
- apps/web/src/features/platform-tenants/components/platform-tenants-list.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, input.tsx.
- apps/web/src/features/reports/components/report-excel.tsx:1 — sin literal de paleta detectado.
- apps/web/src/features/reports/components/report-export-sidebar.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/features/reports/components/report-pdf.tsx:1 — PDF, paleta documental separada.
- apps/web/src/features/specialties/components/specialty-columns.tsx:1 — sin literal de paleta detectado. Dependencias UI: badge.tsx, button.tsx.
- apps/web/src/features/specialties/components/specialty-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: form-actions.tsx, form-error.tsx, input.tsx.
- apps/web/src/features/specialties/components/specialty-toolbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: debounced-search-input.tsx.
- apps/web/src/features/tenant-settings/components/tenant-settings-form.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx, card.tsx, input.tsx, switch.tsx, tenant-subscription-card.tsx.
- apps/web/src/features/tenant-settings/components/tenant-subscription-card.tsx:1 — sin literal de paleta detectado. Dependencias UI: card.tsx, button.tsx, badge.tsx.
- apps/web/src/shared/components/form/form-actions.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/shared/components/form/form-error.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/badge.tsx:1 — paleta directa en líneas 11, 12.
- apps/web/src/shared/components/ui/button.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/card.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/data-table.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.
- apps/web/src/shared/components/ui/debounced-search-input.tsx:1 — sin literal de paleta detectado. Dependencias UI: input.tsx.
- apps/web/src/shared/components/ui/filter-select.tsx:1 — sin literal de paleta detectado. Dependencias UI: select.tsx.
- apps/web/src/shared/components/ui/input.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/lookup-combobox.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/modal.tsx:1 — paleta directa en líneas 31.
- apps/web/src/shared/components/ui/select.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/sidebar.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/switch.tsx:1 — sin literal de paleta detectado.
- apps/web/src/shared/components/ui/topbar.tsx:1 — sin literal de paleta detectado. Dependencias UI: button.tsx.

## 9. TSX no alcanzables y límites del resultado

- apps/web/src/shared/components/Topbar.tsx:21, 23, 26, 32 — implementación antigua con paleta fija; sin imports encontrados desde raíces App Router. No modificar/eliminar por este diagnóstico.
- apps/web/src/shared/components/Sidebar.tsx:33, 35, 46, 47 — implementación antigua con paleta fija; sin imports encontrados desde raíces App Router. No modificar/eliminar por este diagnóstico.

**Conclusión de cobertura:** la base permite tematizar gran parte de la aplicación por tokens, pero el estado actual NO satisface “ningún componente desalineado”. Esta auditoría identifica superficies de código y dependencias; no certifica accesibilidad, contraste ni uniformidad visual de un tema que todavía no existe.

## 9. Reauditoría posterior a apply — 2026-10-15

Línea base anterior conservada; las líneas anteriores no se reinterpretan como posiciones actuales. El grafo AST automatizado `src/shared/design-system/source-color-contract.mjs` parte de todas las entradas App Router y sigue imports/exports/imports dinámicos locales: confirma **41 páginas, 128 TSX alcanzables**. Los 2 TSX antiguos siguen fuera del grafo. No hay nueva ruta ni nuevo TSX.

Se añadieron 3 archivos `.mjs` bajo `shared/design-system`: analizador y dos suites de contrato. No son componentes ni se suman al conteo TSX. Tokens de pantalla: **33** (22 de línea base + 11 nuevos); referencias ausentes conocidas: **0** tras definir success/warning y superficies contenedoras. El analizador ya no reporta paletas locales, colores arbitrarios soportados, pintura inline o referencias semánticas indefinidas en las fuentes alcanzables, con 5 PDFs explícitamente exceptuados. El guard detecta variantes, SVG y strings/plantillas; no ejecuta Tailwind ni cubre clases construidas por concatenación de fragmentos, CSS runtime externo o contenido remoto.

**Políticas de excepción acotadas:**

- H024: los cinco `*-pdf.tsx` listados en §6 conservan colores documentales; el guard exige import de `@react-pdf/renderer`. No convertirlos en tokens de pantalla. Pendiente inspeccionar PDF generado.
- H026: imágenes tenant en login/sidebar/settings conservan identidad y quedan sobre superficies tokenizadas; no se alteran assets ni URLs. Falta probar logos reales.
- H027: Bull Board abierto por admin/queues es otra aplicación backend, fuera de propiedad de este frontend. Integración visual futura se trataría en su origen, no mediante CSS local.
- H028: cinco SVG de plantilla sin referencias desde src; fuera del grafo actual. No borrados; reingreso futuro requiere auditoría.
- H029: Sidebar/Topbar antiguos sin imports alcanzables; preservados, no cubiertos como UI activa. El guard fallará si se vuelven alcanzables con sus paletas actuales.
- H032: no charts/canvas propios encontrados. Dependencias y contenido remoto fuera del AST no reciben garantía; Sonner sí tiene adapter explícito inspeccionado contra su API/CSS 2.x instalada.
- Elevaciones: sombras en autoridad global siguen siendo primitivas intencionales; scrim tiene token propio con opacidad del overlay. No se sustituyen por colores de superficie.

Responsabilidad de aceptación de excepciones: revisión del cambio y QA visual con recursos reales; ninguna excepción documental equivale a validación visual automática. Ver `apply-progress.md` para comandos, RED/GREEN y límites.

## Fase 2 — incorporación al inventario (2026-10-15)

Línea base anterior conservada. Grafo vigente: 41 páginas, **129 TSX alcanzables**. Archivo nuevo alcanzable `apps/web/src/shared/design-system/theme-controls.tsx` contiene switch y adaptador Toaster aislados. Lógica nueva `theme.ts`, tests `theme.test.mjs` (8) y `theme-palette.test.mjs` (2). Raíz/layout/providers/topbar/platform-shell y CSS actualizados; no nuevos consumidores de paletas directas. Conteo real CSS: **31 roles color por tema**, 3 elevaciones. Guardia AST actualizada al nuevo grafo; PDFs/excepciones anteriores intactos. Visibilidad/contraste/logos en modo oscuro requieren QA nuevo, sin heredar confirmación fase 1.
