# Delta — identidad y acceso de plataforma

## ADDED Requirements

### Requirement: Identidad y validación independientes

El sistema MUST autenticar `PlatformAdmin` sin tenant, con JWT de clave, issuer, audience y propósito propios. MUST rechazar tokens cruzados y validar sesión revocable/admin activo. MUST conservar `User.tenantId` obligatorio.

#### Scenario: Acceso global sin tenant

- GIVEN un PlatformAdmin activo y credenciales válidas
- WHEN inicia sesión en `/platform/login`
- THEN obtiene sesión global sin tenantSlug/access/contextToken, con expiración de 8h.

#### Scenario: Rechazo cruzado

- GIVEN una sesión tenant válida o una sesión platform válida
- WHEN intenta acceder a endpoints protegidos del otro realm usando solo esa sesión
- THEN recibe 401/403 y no obtiene datos del otro realm.

#### Scenario: Revocación

- GIVEN sesión global vigente
- WHEN se cierra sesión, desactiva admin o cambia su contraseña
- THEN la sesión afectada queda revocada y su token posterior recibe 401.

### Requirement: Guards y protección activa

El dispatcher global MUST preservar realm tenant por defecto y exigir guard platform en gestión. MUST NOT usar @Public/@InternalRequest para management. Login MUST tener rate limit; mutaciones MUST exigir CSRF y origen permitido.

#### Scenario: Gestión anónima o CSRF

- GIVEN ausencia de sesión o request mutante desde origen ajeno/sin token CSRF
- WHEN se solicita crear/desactivar un centro
- THEN la operación se rechaza y no modifica datos.

#### Scenario: Abuso de login

- GIVEN intentos que superan el límite configurado por cuenta/IP
- WHEN se repite login global
- THEN devuelve 429 sin revelar existencia de cuenta.

### Requirement: Rutas y cookies independientes

Producción MUST reservar admin.goratechlabs.com y desarrollo MUST aceptar localhost:3000/platform/login. Cookie platform MUST ser distinta de access_token y logout MUST afectar solo su realm. Bootstrap MUST ejecutarse por Docker/Make sin signup público.

#### Scenario: Sesiones coexistentes localmente

- GIVEN sesiones tenant y platform en localhost
- WHEN inicia/cierra una de ellas
- THEN la otra cookie y su flujo /me permanecen válidos.

#### Scenario: Regresión tenant

- GIVEN dos centros activos con sus subdominios y enlaces locales
- WHEN realizan login, me, logout y acciones con ACL
- THEN conservan contratos, routing, permisos y aislamiento existentes.

#### Scenario: Reserva con conflicto

- GIVEN un centro existente con webSlug admin
- WHEN se ejecuta preflight del despliegue
- THEN se detiene sin renombrar el centro y requiere resolución operativa explícita.

#### Scenario: Host incorrecto

- GIVEN un subdominio de centro o el host admin en producción
- WHEN se solicita respectivamente panel platform o rutas clínicas
- THEN el routing rechaza/redirige sin exponer esa interfaz y la API conserva su autenticación.
