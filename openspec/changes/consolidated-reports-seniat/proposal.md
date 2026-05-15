# Proposal: Reportes Consolidados con Exportación PDF/Excel para SENIAT

## Intent

El centro médico necesita presentar evidencia de ingresos y egresos a SENIAT. El sistema actual tiene datos dispersos (pagos de consultas, laboratorios, egresos) pero no permite generar reportes consolidados por fecha ni exportarlos en formatos oficiales (PDF/Excel).

## Scope

### In Scope
- Reporte consolidado de ingresos (consultas + laboratorios) vs egresos, agrupado por día/semana/mes
- Vista detalle filtrable por tipo (consultas / laboratorios / egresos / todos)
- Exportación a PDF y Excel usando Strategy Pattern con procesamiento asíncrono vía BullMQ
- Arquitectura preparada para escalabilidad: worker genera archivos, frontend hace polling

### Out of Scope
- Facturación fiscal formal con RIF/numero de factura (SENIAT nivel avanzado)
- Envío automático de reportes por email
- Almacenamiento permanente de archivos generados (TTL 24h)
- Dashboards analíticos con gráficos

## Capabilities

### New Capabilities
- `reports-consolidated`: API de reportes consolidados con filtros de fecha y tipo
- `reports-export`: Generación asíncrona de PDF/Excel vía BullMQ worker
- `reports-download`: Descarga de archivos generados con TTL

### Modified Capabilities
- `stats-home`: Extender KPIs para incluir gastos semanales/mensuales en el dashboard

## Approach

**Backend:**
1. `ReportsModule` con `ReportsController` y `ReportsService`
2. `POST /reports/generate` → encola job en BullMQ con parámetros (from, to, type, format)
3. `GET /reports/jobs/:jobId` → estado del job (pending/processing/completed/failed)
4. `GET /reports/jobs/:jobId/download` → descarga archivo generado
5. Worker processor (`ReportsExportProcessor`) que implementa Strategy Pattern:
   - `PdfExportStrategy` → usa `@react-pdf/renderer`
   - `ExcelExportStrategy` → usa `xlsx`
   - `mapData()` flattener: transforma entidades DB → JSON plano para templates
6. Tabla `GeneratedReport` en PostgreSQL guarda blob del archivo + metadatos + TTL

**Frontend:**
1. Página `/reportes` con dos tabs: Consolidado y Detalle
2. Filtros: DatePicker (desde/hasta), Select (tipo), Select (agrupación)
3. Tabla de resultados con DataTable
4. Botones "Exportar PDF" / "Exportar Excel" → llama `POST /reports/generate` → muestra spinner → poll cada 2s → descarga automática cuando `status === 'completed'`
5. **Sidebar derecho persistente** "Descargas":
   - Lista jobs activos/completados de los últimos 30 minutos
   - Estado con ícono: 🔄 Generando | ✅ Listo | ❌ Fallido
   - Botón descargar para completados, reintentar para fallidos
   - Se mantiene visible al navegar entre páginas (global layout)

**Pattern:** Strategy Pattern en worker para generación de archivos. Flattener desacopla formato de datos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/reports/` | New | Módulo completo: controller, service, DTOs, strategies |
| `apps/api/prisma/schema.prisma` | Modified | Agregar `GeneratedReport` model con blob + TTL |
| `apps/worker/src/worker/` | Modified | Nuevo `ReportsExportProcessor` |
| `apps/web/src/app/(dashboard)/reportes/` | Modified | Reescribir página con tabs, filtros, tabla, export |
| `apps/web/package.json` | Modified | Agregar `xlsx` (SheetJS) |
| `apps/web/src/features/reports/` | New | Hooks, servicios, componentes de UI |
| `apps/api/src/stats/` | Modified | Extender `StatsService` con gastos semanales |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Worker falla al generar archivo grande | Low | Strategy Pattern permite retry con BullMQ; límites de tamaño definidos |
| PostgreSQL se llena con blobs | Low | TTL 24h + cron job para limpiar registros antiguos |
| Usuario pierde conexión mientras genera | Med | Job continúa en worker; al reconectar, puede ver estado y descargar |
| Formato Excel no compatible con SENIAT | Med | Mockup validado con usuario; iteración rápida posible |

## Rollback Plan

1. Eliminar `ReportsModule` de `AppModule`
2. Revertir migración de `GeneratedReport` (`prisma migrate dev --create-only` rollback)
3. Frontend: revertir `reportes/page.tsx` a versión anterior

## Dependencies

- BullMQ + Redis: ya configurados en docker-compose y package.json
- `@react-pdf/renderer`: ya instalado en web
- `xlsx` (SheetJS): instalar en `apps/web`
- Worker container: ya existe en docker-compose

## Success Criteria

- [ ] Admin puede filtrar reportes por fecha (desde/hasta) y tipo
- [ ] Tabla consolidado muestra ingresos/egresos/neto por día/semana/mes
- [ ] Tabla detalle lista transacciones individuales filtrables
- [ ] Exportar PDF genera archivo descargable con datos correctos
- [ ] Exportar Excel genera `.xlsx` con formato tabular correcto
- [ ] Generación asíncrona funciona: frontend muestra progreso, descarga al completar
- [ ] Si el usuario cierra el navegador, al volver puede ver jobs pendientes/completados
- [ ] `reports:read` solo accesible por rol `admin`
- [ ] Typecheck + lint limpio en API y Web
