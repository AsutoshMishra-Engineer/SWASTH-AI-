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

export async function onRequestPost({ request, env }) {
  const L = getLimits(env);
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY']) {
    if (!env[k]) return json({ error: 'server_misconfigured', message: 'Server is not configured yet.' }, 500);
  }

  // 1) Verify user authentication
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  try {
    const user = await getUser(env, m[1], L);
    if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);

    // 2) Parse request payload
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request', message: 'Invalid payload.' }, 400); }

    const rawImage = typeof body?.image === 'string' ? body.image.trim() : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';
    const symptoms = typeof body?.symptoms === 'string' ? body.symptoms.trim().slice(0, 300) : '';
    const reqLang = typeof body?.lang === 'string' ? body.lang.toLowerCase() : 'en';

    if (!rawImage) {
      return json({ error: 'bad_request', message: 'No image provided. Please capture or select a photo of the skin issue.' }, 400);
    }

    // Limit base64 image size to ~3.5MB max
    if (rawImage.length > 3.5 * 1024 * 1024) {
      return json({ error: 'too_large', message: 'Image file is too large. Please upload an image under 3 MB.' }, 413);
    }

    // Normalize base64 string if data URL prefix was included
    const base64Data = rawImage.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const langInstruction = reqLang === 'or'
      ? 'Respond strictly and entirely in pure Odia (ଓଡ଼ିଆ). Use these 4 exact Odia headings: "📘 ଦୃଶ୍ୟମାନ ଲକ୍ଷଣ ଓ ସମ୍ଭାବ୍ୟ କାରଣ:", "🏠 ସୁରକ୍ଷିତ ଘରୋଇ ଯତ୍ନ ଓ ତୁରନ୍ତ ଉପଶମ:", "⚠️ ବିପଦର ଲକ୍ଷଣ ଓ ସାବଧାନତା:", "🏥 ଡାକ୍ତରୀ ପରାମର୍ଶ:".'
      : (reqLang === 'hi'
        ? 'Respond strictly and entirely in pure Hindi (हिन्दी). Use these 4 exact Hindi headings: "📘 दृश्यमान लक्षण और संभावित कारण:", "🏠 सुरक्षित घरेलू देखभाल और तत्काल राहत:", "⚠️ खतरे के लक्षण व सावधानियां:", "🏥 डॉक्टर से परामर्श:".'
        : 'Respond clearly in plain English using these 4 exact headings: "📘 Visual Observation & Probable Causes:", "🏠 Safe Home Care & Immediate Relief:", "⚠️ Warning Signs & Precautions:", "🏥 When to See a Doctor:".');

    const promptText = `You are Swasth AI, an expert clinical dermatology and public health consultant for India (Odisha and national public health).
Examine the user's uploaded skin image with great clinical precision, taking into account any noted symptoms ("${symptoms || 'None specified'}").

CLINICAL ANALYSIS INSTRUCTIONS:
1. Examine visual characteristics: morphology (wheals/hives, erythematous patches, maculopapular, annular/ring-shaped, vesicles), borders, distribution, and skin texture.
2. Formulate the most probable clinical impression with common regional Indian terms:
   - If itchy red patches, wheals, or swollen hives (allergy): Allergic Urticaria / Contact Dermatitis (पित्ती / स्किन एलर्जी in Hindi, ଆଲର୍ଜି / ରାସ୍ in Odia).
   - If circular/ring-shaped with raised scaly edge and central clearing: Tinea Corporis / Fungal Ringworm (दाद/दमा in Hindi, ଦାଦ in Odia).
   - If dry, red, inflamed itchy patches in skin folds: Atopic Dermatitis / Eczema (एक्जिमा / ଚର୍ମ ଶୁଷ୍କତା).
   - If tiny prickly itchy red bumps in heat/sweat: Miliaria / Prickly Heat (घमौरियां / ଝାଳଜଳା).
   - If honey-colored crusted erosions: Impetigo / Bacterial skin infection.
   - If intense nocturnal itching between web spaces of fingers: Scabies (खाज / କାଛୁ).
3. Root cause explanation: Explain whether it is an allergic histamine response (to soap, detergent, pollen, fabric, food, insect), fungal dermatophytes thriving in warmth/humidity, or skin barrier breakdown.
4. Immediate, practical & safe home relief (Non-Harmful):
   - Cool compresses: Apply a clean cloth soaked in cool water for 10-15 minutes to quickly soothe itching and inflammation.
   - Gentle cleansing: Wash with mild, fragrance-free soap and cool/lukewarm water; gently pat dry with a clean personal towel (do not rub).
   - Skin barrier soothing: Apply plain calamine lotion or pure petroleum jelly / plain moisturizer to protect sensitized skin.
   - Clothing & hygiene: Wear loose, lightweight, breathable 100% cotton clothes. Wash clothing in hot water and dry in direct sunlight.
   - CRITICAL STEROID WARNING: STRICTLY DO NOT apply over-the-counter mixed steroid creams (such as Betnovate, Panderm, Quadriderm, Clobetasol, Fourderm) without a doctor's prescription! Explain clearly that steroids suppress local immunity, temporarily mask redness, but make fungal infections aggressively spread deep into skin tissues (Tinea Incognito) and cause permanent skin thinning (atrophy) and stretch marks.
   - Do NOT scratch, rub, or squeeze the skin to prevent secondary bacterial infection.
5. Red-flag danger signs (Immediate Medical Attention / Emergency):
   - Swelling of lips, face, eyelids, or tongue; tightness in throat; or difficulty breathing (Anaphylactic allergic emergency -> Call 108/112 immediately).
   - Fever, yellow pus discharge, rapidly expanding red streaks, or severe blistering/skin peeling.
6. Recommended medical next steps: Recommend visiting the nearest Primary Health Centre (PHC), Community Health Centre (CHC), or a qualified Dermatologist for safe non-steroidal oral antihistamines (e.g., Cetirizine) and certified targeted care.

${langInstruction}
Ensure the tone is professional, reassuring, clear, and thoroughly informative (around 160-220 words).`;

    const modelsToTry = [
      env.GEMINI_VISION_MODEL || 'gemini-flash-lite-latest',
      'gemini-flash-latest'
    ];

    let answer = '';
    let lastError = null;

    for (const model of modelsToTry) {
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
              temperature: 0.2,
              maxOutputTokens: 1200
            }
          })
        }, 22000, 'vision-skin');

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts;
          answer = Array.isArray(parts) ? parts.map((p) => p.text || '').join('').trim() : '';
          if (answer) break;
        } else {
          lastError = new UpstreamError('vision-skin', res.status, await res.text());
        }
      } catch (err) {
        lastError = err;
        console.warn(`Vision attempt with model ${model} failed:`, err && err.message);
      }
    }

    if (!answer) {
      throw lastError || new UpstreamError('vision-skin', 'empty_reply', 'Vision model returned no text');
    }

    const disclaimer = reqLang === 'hi'
      ? DISCLAIMER_HI
      : (reqLang === 'or' ? DISCLAIMER_OR : DISCLAIMER);

    return json({
      answer,
      kind: 'vision_skin',
      disclaimer,
      lang: reqLang,
      sources: [
        { name: 'WHO Skin Diseases & Primary Health Care Guide', url: 'https://www.who.int' },
        { name: 'Ministry of Health & Family Welfare (MoHFW)', url: 'https://main.mohfw.gov.in' }
      ]
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('upstream error vision-skin:', err.where, err.status, err.detail || '');
      return json({ error: 'upstream', message: 'Skin assessment service is currently busy. Please try again in a few moments.' }, 503);
    }
    console.error('vision-skin unexpected error:', err && err.message);
    return json({ error: 'server_error', message: 'Could not process skin image.' }, 500);
  }
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}
