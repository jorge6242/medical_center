# Fase 3 — Multi-País, I18N y Extensiones Clínicas (Futuro SaaS)

> **Nota de Arquitectura:** Esta fase documenta el roadmap a largo plazo del sistema (SaaS multi-país y white-label). Se ha separado del `PLAN.md` principal para mantener el foco del equipo en la ejecución del MVP y evitar sobre-ingeniería prematura.

## Internacionalización
- [ ] `next-intl` frontend + `nestjs-i18n` backend
- [ ] Diccionarios `es-VE` (base) + idiomas adicionales según mercado

## Multi-país
- [ ] `ColombiaFiscalStrategy` — IVA 19%, retenciones CO
- [ ] `IdentityStrategy` por país (CC/NIT para CO)
- [ ] `CurrencyStrategy` por país
- [ ] Tenant `countryCode` activado en lógica fiscal

## White-Label Theming
- [ ] `features/tenant/services/tenant.service.ts` — `getTenantTheme()` (server-side, lee `Tenant.config.theme` desde DB)
- [ ] `app/layout.tsx` — inyección del tema del tenant activo como `<style>` en el `<head>`
- [ ] `/admin/configuracion` — panel para editar paleta, logo y tipografía del tenant

## Navegación Dinámica en DB (reemplaza `navigation.config.ts`)
- [ ] Entidad `MenuItem` + migración `CreateMenuItemTable`
- [ ] Tabla pivote `MenuItemRole` + migración `CreateMenuItemRoleTable`
- [ ] `MenuItemsModule` — CRUD admin para gestionar ítems del menú por tenant
- [ ] `GET /config/init` se extiende con campo `menu: NavItem[]` — árbol filtrado por `tenantId` + permisos del JWT (el menú viaja dentro del bootstrap, no en endpoint separado)
- [ ] Seeder `menu-items.seeder.ts` — pobla los ítems base (equivalente a `NAV_CONFIG` actual)
- [ ] Frontend: `useSidebarNav` migra de config estática a leer `menu` del cache de `useAppConfig()` — cero llamadas extra

### Entidad: MenuItem (menú dinámico por tenant — auto-referencia)

| Campo | Tipo | Notas |
|------|------|-------|
| id | UUID | PK |
| label | string | Texto visible (ej: "Pacientes", "Doctores") |
| icon | string | Nombre del ícono lucide-react (ej: `Users`, `CreditCard`) |
| path | string | Ruta frontend (ej: `/admin/doctores`) |
| order | int | Posición dentro de su nivel (0-indexed) |
| isActive | boolean | default true — permite desactivar sin borrar |
| parentId | FK → MenuItem? | nullable — `null` = ítem raíz, con valor = submenú |
| permissionId | FK → Permission? | nullable — `null` = visible para todos los autenticados |
| tenantId | FK → Tenant | Cada tenant tiene su propio árbol de menú |
| createdAt | datetime | |
| updatedAt | datetime | |

**Auto-referencia (`parentId`):** Patrón Adjacency List — un `MenuItem` con `parentId = null` es ítem raíz. Un `MenuItem` con `parentId = <otro MenuItem>` es submenú de ese padre. Soporta profundidad arbitraria (en la práctica: máximo 2-3 niveles).

**Relación con `Permission` (`permissionId`):** FK directa a la tabla `Permission`. El permiso define qué `resource` + `action` se requiere para ver el ítem. Si `permissionId` es `null`, el ítem es visible para todos los usuarios autenticados del tenant.

> **¿Por qué FK a `Permission` y no a `Role`?** Porque el sistema ACL ya funciona a nivel de permisos (`resource` + `action`), no de roles. Un rol es solo un agrupador de permisos. Vincular a `Permission` garantiza que si un admin crea un rol nuevo con ciertos permisos, el menú se filtra automáticamente — sin tocar la config del menú.

### Tabla pivote: MenuItemRole (visibilidad por defecto por rol)

| Campo | Tipo | Notas |
|------|------|-------|
| menuItemId | FK → MenuItem | PK compuesta |
| roleId | FK → Role | PK compuesta |

**Propósito:** Define qué roles ven un ítem **por defecto** al crear un nuevo tenant (seeder). No es seguridad — el filtrado real sigue siendo por `Permission` del JWT. Esta tabla es solo para el seeder y para el panel admin donde se configura la visibilidad del menú.

### Diagrama de relaciones MenuItem ↔ ACL

```
Tenant (1) ──── (N) MenuItem
                      │
                      ├── parentId → MenuItem (self-join, nullable)
                      │
                      ├── permissionId → Permission (nullable)
                      │       │
                      │       └── Permission
                      │             resource + action
                      │             role_id → Role
                      │
                      └── MenuItemRole (N:N)
                              menuItemId → MenuItem
                              roleId → Role

Flujo de filtrado (Fase 3):
  1. GET /config/init → AppConfigService delega a MenuItemsService → filtra por tenantId + isActive
  2. Service filtra recursivamente: solo ítems cuyo permissionId
     está en los permisos del JWT del usuario (mismo algoritmo que useSidebarNav)
  3. Si un padre queda sin hijos visibles → se oculta
  4. Frontend cachea con TanStack Query (staleTime: 5min)
```

### Ejemplo de datos (equivalente a NAV_CONFIG actual)

```
# Ítems raíz (parentId = null)
Recepción    → icon: CalendarPlus,  path: /recepcion,   permission: payments.create
Pacientes    → icon: Users,         path: /pacientes,   permission: patients.read
Pagos        → icon: CreditCard,    path: /pagos,       permission: payments.read
Egresos      → icon: TrendingDown,  path: /egresos,     permission: expenses.read
Reportes     → icon: BarChart3,     path: /reportes,    permission: reports.read
Administración → icon: Settings,    path: /admin,       permission: doctors.create

# Submenús de Administración (parentId = Administración.id)
Doctores       → icon: Stethoscope, path: /admin/doctores,       permission: doctors.read
Especialidades → icon: Building2,   path: /admin/especialidades, permission: specialties.read
Usuarios       → icon: UserCog,     path: /admin/usuarios,       permission: users.read
Roles y Permisos → icon: UserCog,   path: /admin/roles,          permission: roles.read
Tasas BCV      → icon: Repeat2,     path: /admin/tasas,          permission: exchange-rates.create
Configuración  → icon: Settings,    path: /admin/configuracion,  permission: system-config.update
Menú           → icon: Menu,        path: /admin/menu,           permission: menu-items.update  ← NUEVO
```

## Extensiones Clínicas
- [ ] Historial clínico del paciente
- [ ] Flujo enfermera → doctor (signos vitales, datos previos)
- [ ] Módulo laboratorio (por definir)
