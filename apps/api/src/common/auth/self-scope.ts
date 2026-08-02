import { Prisma } from '.prisma/client';
import { RequestUser } from './request-user';

/**
 * True when the user's role has `users:read` — i.e. an admin/HR-style role.
 * Used to decide whether list/detail queries can see tenant-wide data or must
 * be scoped to the user's own employee record (self-service).
 */
export async function isPrivileged(
  tx: Prisma.TransactionClient,
  tenantId: string,
  user: RequestUser,
): Promise<boolean> {
  if (!user.roleId) return false;
  const role = await tx.role.findFirst({
    where: { id: user.roleId, tenantId },
    select: { permissions: true },
  });
  const perms = (role?.permissions ?? {}) as Record<
    string,
    Record<string, boolean>
  >;
  return perms?.users?.read === true;
}

/** Resolves the user's own employee id (by email), if any. */
export async function ownEmployeeId(
  tx: Prisma.TransactionClient,
  tenantId: string,
  user: RequestUser,
): Promise<string | null> {
  const emp = await tx.employee.findFirst({
    where: { tenantId, email: user.email },
    select: { id: true },
  });
  return emp?.id ?? null;
}
