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
    const symptoms = typeof body?.symptoms === 'string' ? body.symptoms.trim().slice(0, 300) : '';
    reqLang = typeof body?.lang === 'string' ? body.lang.toLowerCase() : 'en';
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

    const promptText = `You are Swasth AI, an expert clinical multi-department public health and visual triage consultant for India (compliant with National Health Mission, ICMR, AIIMS, and WHO clinical triage standards).
Examine the user's uploaded clinical photo with high diagnostic precision and careful visual analysis, taking into account noted symptoms ("${symptoms || 'None specified'}") and requested clinical department ("${reqDept}").

CRITICAL PATIENT SAFETY MANDATE - ABSOLUTELY ZERO UNPRESCRIBED RANDOM MEDICINES:
- STRICT PROHIBITION: DO NOT prescribe, suggest, or name specific commercial medicines, antibiotics (e.g. Amoxicillin, Ciprofloxacin, Azithromycin), oral antifungals, prescription eye/ear drops, steroid creams (Betnovate, Panderm, Quadriderm, Dermikem, Clobetasol), or systemic drugs.
- MANDATORY WARNING IN EVERY RESPONSE: Explicitly remind the user that self-medicating or taking random medicines from the internet without a physical doctor's clinical examination is dangerous, can cause severe toxicity, antibiotic resistance, steroid-induced skin/eye damage, or mask life-threatening emergencies.
- Provide ONLY evidence-based, safe non-pharmacological first aid (e.g., continuous clean water flush, gentle soap wash, warm saline compress, hydration, sterile dressing) and guide the patient to an authorized physician, PHC, CHC, or medical specialist for formal diagnosis and prescription.

SPECIALIZED CLINICAL DEPARTMENTS & VISUAL ASSESSMENT PROTOCOLS:
1. 👁️ OPHTHALMOLOGY & EYE DEPARTMENT (Netra Pariksha / eye):
   - Visual Features: Conjunctival injection (diffuse vs ciliary flush), discharge type (purulent vs watery vs mucoid), eyelid swelling, localized bright red scleral hemorrhage, corneal clarity, pupillary equality and reactivity, scleral icterus (yellow sclera).
   - Clinical Conditions: Conjunctivitis (Eye Flu / Pink Eye), Subconjunctival Hemorrhage (painless, reassuringly benign and self-limiting), Stye / Chalazion (Hordeolum / गुहमनी), Cataract opacity screening (मोतियाबिंद), Scleral Jaundice / Icterus.
   - Immediate First Aid: DO NOT rub eyes. Never use unprescribed steroid or antibiotic drops. For chemical splash: immediate continuous 15-minute eye irrigation with clean running water.
   - Red Flag Emergencies: Severe eye ache, sudden vision deterioration, photophobia, corneal white spot/ulcer -> immediate ophthalmologist referral.

2. 👄 ORAL HEALTH & PRE-CANCER SCREENING (Mukh Swasthya / oral):
   - Visual Features: Mucosal ulceration (margins, crater base, surrounding erythema), curdy white scrapable pseudomembranes, non-scrapable white (leukoplakia) or velvety red (erythroplakia) lesions, gingival swelling, restricted mouth opening (trismus).
   - Clinical Conditions: Aphthous Stomatitis (canker sores / मुँह के छाले / ଘା'), Oral Candidiasis (Thrush), Gingivitis.
   - Pre-Cancer & High-Risk Triage: Oral Leukoplakia, Erythroplakia, and Oral Submucous Fibrosis (OSMF) strongly linked to chronic chewing of tobacco, paan, gutka, khaini, or areca nut.
   - Mandatory 2-Week Safety Rule: Any oral ulcer, white patch, or swelling persisting >2 weeks must be physically examined and biopsied by a Dental Surgeon or ENT/Oncology specialist to rule out oral malignancy. Immediate complete cessation of all tobacco, paan, and gutka.

3. 👶 PEDIATRICS & NEWBORN TRIAGE (Shishu Swasthya / pediatric):
   - Visual Features: Dermal icterus cephalocaudal progression (Kramer's zones: face -> chest -> abdomen -> legs -> palms/soles), anterior fontanelle fullness/depression, mucosal moisture, diaper region erythema and crease involvement, umbilical stump hygiene.
   - Clinical Conditions: Neonatal Hyperbilirubinemia (Jaundice), Irritant Diaper Dermatitis vs Candida (satellite pustules involving skin folds), Infant Dehydration signs.
   - Mandatory Infant Warning: If jaundice appears within the first 24 hours of life, extends to the abdomen, legs, or soles, or if the baby is lethargic or feeding poorly, rush IMMEDIATELY to a hospital (SNCU/NICU/PHC) for bilirubin testing and phototherapy. Never give adult medications or unprescribed drops to infants.

4. 🩹 WOUNDS, BURNS & ANIMAL BITES (Khyata & Porajala / wound):
   - Visual Features: Burn depth (1st degree erythema, 2nd degree blistering, 3rd degree leathery/charred insensitive tissue), wound margins, erythema perimeter, pus or serosanguinous exudate, animal bite puncture/abrasion.
   - Clinical Conditions: Thermal/Scald Burns, Infected vs Granulating Healing Wounds, Dog / Cat / Monkey / Rodent / Stray Animal Bites.
   - LIFE-SAVING ANIMAL BITE PROTOCOL: Wash vigorously under running tap water with soap for at least 15 FULL MINUTES immediately! Never apply chili powder, turmeric, lime, or bind tightly. Rush to CHC/hospital within 24 hours for WHO Category II/III Anti-Rabies Vaccination (ARV) and Rabies Immunoglobulin (RIG), plus Tetanus Toxoid.
   - Burn Care: Cool clean running tap water for 15 minutes only. Never break blisters. Strictly PROHIBIT toothpaste, ink, mud, or cow dung.

5. 💅 NAILS & ANEMIA VISUAL SCREENING (Nakha Pariksha / nail):
   - Visual Features: Subungual bed pallor, lack of pink vascular capillary bed, concave spoon-shaped nail plate (Koilonychia), longitudinal ridging, subungual hyperkeratosis, periungual scaling, cyanotic bluish tinge, digital clubbing (loss of Lovibond angle).
   - Clinical Conditions: Severe Iron-Deficiency Anemia screening (रक्तहीनता / ରକ୍ତହୀନତା), Onychomycosis (fungal nail infection), Peripheral Cyanosis, Cardiopulmonary Clubbing.
   - Guidance: Pale nail beds warrant a prompt Hemoglobin (Hb) blood count check at the nearest PHC, CHC, or Anganwadi center. Recommend iron- and nutrient-rich natural dietary intake (green leafy vegetables, jaggery, pulses) pending doctor's diagnostic evaluation.

6. 🔬 DERMATOLOGY & SKIN (derma):
   - Visual Features: Annular scaling plaques, central clearing, wheals/urticarial hives, follicular papules, pustules, excoriations.
   - Conditions: Tinea Corporis / Cruris (Fungal Ringworm / दाद / ଦାଦ), Allergic Urticaria / Contact Dermatitis (पित्ती / ଆଲର୍ଜି), Eczema, Scabies (खाज / କାଛୁ), Impetigo, Prickly Heat (Miliaria).
   - Strict Warning: PROHIBIT OTC topical steroid combinations (Betnovate, Panderm, Quadriderm, Dermikem, Clobetasol) which destroy skin barriers and cause fungal exacerbation (Tinea Incognito).

${langInstruction}
Ensure the tone is professional, reassuring, clear, and thoroughly informative (around 160-220 words).
At the very end of your response, output a single invisible metadata tag indicating the primary department identified: [[DEPT:eye]] or [[DEPT:oral]] or [[DEPT:pediatric]] or [[DEPT:wound]] or [[DEPT:nail]] or [[DEPT:derma]].`;

    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      env.GEMINI_VISION_MODEL,
      'gemini-3-flash-preview',
      'gemini-flash-latest'
    ].filter(Boolean);

    let answer = '';
    let lastError = null;

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
              temperature: 0.2,
              maxOutputTokens: 900
            }
          })
        }, 15000, 'vision-skin');

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
      const isOr = reqLang === 'or';
      const isHi = reqLang === 'hi';
      const busyMsg = isHi
        ? 'क्लिनिकल फोटो मूल्यांकन सेवा इस समय व्यस्त है। कृपया कुछ क्षण बाद पुनः प्रयास करें।'
        : (isOr
          ? 'ଡାକ୍ତରୀ ଫଟୋ ପରୀକ୍ଷା ସେବା ଏହି ମୁହୂର୍ତ୍ତରେ ବ୍ୟସ୍ତ ଅଛି । ଦୟାକରି କିଛି ସମୟ ପରେ ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ ।'
          : 'Skin assessment service is currently busy. Please try again in a few moments.');
      return json({ error: 'upstream', message: busyMsg }, 503);
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
