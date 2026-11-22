import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleChat } from '../functions/_lib/handler.js';

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'g' };
const vec = Array.from({ length: 768 }, () => 0.01);
let calls, state;

const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  calls = [];
  state = { user: { id: 'u1', email_confirmed_at: '2026-01-01' }, userCount: 1, globalCount: 1,
    chunks: [{ topic: 'Dengue', content: 'Empty water containers weekly.', source_name: 'WHO Dengue', source_url: 'https://www.who.int/x', source_date: null },
             { topic: 'Dengue 2', content: 'Use nets.', source_name: 'WHO Dengue', source_url: null, source_date: null }],
    llm: 'Empty water containers every week to stop mosquitoes.', geminiStatus: 200, authStatus: 200 };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url); calls.push(u);
    if (u.includes('/auth/v1/user')) return state.authStatus === 200 ? reply(state.user) : reply({}, state.authStatus);
    if (u.includes('bump_usage')) { const k = JSON.parse(init.body).p_key; return reply(k === 'global' ? state.globalCount : state.userCount); }
    if (u.includes(':embedContent')) return state.geminiStatus === 200 ? reply({ embedding: { values: vec } }) : reply({}, state.geminiStatus);
    if (u.includes('match_knowledge')) return reply(state.chunks);
    if (u.includes(':generateContent')) return state.geminiStatus === 200 ? reply({ candidates: [{ content: { parts: [{ text: state.llm }] } }] }) : reply({}, state.geminiStatus);
    throw new Error('unexpected url ' + u);
  };
});

const req = (msg, headers = { Authorization: 'Bearer tok' }, raw) =>
  new Request('https://site/api/chat', { method: 'POST', headers, body: raw ?? JSON.stringify({ message: msg }) });
const ask = async (msg, env = ENV, headers) => { const r = await handleChat(req(msg, headers), env); return { status: r.status, body: await r.json() }; };
const usedLLM = () => calls.some((u) => u.includes(':generateContent') || u.includes(':embedContent'));

test('happy path: answer + sources from DB (deduplicated)', async () => {
  const { status, body } = await ask('How do I prevent dengue?');
  assert.equal(status, 200); assert.equal(body.kind, 'answer');
  assert.equal(body.sources.length, 1); assert.equal(body.sources[0].name, 'WHO Dengue');
  assert.equal(body.remaining, 35); assert.ok(body.disclaimer);
});
test('no Authorization header -> 401, nothing else called', async () => {
  const r = await handleChat(req('hi', {}), ENV); assert.equal(r.status, 401); assert.equal(calls.length, 0);
});
test('invalid token -> 401', async () => { state.authStatus = 401; assert.equal((await ask('hi there')).status, 401); });
test('unverified email -> 403', async () => { state.user = { id: 'u1', email_confirmed_at: null }; assert.equal((await ask('hi there')).status, 403); });
test('missing server config -> 500', async () => assert.equal((await ask('hi', { ...ENV, GEMINI_API_KEY: '' })).status, 500));
test('bad JSON -> 400', async () => { const r = await handleChat(req(null, { Authorization: 'Bearer t' }, '{oops'), ENV); assert.equal(r.status, 400); });
test('empty message -> 400', async () => assert.equal((await ask('   ')).status, 400));
test('non-string message -> 400', async () => { const r = await handleChat(req(null, { Authorization: 'Bearer t' }, JSON.stringify({ message: 123 })), ENV); assert.equal(r.status, 400); });
test('over 500 chars -> 400, no AI call', async () => { const r = await ask('a'.repeat(501)); assert.equal(r.status, 400); assert.equal(usedLLM(), false); });
test('exactly 500 chars is accepted', async () => assert.equal((await ask('a'.repeat(500))).status, 200));
test('emergency -> fixed text, NO AI call, NO quota used', async () => {
  const { body } = await ask('I have chest pain'); assert.equal(body.kind, 'emergency'); assert.match(body.answer, /108/);
  assert.equal(usedLLM(), false); assert.ok(!calls.some((u) => u.includes('bump_usage')));
});
test('blocked (dose) -> refusal, NO AI call', async () => { const { body } = await ask('what is the dosage of paracetamol'); assert.equal(body.kind, 'blocked'); assert.equal(usedLLM(), false); });
test('user daily limit -> 429, no AI call', async () => { state.userCount = -1; const r = await ask('How to prevent dengue?'); assert.equal(r.status, 429); assert.equal(r.body.error, 'user_limit'); assert.equal(usedLLM(), false); });
test('global daily limit -> 429', async () => { state.globalCount = -1; const r = await ask('How to prevent dengue?'); assert.equal(r.status, 429); assert.equal(r.body.error, 'global_limit'); });
test('no matching knowledge -> no_answer, generateContent NOT called', async () => {
  state.chunks = []; const { body } = await ask('Who won the cricket match?'); assert.equal(body.kind, 'no_answer');
  assert.ok(!calls.some((u) => u.includes(':generateContent')));
});
test('model says NO_ANSWER -> fallback', async () => { state.llm = 'NO_ANSWER'; assert.equal((await ask('How to prevent dengue?')).body.kind, 'no_answer'); });
test('model emits a dose -> blocked by output guard', async () => { state.llm = 'Take 500 mg paracetamol.'; assert.equal((await ask('How to prevent dengue?')).body.kind, 'no_answer'); });
test('markdown stripped from answer', async () => { state.llm = '**Cover** water #tanks'; assert.equal((await ask('How to prevent dengue?')).body.answer, 'Cover water tanks'); });
test('Gemini 429 -> 503 friendly, no crash', async () => { state.geminiStatus = 429; const r = await ask('How to prevent dengue?'); assert.equal(r.status, 503); assert.equal(r.body.error, 'upstream'); });
test('wrong embedding size -> 503', async () => {
  const f = globalThis.fetch; globalThis.fetch = async (u, i) => String(u).includes(':embedContent') ? reply({ embedding: { values: [1, 2] } }) : f(u, i);
  assert.equal((await ask('How to prevent dengue?')).status, 503);
});
test('error responses never leak keys', async () => { state.geminiStatus = 403; const r = await handleChat(req('How to prevent dengue?'), ENV); const t = await r.text(); assert.ok(!/svc|anon|"g"/.test(t)); });
test('new-style secret key is not sent as Bearer', async () => {
  const seen = []; const f = globalThis.fetch;
  globalThis.fetch = async (u, i = {}) => { if (String(u).includes('bump_usage')) seen.push(i.headers); return f(u, i); };
  await ask('How to prevent dengue?', { ...ENV, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' });
  assert.ok(seen.length && seen.every((h) => h.apikey === 'sb_secret_abc' && !h.Authorization));
});

test('guest mode: happy path with guest token allows asking questions without Supabase user', async () => {
  const { status, body } = await ask('How to prevent dengue?', ENV, { Authorization: 'Bearer guest_test_123' });
  assert.equal(status, 200);
  assert.equal(body.kind, 'answer');
  assert.equal(body.remaining, 4);
});

test('guest mode: over 5 questions -> 429 guest_limit', async () => {
  state.userCount = -1;
  const { status, body } = await ask('How to prevent dengue?', ENV, { Authorization: 'Bearer guest_test_123' });
  assert.equal(status, 429);
  assert.equal(body.error, 'guest_limit');
  assert.match(body.message, /limit of 5 guest questions/);
});
