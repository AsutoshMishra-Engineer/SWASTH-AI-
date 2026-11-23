// Small wrappers around Supabase and Gemini REST APIs (plain fetch, no SDK).
// Every call has a timeout; none retry (to protect free quotas).
import { MODELS } from './config.js';

export class UpstreamError extends Error {
  constructor(where, status, detail) { super(`${where} failed (${status})`); this.where = where; this.status = status; this.detail = detail; }
}

async function timedFetch(url, init, ms, where) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  catch (e) { throw new UpstreamError(where, e.name === 'AbortError' ? 'timeout' : 'network', String(e.message || e)); }
  finally { clearTimeout(t); }
}

// Legacy keys are JWTs (start with "eyJ") and may also go in Authorization.
// New-style keys (sb_publishable_ / sb_secret_) must ONLY go in the apikey header.
function sbHeaders(key, bearer) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (bearer) h.Authorization = `Bearer ${bearer}`;
  else if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}
const base = (env) => env.SUPABASE_URL.replace(/\/+$/, '');

export async function getUser(env, accessToken, L) {
  const res = await timedFetch(`${base(env)}/auth/v1/user`, { headers: sbHeaders(env.SUPABASE_ANON_KEY, accessToken) }, L.UPSTREAM_TIMEOUT_MS, 'auth');
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new UpstreamError('auth', res.status);
  return res.json();
}

export async function bumpUsage(env, key, limit, L) {
  const res = await timedFetch(`${base(env)}/rest/v1/rpc/bump_usage`, {
    method: 'POST', headers: sbHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({ p_key: key, p_limit: limit }),
  }, L.UPSTREAM_TIMEOUT_MS, 'usage');
  if (!res.ok) throw new UpstreamError('usage', res.status);
  return Number(await res.json()); // new count, or -1 when over the limit
}

export async function matchKnowledge(env, embedding, L) {
  const res = await timedFetch(`${base(env)}/rest/v1/rpc/match_knowledge`, {
    method: 'POST', headers: sbHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({ query_embedding: embedding, match_count: L.TOP_K, min_similarity: L.MIN_SIMILARITY, p_language: 'en' }),
  }, L.UPSTREAM_TIMEOUT_MS, 'search');
  if (!res.ok) throw new UpstreamError('search', res.status);
  return res.json();
}

const gbase = (env) => (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

export async function embedQuery(env, text, L) {
  const model = MODELS(env).embed;
  const res = await timedFetch(`${gbase(env)}/v1beta/models/${model}:embedContent`, {
    method: 'POST', headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY', outputDimensionality: L.EMBED_DIM }),
  }, L.UPSTREAM_TIMEOUT_MS, 'embed');
  if (!res.ok) throw new UpstreamError('embed', res.status);
  const data = await res.json();
  const v = data?.embedding?.values;
  if (!Array.isArray(v) || v.length !== L.EMBED_DIM) throw new UpstreamError('embed', 'bad-dimension', `got ${v?.length}`);
  return v;
}

export async function generateAnswer(env, system, userText, L) {
  const modelsToTry = [
    env.GEMINI_MODEL,
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest'
  ].filter(Boolean);

  let lastErr = null;
  for (const model of modelsToTry) {
    const generationConfig = { temperature: 0.2, maxOutputTokens: L.MAX_OUTPUT_TOKENS };
    if (model.startsWith('gemini-2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 };

    try {
      const res = await timedFetch(`${gbase(env)}/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig,
        }),
      }, L.UPSTREAM_TIMEOUT_MS, 'generate');
      if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        const answer = Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
        if (answer) return answer;
      } else {
        lastErr = new UpstreamError('generate', res.status);
      }
    } catch (err) {
      lastErr = err;
    }
  }

  // If all Gemini models hit a rate-limit (429), temporary issue (503), timeout, or failure:
  if (env.GROQ_API_KEY) {
    console.warn('Gemini models exhausted. Executing automatic failover to Groq (openai/gpt-oss-120b)...', lastErr?.message);
    try {
      const groqRes = await timedFetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userText },
          ],
          temperature: 0.2,
          max_tokens: L.MAX_OUTPUT_TOKENS,
        }),
      }, L.UPSTREAM_TIMEOUT_MS, 'groq-failover');

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const text = groqData.choices?.[0]?.message?.content || '';
        if (text) return text;
      }
    } catch (groqErr) {
      console.warn('Groq failover error:', groqErr?.message);
    }
  }
  throw lastErr || new UpstreamError('generate', 503);
}

