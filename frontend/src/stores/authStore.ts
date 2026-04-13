import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@online-games/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '@/services/api';

const STORAGE_KEY = 'arena-auth';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  loginAnonymous: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      setUser: (user) => set({ user }),

      login: async (req) => {
        set({ loading: true, error: null });
        try {
          const res = await apiFetch<AuthResponse>('/auth/login', {
            method: 'POST',
            body: req,
          });
          set({ user: res.user, token: res.accessToken, loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : 'Accesso non riuscito',
          });
          throw e;
        }
      },

      register: async (req) => {
        set({ loading: true, error: null });
        try {
          const res = await apiFetch<AuthResponse>('/auth/register', {
            method: 'POST',
            body: req,
          });
          set({ user: res.user, token: res.accessToken, loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : 'Registrazione non riuscita',
          });
          throw e;
        }
      },

      loginAnonymous: async () => {
        set({ loading: true, error: null });
        try {
          const res = await apiFetch<AuthResponse>('/auth/anonymous', {
            method: 'POST',
            body: {},
          });
          set({ user: res.user, token: res.accessToken, loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : 'Accesso anonimo non riuscito',
          });
          throw e;
        }
      },

      logout: () => {
        const { token } = get();
        void apiFetch('/auth/logout', { method: 'POST', token }).catch(() => undefined);
        set({ user: null, token: null, error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null });
          return;
        }
        set({ loading: true, error: null });
        try {
          const profile = await apiFetch<UserProfile>('/auth/me', { token });
          set({ user: profile, loading: false });
        } catch {
          set({ user: null, token: null, loading: false });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);
