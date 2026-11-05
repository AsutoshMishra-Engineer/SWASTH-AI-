// End-to-end test in the REAL Cloudflare Workers runtime (workerd via wrangler),
// talking to a local fake Supabase + fake Gemini. Run:  npm run e2e
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const MOCK = 8799, SITE = 8788;
const counts = new Map();
const vec = Array.from({ length: 768 }, () => 0.02);
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const send = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const u = req.url;
    if (u.startsWith('/auth/v1/user')) {
      const t = (req.headers.authorization || '').replace('Bearer ', '');
      if (t === 'good') return send({ id: 'user-1', email_confirmed_at: '2026-01-01' });
      if (t === 'unverified') return send({ id: 'user-2', email_confirmed_at: null });
      return send({ message: 'bad jwt' }, 401);
    }
    if (u.includes('bump_usage')) { const { p_key, p_limit } = JSON.parse(b); const n = (counts.get(p_key) || 0) + 1; if (n > p_limit) return send(-1); counts.set(p_key, n); return send(n); }
    if (u.includes('match_knowledge')) return send([{ topic: 'Dengue', content: 'Empty water containers weekly.', source_name: 'WHO Dengue', source_url: 'https://www.who.int/x', source_date: null }]);
    if (u.includes(':embedContent')) return send({ embedding: { values: vec } });
    if (u.includes(':generateContent')) return send({ candidates: [{ content: { parts: [{ text: 'Empty water containers every week.' }] } }] });
    send({ error: 'unknown ' + u }, 404);
  });
});
await new Promise((r) => mock.listen(MOCK, '127.0.0.1', r));

const hadVars = existsSync('.dev.vars'); if (hadVars) copyFileSync('.dev.vars', '.dev.vars.bak');
writeFileSync('.dev.vars', `SUPABASE_URL=http://127.0.0.1:${MOCK}\nSUPABASE_ANON_KEY=anon\nSUPABASE_SERVICE_ROLE_KEY=svc\nGEMINI_API_KEY=g\nGEMINI_BASE_URL=http://127.0.0.1:${MOCK}\nUSER_DAILY_LIMIT=3\n`);
const wr = spawn('npx', ['wrangler', 'pages', 'dev', 'public', '--port', String(SITE), '--ip', '127.0.0.1'], { env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } });
let log = ''; wr.stdout.on('data', (d) => (log += d)); wr.stderr.on('data', (d) => (log += d));
const cleanup = () => { wr.kill('SIGKILL'); mock.close(); rmSync('.dev.vars', { force: true }); if (hadVars) { copyFileSync('.dev.vars.bak', '.dev.vars'); rmSync('.dev.vars.bak'); } };
process.on('exit', cleanup);

async function waitUp() { for (let i = 0; i < 90; i++) { try { const r = await fetch(`http://127.0.0.1:${SITE}/`); if (r.status) return; } catch {} await new Promise((r) => setTimeout(r, 1000)); } throw new Error('wrangler did not start:\n' + log.slice(-1500)); }
const post = (msg, token = 'good', raw) => fetch(`http://127.0.0.1:${SITE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: raw ?? JSON.stringify({ message: msg }) });
let pass = 0; const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS ', name); } catch (e) { console.error('FAIL ', name, '\n     ', e.message); process.exitCode = 1; } };

try {
  await waitUp();
  await t('home page served with security headers', async () => { const r = await fetch(`http://127.0.0.1:${SITE}/`); assert.equal(r.status, 200); assert.match(await r.text(), /Swasth AI/); assert.ok(r.headers.get('content-security-policy')); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); });
  await t('GET /api/chat -> 405', async () => assert.equal((await fetch(`http://127.0.0.1:${SITE}/api/chat`)).status, 405));
  await t('no token -> 401', async () => assert.equal((await post('hi', null)).status, 401));
  await t('bad token -> 401', async () => assert.equal((await post('hi', 'nope')).status, 401));
  await t('unverified email -> 403', async () => assert.equal((await post('hi', 'unverified')).status, 403));
  await t('emergency -> fixed 108 message, no quota used', async () => { const b = await (await post('I have chest pain')).json(); assert.equal(b.kind, 'emergency'); assert.match(b.answer, /108/); assert.equal(counts.size, 0); });
  await t('normal question -> answer + DB source + remaining 2', async () => { const r = await post('How do I prevent dengue?'); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store'); const b = await r.json(); assert.equal(b.kind, 'answer'); assert.equal(b.sources[0].name, 'WHO Dengue'); assert.equal(b.remaining, 2); });
  await t('limit of 3/day enforced (4th request -> 429)', async () => { await post('How to prevent dengue?'); await post('How to prevent dengue?'); const r = await post('How to prevent dengue?'); assert.equal(r.status, 429); assert.equal((await r.json()).error, 'user_limit'); });
  await t('oversize message -> 400', async () => assert.equal((await post('a'.repeat(501))).status, 400));
  await t('huge body -> 413', async () => assert.equal((await post(null, 'good', JSON.stringify({ message: 'a'.repeat(6000) }))).status, 413));
} finally { cleanup(); }
console.log(`\n${pass} passed${process.exitCode ? ', SOME FAILED' : ''}`);
process.exit(process.exitCode || 0);
