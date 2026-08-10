import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { TenantInterceptor } from '../common/tenant/tenant.interceptor';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Order matters: JwtAuthGuard authenticates first, TenantGuard second, PermissionsGuard third.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
