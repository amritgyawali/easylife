// Deno Edge Function — deletes the calling user's account and all data.
//
// Flow:
//   1. Verify the caller's JWT (via an anon-key client scoped to their
//      Authorization header) to find out who they are. This is the only way
//      a user can be identified here — there is no way to pass an arbitrary
//      user id and delete someone else's account.
//   2. Use a service-role client (never exposed to the browser) to delete
//      their auth.users row, which cascades to every user-owned table via
//      ON DELETE CASCADE (see supabase/migrations), and to remove their
//      storage folders in both buckets.
//
// Deploy: supabase functions deploy delete-account
// Invoke from the client: supabase.functions.invoke('delete-account')

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getServiceRoleKey, getSupabaseAnonKey, getSupabaseUrl } from '../_shared/env.ts';

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = getSupabaseUrl();

  const callerClient = createClient(supabaseUrl, getSupabaseAnonKey(), {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser();

  if (getUserError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, getServiceRoleKey());

  // Remove storage objects first — deleting the auth user cascades the
  // database rows, but Storage objects are not automatically cleaned up by
  // that cascade and would otherwise be orphaned.
  for (const bucket of ['documents', 'avatars']) {
    const { data: files } = await adminClient.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files && files.length > 0) {
      const paths = files.map((file) => `${user.id}/${file.name}`);
      await adminClient.storage.from(bucket).remove(paths);
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return new Response(JSON.stringify({ error: 'Failed to delete account. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
});
