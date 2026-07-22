/**
 * Logging abstraction used everywhere instead of calling console.* directly.
 *
 * Hard rule (see SECURITY.md): never log raw financial documents, auth
 * tokens, full account numbers, or any other secret/PII. Callers must pass
 * already-redacted data. `redact()` is provided as a convenience for the
 * common "mask everything but the last 4 characters" case (account numbers,
 * reference numbers).
 */

export type LogContext = Record<string, unknown>;

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

const SENSITIVE_KEY_PATTERN = /token|password|secret|api[_-]?key|account[_-]?number|pin\b/i;

function sanitizeContext(context: LogContext | undefined): LogContext | undefined {
  if (!context) return context;
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : value;
  }
  return sanitized;
}

function formatError(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error) };
}

const isDev = process.env.NODE_ENV !== 'production';

export const logger: Logger = {
  debug(message, context) {
    if (!isDev) return;
    console.debug(`[debug] ${message}`, sanitizeContext(context) ?? '');
  },
  info(message, context) {
    console.info(`[info] ${message}`, sanitizeContext(context) ?? '');
  },
  warn(message, context) {
    console.warn(`[warn] ${message}`, sanitizeContext(context) ?? '');
  },
  error(message, error, context) {
    console.error(`[error] ${message}`, formatError(error), sanitizeContext(context) ?? '');
  },
};

/** Masks all but the last `visible` characters. Use for account numbers, references, etc. */
export function redact(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visible) + value.slice(-visible);
}
