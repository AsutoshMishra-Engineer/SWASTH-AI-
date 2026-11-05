import { handleChat } from '../_lib/handler.js';

export async function onRequestPost({ request, env }) {
  return handleChat(request, env);
}
// Any other method on /api/chat -> 405
export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } });
}
