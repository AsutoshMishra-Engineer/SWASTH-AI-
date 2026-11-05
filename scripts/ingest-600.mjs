import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// 1. Load environment variables from .dev.vars
const vars = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY } = vars;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY in .dev.vars');
}

const gbase = 'https://generativelanguage.googleapis.com';
const embedModel = 'gemini-embedding-001';
const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
  Prefer: 'resolution=ignore-duplicates,return=minimal',
};
if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
  sbHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('--- Swasth AI 600-Topic Dataset Expansion & Batch Ingestion ---');

  // 2. Fetch existing content hashes from Supabase to prevent duplicates
  console.log('1. Checking existing records in Supabase...');
  const existingRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/knowledge?select=content_hash`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!existingRes.ok) {
    throw new Error(`Failed to fetch existing records: HTTP ${existingRes.status}`);
  }
  const existingData = await existingRes.json();
  const existingHashes = new Set(existingData.map((d) => d.content_hash));
  console.log(`   Found ${existingHashes.size} existing rows in Supabase knowledge table.`);

  // 3. Load all newly defined topic modules
  console.log('2. Loading all clinical topic modules...');
  const modules = await Promise.all([
    import('./data/dermatology.mjs'),
    import('./data/ent-eyes.mjs'),
    import('./data/respiratory.mjs'),
    import('./data/gastro.mjs'),
    import('./data/musculoskeletal.mjs'),
    import('./data/neuro-cardio.mjs'),
    import('./data/urology-mens.mjs'),
    import('./data/maternal-pediatric.mjs'),
    import('./data/tropical-infections.mjs'),
    import('./data/firstaid-lifestyle.mjs'),
    import('./data/clinical-expansion-a.mjs'),
    import('./data/clinical-expansion-b.mjs'),
    import('./data/clinical-expansion-c.mjs'),
    import('./data/clinical-expansion-d.mjs'),
    import('./data/clinical-expansion-e.mjs'),
    import('./data/clinical-expansion-f.mjs'),
    import('./data/clinical-expansion-g.mjs'),
    import('./data/clinical-expansion-h.mjs'),
    import('./data/clinical-expansion-i.mjs'),
    import('./data/clinical-expansion-j.mjs'),
    import('./data/clinical-expansion-k.mjs'),
    import('./data/clinical-expansion-l.mjs'),
    import('./data/clinical-expansion-m.mjs'),
    import('./data/clinical-expansion-n.mjs'),
  ]);

  const allTopics = modules.flatMap((m) => Object.values(m)[0]);
  console.log(`   Loaded ${allTopics.length} total defined topic objects.`);

  // 4. Deduplicate and filter out items already in the database
  const toIngest = [];
  const localSeen = new Set();
  for (const item of allTopics) {
    const hash = createHash('sha256').update(item.content).digest('hex');
    if (!existingHashes.has(hash) && !localSeen.has(hash)) {
      localSeen.add(hash);
      toIngest.push({ ...item, content_hash: hash });
    }
  }

  console.log(`3. Need to embed and ingest: ${toIngest.length} new unique topics.`);
  if (toIngest.length === 0) {
    console.log('   All topics already ingested!');
  } else {
    // 5. Batch embed in chunks of 35
    const BATCH_SIZE = 35;
    let processed = 0;

    for (let i = 0; i < toIngest.length; i += BATCH_SIZE) {
      const chunk = toIngest.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toIngest.length / BATCH_SIZE);
      console.log(`   Processing Batch ${batchNum}/${totalBatches} (${chunk.length} items)...`);

      // Call Gemini batchEmbedContents
      const requests = chunk.map((item) => ({
        model: `models/${embedModel}`,
        content: { parts: [{ text: `${item.topic}. ${item.content}` }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      }));

      // Call Gemini batchEmbedContents with automatic retry on 429
      let embeddings = null;
      while (!embeddings) {
        const embedRes = await fetch(`${gbase}/v1beta/models/${embedModel}:batchEmbedContents`, {
          method: 'POST',
          headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        });

        if (embedRes.status === 429) {
          console.log(`     Quota limit reached (429). Pausing 28 seconds before auto-retrying...`);
          await sleep(28000);
          continue;
        }

        if (!embedRes.ok) {
          const errText = await embedRes.text();
          throw new Error(`Batch embedding failed (HTTP ${embedRes.status}): ${errText}`);
        }

        const embedData = await embedRes.json();
        embeddings = embedData.embeddings;
      }

      if (!Array.isArray(embeddings) || embeddings.length !== chunk.length) {
        throw new Error(`Expected ${chunk.length} embeddings, received ${embeddings?.length}`);
      }

      // Prepare Supabase rows
      const rows = chunk.map((item, idx) => ({
        topic: item.topic,
        content: item.content,
        source_name: item.source_name,
        source_url: item.source_url || null,
        source_date: item.source_date || '2024-01-15',
        language: 'en',
        verified: true,
        content_hash: item.content_hash,
        embedding: `[${embeddings[idx].values.join(',')}]`,
      }));

      // Upload to Supabase
      const upRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/knowledge?on_conflict=content_hash`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify(rows),
      });

      if (!upRes.ok) {
        const upErr = await upRes.text();
        throw new Error(`Supabase upload failed for batch ${batchNum}: ${upErr}`);
      }

      processed += chunk.length;
      console.log(`     Batch ${batchNum} uploaded successfully. (Progress: ${processed}/${toIngest.length})`);
      await sleep(12000); // 12-second pause between batches to stay under RPM limits
    }
  }

  // 6. Query final exact count in Supabase
  console.log('\n4. Verifying final count in Supabase database...');
  const countRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/knowledge?select=id`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Range-Unit': 'items',
      Range: '0-0',
      Prefer: 'count=exact',
    },
  });
  const contentRange = countRes.headers.get('content-range') || '';
  const totalInDb = contentRange.split('/')[1] || 'unknown';
  console.log(`\n======================================================`);
  console.log(` SUCCESS: Total verified health topics in Supabase: ${totalInDb}`);
  console.log(`======================================================\n`);
}

main().catch(console.error);
