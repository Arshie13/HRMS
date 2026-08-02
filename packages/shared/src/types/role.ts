export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
  isSystem: boolean;
}

export interface PermissionCheck {
  module: string;
  action: string;
}
