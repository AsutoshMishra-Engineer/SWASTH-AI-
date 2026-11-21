const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const startMarker = 'function downloadDoctorTriageSlip(queryText, answerText, lang, meta = {}, triggerBtn = null) {';
const endMarker = 'const OFFLINE_PROTOCOLS = [';

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate markers in app.js. Start:', startIndex, 'End:', endIndex);
  process.exit(1);
}

const newDownloadDoctorTriageSlip = `function downloadDoctorTriageSlip(queryText, answerText, lang, meta = {}, triggerBtn = null) {
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
      // 1. High-Resolution 1200x1700 Canvas (Crisp Retina Print Quality)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 1700);

      // Top Emerald Header Banner
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 1200, 150);

      // 2. Official System Logo on Top Left
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(80, 75, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // White Medical Cross in Logo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(74, 53, 12, 44);
      ctx.fillRect(58, 69, 44, 12);

      // Title & Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('SWASTH AI (ସ୍ୱାସ୍ଥ୍ୟ AI / स्वास्थ्य AI)', 145, 62);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('Government of Odisha • Public Health Digital Triage System', 145, 94);

      ctx.font = '13px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('Certified WHO & MoHFW Clinical Triage Protocol • SIH 25049 / F-204', 145, 120);

      // Top Right Digital Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(940, 52, 215, 44);
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(940, 52, 215, 44);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL DIGITAL SLIP', 1047, 79);
      ctx.textAlign = 'left';

      // 3. Metadata Info Bar (Y: 150 to 215)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 150, 1200, 65);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 215);
      ctx.lineTo(1200, 215);
      ctx.stroke();

      const triageId = 'OD-TRG-' + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SLIP REF: ' + triageId, 45, 189);
      ctx.fillStyle = '#475569';
      ctx.fillText('DATE: ' + dateStr + ', ' + timeStr, 340, 189);

      // FACILITY: [ AI DIAGNOSED ] (Department removed as requested)
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(720, 163, 435, 40);
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(720, 163, 435, 40);
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('FACILITY: [ AI DIAGNOSED ]', 740, 188);

      let curY = 245;

      function drawBox(x, y, w, h, bgColor, borderColor, borderLeftColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        if (borderLeftColor) {
          ctx.fillStyle = borderLeftColor;
          ctx.fillRect(x, y, 6, h);
        }
      }

      function renderWrappedText(text, x, y, maxWidth, lineHeight, maxLines, font, color) {
        ctx.font = font || '15px sans-serif';
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

      // 4. SECTION 1: PATIENT REPORTED COMPLAINT
      drawBox(45, curY, 1110, 110, '#f8fafc', '#e2e8f0', '#0d9488');
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('1. PATIENT REPORTED COMPLAINT (Chief Symptoms / ସମସ୍ୟା):', 65, curY + 30);

      const cleanQuery = (queryText || 'General symptom consultation and clinical advice').trim();
      renderWrappedText(cleanQuery, 65, curY + 62, 1070, 24, 2, '16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#1e293b');
      curY += 135;

      // Extract sections from answer text
      const cleanAnswer = (answerText || '')
        .replace(/\\*\\*(.*?)\\*\\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      let careGuidanceText = cleanAnswer;
      let doctorSignsText = 'High persistent fever, sudden shortness of breath, severe dehydration, chest pain, convulsions, maternal complications, or symptoms not improving after 48 hours requires immediate transfer to Community Health Centre (CHC) or District Hospital (DHH).';

      if (cleanAnswer.includes('⚠️') || cleanAnswer.includes('Danger') || cleanAnswer.includes('ବିପଦ') || cleanAnswer.includes('खतरे')) {
        const parts = cleanAnswer.split(/⚠️|ବିପଦର ଲକ୍ଷଣ|खतरे के लक्षण/);
        if (parts.length > 1) {
          careGuidanceText = parts[0].trim();
          doctorSignsText = parts.slice(1).join('\\n').trim();
        }
      }

      // 5. SECTION 2: CLINICAL TRIAGE GUIDANCE & SAFE CARE
      drawBox(45, curY, 1110, 420, '#ffffff', '#cbd5e1', '#0284c7');
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('2. CLINICAL TRIAGE GUIDANCE & SAFE HOME CARE (WHO & MoHFW Grounded):', 65, curY + 32);

      renderWrappedText(careGuidanceText, 65, curY + 66, 1070, 25, 14, '15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#1e293b');
      curY += 445;

      // 6. SECTION 3: WHEN TO SEE A DOCTOR / RED FLAGS
      drawBox(45, curY, 1110, 240, '#fef2f2', '#fca5a5', '#dc2626');
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('3. WHEN TO SEE A DOCTOR / RED FLAG WARNING SIGNS (ତୁରନ୍ତ ଡାକ୍ତରଖାନା ଯିବା ବିପଦ ଲକ୍ଷଣ):', 65, curY + 32);

      renderWrappedText(doctorSignsText, 65, curY + 66, 1070, 25, 7, '15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#991b1b');
      curY += 265;

      // 7. BILINGUAL YELLOW / AMBER WARNING BOX (1st English, then selected language)
      drawBox(45, curY, 1110, 310, '#fffbeb', '#f59e0b', '#b45309');
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('⚠️ NOTICE FOR CONSULTING MEDICAL OFFICER (CHC / PHC / DHH):', 65, curY + 32);

      // Part 1: English
      const noticeEn = 'This clinical triage slip was generated by Swasth AI to assist patients and frontline health workers (ASHA/ANM) with early symptom awareness. The patient was STRICTLY instructed NOT to self-medicate with unprescribed antibiotics or OTC steroids. Please conduct a comprehensive physical clinical examination, blood/diagnostic tests, and prescribe authorized medicines.';
      renderWrappedText(noticeEn, 65, curY + 62, 1070, 23, 4, '14.5px "Plus Jakarta Sans", sans-serif', '#78350f');

      // Part 2: Selected Regional Language
      const isOr = lang === 'or';
      const isHi = lang === 'hi';
      const noticeLang = isHi
        ? '⚠️ डॉक्टर के लिए निर्देश: यह पर्ची प्रारंभिक लक्षण जागरूकता के लिए तैयार की गई है। मरीज को बिना डॉक्टर के पर्चे कोई भी एंटीबायोटिक या स्टेरॉयड दवा न लेने की सख्त हिदायत दी गई है। कृपया शारीरिक जांच कर औपचारिक नुस्खा प्रदान करें।'
        : (isOr
          ? '⚠️ ଡାକ୍ତରଙ୍କ ପାଇଁ ନିର୍ଦ୍ଦେଶ: ଏହି ସ୍ୱାସ୍ଥ୍ୟ ସାରାଂଶ ସଚେତନତା ପାଇଁ ପ୍ରସ୍ତୁତ କରାଯାଇଛି । ରୋଗୀଙ୍କୁ ବିନା ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନରେ କୌଣସି ଆଣ୍ଟିବାୟୋଟିକ୍ ବା ଷ୍ଟେରଏଡ୍ ଔଷଧ ନଖାଇବାକୁ କଡ଼ା ଚେତାବନୀ ଦିଆଯାଇଛି । ଦୟାକରି ଶାରୀରିକ ପରୀକ୍ଷା ଓ ରକ୍ତ ଯାଞ୍ଚ କରି ଆବଶ୍ୟକ ଔଷଧ ପ୍ରଦାନ କରନ୍ତୁ ।'
          : '⚠️ SECONDARY DIRECTIVE: Ensure immediate vitals check (Blood Pressure, Pulse, SpO2, Temperature) and rule out acute complications before outpatient discharge.');

      renderWrappedText(noticeLang, 65, curY + 175, 1070, 24, 4, '14.5px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#92400e');
      curY += 330;

      // 8. Bottom Line - EXACTLY AS INSTRUCTED (Nothing more, nothing less)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GENERATED BY THE SWASTH AI DIGITAL SLIP', 600, 1660);
      ctx.textAlign = 'left';

      // 9. Database & Local Storage Recording
      try {
        const localSlips = JSON.parse(localStorage.getItem('swasth_triage_slips') || '[]');
        localSlips.unshift({
          reference_id: triageId,
          complaint: cleanQuery,
          language: lang,
          status: 'AI DIAGNOSED',
          created_at: new Date().toISOString()
        });
        if (localSlips.length > 100) localSlips.length = 100;
        localStorage.setItem('swasth_triage_slips', JSON.stringify(localSlips));
      } catch {}

      if (typeof fetch === 'function') {
        sb.auth.getSession().then(({ data }) => {
          const token = data?.session?.access_token || '';
          fetch('/api/record-triage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: 'Bearer ' + token } : {})
            },
            body: JSON.stringify({
              reference_id: triageId,
              complaint: cleanQuery,
              language: lang,
              status: 'AI DIAGNOSED'
            })
          }).catch(() => {});
        }).catch(() => {});
      }

      // Convert Canvas to High-Definition JPEG (0.92 Quality) and wrap into PDF
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
        }, 'image/jpeg', 0.92);
      }
    } catch (err) {
      console.error('Error generating PDF slip:', err);
    }
  }

  // 10 PRE-INSTALLED OFFLINE EMERGENCY PROTOCOLS FOR RURAL ODISHA
  `;

appJs = appJs.slice(0, startIndex) + newDownloadDoctorTriageSlip + appJs.slice(endIndex);
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully updated downloadDoctorTriageSlip with all user specifications!');
