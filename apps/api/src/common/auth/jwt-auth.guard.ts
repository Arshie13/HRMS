import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { RequestUser } from './request-user';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  roleId: string | null;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers?.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user: RequestUser = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId ?? null,
      email: payload.email,
    };
    request.user = user;
    return true;
  }

  private extractToken(authHeader?: string): string | undefined {
    if (!authHeader) return undefined;
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return undefined;
    return token;
  }
}
