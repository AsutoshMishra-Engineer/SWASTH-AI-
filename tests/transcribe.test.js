import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/transcribe.js';

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  GEMINI_API_KEY: 'gemini-key'
};

let calls, state;
const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  calls = [];
  state = {
    user: { id: 'u1', email_confirmed_at: '2026-01-01' },
    authStatus: 200,
    geminiStatus: 200,
    transcript: 'ମୋର ମୁଣ୍ଡ ବହୁତ ବିନ୍ଧୁଛି ଏବଂ ଜ୍ୱର ଅଛି'
  };

  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('/auth/v1/user')) {
      return state.authStatus === 200 ? reply(state.user) : reply({}, state.authStatus);
    }
    if (u.includes(':generateContent')) {
      return state.geminiStatus === 200
        ? reply({ candidates: [{ content: { parts: [{ text: state.transcript }] } }] })
        : reply({}, state.geminiStatus);
    }
    throw new Error('unexpected url ' + u);
  };
});

const req = (body, headers = { Authorization: 'Bearer valid_token' }) =>
  new Request('https://site/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });

test('transcribe: non-POST method returns 405', async () => {
  const r = await onRequest();
  assert.equal(r.status, 405);
});

test('transcribe: missing Authorization header -> 401', async () => {
  const r = await onRequestPost({ request: req({ audio: 'abc' }, {}), env: ENV });
  assert.equal(r.status, 401);
});

test('transcribe: empty audio data -> 400', async () => {
  const r = await onRequestPost({ request: req({ audio: '' }), env: ENV });
  assert.equal(r.status, 400);
});

test('transcribe: happy path transcribes Odia voice into text', async () => {
  const r = await onRequestPost({ request: req({ audio: 'dGVzdGF1ZGlv', mimeType: 'audio/webm' }), env: ENV });
  assert.equal(r.status, 200);
  const json = await r.json();
  assert.equal(json.text, 'ମୋର ମୁଣ୍ଡ ବହୁତ ବିନ୍ଧୁଛି ଏବଂ ଜ୍ୱର ଅଛି');
  assert.ok(calls.some((u) => u.includes(':generateContent')));
});
