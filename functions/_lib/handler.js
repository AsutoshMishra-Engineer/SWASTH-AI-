import { getLimits, DISCLAIMER, DISCLAIMER_OR } from './config.js';
import { classify, MESSAGES, MESSAGES_OR, looksLikeDosage, cleanAnswer } from './safety.js';
import { getUser, bumpUsage, matchKnowledge, embedQuery, generateAnswer, UpstreamError } from './upstream.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const fixed = (kind, isOdia = false, extra = {}) =>
  json({
    kind,
    answer: (isOdia ? MESSAGES_OR[kind] : MESSAGES[kind]) || MESSAGES[kind],
    sources: [],
    disclaimer: isOdia ? DISCLAIMER_OR : DISCLAIMER,
    ...extra
  });

export const SYSTEM_PROMPT = `You are Swasth AI, a trusted public-health assistant for people in Odisha, India.
Rules:
1. Answer ONLY using facts inside <context>. Do not use outside knowledge.
2. Structure every symptom and health inquiry answer strictly in this four-section layout:

📘 Possible Condition:
[Simple, compassionate explanation of what matches their symptoms based on context]

🏠 Safe Home Care & Relief:
- Step 1 (e.g. hydration, cold/warm compress, rest, practical non-medicinal relief)
- Step 2 (what to do right now)

⚠️ Warning Signs to Watch:
- Red flags that mean it is getting worse

🏥 When to See a Doctor:
- Visit Community Health Centre or call 108 if danger signs appear

3. If the context does not clearly relate to their question, reply with exactly: NO_ANSWER
4. Never give a definitive diagnosis, never prescribe medicines, and never state drug doses.
5. Plain text only (no asterisks, no markdown symbols).
6. If the person describes severe danger signs, advise emergency hospital care immediately (call 108).
7. Odisha Regional & Spoken Language Rule:
If the user communicates in Odia script (ଓଡ଼ିଆ) or transliterated Odia (e.g. "munda bindhuchi", "peta gholauchi", "jwara achi", "jhada banti") or requests Odia:
Provide the complete answer in 100% pure, natural, warm everyday conversational Odia (କଥିତ ଓଡ଼ିଆ) as spoken by an affectionate Odia ASHA didi or caring doctor in Odisha.
CRITICAL RULES FOR ODIA:
- NEVER mix English letters or English words in Odia mode. Every single word and character must be in natural Odia script (ଓଡ଼ିଆ).
- NEVER do literal word-for-word translation from English.
- NEVER use robotic Sanskritized words (do NOT use ମୌଖିକ, ଚିକିତ୍ସାଳୟ, ପ୍ରାରମ୍ଭିକ, ପୁନର୍ଜଳୀକରଣ, ଦ୍ରବଣ).
- Use everyday colloquial Odia words that every villager, grandmother, and youth in Odisha easily understands:
  * For hydration: "ବାରମ୍ବାର ପାଣି, ଲେମ୍ବୁ ପାଣି ବା ଓଆରଏସ ଘୋଳ ପିଅନ୍ତୁ"
  * For rest: "ଘରେ ଭଲରେ ବିଶ୍ରାମ ନିଅନ୍ତୁ"
  * For fever: "ମଥାରେ ସଫା ଓଦା କପଡ଼ା ପଟି ପକାନ୍ତୁ"
  * For warning signs: "ଯଦି ୩ ଦିନରୁ ଅଧିକ ଜ୍ୱର ରହେ, ଛାତି କଷ୍ଟ ହୁଏ ବା ବାରମ୍ବାର ବାନ୍ତି ହୁଏ"
  * For hospital: "ଡେରି ନକରି ପାଖ ସରକାରୀ ଡାକ୍ତରଖାନାକୁ ଯାଆନ୍ତୁ ବା ୧୦୮ ଆମ୍ବୁଲାନ୍ସ ଡାକନ୍ତୁ"
Use these 4 Odia section headers:
📘 ସମ୍ଭାବ୍ୟ କାରଣ:
🏠 ଘରୋଇ ଉପଚାର ଓ ଯତ୍ନ:
⚠️ ବିପଦର ଲକ୍ଷଣ:
🏥 ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ:
Keep the answer concise (under 75 words), warm, respectful, and crystal-clear.`;

const ODIA_KEYWORD_MAP = [
  [/ମୁଣ୍ଡ\s*(ବିନ୍ଧା|ବଥା|ଘୋଳାଉଛି|ବିନ୍ଧୁଛି)/, 'headache migraine'],
  [/ଜ୍ୱର|ତାତି|ଫିଭର/, 'fever temperature high fever'],
  [/ପେଟ\s*(କାଟିବା|କାଟୁଛି|ବଥା|ଯନ୍ତ୍ରଣା|ମୋଡ଼ିବା)/, 'abdominal stomach pain colic cramps'],
  [/ଝାଡ଼ା|ପତଳା\s*ଝାଡ଼ା/, 'diarrhoea loose motion dehydration'],
  [/ବାନ୍ତି|ଓକାଳ/, 'vomiting nausea'],
  [/କାଶ|ଖଙ୍କାର/, 'cough respiratory'],
  [/ଥଣ୍ଡା|ସର୍ଦ୍ଦି/, 'cold flu running nose'],
  [/ଗଳା\s*(ଯନ୍ତ୍ରଣା|ବିନ୍ଧା|କୁଣ୍ଡେଇବା)|ତଣ୍ଟି/, 'sore throat pharyngitis throat infection'],
  [/ଆଖି\s*(ନାଲି|ରକ୍ତ|ପାଣି|କୁଣ୍ଡେଇ)/, 'eye conjunctivitis red eye discharge'],
  [/ପରିସ୍ରା\s*(ପୋଡ଼ା|ଜଳା|କମ)/, 'urinary tract infection UTI dehydration burning urination'],
  [/ଗଣ୍ଠି\s*(ବିନ୍ଧା|ଫୁଲିବା)|ଆଣ୍ଠୁ/, 'joint pain arthritis chikungunya swelling'],
  [/ଏସିଡିଟି|ଛାତି\s*ପୋଡ଼ା|ଗ୍ୟାସ/, 'acidity heartburn GERD reflux indigestion'],
  [/ଡେଙ୍ଗୁ/, 'dengue mosquito fever'],
  [/ମ୍ୟାଲେରିଆ/, 'malaria chills fever'],
  [/କୁକୁର\s*କାମୁଡ଼/, 'dog bite rabies animal bite wash with soap'],
  [/ସାପ\s*କାମୁଡ଼|ବିଛା/, 'snake bite scorpion sting venom poison first aid'],
  [/ଗର୍ଭାବସ୍ଥା|ଗର୍ଭବତୀ/, 'pregnancy maternal antenatal danger signs'],
  [/ଅଂଶୁଘାତ|ଖରା\s*ତାତି|ଲୁ/, 'heat stroke sunstroke dehydration heat exhaustion'],
  [/ଚର୍ମ\s*(କୁଣ୍ଡେଇ|ଫୋଟକା|ଦାଗ|ରାସ)/, 'skin rash itching allergy'],
  [/ପାଣି|ଜଳ|ଓଆରଏସ|ଓ\.ଆର\.ଏସ/, 'ORS hydration clean drinking water fluids'],
  [/ଶିଶୁ|ପିଲା|ନବଜାତ/, 'child infant newborn breastfeeding'],
];

export function normalizeOdiaQuery(text) {
  if (!/[\u0B00-\u0B7F]/.test(text)) return text;
  const extras = [];
  for (const [regex, terms] of ODIA_KEYWORD_MAP) {
    if (regex.test(text)) extras.push(terms);
  }
  return extras.length ? `${text} ${extras.join(' ')}` : text;
}

export function buildPrompt(chunks) {
  const ctx = chunks.map((c, i) => `[${i + 1}] ${c.topic}: ${c.content}`).join('\n');
  return `${SYSTEM_PROMPT}\n\n<context>\n${ctx}\n</context>`;
}

export async function handleChat(request, env) {
  const L = getLimits(env);
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'])
    if (!env[k]) return json({ error: 'server_misconfigured', message: 'Server is not configured yet.' }, 500);

  // 1) Who is asking? Must be a signed-in user with a VERIFIED email.
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  try {
    const user = await getUser(env, m[1], L);
    if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);
    if (!(user.email_confirmed_at || user.confirmed_at))
      return json({ error: 'email_not_verified', message: 'Please verify your email first.' }, 403);

    // 2) Validate the request.
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > L.MAX_BODY_BYTES) return json({ error: 'too_large', message: 'Request is too large.' }, 413);
    let body;
    try { body = JSON.parse(await request.text()); } catch { return json({ error: 'bad_request', message: 'Invalid request.' }, 400); }
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ error: 'bad_request', message: 'Please type a question.' }, 400);
    if (message.length > L.MAX_MESSAGE_CHARS)
      return json({ error: 'too_long', message: `Please keep your question under ${L.MAX_MESSAGE_CHARS} characters.` }, 400);

    // 3) Safety router (no AI, no quota used).
    const isOdia = (typeof body?.lang === 'string' && body.lang === 'or') || /[\u0B00-\u0B7F]/.test(message);
    const verdict = classify(message);
    if (verdict.type !== 'ok') return fixed(verdict.type, isOdia);

    // 4) Daily limits (protect free quotas).
    const u = await bumpUsage(env, `user:${user.id}`, L.USER_DAILY_LIMIT, L);
    if (u === -1) return json({ error: 'user_limit', message: `You have reached today's limit of ${L.USER_DAILY_LIMIT} questions. Please come back tomorrow.` }, 429);
    const g = await bumpUsage(env, 'global', L.GLOBAL_DAILY_LIMIT, L);
    if (g === -1) return json({ error: 'global_limit', message: 'The service is very busy today. Please try again tomorrow.' }, 429);
    const remaining = L.USER_DAILY_LIMIT - u;

    // 5) Retrieve verified knowledge.
    const searchMsg = normalizeOdiaQuery(message);
    const embedding = await embedQuery(env, searchMsg, L);
    const chunks = await matchKnowledge(env, embedding, L);
    if (!Array.isArray(chunks) || chunks.length === 0) return fixed('no_answer', isOdia, { remaining });

    // 6) Generate, then check the output.
    const userPrompt = isOdia
      ? `Question (Please respond strictly in 100% pure Odia language as per Odisha regional rules with zero English words):\n${message}`
      : `Question (Please respond strictly in 100% clear English with zero Odia script):\n${message}`;
    const raw = await generateAnswer(env, buildPrompt(chunks), userPrompt, L);
    const answer = cleanAnswer(raw);
    if (!answer || /NO_ANSWER/.test(answer) || looksLikeDosage(answer)) return fixed('no_answer', isOdia, { remaining });

    // Sources come from our database, never from the model.
    const seen = new Set();
    const sources = chunks.filter((c) => !seen.has(c.source_name) && seen.add(c.source_name))
      .map((c) => ({ name: c.source_name, url: /^https?:\/\//.test(c.source_url || '') ? c.source_url : null, date: c.source_date || null }));
    return json({ kind: 'answer', answer, sources, disclaimer: isOdia ? DISCLAIMER_OR : DISCLAIMER, remaining });
  } catch (e) {
    if (e instanceof UpstreamError) {
      console.error('upstream error', e.where, e.status, e.detail || '');
      return json({ error: 'upstream', message: 'The service is busy right now. Please try again in a minute.' }, 503);
    }
    console.error('unexpected error', e && e.message);
    return json({ error: 'server_error', message: 'Something went wrong. Please try again.' }, 500);
  }
}
