import { getLimits } from '../_lib/config.js';
import { getUser, UpstreamError } from '../_lib/upstream.js';
import { MODELS } from '../_lib/config.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const gbase = (env) => (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

async function timedFetch(url, init, ms, where) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  catch (e) { throw new UpstreamError(where, e.name === 'AbortError' ? 'timeout' : 'network', String(e.message || e)); }
  finally { clearTimeout(t); }
}

export async function onRequestPost({ request, env }) {
  const L = getLimits(env);
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY']) {
    if (!env[k]) return json({ error: 'server_misconfigured', message: 'Server is not configured yet.' }, 500);
  }

  // 1) Verify user authentication
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  const token = m[1].trim();
  const isGuest = /^guest[_\:]/i.test(token);

  try {
    let user;
    if (isGuest) {
      user = { id: token.slice(0, 64), email_confirmed_at: '2026-01-01', is_guest: true };
    } else {
      user = await getUser(env, token, L);
      if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);
    }

    // 2) Parse audio payload
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request', message: 'Invalid payload.' }, 400); }
    const audioData = typeof body?.audio === 'string' ? body.audio.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'audio/webm';
    if (!audioData) return json({ error: 'bad_request', message: 'No audio data provided.' }, 400);

    // Limit audio base64 size (approx 3MB max for a voice clip)
    if (audioData.length > 3 * 1024 * 1024) {
      return json({ error: 'too_large', message: 'Audio recording too long.' }, 413);
    }

    const primaryModel = env.GEMINI_AUDIO_MODEL || 'gemini-flash-latest';
    const modelsToTry = [primaryModel, 'gemini-flash-lite-latest'];
    const reqLang = typeof body?.lang === 'string' ? body.lang.toLowerCase() : 'or';
    const isHi = reqLang === 'hi';
    const prompt = isHi
      ? 'The user is a rural or general citizen speaking in Hindi (हिन्दी) describing health symptoms or asking medical questions. Transcribe the spoken audio with high phonetic accuracy into clear Hindi Devanagari script. Understand regional rural accents, colloquial idioms, and phonetically transliterated terms. Output ONLY the exact transcribed text in Hindi, nothing else.'
      : 'The user is a rural citizen or resident of Odisha, India speaking in Odia (ଓଡ଼ିଆ) describing health symptoms or asking medical questions. Transcribe the spoken audio with high phonetic accuracy into natural Odia script (ଓଡ଼ିଆ). Understand regional colloquial Odia dialects (Sambalpuri, Cuttacki, Baleswari, Ganjami), village symptom idioms, and mixed medical loan words. Output ONLY the exact transcribed text in pure Odia script, nothing else.';

    let transcribed = '';
    for (const model of modelsToTry) {
      try {
        const res = await timedFetch(`${gbase(env)}/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: audioData } },
                { text: prompt }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 200
            }
          })
        }, L.UPSTREAM_TIMEOUT_MS, 'transcribe');

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts;
          transcribed = Array.isArray(parts) ? parts.map((p) => p.text || '').join('').trim() : '';
          if (transcribed) break;
        }
      } catch (e) {
        console.warn('Transcribe attempt failed with model', model, e && e.message);
      }
    }

    if (!transcribed) {
      throw new UpstreamError('transcribe', 'no_transcription', 'Model did not return transcribed text');
    }

    return json({ text: transcribed });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('upstream error transcribe:', err.where, err.status, err.detail || '');
      return json({ error: 'upstream', message: 'Voice recognition service is busy. Please try again or type your question.' }, 503);
    }
    console.error('transcribe unexpected error:', err && err.message);
    return json({ error: 'server_error', message: 'Could not process audio.' }, 500);
  }
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}
