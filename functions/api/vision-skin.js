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
    const reqDept = typeof body?.department === 'string' ? body.department.toLowerCase() : 'auto';

    if (!rawImage) {
      return json({ error: 'bad_request', message: 'No image provided. Please capture or select a photo of the clinical issue.' }, 400);
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

    const promptText = `You are Swasth AI, an expert clinical multi-department public health and visual triage consultant for India (Odisha and National Public Health guidelines).
Examine the user's uploaded clinical photo with high diagnostic precision, taking into account any noted symptoms ("${symptoms || 'None specified'}") and requested department ("${reqDept}").

CLINICAL DEPARTMENTS & TRIAGE PROTOCOLS:
1. 🔬 DERMATOLOGY & SKIN (derma):
   - Morphology: annular, scaling, erythematous macules, wheals/urticaria, papules, pustules, excoriations.
   - Conditions: Allergic Urticaria / Contact Dermatitis (पित्ती / ଆଲର୍ଜି), Tinea Corporis / Fungal Ringworm (दाद / ଦାଦ), Eczema, Scabies (खाज / କାଛୁ), Impetigo, Miliaria.
   - Mandatory Warning: STRICT PROHIBITION against OTC steroid creams (Betnovate, Panderm, Quadriderm, Clobetasol). Explain Tinea Incognito and skin atrophy.

2. 👁️ OPHTHALMOLOGY & EYE (eye):
   - Morphology: conjunctival injection, watery or purulent discharge, localized bright red scleral hemorrhage, eyelid margin swelling, pupillary opacity, scleral icterus.
   - Conditions: Conjunctivitis (Eye Flu / Pink Eye), Subconjunctival Hemorrhage (painless, self-limiting), Stye / Chalazion (Hordeolum / गुहमनी), Cataract opacity screening (मोतियाबिंद), Scleral Jaundice (पीलिया).
   - Mandatory Warning: DO NOT rub eyes; do not self-prescribe steroid eye drops. For chemical splash: immediate 15-minute continuous eye flush with clean water. Red flags: severe eye pain, sudden vision blurring, pupil irregularity.

3. 👄 ORAL HEALTH & PRE-CANCER SCREENING (oral):
   - Morphology: aphthous mucosal erosion, curdy white scrapable plaques, non-scrapable white or red lesions, gum inflammation.
   - Conditions: Aphthous Ulcers (canker sores / मुँह के छाले / ଘା'), Oral Candidiasis (Thrush), Gingivitis.
   - High-Risk Screening: Oral Leukoplakia & Oral Submucous Fibrosis (OSMF) associated with tobacco, paan, and gutka chewing.
   - Mandatory Warning: Any non-healing ulcer or white/red patch persisting >2 weeks must be evaluated in person by a dental/ENT surgeon to rule out oral malignancy. Stop all tobacco/gutka immediately.

4. 👶 PEDIATRICS & NEWBORN TRIAGE (pediatric):
   - Morphology: dermal jaundice progression (head, chest, abdomen, extremities), diaper zone erythema, fontanelle contour, mucous membrane moisture.
   - Conditions: Neonatal Jaundice (Kramer's zones: head-to-toe progression), Diaper Dermatitis vs Candida with satellite lesions, Infant dehydration.
   - Mandatory Warning: If jaundice spreads to abdomen, legs, or soles in the first two weeks, or infant is lethargic, rush immediately to a pediatric hospital (SNCU/PHC) for phototherapy evaluation.

5. 🩹 WOUNDS, BURNS & ANIMAL BITES (wound):
   - Morphology: burn depth (1st, 2nd, 3rd degree), tissue loss, erythema perimeter, pus exudate, animal bite puncture marks.
   - Conditions: Superficial vs Blistering Burns, Wound Infection vs healthy pink granulation, Dog/Cat/Monkey/Rodent Animal Bites.
   - Mandatory Warning: ANIMAL BITE LIFE-SAVING PROTOCOL: Wash immediately under running tap water with soap for a minimum of 15 minutes! Do not apply chili or tie tight ropes. Rush to CHC for Anti-Rabies Vaccine (ARV) and Immunoglobulin. For burns: cool clean water only; NEVER apply toothpaste, ink, or cow dung.

6. 💅 NAILS & ANEMIA SCREENING (nail):
   - Morphology: pallor of subungual bed, spooning (Koilonychia), thickening, subungual hyperkeratosis, cyanotic hue, digital clubbing.
   - Conditions: Severe Iron-Deficiency Anemia screening (pale nail beds / रक्तहीनता / ରକ୍ତହୀନତା), Onychomycosis (fungal nail), Cyanosis, Clubbing.
   - Mandatory Warning: Pale nail beds warrant an immediate Hemoglobin (Hb) blood count check at the nearest PHC or Anganwadi Centre.

${langInstruction}
Ensure the tone is professional, reassuring, clear, and thoroughly informative (around 160-220 words).
At the very end of your response, output a single invisible metadata tag indicating the primary department identified: [[DEPT:derma]] or [[DEPT:eye]] or [[DEPT:oral]] or [[DEPT:pediatric]] or [[DEPT:wound]] or [[DEPT:nail]].`;

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

    let detectedDept = 'derma';
    const deptMatch = /\[\[DEPT:([a-z]+)\]\]/i.exec(answer);
    if (deptMatch) {
      detectedDept = deptMatch[1].toLowerCase();
      answer = answer.replace(/\[\[DEPT:[a-z]+\]\]/i, '').trim();
    } else if (reqDept !== 'auto') {
      detectedDept = reqDept;
    }

    return json({
      answer,
      kind: 'vision_skin',
      department: detectedDept,
      disclaimer,
      lang: reqLang,
      sources: [
        { name: 'WHO Primary Health & Clinical Assessment Guidelines', url: 'https://www.who.int' },
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
