import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  module: string;
  action: string;
}

/**
 * Requires the authenticated user's role to have
 * `permissions[module][action] === true`.
 */
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, { module, action } satisfies PermissionRequirement);
