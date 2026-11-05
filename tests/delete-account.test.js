import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/delete-account.js';

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'svc'
};

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

test('delete-account: missing Authorization header -> 401', async () => {
  const req = new Request('https://site/api/delete-account', { method: 'POST' });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.message, /Missing or invalid token/);
});

test('delete-account: invalid/expired token -> 401', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) return reply({}, 401);
    throw new Error('unexpected url ' + url);
  };
  const req = new Request('https://site/api/delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid_tok' }
  });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 401);
});

test('delete-account: server misconfigured -> 500', async () => {
  const req = new Request('https://site/api/delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer tok' }
  });
  const res = await onRequestPost({ request: req, env: { ...ENV, SUPABASE_SERVICE_ROLE_KEY: '' } });
  assert.equal(res.status, 500);
});

test('delete-account: happy path calls Supabase admin delete with service role key', async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, method: init.method, headers: init.headers });
    if (u.includes('/auth/v1/user')) {
      return reply({ id: 'user-uuid-123', email: 'test@example.com' }, 200);
    }
    if (u.includes('/auth/v1/admin/users/user-uuid-123')) {
      return reply({}, 200);
    }
    throw new Error('unexpected url ' + u);
  };

  const req = new Request('https://site/api/delete-account', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid_user_tok' }
  });
  const res = await onRequestPost({ request: req, env: ENV });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /permanently deleted/);

  // Verify that admin delete was called with service role key
  const adminDelCall = calls.find((c) => c.url.includes('/admin/users/user-uuid-123'));
  assert.ok(adminDelCall);
  assert.equal(adminDelCall.method, 'DELETE');
  assert.equal(adminDelCall.headers.apikey, 'svc');
});

test('delete-account: non-POST method returns 405', async () => {
  const res = await onRequest();
  assert.equal(res.status, 405);
});
