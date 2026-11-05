import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('public/index.html', 'utf8').replace(/<script[^>]*><\/script>/g, '');
const appjs = readFileSync('public/app.js', 'utf8');
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const windows = [];

after(() => {
  for (const win of windows) {
    try { win.close(); } catch {}
  }
});

function boot({ session = null, config = { SUPABASE_URL: 'https://a.supabase.co', SUPABASE_ANON_KEY: 'k' }, fetchImpl } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://site.test/' });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {};
  windows.push(w);
  const origSetInterval = w.setInterval.bind(w);
  w.setInterval = (...args) => { const id = origSetInterval(...args); if (id && typeof id.unref === 'function') id.unref(); return id; };
  const calls = { signUp: [], signIn: [], signOut: 0, resend: [] };
  let listener;
  w.SWASTH_CONFIG = config;
  w.supabase = { createClient: () => ({ auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: (cb) => { listener = cb; return { data: { subscription: {} } }; },
    signUp: async (a) => { calls.signUp.push(a); return { data: {}, error: null }; },
    signInWithPassword: async (a) => { calls.signIn.push(a); return { data: { session: null }, error: { message: 'Invalid login credentials' } }; },
    signOut: async () => { calls.signOut++; }, resend: async (a) => { calls.resend.push(a); return { error: null }; },
  } }) };
  w.fetch = fetchImpl || (async () => new Response('{}', { status: 200 }));
  w.eval(appjs);
  return { w, d: w.document, calls, fire: (s) => listener('EVENT', s) };
}
const verified = { access_token: 'tok', user: { email: 'a@b.co', email_confirmed_at: '2026-01-01' } };

test('placeholder config shows setup error, no crash', async () => {
  const { d } = boot({ config: { SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co', SUPABASE_ANON_KEY: 'YOUR-ANON-OR-PUBLISHABLE-KEY' } });
  assert.equal(d.getElementById('setupError').hidden, false);
});
test('no session -> sign-in view', async () => {
  const { d } = boot(); await tick();
  assert.equal(d.getElementById('authView').hidden, false); assert.equal(d.getElementById('chatView').hidden, true);
});
test('unverified session -> still sign-in view (no chat)', async () => {
  const { d } = boot({ session: { user: { email: 'a@b.co', email_confirmed_at: null } } }); await tick();
  assert.equal(d.getElementById('chatView').hidden, true);
});
test('verified session -> chat view with welcome + 5 example chips', async () => {
  const { d } = boot({ session: verified }); await tick();
  assert.equal(d.getElementById('chatView').hidden, false); assert.equal(d.querySelectorAll('.chip').length, 5);
  assert.equal(d.querySelectorAll('.bubble').length, 1);
});
test('sign-up validates email and password, then calls Supabase with redirect', async () => {
  const { d, w, calls } = boot(); await tick();
  d.getElementById('tabSignUp').click();
  d.getElementById('email').value = 'bad'; d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /valid email/); assert.equal(calls.signUp.length, 0);
  d.getElementById('email').value = 'x@y.co'; d.getElementById('password').value = 'short';
  d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /8 characters/);
  d.getElementById('password').value = 'longenough1'; d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(calls.signUp.length, 1); assert.equal(calls.signUp[0].options.emailRedirectTo, 'https://site.test');
  assert.match(d.getElementById('authMsg').textContent, /verification link/);
  assert.equal(d.getElementById('resendBtn').hidden, false);
});
test('wrong password shows friendly message', async () => {
  const { d, w } = boot(); await tick();
  d.getElementById('email').value = 'x@y.co'; d.getElementById('password').value = 'whatever12';
  d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(d.getElementById('authMsg').textContent, 'Incorrect email or password.');
});
test('chat: sends token, renders answer as TEXT (no HTML injection), safe source links only, shows remaining', async () => {
  let seen;
  const { d, w } = boot({ session: verified, fetchImpl: async (url, init) => { seen = { url, init };
    return new Response(JSON.stringify({ kind: 'answer', answer: '<img src=x onerror=alert(1)> Empty containers.', remaining: 7,
      sources: [{ name: 'WHO', url: 'https://who.int/x' }, { name: 'Bad', url: 'javascript:alert(1)' }], disclaimer: 'Not a diagnosis.' }), { status: 200 }); } });
  await tick(); d.getElementById('question').value = 'How to prevent dengue?';
  d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(50);
  assert.equal(seen.url, '/api/chat'); assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.equal(JSON.parse(seen.init.body).message, 'How to prevent dengue?');
  assert.equal(d.querySelectorAll('img').length, 0);
  const links = [...d.querySelectorAll('.sources a')]; assert.equal(links.length, 1); assert.equal(links[0].rel, 'noopener noreferrer');
  assert.match(d.getElementById('remaining').textContent, /7 questions left/);
  assert.equal(d.getElementById('sendBtn').disabled, false);
});
test('chat: 429 and network errors show friendly text and re-enable Send', async () => {
  let n = 0;
  const { d, w } = boot({ session: verified, fetchImpl: async () => { n++; if (n === 1) return new Response(JSON.stringify({ message: 'Daily limit reached' }), { status: 429 }); throw new Error('offline'); } });
  await tick();
  for (const q of ['one', 'two']) { d.getElementById('question').value = q; d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(50); }
  const errs = [...d.querySelectorAll('.bubble.error')].map((e) => e.textContent);
  assert.deepEqual(errs, ['Daily limit reached', 'Could not reach the server. Check your internet and try again.']);
  assert.equal(d.getElementById('sendBtn').disabled, false);
});
test('chat: double-send while busy is ignored', async () => {
  let n = 0, release;
  const { d, w } = boot({ session: verified, fetchImpl: () => { n++; return new Promise((r) => { release = () => r(new Response('{"kind":"answer","answer":"ok","sources":[]}', { status: 200 })); }); } });
  await tick(); const f = d.getElementById('chatForm'); d.getElementById('question').value = 'q1'; f.dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick(); d.getElementById('question').value = 'q2'; f.dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(n, 1); release(); await tick(50);
});
test('401 from server signs the user out', async () => {
  const { d, w, calls } = boot({ session: verified, fetchImpl: async () => new Response('{}', { status: 401 }) }); await tick();
  d.getElementById('question').value = 'hello there'; d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(50);
  assert.equal(calls.signOut, 1);
});
