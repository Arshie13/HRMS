import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128)
  newPassword!: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
