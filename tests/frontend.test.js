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
  const calls = { signUp: [], signIn: [], signOut: 0, resend: [], updateUser: [] };
  let listener;
  w.SWASTH_CONFIG = config;
  w.supabase = { createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb) => { listener = cb; return { data: { subscription: {} } }; },
      signUp: async (a) => { calls.signUp.push(a); return { data: {}, error: null }; },
      signInWithPassword: async (a) => { calls.signIn.push(a); return { data: { session: null }, error: { message: 'Invalid login credentials' } }; },
      signOut: async () => { calls.signOut++; },
      resend: async (a) => { calls.resend.push(a); return { error: null }; },
      updateUser: async (a) => { calls.updateUser.push(a); return { data: {}, error: null }; }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: session?.user?.user_metadata?.full_name ? { full_name: session.user.user_metadata.full_name, age: session.user.user_metadata.age } : null, error: null })
        })
      }),
      upsert: async () => ({ error: null })
    })
  }) };
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
test('guest mode card below auth box opens chat view with guest banner, chips, and limits', async () => {
  const { d } = boot(); await tick();
  assert.equal(d.getElementById('chatView').hidden, true);
  assert.equal(d.getElementById('guestCard').hidden, false);
  d.getElementById('guestModeBtn').click(); await tick();
  assert.equal(d.getElementById('chatView').hidden, false);
  assert.equal(d.getElementById('authView').hidden, true);
  assert.equal(d.getElementById('guestChatBanner').hidden, false);
  assert.match(d.getElementById('guestRemainingText').textContent, /questions left today/);
  assert.equal(d.querySelectorAll('.chip').length, 5);
});
test('sign-up validates name, age, email and password, then calls Supabase with user metadata', async () => {
  const { d, w, calls } = boot(); await tick();
  d.getElementById('tabSignUp').click();
  // Missing full name
  d.getElementById('fullName').value = '';
  d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /full legal name/);
  // Missing / invalid age
  d.getElementById('fullName').value = 'Ramesh Chandra Sahoo';
  d.getElementById('age').value = '0';
  d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /valid age/);
  // Invalid email
  d.getElementById('age').value = '42';
  d.getElementById('email').value = 'bad'; d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /valid email/); assert.equal(calls.signUp.length, 0);
  // Short password
  d.getElementById('email').value = 'x@y.co'; d.getElementById('password').value = 'short';
  d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.match(d.getElementById('authMsg').textContent, /8 characters/);
  // Valid submission
  d.getElementById('password').value = 'longenough1'; d.getElementById('authForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
  assert.equal(calls.signUp.length, 1);
  assert.equal(calls.signUp[0].options.emailRedirectTo, 'https://site.test');
  assert.equal(calls.signUp[0].options.data.full_name, 'Ramesh Chandra Sahoo');
  assert.equal(calls.signUp[0].options.data.age, 42);
  assert.match(d.getElementById('authMsg').textContent, /verification link/);
  assert.equal(d.getElementById('resendBtn').hidden, false);
});
test('existing verified session without name/age prompts mandatory profile modal', async () => {
  // session without user_metadata
  const sessionWithoutProfile = {
    access_token: 'tok-no-prof',
    user: { id: 'u-123', email: 'existing@odisha.in', email_confirmed_at: '2026-01-01', user_metadata: {} }
  };
  const { d } = boot({ session: sessionWithoutProfile }); await tick();
  const modal = d.getElementById('profileCompletionModal');
  assert.notEqual(modal, null);
  assert.equal(modal.open, true);
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
test('accessibility: font scaler toggles body font size class', async () => {
  const { d } = boot({ session: verified }); await tick();
  const incBtn = d.getElementById('fontIncBtn');
  const decBtn = d.getElementById('fontDecBtn');
  const resetBtn = d.getElementById('fontResetBtn');
  incBtn.click();
  assert.equal(d.body.classList.contains('font-scale-lg'), true);
  decBtn.click();
  assert.equal(d.body.classList.contains('font-scale-sm'), true);
  resetBtn.click();
  assert.equal(d.body.classList.contains('font-scale-lg'), false);
  assert.equal(d.body.classList.contains('font-scale-sm'), false);
});
test('chat: network error renders retry bar and allows 1-tap re-send', async () => {
  let calls = 0;
  const { d, w } = boot({ session: verified, fetchImpl: async () => {
    calls++;
    if (calls === 1) throw new Error('network down');
    return new Response(JSON.stringify({ kind: 'answer', answer: 'Recovered answer', sources: [] }), { status: 200 });
  } });
  await tick();
  d.getElementById('question').value = 'headache';
  d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick(50);
  const retryBtn = d.querySelector('.retry-action-bar button');
  assert.notEqual(retryBtn, null);
  retryBtn.click();
  await tick(50);
  assert.equal(calls, 2);
  const botAnswer = [...d.querySelectorAll('.bubble.bot')].pop();
  assert.match(botAnswer.textContent, /Recovered answer/);
});

test('hands-free voice call button toggles active call state and shows live banner', async () => {
  const { d, w } = boot({ session: verified }); await tick();
  const callBtn = d.getElementById('handsFreeCallBtn');
  const callBanner = d.getElementById('handsFreeCallBanner');
  const endBtn = d.getElementById('endHandsFreeCallBtn');
  assert.notEqual(callBtn, null);
  assert.notEqual(callBanner, null);
  assert.equal(callBanner.hidden, true);

  // Mock getUserMedia
  w.navigator.mediaDevices = {
    getUserMedia: async () => ({
      getTracks: () => [{ stop: () => {} }]
    })
  };
  w.MediaRecorder = class {
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; if (this.onstart) this.onstart(); }
    stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); }
  };
  w.MediaRecorder.isTypeSupported = () => true;

  callBtn.click();
  await tick();
  assert.equal(callBanner.hidden, false);
  assert.ok(callBtn.classList.contains('active'));

  endBtn.click();
  await tick();
  assert.equal(callBanner.hidden, true);
  assert.ok(!callBtn.classList.contains('active'));
});

test('1-tap SOS emergency button opens emergency modal with GPS and prefilled WhatsApp/SMS dispatch', async () => {
  const { d } = boot({ session: verified }); await tick();
  const sosBtn = d.getElementById('sosEmergencyPillBtn');
  const sosModal = d.getElementById('sosEmergencyModal');
  const waBtn = d.getElementById('sosWhatsAppBtn');
  const smsBtn = d.getElementById('sosSmsBtn');
  assert.notEqual(sosBtn, null);
  assert.notEqual(sosModal, null);

  sosBtn.click();
  await tick();
  assert.equal(sosModal.open, true);
  assert.ok(waBtn.href.includes('wa.me'));
  assert.ok(waBtn.href.includes('EMERGENCY%20SOS'));
  assert.ok(smsBtn.href.includes('sms:'));
});

test('prescription and lab report action box binds file input and sets report triage mode', async () => {
  const { d } = boot({ session: verified }); await tick();
  const reportBox = d.getElementById('reportActionBox');
  const reportInput = d.getElementById('reportInput');
  assert.notEqual(reportBox, null);
  assert.notEqual(reportInput, null);

  let clicked = false;
  reportInput.click = () => { clicked = true; };
  reportBox.click();
  assert.equal(clicked, true);
});

