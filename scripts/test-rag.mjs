import { getLimits } from '../functions/_lib/config.js';
import { embedQuery, matchKnowledge, generateAnswer } from '../functions/_lib/upstream.js';

async function testFullPipeline() {
  const env = process.env;
  const L = getLimits(env);
  console.log('1. Testing embedding for query: Do vaccines cause autism?');
  const emb = await embedQuery(env, 'Do vaccines cause autism?', L);
  console.log('   Embedding success! Dimensions:', emb.length);

  console.log('2. Testing knowledge retrieval from Supabase...');
  const chunks = await matchKnowledge(env, emb, L);
  console.log('   Retrieved chunks count:', chunks.length);
  if (chunks.length > 0) {
    console.log('   Top matched topic:', chunks[0].topic, '(similarity: ' + chunks[0].similarity + ')');
  } else {
    console.log('   Warning: No chunks returned above similarity threshold.');
  }

  console.log('3. Testing generation with Gemini (gemini-flash-latest)...');
  const prompt = 'You are Swasth AI. Context:\n' + chunks.map(c => c.content).join('\n') + '\n\nAnswer: Do vaccines cause autism?';
  const ans = await generateAnswer(env, prompt, 'Do vaccines cause autism?', L);
  console.log('\n--- ANSWER GENERATED ---');
  console.log(ans);
  console.log('------------------------\n');
}

testFullPipeline().catch(console.error);
