import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';

/**
 * Initializes authentication on app mount.
 * Attempts to refresh the access token using the HttpOnly cookie.
 * If refresh fails, user is logged out.
 * Access token is stored in Zustand memory — never in localStorage.
 */
export function useAuthInit() {
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Attempt token refresh using HttpOnly cookie
        const refreshRes = await authApi.refresh();
        const { accessToken } = refreshRes.data.data;

        // Store access token in memory (Zustand)
        useAuthStore.getState().setAccessToken(accessToken);

        // Get user info
        const meRes = await authApi.me();
        if (!cancelled) {
          setAuth(meRes.data.data, accessToken);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [setAuth, logout]);
}
