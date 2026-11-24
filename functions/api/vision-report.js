import { getLimits, DISCLAIMER, DISCLAIMER_OR, DISCLAIMER_HI } from '../_lib/config.js';
import { getUser, UpstreamError } from '../_lib/upstream.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const gbase = (env) => (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

async function timedFetch(url, init, ms, where) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  catch (e) { throw new UpstreamError(where, e.name === 'AbortError' ? 'timeout' : 'network', String(e.message || e)); }
  finally { clearTimeout(t); }
}

function stripEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F2FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function onRequestPost({ request, env }) {
  const L = getLimits(env);
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY']) {
    if (!env[k]) return json({ error: 'server_misconfigured', message: 'Server is not configured yet.' }, 500);
  }

  // 1) Verify user authentication (supports verified session or guest)
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  const token = m[1].trim();
  const isGuest = /^guest[_\:]/i.test(token);
  let reqLang = 'en';

  try {
    let user;
    if (isGuest) {
      user = { id: token.slice(0, 64), email_confirmed_at: '2026-01-01', is_guest: true };
    } else {
      user = await getUser(env, token, L);
      if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);
    }

    // 2) Parse request payload
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request', message: 'Invalid payload.' }, 400); }

    const rawImage = typeof body?.image === 'string' ? body.image.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 300) : '';
    reqLang = typeof body?.lang === 'string' ? body.lang.toLowerCase() : 'en';
    const reportType = typeof body?.reportType === 'string' ? body.reportType.toLowerCase() : 'auto';

    if (!rawImage) {
      return json({ error: 'bad_request', message: 'No report image provided. Please capture or upload a clear photo of your prescription or lab test report.' }, 400);
    }

    // Limit base64 image size to ~4MB max
    if (rawImage.length > 4 * 1024 * 1024) {
      return json({ error: 'too_large', message: 'Image file is too large. Please upload an image under 4 MB.' }, 413);
    }

    const base64Data = rawImage.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const isOr = reqLang === 'or';
    const isHi = reqLang === 'hi';

    const langHeading = isOr
      ? `Respond strictly and entirely in pure Odia (ଓଡ଼ିଆ). Use these 4 exact Odia headings:
1. ପରୀକ୍ଷା ଫଳାଫଳ ଓ ମୁଖ୍ୟ ତଥ୍ୟ: (List identified test names, observed values, and normal ranges)
2. ସରଳ ବ୍ୟାଖ୍ୟା (ଏହାର ଅର୍ଥ କ'ଣ?): (Explain in simple, encouraging Odia what the numbers mean)
3. ପଥ୍ୟ, ଖାଦ୍ୟ ଓ ସୁରକ୍ଷିତ ଜୀବନଶୈଳୀ: (Provide safe non-drug dietary guidance e.g. iron-rich foods, hydration)
4. ଡାକ୍ତରଙ୍କୁ ପଚାରିବାକୁ ଥିବା ଜରୁରୀ ପ୍ରଶ୍ନ: (2-3 key questions for the patient's next doctor visit)`
      : (isHi
        ? `Respond strictly and entirely in pure Hindi (हिन्दी). Use these 4 exact Hindi headings:
1. जाँच परिणाम और मुख्य विवरण: (List identified test names, observed values, and normal ranges)
2. सरल भाषा में अर्थ (इसका क्या मतलब है?): (Explain in simple Hindi what the numbers mean)
3. खान-पान, पोषण और सुरक्षित देखभाल: (Provide safe non-drug dietary and lifestyle advice)
4. डॉक्टर से पूछने योग्य महत्वपूर्ण प्रश्न: (2-3 key questions for the patient's next doctor visit)`
        : `Respond clearly in plain English using these 4 exact headings:
1. Identified Tests & Summary Values: (List identified test names, observed values, and normal ranges)
2. Plain-Language Explanation (What This Means): (Explain what the numbers mean in simple everyday terms)
3. Nutrition, Safe Diet & Lifestyle Care: (Provide evidence-based non-pharmacological dietary tips)
4. Key Questions to Ask Your Doctor: (2-3 specific empowering questions for the patient's next clinic visit)`);

    const promptText = `You are Swasth AI, an expert clinical diagnostic document explainer and public health companion for Odisha and India.
Analyze the user's uploaded medical image with high OCR accuracy and clinical comprehension. The image is a ${reportType === 'prescription' ? 'Doctor Prescription / OPD slip' : (reportType === 'lab_test' ? 'Pathology / Diagnostic Lab Test Report' : 'Doctor Prescription or Diagnostic Lab Test Report')}.
User notes/symptoms: "${notes || 'None noted'}".

CRITICAL CLINICAL SAFETY & STYLE RULES:
- NO EMOJIS OR ICONS: Do NOT use any emojis, emoticons, or icons anywhere in your response. Write clean, formal, clear clinical language.
- STRICT PROHIBITION: DO NOT change, adjust, or recommend prescription medicine dosages.
- Explicitly emphasize: "Never alter or stop prescribed medicines without your doctor's instruction."
- For Lab Reports (CBC, Hemoglobin, Blood Sugar, Lipid Profile, Liver/Kidney/Thyroid function, Urine):
  * Accurately transcribe test names, patient values, and reference intervals.
  * Clearly label whether values are within Normal Range, Low, or High.
  * Demystify clinical jargon (e.g. explain Hemoglobin in terms of red blood cell count and anemia; Fasting Blood Sugar in terms of glycemic control; Creatinine in terms of kidney filter efficiency).
  * If the image is partially blurry or handwritten, clearly mention what was deciphered with confidence and what requires confirmation from the physical clinic.
- Non-drug dietary support: Recommend wholesome, culturally appropriate Indian/Odisha nutrition (e.g. for low hemoglobin: green leafy vegetables, drumstick leaves / sajana saga, dates, jaggery, beetroot; for borderline high blood sugar: avoid sweetened beverages, prefer whole millets/mandia, fiber-rich vegetables).

${langHeading}

Conclude with the certified health disclaimer.`;

    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      env.GEMINI_VISION_MODEL,
      'gemini-3-flash-preview',
      'gemini-flash-latest'
    ].filter(Boolean);

    let adviceText = '';
    for (const model of [...new Set(modelsToTry)]) {
      try {
        const res = await timedFetch(`${gbase(env)}/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: promptText }
              ]
            }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 1600
            }
          })
        }, 15000, 'vision-report');

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts;
          adviceText = Array.isArray(parts) ? parts.map((p) => p.text || '').join('').trim() : '';
          if (adviceText) break;
        }
      } catch (e) {
        console.warn('Vision report attempt failed with model', model, e && e.message);
      }
    }

    if (!adviceText) {
      throw new UpstreamError('vision-report', 'no_analysis', 'Could not read or analyze report document');
    }

    const disclaimer = isOr ? DISCLAIMER_OR : (isHi ? DISCLAIMER_HI : DISCLAIMER);
    return json({
      kind: 'report_explanation',
      answer: stripEmojis(adviceText),
      disclaimer,
      lang: reqLang
    });

  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('Vision report upstream error:', err.where, err.status, err.detail);
      const isOr = reqLang === 'or';
      const isHi = reqLang === 'hi';
      const busyMsg = isHi
        ? 'मेडिकल रिपोर्ट विश्लेषण सेवा इस समय व्यस्त है। कृपया कुछ क्षण बाद पुनः प्रयास करें।'
        : (isOr
          ? 'ଡାକ୍ତରୀ ରିପୋର୍ଟ ବିଶ୍ଳେଷଣ ସେବା ଏହି ମୁହୂର୍ତ୍ତରେ ବ୍ୟସ୍ତ ଅଛି । ଦୟାକରି କିଛି ସମୟ ପରେ ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ ।'
          : 'Medical vision service is momentarily busy. Please try again in a few seconds.');
      return json({ error: 'upstream_error', message: busyMsg }, 503);
    }
    console.error('Vision report unhandled exception:', err);
    return json({ error: 'internal_error', message: 'An unexpected error occurred. Please try again.' }, 500);
  }
}

export async function onRequest() {
  return json({ error: 'method_not_allowed', message: 'Method Not Allowed' }, 405);
}
