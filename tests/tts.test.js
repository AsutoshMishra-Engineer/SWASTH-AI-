import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/tts.js';

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
    audioData: 'dGVzdGF1ZGlv'
  };

  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('/auth/v1/user')) {
      return state.authStatus === 200 ? reply(state.user) : reply({}, state.authStatus);
    }
    if (u.includes(':generateContent')) {
      return state.geminiStatus === 200
        ? reply({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: state.audioData } }] } }] })
        : reply({}, state.geminiStatus);
    }
    if (u.includes('getModelsPipeline')) {
      return reply({
        pipelineResponseConfig: [{
          config: [{ serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4' }]
        }],
        pipelineInferenceAPIEndPoint: {
          callbackUrl: 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
          inferenceApiKey: { name: 'Authorization', value: 'bhashini-secret' }
        }
      });
    }
    if (u.includes('services/inference/pipeline')) {
      return reply({
        pipelineResponse: [{
          audio: [{ audioContent: 'Ymhhc2hpbmlhdWRpbw==' }]
        }]
      });
    }
    if (u.includes('sarvam.ai')) {
      return reply({
        audios: ['c2FydmFtYXVkaW8=']
      });
    }
    throw new Error('unexpected url ' + u);
  };
});

const req = (body, headers = { Authorization: 'Bearer valid_token' }) =>
  new Request('https://site/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });

test('tts: non-POST method returns 405', async () => {
  const r = await onRequest();
  assert.equal(r.status, 405);
});

test('tts: missing Authorization header -> 401', async () => {
  const r = await onRequestPost({ request: req({ text: 'Hello' }, {}), env: ENV });
  assert.equal(r.status, 401);
});

test('tts: empty text -> 400', async () => {
  const r = await onRequestPost({ request: req({ text: '' }), env: ENV });
  assert.equal(r.status, 400);
});

test('tts: happy path generates audio/wav base64', async () => {
  const r = await onRequestPost({ request: req({ text: 'ନମସ୍କାର, କିପରି ସାହାଯ୍ୟ କରିବି' }), env: ENV });
  assert.equal(r.status, 200);
  const json = await r.json();
  assert.equal(json.mimeType, 'audio/wav');
  assert.equal(json.audio, 'dGVzdGF1ZGlv');
  assert.ok(calls.some((u) => u.includes(':generateContent')));
});

test('tts: bhashini happy path uses official MeitY Odia voice', async () => {
  const bhashiniEnv = {
    ...ENV,
    BHASHINI_USER_ID: 'user123',
    BHASHINI_UDYAT_KEY: 'key123',
    BHASHINI_INFERENCE_KEY: 'inf123'
  };
  const r = await onRequestPost({ request: req({ text: 'ନମସ୍କାର, ଆପଣ କିପରି ଅଛନ୍ତି ?' }), env: bhashiniEnv });
  assert.equal(r.status, 200);
  const json = await r.json();
  assert.equal(json.mimeType, 'audio/wav');
  assert.equal(json.audio, 'Ymhhc2hpbmlhdWRpbw==');
  assert.ok(calls.some((u) => u.includes('getModelsPipeline')));
  assert.ok(calls.some((u) => u.includes('services/inference/pipeline')));
});

test('tts: sarvam bulbul v3 fallback uses native Indian Odia speaker', async () => {
  const sarvamEnv = {
    ...ENV,
    SARVAM_API_KEY: 'sarvam-key',
    SARVAM_SPEAKER: 'ritu'
  };
  const r = await onRequestPost({ request: req({ text: 'ନମସ୍କାର, ଆପଣ କିପରି ଅଛନ୍ତି ?' }), env: sarvamEnv });
  assert.equal(r.status, 200);
  const json = await r.json();
  assert.equal(json.mimeType, 'audio/wav');
  assert.equal(json.audio, 'c2FydmFtYXVkaW8=');
  assert.ok(calls.some((u) => u.includes('sarvam.ai')));
});

test('tts: lang=or strictly prioritizes Odia even with mixed English and Devanagari numerals', async () => {
  let sarvamPayload = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('sarvam.ai')) {
      sarvamPayload = JSON.parse(init.body);
      return reply({ audios: ['c2FydmFtYXVkaW8='] });
    }
    return originalFetch(url, init);
  };
  const sarvamEnv = {
    ...ENV,
    SARVAM_API_KEY: 'sarvam-key',
    SARVAM_SPEAKER: 'ritu'
  };
  const r = await onRequestPost({
    request: req({ text: 'Swasth AI ଡାକ୍ତର ପରାମର୍ଶ 123', lang: 'or' }),
    env: sarvamEnv
  });
  assert.equal(r.status, 200);
  assert.ok(sarvamPayload);
  assert.equal(sarvamPayload.target_language_code, 'od-IN');
});
