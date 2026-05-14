import type { NavItem } from '@/shared/types/nav.types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', path: '/inicio', icon: 'House', permission: { resource: 'payments', action: 'read' } },
  { label: 'Recepción', path: '/recepcion', icon: 'ClipboardList', permission: { resource: 'payments', action: 'create' } },
  { label: 'Pacientes', path: '/pacientes', icon: 'Users', permission: { resource: 'patients', action: 'read' } },
  { label: 'Pagos', path: '/pagos', icon: 'CreditCard', permission: { resource: 'payments', action: 'read' } },
  { label: 'Egresos', path: '/egresos', icon: 'Receipt', permission: { resource: 'expenses', action: 'read' } },
  { label: 'Colas', path: '/admin/queues', icon: 'Boxes', permission: { resource: 'roles', action: 'read' } },
  { label: 'Doctores', path: '/admin/doctores', icon: 'Stethoscope', permission: { resource: 'doctors', action: 'read' } },
  { label: 'Reportes', path: '/reportes', icon: 'BarChart3', permission: { resource: 'reports', action: 'read' } },
];
