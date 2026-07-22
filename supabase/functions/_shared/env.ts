/**
 * Server-side environment access for Edge Functions (Deno runtime). These
 * secrets are configured with `supabase secrets set` and are never bundled
 * into the Expo client — see .env.example for the client/server split.
 */

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required Edge Function secret: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv('SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return requireEnv('SUPABASE_ANON_KEY');
}

export function getServiceRoleKey(): string {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function getOptionalEnv(name: string): string | undefined {
  return Deno.env.get(name);
}
