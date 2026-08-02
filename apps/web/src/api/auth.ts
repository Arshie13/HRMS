import { api } from './client';
import { UserProfile } from '../store/auth';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export const authApi = {
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post<LoginResponse>('/auth/login', { email, password, twoFactorCode }).then((r) => r.data),

  register: (companyName: string, email: string, password: string, name?: string) =>
    api.post<LoginResponse>('/auth/register', { companyName, email, password, name }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<{ token: string }>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<UserProfile>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string; resetToken?: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  setupTwoFactor: () => api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/auth/2fa/setup').then((r) => r.data),

  verifyTwoFactor: (code: string) => api.post('/auth/2fa/verify', { code }),
};
