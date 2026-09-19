import { create } from 'zustand';
import { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Auth store — access token stored in Zustand memory (never localStorage).
 * Refresh token exists only in the HttpOnly cookie managed by the browser.
 * On page reload, the app calls /auth/refresh to get a new access token.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // true on mount while checking refresh token

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isLoading: false }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
