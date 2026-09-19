import type { NavItem } from '@/shared/types/nav.types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', path: '/inicio', icon: 'House', permission: { resource: 'payments', action: 'read' } },
  { label: 'Crear consulta', path: '/recepcion', icon: 'ClipboardList', permission: { resource: 'payments', action: 'create' }, visibleForRoles: ['admin', 'recepcionista'] },
  { label: 'Consultas', path: '/consultas', icon: 'ClipboardList', permission: { resource: 'patients', action: 'read' } },
  { label: 'Pacientes', path: '/pacientes', icon: 'Users', permission: { resource: 'patients', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Pagos', path: '/pagos', icon: 'CreditCard', permission: { resource: 'payments', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Egresos', path: '/egresos', icon: 'Receipt', permission: { resource: 'expenses', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Catálogo', path: '/catalogo', icon: 'BookOpen', permission: { resource: 'payments', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Colas', path: '/admin/queues', icon: 'Boxes', permission: { resource: 'roles', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Doctores', path: '/admin/doctores', icon: 'Stethoscope', permission: { resource: 'doctors', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Laboratorios', path: '/admin/laboratorios', icon: 'FlaskConical', permission: { resource: 'laboratories', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Órdenes Lab', path: '/laboratorio/ordenes', icon: 'ClipboardList', permission: { resource: 'laboratories', action: 'read' }, visibleForRoles: ['admin', 'recepcionista'] },
  { label: 'Reportes', path: '/reportes', icon: 'BarChart3', permission: { resource: 'reports', action: 'read' }, visibleForRoles: ['admin'] },
  { label: 'Mi Perfil', path: '/mi-perfil', icon: 'User', permission: { resource: 'doctors', action: 'read' }, visibleForRoles: ['doctor'] },
];
