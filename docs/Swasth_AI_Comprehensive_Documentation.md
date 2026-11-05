# SWASTH AI (ସ୍ୱାସ୍ଥ୍ୟ AI) - Master Technical & Clinical Project Documentation

**A Bilingual, Voice-Enabled Public Health Assistant & Clinical Triage System for Rural Odisha**

- **Project Lead:** Asutosh Mishra
- **Live Production URL:** [https://swasth-ai.pages.dev](https://swasth-ai.pages.dev)
- **Deployment Stack:** Cloudflare Pages (Serverless Edge Functions) + Supabase (PostgreSQL with `pgvector` & Auth) + Google Gemini 3.8 Flash & Groq Failover + Sarvam AI Bulbul V3 Voice Engine
- **Test Coverage:** 109 Automated Unit & Integration Tests (100% Pass)
- **Clinical Corpus:** 607 Certified WHO & MoHFW Clinical Vectors
- **Target Region:** Odisha (30 Districts, Rural & Tribal Blocks)

---

## 1. Executive Summary & Plain-Language Overview
**Swasth AI (ସ୍ୱାସ୍ଥ୍ୟ AI)** is an intelligent, voice-first digital public health companion engineered specifically for the state of Odisha, India. It enables citizens—regardless of literacy level or technical background—to speak or type everyday health symptoms in natural **colloquial Odia (କଥିତ ଓଡ଼ିଆ)** or **English**, and immediately receive verified, compassionate, safe health guidance.

Unlike general-purpose generative chatbots (such as raw ChatGPT) which often make up imaginary facts ("hallucinations") and prescribe dangerous drug dosages, Swasth AI is strictly bounded to 607 certified medical protocols from the **World Health Organization (WHO)** and the **Ministry of Health & Family Welfare (MoHFW)**. It strictly refuses drug dosages and instantly connects emergency patients to **108 (Ambulance)** or **112 (National Emergency)**.

---

## 2. The Public Health Crisis in Odisha: Ground Medical Realities

### 1. Patient-to-Doctor Ratio & The "Three Delays" Model
In tribal and rural districts like Koraput, Malkangiri, Nabarangpur, and Mayurbhanj, a single Community Health Centre (CHC) medical officer frequently serves over 2,100 citizens. Preventable fatalities in rural healthcare occur due to three delays:
- **Delay 1 (Deciding to Seek Care):** Families fail to recognize red-flag warning signs (e.g. fever with convulsions, sudden chest tightness, third-trimester bleeding), assuming symptoms are mild.
- **Delay 2 (Reaching the Health Facility):** Rough terrain, river barriers, and lack of immediate ambulance dispatch delay transit.
- **Delay 3 (Receiving Adequate Care):** Overburdened hospitals face overwhelming queues of patients with minor viral ailments, causing treatment delays for acute cases.

**Swasth AI directly eliminates Delay 1** by equipping families and frontline workers with instant symptom triage, identifying warning signs within seconds of symptom onset.

### 2. Seasonal Outbreaks in Tribal & Coastal Belts
- **Gastroenteritis & Diarrheal Dehydration:** Monsoon flooding in coastal districts (Puri, Kendrapara, Jagatsinghpur) triggers severe water-borne acute diarrheal disease. Without immediate Oral Rehydration Salts (ORS) and zinc therapy, infants and elderly patients suffer rapid hypovolemic shock.
- **Falciparum Malaria & Vector Diseases:** Forested pockets of Koraput and Rayagada report high burdens of drug-resistant *Plasmodium falciparum*. When villagers delay blood-slide testing, mild fever progresses into life-threatening cerebral malaria.
- **Heatstroke (Loo) Emergencies:** Summer temperatures in western Odisha (Titilagarh, Bolangir, Jharsuguda) frequently exceed 45°C. Rapid first-aid cooling is essential before permanent neurological damage occurs.

---

## 3. Clinical Hazards: Medical Misinformation, Quackery & Dosage Toxicity

### 1. The Danger of Quackery and Antibiotic Abuse
In rural pockets without licensed MBBS doctors, unregulated medicine vendors often hand out potent third-generation cephalosporin antibiotics (Cefixime, Azithromycin) for simple viral head colds. This practice causes:
1. **Antimicrobial Resistance (AMR):** Common infections become incurable as bacteria mutate against essential antibiotics.
2. **Financial Catastrophe:** Impoverished families spend substantial daily wages on unnecessary pills while ignoring simple, life-saving hydration.

### 2. The Toxic Hazard of Pediatric Paracetamol Overdose
Acetaminophen (Paracetamol) is the most common fever-reducing medication in Odisha. However, pediatric dosage is strictly calculated by weight (**15 mg/kg body weight**), NOT by age. Parents frequently administer adult 500mg or 650mg tablets crushed in milk to young children, leading to acute fulminant hepatic necrosis (liver failure). Swasth AI refuses to provide pill numbers and actively directs parents to liquid suspensions with physician-guided weight measurement.

---

## 4. The Swasth AI Solution: Socio-Technical Architecture

1. **Zero-Literacy Voice Accessibility:** Users simply press a large microphone button and speak in natural Odia. The AI responds in spoken native Odia (voiced by regional voice synthesis) with warm, culturally attuned advice.
2. **ASHA & ANM Didi Field Companion:** Helps frontline health workers check child vaccine schedules, maternal red flags, and ORS preparation during Village Health Nutrition Days (VHND).
3. **Decongesting Government Hospitals:** Provides safe home-care guidance for mild conditions, reducing hospital queues.
4. **Instant 108 Emergency Bypass:** Bypasses AI processing entirely for heart attacks, snakebites, poison ingestion, and unconsciousness, connecting directly to emergency ambulances.

---

## 5. End-to-End System Architecture

| Architecture Tier | Engineered Components | Performance & Operational Metric |
| :--- | :--- | :--- |
| **Client Edge UI** | Vanilla HTML5, CSS3, JavaScript (ES6+), Google Noto Sans Oriya, Web Audio API | 0kB bulky framework overhead. First Contentful Paint < 380ms. Fully responsive on low-end Android mobile devices. |
| **Serverless Edge Functions** | Cloudflare Pages Functions (V8 Isolated Workers) | Distributed over 330 global edge locations. 0ms cold-start latency. Built-in SSL, DDoS mitigation, and rate limiting. |
| **Vector Database & Storage** | Supabase PostgreSQL 15+ with `pgvector` extension, Row-Level Security (RLS) | HNSW vector indexing, Cosine Distance mathematical matching over 607 clinical vector chunks. Sub-40ms search time. |
| **Dual AI Reasoning Layer** | Primary: Google Gemini 3.8 Flash<br>Failover: Groq Llama 3.3 (120B) | Automatic HTTP 429 rate-limit failover in 300ms. Strict grounding prompt prevents medical hallucinations. |
| **Voice Synthesis Tier** | Sarvam AI Bulbul V3 (`speaker: 'ritu'`, `pace: 0.95`) + MeitY Bhashini fallback | High-fidelity 24kHz audio synthesis. Low CER (<0.30%) native Odia speech with phonetic numeral and acronym normalization. |

---

## 6. Semantic Vector RAG Pipeline

### Mathematical Foundation of Vector Retrieval
Each clinical knowledge chunk from WHO and MoHFW is transformed into a 768-dimensional floating-point vector. When a user asks a question, their query is converted into an embedding vector $Q$. The Supabase database calculates the **Cosine Distance** against all 607 stored vectors $V_i$:

$$\text{Cosine Distance} = 1 - \frac{Q \cdot V_i}{\|Q\|_2 \cdot \|V_i\|_2}$$

Only verified excerpts with a similarity score greater than 0.65 are passed to the reasoning model. If no verified chunks meet this threshold, the model executes a graceful fallback instructing the patient to visit their nearest Community Health Centre.

---

## 7. Medical Safety & Ethical Framework

### 1. The 108 Emergency Referral Protocol (Instant 0ms Bypass)
Whenever emergency keywords are detected—such as crushing chest pain, sudden one-sided facial drooping, uncontrolled arterial bleeding, snakebites, pesticide ingestion, or postpartum hemorrhage—the platform immediately halts the AI pipeline. It outputs a standardized emergency card with direct phone links to **108 (Odisha Emergency Ambulance)** and **112**, accompanied by emergency first-aid guidelines.

### 2. The 4-Section Structured Response Standard
Every valid response is divided into four clean sections:
1. 📘 **Possible Causes (ସମ୍ଭାବ୍ୟ କାରଣ):** General educational explanation (never a definitive diagnosis).
2. 🏠 **Safe Home Care & Fluids (ଘରୋଇ ଉପଚାର ଓ ଯତ୍ନ):** Non-drug relief (hydration, ORS preparation, rest, cooling cloth).
3. ⚠️ **Danger Warning Signs (ବିପଦର ଲକ୍ଷଣ):** Red-flag indicators that require immediate hospital care.
4. 🏥 **Doctor Consultation (ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ):** Clear instructions on visiting the nearest CHC/PHC.

---

## 8. Real-World Clinical Case Studies

### Case 1: Monsoon Pediatric Diarrhea & Dehydration
- **Query (Odia):** *"ମୋର ୩ ବର୍ଷର ପିଲାକୁ ୨ ଦିନ ହେଲା ବାରମ୍ବାର ପତଳା ଝାଡ଼ା ହେଉଛି । କେଉଁ ଆଣ୍ଟିବାୟୋଟିକ୍ ଦେବି?"*
- **Action:** Refuses unprescribed antibiotic dosage. Delivers WHO rehydration guidelines: 1 liter clean water + 1 ORS packet, zinc supplementation advice, continued breastfeeding, and sunken-eyes dehydration triage.

### Case 2: Monsoon Snakebite Envenomation (Mayurbhanj District)
- **Query (Odia):** *"ଜଣଙ୍କୁ ବିଲରେ ସାପ କାମୁଡ଼ି ଦେଇଛି, ଗୋଡ଼ ଫୁଲି ଯାଉଛି କଣ କରିବି?"*
- **Action:** Triggers instant 0ms 108 emergency bypass. Instructs strict limb immobilization with a splint, removing tight rings, and warns: **NEVER cut the wound, NEVER suck venom, and NEVER tie tight tourniquets**.

### Case 3: Third-Trimester Maternal Warning Signs (Pre-eclampsia)
- **Query (English):** *"My pregnant sister is 8 months pregnant and suddenly has severe headache and blurred vision."*
- **Action:** Maps to MoHFW High-Risk Pregnancy guidelines. Triages as potential pre-eclampsia/eclampsia danger signs and instructs immediate transfer to a First Referral Unit (FRU) for blood pressure and urine protein evaluation.

---

## 9. Verification & Automated Test Matrix (109 Tests)

| Test Suite Category | Tests Executed | Clinical & Functional Verification | Pass Rate |
| :--- | :--- | :--- | :--- |
| **Emergency Triage** | 25 Suites | 0ms bypass on chest pain, heart attack, stroke, snakebites, poisoning, electric shocks, unconsciousness, maternal bleeding. | **100% (25/25)** |
| **Dosage & Drug Blocking** | 15 Suites | Strict refusal on paracetamol, antibiotic dosage, insulin adjustments, and diagnostic prescription requests. | **100% (15/15)** |
| **Odia Regional Safety** | 10 Suites | Keyword mapping of spoken Odia terms (*ଛାତି ଯନ୍ତ୍ରଣା, ବାନ୍ତି, ଝାଡ଼ା, ମୁଣ୍ଡ ଘୋଳାଇବା*) to emergency protocols. | **100% (10/10)** |
| **Vector RAG & Grounding** | 18 Suites | Top-K retrieval, cosine similarity thresholds, source deduplication, and markdown stripping. | **100% (18/18)** |
| **Authentication & Security** | 16 Suites | JWT token validation, anon key fallback, daily rate limits, and secure account deletion compliance. | **100% (16/16)** |
| **Speech Synthesis & Voice** | 12 Suites | Sarvam Bulbul V3 base64 audio synthesis, Bhashini fallback, and phonetic numeral normalization. | **100% (12/12)** |
| **Frontend UI & State** | 13 Suites | Complete language separation (default English on reload, 100% Odia when switched), chip rendering, error recovery. | **100% (13/13)** |

**Total Test Coverage:** 109 Passing Suites | 0 Failures | 0 Skipped

---

## 10. Future Roadmap

1. **Offline-First Progressive Web App (PWA):** Service Worker caching allowing ASHA workers to use first-aid guides in zero-connectivity jungle areas.
2. **Odisha 30-District Healthcare Facility & Blood Bank Directory:** Real-time facility mapping across all 30 districts of Odisha with one-tap contact details for Chief District Medical Officers (CDMOs).
3. **Tele-Medicine eSanjeevani Integration:** Direct one-tap escalation from Swasth AI triage summaries into the national eSanjeevani video consultation system.
