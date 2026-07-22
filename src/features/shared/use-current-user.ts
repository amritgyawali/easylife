import { useAuth } from '@/features/auth/AuthProvider';
import { AppError } from '@/utils/errors';

/**
 * The signed-in user's id, for building query keys.
 *
 * Returns a stable `'anonymous'` sentinel rather than `undefined` so query
 * keys stay well-formed while the session is still loading — the queries
 * themselves are `enabled` only once a real id exists, so the sentinel is
 * never actually fetched against.
 */
export function useUserId(): string {
  const { user } = useAuth();
  return user?.id ?? 'anonymous';
}

export function useIsSignedIn(): boolean {
  const { user } = useAuth();
  return Boolean(user);
}

/** Guards a mutation that cannot run without a user, with a consistent error. */
export function requireUserId(userId: string | null | undefined): string {
  if (!userId || userId === 'anonymous') {
    throw new AppError('session_expired', 'No signed-in user');
  }
  return userId;
}
