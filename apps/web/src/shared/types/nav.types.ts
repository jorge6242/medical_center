export interface NavPermission {
  resource: string;
  action: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission: NavPermission;
}
