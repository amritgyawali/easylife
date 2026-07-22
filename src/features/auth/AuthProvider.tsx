import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseClient, registerAuthRefreshOnAppStateChange } from '@/services/supabase/client';
import { logger } from '@/utils/logger';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True only while the very first session lookup is in flight. */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Single source of truth for auth state, mounted once near the app root.
 * Everything else (route guards, profile queries, etc.) reads from
 * useAuth() rather than calling supabase.auth directly, so there is exactly
 * one subscription and one re-render source for session changes.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
      })
      .catch((error: unknown) => {
        logger.error('auth.initial_session_lookup_failed', error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logger.debug('auth.state_change', { event });
      setSession(nextSession);
    });

    const unregisterAppStateListener = registerAuthRefreshOnAppStateChange();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unregisterAppStateListener();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, isLoading }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
