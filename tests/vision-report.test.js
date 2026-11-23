import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/vision-report.js';

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  GEMINI_API_KEY: 'gem-key',
  GEMINI_VISION_MODEL: 'gemini-flash-lite-latest'
};

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

test('vision-report: non-POST method returns 405', async () => {
  const res = await onRequest();
  assert.equal(res.status, 405);
  const data = await res.json();
  assert.equal(data.error, 'method_not_allowed');
});

test('vision-report: missing Authorization header -> 401', async () => {
  const req = new Request('https://site/api/vision-report', { method: 'POST' });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'unauthorized');
});

test('vision-report: missing image data -> 400', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return reply({ id: 'u1', email: 'test@example.com' }, 200);
    }
    throw new Error('unexpected: ' + url);
  };

  const req = new Request('https://site/api/vision-report', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'Fasting blood sugar test' })
  });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'bad_request');
});

test('vision-report: happy path analyzes prescription or lab report and returns structured clinical advice', async () => {
  let geminiBody = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return reply({ id: 'u1', email: 'test@example.com' }, 200);
    }
    if (u.includes('/models/gemini-flash-lite-latest:generateContent')) {
      geminiBody = JSON.parse(init.body);
      return reply({
        candidates: [{
          content: {
            parts: [{
              text: '📋 Identified Tests:\nHemoglobin: 9.2 g/dL (Mild Anemia)\n\n💡 Plain Explanation:\nYour blood has slightly fewer red blood cells than normal.\n\n🥗 Nutrition:\nInclude green leafy vegetables and iron-rich foods.'
            }]
          }
        }]
      }, 200);
    }
    throw new Error('unexpected fetch to: ' + u);
  };

  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const req = new Request('https://site/api/vision-report', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: dummyBase64,
      mimeType: 'image/png',
      notes: 'Blood test report from Cuttack DHH',
      reportType: 'lab_test',
      lang: 'en'
    })
  });

  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.kind, 'report_explanation');
  assert.ok(data.answer.includes('Hemoglobin: 9.2 g/dL'));
  assert.ok(data.disclaimer.length > 0);
  assert.ok(geminiBody !== null);
});

test('vision-report: guest mode token allows analyzing report without Supabase auth call', async () => {
  let authCalled = false;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      authCalled = true;
      return reply({}, 401);
    }
    if (u.includes('generateContent')) {
      return reply({
        candidates: [{
          content: { parts: [{ text: '📋 ଫଳାଫଳ: ହିମୋଗ୍ଲୋବିନ୍ ୧୦.୫' }] }
        }]
      }, 200);
    }
    throw new Error('unexpected: ' + u);
  };

  const req = new Request('https://site/api/vision-report', {
    method: 'POST',
    headers: { Authorization: 'Bearer guest_test_tok_123', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'fakeimagebase64',
      mimeType: 'image/jpeg',
      lang: 'or',
      reportType: 'prescription'
    })
  });

  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 200);
  assert.equal(authCalled, false, 'Guest token must not hit Supabase user endpoint');
  const data = await res.json();
  assert.ok(data.answer.includes('ହିମୋଗ୍ଲୋବିନ୍'));
});
