import { getLimits, DISCLAIMER, DISCLAIMER_OR, DISCLAIMER_HI } from './config.js';
import { classify, MESSAGES, MESSAGES_OR, MESSAGES_HI, looksLikeDosage, cleanAnswer } from './safety.js';
import { getUser, bumpUsage, matchKnowledge, embedQuery, generateAnswer, UpstreamError } from './upstream.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const fixed = (kind, langOrCode = false, extra = {}) => {
  let answer = MESSAGES[kind] || '';
  let disclaimer = DISCLAIMER;
  if (langOrCode === 'hi') {
    answer = MESSAGES_HI[kind] || MESSAGES[kind];
    disclaimer = DISCLAIMER_HI;
  } else if (langOrCode === 'or' || langOrCode === true) {
    answer = MESSAGES_OR[kind] || MESSAGES[kind];
    disclaimer = DISCLAIMER_OR;
  }
  return json({
    kind,
    answer,
    sources: [],
    disclaimer,
    ...extra
  });
};

export const SYSTEM_PROMPT = `You are Swasth AI, the official rural and public health medical triage assistant for Odisha and across India.
Rules:
1. Answer ONLY using facts inside <context>. Do not use outside knowledge.
2. Structure every symptom and health inquiry answer strictly in this four-section layout:

📘 Possible Condition:
[Simple, compassionate explanation of what matches their symptoms based on context]

🏠 Safe Home Care & Relief:
- Practical, evidence-based home care (e.g. clean boiled water, ORS rehydration, rest, cool cloth compress)
- Actionable steps available in every rural home without buying random drugs

⚠️ Warning Signs to Watch:
- Clear red flag danger signs that require urgent hospital visit

🏥 When to See a Doctor:
- Direct them to the nearest Sub-Centre / PHC / CHC or village ASHA didi, or call 108 ambulance if danger signs appear

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
  * For hydration: "ବାରମ୍ବାର ପାଣି, ଲେମ୍ବୁ ପାଣି ବା ଓଆରଏସ (ORS) ଘୋଳ ପିଅନ୍ତୁ"
  * For rest: "ଘରେ ଭଲରେ ବିଶ୍ରାମ ନିଅନ୍ତୁ"
  * For fever: "ମଥାରେ ସଫା ଓଦା କପଡ଼ା ପଟି ପକାନ୍ତୁ"
  * For warning signs: "ଯଦି ୩ ଦିନରୁ ଅଧିକ ଜ୍ୱର ରହେ, ଛାତି କଷ୍ଟ ହୁଏ ବା ବାରମ୍ବାର ବାନ୍ତି ହୁଏ"
  * For hospital: "ଡେରି ନକରି ପାଖ ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC) କିମ୍ବା ଆଶା ଦିଦିଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ ଏବଂ ଜରୁରୀ ପରିସ୍ଥିତିରେ ୧୦୮ ଆମ୍ବୁଲାନ୍ସ ଡାକନ୍ତୁ"
Use these 4 Odia section headers:
📘 ସମ୍ଭାବ୍ୟ କାରଣ:
🏠 ଘରୋଇ ଉପଚାର ଓ ଯତ୍ନ:
⚠️ ବିପଦର ଲକ୍ଷଣ:
🏥 ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ:

8. Hindi Regional Language Rule:
If the user communicates in Hindi script (हिन्दी) or requests Hindi:
Provide the complete answer in 100% pure, natural, empathetic everyday conversational Hindi (आम बोलचाल की हिन्दी).
CRITICAL RULES FOR HINDI:
- NEVER mix English letters or English words in Hindi mode. Every single word must be in Devanagari Hindi script.
- Do NOT use difficult, hyper-formal Sanskritized words (कठिन शब्द न लिखें).
- Use simple words that every common citizen easily understands:
  * For hydration: "बार-बार उबला हुआ पानी, नींबू पानी या ओआरएस का घोल पिएं"
  * For rest: "घर पर पूरा आराम करें"
  * For fever: "माथे पर साफ गीले कपड़े की पट्टी रखें"
  * For warning signs: "यदि 3 दिन से अधिक तेज बुखार रहे, सांस लेने में तकलीफ हो या बार-बार उल्टी हो"
  * For hospital: "देरी न करें, तुरंत नजदीकी सरकारी अस्पताल (सामुदायिक स्वास्थ्य केंद्र) या आशा दीदी से संपर्क करें अथवा 108 एम्बुलेंस बुलाएं"
Use these 4 Hindi section headers:
📘 संभावित कारण:
🏠 सुरक्षित घरेलू देखभाल और तरल पदार्थ:
⚠️ खतरे के लक्षण (चेतावनी संकेत):
🏥 डॉक्टर से परामर्श:
Keep the answer concise (under 75 words), warm, respectful, and crystal-clear.`;

const ODIA_KEYWORD_MAP = [
  [/ମୁଣ୍ଡ\s*(ବିନ୍ଧା|ବଥା|ଘୋଳାଉଛି|ବିନ୍ଧୁଛି|ବୁଲାଉଛି|ଘୁରାଉଛି|ଭାରି)|munda\s*(bindha|bitha|ghurauchi|bulauchi)/i, 'headache migraine dizziness'],
  [/ଜ୍ୱର|ତାତି|ଫିଭର|କମ୍ପନ|ଥଣ୍ଡା\s*ଲାଗି\s*ଜ୍ୱର|jwara|jwar|fever|tati/i, 'fever temperature high fever chills malaria dengue'],
  [/ପେଟ\s*(କାଟିବା|କାଟୁଛି|ବଥା|ଯନ୍ତ୍ରଣା|ମୋଡ଼ିବା|ଫୁଲିବା|ଘୋଳାଉଛି|ଗ୍ୟାସ)|peta\s*(katuchi|gholauchi|bitha|dard|kharab)/i, 'abdominal stomach pain colic cramps gastritis'],
  [/ଝାଡ଼ା|ପତଳା\s*ଝାଡ଼ା|ପାଣି\s*ଝାଡ଼ା|ଦାସ୍ତ|jhada|patala jhada/i, 'diarrhoea loose motion dehydration ORS fluids'],
  [/ବାନ୍ତି|ଓକାଳ|ବାନ୍ତି\s*ଲାଗିବା|banti|okala/i, 'vomiting nausea rehydration'],
  [/କାଶ|ଖଙ୍କାର|କଫ|ଘର\s*ଘର|ଛାତିରେ\s*କଫ|kasa|kafa|khankara/i, 'cough respiratory phlegm bronchitis'],
  [/ଥଣ୍ଡା|ସର୍ଦ୍ଦି|ନାକରୁ\s*ପାଣି|thanda|sardi/i, 'cold flu running nose viral'],
  [/ଗଳା\s*(ଯନ୍ତ୍ରଣା|ବିନ୍ଧା|କୁଣ୍ଡେଇବା|ଫୁଲିବା)|ତଣ୍ଟି\s*(ବଥା|କୁଣ୍ଡେଇ)|tanti|gala bitha/i, 'sore throat pharyngitis throat infection tonsillitis'],
  [/ଆଖି\s*(ନାଲି|ରକ୍ତ|ପାଣି|କୁଣ୍ଡେଇ|ଫୁଲିବା|ଧରିବା|ଲାଲ୍)|ନେତ୍ର|ଗୁହମନୀ|ମୋତିଆବିନ୍ଦୁ|aankhi\s*(nali|lal|pani|kundai|phuliba)/i, 'eye conjunctivitis red eye discharge cataract stye ophthalmology'],
  [/କାନ\s*(ବିନ୍ଧା|ପାଚିବା|ପୂଜ|ପାଣି\s*ବାହାରିବା)|kan\s*pakiba|kana bitha/i, 'earache ear discharge infection otitis media'],
  [/ମୁଖ\s*ଘା|ପାଟି\s*ଘା|ପାଟି\s*ଫିଟୁନି|ଜିଭ\s*ଘା|ତମାଖୁ|ଗୁଟ୍‌ଖା|mukha gha|pati gha/i, 'mouth ulcer canker sore aphthous leukoplakia oral cancer OSMF'],
  [/ପରିସ୍ରା\s*(ପୋଡ଼ା|ଜଳା|କମ|ହଳଦିଆ|ରକ୍ତ)|parisra poda/i, 'urinary tract infection UTI dehydration burning urination jaundice'],
  [/ଗଣ୍ଠି\s*(ବିନ୍ଧା|ଫୁଲିବା)|ଆଣ୍ଠୁ\s*ଗଣ୍ଠି|ବାତ|ଗୋଡ଼\s*ହାତ\s*ବିନ୍ଧା|ganthi bitha|anthu/i, 'joint pain arthritis chikungunya swelling gout'],
  [/ଏସିଡିଟି|ଛାତି\s*ପୋଡ଼ା|ଗ୍ୟାସ|ଅଜୀର୍ଣ୍ଣ|ଖଟା\s*ଢେକୁର|gas|acidity/i, 'acidity heartburn GERD reflux indigestion'],
  [/ଡେଙ୍ଗୁ|dengue/i, 'dengue mosquito fever platelets'],
  [/ମ୍ୟାଲେରିଆ|କମ୍ପ\s*ଜ୍ୱର|malaria/i, 'malaria chills fever blood smear testing'],
  [/କୁକୁର\s*(କାମୁଡ଼|ରାମ୍ପୁଡ଼)|ବିଲେଇ\s*କାମୁଡ଼|ପଶୁ\s*କାମୁଡ଼|ରେବିସ୍|kukura kamuda/i, 'dog bite rabies animal bite wash with soap anti-rabies vaccine ARV'],
  [/ସାପ\s*କାମୁଡ଼|ବିଛା|ନାଗ|sapa kamuda/i, 'snake bite scorpion sting venom poison first aid anti-venom'],
  [/ପୋଡ଼ି\s*(ଯାଇଛି|ଗଲା)|ଫୋଟକା|ପୋଡ଼ାଜଳା|ନିଆଁ|porajala|podi gala/i, 'burn scald thermal blister first aid cool clean water'],
  [/ଗର୍ଭାବସ୍ଥା|ଗର୍ଭବତୀ|ପ୍ରସବ|ଛୁଆ\s*ପେଟରେ|garbhabati/i, 'pregnancy maternal antenatal danger signs IFA tablets ASHA'],
  [/ଅଂଶୁଘାତ|ଖରା\s*ତାତି|ଲୁ|ଗ୍ରୀଷ୍ମ|ansughata|loo/i, 'heat stroke sunstroke dehydration heat exhaustion ORS'],
  [/ଚର୍ମ\s*(କୁଣ୍ଡେଇ|ଫୋଟକା|ଦାଗ|ରାସ)|ଦାଦ|କାଛୁ|କୁଣ୍ଡିଆ|ଚର୍ମ\s*ରୋଗ|kandu|dada/i, 'skin rash itching allergy tinea ringworm scabies eczema'],
  [/ପାଣି|ଜଳ|ଓଆରଏସ|ଖାଦ୍ୟ|ପୁଷ୍ଟିକର|କୁପୋଷଣ/i, 'ORS hydration clean drinking water fluids nutrition Anganwadi'],
  [/ଶିଶୁ|ପିଲା|ନବଜାତ|ଛୁଆ|କାମଳ|ଡାଏପର|କ୍ଷୀର\s*ଖାଉନି|shishu|nabajata/i, 'child infant newborn neonatal jaundice Kramer breastfeeding dehydration SNCU'],
  [/ନଖ\s*(ଧଳା|ଫିକା|କୁଣ୍ଡେଇ|ବିନ୍ଧା)|ରକ୍ତହୀନତା|ହିମୋଗ୍ଲୋବିନ୍|ରକ୍ତ\s*କମ|nakha dhala|raktahinata/i, 'nail anemia pallor iron deficiency hemoglobin IFA Anganwadi'],
  [/ମନ\s*ଭଲ\s*ଲାଗୁନି|ଚିନ୍ତା|ଉଦାସ|ନିଦ\s*ହେଉନି/i, 'mental health depression anxiety Tele-MANAS 14416'],
];

const HINDI_KEYWORD_MAP = [
  [/सिर\s*(दर्द|घूमना|भारी|चक्कर)|माइग्रेन|sir\s*(dard|chakar)/i, 'headache migraine dizziness'],
  [/बुखार|तापमान|फीवर|तप|कपकपी|bukhar|fever/i, 'fever temperature high fever chills malaria dengue'],
  [/पेट\s*(दर्द|खराब|मरोड़|ऐंठन|फूलना|गैस)|pet\s*(dard|kharab)/i, 'abdominal stomach pain colic cramps gastritis'],
  [/दस्त|पेचिश|पतला\s*शौच|लूज\s*मोशन|dast|loose motion/i, 'diarrhoea loose motion dehydration ORS fluids'],
  [/उल्टी|मतली|जी\s*मिचलाना|ulti/i, 'vomiting nausea rehydration'],
  [/खांसी|कफ|बलगम|छाती\s*में\s*जकड़न|khansi|balgam/i, 'cough respiratory phlegm bronchitis'],
  [/जुकाम|सर्दी|नाक\s*बहना|nazla|sardi/i, 'cold flu running nose viral'],
  [/गले\s*में\s*(दर्द|खराश|सूजन|कांटे)|gala dard/i, 'sore throat pharyngitis throat infection tonsillitis'],
  [/आंख\s*(लाल|पानी|दर्द|कीचड़|फूलना|आना)|नेत्र|गुहमनी|मोतियाबिंद|aankh lal/i, 'eye conjunctivitis red eye discharge cataract stye ophthalmology'],
  [/कान\s*(दर्द|पकना|बहना|मवाद)|kan dard/i, 'earache ear discharge infection otitis media'],
  [/मुंह\s*में\s*(छाले|घाव|दर्द)|मुंह\s*नहीं\s*खुलना|गुटखा|तंबाकू|muh ke chhale/i, 'mouth ulcer canker sore aphthous leukoplakia oral cancer OSMF'],
  [/पेशाब\s*(में\s*जलन|कम|पीला|खून)|peshab jalan/i, 'urinary tract infection UTI dehydration burning urination jaundice'],
  [/जोड़ों\s*में\s*दर्द|गठिया|घुटने|जोड़\s*सूजन|हड्डी\s*दर्द|jodon me dard/i, 'joint pain arthritis chikungunya swelling gout'],
  [/एसिडिटी|सीने\s*में\s*जलन|गैस|खट्टी\s*डकार|pet gas/i, 'acidity heartburn GERD reflux indigestion'],
  [/डेंगू|dengue/i, 'dengue mosquito fever platelets'],
  [/मलेरिया|ठंड\s*लगकर\s*बुखार|malaria/i, 'malaria chills fever blood smear testing'],
  [/कुत्ते\s*ने\s*(काटा|खरोंचा)|बिल्ली|जानवर\s*काटा|रेबीज|kutta kata/i, 'dog bite rabies animal bite wash with soap anti-rabies vaccine ARV'],
  [/सांप\s*(ने\s*)?काटा|बिच्छू|जहर|zeher/i, 'snake bite scorpion sting venom poison first aid anti-venom'],
  [/जल\s*गया|जलन|फफोला|आग\s*से|jal gaya/i, 'burn scald thermal blister first aid cool clean water'],
  [/गर्भावस्था|गर्भवती|प्रसव|बच्चा\s*पेट\s*में|garbhavastha/i, 'pregnancy maternal antenatal danger signs IFA tablets ASHA'],
  [/लू\s*लगना|गर्मी|धूप|चक्कर|loo lagna/i, 'heat stroke sunstroke dehydration heat exhaustion ORS'],
  [/खुजली|दाद|चकत्ते|त्वचा|फोड़े|फुंसी|khujli|daad/i, 'skin rash itching allergy tinea ringworm scabies eczema'],
  [/ओआरएस|पानी|तरल|घोल|पोषण/i, 'ORS hydration clean drinking water fluids nutrition Anganwadi'],
  [/बच्चा|शिशु|नवजात|पीलिया|दूध\s*नहीं\s*पी\s*रहा|shishu/i, 'child infant newborn neonatal jaundice Kramer breastfeeding dehydration SNCU'],
  [/नाखून\s*(सफेद|पीले|चम्मच)|एनीमिया|खून\s*की\s*कमी|nakhun safed/i, 'nail anemia pallor iron deficiency hemoglobin IFA Anganwadi'],
  [/उदास|तनाव|डिप्रेशन|नींद\s*नहीं/i, 'mental health depression anxiety Tele-MANAS 14416'],
];

export function normalizeOdiaQuery(text) {
  if (!/[\u0B00-\u0B7F]/.test(text)) return text;
  const extras = [];
  for (const [regex, terms] of ODIA_KEYWORD_MAP) {
    if (regex.test(text)) extras.push(terms);
  }
  return extras.length ? `${text} ${extras.join(' ')}` : text;
}

export function normalizeHindiQuery(text) {
  if (!/[\u0900-\u097F]/.test(text)) return text;
  const extras = [];
  for (const [regex, terms] of HINDI_KEYWORD_MAP) {
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

  // 1) Who is asking? Must be a signed-in user with a VERIFIED email OR a Guest session (5 chats/day).
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  const token = m[1].trim();
  const isGuest = /^guest[_\:]/i.test(token);
  const GUEST_DAILY_LIMIT = 5;

  try {
    let user;
    if (isGuest) {
      user = { id: token.slice(0, 64), email_confirmed_at: '2026-01-01', is_guest: true };
    } else {
      user = await getUser(env, token, L);
      if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);
      if (!(user.email_confirmed_at || user.confirmed_at))
        return json({ error: 'email_not_verified', message: 'Please verify your email first.' }, 403);
    }

    // 2) Validate the request.
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > L.MAX_BODY_BYTES) return json({ error: 'too_large', message: 'Request is too large.' }, 413);
    let body;
    try { body = JSON.parse(await request.text()); } catch { return json({ error: 'bad_request', message: 'Invalid request.' }, 400); }
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ error: 'bad_request', message: 'Please type a question.' }, 400);
    if (message.length > L.MAX_MESSAGE_CHARS)
      return json({ error: 'too_long', message: `Please keep your question under ${L.MAX_MESSAGE_CHARS} characters.` }, 400);

    // 3) Language Detection & Safety router (no AI, no quota used).
    const reqLang = typeof body?.lang === 'string' ? body.lang.toLowerCase() : '';
    const hasOdiaScript = /[\u0B00-\u0B7F]/.test(message);
    const hasHindiScript = /[\u0900-\u097F]/.test(message);

    let isOdia = false;
    let isHindi = false;
    if (reqLang === 'or') {
      isOdia = true;
    } else if (reqLang === 'hi') {
      isHindi = true;
    } else if (reqLang === 'en') {
      isOdia = false;
      isHindi = false;
    } else if (hasOdiaScript) {
      isOdia = true;
    } else if (hasHindiScript) {
      isHindi = true;
    }
    const langCode = isOdia ? 'or' : (isHindi ? 'hi' : 'en');

    const verdict = classify(message);
    if (verdict.type !== 'ok') return fixed(verdict.type, langCode);

    // 4) Daily limits (protect free quotas).
    const limit = isGuest ? GUEST_DAILY_LIMIT : L.USER_DAILY_LIMIT;
    const rateKey = isGuest ? `guest:${user.id}` : `user:${user.id}`;
    const u = await bumpUsage(env, rateKey, limit, L);
    if (u === -1) {
      const limitMsg = isGuest
        ? "You have reached today's limit of 5 guest questions. Please sign in or create a free account to continue."
        : `You have reached today's limit of ${L.USER_DAILY_LIMIT} questions. Please come back tomorrow.`;
      return json({ error: isGuest ? 'guest_limit' : 'user_limit', message: limitMsg }, 429);
    }
    const g = await bumpUsage(env, 'global', L.GLOBAL_DAILY_LIMIT, L);
    if (g === -1) return json({ error: 'global_limit', message: 'The service is very busy today. Please try again tomorrow.' }, 429);
    const remaining = limit - u;

    // 5) Retrieve verified knowledge.
    const searchMsg = isHindi ? normalizeHindiQuery(message) : (isOdia ? normalizeOdiaQuery(message) : message);
    const embedding = await embedQuery(env, searchMsg, L);
    const chunks = await matchKnowledge(env, embedding, L);
    if (!Array.isArray(chunks) || chunks.length === 0) return fixed('no_answer', langCode, { remaining });

    // 6) Generate, then check the output.
    let userPrompt;
    if (isHindi) {
      userPrompt = `Question (Please respond strictly in 100% pure, natural Hindi language with zero English words or other scripts as per guidelines):\n${message}`;
    } else if (isOdia) {
      userPrompt = `Question (Please respond strictly in 100% pure Odia language as per Odisha regional rules with zero English words):\n${message}`;
    } else {
      userPrompt = `Question (Please respond strictly in 100% clear English with zero Odia or Hindi script):\n${message}`;
    }

    const raw = await generateAnswer(env, buildPrompt(chunks), userPrompt, L);
    const answer = cleanAnswer(raw);
    if (!answer || /NO_ANSWER/.test(answer) || looksLikeDosage(answer)) return fixed('no_answer', langCode, { remaining });

    // Sources come from our database, never from the model.
    const seen = new Set();
    const sources = chunks.filter((c) => !seen.has(c.source_name) && seen.add(c.source_name))
      .map((c) => ({ name: c.source_name, url: /^https?:\/\//.test(c.source_url || '') ? c.source_url : null, date: c.source_date || null }));
    
    const disclaimer = isHindi ? DISCLAIMER_HI : (isOdia ? DISCLAIMER_OR : DISCLAIMER);
    return json({ kind: 'answer', answer, sources, disclaimer, remaining });
  } catch (e) {
    if (e instanceof UpstreamError) {
      console.error('upstream error', e.where, e.status, e.detail || '');
      return json({ error: 'upstream', message: 'The service is busy right now. Please try again in a minute.' }, 503);
    }
    console.error('unexpected error', e && e.message);
    return json({ error: 'server_error', message: 'Something went wrong. Please try again.' }, 500);
  }
}
