import { api } from './client';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  isSystem: boolean;
  _count?: { users: number };
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  roleId: string | null;
  role?: { id: string; name: string } | null;
  createdAt: string;
}

export const rbacApi = {
  listRoles: () => api.get<Role[]>('/roles').then((r) => r.data),

  createRole: (data: { name: string; description?: string; permissions: Role['permissions'] }) =>
    api.post<Role>('/roles', data).then((r) => r.data),

  updateRole: (id: string, data: { name?: string; description?: string; permissions?: Role['permissions'] }) =>
    api.put<Role>(`/roles/${id}`, data).then((r) => r.data),

  deleteRole: (id: string) => api.delete(`/roles/${id}`),

  getRolePermissions: (id: string) =>
    api.get<{ id: string; permissions: Role['permissions'] }>(`/roles/${id}/permissions`).then((r) => r.data),

  listUsers: () => api.get<UserRow[]>('/users').then((r) => r.data),

  createUser: (data: { email: string; name?: string; password: string; roleId?: string }) =>
    api.post<UserRow>('/users', data).then((r) => r.data),

  assignRole: (userId: string, roleId: string) =>
    api.put<UserRow>(`/users/${userId}/role`, { roleId }).then((r) => r.data),
};
