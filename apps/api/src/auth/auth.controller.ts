import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/auth/public.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/request-user';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyTwoFactorDto,
  RefreshDto,
  LogoutDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@CurrentUser() user: RequestUser, @Body() dto: LogoutDto) {
    return this.auth.logout(user, dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.listSessions(user);
  }

  @Delete('sessions/:id')
  revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auth.revokeSession(user, id);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: RequestUser) {
    return this.auth.setupTwoFactor(user);
  }

  @Post('2fa/verify')
  verifyTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.auth.verifyTwoFactor(user, dto.code);
  }

  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.auth.disableTwoFactor(user, dto.code);
  }
}
