const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const offlineAndPdfModule = `
  // ============================================================
  // 1-CLICK DOCTOR TRIAGE SLIP (PDF) & OFFLINE EMERGENCY SUITE
  // ============================================================

  // Minimal standard-compliant PDF 1.3 container wrapper for JPEG stream (Under 50 KB)
  function wrapJpegInPdf(jpegBytes, width, height) {
    const contentStream = 'q\\n595.28 0 0 841.89 0 0 cm\\n/Im1 Do\\nQ\\n';
    const parts = [];
    const offsets = [];

    let cur = 0;
    function add(bufOrStr) {
      let buf;
      if (typeof bufOrStr === 'string') {
        buf = new Uint8Array(bufOrStr.length);
        for (let i = 0; i < bufOrStr.length; i++) buf[i] = bufOrStr.charCodeAt(i) & 0xff;
      } else {
        buf = bufOrStr;
      }
      parts.push(buf);
      cur += buf.length;
    }

    add('%PDF-1.3\\n');
    
    offsets[1] = cur;
    add('1 0 obj\\n<</Type /Catalog /Pages 2 0 R>>\\nendobj\\n');

    offsets[2] = cur;
    add('2 0 obj\\n<</Type /Pages /Kids [3 0 R] /Count 1>>\\nendobj\\n');

    offsets[3] = cur;
    add('3 0 obj\\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources <</XObject <</Im1 4 0 R>>>> /Contents 5 0 R>>\\nendobj\\n');

    offsets[4] = cur;
    add('4 0 obj\\n<</Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + '>>\\nstream\\n');
    add(jpegBytes);
    add('\\nendstream\\nendobj\\n');

    offsets[5] = cur;
    add('5 0 obj\\n<</Length ' + contentStream.length + '>>\\nstream\\n' + contentStream + 'endstream\\nendobj\\n');

    const startxref = cur;
    add('xref\\n0 6\\n0000000000 65535 f \\n');
    for (let i = 1; i <= 5; i++) {
      const off = String(offsets[i]).padStart(10, '0');
      add(off + ' 00000 n \\n');
    }
    add('trailer\\n<</Size 6 /Root 1 0 R>>\\nstartxref\\n' + startxref + '\\n%%EOF\\n');

    let totalLen = 0;
    for (let i = 0; i < parts.length; i++) totalLen += parts[i].length;
    const finalBuf = new Uint8Array(totalLen);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      finalBuf.set(parts[i], offset);
      offset += parts[i].length;
    }
    return finalBuf;
  }

  function downloadDoctorTriageSlip(queryText, answerText, lang, meta = {}, triggerBtn = null) {
    if (typeof document === 'undefined') return;
    if (triggerBtn) {
      triggerBtn.classList.add('downloading');
      const origText = triggerBtn.innerHTML;
      triggerBtn.innerHTML = '<span>⏳</span> <span class="pdf-btn-label">' + (lang === 'hi' ? 'तैयार हो रहा है...' : (lang === 'or' ? 'ପ୍ରସ୍ତୁତ ହେଉଛି...' : 'Generating PDF...')) + '</span>';
      setTimeout(() => {
        triggerBtn.classList.remove('downloading');
        triggerBtn.innerHTML = origText;
      }, 2500);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1130;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1130);

      // Emerald Header Banner
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 800, 110);

      // Top White Title & Emblem
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('SWASTH AI (ସ୍ୱାସ୍ଥ୍ୟ AI / स्वास्थ्य AI)', 30, 42);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '13px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('Government of Odisha • Public Health Digital Triage Companion • SIH 25049 / F-204', 30, 68);

      ctx.font = '11px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('Official Clinical Protocol: Grounded strictly in WHO & MoHFW Medical Guidelines', 30, 90);

      // Right Top Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(610, 24, 160, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DOCTOR TRIAGE SLIP', 690, 44);
      ctx.textAlign = 'left';

      // Metadata Bar (Y: 110 to 155)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 110, 800, 45);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 155);
      ctx.lineTo(800, 155);
      ctx.stroke();

      const triageId = 'OD-TRG-' + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const deptName = meta.department ? meta.department.toUpperCase() : (meta.isVision ? 'DERMATOLOGY' : 'GENERAL MEDICINE');

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SLIP REF: ' + triageId, 30, 137);
      ctx.fillText('DATE: ' + dateStr + ', ' + timeStr, 220, 137);
      ctx.fillText('DEPT: ' + deptName, 440, 137);
      ctx.fillText('FACILITY: CHC / PHC REFERRAL', 590, 137);

      let curY = 180;

      function drawBox(x, y, w, h, bgColor, borderColor, borderLeftColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        if (borderLeftColor) {
          ctx.fillStyle = borderLeftColor;
          ctx.fillRect(x, y, 5, h);
        }
      }

      function renderWrappedText(text, x, y, maxWidth, lineHeight, maxLines, font, color) {
        ctx.font = font || '13px sans-serif';
        ctx.fillStyle = color || '#1e293b';
        const words = (text || '').replace(/\\n+/g, ' \\n ').split(' ');
        let line = '';
        let linesDrawn = 0;
        let lineY = y;

        for (let i = 0; i < words.length; i++) {
          if (words[i] === '\\n') {
            ctx.fillText(line.trim(), x, lineY);
            line = '';
            lineY += lineHeight;
            linesDrawn++;
            if (linesDrawn >= maxLines) break;
            continue;
          }
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line.length > 0) {
            ctx.fillText(line.trim(), x, lineY);
            line = words[i] + ' ';
            lineY += lineHeight;
            linesDrawn++;
            if (linesDrawn >= maxLines) break;
          } else {
            line = testLine;
          }
        }
        if (line.trim().length > 0 && linesDrawn < maxLines) {
          ctx.fillText(line.trim(), x, lineY);
          lineY += lineHeight;
        }
        return lineY;
      }

      // 1. SECTION: CHIEF COMPLAINT
      drawBox(30, curY, 740, 75, '#f8fafc', '#e2e8f0', '#0d9488');
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 12px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('1. PATIENT REPORTED COMPLAINT / ସମସ୍ୟା (Chief Symptoms):', 45, curY + 22);

      const cleanQuery = (queryText || 'General symptom consultation and clinical advice').trim();
      renderWrappedText(cleanQuery, 45, curY + 45, 710, 20, 2, '13px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#1e293b');
      curY += 95;

      // 2. SECTION: CLINICAL TRIAGE & SAFE CARE
      drawBox(30, curY, 740, 395, '#ffffff', '#cbd5e1', '#0369a1');
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 12px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('2. CLINICAL TRIAGE GUIDANCE & SAFE HOME CARE (WHO & MoHFW Grounded):', 45, curY + 24);

      const cleanAnswer = (answerText || '')
        .replace(/\\*\\*(.*?)\\*\\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      renderWrappedText(cleanAnswer, 45, curY + 52, 710, 21, 16, '12.5px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#1e293b');
      curY += 415;

      // 3. SECTION: NOTICE FOR CONSULTING DOCTOR
      drawBox(30, curY, 740, 115, '#fffbeb', '#fde68a', '#b45309');
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('⚠️ 3. MANDATORY DIRECTIVE FOR CONSULTING MEDICAL OFFICER (CHC / PHC / DHH):', 45, curY + 24);

      const doctorNotice = 'This clinical triage summary was generated by Swasth AI to assist patients and frontline health workers (ASHA/ANM) with early symptom awareness. The patient was STRICTLY instructed NOT to self-medicate with unprescribed antibiotics or OTC steroids. Please conduct a complete physical clinical examination, blood/diagnostic tests, and issue formal medical prescriptions and dosages.';
      renderWrappedText(doctorNotice, 45, curY + 46, 710, 19, 3, '11.5px "Plus Jakarta Sans", sans-serif', '#78350f');
      curY += 135;

      // 4. SECTION: EMERGENCY HELPLINES
      drawBox(30, curY, 740, 75, '#f0fdf4', '#bbf7d0', '#16a34a');
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('4. 24x7 ODISHA STATE EMERGENCY DIRECTORY & HELPLINES:', 45, curY + 22);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('🚑 Ambulance: 108', 55, curY + 50);
      ctx.fillText('🚨 National Emergency: 112', 230, curY + 50);
      ctx.fillText('📞 State Health Helpline: 104', 440, curY + 50);
      ctx.fillText('🧠 Tele-MANAS: 14416', 640, curY + 50);

      curY += 95;

      // Bottom Stamp
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Verified Clinical Triage Slip • Digitally Generated via Swasth AI Edge Engine (swasth-ai.pages.dev) • State of Odisha', 30, 1110);
      ctx.textAlign = 'right';
      ctx.fillText('Smart India Hackathon SIH 25049 • Page 1 of 1', 770, 1110);
      ctx.textAlign = 'left';

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const jpegBytes = new Uint8Array(reader.result);
            const pdfBytes = wrapJpegInPdf(jpegBytes, canvas.width, canvas.height);
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Swasth_AI_Doctor_Triage_Slip_' + triageId + '.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.82);
      }
    } catch (err) {
      console.error('Error generating PDF slip:', err);
    }
  }

  // 10 PRE-INSTALLED OFFLINE EMERGENCY PROTOCOLS FOR RURAL ODISHA
  const OFFLINE_PROTOCOLS = [
    {
      id: 'snakebite',
      icon: '🐍',
      title: {
        en: 'Snakebite Emergency Protocol',
        or: 'ସାପ କାମୁଡ଼ା ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା',
        hi: 'सांप काटने का आपातकालीन प्रोटोकॉल'
      },
      urgency: 'CRITICAL',
      summary: {
        en: 'Immediate hospital transfer required for Anti-Snake Venom (ASV). Minutes count.',
        or: 'ତୁରନ୍ତ ସରକାରୀ ହସ୍ପିଟାଲ ନେଇ Anti-Snake Venom (ASV) ଇଞ୍ଜେକ୍ସନ ଦିଅନ୍ତୁ । ପ୍ରତି ମିନିଟ୍ ମୂଲ୍ୟବାନ ।',
        hi: 'एंटी-स्नेक वेनम (ASV) के लिए तुरंत अस्पताल ले जाएं। समय बहुत कीमती है।'
      },
      dos: {
        en: [
          'Keep patient calm, lying down, and completely still.',
          'Immobilize the bitten limb using a rigid splint or cloth sling below heart level.',
          'Remove rings, anklets, bracelets, and tight clothing before swelling starts.',
          'Immediately call 108 for an ambulance or transport to nearest CHC/DHH.',
          'Note time of bite and snake features if seen safely (do NOT try to catch it).'
        ],
        or: [
          'ରୋଗୀଙ୍କୁ ଶାନ୍ତ ରଖନ୍ତୁ ଓ ସମ୍ପୂର୍ଣ୍ଣ ସ୍ଥିର ଭାବେ ଶୁଆଇ ରଖନ୍ତୁ ।',
          'କାମୁଡ଼ା ହୋଇଥିବା ହାତ ବା ଗୋଡ଼କୁ କାଠି/ପଟି ବାନ୍ଧି ହୃଦୟର ସ୍ତରଠାରୁ ତଳକୁ ସ୍ଥିର ରଖନ୍ତୁ ।',
          'ଫୁଲିବା ଆରମ୍ଭ ହେବା ପୂର୍ବରୁ ମୁଦି, ଝୁଣ୍ଟିଆ, ଚୁଡ଼ି ଓ କଷା ପୋଷାକ ଖୋଲିଦିଅନ୍ତୁ ।',
          'ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ବା ନିକଟସ୍ଥ CHC/DHH କୁ ଶୀଘ୍ର ନିଅନ୍ତୁ ।',
          'ସାପର ରଙ୍ଗ ବା ଚିହ୍ନ ମନେ ରଖନ୍ତୁ (କିନ୍ତୁ ସାପ ଧରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ) ।'
        ],
        hi: [
          'मरीज को शांत रखें और बिल्कुल स्थिर लेटा कर रखें।',
          'काटे हुए हाथ या पैर को बिना हिलाए लकड़ी या कपड़े के सहारे हृदय के स्तर से नीचे रखें।',
          'सूजन शुरू होने से पहले अंगूठी, बिछिया, कड़े और तंग कपड़े तुरंत उतार दें।',
          'तुरंत 108 पर कॉल करें या नजदीकी सरकारी अस्पताल (CHC/DHH) ले जाएं।',
          'सांप का रंग या रूप याद रखें (किंतु उसे पकड़ने की कोशिश न करें)।'
        ]
      },
      donts: {
        en: [
          'NEVER cut the wound or make incisions (causes severe bleeding).',
          'NEVER attempt to suck venom by mouth or suction device.',
          'NEVER tie a tight rope/wire tourniquet (cuts circulation, causes gangrene and limb loss).',
          'NEVER apply electric shock, ice, cow dung, mud, or herbal pastes.',
          'NEVER waste critical time visiting traditional healers, gunias, or quacks.'
        ],
        or: [
          'କଦାପି କ୍ଷତ ସ୍ଥାନକୁ ବ୍ଲେଡ୍ ବା ଛୁରୀରେ କାଟନ୍ତୁ ନାହିଁ (ଭୟଙ୍କର ରକ୍ତସ୍ରାବ ହୁଏ) ।',
          'କଦାପି ପାଟିରେ ବିଷ ଶୋଷିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ଦଉଡ଼ି ବା ତାରରେ କଷିକରି ବାନ୍ଧନ୍ତୁ ନାହିଁ (ରକ୍ତ ଚଳାଚଳ ବନ୍ଦ ହୋଇ ଅଙ୍ଗ ସଢ଼ିଯାଏ) ।',
          'କଦାପି ବରଫ, ଗୋବର, ମାଟି ବା ଜଡ଼ିବୁଟି ଲେପ ଦିଅନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ଗୁଣିଆ ବା ଝାଡ଼ଫୁଙ୍କ କରି ଅମୂଲ୍ୟ ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'घाव पर कभी ब्लेड या चाकू से चीरा न लगाएं (गंभीर रक्तस्राव होता है)।',
          'मुंह से कभी जहर चूसने का प्रयास न करें।',
          'रस्सी या तार से कसकर टूनिकेट कभी न बांधें (रक्त प्रवाह रुकने से अंग काटना पड़ सकता है)।',
          'बर्फ, गोबर, मिट्टी या कोई जड़ी-बूटी कभी न लगाएं।',
          'झाड़-फूंक या तांत्रिक के पास जाकर कीमती समय कभी बर्बाद न करें।'
        ]
      },
      helpline: '108',
      keywords: ['snake', 'snakebite', 'poison', 'venom', 'viper', 'krait', 'cobra', 'ସାପ', 'ବିଷ', 'ନାଗ', 'ଚନ୍ଦନବୋଡ଼ା', 'ବାଉଁଶରାଣୀ', 'କାମୁଡ଼ା', 'सांप', 'सर्प', 'जहर', 'काटना']
    },
    {
      id: 'diarrhea',
      icon: '💧',
      title: {
        en: 'Acute Diarrhea & Dehydration (WHO ORS)',
        or: 'ତରଳ ଝାଡ଼ା ଓ ନିର୍ଜଳନ (WHO ORS ପଦ୍ଧତି)',
        hi: 'दस्त और गंभीर निर्जलीकरण (WHO ORS)'
      },
      urgency: 'HIGH',
      summary: {
        en: 'Prevention of fatal dehydration via WHO ORS and Zinc. Strictly NO unprescribed antibiotics.',
        or: 'ଜୀବନ ରକ୍ଷାକାରୀ WHO ORS ଏବଂ ଜିଙ୍କ୍ ଉପଚାର । ବିନା ଡାକ୍ତରୀ ପରାମର୍ଶରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ଖାଆନ୍ତୁ ନାହିଁ ।',
        hi: 'जीवनरक्षक WHO ORS और जिंक। बिना डॉक्टर की सलाह के एंटीबायोटिक बिल्कुल न लें।'
      },
      dos: {
        en: [
          'Mix 1 full packet of WHO ORS into exactly 1 Liter of clean boiled & cooled water.',
          'Give small frequent sips after every loose stool (Children: 50-100ml, Adults: 200-400ml).',
          'Emergency homemade solution (if no packet): 1 Liter clean water + 6 level teaspoons sugar + 1/2 teaspoon salt.',
          'Continue regular breastfeeding and light soft meals (khichdi, banana, coconut water).',
          'Give Zinc tablets (20mg daily) for 14 days to children under 5 to restore intestinal lining.'
        ],
        or: [
          '୧ ପ୍ୟାକେଟ୍ WHO ORS କୁ ଠିକ୍ ୧ ଲିଟର ଫୁଟା ଥଣ୍ଡା ପାଣିରେ ସମ୍ପୂର୍ଣ୍ଣ ଗୋଳାନ୍ତୁ ।',
          'ପ୍ରତିଥର ଝାଡ଼ା ପରେ ଧୀରେ ଧୀରେ ଚାମଚରେ ପିଆନ୍ତୁ (ଶିଶୁ: ୫୦-୧୦୦ମିଲି, ବଡ଼ମଣିଷ: ୨୦୦-୪୦୦ମିଲି) ।',
          'ଘରୋଇ ଜରୁରୀ ପାନୀୟ (ପ୍ୟାକେଟ୍ ନଥିଲେ): ୧ ଲିଟର ପାଣି + ୬ ଚାମଚ ଚିନି + ଅଧା ଚାମଚ ଲୁଣ ।',
          'ମା\' କ୍ଷୀର ଏବଂ ନରମ ଖାଦ୍ୟ (ଜାଉ, ଖେଚୁଡ଼ି, କଦଳୀ, ଡାବ ପାଣି) ବନ୍ଦ କରନ୍ତୁ ନାହିଁ ।',
          '୫ ବର୍ଷରୁ କମ୍ ପିଲାଙ୍କୁ ପୂରା ୧୪ ଦିନ ପର୍ଯ୍ୟନ୍ତ ଦୈନିକ ୨୦ ମିଗ୍ରା ଜିଙ୍କ୍ ବଟିକା ଖୁଆନ୍ତୁ ।'
        ],
        hi: [
          '1 पैकेट WHO ORS को ठीक 1 लीटर उबले और ठंडे पानी में अच्छी तरह घोलें।',
          'हर बार दस्त के बाद थोड़ा-थोड़ा पिलाएं (बच्चे: 50-100ml, वयस्क: 200-400ml)।',
          'घरेलू आपातकालीन घोल: 1 लीटर पानी + 6 चम्मच चीनी + 1/2 चम्मच नमक।',
          'स्तनपान और हल्का भोजन (खिचड़ी, केला, नारियल पानी) जारी रखें।',
          '5 साल से कम उम्र के बच्चों को पूरे 14 दिन तक रोजाना 20mg जिंक की गोली दें।'
        ]
      },
      donts: {
        en: [
          'DO NOT give unprescribed antibiotics or antimotility pills (Loperamide/Norflox-TZ).',
          'DO NOT dilute ORS with milk, tea, juice, or sweetened aerated drinks.',
          'DO NOT stop breastfeeding or withhold food from a sick child.'
        ],
        or: [
          'କଦାପି ବିନା ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ବା ଝାଡ଼ା ବନ୍ଦ ଔଷଧ (Loperamide) ଖାଆନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ORS କୁ କ୍ଷୀର, ଚା\', କୋଲ୍ଡ ଡ୍ରିଙ୍କ୍ସ ବା ମିଠା ରସରେ ଗୋଳାନ୍ତୁ ନାହିଁ ।',
          'ଅସୁସ୍ଥ ଶିଶୁକୁ ମା\' କ୍ଷୀର ବା ଖାଦ୍ୟ ଦେବାରୁ କେବେ ବଞ୍ଚିତ କରନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'बिना डॉक्टर के पर्चे के एंटीबायोटिक या दस्त रोकने वाली दवाएं (Loperamide) न लें।',
          'ORS को दूध, चाय, जूस या कोल्ड ड्रिंक्स में न घोलें।',
          'बीमार बच्चे का स्तनपान या भोजन कभी बंद न करें।'
        ]
      },
      helpline: '104',
      keywords: ['diarrhea', 'dehydration', 'ors', 'vomiting', 'loose motions', 'stomach infection', 'zinc', 'ଝାଡ଼ା', 'ବାନ୍ତି', 'ପତଳା ଝାଡ଼ା', 'ନିର୍ଜଳନ', 'ଓଆରଏସ', 'ଜଳଶୂନ୍ୟତା', 'दस्त', 'उल्टी', 'ओआरएस', 'निर्जलीकरण']
    },
    {
      id: 'heatstroke',
      icon: '☀️',
      title: {
        en: 'Heatstroke & Loo Emergency',
        or: 'ଅଂଶୁଘାତ (ଲୁ\') ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା',
        hi: 'लू लगना व हीटस्ट्रोक आपातकालीन उपचार'
      },
      urgency: 'CRITICAL',
      summary: {
        en: 'Rapid cooling protocol to prevent fatal brain and organ damage during extreme heat.',
        or: 'ଅତ୍ୟଧିକ ଖରା ଓ ତାତି ଯୋଗୁଁ ମସ୍ତିଷ୍କ ଓ ଶରୀରକୁ ସୁରକ୍ଷା ଦେବା ପାଇଁ ତୁରନ୍ତ ଥଣ୍ଡା କରିବା ପ୍ରୋଟୋକଲ୍ ।',
        hi: 'अत्यधिक गर्मी में मस्तिष्क और अंगों को नुकसान से बचाने हेतु त्वरित शीतलन प्रोटोकॉल।'
      },
      dos: {
        en: [
          'Immediately move victim to a shaded, well-ventilated, or fan-cooled area.',
          'Remove or loosen tight and heavy clothing.',
          'Sponge the entire body continuously with cool tap water.',
          'Place cold damp cloths or ice packs on neck, armpits, and groin.',
          'Fan vigorously. If alert, give cool water with ORS or coconut water.',
          'Call 108 if body temperature exceeds 104°F, or if patient is delirious or unconscious.'
        ],
        or: [
          'ରୋଗୀଙ୍କୁ ତୁରନ୍ତ ଖରାରୁ ଆଣି ଛାଇ, ପବନ ଚଳାଚଳ ଥିବା ଥଣ୍ଡା ସ୍ଥାନରେ ଶୁଆନ୍ତୁ ।',
          'ପୋଷାକ ଢିଲା କରନ୍ତୁ ବା ଅତ୍ୟଧିକ ପୋଷାକ କାଢ଼ିଦିଅନ୍ତୁ ।',
          'ସାରା ଶରୀରରେ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ପଟି ପକାଇ ସ୍ପଞ୍ଜ କରନ୍ତୁ ।',
          'ବେକ, କାଖ ଓ ଜଙ୍ଘ ମୂଳରେ ଥଣ୍ଡା ପାଣି ପଟି ରଖନ୍ତୁ ।',
          'ଜୋରରେ ପଙ୍ଖା କରନ୍ତୁ । ଚେତା ଥିଲେ ଥଣ୍ଡା ପାଣିରେ ORS, ଲେମ୍ବୁ ପାଣି ବା ଡାବ ପାଣି ଦିଅନ୍ତୁ ।',
          'ଜ୍ୱର ୧୦୪°F ରୁ ଅଧିକ ହେଲେ କିମ୍ବା ବାତ ମାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।'
        ],
        hi: [
          'मरीज को तुरंत धूप से हटाकर छायादार और हवादार स्थान पर ले जाएं।',
          'मरीज के तंग और भारी कपड़े ढीले करें या उतार दें।',
          'पूरे शरीर पर ठंडे सामान्य पानी की पट्टियां रखकर लगातार स्पंज करें।',
          'गर्दन, बगल और जांघों के जोड़ों पर ठंडे पानी की पट्टियां रखें।',
          'लगातार पंखा चलाएं। होश में होने पर ओआरएस या नींबू-नमक का पानी पिलाएं।',
          'बुखार 104°F से अधिक होने या बेहोश होने पर तुरंत 108 पर एम्बुलेंस बुलाएं।'
        ]
      },
      donts: {
        en: [
          'DO NOT give oral fluids to an unconscious, seizing, or vomiting person.',
          'DO NOT give Paracetamol/Aspirin for heatstroke (ineffective and can harm liver).',
          'DO NOT plunge patient into ice water.'
        ],
        or: [
          'ଅଚେତ, ବାତ ମାରୁଥିବା ବା ବାନ୍ତି କରୁଥିବା ରୋଗୀଙ୍କୁ କଦାପି ପାଣି ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।',
          'ଅଂଶୁଘାତ ପାଇଁ ପାରାସିଟାମଲ ବା ଆସ୍ପିରିନ୍ ଦିଅନ୍ତୁ ନାହିଁ (ଏହା ଯକୃତ ପାଇଁ ହାନିକାରକ) ।',
          'ରୋଗୀଙ୍କୁ ସିଧାସଳଖ ବରଫ ପାଣିରେ ବୁଡ଼ାନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'बेहोश या उल्टी कर रहे व्यक्ति के मुंह में पानी या कोई तरल बिल्कुल न डालें।',
          'लू लगने पर पैरासिटामोल या एस्पिरिन न दें।',
          'मरीज को सीधे बर्फ के पानी में न डुबोएं।'
        ]
      },
      helpline: '108',
      keywords: ['heat', 'heatstroke', 'loo', 'sunstroke', 'extreme heat', 'summer fever', 'ଅଂଶୁଘାତ', 'ଲୁ', 'ଖରା', 'ଗରମ', 'ତାତି', 'लू', 'हीटस्ट्रोक', 'गर्मी', 'धूप']
    },
    {
      id: 'pregnancy',
      icon: '🤰',
      title: {
        en: 'Maternal Red Flags in Pregnancy',
        or: 'ଗର୍ଭାବସ୍ଥାରେ ଜରୁରୀକାଳୀନ ବିପଦ ଲକ୍ଷଣ',
        hi: 'गर्भावस्था में आपातकालीन खतरे के संकेत'
      },
      urgency: 'CRITICAL',
      summary: {
        en: 'Immediate emergency transport via 108 or Janani Express 102. Saves mother and child.',
        or: '୧୦୮ ବା ଜନନୀ ଏକ୍ସପ୍ରେସ୍ ୧୦୨ ଦ୍ୱାରା ତୁରନ୍ତ ଡାକ୍ତରଖାନା ସ୍ଥାନାନ୍ତର । ମା\' ଓ ଶିଶୁର ଜୀବନ ରକ୍ଷା ।',
        hi: '108 या जननी एक्सप्रेस 102 द्वारा तुरंत अस्पताल ले जाएं। मां और बच्चे की जान बचाएं।'
      },
      dos: {
        en: [
          'Any vaginal bleeding requires immediate hospital transfer.',
          'Severe persistent headache, blurred vision, or facial swelling indicates high blood pressure (Eclampsia).',
          'Lie the mother on her LEFT side to optimize blood flow to fetus.',
          'Call 108 (Ambulance) or 102 (Janani Express) immediately.',
          'Keep Mother and Child Protection (MCP) card ready.'
        ],
        or: [
          'ଗର୍ଭାବସ୍ଥାରେ କିମ୍ବା ପ୍ରସବ ପରେ ଯେକୌଣସି ରକ୍ତସ୍ରାବ ଦେଖାଦେଲେ ତୁରନ୍ତ ଡାକ୍ତରଖାନା ନିଅନ୍ତୁ ।',
          'ଅତ୍ୟଧିକ ମୁଣ୍ଡବିନ୍ଧା, ଆଖିକୁ ଝାପ୍‌ସା ଦେଖାଯିବା, ମୁହଁ ଓ ହାତ ଫୁଲିବା (ଉଚ୍ଚ ରକ୍ତଚାପ/ବାତର ଲକ୍ଷଣ) ।',
          'ମା\'ଙ୍କୁ ବାମ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଶିଶୁକୁ ଠିକ୍ ଭାବେ ରକ୍ତ ଚଳାଚଳ ହେବ ।',
          'ତୁରନ୍ତ ୧୦୮ (ଆମ୍ବୁଲାନ୍ସ) ବା ୧୦୨ (ଜନନୀ ଏକ୍ସପ୍ରେସ୍) କୁ ଫୋନ୍ କରନ୍ତୁ ।',
          'ମମତା/ମାତୃ ସୁରକ୍ଷା କାର୍ଡ଼ (MCP Card) ସାଙ୍ଗରେ ନିଅନ୍ତୁ ।'
        ],
        hi: [
          'गर्भावस्था या प्रसव के बाद कोई भी रक्तस्राव होने पर तुरंत अस्पताल ले जाएं।',
          'तेज सिरदर्द, धुंधला दिखना, चेहरे पर सूजन उच्च रक्तचाप का संकेत है।',
          'गर्भवती महिला को बाईं करवट लिटाएं।',
          'तुरंत 108 (एम्बुलेंस) या 102 (जननी एक्सप्रेस) पर फोन करें।',
          'मातृ एवं शिशु सुरक्षा (MCP) कार्ड साथ रखें।'
        ]
      },
      donts: {
        en: [
          'DO NOT delay seeking care if baby stops moving for 12 hours.',
          'DO NOT attempt unassisted home delivery if high-risk signs are present.',
          'DO NOT consume unverified herbal concoctions.'
        ],
        or: [
          'ଶିଶୁର ଚଳପ୍ରଚଳ ୧୨ ଘଣ୍ଟା ଧରି ବନ୍ଦ ଥିଲେ ଆଦୌ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ ।',
          'ବିପଦ ଲକ୍ଷଣ ଥିଲେ କଦାପି ଘରେ ପ୍ରସବ କରାଇବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।',
          'ବେଦନା କମାଇବା ପାଇଁ କୌଣସି ଜଡ଼ିବୁଟି ବା କାଢ଼ା ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'यदि बच्चा 12 घंटे तक न हिले तो जरा भी देरी न करें।',
          'खतरे के संकेत होने पर कभी भी घर पर प्रसव कराने का जोखिम न लें।'
        ]
      },
      helpline: '108',
      keywords: ['pregnancy', 'pregnant', 'bleeding', 'labor', 'delivery', 'maternal', 'baby movement', 'preeclampsia', 'ଗର୍ଭବତୀ', 'ରକ୍ତସ୍ରାବ', 'ପ୍ରସବ', 'ମାତୃ', 'ଶିଶୁ ଚଳନ', 'ଗର୍ଭ', 'गर्भावस्था', 'गर्भवती', 'प्रसव', 'रक्तस्राव']
    },
    {
      id: 'chestpain',
      icon: '❤️',
      title: {
        en: 'Chest Pain & Suspected Heart Attack',
        or: 'ଛାତି ଯନ୍ତ୍ରଣା ଓ ହୃଦଘାତ ଆପାତକାଳୀନ ପଦକ୍ଷେପ',
        hi: 'सीने में दर्द व संभावित दिल का दौरा'
      },
      urgency: 'CRITICAL',
      summary: {
        en: '0ms emergency referral to 108 ambulance with Golden Hour cardiac rest.',
        or: 'ଗୋଲ୍ଡେନ୍ ଆୱାର୍ ହୃଦ୍‌ରୋଗ ସୁରକ୍ଷା ପାଇଁ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ବିଶ୍ରାମ ।',
        hi: 'गोल्डन ऑवर में 108 एम्बुलेंस को कॉल और पूर्ण आराम।'
      },
      dos: {
        en: [
          'Have patient stop all activity and sit upright in comfortable supported posture (W-sitting).',
          'Loosen collar, tie, belt, and tight clothing.',
          'If not allergic and advised, have adult chew one 300mg Soluble Aspirin/Disprin.',
          'Immediately call 108 for an ambulance.',
          'If person stops breathing normally, start CPR (30 chest compressions at 100-120 bpm).'
        ],
        or: [
          'ରୋଗୀଙ୍କ ସମସ୍ତ ଚଳପ୍ରଚଳ ବନ୍ଦ କରାଇ ଆଉଜି ବସାନ୍ତୁ (W-position) ।',
          'କଲର, ବେଲ୍ଟ ଓ କଷା ପୋଷାକ ଢିଲା କରନ୍ତୁ ।',
          'ଯଦି ଆଲର୍ଜି ନାହିଁ, ୩୦୦ ମିଗ୍ରା ଆସ୍ପିରିନ୍ (Disprin) ବଟିକା ଚୋବାଇ ଖାଇବାକୁ ଦିଅନ୍ତୁ ।',
          'ତୁରନ୍ତ ୧୦୮ ଆମ୍ବୁଲାନ୍ସକୁ କଲ୍ କରନ୍ତୁ ।',
          'ରୋଗୀ ଅଚେତ ହୋଇ ଶ୍ୱାସକ୍ରିୟା ବନ୍ଦ ହେଲେ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ ।'
        ],
        hi: [
          'मरीज की सारी हलचल रोकें और पीठ को सहारा देकर आराम से बैठाएं।',
          'कॉलर, बेल्ट और तंग कपड़े ढीले करें।',
          'यदि एलर्जी न हो, तो 300mg एस्पिरिन (डिस्प्रिन) की एक गोली चबाने को दें।',
          'तुरंत 108 पर एम्बुलेंस बुलाएं।'
        ]
      },
      donts: {
        en: [
          'DO NOT let the patient walk, climb stairs, or exert themselves.',
          'DO NOT assume it is mere "gas" if accompanied by cold sweat and arm pain.'
        ],
        or: [
          'ରୋଗୀଙ୍କୁ ଆଦୌ ଚାଲିବାକୁ ବା ସିଡ଼ି ଚଢ଼ିବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।',
          'ପ୍ରବଳ ଝାଳ ବୋହିବା ଓ ବାମ ହାତ ଯନ୍ତ୍ରଣା ଥିଲେ ଏହାକୁ କେବଳ "ଗ୍ୟାସ" ଭାବି ଅଣଦେଖା କରନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'मरीज को चलने, सीढ़ी चढ़ने बिल्कुल न दें।',
          'पसीने के साथ दर्द को केवल गैस मानकर नजरअंदाज न करें।'
        ]
      },
      helpline: '108',
      keywords: ['chest pain', 'heart attack', 'heart', 'cardiac', 'left arm pain', 'sweating', 'angina', 'ଛାତି ଯନ୍ତ୍ରଣା', 'ହୃଦଘାତ', 'ହାର୍ଟ ଆଟାକ', 'ବାମ ହାତ ବିନ୍ଧା', 'ଛାତି', 'सीने में दर्द', 'हार्ट अटैक', 'दिल का दौरा']
    },
    {
      id: 'burns',
      icon: '🔥',
      title: {
        en: 'Burn Injuries & Scalds First Aid',
        or: 'ପୋଡ଼ିଯିବା ଆଘାତର ପ୍ରାଥମିକ ଚିକିତ୍ସା',
        hi: 'जलने व झुलसने पर प्राथमिक उपचार'
      },
      urgency: 'HIGH',
      summary: {
        en: '20 minutes continuous cool tap water. Strictly avoid toothpaste, ink, or turmeric.',
        or: 'ଲଗାତାର ୨୦ ମିନିଟ୍ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ । କଦାପି କାଳି, କୋଲଗେଟ୍ ବା ହଳଦୀ ଲଗାନ୍ତୁ ନାହିଁ ।',
        hi: 'लगातार 20 मिनट तक नल का ठंडा पानी डालें। टूथपेस्ट, स्याही या हल्दी बिल्कुल न लगाएं।'
      },
      dos: {
        en: [
          'Pour clean, cool running tap water continuously over the burn for at least 15 to 20 minutes.',
          'Gently remove rings, jewelry, and loose clothing before the burnt area swells.',
          'Cover loosely with a clean, sterile cloth.',
          'Seek urgent medical care at nearest CHC/DHH burn unit.'
        ],
        or: [
          'ପୋଡ଼ିଯାଇଥିବା ସ୍ଥାନ ଉପରେ ଅତିକମରେ ୧୫ ରୁ ୨୦ ମିନିଟ୍ ଧରି ନଳକୂଅ ବା ଟ୍ୟାପ୍ ର ସଫା ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ ।',
          'ଫୁଲିବା ପୂର୍ବରୁ ଆଘାତ ପାଖରେ ଥିବା ମୁଦି, ଚୁଡ଼ି ଓ ଢିଲା ପୋଷାକ ସାବଧାନରେ ଖୋଲିଦିଅନ୍ତୁ ।',
          'ସଂକ୍ରମଣରୁ ରକ୍ଷା ପାଇଁ ପରିଷ୍କାର ସଫା କପଡ଼ାରେ ଢିଲା ଭାବେ ଘୋଡ଼ାଇ ରଖନ୍ତୁ ।',
          'ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/DHH ର ବର୍ଣ୍ଣ ୱାର୍ଡ଼କୁ ନିଅନ୍ତୁ ।'
        ],
        hi: [
          'जले हुए स्थान पर कम से कम 15 से 20 मिनट तक नल का साफ ठंडा पानी लगातार डालें।',
          'अंगूठी, कड़े और ढीले कपड़े सूजन आने से पहले उतार दें।',
          'संक्रमण से बचाने के लिए साफ सूखे कपड़े से ढकें।',
          'नजदीकी अस्पताल तुरंत ले जाएं।'
        ]
      },
      donts: {
        en: [
          'DO NOT apply toothpaste, ink, engine oil, turmeric, cow dung, or butter.',
          'DO NOT use freezing ice or ice water.',
          'DO NOT pop or prick burn blisters.'
        ],
        or: [
          'କଦାପି କୋଲଗେଟ୍/ଟୁଥପେଷ୍ଟ, କାଳି, ତେଲ, ହଳଦୀ, ଗୋବର ବା ଘିଅ ଲଗାନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ବରଫ ଲଗାନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ପୋଡ଼ା ଫୋଟକାକୁ ଫୁଟାନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'टूथपेस्ट, स्याही, तेल, हल्दी, गोबर कभी न लगाएं।',
          'बर्फ का सीधा इस्तेमाल न करें।',
          'जले के छालों को न फोड़ें।'
        ]
      },
      helpline: '108',
      keywords: ['burn', 'burns', 'scald', 'fire', 'hot water', 'electric burn', 'ପୋଡ଼ିଯିବା', 'ନିଆଁ', 'ଗରମ ପାଣି', 'ଜଳାପୋଡ଼ା', 'ଫୋଟକା', 'जलना', 'झुलसना', 'आग', 'छाला']
    },
    {
      id: 'dogbite',
      icon: '🐕',
      title: {
        en: 'Dog Bite & Rabies Prevention Protocol',
        or: 'କୁକୁର କାମୁଡ଼ା ଓ ରେବିସ୍ ସୁରକ୍ଷା ପ୍ରୋଟୋକଲ୍',
        hi: 'कुत्ता काटना व रेबीज रोकथाम'
      },
      urgency: 'HIGH',
      summary: {
        en: '15-minute continuous soap water wash + urgent Anti-Rabies Vaccine (ARV).',
        or: '୧୫ ମିନିଟ୍ ସାବୁନ ଓ ଟ୍ୟାପ୍ ପାଣିରେ ଧୋଇବା + ତୁରନ୍ତ ଡାକ୍ତରଖାନାରେ ଆଣ୍ଟି-ରେବିସ୍ ଟିକା (ARV) ।',
        hi: '15 मिनट तक साबुन-पानी से लगातार धोएं + तुरंत एंटी-रेबीज टीका (ARV) लगवाएं।'
      },
      dos: {
        en: [
          'Immediately wash bite wound under running tap water with soap for a FULL 15 MINUTES.',
          'Washing removes over 80% of rabies virus particles before they bind to nerves.',
          'Apply povidone-iodine (Betadine) antiseptic if available.',
          'Rush to nearest government CHC/DHH for full 4-dose Anti-Rabies Vaccine (ARV) regimen.'
        ],
        or: [
          'କାମୁଡ଼ା ବା ଆଞ୍ଚୁଡ଼ା ସ୍ଥାନକୁ ତୁରନ୍ତ ଟ୍ୟାପ୍ ର ଚାଲୁଥିବା ପାଣି ଏବଂ ସାବୁନରେ ପୂରା ୧୫ ମିନିଟ୍ ଧରି ଲଗାତାର ଧୁଅନ୍ତୁ ।',
          'ଏହି ୧୫ ମିନିଟ୍ ଧୋଇବା ଦ୍ୱାରା ୮୦% ରୁ ଅଧିକ ରେବିସ୍ ଭାଇରସ୍ ନଷ୍ଟ ହୋଇଯାଏ ।',
          'ଉପଲବ୍ଧ ଥିଲେ ପୋଭିଡୋନ୍-ଆୟୋଡିନ୍ (ବେଟାଡାଇନ୍) ଲଗାନ୍ତୁ ।',
          'ତୁରନ୍ତ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲକୁ ଯାଇ Anti-Rabies Vaccine (ARV) ଟିକା ନିଅନ୍ତୁ ।'
        ],
        hi: [
          'घाव को तुरंत नल के बहते पानी और साबुन से पूरे 15 मिनट तक लगातार धोएं।',
          '15 मिनट धोने से 80% से अधिक रेबीज वायरस घाव से बाहर निकल जाता है।',
          'उपलब्ध हो तो पोविडोन-आयोडीन (बीटाडीन) लगाएं।',
          'तुरंत नजदीकी अस्पताल जाकर एंटी-रेबीज टीका (ARV) लगवाएं।'
        ]
      },
      donts: {
        en: [
          'DO NOT stitch or suture the wound immediately.',
          'DO NOT apply chili powder, lime, mud, or plant juices.'
        ],
        or: [
          'କଦାପି କ୍ଷତରେ ତୁରନ୍ତ ସିଲେଇ ବା ଷ୍ଟିଚ୍ ପକାନ୍ତୁ ନାହିଁ ।',
          'କଦାପି ଲଙ୍କାଗୁଣ୍ଡ, ଚୂନ ବା ମାଟି ଲଗାନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'घाव पर तुरंत टांके कभी न लगवाएं।',
          'घाव पर मिर्च पाउडर, चूना, मिट्टी कभी न लगाएं।'
        ]
      },
      helpline: '104',
      keywords: ['dog', 'dog bite', 'rabies', 'animal bite', 'cat bite', 'monkey bite', 'arv', 'କୁକୁର', 'କୁକୁର କାମୁଡ଼ା', 'ରେବିସ୍', 'ପଶୁ କାମୁଡ଼ା', 'ବିରାଡ଼ି', 'ଟିକା', 'कुत्ता', 'काटना', 'रेबीज', 'टीका']
    },
    {
      id: 'choking',
      icon: '🗣️',
      title: {
        en: 'Choking & Airway Emergency',
        or: 'ଶ୍ୱାସରୁଦ୍ଧ (ତଣ୍ଟିରେ ଖାଦ୍ୟ ଲାଗିଯିବା) ପ୍ରାଥମିକ ଚିକିତ୍ସା',
        hi: 'दम घुटना (गले में कुछ अटकना) प्राथमिक उपचार'
      },
      urgency: 'CRITICAL',
      summary: {
        en: 'Heimlich maneuver for adults; back blows and chest thrusts for infants.',
        or: 'ବଡ଼ମଣିଷଙ୍କ ପାଇଁ ହାଇମଲିକ୍ ଚାପ ଏବଂ ଛୋଟ ଶିଶୁଙ୍କ ପାଇଁ ପିଠି ଥାପୁଡ଼ା ପଦ୍ଧତି ।',
        hi: 'वयस्कों के लिए हेमलिच पैंतरेबाजी और शिशुओं के लिए पीठ पर थपकी विधि।'
      },
      dos: {
        en: [
          'For Adults: Stand behind them, place fist above navel, give quick upward abdominal thrusts (Heimlich maneuver).',
          'For Infants: Place baby face down on forearm, deliver 5 firm back blows between shoulder blades.',
          'Call 108 immediately if victim cannot breathe or speak.'
        ],
        or: [
          'ବୟସ୍କଙ୍କ ପାଇଁ: ପଛପଟେ ଛିଡ଼ା ହୋଇ ନାଭି ଉପରେ ମୁଠା ରଖି ଉପର ଆଡ଼କୁ ଚାପ ଦିଅନ୍ତୁ (Heimlich Maneuver) ।',
          'ଶିଶୁଙ୍କ ପାଇଁ: ହାତ ଉପରେ ଶିଶୁର ମୁହଁ ତଳକୁ ରଖି ପିଠିର ଦୁଇ ଡେଣା ମଝିରେ ୫ ଥର ସାବଧାନରେ ଥାପୁଡ଼ା ଦିଅନ୍ତୁ ।',
          'ରୋଗୀ ଶ୍ୱାସ ନେଇ ନପାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।'
        ],
        hi: [
          'वयस्कों के लिए: पीछे खड़े होकर नाभि के ऊपर मुट्ठी रखकर ऊपर की ओर झटका दें।',
          'शिशु के लिए: मुंह नीचे रखकर पीठ पर 5 बार थपकी दें।',
          'तुरंत 108 पर कॉल करें।'
        ]
      },
      donts: {
        en: [
          'DO NOT perform blind finger sweeps in mouth.',
          'DO NOT slap back while adult is standing upright.'
        ],
        or: [
          'ପାଟି ଭିତରେ ଅନ୍ଧାରିଆ ଭାବେ ଆଙ୍ଗୁଠି ପୂରାନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'मुंह में अंधी उंगली डालकर निकालने की कोशिश न करें।'
        ]
      },
      helpline: '108',
      keywords: ['choking', 'airway', 'swallowed', 'food stuck', 'cannot breathe', 'heimlich', 'ଶ୍ୱାସରୁଦ୍ଧ', 'ତଣ୍ଟି', 'ଅଟକିଯିବା', 'ଉಬ್ಬାସ', 'ଦମ୍ ବନ୍ଦ', 'दम घुटना', 'गले में अटकना']
    },
    {
      id: 'febrile',
      icon: '🌡️',
      title: {
        en: 'Pediatric High Fever & Febrile Fits',
        or: 'ଶିଶୁଙ୍କ ଅତ୍ୟଧିକ ଜ୍ୱର ଓ କମ୍ପଜ୍ୱର (ବାତ ମାରିବା)',
        hi: 'बच्चों में तेज़ बुखार व दौरे (कम्पन)'
      },
      urgency: 'HIGH',
      summary: {
        en: 'Safe recovery positioning and tepid tap-water sponging. Never force spoons into mouth.',
        or: 'ପିଲାଙ୍କୁ କଡ଼ ମାଡ଼ି ଶୁଆଇବା ଏବଂ ସାଧାରଣ ପାଣିରେ ସ୍ପଞ୍ଜ କରିବା । କଦାପି ପାଟିରେ ଚାମଚ ଦିଅନ୍ତୁ ନାହିଁ ।',
        hi: 'करवट लिटाएं और सामान्य पानी से स्पंज करें। मुंह में चम्मच या उंगली कभी न डालें।'
      },
      dos: {
        en: [
          'Place child gently onto their side (recovery position) to prevent choking on saliva.',
          'Sponge forehead, neck, and limbs continuously with normal room-temperature tap water.',
          'Loosen clothes and maintain gentle air circulation.',
          'Take child to nearest CHC/PHC for clinical evaluation after the fit stops.'
        ],
        or: [
          'ପିଲାକୁ ନରମ ବିଛଣାରେ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଲାଳ ବା ବାନ୍ତିରେ ଶ୍ୱାସରୁଦ୍ଧ ହେବ ନାହିଁ ।',
          'କପାଳ, ବେକ ଓ ହାତଗୋଡ଼କୁ ସାଧାରଣ ଟାପ୍ ପାଣି ପଟିରେ ଲଗାତାର ସ୍ପଞ୍ଜ କରନ୍ତୁ ।',
          'ବାତ ବନ୍ଦ ହେବା ପରେ ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/PHC ଡାକ୍ତରଙ୍କ ପାଖକୁ ନିଅନ୍ତୁ ।'
        ],
        hi: [
          'बच्चे को करवट लिटाएं ताकि लार से सांस न रुके।',
          'माथे, गर्दन और हाथ-पैरों पर सामान्य पानी की पट्टी रखकर स्पंज करें।',
          'दौरा शांत होने पर तुरंत अस्पताल ले जाएं।'
        ]
      },
      donts: {
        en: [
          'NEVER force a spoon, finger, or cloth into child\'s mouth during a seizure.',
          'NEVER give oral medicine or water while child is actively convulsing.'
        ],
        or: [
          'ବାତ ମାରୁଥିବା ସମୟରେ କଦାପି ପାଟିରେ ଚାମଚ, ଆଙ୍ଗୁଠି ବା କପଡ଼ା ଜୋରକରି ପୂରାନ୍ତୁ ନାହିଁ ।',
          'ଅଚେତ ଥିବା ବେଳେ ପାଟିରେ ଔଷଧ ବା ପାଣି ଦିଅନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'दौरे के समय मुंह में चम्मच या उंगली बिल्कुल न डालें।',
          'बेहोशी में मुंह में दवा या पानी न डालें।'
        ]
      },
      helpline: '104',
      keywords: ['fever', 'high fever', 'convulsions', 'seizures', 'fits', 'child fever', 'febrile', 'ଜ୍ୱର', 'ବାତ', 'କମ୍ପ', 'ପିଲା ଜ୍ୱର', 'ଫିଟ୍ସ', 'ତେଜ ଜ୍ୱର', 'बुखार', 'दौरा', 'कम्पन', 'बच्चा']
    },
    {
      id: 'drowning',
      icon: '🏊',
      title: {
        en: 'Drowning & CPR First Aid Protocol',
        or: 'ପାଣିରେ ବୁଡ଼ିଯିବା ଓ CPR ପ୍ରାଥମିକ ଚିକିତ୍ସା',
        hi: 'डूबने पर प्राथमिक उपचार व सीपीआर'
      },
      urgency: 'CRITICAL',
      summary: {
        en: 'Safe extrication, clearing airway, and immediate CPR (30 compressions : 2 rescue breaths).',
        or: 'ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର, ଶ୍ୱାସନଳୀ ସଫା କରିବା ଏବଂ ତୁରନ୍ତ CPR (୩୦ ଛାତି ଚାପ : ୨ ଶ୍ୱାସ) ।',
        hi: 'सुरक्षित बाहर निकालें, सांस की नली साफ करें और तुरंत सीपीआर (30 दबाव : 2 सांस) दें।'
      },
      dos: {
        en: [
          'Remove victim from water safely. Call 108 immediately.',
          'Check breathing. If not breathing normally, place on firm ground.',
          'Start CPR: Place heel of hand on center of chest. Push hard and fast (100-120 compressions/min).',
          'Give 30 chest compressions followed by 2 gentle rescue breaths.'
        ],
        or: [
          'ରୋଗୀଙ୍କୁ ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର କରନ୍ତୁ । ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।',
          'ଶ୍ୱାସ ନଚାଲିଲେ ଟାଣ ଚଟାଣରେ ଶୁଆଇ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ (ମିନିଟକୁ ୧୦୦-୧୨୦ ଥର ଛାତି ଚାପ) ।',
          '୩୦ ଥର ଛାତି ଚାପ ପରେ ମୁଣ୍ଡ ଟେକି ନାକ ଚିପି ପାଟିରେ ୨ ଥର ଫୁଙ୍କ ଦିଅନ୍ତୁ ।'
        ],
        hi: [
          'मरीज को पानी से सुरक्षित बाहर निकालें। तुरंत 108 पर एम्बुलेंस बुलाएं।',
          'सांस न चलने पर तुरंत सीपीआर (30 दबाव : 2 सांस) शुरू करें।'
        ]
      },
      donts: {
        en: [
          'DO NOT waste time trying to pump water out of the stomach.',
          'DO NOT delay CPR if breathing is absent.'
        ],
        or: [
          'ପେଟରୁ ପାଣି ବାହାର କରିବା ପାଇଁ ଓଲଟା କରି ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।'
        ],
        hi: [
          'पेट से पानी निकालने के चक्कर में उल्टा लटकाकर समय बर्बाद न करें।'
        ]
      },
      helpline: '108',
      keywords: ['drowning', 'water', 'pond', 'river', 'cpr', 'submersion', 'ପାଣିରେ ବୁଡ଼ିଯିବା', 'ନଈ', 'ପୋଖରୀ', 'ପାଣି', 'ଶ୍ୱାସ ବନ୍ଦ', 'डूबना', 'पानी', 'सीपीआर']
    }
  ];

  let offlineSearchQuery = '';

  function matchOfflineEmergency(query) {
    if (!query) return null;
    const q = query.toLowerCase().trim();
    for (let i = 0; i < OFFLINE_PROTOCOLS.length; i++) {
      const proto = OFFLINE_PROTOCOLS[i];
      for (let j = 0; j < proto.keywords.length; j++) {
        if (q.includes(proto.keywords[j].toLowerCase())) {
          return proto;
        }
      }
    }
    return null;
  }

  function formatOfflineProtocolAnswer(proto, lang) {
    const isOr = lang === 'or';
    const isHi = lang === 'hi';
    const title = isHi ? proto.title.hi : (isOr ? proto.title.or : proto.title.en);
    const summary = isHi ? proto.summary.hi : (isOr ? proto.summary.or : proto.summary.en);
    const dosList = isHi ? proto.dos.hi : (isOr ? proto.dos.or : proto.dos.en);
    const dontsList = isHi ? proto.donts.hi : (isOr ? proto.donts.or : proto.donts.en);

    const dosHeader = isHi ? '✅ क्या करें (प्राथमिक उपचार):' : (isOr ? '✅ କ\\'ଣ କରିବେ (ପ୍ରାଥମିକ ଚିକିତ୍ସା):' : '✅ WHAT TO DO (First Aid):');
    const dontsHeader = isHi ? '❌ क्या न करें (सख्त मना):' : (isOr ? '❌ କ\\'ଣ କରିବେ ନାହିଁ (କଡ଼ା ନିଷେଧ):' : '❌ WHAT NOT TO DO (Dangerous):');
    const doctorHeader = isHi ? '🏥 डॉक्टर परामर्श:' : (isOr ? '🏥 ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ:' : '🏥 Hospital Consultation:');
    const doctorText = isHi
      ? 'तत्काल नजदीकी सीएचसी (CHC) या सरकारी अस्पताल ले जाएं। 108 पर कॉल करें।'
      : (isOr
        ? 'ତୁରନ୍ତ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲ ବା CHC କୁ ନିଅନ୍ତୁ । ଆମ୍ବୁଲାନ୍ସ ପାଇଁ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।'
        : 'Immediately transfer to nearest Community Health Centre (CHC) or District Hospital. Call 108 for ambulance.');

    let out = '⚡ **' + title + '**\\n\\n';
    out += '📘 **' + (isHi ? 'प्रोटोकॉल सारांश' : (isOr ? 'ପ୍ରୋଟୋକଲ୍ ସାରାଂଶ' : 'Protocol Overview')) + ':** ' + summary + '\\n\\n';
    out += '🏠 **' + dosHeader + '**\\n' + dosList.map((d) => '• ' + d).join('\\n') + '\\n\\n';
    out += '⚠️ **' + dontsHeader + '**\\n' + dontsList.map((d) => '• ' + d).join('\\n') + '\\n\\n';
    out += '🏥 **' + doctorHeader + '** ' + doctorText;
    return out;
  }

  function formatDefaultOfflineGuide(lang) {
    const isOr = lang === 'or';
    const isHi = lang === 'hi';
    if (isHi) {
      return '⚡ **ऑफ़लाइन आपातकालीन सेवा सक्रिय**\\n\\n📘 **ऑफ़लाइन गाइड:** इंटरनेट कनेक्शन उपलब्ध नहीं है। स्वास्थ एआई में 10 जीवनरक्षक आपातकालीन प्रोटोकॉल और ओडिशा के सभी 249 सरकारी अस्पताल पहले से सुरक्षित (Pre-installed) हैं।\\n\\n🏠 **उपलब्ध सुविधाएँ:**\\n• ऊपर "⚡ आपातकालीन ऑफ़लाइन गाइड" बटन दबाकर सर्पदंश, लू, दस्त, प्रसव व जलने के प्रोटोकॉल देखें।\\n• सभी 30 जिलों के 249 अस्पतालों की सूची बिना इंटरनेट के देखें।\\n\\n⚠️ **आपातकालीन हेल्पलाइन:**\\n• एम्बुलेंस: 108 | आपदा व पुलिस: 112 | स्वास्थ्य सलाह: 104';
    }
    if (isOr) {
      return '⚡ **ଅଫଲାଇନ୍ ଜରୁରୀକାଳୀନ ସେବା ସକ୍ରିୟ**\\n\\n📘 **ଅଫଲାଇନ୍ ସୂଚନା:** ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଉପଲବ୍ଧ ନାହିଁ । ସ୍ୱାସ୍ଥ୍ୟ AI ରେ ୧୦ଟି ପ୍ରମୁଖ ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା ନିର୍ଦ୍ଦେଶାବଳୀ ଏବଂ ଓଡ଼ିଶାର ସମସ୍ତ ୨୪୯ ସରକାରୀ ଡାକ୍ତରଖାନା ପୂର୍ବରୁ ଆପଣଙ୍କ ଫୋନରେ ସୁରକ୍ଷିତ ଅଛି ।\\n\\n🏠 **ଅଫଲାଇନ୍ ଉପଲବ୍ଧ ସୁବିଧା:**\\n• ଉପରେ ଥିବା "⚡ ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ କେୟାର" ବଟନ୍ ଦବାଇ ସାପ କାମୁଡ଼ା, ଅଂଶୁଘାତ, ଝାଡ଼ା ଓ ଗର୍ଭବତୀ ବିପଦ ଲକ୍ଷଣ ଦେଖନ୍ତୁ ।\\n• ୩୦ଟି ଜିଲ୍ଲାର ୨୪୯ ସରକାରୀ ଡାକ୍ତରଖାନା ବିନା ଇଣ୍ଟରନେଟରେ ଖୋଜନ୍ତୁ ।\\n\\n⚠️ **ଜରୁରୀକାଳୀନ ନମ୍ବର:**\\n• ଆମ୍ବୁଲାନ୍ସ: ୧୦୮ | ଜରୁରୀ ସହାୟତା: ୧୧୨ | ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ: ୧୦୪';
    }
    return '⚡ **Offline Emergency Protocol Active**\\n\\n📘 **Offline Mode:** No active internet connection detected. Swasth AI has 10 pre-installed emergency life-saving protocols and all 249 Odisha government hospitals stored locally on your device.\\n\\n🏠 **Offline Capabilities:**\\n• Tap the "⚡ Offline Care" button above to browse Snakebite, Heatstroke, Diarrhea, Maternal, and Burn protocols.\\n• Search all 249 government hospitals across 30 districts completely offline.\\n\\n⚠️ **Emergency Helplines:**\\n• Ambulance: 108 | National Emergency: 112 | Health Helpline: 104';
  }

  function renderOfflineProtocols(searchQuery = '') {
    const container = $('offlineProtocolsContainer');
    if (!container) return;
    container.innerHTML = '';

    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    const q = (searchQuery || '').toLowerCase().trim();

    const filtered = OFFLINE_PROTOCOLS.filter((p) => {
      if (!q) return true;
      const title = (isHi ? p.title.hi : (isOr ? p.title.or : p.title.en)).toLowerCase();
      const sum = (isHi ? p.summary.hi : (isOr ? p.summary.or : p.summary.en)).toLowerCase();
      const kwMatch = p.keywords.some((k) => k.toLowerCase().includes(q));
      return title.includes(q) || sum.includes(q) || kwMatch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-size:0.85rem;">' + (isHi ? 'कोई मेल नहीं मिला।' : (isOr ? 'କୌଣସି ପ୍ରୋଟୋକଲ୍ ମିଳିଲା ନାହିଁ ।' : 'No emergency protocols matched your search.')) + '</div>';
      return;
    }

    filtered.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'offline-proto-card';
      const title = isHi ? p.title.hi : (isOr ? p.title.or : p.title.en);
      const summary = isHi ? p.summary.hi : (isOr ? p.summary.or : p.summary.en);
      const dosList = isHi ? p.dos.hi : (isOr ? p.dos.or : p.dos.en);
      const dontsList = isHi ? p.donts.hi : (isOr ? p.donts.or : p.donts.en);

      card.innerHTML = \`
        <div class="offline-proto-head">
          <div class="offline-proto-title-box">
            <span class="offline-proto-icon">\${p.icon}</span>
            <span class="offline-proto-title">\${title}</span>
          </div>
          <div class="offline-proto-meta">
            <span class="offline-proto-badge badge-\${p.urgency === 'CRITICAL' ? 'critical' : 'high'}">\${p.urgency}</span>
            <span class="offline-proto-chevron">▼</span>
          </div>
        </div>
        <div class="offline-proto-body">
          <p class="offline-summary-text">\${summary}</p>
          <div class="offline-section-box box-dos">
            <strong>\${isHi ? '✅ क्या करें (DOs):' : (isOr ? '✅ କ\\'ଣ କରିବେ:' : '✅ What to do (DOs):')}</strong>
            <ul class="offline-list">
              \${dosList.map((item) => '<li>' + item + '</li>').join('')}
            </ul>
          </div>
          <div class="offline-section-box box-donts">
            <strong>\${isHi ? '❌ क्या न करें (DON\\'Ts):' : (isOr ? '❌ କ\\'ଣ କରିବେ ନାହିଁ:' : '❌ What NOT to do (DON\\'Ts):')}</strong>
            <ul class="offline-list">
              \${dontsList.map((item) => '<li>' + item + '</li>').join('')}
            </ul>
          </div>
          <div class="offline-proto-foot">
            <span style="font-size:0.75rem; color:#64748b;">\${isHi ? 'आपातकालीन सहायता:' : (isOr ? 'ଜରୁରୀକାଳୀନ ସେବା:' : 'Emergency Helpline:')}</span>
            <a href="tel:\${p.helpline}" class="btn-offline-call">📞 Call \${p.helpline}</a>
          </div>
        </div>
      \`;

      const head = card.querySelector('.offline-proto-head');
      if (head) {
        head.addEventListener('click', () => {
          card.classList.toggle('expanded');
        });
      }
      container.appendChild(card);
    });
  }

  function openOfflineModal() {
    const modal = $('offlineModal');
    if (modal && typeof modal.showModal === 'function') {
      renderOfflineProtocols(offlineSearchQuery);
      modal.showModal();
    }
  }

  function closeOfflineModal() {
    const modal = $('offlineModal');
    if (modal && typeof modal.close === 'function') {
      modal.close();
    }
  }

  function initOfflineEmergency() {
    const careBtn = $('offlineCareBtn');
    if (careBtn) careBtn.addEventListener('click', openOfflineModal);

    const closeBtn = $('closeOfflineModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeOfflineModal);

    const searchInput = $('offlineSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        offlineSearchQuery = e.target.value;
        renderOfflineProtocols(offlineSearchQuery);
      });
    }

    const openHospBtn = $('offlineOpenHospitalsBtn');
    if (openHospBtn) {
      openHospBtn.addEventListener('click', () => {
        closeOfflineModal();
        openHospitalMap();
      });
    }

    const modal = $('offlineModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOfflineModal();
      });
    }
  }
  initOfflineEmergency();

  function updateOnlineStatus() {
    const isOff = typeof navigator !== 'undefined' && navigator.onLine === false;
    const statusText = $('chatStatusText');
    const ind = $('chatStatusIndicator');
    if (ind) ind.classList.toggle('offline', isOff);
    if (statusText) {
      if (isOff) {
        statusText.textContent = currentLang === 'hi'
          ? '⚡ ऑफ़लाइन आपातकालीन सेवा सक्रिय • 10 प्रोटोकॉल व 249 अस्पताल सुरक्षित'
          : (currentLang === 'or'
            ? '⚡ ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ ମୋଡ୍ ସକ୍ରିୟ • ୧୦ଟି ପ୍ରୋଟୋକଲ୍ ଓ ୨୪୯ ଡାକ୍ତରଖାନା ଉପଲବ୍ଧ'
            : '⚡ Offline Emergency Care Active • 10 Critical Protocols & 249 Hospitals Offline');
      } else {
        statusText.textContent = currentLang === 'hi'
          ? 'प्रमाणित स्वास्थ्य मार्गदर्शन सक्रिय • आपातकालीन 108 प्रोटोकॉल'
          : (currentLang === 'or'
            ? 'ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ସକ୍ରିୟ • ଜରୁରୀକାଳୀନ ୧୦୮ ପ୍ରୋଟୋକଲ୍'
            : 'Verified Health Guidance Active • Emergency Referral Protocol');
      }
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
`;

// Insert offlineAndPdfModule before sb.auth.onAuthStateChange
const bootTarget = "  // ---------- Boot / Init ----------\n  sb.auth.onAuthStateChange((_event, session) => route(session));";
if (appJs.includes(bootTarget)) {
  appJs = appJs.replace(bootTarget, offlineAndPdfModule + "\n" + bootTarget);
  fs.writeFileSync(appJsPath, appJs, 'utf8');
  console.log('Successfully injected offline emergency protocols and PDF triage generator into app.js!');
} else {
  console.error('Could not locate bootTarget in app.js.');
}
