import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: Record<string, Record<string, boolean>>;
  tenantId: string;
  tenantName: string;
  plan: string;
  isTwoFactorEnabled: boolean;
  /** Linked Employee record (null for users without one, e.g. pure admins). */
  employeeId: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setAuth: (auth: { token: string; refreshToken: string; user: UserProfile }) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: ({ token, refreshToken, user }) => set({ token, refreshToken, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'hrm-auth' },
  ),
);
