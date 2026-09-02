'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import type { AuthenticatedUser } from '@/types/analytics';

export type AuthState = 'loading' | 'authenticated' | 'anonymous';

export interface UseAuthResult {
  state: AuthState;
  user: AuthenticatedUser | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Tracks the current session by calling `/auth/me` on mount and exposes
 * login/logout. Session tokens live in httpOnly cookies, so this never touches
 * token values directly.
 */
export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((me) => {
        if (active) {
          setUser(me);
          setState('authenticated');
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setState('anonymous');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      const me = await api.login(email, password);
      setUser(me);
      setState('authenticated');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha no login';
      setError(message);
      setState('anonymous');
      throw err;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setUser(null);
    setState('anonymous');
  }, []);

  return { state, user, error, login, logout };
}
