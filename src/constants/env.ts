import { z } from 'zod';

/**
 * Client-side environment validation. Only EXPO_PUBLIC_* variables may be
 * read here — anything else would be bundled into the client and shipped to
 * every user's device/browser. Server secrets (Supabase service role,
 * Resend API key, etc.) are validated separately inside Supabase Edge
 * Functions — see supabase/functions/_shared/env.ts — and must never appear
 * in this file or in an EXPO_PUBLIC_* variable.
 *
 * Validation runs once at import time so a misconfigured deployment fails
 * fast and loudly instead of producing confusing runtime errors deep inside
 * the Supabase client.
 */
const clientEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string({ message: 'EXPO_PUBLIC_SUPABASE_URL is required' })
    .url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required' })
    .min(20, 'EXPO_PUBLIC_SUPABASE_ANON_KEY looks too short to be valid'),
  EXPO_PUBLIC_APP_URL: z.string().url().default('http://localhost:8081'),
  EXPO_PUBLIC_APP_NAME: z.string().min(1).default('Amrit LifeOS'),
  EXPO_PUBLIC_DEFAULT_TIMEZONE: z.string().min(1).default('Asia/Kathmandu'),
  EXPO_PUBLIC_DEFAULT_CURRENCY: z.string().length(3).default('NPR'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedEnv: ClientEnv | null = null;

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Invalid or missing environment configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}\n\n` +
        'Copy .env.example to .env and fill in your Supabase project values.'
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Parses and validates process.env once, caching the result. Throws
 * EnvValidationError (never a raw stack trace to the UI — the root error
 * boundary renders a friendly "app is misconfigured" screen for this) if
 * required variables are missing or malformed.
 */
export function getEnv(): ClientEnv {
  if (cachedEnv) return cachedEnv;

  const raw = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
    EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
    EXPO_PUBLIC_DEFAULT_TIMEZONE: process.env.EXPO_PUBLIC_DEFAULT_TIMEZONE,
    EXPO_PUBLIC_DEFAULT_CURRENCY: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY,
  };

  const result = clientEnvSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new EnvValidationError(issues);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
