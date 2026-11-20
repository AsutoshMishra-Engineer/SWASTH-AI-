import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/vision-skin.js';

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  GEMINI_API_KEY: 'gem-key',
  GEMINI_VISION_MODEL: 'gemini-flash-lite-latest'
};

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

test('vision-skin: non-POST method returns 405', async () => {
  const res = await onRequest();
  assert.equal(res.status, 405);
  const data = await res.json();
  assert.equal(data.error, 'method_not_allowed');
});

test('vision-skin: missing Authorization header -> 401', async () => {
  const req = new Request('https://site/api/vision-skin', { method: 'POST' });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'unauthorized');
});

test('vision-skin: missing image data -> 400', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return reply({ id: 'u1', email: 'test@example.com' }, 200);
    }
    throw new Error('unexpected: ' + url);
  };

  const req = new Request('https://site/api/vision-skin', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms: 'itchy red spots' })
  });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'bad_request');
});

test('vision-skin: happy path analyzes image and returns structured clinical advice', async () => {
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
              text: '📘 Visual Observation: Probable fungal ringworm.\n🏠 Safe Home Care: Keep clean and dry.\n⚠️ Warning Signs: Spreading redness.\n🏥 When to See a Doctor: Visit a CHC.'
            }]
          }
        }]
      }, 200);
    }
    throw new Error('unexpected: ' + u);
  };

  const req = new Request('https://site/api/vision-skin', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/png',
      symptoms: 'circular red rash that is itchy',
      lang: 'en'
    })
  });

  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.kind, 'vision_skin');
  assert.match(data.answer, /Probable fungal ringworm/);
  assert.match(data.answer, /Safe Home Care/);
  assert.ok(Array.isArray(data.sources) && data.sources.length >= 1);
  assert.ok(geminiBody !== null);
  assert.equal(geminiBody.contents[0].parts[0].inlineData.mimeType, 'image/png');
});

test('vision-skin: falls back to secondary model if first model returns 503', async () => {
  const modelsCalled = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return reply({ id: 'u1', email: 'test@example.com' }, 200);
    }
    if (u.includes('/models/')) {
      const match = /\/models\/([^:]+):generateContent/.exec(u);
      if (match) modelsCalled.push(match[1]);
      if (modelsCalled.length === 1) {
        return reply({ error: { message: 'High demand 503' } }, 503);
      }
      return reply({
        candidates: [{
          content: {
            parts: [{
              text: '📘 Visual Observation: Ringworm identified by fallback model.\n🏠 Safe Home Care: Keep clean.'
            }]
          }
        }]
      }, 200);
    }
    throw new Error('unexpected: ' + u);
  };

  const req = new Request('https://site/api/vision-skin', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/png',
      lang: 'en'
    })
  });

  const res = await onRequestPost({ request: req, env: { ...ENV, GEMINI_VISION_MODEL: '' } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.match(data.answer, /Ringworm identified by fallback model/);
  assert.equal(modelsCalled.length, 2);
});

test('vision-skin: supports eye, oral, pediatric, wound, and nail departments with strict zero-random-medicines guard', async () => {
  let capturedPrompt = '';
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return reply({ id: 'u1', email: 'test@example.com' }, 200);
    }
    if (u.includes('/models/')) {
      const parsed = JSON.parse(init.body || '{}');
      capturedPrompt = parsed.contents?.[0]?.parts?.[1]?.text || '';
      return reply({
        candidates: [{
          content: {
            parts: [{
              text: '📘 Visual Observation & Probable Causes: Eye redness noted.\n🏠 Safe Home Care & Immediate Relief: Cool compress, do not rub.\n⚠️ Warning Signs: Vision blurring.\n🏥 When to See a Doctor: Visit ophthalmologist.\n[[DEPT:eye]]'
            }]
          }
        }]
      }, 200);
    }
    throw new Error('unexpected: ' + u);
  };

  const req = new Request('https://site/api/vision-skin', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      mimeType: 'image/png',
      department: 'eye',
      lang: 'en'
    })
  });

  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.department, 'eye');
  assert.ok(!data.answer.includes('[[DEPT:eye]]'), 'metadata tag should be stripped from user answer');
  assert.match(capturedPrompt, /ZERO UNPRESCRIBED RANDOM MEDICINES/);
  assert.match(capturedPrompt, /OPHTHALMOLOGY & EYE DEPARTMENT/);
  assert.match(capturedPrompt, /ORAL HEALTH & PRE-CANCER SCREENING/);
  assert.match(capturedPrompt, /PEDIATRICS & NEWBORN TRIAGE/);
  assert.match(capturedPrompt, /WOUNDS, BURNS & ANIMAL BITES/);
  assert.match(capturedPrompt, /NAILS & ANEMIA VISUAL SCREENING/);
});
