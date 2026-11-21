const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Add lastUserQuery at Chat Handling
if (!appJs.includes('let lastUserQuery = \'\';')) {
  appJs = appJs.replace(
    "// ---------- Chat Handling ----------\n  let started = false;",
    "// ---------- Chat Handling ----------\n  let started = false;\n  let lastUserQuery = '';"
  );
}

// 2. Add PDF button in renderAnswer
const origRenderAnswerAudio = `    // Voice Output Audio Speaker Button (Step 3: Listen aloud in Hindi / Odia / English)
    if (data.answer && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const speakBar = document.createElement('div');
      speakBar.className = 'speak-bar';
      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'speak-btn';
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';
      const btnTitle = isHi ? '🔊 सुनें' : (isOr ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen');
      const btnAria = isHi ? 'सुनें' : (isOr ? 'ଶୁଣନ୍ତୁ' : 'Listen');
      speakBtn.title = btnTitle;
      speakBtn.setAttribute('aria-label', btnAria);

      const spkLabel = document.createElement('span');
      spkLabel.className = 'speak-label';
      spkLabel.textContent = btnTitle;
      speakBtn.appendChild(spkLabel);

      speakBtn.addEventListener('click', () => speakText(data.answer, speakBtn));
      speakBar.appendChild(speakBtn);
      d.appendChild(speakBar);

      // Rural Voice Optimization: If question was asked via voice, auto-play response aloud
      if (lastQueryWasVoice) {
        lastQueryWasVoice = false;
        setTimeout(() => {
          speakText(data.answer, speakBtn);
        }, 350);
      }
    }`;

const newRenderAnswerAudio = `    // Voice Output Audio Speaker Button & 1-Click Doctor Triage Slip PDF Button
    if (data.answer) {
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';
      const actionsBar = document.createElement('div');
      actionsBar.className = 'answer-actions-bar';

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'speak-btn';
        const btnTitle = isHi ? '🔊 सुनें' : (isOr ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen');
        const btnAria = isHi ? 'सुनें' : (isOr ? 'ଶୁଣନ୍ତୁ' : 'Listen');
        speakBtn.title = btnTitle;
        speakBtn.setAttribute('aria-label', btnAria);

        const spkLabel = document.createElement('span');
        spkLabel.className = 'speak-label';
        spkLabel.textContent = btnTitle;
        speakBtn.appendChild(spkLabel);

        speakBtn.addEventListener('click', () => speakText(data.answer, speakBtn));
        actionsBar.appendChild(speakBtn);

        // Rural Voice Optimization: If question was asked via voice, auto-play response aloud
        if (lastQueryWasVoice) {
          lastQueryWasVoice = false;
          setTimeout(() => {
            speakText(data.answer, speakBtn);
          }, 350);
        }
      }

      // 1-Click Doctor Triage Slip (PDF) Button
      const pdfBtn = document.createElement('button');
      pdfBtn.type = 'button';
      pdfBtn.className = 'btn-triage-pdf';
      const pdfBtnText = isHi ? 'डॉक्टर पर्ची (PDF)' : (isOr ? 'ଡାକ୍ତର ରିପୋର୍ଟ (PDF)' : 'Doctor Triage Slip (PDF)');
      pdfBtn.title = isHi ? 'सीएचसी/पीएचसी डॉक्टर के लिए पर्ची डाउनलोड करें' : (isOr ? 'ଡାକ୍ତରଙ୍କୁ ଦେଖାଇବା ପାଇଁ PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ' : 'Download Doctor Triage Slip for CHC/PHC Doctor');
      pdfBtn.innerHTML = '<span>📄</span> <span class="pdf-btn-label">' + pdfBtnText + '</span>';
      pdfBtn.addEventListener('click', () => {
        downloadDoctorTriageSlip(lastUserQuery, data.answer, currentLang, {
          isVision,
          department: data.department || selectedDepartment
        }, pdfBtn);
      });
      actionsBar.appendChild(pdfBtn);

      d.appendChild(actionsBar);
    }`;

if (appJs.includes(origRenderAnswerAudio)) {
  appJs = appJs.replace(origRenderAnswerAudio, newRenderAnswerAudio);
  console.log('Replaced audio block with voice + PDF slip buttons.');
} else {
  console.warn('origRenderAnswerAudio block not found directly, checking variations.');
}

// 3. Save lastUserQuery and offline interception in send(raw)
const origSendTop = `    $('question').value = '';
    resizeInput();
    updateCounter();
    const wait = activeImage ? scanningIndicator() : typing();`;

const newSendTop = `    lastUserQuery = text || (activeImage ? 'Clinical photo examination' : '');
    $('question').value = '';
    resizeInput();
    updateCounter();
    const wait = activeImage ? scanningIndicator() : typing();

    // Rural Offline Emergency Intercept (0ms Response when data drops)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      wait.remove();
      busy = false;
      $('sendBtn').disabled = false;
      $('question').focus();
      const matched = matchOfflineEmergency(text);
      if (matched) {
        renderAnswer({
          kind: 'emergency',
          answer: formatOfflineProtocolAnswer(matched, currentLang),
          sources: [{ name: 'WHO & MoHFW Verified Offline Protocols', url: 'https://swasth-ai.pages.dev' }]
        });
      } else {
        renderAnswer({
          kind: 'emergency',
          answer: formatDefaultOfflineGuide(currentLang),
          sources: [{ name: 'Pre-Installed Offline Protocols', url: 'https://swasth-ai.pages.dev' }]
        });
      }
      return;
    }`;

if (appJs.includes(origSendTop)) {
  appJs = appJs.replace(origSendTop, newSendTop);
  console.log('Updated send(raw) with lastUserQuery and offline emergency intercept.');
}

// 4. Update applyLanguage with offline titles
const origApplyLangPwa = `    const pwaBtn = $('pwaInstallBtn');
    if (pwaBtn && !pwaBtn.hidden) {
      pwaBtn.textContent = isHi ? '📲 ऐप इंस्टॉल करें' : (isOr ? '📲 ଆପ୍ ଇନଷ୍ଟଲ୍' : '📲 Install App');
    }
    updateHospitalMapLanguage();`;

const newApplyLangPwa = `    const pwaBtn = $('pwaInstallBtn');
    if (pwaBtn && !pwaBtn.hidden) {
      pwaBtn.textContent = isHi ? '📲 ऐप इंस्टॉल करें' : (isOr ? '📲 ଆପ୍ ଇନଷ୍ଟଲ୍' : '📲 Install App');
    }

    const offCareLbl = $('offlineCareLabel');
    if (offCareLbl) {
      offCareLbl.textContent = isHi ? 'आपातकालीन ऑफ़लाइन सेवा' : (isOr ? 'ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ କେୟାର' : 'Offline Emergency Care');
    }
    const offModalTitle = $('offlineModalTitle');
    if (offModalTitle) {
      offModalTitle.textContent = isHi ? 'आपातकालीन ऑफ़लाइन स्वास्थ्य प्रोटोकॉल' : (isOr ? 'ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ ନିର୍ଦ୍ଦେଶାବଳୀ' : 'Offline Emergency Protocols');
    }
    const offModalSub = $('offlineModalSub');
    if (offModalSub) {
      offModalSub.textContent = isHi ? '100% पहले से सुरक्षित • बिना इंटरनेट • ओडिशा लोक स्वास्थ्य' : (isOr ? '୧୦୦% ପୂର୍ବ-ସ୍ଥାପିତ • ବିନା ଇଣ୍ଟରନେଟ୍ • ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ' : '100% Pre-Installed • Zero Internet Required • Odisha Public Health');
    }
    if (typeof renderOfflineProtocols === 'function') {
      renderOfflineProtocols(offlineSearchQuery);
    }
    if (typeof updateOnlineStatus === 'function') {
      updateOnlineStatus();
    }
    updateHospitalMapLanguage();`;

if (appJs.includes(origApplyLangPwa)) {
  appJs = appJs.replace(origApplyLangPwa, newApplyLangPwa);
  console.log('Updated applyLanguage with offline strings.');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('app.js pre-modifications complete.');
