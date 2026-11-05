// One command to verify your keys and model names BEFORE you waste time debugging:  npm run check
const e = process.env;
const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
const missing = need.filter((k) => !e[k] || /YOUR-|your-/.test(e[k]));
if (missing.length) { console.error('FAIL  Fill these in .dev.vars:', missing.join(', ')); process.exit(1); }
const gen = e.GEMINI_MODEL || 'gemini-2.5-flash', emb = e.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const gbase = (e.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
let bad = 0; const ok = (m) => console.log('OK   ', m); const no = (m) => { bad++; console.error('FAIL ', m); };

try {
  const r = await fetch(`${gbase}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': e.GEMINI_API_KEY } });
  if (!r.ok) no(`Gemini key rejected (HTTP ${r.status}). Create a key at aistudio.google.com`);
  else {
    ok('Gemini key works');
    const list = (await r.json()).models || [];
    const has = (n, method) => list.some((m) => m.name === `models/${n}` && (m.supportedGenerationMethods || []).includes(method));
    has(gen, 'generateContent') ? ok(`chat model "${gen}" exists`) : no(`chat model "${gen}" not found. Pick one from: ${list.filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', '')).slice(0, 12).join(', ')}  -> set GEMINI_MODEL`);
    has(emb, 'embedContent') ? ok(`embedding model "${emb}" exists`) : no(`embedding model "${emb}" not found. Embedding models: ${list.filter((m) => (m.supportedGenerationMethods || []).includes('embedContent')).map((m) => m.name.replace('models/', '')).join(', ')}  -> set GEMINI_EMBED_MODEL`);
  }
  const t = await fetch(`${gbase}/v1beta/models/${emb}:embedContent`, { method: 'POST', headers: { 'x-goog-api-key': e.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: `models/${emb}`, content: { parts: [{ text: 'test' }] }, outputDimensionality: 768 }) });
  if (t.ok) { const n = (await t.json())?.embedding?.values?.length; n === 768 ? ok('embedding size is 768 (matches database)') : no(`embedding size is ${n}, database expects 768`); }
  else no(`embedding test call failed (HTTP ${t.status})`);
} catch (err) { no('Could not reach Gemini: ' + err.message); }

const sb = e.SUPABASE_URL.replace(/\/+$/, '');
const H = (k) => ({ apikey: k, ...(k.startsWith('eyJ') ? { Authorization: `Bearer ${k}` } : {}), 'Content-Type': 'application/json' });
try {
  const a = await fetch(`${sb}/auth/v1/settings`, { headers: H(e.SUPABASE_ANON_KEY) });
  if (!a.ok) no(`Supabase URL/anon key rejected (HTTP ${a.status})`);
  else { ok('Supabase URL + anon key work'); const s = await a.json(); s.mailer_autoconfirm ? no('Email confirmation is OFF. Turn ON "Confirm email" in Authentication > Providers > Email') : ok('Email confirmation is ON'); }
  const r = await fetch(`${sb}/rest/v1/rpc/bump_usage`, { method: 'POST', headers: H(e.SUPABASE_SERVICE_ROLE_KEY), body: JSON.stringify({ p_key: 'setup-check', p_limit: 1000000 }) });
  r.ok ? ok('service key works and schema.sql is installed') : no(`database check failed (HTTP ${r.status}). Did you run supabase/schema.sql? Is the service key correct?`);
} catch (err) { no('Could not reach Supabase: ' + err.message); }

console.log(bad ? `\n${bad} problem(s). Fix them, then run again.` : '\nAll checks passed.');
process.exit(bad ? 1 : 0);
