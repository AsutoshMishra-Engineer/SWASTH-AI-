// Loads knowledge/seed.json into Supabase with embeddings.
//   npm run ingest:dry   -> only checks the file (no network, no keys needed)
//   npm run ingest       -> embeds + uploads (needs .dev.vars). Rows are saved as verified=false
//                           unless the JSON says "verified": true. Review, then flip them in Supabase.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const file = process.argv.find((a) => a.endsWith('.json')) || 'knowledge/seed.json';
const items = JSON.parse(readFileSync(file, 'utf8'));
const must = ['topic', 'content', 'source_name'];
items.forEach((it, i) => { for (const k of must) if (!it[k] || typeof it[k] !== 'string') throw new Error(`Entry ${i + 1}: missing "${k}"`); });
const seen = new Set(items.map((i) => i.content));
if (seen.size !== items.length) throw new Error('Duplicate content found in the file.');
console.log(`${items.length} entries look valid. ${items.filter((i) => i.verified).length} marked verified.`);
if (DRY) process.exit(0);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) throw new Error('Fill .dev.vars first (see .dev.vars.example).');
const embedModel = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const gbase = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const sbHeaders = { apikey: SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' };
if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) sbHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let added = 0;
for (const it of items) {
  const res = await fetch(`${gbase}/v1beta/models/${embedModel}:embedContent`, {
    method: 'POST', headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: `models/${embedModel}`, content: { parts: [{ text: `${it.topic}. ${it.content}` }] }, taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 }),
  });
  if (!res.ok) throw new Error(`Embedding failed for "${it.topic}" (HTTP ${res.status}). Stop here and run: npm run check`);
  const values = (await res.json())?.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) throw new Error(`Unexpected embedding size for "${it.topic}"`);
  const row = {
    topic: it.topic, content: it.content, source_name: it.source_name, source_url: it.source_url || null,
    source_date: it.source_date || null, language: it.language || 'en', verified: it.verified === true,
    content_hash: createHash('sha256').update(it.content).digest('hex'), embedding: `[${values.join(',')}]`,
  };
  const up = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/knowledge?on_conflict=content_hash`, { method: 'POST', headers: sbHeaders, body: JSON.stringify(row) });
  if (!up.ok) throw new Error(`Saving "${it.topic}" failed (HTTP ${up.status}): ${await up.text()}`);
  added++; console.log(`  saved: ${it.topic}`);
  await sleep(700); // stay under free-tier requests-per-minute
}
console.log(`Done. ${added} processed (duplicates are skipped automatically).`);
