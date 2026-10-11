# Propuesta: administración de plataforma

## Por qué

Dos centros utilizan el sistema en producción y necesitan gestión central de altas, estado operativo, suscripciones y pagos SaaS. Los usuarios y roles actuales requieren `tenantId`: el administrador de un centro no representa al operador de la plataforma.

## Alcance

- Identidad `PlatformAdmin`, autenticación y sesión independientes, sin tenant ficticio ni `tenantId` opcional en `User`.
- Panel en `https://admin.goratechlabs.com/platform/login` y `http://localhost:3000/platform/login`, con layout separado.
- Listar, crear, editar y activar/desactivar centros; aprovisionar administrador inicial sin datos demo.
- Gestionar contrato, períodos, facturas y registro manual de pagos de suscripción SaaS.
- Auditoría con actor de plataforma; protección contra CSRF, abuso y cruces de sesión.
- Dashboard exclusivamente operativo/comercial, sin pacientes, consultas ni finanzas clínicas.

## Fuera de alcance

Impersonación, acceso clínico, registro público de administradores globales, pasarela de cobro, facturación fiscal, borrado de centros, renovación/cobro automático y microservicios. No se agrega suspensión automática por deuda.

## Compatibilidad y dependencias

MUST preservar login/logout/me, ACL, acceso por subdominio y enlaces locales de los centros. Suspender explícitamente un centro es una operación intencional, no una regresión del login.

El árbol local contiene trabajo no confirmado de suscripciones (`TenantSubscription`, períodos, facturas y pagos); es dependencia a revisar e integrar, NO evidencia de despliegue. No se sustituye ni revierte ese trabajo.

## Impacto

## Capacidades

### Nuevas

- `platform-auth`: identidad, sesión y acceso global independientes.
- `platform-tenants`: gestión y aprovisionamiento de centros.
- `platform-subscriptions`: administración comercial y pagos SaaS.
- `platform-audit`: registro de operaciones con actor global.

### Modificadas

Ninguna capacidad existente cambia sus requisitos; se preservan los flujos tenant.

## Áreas afectadas

Backend: Prisma, autenticación global, nuevos módulos platform, aprovisionamiento y auditoría. Frontend: middleware, rutas platform, servicios/hooks y formularios. Operación: DNS/TLS, CORS/cookies, configuración y bootstrap Docker. No cambiar contratos clínicos ni consultas tenant-scoped.

## Entrega y rollback

Se prevén más de 400 líneas. Se recomiendan PRs encadenadas por unidades verticales de menos de 400 líneas, con pruebas y documentación juntas. La estrategia sigue pendiente: MUST resolver `ask-on-risk` antes de apply, sin inferir autorización de excepción.

Migraciones aditivas; despliegue compatible con versión anterior y activación del panel posterior a pruebas. Rollback deshabilita rutas/host platform y revierte aplicación, conservando tablas, datos y auditoría; no elimina migraciones aplicadas ni reinicia centros existentes.

## Estado

Planificación borrador. No autoriza implementar, ejecutar builds, hacer commits ni desplegar.
