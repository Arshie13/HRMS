import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { Prisma } from '.prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/auth/request-user';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

const MODULES = [
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

const ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'export'] as const;

const ACCESS_TOKEN_TTL = '8h';
const REFRESH_TOKEN_TTL_DAYS = 30;

function fullPermissions(): Prisma.InputJsonValue {
  const perms: Record<string, Record<string, boolean>> = {};
  for (const m of MODULES) {
    perms[m] = {};
    for (const a of ACTIONS) perms[m][a] = true;
  }
  return perms as Prisma.InputJsonValue;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'company'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const slug = slugify(dto.companyName);
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Company name already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    // Tenant id is generated up-front so the RLS `WITH CHECK` on the new
    // Tenant row (id = current_tenant_id()) passes before the row exists.
    const newTenantId = randomUUID();

    return this.prisma.withTenant(newTenantId, async (tx) => {
      const tenant = await tx.tenant.create({
        data: { id: newTenantId, name: dto.companyName, slug, plan: 'trial' },
      });

      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Full system access',
          permissions: fullPermissions(),
          isSystem: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          name: dto.name || null,
          passwordHash,
          roleId: adminRole.id,
        },
      });

      await tx.loginActivity.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          email: user.email,
          ip,
          userAgent,
          success: true,
        },
      });

      return this.issueSession(tx, user, tenant.id);
    });
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true, role: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.logLogin(null, user?.tenantId, email, ip, userAgent, false);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isTwoFactorEnabled) {
      const valid = dto.twoFactorCode
        ? authenticator.verify({ token: dto.twoFactorCode, secret: user.twoFactorSecret! })
        : false;
      if (!valid) {
        await this.logLogin(user.id, user.tenantId, email, ip, userAgent, false);
        throw new UnauthorizedException('Two-factor code required or invalid');
      }
    }

    await this.logLogin(user.id, user.tenantId, email, ip, userAgent, true);

    const result = await this.prisma.withTenant(user.tenantId, (tx) =>
      this.issueSession(tx, user, user.tenantId),
    );

    return {
      ...result,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        roleName: user.role?.name ?? null,
        permissions: (user.role?.permissions ?? {}) as Record<string, unknown>,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        plan: user.tenant.plan,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { token: hashToken(refreshToken) },
      include: { user: { include: { tenant: true } } },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;
    const accessToken = await this.signAccessToken(user);

    return { token: accessToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({
        where: { userId, token: hashToken(refreshToken) },
      });
    }
    return { success: true };
  }

  async me(user: RequestUser) {
    const result = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.user.findFirst({
        where: { id: user.userId },
        include: { tenant: true, role: true },
      }),
    );
    if (!result) throw new UnauthorizedException('User not found');
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      roleId: result.roleId,
      roleName: result.role?.name ?? null,
      permissions: (result.role?.permissions ?? {}) as Record<string, unknown>,
      tenantId: result.tenantId,
      tenantName: result.tenant.name,
      plan: result.tenant.plan,
      isTwoFactorEnabled: result.isTwoFactorEnabled,
    };
  }

  async listSessions(user: RequestUser) {
    return this.prisma.session.findMany({
      where: { userId: user.userId, tenantId: user.tenantId },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(user: RequestUser, sessionId: string) {
    return this.prisma.session.deleteMany({
      where: { id: sessionId, userId: user.userId, tenantId: user.tenantId },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Do not reveal whether the account exists
    if (!user) return { message: 'If the account exists, a reset link has been sent.' };

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });

    // TODO(step 9): send via email queue. Returned for dev convenience.
    return { message: 'If the account exists, a reset link has been sent.', resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashToken(dto.token), usedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.withTenant(record.tenantId, async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      // invalidate existing sessions after a reset
      await tx.session.deleteMany({ where: { userId: record.userId } });
    });

    return { success: true };
  }

  async setupTwoFactor(user: RequestUser) {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, tenantId: user.tenantId },
    });
    if (!dbUser) throw new UnauthorizedException('User not found');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(dbUser.email, 'HRM', secret);

    // store secret immediately so verification can run against it
    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { twoFactorSecret: secret },
    });

    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  }

  async verifyTwoFactor(user: RequestUser, code: string) {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, tenantId: user.tenantId },
    });
    if (!dbUser?.twoFactorSecret) {
      throw new BadRequestException('Two-factor not initialized');
    }
    const valid = authenticator.verify({
      token: code,
      secret: dbUser.twoFactorSecret,
    });
    if (!valid) throw new BadRequestException('Invalid two-factor code');

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { isTwoFactorEnabled: true },
    });
    return { success: true };
  }

  async disableTwoFactor(user: RequestUser, code: string) {
    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.userId, tenantId: user.tenantId },
    });
    if (!dbUser?.twoFactorSecret) {
      throw new BadRequestException('Two-factor not initialized');
    }
    const valid = authenticator.verify({ token: code, secret: dbUser.twoFactorSecret });
    if (!valid) throw new BadRequestException('Invalid two-factor code');

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });
    return { success: true };
  }

  // --- internal helpers ---

  private async signAccessToken(user: {
    id: string;
    tenantId: string;
    roleId: string | null;
    email: string;
  }): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        email: user.email,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private async issueSession(
    tx: Prisma.TransactionClient,
    user: { id: string; tenantId: string; roleId: string | null; email: string },
    tenantId: string,
  ) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = randomUUID();
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await tx.session.create({
      data: {
        userId: user.id,
        tenantId,
        token: hashToken(refreshToken),
        expiresAt,
      },
    });

    return { token: accessToken, refreshToken };
  }

  private async logLogin(
    userId: string | null,
    tenantId: string | undefined,
    email: string,
    ip?: string,
    userAgent?: string,
    success = false,
  ) {
    try {
      await this.prisma.loginActivity.create({
        data: { userId, tenantId, email, ip, userAgent, success },
      });
    } catch {
      // logging must never break auth
    }
  }
}
