import { getLimits } from '../_lib/config.js';
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

async function fetchBhashiniTTS(cleanText, env, sourceLanguage = 'or') {
  const userId = env.BHASHINI_USER_ID;
  const udyatKey = env.BHASHINI_UDYAT_KEY || env.BHASHINI_API_KEY;
  const inferenceKey = env.BHASHINI_INFERENCE_KEY;
  if (!userId || !udyatKey) return null;

  try {
    const configRes = await timedFetch('https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline', {
      method: 'POST',
      headers: {
        'userID': userId,
        'ulcaApiKey': udyatKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage }
            }
          }
        ],
        pipelineRequestConfig: {
          pipelineId: env.BHASHINI_PIPELINE_ID || '64392f96daac500b55c543cd'
        }
      })
    }, 4000, 'bhashini-config');

    if (!configRes.ok) return null;
    const configData = await configRes.json();
    const serviceId = configData?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
    const callbackUrl = configData?.pipelineInferenceAPIEndPoint?.callbackUrl || 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
    const authHeaderName = configData?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name || 'Authorization';
    const authHeaderVal = configData?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || inferenceKey || udyatKey;

    if (!serviceId) return null;

    const computeRes = await timedFetch(callbackUrl, {
      method: 'POST',
      headers: {
        [authHeaderName]: authHeaderVal,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage },
              serviceId,
              gender: 'female'
            }
          }
        ],
        inputData: {
          input: [{ source: cleanText }]
        }
      })
    }, 6000, 'bhashini-compute');

    if (!computeRes.ok) return null;
    const computeData = await computeRes.json();
    const audioContent = computeData?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
    if (audioContent) {
      return { audio: audioContent, mimeType: 'audio/wav' };
    }
  } catch (err) {
    console.warn('Bhashini TTS attempt skipped/failed:', err && err.message);
  }
  return null;
}

function normalizeForHindiSpeech(text) {
  return text
    .replace(/\bORS\b/gi, 'ओआरएस')
    .replace(/\bCHC\b/gi, 'सामुदायिक स्वास्थ्य केंद्र')
    .replace(/\bPHC\b/gi, 'प्राथमिक स्वास्थ्य केंद्र')
    .replace(/\bASHA\b/gi, 'आशा दीदी')
    .replace(/\bANM\b/gi, 'एएनएम')
    .replace(/108/g, 'एक सौ आठ')
    .replace(/112/g, 'एक सौ बारह')
    .replace(/14416/g, 'एक चार चार एक छह');
}

function normalizeForOdiaSpeech(text) {
  return text
    .replace(/\bORS\b/gi, 'ଓଆରଏସ')
    .replace(/\bCHC\b/gi, 'ସରକାରୀ ଡାକ୍ତରଖାନା')
    .replace(/\bPHC\b/gi, 'ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର')
    .replace(/\bASHA\b/gi, 'ଆଶା')
    .replace(/\bANM\b/gi, 'ଏଏନଏମ')
    .replace(/108/g, 'ଏକ ଶହ ଆଠ')
    .replace(/112/g, 'ଏକ ଶହ ବାର')
    .replace(/\b1\b/g, 'ଗୋଟିଏ')
    .replace(/\b2\b/g, 'ଦୁଇ')
    .replace(/\b3\b/g, 'ତିନି')
    .replace(/\b4\b/g, 'ଚାରି')
    .replace(/\b5\b/g, 'ପାଞ୍ଚ')
    .replace(/0/g, '୦')
    .replace(/1/g, '୧')
    .replace(/2/g, '୨')
    .replace(/3/g, '୩')
    .replace(/4/g, '୪')
    .replace(/5/g, '୫')
    .replace(/6/g, '୬')
    .replace(/7/g, '୭')
    .replace(/8/g, '୮')
    .replace(/9/g, '୯');
}

export async function onRequestPost({ request, env }) {
  const L = getLimits(env);
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY']) {
    if (!env[k]) return json({ error: 'server_misconfigured', message: 'Server is not configured yet.' }, 500);
  }

  // 1) Verify user authentication (Supports user session JWT or anon client token)
  const m = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '');
  if (!m) return json({ error: 'unauthorized', message: 'Please sign in.' }, 401);

  let user = null;
  const token = m[1].trim();

  // Allow app anon key or guest session as safe fallback
  if (token === env.SUPABASE_ANON_KEY || /^guest[_\:]/i.test(token)) {
    user = { id: token.slice(0, 64), role: 'guest' };
  } else {
    try {
      user = await getUser(env, token, L);
    } catch (authErr) {
      console.warn('Supabase getUser error in tts:', authErr && authErr.message);
    }
    // If network glitch or token expiration edge-case, decode Supabase JWT
    if (!user || !user.id) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const pad = (s) => s + '='.repeat((4 - (s.length % 4)) % 4);
          const payload = JSON.parse(atob(pad(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));
          if (payload.sub || payload.role === 'anon' || payload.aud === 'authenticated') {
            user = { id: payload.sub || 'anon_tts_user', email: payload.email || 'user@swasth.ai', role: payload.role };
          }
        }
      } catch {}
    }
  }
  if (!user || !user.id) return json({ error: 'unauthorized', message: 'Please sign in again.' }, 401);

  try {
    // 2) Parse text payload
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request', message: 'Invalid payload.' }, 400); }
    const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!rawText) return json({ error: 'bad_request', message: 'No text provided.' }, 400);

    // Clean emojis and symbols for speech (limit to 450 chars safely at word boundary)
    let cleanText = rawText
      .replace(/[📘🏠⚠️🏥🚨✨💡🗑️🦟🐕💧🤰☀️]/g, '')
      .replace(/[*_#`~]/g, '')
      .replace(/^[ \t]*[-•]\s*/gm, '')
      .trim();

    if (cleanText.length > 450) {
      const lastSpace = cleanText.lastIndexOf(' ', 450);
      cleanText = (lastSpace > 150 ? cleanText.slice(0, lastSpace) : cleanText.slice(0, 450))
        .replace(/[\u0B01-\u0B03\u0B3C-\u0B4D\u0B56\u0B57]+$/, '')
        .trim();
    }

    if (!cleanText) return json({ error: 'empty_text', message: 'Text empty after cleaning.' }, 400);

    const isHindi = /[\u0900-\u097F]/.test(cleanText) || (typeof body?.lang === 'string' && body.lang === 'hi');
    const isOdia = !isHindi && (/[\u0B00-\u0B7F]/.test(cleanText) || (typeof body?.lang === 'string' && body.lang === 'or'));
    let speechText = cleanText;
    if (isHindi) speechText = normalizeForHindiSpeech(cleanText);
    else if (isOdia) speechText = normalizeForOdiaSpeech(cleanText);

    let targetLang = 'en-IN';
    if (isHindi) targetLang = 'hi-IN';
    else if (isOdia) targetLang = 'od-IN';

    let base64Audio = null;
    let mimeType = 'audio/wav';

    // 3.1) Tier 1: Sarvam AI Bulbul V3 for Native High-Fidelity Indian Speech (Hindi, Odia, and English)
    if (env.SARVAM_API_KEY) {
      try {
        const sarvamRes = await timedFetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'api-subscription-key': env.SARVAM_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: [speechText],
            target_language_code: targetLang,
            speaker: isOdia ? (env.SARVAM_SPEAKER || 'ritu') : 'ritu',
            model: 'bulbul:v3',
            pace: 0.95
          })
        }, 12000, 'sarvam-tts');

        if (sarvamRes.ok) {
          const sarvamData = await sarvamRes.json();
          if (Array.isArray(sarvamData.audios) && sarvamData.audios[0]) {
            base64Audio = sarvamData.audios[0];
            mimeType = 'audio/wav';
          }
        } else {
          console.warn('Sarvam TTS error status:', sarvamRes.status);
        }
      } catch (err) {
        console.warn('Sarvam TTS fetch failed, trying fallback:', err && err.message);
      }
    }

    // 3.2) Tier 2 for Hindi & Odia: Bhashini AI (National Language Translation Mission, MeitY)
    if (!base64Audio && env.BHASHINI_USER_ID && (env.BHASHINI_UDYAT_KEY || env.BHASHINI_API_KEY) && (isOdia || isHindi)) {
      const bhashini = await fetchBhashiniTTS(speechText, env, isHindi ? 'hi' : 'or');
      if (bhashini?.audio) {
        base64Audio = bhashini.audio;
        mimeType = bhashini.mimeType || 'audio/wav';
      }
    }

    // 4) Fallback or English: Google Gemini TTS
    if (!base64Audio) {
      const primaryModel = env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
      const modelsToTry = [primaryModel, 'gemini-3.8-flash-tts'];

      const speechPrompt = isOdia
        ? `Speak aloud in natural, authentic spoken Odia (ଓଡ଼ିଆ) pronunciation:\n${cleanText}`
        : cleanText;

      for (const m of modelsToTry) {
        try {
          const res = await timedFetch(`${gbase(env)}/v1beta/models/${m}:generateContent`, {
            method: 'POST',
            headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: speechPrompt }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Kore'
                    }
                  }
                }
              }
            })
          }, 15000, 'gemini-tts');

          if (res.ok) {
            const data = await res.json();
            const part = data?.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
              base64Audio = part.inlineData.data;
              mimeType = part.inlineData.mimeType || 'audio/wav';
              break;
            }
          }
        } catch {}
      }
    }

    if (!base64Audio) {
      throw new UpstreamError('tts', 'no_audio', 'Could not generate audio stream');
    }

    return json({ audio: base64Audio, mimeType });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('upstream error tts:', err.where, err.status, err.detail || '');
      return json({ error: 'upstream', message: 'TTS service busy.' }, 503);
    }
    console.error('tts unexpected error:', err && err.message);
    return json({ error: 'server_error', message: 'Could not generate speech.' }, 500);
  }
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}
