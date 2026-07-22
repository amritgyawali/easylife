import { getOptionalEnv } from './env.ts';

/**
 * CORS headers scoped to the configured app URL rather than a wildcard,
 * since these functions can perform privileged/authenticated actions.
 */
export function corsHeaders(): HeadersInit {
  const appUrl = getOptionalEnv('APP_URL') ?? '*';

  return {
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  return null;
}
