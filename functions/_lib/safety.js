// Safety router. Runs BEFORE any AI call. Pure functions, fully unit-tested.
const SELF_HARM = [
  /\b(kill(ing)? myself|end(ing)? my (own )?life|want to die|wanna die|suicid\w*|self[- ]?harm|hurt(ing)? myself|(don'?t|do not) want to live)\b/i,
  /(ଆତ୍ମହତ୍ୟା|ମରିବାକୁ\s*ଇଚ୍ଛା|ଜୀବନ\s*ହାରିବା|ନିଜକୁ\s*ମାରିଦେବା)/i,
];
const EMERGENCY = [
  /\bchest (pain|tightness|pressure)\b|\bpain in (my |the )?chest\b/i,
  /\b(can'?t|cannot|unable to|difficulty|trouble|struggling to|hard to) breath/i,
  /\b(not breathing|stopped breathing|gasping)\b/i,
  /\b(unconscious|unresponsive|passed out|collapsed|not waking up|won'?t wake up)\b/i,
  /\b(seizure|seizures|convulsion|convulsions)\b/i,
  /\b(heavy|severe|profuse|uncontrolled|non-?stop) bleeding\b|\bbleeding (a lot|heavily|badly|won'?t stop)\b/i,
  /\b(vomiting|coughing up|vomit(ed)?|passing) blood\b/i,
  /\b(having|got|had|think i('m| am) having|suffering) (a |an )?(heart attack|stroke)\b/i,
  /\b(face drooping|slurred speech|one side of (my|his|her|the) body)\b/i,
  /\bpoison(ed|ing)?\b|\bswallowed (pesticide|kerosene|bleach|acid|insecticide|medicine|tablets)\b|\boverdos(e|ed|ing)\b/i,
  /\bsnake ?bite\b|\bbitten by (a )?snake\b|\bsnake bit\b/i,
  /\b(severe(ly)? burn|badly burn(ed|t)|electric shock|electrocuted)\b/i,
  /\b(baby|fetus|child in (my )?womb) (is )?(not moving|stopped moving|not kicking)\b/i,
  /\bpregnan\w*\b.*\b(bleeding|convulsion|seizure|severe headache|blurred vision)\b/i,
  /(ଛାତି(ରେ)?\s*(ଯନ୍ତ୍ରଣା|ବିନ୍ଧା|ଚାପ)|ନିଶ୍ୱାସ(\s*ନେବାରେ)?\s*(କଷ୍ଟ|ଅସୁବିଧା|ବନ୍ଦ)|ଅଚେତ|ବେହୋସ|ପ୍ରବଳ\s*ରକ୍ତସ୍ରାବ|ବାନ୍ତି(ରେ)?\s*ରକ୍ତ|ସାପ\s*କାମୁଡ଼|ବିଷ\s*(ଖାଇ|ପିଇ)|ହାର୍ଟ\s*ଆଟାକ୍)/i,
];
const BLOCKED = [
  /\b(dose|dosage|dosing)\b/i,
  /\bhow (much|many) (\w+ ){0,3}(tablets?|pills?|capsules?|mg|ml|syrup|medicine|medication|drops?)\b/i,
  /\b(what|which) (medicine|medication|tablet|drug|antibiotic|pill|painkiller)s? (should|can|do|to|is best|is good)\b/i,
  /\b(prescribe|prescription for)\b/i,
  /\b(diagnose|diagnosis of) (me|my|him|her)\b/i,
  /\bdo (i|we) have (a |an |the )?(\w+ ){0,2}(disease|infection|fever|dengue|malaria|cancer|diabetes|tb|tuberculosis|covid|virus|condition)\b/i,
  /\bdoes (he|she|my \w+) have (a |an |the )?(\w+ ){0,2}(disease|infection|dengue|malaria|cancer|diabetes|tb|tuberculosis|covid|virus)\b/i,
  /\b(what|which) (disease|illness|condition|sickness) do i have\b|\bdo you think i have\b/i,
  /\b(stop|skip|quit|reduce|increase|change|miss)\w* (taking )?(my|the|his|her) (medicine|medicines|medication|tablets?|pills?|insulin|treatment)\b/i,
  /(ଔଷଧ(ର)?\s*(ଡୋଜ୍|ଡୋଜ|କେତେ\s*ଖାଇବି|କେଉଁଟା\s*ଖାଇବି)|କେଉଁ\s*(ଟାବଲେଟ୍|ଔଷଧ)|ମୋତେ\s*କି\s*ରୋଗ\s*ହୋଇଛି)/i,
];

export const MESSAGES_EN = {
  selfharm: "I'm really sorry you are feeling this way. You do not have to face it alone. Please talk to someone right now: call Tele-MANAS on 14416 (free mental health helpline), or 112 if you are in immediate danger. You can also tell a family member or a friend you trust.",
  emergency: "If this is happening right now, it may be an emergency. Call 108 (ambulance) or 112 immediately, or go to the nearest hospital. Do not wait. If you only wanted general information, please rephrase your question and I will try to help.",
  blocked: "I cannot diagnose illnesses, suggest medicines, or give doses. Please ask a doctor, a pharmacist, or your ASHA/ANM health worker. I can share general, verified health information instead. Try asking about prevention, symptoms, or when to see a doctor.",
  no_answer: "I do not have verified information on this. Please ask a doctor or your nearest health worker.",
};

export const MESSAGES_OR = {
  selfharm: "ଦୟାକରି ମନେରଖନ୍ତୁ: ଆପଣ ଏକା ନୁହଁନ୍ତି । କୌଣସି ଭୁଲ୍ ପଦକ୍ଷେପ ନିଅନ୍ତୁ ନାହିଁ । ତୁରନ୍ତ ମାଗଣା ମାନସିକ ସ୍ୱାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍ Tele-MANAS (14416) କିମ୍ବା 112 କୁ କଲ୍ କରନ୍ତୁ ଏବଂ ନିଜ ପରିବାର ଲୋକଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ ।",
  emergency: "ଜରୁରୀକାଳୀନ ସୂଚନା: ଏହା ଏକ ଡାକ୍ତରୀ ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି ହୋଇପାରେ । ବିଳମ୍ବ ନକରି ତୁରନ୍ତ 108 (ଆମ୍ବୁଲାନ୍ସ) କିମ୍ବା 112 କୁ କଲ୍ କରନ୍ତୁ ଅଥବା ନିକଟସ୍ଥ ସରକାରୀ ଡାକ୍ତରଖାନାକୁ ଯାଆନ୍ତୁ ।",
  blocked: "ମୁଁ କୌଣସି ଔଷଧର ନାମ କିମ୍ବା ଡୋଜ୍ ପ୍ରେସକ୍ରାଇବ୍ କରିପାରିବି ନାହିଁ । ଦୟାକରି ନିକଟସ୍ଥ ଡାକ୍ତର କିମ୍ବା ଆଶା/ଏଏନ୍ଏମ୍ (ASHA/ANM) ଦିଦିଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ ।",
  no_answer: "ମୋ ପାଖରେ ଏ ବିଷୟରେ ଯାଞ୍ଚ ହୋଇଥିବା ସଠିକ୍ ତଥ୍ୟ ନାହିଁ । ଦୟାକରି ଡାକ୍ତର କିମ୍ବା ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ସହ ପରାମର୍ଶ କରନ୍ତୁ ।",
};

export const MESSAGES = MESSAGES_EN;

export function classify(message) {
  const text = String(message || '');
  if (SELF_HARM.some((r) => r.test(text))) return { type: 'selfharm' };
  if (EMERGENCY.some((r) => r.test(text))) return { type: 'emergency' };
  if (BLOCKED.some((r) => r.test(text))) return { type: 'blocked' };
  return { type: 'ok' };
}

// Output guard: the model must never emit doses or dosing words.
export function looksLikeDosage(answer) {
  return /\b\d+(\.\d+)?\s?(mg|mcg|ml|iu)\b|\b\d+\s?(tablets?|pills?|capsules?)\b|\b(dosage|dose)\b/i.test(answer || '');
}

export function cleanAnswer(text) {
  return String(text || '').replace(/[*#`]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
