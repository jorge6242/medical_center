# Tareas — implementación y verificación completas con advertencias; sin archivar

## Review Workload Forecast

Estimated changed lines: 1500–2200 overall (tests included; forecast, not measurement).
Decision needed before apply: No
Chained PRs recommended: Yes
400-line budget risk: High
Delivery strategy: auto-chain (unidades técnicas; sin commits/PRs automáticos).
Cada unidad incluye pruebas y hasta 60 líneas de evidencia/documentación; máximo 400 adiciones+eliminaciones. Medir diff por unidad antes de continuar; subdividir automáticamente si se supera, nunca consumir la reserva para ocultar exceso.

## 1. Infraestructura / contratos

- [x] 1.1 Respuesta PATCH completa con representantes, tests tenant/conservación y sin cambios en relaciones omitidas. Verificación independiente: 12/12 API; evidencia `evidence/unit-1.1.md` y `verify-report.md`.
- [x] 1.2 Servicio/hook detalle y filtro patientId de consultas con tests de serialización/aislamiento; DTO frontend de documento. Verificación independiente: 7/7 web; evidencia `evidence/unit-1.2.md` y `verify-report.md`.

## 2. Implementación guiada por tests

- [x] 2.1 Ficha de lectura, header/datos/representantes, carga/error/404/403 y omisión clínica; page fina. Independiente 10/10 PASS; evidencia `evidence/unit-2.1.md` y `verify-report.md`.
- [x] 2.2 Formulario compartido: precarga representante/documento, preservación de opcionales y alta. Independiente7/7 PASS; integrado en2.3 y regresión final; evidencia `evidence/unit-2.2.md`.
- [x] 2.3 Edición integrada con permisos/pending/retry/refetch/ID estable e historial montado. Independiente25/25 PASS; enum sexo real corregido; `evidence/unit-2.3.md` y `verify-report.md`.
- [x] 2.4 Historial paginado/estados/ACL/vacío/error/retry/link sin importes ni informes. Independiente6/6 PASS y montaje probado2.3; `evidence/unit-2.4.md`.
- [x] 2.5 Listado enlaza ficha en lectura sin modaledit; alta/desactivación/eliminación preservadas. Independiente6/6 y regresión final PASS; `evidence/unit-2.5.md`; sin navegador/E2E.

## 3. Verificación / cierre

- [x] 3.1 Spec revisada:223/223 web,12/12 patients API; ambos typecheck y lint focalizado PASS. Lint global API PASS; web falla por5 errores/3warnings en fuentes ajenas sin diff (más3warningscoverage generada). Ver informe final; sin builds.
- [x] 3.2 Evidencia y límites registrados en progress/verify;9/9 tareas completas, verificación con advertencias y sin archivar. Sin navegador/E2E, commits ni despliegues.

## Protocolo por unidad

1. Leer instrucciones locales y guides Next versionados relevantes antes de escribir frontend.
2. RED: prueba observable ausente/fallando por aserción; GREEN: mínimo cambio, no refactor ajeno.
3. Tests focalizados en Docker; registrar fallo previo y éxito posterior, conteos reales y pendientes.
4. Revisión diff por unidad (<400), typecheck/lint según afectación; no afirmar pruebas ejecutadas si no corrieron.
