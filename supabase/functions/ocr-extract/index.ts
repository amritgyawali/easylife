// Deno Edge Function — OCR fallback for photographed/scanned documents.
//
// A real OCR engine needs either a native module (Google ML Kit, which
// requires an Expo development build — unavailable in Expo Go, see
// AGENTS.md) or a vendor API key that must never reach the client bundle.
// This function is the thin, stateless bridge: verify the caller is signed
// in, forward the image to OCR.space, and hand back plain text. Everything
// downstream — table detection, column mapping, reconciliation, the review
// queue — is unchanged, because it was always designed around "some text
// came in" rather than "some file came in" (see src/features/imports/*).
//
// Deploy: supabase functions deploy ocr-extract
// Secret:  supabase secrets set OCR_SPACE_API_KEY=...
//          Free key, no credit card: https://ocr.space/ocrapi/freekey
//
// The API key is shared across every user of this app (it is a server
// secret, never a per-user credential), so an unauthenticated caller must
// never be able to spend it — hence the auth check before anything else.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getOptionalEnv, getSupabaseAnonKey, getSupabaseUrl } from '../_shared/env.ts';

// OCR.space's free-tier per-file limit; kept conservative since the exact
// figure is the vendor's to change, not this app's to guess precisely.
const MAX_IMAGE_BYTES = 1_000_000;
const ACCEPTED_MIME_PREFIXES = ['image/', 'application/pdf'];

interface OCRSpaceParsedResult {
  ParsedText?: string;
}

interface OCRSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: OCRSpaceParsedResult[];
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const callerClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const apiKey = getOptionalEnv('OCR_SPACE_API_KEY');
  if (!apiKey) {
    return json({ error: 'Text scanning is not set up on this server yet.' }, 503);
  }

  let payload: { imageBase64?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { imageBase64, mimeType } = payload;
  if (!imageBase64 || !mimeType) {
    return json({ error: 'Missing imageBase64 or mimeType' }, 400);
  }

  if (!ACCEPTED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
    return json({ error: `Cannot read text from ${mimeType} files.` }, 415);
  }

  // Base64 runs about 4/3 the size of the original bytes.
  if (imageBase64.length > MAX_IMAGE_BYTES * 1.4) {
    return json(
      {
        error:
          'That photo is too large to scan for text. Retake it at a lower quality, or crop it tighter to the document.',
      },
      413
    );
  }

  const form = new FormData();
  form.set('apikey', apiKey);
  form.set('base64Image', `data:${mimeType};base64,${imageBase64}`);
  form.set('language', 'eng');
  // Engine 2 reads dense/small text (typical of statement rows) more
  // reliably than engine 1; isTable keeps column spacing in the output so
  // the delimited-table parser downstream has a real header row to find.
  form.set('OCREngine', '2');
  form.set('scale', 'true');
  form.set('isTable', 'true');
  form.set('detectOrientation', 'true');

  let ocrResponse: Response;
  try {
    ocrResponse = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  } catch {
    return json({ error: 'Could not reach the text-scanning service. Try again shortly.' }, 502);
  }

  if (!ocrResponse.ok) {
    return json({ error: 'The text-scanning service is unavailable right now.' }, 502);
  }

  const result = (await ocrResponse.json()) as OCRSpaceResponse;

  if (result.IsErroredOnProcessing || !result.ParsedResults || result.ParsedResults.length === 0) {
    const reason = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(' ') : result.ErrorMessage;
    return json({ error: reason || 'No text could be found in that photo.' }, 422);
  }

  const text = result.ParsedResults.map((page) => page.ParsedText ?? '').join('\n');

  if (text.trim().length === 0) {
    return json({ error: 'No text could be found in that photo. Try better lighting or a flatter angle.' }, 422);
  }

  return json({ text, pagesProcessed: result.ParsedResults.length }, 200);
});
