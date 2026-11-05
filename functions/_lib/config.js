// ALL hard limits live here. Change only with the Leader's approval.
export function getLimits(env = {}) {
  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    MAX_MESSAGE_CHARS: 500,      // longest question accepted
    MAX_BODY_BYTES: 4000,        // largest request body accepted
    MAX_OUTPUT_TOKENS: 600,      // cap on Gemini reply (answer itself is asked to be <=120 words)
    TOP_K: 4,                    // knowledge chunks sent to the model
    MIN_SIMILARITY: num(env.MIN_SIMILARITY, 0.48), // TUNE during testing (0.48 captures colloquial queries cleanly)
    USER_DAILY_LIMIT: num(env.USER_DAILY_LIMIT, 36),     // questions per user per day (UTC)
    GLOBAL_DAILY_LIMIT: num(env.GLOBAL_DAILY_LIMIT, 600),// questions for the whole site per day
    UPSTREAM_TIMEOUT_MS: 15000,  // give up on Gemini/Supabase after 15 s
    EMBED_DIM: 768,              // must match vector(768) in schema.sql
  };
}
export const MODELS = (env = {}) => ({
  generate: env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  embed: env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
});
export const DISCLAIMER = 'This is general health information, not a diagnosis. For any health problem, please see a doctor or your nearest health worker.';
export const DISCLAIMER_OR = 'ଏହା କେବଳ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା, କୌଣସି ଡାକ୍ତରୀ ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ । ଯେକୌଣସି ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ପାଇଁ ଡାକ୍ତର କିମ୍ବା ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ ।';
