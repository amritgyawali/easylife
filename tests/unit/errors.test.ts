import { AppError, isAppError, toUserMessage } from '@/utils/errors';

describe('AppError', () => {
  it('carries a stable code separate from the display message', () => {
    const error = new AppError('session_expired', 'jwt expired');
    expect(error.code).toBe('session_expired');
    expect(error.message).toBe('jwt expired');
  });

  it('preserves the original cause for logging without exposing it to the user', () => {
    const cause = new Error('network down');
    const error = new AppError('no_internet', 'offline', cause);
    expect(error.cause).toBe(cause);
  });

  it('is recognised by isAppError', () => {
    expect(isAppError(new AppError('unknown', 'x'))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError('not an error')).toBe(false);
  });
});

describe('toUserMessage', () => {
  it('returns a friendly, code-specific message for a known AppError', () => {
    const message = toUserMessage(new AppError('storage_quota_reached', 'raw provider error text'));
    expect(message).toMatch(/storage limit/i);
    expect(message).not.toContain('raw provider error text');
  });

  it('never leaks a raw error message or stack trace for unknown errors', () => {
    const message = toUserMessage(new Error('TypeError: Cannot read property x of undefined at foo.ts:42'));
    expect(message).not.toMatch(/TypeError|foo\.ts/);
  });

  it('handles non-Error values safely', () => {
    expect(() => toUserMessage(null)).not.toThrow();
    expect(() => toUserMessage(undefined)).not.toThrow();
    expect(() => toUserMessage('a plain string')).not.toThrow();
  });
});
