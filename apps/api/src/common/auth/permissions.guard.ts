import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../tenant/tenant-context';
import { RequestUser } from './request-user';
import { PERMISSIONS_KEY, PermissionRequirement } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user) throw new ForbiddenException('Missing user context');

    // Guards run before the TenantInterceptor, so establish the tenant
    // context here to make withCurrentTenant usable during authorization.
    const role = await TenantContext.run(user.tenantId, () =>
      this.prisma.withCurrentTenant((tx) =>
        tx.role.findFirst({
          where: { id: user.roleId ?? undefined },
          select: { permissions: true },
        }),
      ),
    );

    const matrix = (role?.permissions ?? {}) as Record<
      string,
      Record<string, boolean>
    >;
    const allowed = matrix?.[required.module]?.[required.action] === true;
    if (!allowed) {
      throw new ForbiddenException(
        `Missing permission: ${required.module}:${required.action}`,
      );
    }
    return true;
  }
}
