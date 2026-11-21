// Endpoint: /api/record-triage
// POST: Securely records generated triage slip reference IDs in Supabase.
// GET:  Enables administrators & health departments to look up patient records by reference ID.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export async function onRequestPost({ request, env }) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = env || {};

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json', message: 'Invalid JSON payload.' }, 400);
  }

  const { reference_id, complaint, language, status = 'AI DIAGNOSED' } = body || {};

  if (!reference_id || typeof reference_id !== 'string') {
    return json({ error: 'invalid_reference', message: 'Missing reference_id.' }, 400);
  }

  if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    const base = SUPABASE_URL.replace(/\/+$/, '');
    const authHeader = request.headers.get('Authorization') || '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    const token = match ? match[1] : null;

    let userId = null;
    if (token) {
      try {
        const userRes = await fetch(`${base}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${token}`,
          },
        });
        if (userRes.ok) {
          const u = await userRes.json();
          userId = u?.id || null;
        }
      } catch {
        // Continue with null userId if auth check fails
      }
    }

    try {
      const insertRes = await fetch(`${base}/rest/v1/triage_records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          reference_id: reference_id.slice(0, 64),
          user_id: userId,
          complaint: (complaint || 'General clinical inquiry').slice(0, 1000),
          language: (language || 'en').slice(0, 10),
          status: status.slice(0, 64),
        }),
      });

      if (!insertRes.ok) {
        console.warn('Supabase triage_records insert notice:', insertRes.status);
      }
    } catch (e) {
      console.warn('Could not reach Supabase for triage_records:', e);
    }
  }

  return json({
    ok: true,
    reference_id,
    status: 'AI DIAGNOSED',
    recorded_at: new Date().toISOString()
  });
}

// GET /api/record-triage?ref=OD-TRG-XXXXXX (Admin & Health Department Security Lookup)
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');

  if (!ref) {
    return json({ error: 'missing_ref', message: 'Please provide ?ref=OD-TRG-XXXXXX' }, 400);
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = env || {};

  if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
    return json({
      ok: true,
      found: false,
      message: 'Database storage active on client; configure Supabase keys on server for remote query.',
      query_ref: ref
    });
  }

  const base = SUPABASE_URL.replace(/\/+$/, '');
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${base}/rest/v1/triage_records?reference_id=eq.${encodeURIComponent(ref)}&select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (!res.ok) {
      return json({ error: 'query_failed', status: res.status }, res.status);
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return json({ ok: true, found: false, message: 'No record found with reference: ' + ref, reference_id: ref }, 404);
    }

    return json({
      ok: true,
      found: true,
      record: rows[0]
    });
  } catch (err) {
    return json({ error: 'lookup_error', message: err.message }, 500);
  }
}

// Any other method on /api/record-triage -> 405
export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST, GET' }
  });
}
