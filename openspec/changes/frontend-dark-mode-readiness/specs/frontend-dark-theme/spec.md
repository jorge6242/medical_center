# Spec — tema claro/oscuro (fase 2)

## T01 — Preferencia explícita

MUST ofrecer switch accesible claro/oscuro, sin sistema. Sin preferencia o con valor inválido/storage bloqueado MUST iniciar claro. Cambiar MUST actualizar documento y Sonner inmediatamente y persistir por navegador cuando storage esté disponible. Recargar MUST restaurar oscuro antes del paint; fallo de escritura MUST NOT impedir cambio en memoria. No sincronizar usuarios/servidor.

## T02 — Tokens runtime

MUST definir TODOS los roles de color y elevación en ambos temas. Utilidades Tailwind MUST resolver variables runtime, no hex inline. Pares opacos de texto MUST alcanzar 4.5:1 en cálculo; esto NO certifica contraste efectivo con opacidades. Controles nativos MUST usar color-scheme del tema.

## T03 — Integración y excepciones

MUST ofrecer selector en shell tenant y plataforma con teclado/label/estado accesibles. Sonner MUST acompañar. Logos mantienen identidad; impresión HTML/PDF permanecen documentales claros. UI externa Bull Board queda fuera.

## T04 — Evidencia

MUST correr regresiones en Docker sin builds. Pruebas de lógica y contratos fuente MUST distinguirse de QA navegador. Fase 2 MUST permanecer pendiente de aceptación visual completa hasta evidencia/confirmación explícita.

## T05 — Selector distinguible y acción explícita (ajuste 2026-10-15)

MUST mostrar `Modo oscuro` en claro y `Modo claro` en oscuro, expresando el destino. MUST usar botón nativo de acción con apariencia track/thumb (no `role=switch`, `aria-checked` ni `aria-pressed` con nombre cambiante); nombre accesible incluye el texto visible. MUST permitir activación nativa mediante Enter/Espacio, foco visible, objetivo de al menos 44px de alto y respetar reduced motion. Track/thumb y foco MUST alcanzar 3:1 contra superficies adyacentes; texto MUST alcanzar 4.5:1 en ambos temas. MUST consumir tokens existentes sin cambiar el switch genérico ni propagar estado al layout.

Referencias: [WAI APG Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) exige nombre estable para un switch; [WAI APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) distingue un botón con etiqueta de acción cambiante de un toggle button con aria-pressed; [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) define contraste de indicadores.
