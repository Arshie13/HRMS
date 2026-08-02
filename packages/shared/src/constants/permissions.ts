export const MODULES = [
  'employees',
  'departments',
  'teams',
  'attendance',
  'leaves',
  'payroll',
  'roles',
  'users',
  'settings',
] as const;

export const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'export',
] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];

export type PermissionMatrix = Record<Module, Record<Action, boolean>>;
