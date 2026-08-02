import { useAuthStore } from '../store/auth';

export type PermissionMatrix = Record<string, Record<string, boolean>>;

/** Check permission against the current user's role matrix. */
export function can(module: string, action: string): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  const matrix = (user.permissions ?? {}) as PermissionMatrix;
  return matrix?.[module]?.[action] === true;
}

/** Hook version — re-renders when user/permissions change. */
export function useCan() {
  const permissions = useAuthStore((s) => s.user?.permissions) as
    | PermissionMatrix
    | undefined;
  return (module: string, action: string) =>
    permissions?.[module]?.[action] === true;
}
