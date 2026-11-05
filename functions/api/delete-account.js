// Endpoint: POST /api/delete-account
// Securely deletes the authenticated user's account from Supabase Auth using the service role key.
// Requires valid Authorization: Bearer <user_access_token>.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export async function onRequestPost({ request, env }) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'server_misconfigured', message: 'Server configuration missing.' }, 500);
  }

  // 1) Verify Bearer token
  const authHeader = request.headers.get('Authorization') || '';
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) {
    return json({ error: 'unauthorized', message: 'Missing or invalid token. Please sign in.' }, 401);
  }
  const accessToken = match[1];

  const base = SUPABASE_URL.replace(/\/+$/, '');

  // 2) Validate user with Supabase Auth
  let userId;
  try {
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userRes.status === 401 || userRes.status === 403) {
      return json({ error: 'unauthorized', message: 'Session expired. Please sign in again.' }, 401);
    }
    if (!userRes.ok) {
      return json({ error: 'auth_failed', message: 'Could not verify user identity.' }, userRes.status);
    }

    const userData = await userRes.json();
    userId = userData?.id;
    if (!userId) {
      return json({ error: 'user_not_found', message: 'User record not found.' }, 404);
    }
  } catch (err) {
    return json({ error: 'network_error', message: 'Could not reach authentication service.' }, 502);
  }

  // 3) Permanently delete the user from Supabase using Admin API (Service Role)
  try {
    const delRes = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!delRes.ok && delRes.status !== 404) {
      const errBody = await delRes.text();
      return json({ error: 'delete_failed', message: 'Failed to delete account from server.' }, delRes.status);
    }

    return json({ success: true, message: 'Account permanently deleted from server.' }, 200);
  } catch (err) {
    return json({ error: 'network_error', message: 'Failed to complete deletion request.' }, 502);
  }
}

// Any other method -> 405 Method Not Allowed
export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
}
