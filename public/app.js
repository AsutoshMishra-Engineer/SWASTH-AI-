(() => {
  'use strict';
  const cfg = window.SWASTH_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const MAX = 500;
  const EXAMPLES_EN = [
    'How can I prevent dengue fever?',
    'What should I do if a dog bites me?',
    'How to prepare ORS at home?',
    'What are the danger signs in pregnancy?',
    'Do antibiotics work for a common cold?'
  ];
  const EXAMPLES_OR = [
    '🦟 ଡେଙ୍ଗୁରୁ କିପରି ବଞ୍ଚିବା?',
    '🐕 କୁକୁର କାମୁଡ଼ିଲେ କ\'ଣ କରିବା?',
    '💧 ଘରେ ORS କିପରି ପ୍ରସ୍ତୁତ କରିବେ?',
    '🤰 ଗର୍ଭାବସ୍ଥାରେ ବିପଦର ଲକ୍ଷଣ କ\'ଣ?',
    '☀️ ଅଂଶୁଘାତରୁ ରକ୍ଷା ଓ ପ୍ରାଥମିକ ଯତ୍ନ'
  ];
  const EXAMPLES_HI = [
    '🦟 डेंगू से कैसे बचें?',
    '🐕 कुत्ते के काटने पर क्या करें?',
    '💧 घर पर ओआरएस (ORS) घोल कैसे बनाएं?',
    '🤰 गर्भावस्था में खतरे के मुख्य लक्षण क्या हैं?',
    '☀️ लू (सनस्ट्रोक) से बचाव और प्राथमिक उपचार'
  ];
  const EXAMPLES = EXAMPLES_EN;
  // Strict Requirement: Default to English on every reload
  let currentLang = 'en';

  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/YOUR-/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY));
  if (!configured || !window.supabase) {
    const el = $('setupError');
    if (el) el.hidden = false;
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // ---------- Helpers & State ----------
  let mode = 'signin';
  let busy = false;
  let resendTimer = null;
  const setMsg = (text, type = '') => {
    const m = $('authMsg');
    if (m) { m.textContent = text; m.className = 'msg ' + type; }
  };
  const isVerified = (s) => !!(s && s.user && (s.user.email_confirmed_at || s.user.confirmed_at));
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // ---------- Navigation / Routing ----------
  let currentSession = null;

  // Detect if running on Android (Native App, WebView, or Mobile Android Browser) or requesting home view
  const isAndroidClient = typeof navigator !== 'undefined' && (
    /Android|wv|SwasthAI-Android/i.test(navigator.userAgent || '') ||
    (typeof window !== 'undefined' && (
      (window.location.search && window.location.search.includes('platform=android')) ||
      (window.location.search && window.location.search.includes('home=1')) ||
      (window.location.hash && window.location.hash === '#home')
    ))
  );

  // On Android, the landing/home page is the initial landing page
  let viewingLanding = isAndroidClient;

  function showLandingPage() {
    viewingLanding = true;
    if (typeof window !== 'undefined') window.viewingLanding = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('chat-active');
      document.body.classList.remove('chat-has-results');
    }
    if ($('authView')) $('authView').hidden = false;
    if ($('chatView')) $('chatView').hidden = true;
    const ok = isVerified(currentSession);
    if ($('navChatBtn')) $('navChatBtn').hidden = !ok;
    if ($('navHomeBtn')) $('navHomeBtn').hidden = true;
    if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = !ok;
    if ($('loggedInCardContent')) $('loggedInCardContent').hidden = !ok;
    if ($('loggedOutAuthContent')) $('loggedOutAuthContent').hidden = ok;
    if (ok && currentSession && $('loggedInCardEmail')) {
      $('loggedInCardEmail').textContent = currentSession.user?.email || '';
    }

    // Landing page is strictly English (Emergency notice remain 1 for landing page)
    const emergencySpan = $('emergencyText');
    if (emergencySpan) {
      emergencySpan.innerHTML = '<strong>Medical Emergency?</strong> Severe chest pain, trouble breathing, or heavy bleeding? Call <a href="tel:108">108</a> (Ambulance) or <a href="tel:112">112</a> immediately.';
    }
    const brandBadge = document.querySelector('.brand-badge');
    if (brandBadge) brandBadge.textContent = 'Public Health Assistant';
    const guidanceText = document.querySelector('.guidance-btn-text');
    if (guidanceText) guidanceText.textContent = 'Important Medical Notice';
    const footDisclaimer = $('footDisclaimer');
    if (footDisclaimer) {
      footDisclaimer.innerHTML = 'Swasth AI provides public health guidance from verified WHO & Ministry of Health sources. It is <strong>not</strong> a medical doctor and cannot issue prescriptions. In an emergency, call <strong>108</strong> or <strong>112</strong>.';
    }
    const footCombined = $('footCopyrightCombined') || $('footCopyrightSmall') || $('footCopyrightMain');
    if (footCombined) {
      footCombined.innerHTML = '&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; F-204 DEMO PROJECT &bull; <a href="https://swasth-ai.pages.dev" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:700;text-decoration:underline;">swasth-ai.pages.dev</a>';
    }
  }

  function showChatPage() {
    viewingLanding = false;
    if (typeof window !== 'undefined') window.viewingLanding = false;
    if (isVerified(currentSession)) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('chat-active');
        const bubbleCount = ($('messages') && $('messages').querySelectorAll('.bubble').length) || 0;
        if (bubbleCount > 1) {
          document.body.classList.add('chat-has-results');
        } else {
          document.body.classList.remove('chat-has-results');
        }
      }
      if ($('authView')) $('authView').hidden = true;
      if ($('chatView')) $('chatView').hidden = false;
      if ($('navChatBtn')) $('navChatBtn').hidden = true;
      if ($('navHomeBtn')) $('navHomeBtn').hidden = false;
      if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = true;
      startChat();
      applyLanguage(currentLang);
    } else {
      showLandingPage();
    }
  }

  function route(session) {
    currentSession = session;
    const ok = isVerified(session);
    if ($('userbar')) $('userbar').hidden = !ok;
    if (ok) {
      if ($('userEmail')) $('userEmail').textContent = session.user.email || '';
      if (viewingLanding) {
        showLandingPage();
      } else {
        showChatPage();
      }
    } else {
      viewingLanding = isAndroidClient;
      if ($('navChatBtn')) $('navChatBtn').hidden = true;
      if ($('navHomeBtn')) $('navHomeBtn').hidden = true;
      if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = true;
      if ($('loggedInCardContent')) $('loggedInCardContent').hidden = true;
      if ($('loggedOutAuthContent')) $('loggedOutAuthContent').hidden = false;
      if ($('authView')) $('authView').hidden = false;
      if ($('chatView')) $('chatView').hidden = true;
      clearChat();
    }
  }

  // Expose routing helpers to window for native Android WebView bridge
  if (typeof window !== 'undefined') {
    window.showLandingPage = showLandingPage;
    window.showChatPage = showChatPage;
    window.viewingLanding = viewingLanding;
  }

  const brandBtn = $('brandBtn');
  if (brandBtn) {
    brandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isVerified(currentSession)) {
        if (viewingLanding) showChatPage();
        else showLandingPage();
      } else {
        showLandingPage();
      }
    });
  }

  const navHomeBtn = $('navHomeBtn');
  if (navHomeBtn) navHomeBtn.addEventListener('click', () => showLandingPage());
  const navChatBtn = $('navChatBtn');
  if (navChatBtn) navChatBtn.addEventListener('click', () => showChatPage());
  const heroChatBtn = $('heroChatBtn');
  if (heroChatBtn) heroChatBtn.addEventListener('click', () => showChatPage());
  const cardChatBtn = $('cardChatBtn');
  if (cardChatBtn) cardChatBtn.addEventListener('click', () => showChatPage());

  // ---------- Auth Handling ----------
  function setMode(m) {
    mode = m;
    const up = m === 'signup';
    if ($('tabSignIn')) {
      $('tabSignIn').classList.toggle('active', !up);
      $('tabSignIn').setAttribute('aria-pressed', String(!up));
    }
    if ($('tabSignUp')) {
      $('tabSignUp').classList.toggle('active', up);
      $('tabSignUp').setAttribute('aria-pressed', String(up));
    }
    if ($('authSubmit')) $('authSubmit').textContent = up ? 'Create Account' : 'Sign In';
    if ($('password')) $('password').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    if ($('pwHint')) $('pwHint').hidden = !up;
    if ($('resendBtn')) $('resendBtn').hidden = true;
    setMsg('');
  }

  if ($('tabSignIn')) $('tabSignIn').addEventListener('click', () => setMode('signin'));
  if ($('tabSignUp')) $('tabSignUp').addEventListener('click', () => setMode('signup'));

  // Password Visibility Toggle (Eye Button)
  const togglePwBtn = $('togglePwBtn');
  if (togglePwBtn) {
    togglePwBtn.addEventListener('click', () => {
      const pwInput = $('password');
      if (!pwInput) return;
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';
      togglePwBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      togglePwBtn.innerHTML = isPassword
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
  }

  // Health Notice & Doctor Consultation Dialog
  const modal = $('guidanceModal') || $('howItWorksModal');
  const howBtn = $('guidanceBtn') || $('howItWorksBtn');
  const closeBtn = $('closeModalBtn');
  if (howBtn && modal) {
    howBtn.addEventListener('click', () => {
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.hidden = false;
    });
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      if (typeof modal.close === 'function') modal.close();
      else modal.hidden = true;
    });
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && typeof modal.close === 'function') modal.close();
    });
  }

  function startResendCooldown(seconds = 60) {
    const b = $('resendBtn');
    if (!b) return;
    b.hidden = false;
    let left = seconds;
    b.disabled = true;
    clearInterval(resendTimer);
    const tick = () => {
      b.textContent = left > 0 ? `Resend verification email (${left}s)` : 'Resend verification email';
      if (left <= 0) { b.disabled = false; clearInterval(resendTimer); }
      left--;
    };
    tick();
    resendTimer = setInterval(tick, 1000);
  }

  if ($('authForm')) {
    $('authForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (busy) return;
      const email = $('email').value.trim();
      const password = $('password').value;
      if (!validEmail(email)) return setMsg('Please enter a valid email address.', 'error');
      if (mode === 'signup' && password.length < 8) return setMsg('Please use a password with at least 8 characters.', 'error');
      if (!password) return setMsg('Please enter your password.', 'error');
      busy = true;
      $('authSubmit').disabled = true;
      setMsg('Please wait...');
      try {
        if (mode === 'signup') {
          const { error } = await sb.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin }
          });
          if (error) setMsg(friendlyAuthError(error), 'error');
          else {
            setMsg('Almost done! We have sent a verification link to your email. Please check your inbox & spam folder.', 'ok');
            startResendCooldown();
          }
        } else {
          const { data, error } = await sb.auth.signInWithPassword({ email, password });
          if (error) {
            setMsg(friendlyAuthError(error), 'error');
            if (/not confirmed/i.test(error.message || '')) startResendCooldown(0);
          } else if (data && data.session && !isVerified(data.session)) {
            setMsg('Please verify your email first. Check your inbox for the link.', 'error');
            startResendCooldown(0);
            await sb.auth.signOut();
          }
        }
      } catch (e) {
        setMsg('Could not reach server. Check internet connection.', 'error');
      } finally {
        busy = false;
        $('authSubmit').disabled = false;
      }
    });
  }

  if ($('resendBtn')) {
    $('resendBtn').addEventListener('click', async () => {
      const email = $('email').value.trim();
      if (!validEmail(email)) return setMsg('Enter your email above first.', 'error');
      $('resendBtn').disabled = true;
      try {
        const { error } = await sb.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) setMsg(friendlyAuthError(error), 'error');
        else setMsg('Verification email sent. Check inbox & spam folder.', 'ok');
      } catch (e) {
        setMsg('Could not reach the server.', 'error');
      }
      startResendCooldown();
    });
  }

  function friendlyAuthError(error) {
    const m = (error && error.message) || '';
    if (/invalid login/i.test(m)) return 'Incorrect email or password.';
    if (/not confirmed/i.test(m)) return 'Email not verified yet. Open the link sent to your inbox.';
    if (/rate limit|too many|seconds/i.test(m)) return 'Too many attempts. Please wait a moment.';
    if (/password/i.test(m)) return m;
    return 'Something went wrong. Please try again.';
  }

  if ($('signOut')) {
    $('signOut').addEventListener('click', async () => {
      try { await sb.auth.signOut(); } catch (e) {}
    });
  }

  // Delete Account Handling
  const delModal = $('deleteAccountModal');
  const closeDelBtn = $('closeDeleteModalBtn');
  const cancelDelBtn = $('cancelDeleteBtn');
  const confirmDelBtn = $('confirmDeleteBtn');
  const deleteMsg = $('deleteMsg');

  function openDeleteModal() {
    if (!delModal) return;
    const email = (currentSession && currentSession.user && currentSession.user.email) || '';
    if ($('deleteModalEmail')) $('deleteModalEmail').textContent = email;
    if (deleteMsg) { deleteMsg.textContent = ''; deleteMsg.className = 'msg'; }
    if (confirmDelBtn) confirmDelBtn.disabled = false;
    if (typeof delModal.showModal === 'function') delModal.showModal();
    else delModal.hidden = false;
  }

  function closeDeleteModal() {
    if (!delModal) return;
    if (typeof delModal.close === 'function') delModal.close();
    else delModal.hidden = true;
  }

  if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').addEventListener('click', openDeleteModal);
  if ($('cardDeleteAccountBtn')) $('cardDeleteAccountBtn').addEventListener('click', openDeleteModal);
  if (closeDelBtn) closeDelBtn.addEventListener('click', closeDeleteModal);
  if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteModal);
  if (delModal) {
    delModal.addEventListener('click', (e) => {
      if (e.target === delModal && typeof delModal.close === 'function') delModal.close();
    });
  }

  if (confirmDelBtn) {
    confirmDelBtn.addEventListener('click', async () => {
      if (!currentSession || !currentSession.access_token) {
        if (deleteMsg) { deleteMsg.textContent = 'You are not signed in.'; deleteMsg.className = 'msg error'; }
        return;
      }
      confirmDelBtn.disabled = true;
      if (deleteMsg) { deleteMsg.textContent = 'Deleting account from server...'; deleteMsg.className = 'msg'; }

      try {
        const res = await fetch('/api/delete-account', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`
          }
        });

        if (res.ok) {
          if (deleteMsg) { deleteMsg.textContent = 'Account successfully deleted. Signing out...'; deleteMsg.className = 'msg ok'; }
          setTimeout(async () => {
            closeDeleteModal();
            try { await sb.auth.signOut(); } catch (e) {}
            setMode('signup');
            setMsg('Your account was permanently deleted. You can create a new account anytime.', 'ok');
          }, 1200);
        } else {
          const errData = await res.json().catch(() => ({}));
          confirmDelBtn.disabled = false;
          if (deleteMsg) {
            deleteMsg.textContent = errData.message || 'Failed to delete account. Please try again.';
            deleteMsg.className = 'msg error';
          }
        }
      } catch (err) {
        confirmDelBtn.disabled = false;
        if (deleteMsg) {
          deleteMsg.textContent = 'Could not reach server. Check internet connection.';
          deleteMsg.className = 'msg error';
        }
      }
    });
  }

  // ---------- Chat Handling ----------
  let started = false;
  function addBubble(kind, text) {
    const d = document.createElement('div');
    d.className = 'bubble ' + kind;
    // Format bold headers safely without allowing HTML injection
    if (kind.startsWith('bot') && (text.includes('📘') || text.includes('🏠') || text.includes('⚠️') || text.includes('🏥') || text.includes('🚨') || text.includes('**'))) {
      const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let formatted = escape(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^[ \t]*(📘[^\n:]+:?)/gim, '<strong style="color:var(--primary-dark); display:block; margin-top:8px; margin-bottom:3px;">$1</strong>')
        .replace(/^[ \t]*(🏠[^\n:]+:?)/gim, '<strong style="color:#0369a1; display:block; margin-top:8px; margin-bottom:3px;">$1</strong>')
        .replace(/^[ \t]*(⚠️[^\n:]+:?)/gim, '<strong style="color:#b45309; display:block; margin-top:8px; margin-bottom:3px;">$1</strong>')
        .replace(/^[ \t]*(🏥[^\n:]+:?)/gim, '<strong style="color:#0f766e; display:block; margin-top:8px; margin-bottom:3px;">$1</strong>')
        .replace(/^[ \t]*(🚨[^\n:]+:?)/gim, '<strong style="color:#b91c1c; display:block; margin-top:8px; margin-bottom:3px;">$1</strong>');
      d.innerHTML = formatted;
    } else {
      d.textContent = text;
    }
    $('messages').appendChild(d);
    d.scrollIntoView({ block: 'end' });
    setTimeout(() => {
      const mb = $('messages');
      if (mb) mb.scrollTop = mb.scrollHeight;
    }, 60);
    return d;
  }
  function clearChat() {
    $('messages').textContent = '';
    $('chips').textContent = '';
    $('remaining').textContent = '';
    started = false;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('chat-has-results');
      const cv = $('chatView');
      if (cv) cv.classList.remove('chat-has-results');
    }
  }

  function renderChips() {
    const chipsEl = $('chips');
    if (!chipsEl) return;
    chipsEl.textContent = '';
    const list = currentLang === 'hi' ? EXAMPLES_HI : (currentLang === 'or' ? EXAMPLES_OR : EXAMPLES_EN);
    list.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = q;
      b.addEventListener('click', () => send(q));
      chipsEl.appendChild(b);
    });
  }

  function applyLanguage(lang) {
    currentLang = lang;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('swasth_lang', lang);
    } catch {}

    const isOr = lang === 'or';
    const isHi = lang === 'hi';
    const isEn = !isOr && !isHi;

    if ($('langEnBtn')) {
      $('langEnBtn').classList.toggle('active', isEn);
      $('langEnBtn').setAttribute('aria-pressed', String(isEn));
    }
    if ($('langOrBtn')) {
      $('langOrBtn').classList.toggle('active', isOr);
      $('langOrBtn').setAttribute('aria-pressed', String(isOr));
    }
    if ($('langHiBtn')) {
      $('langHiBtn').classList.toggle('active', isHi);
      $('langHiBtn').setAttribute('aria-pressed', String(isHi));
    }

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('lang-or', isOr);
      document.body.classList.toggle('lang-hi', isHi);
      document.body.classList.toggle('lang-en', isEn);
    }

    // Composer & Dual Action Boxes visibility
    const chatForm = $('chatForm');
    const composerFoot = document.querySelector('.composer-foot');
    const dualActionArea = $('dualActionArea');

    if (isEn) {
      // In English: show crystal-clear search bar + action boxes below
      if (chatForm) {
        chatForm.hidden = false;
        chatForm.style.display = 'flex';
      }
      if (composerFoot) {
        composerFoot.hidden = false;
        composerFoot.style.display = 'flex';
      }
      if (dualActionArea) dualActionArea.classList.remove('hero-mode');
    } else {
      // In Odia or Hindi: completely remove/hide the search bar, show ONLY the 2 clear action boxes!
      if (chatForm) {
        chatForm.hidden = true;
        chatForm.style.display = 'none';
      }
      if (composerFoot) {
        composerFoot.hidden = true;
        composerFoot.style.display = 'none';
      }
      if (dualActionArea) dualActionArea.classList.add('hero-mode');
    }

    const voiceBoxTitle = $('voiceBoxTitle');
    const voiceBoxSub = $('voiceBoxSub');
    const photoBoxTitle = $('photoBoxTitle');
    const photoBoxSub = $('photoBoxSub');

    if (voiceBoxTitle) {
      voiceBoxTitle.textContent = isHi ? '🎙️ बोलकर बताएं' : (isOr ? '🎙️ ଭଏସ୍ ମେସେଜ୍' : '🎙️ Voice Message');
    }
    if (voiceBoxSub) {
      voiceBoxSub.textContent = isHi ? 'बोलकर पूछें' : (isOr ? 'ଓଡ଼ିଆରେ କୁହନ୍ତୁ' : 'Tap to speak');
    }
    if (photoBoxTitle) {
      photoBoxTitle.textContent = isHi ? '📷 फोटो अपलोड' : (isOr ? '📷 ଫଟୋ ଅପ୍‌ଲୋଡ୍' : '📷 Upload Photo');
    }
    if (photoBoxSub) {
      photoBoxSub.textContent = isHi ? 'कैमरा या गैलरी' : (isOr ? 'କ୍ୟାମେରା ବା ଗ୍ୟାଲେରୀ' : 'Camera or Gallery');
    }

    const imagePreviewLabel = $('imagePreviewLabel');
    if (imagePreviewLabel) imagePreviewLabel.textContent = isHi ? '📷 फोटो संलग्न है' : (isOr ? '📷 ଫଟୋ ସଂଲଗ୍ନ ହୋଇଛି' : '📷 Clinical Photo Attached');
    const imagePreviewHint = $('imagePreviewHint');
    if (imagePreviewHint) imagePreviewHint.textContent = isHi ? 'विभाग चुनें या सीधे जाँचें' : (isOr ? 'ବିଭାଗ ଚୟନ କରନ୍ତୁ ବା ସିଧାସଳଖ ପରୀକ୍ଷା କରନ୍ତୁ' : 'Tap below to analyze with AI');
    const analyzePhotoBtnText = $('analyzePhotoBtnText');
    if (analyzePhotoBtnText) {
      analyzePhotoBtnText.textContent = isHi ? 'फोटो की जाँच करें (AI Analysis)' : (isOr ? 'ଫଟୋ ପରୀକ୍ଷା କରନ୍ତୁ' : 'Scan & Analyze Photo');
    }

    // Localize Department Selector Pills
    const deptTranslations = {
      auto: { en: 'Auto', or: 'ସ୍ୱୟଂକ୍ରିୟ', hi: 'स्वतः' },
      photo: { en: 'Skin', or: 'ଚର୍ମ ଓ ସାଧାରଣ', hi: 'त्वचा व सामान्य' },
      eye: { en: 'Eye', or: 'ନେତ୍ର ପରୀକ୍ଷା', hi: 'नेत्र परीक्षा' },
      oral: { en: 'Oral', or: 'ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ', hi: 'मुख स्वास्थ्य' },
      pediatric: { en: 'Baby', or: 'ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ', hi: 'शिशु स्वास्थ्य' },
      wound: { en: 'Wound', or: 'କ୍ଷତ ଓ ପୋଡ଼ାଜଳା', hi: 'घाव व जलन' },
      nail: { en: 'Nails', or: 'ନଖ ପରୀକ୍ଷା', hi: 'नाखून व एनीमिया' }
    };
    document.querySelectorAll('.dept-pill').forEach((pill) => {
      const code = pill.getAttribute('data-dept');
      const textSpan = pill.querySelector('.dept-pill-text');
      if (code && deptTranslations[code] && textSpan) {
        textSpan.textContent = isHi ? deptTranslations[code].hi : (isOr ? deptTranslations[code].or : deptTranslations[code].en);
      }
    });

    const pwaBtn = $('pwaInstallBtn');
    if (pwaBtn && !pwaBtn.hidden) {
      pwaBtn.textContent = isHi ? '📲 ऐप इंस्टॉल करें' : (isOr ? '📲 ଆପ୍ ଇନଷ୍ଟଲ୍' : '📲 Install App');
    }
    updateHospitalMapLanguage();

    // Refresh chips to current language
    renderChips();

    // Landing Page / Auth View complete separation
    if ($('authTitle')) {
      $('authTitle').textContent = isHi ? 'तुरंत और विश्वसनीय स्वास्थ्य सलाह' : (isOr ? 'ତୁରନ୍ତ ଏବଂ ବିଶ୍ୱସନୀୟ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ' : 'Instant, Trusted Health Answers');
    }
    const heroDesc = document.querySelector('.hero > p');
    if (heroDesc) {
      heroDesc.textContent = isHi
        ? 'दैनिक लक्षण, रोग रोकथाम, शिशु टीकाकरण, गर्भावस्था देखभाल और आपातकालीन प्राथमिक चिकित्सा के बारे में पूछें। WHO और स्वास्थ्य मंत्रालय के आधिकारिक व सत्यापित तथ्य।'
        : (isOr
          ? 'ସାଧାରଣ ରୋଗ ଲକ୍ଷଣ, ରୋଗ ପ୍ରତିରୋଧ, ଶିଶୁ ଟିକାଦାନ, ଗର୍ଭବତୀ ଯତ୍ନ ଓ ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା ବିଷୟରେ ପଚାରନ୍ତୁ । ସରକାରୀ ସ୍ୱାସ୍ଥ୍ୟ ବିଭାଗ ଓ WHO ର ନିର୍ଭୁଲ ତଥ୍ୟ ।'
          : 'Ask about everyday symptoms, disease prevention, child vaccines, pregnancy care, and emergency first aid. Clear facts from official public health authorities.');
    }
    const heroPill = document.querySelector('.hero-pill');
    if (heroPill) {
      heroPill.textContent = isHi ? 'सत्यापित स्वास्थ्य सलाह और रोकथाम' : (isOr ? 'ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ଓ ପ୍ରତିରୋଧ' : 'Verified Health Guidance & Prevention');
    }
    const heroChatBtn = $('heroChatBtn');
    if (heroChatBtn) {
      heroChatBtn.textContent = isHi ? '💬 स्वास्थ्य चैट शुरू करें →' : (isOr ? '💬 ସ୍ୱାସ୍ଥ୍ୟ ଚାଟ୍ ଆରମ୍ଭ କରନ୍ତୁ →' : '💬 Open Health Chat Assistant →');
    }
    const cardChatBtn = $('cardChatBtn');
    if (cardChatBtn) {
      cardChatBtn.textContent = isHi ? '💬 स्वास्थ्य चैट खोलें →' : (isOr ? '💬 ସ୍ୱାସ୍ଥ୍ୟ ଚାଟ୍ ଖୋଲନ୍ତୁ →' : '💬 Open Health Chat →');
    }
    const navChatBtn = $('navChatBtn');
    if (navChatBtn) {
      navChatBtn.textContent = isHi ? '💬 परामर्श' : (isOr ? '💬 ପରାମର୍ଶ' : '💬 Chat');
    }
    if ($('tabSignIn')) $('tabSignIn').textContent = isHi ? 'लॉग इन' : (isOr ? 'ଲଗ୍ ଇନ୍' : 'Sign In');
    if ($('tabSignUp')) $('tabSignUp').textContent = isHi ? 'नया खाता' : (isOr ? 'ନୂଆ ଆକାଉଣ୍ଟ' : 'Create Account');
    if ($('authSubmit')) {
      const isUp = $('tabSignUp')?.classList.contains('active');
      $('authSubmit').textContent = isHi
        ? (isUp ? 'खाता बनाएं' : 'लॉग इन करें')
        : (isOr ? (isUp ? 'ଆକାଉଣ୍ଟ ଖୋଲନ୍ତୁ' : 'ଲଗ୍ ଇନ୍ କରନ୍ତୁ') : (isUp ? 'Create account' : 'Sign in'));
    }
    const emailLabel = document.querySelector('label[for="email"]');
    if (emailLabel) emailLabel.textContent = isHi ? 'ईमेल पता' : (isOr ? 'ଇମେଲ୍ ଠିକଣା' : 'Email Address');
    const pwLabel = document.querySelector('label[for="password"]');
    if (pwLabel) pwLabel.textContent = isHi ? 'पासवर्ड' : (isOr ? 'ପାସୱାର୍ଡ' : 'Password');
    const pwHint = $('pwHint');
    if (pwHint) pwHint.textContent = isHi ? '(कम से कम 8 अक्षर)' : (isOr ? '(ଅତିକମରେ ୮ ଅକ୍ଷର)' : '(at least 8 characters)');

    // Feature items on landing page
    const featItems = document.querySelectorAll('.features-grid .feat-item');
    if (featItems.length >= 4) {
      const f1 = featItems[0].querySelector('div');
      if (f1) f1.innerHTML = isHi
        ? '<strong>हिन्दी और क्षेत्रीय वॉयस परामर्श</strong><small>अपने लक्षण सीधे बोलकर बताएं और तुरंत प्रमाणित स्वास्थ्य सलाह पाएं।</small>'
        : (isOr
          ? '<strong>ଓଡ଼ିଆ ଭଏସ୍ ପରାମର୍ଶ</strong><small>ନିଜ ଲକ୍ଷଣ ସିଧାସଳଖ ଓଡ଼ିଆରେ କହି ତୁରନ୍ତ ଘରୋଇ ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ପାଆନ୍ତୁ ।</small>'
          : '<strong>Regional Voice Consultation</strong><small>Speak your symptoms directly in your language to receive instant regional care guidance.</small>');

      const f2 = featItems[1].querySelector('div');
      if (f2) f2.innerHTML = isHi
        ? '<strong>डॉक्टर को कब दिखाएं</strong><small>सामान्य घरेलू देखभाल बनाम खतरे के लक्षण समझें जिनके लिए अस्पताल जाना जरूरी है।</small>'
        : (isOr
          ? '<strong>ଡାକ୍ତର କେବେ ଦେଖାଇବେ</strong><small>ଘରୋଇ ଯତ୍ନ ବନାମ ବିପଦ ଲକ୍ଷଣ ଜାଣନ୍ତୁ ଯାହା ପାଇଁ ଡାକ୍ତରଖାନା ଯିବା ଆବଶ୍ୟକ ।</small>'
          : '<strong>When to See a Doctor</strong><small>Learn mild home care vs. danger signs that need hospital visits.</small>');

      const f3 = featItems[2].querySelector('div');
      if (f3) f3.innerHTML = isHi
        ? '<strong>सत्यापित चिकित्सा स्रोत</strong><small>WHO और भारत सरकार के स्वास्थ्य मंत्रालय के प्रमाणित तथ्यों पर आधारित।</small>'
        : (isOr
          ? '<strong>ଯାଞ୍ଚ ହୋଇଥିବା ଡାକ୍ତରୀ ତଥ୍ୟ</strong><small>WHO ଏବଂ ଭାରତ ସରକାରଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଉପରେ ଆଧାରିତ ।</small>'
          : '<strong>Verified Medical Sources</strong><small>Guidance backed by official WHO and Ministry of Health data.</small>');

      const f4 = featItems[3].querySelector('div');
      if (f4) f4.innerHTML = isHi
        ? '<strong>पूर्णतः गोपनीय और सुरक्षित</strong><small>आपके स्वास्थ्य संबंधी सवाल कभी भी आपके नाम के साथ सुरक्षित नहीं किए जाते।</small>'
        : (isOr
          ? '<strong>ସମ୍ପୂର୍ଣ୍ଣ ଗୋପନୀୟ ଓ ସୁରକ୍ଷିତ</strong><small>ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ କେବେହେଲେ ଆପଣଙ୍କ ନାମ ସହିତ ସଂରକ୍ଷିତ ହୁଏନାହିଁ ।</small>'
          : '<strong>Confidential & Private</strong><small>Your health questions are never saved with your name.</small>');
    }

    // Update static UI strings in DOM for Consultation / Chat view
    const emergencySpan = $('emergencyText');
    if (emergencySpan) {
      emergencySpan.innerHTML = isHi
        ? '<strong>चिकित्सा आपातकाल?</strong> सीने में तेज दर्द, सांस लेने में तकलीफ या गंभीर रक्तस्राव? तुरंत <a href="tel:108">108</a> (एम्बुलेंस) या <a href="tel:112">112</a> पर कॉल करें।'
        : (isOr
          ? '<strong>ଡାକ୍ତରୀ ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି?</strong> ପ୍ରବଳ ଛାତି ଯନ୍ତ୍ରଣା, ନିଶ୍ୱାସ କଷ୍ଟ କିମ୍ବା ରକ୍ତସ୍ରାବ ହେଉଛି? ତୁରନ୍ତ <a href="tel:108">108</a> (ଆମ୍ବୁଲାନ୍ସ) କିମ୍ବା <a href="tel:112">112</a> କୁ କଲ୍ କରନ୍ତୁ ।'
          : '<strong>Medical Emergency?</strong> Severe chest pain, trouble breathing, or heavy bleeding? Call <a href="tel:108">108</a> (Ambulance) or <a href="tel:112">112</a> immediately.');
    }

    const questionInput = $('question');
    if (questionInput) {
      questionInput.placeholder = isHi
        ? 'अपनी स्वास्थ्य समस्या या लक्षण लिखें...'
        : (isOr ? 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ବା ଲକ୍ଷଣ ଲେଖନ୍ତୁ...' : 'Express your symptoms or health problem...');
    }

    const brandBadge = document.querySelector('.brand-badge');
    if (brandBadge) {
      brandBadge.textContent = isHi ? 'सार्वजनिक स्वास्थ्य सहायक' : (isOr ? 'ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ' : 'Public Health Assistant');
    }

    const guidanceText = document.querySelector('.guidance-btn-text');
    if (guidanceText) {
      guidanceText.textContent = isHi ? 'महत्वपूर्ण स्वास्थ्य सूचना' : (isOr ? 'ଜରୁରୀ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା' : 'Important Medical Notice');
    }

    // Guidance Modal Content in Hindi vs Odia vs English
    if ($('modalTitle')) $('modalTitle').textContent = isHi ? 'महत्वपूर्ण स्वास्थ्य और डॉक्टरी सूचना' : (isOr ? 'ଜରୁରୀ ସ୍ୱାସ୍ଥ୍ୟ ଓ ଡାକ୍ତରୀ ସୂଚନା' : 'Important Health & Doctor Notice');
    if ($('modalNoticeCard')) {
      $('modalNoticeCard').innerHTML = isHi
        ? '<strong>⚠️ स्वास्थ्य AI केवल एक सूचनात्मक मार्गदर्शक है, कोई डॉक्टर नहीं</strong><p>यह सेवा केवल स्वास्थ्य जागरूकता और सामान्य सलाह के लिए है। यह किसी डॉक्टर की शारीरिक जांच, लैब टेस्ट या दवा के नुस्खे (प्रिस्क्रिप्शन) का विकल्प नहीं है।</p>'
        : (isOr
          ? '<strong>⚠️ ସ୍ୱାସ୍ଥ୍ୟ AI କେବଳ ଏକ ସୂଚନାକାରୀ ସହାୟକ, କୌଣସି ଡାକ୍ତର ନୁହେଁ</strong><p>ଏହି ସେବା କେବଳ ସଚେତନତା ଓ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ପାଇଁ ଉଦ୍ଦିଷ୍ଟ । ଏହା ଡାକ୍ତରୀ ଶାରୀରିକ ପରୀକ୍ଷା, ରକ୍ତ ପରୀକ୍ଷା କିମ୍ବା ଔଷଧ ପ୍ରେସକ୍ରିପସନର ବିକଳ୍ପ ନୁହେଁ ।</p>'
          : '<strong>⚠️ Swasth AI is an Informational Guide, Not a Doctor</strong><p>This service provides educational public health advice and symptom awareness. It cannot replace a clinical physical examination, diagnostic blood tests, or prescribed medication from a licensed medical professional.</p>');
    }
    if ($('modalStep1Title')) $('modalStep1Title').textContent = isHi ? 'लक्षण स्पष्ट रूप से बताएं' : (isOr ? 'ଲକ୍ଷଣଗୁଡ଼ିକ ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ' : 'Ask Symptoms Clearly');
    if ($('modalStep1P')) $('modalStep1P').textContent = isHi
      ? 'आपको या परिवार के सदस्य को क्या परेशानी हो रही है (जैसे: बुखार कितने दिन से है, सिरदर्द, उल्टी, खांसी या कुत्ते का काटना) यह स्पष्ट बताएं।'
      : (isOr ? 'ଆପଣ ବା ପରିବାର ଲୋକଙ୍କର କେଉଁ ସମସ୍ୟା ହେଉଛି (ଯଥା: ଜ୍ୱର କେତେ ଦିନରୁ, ମୁଣ୍ଡ ବିନ୍ଧା, ବାନ୍ତି, କାଶ ବା କୁକୁର କାମୁଡ଼ା) ତାହା ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ ।' : 'Describe clearly what you or a family member are experiencing (e.g. fever duration, headache, vomiting, rash, or animal bite) for accurate health guidance.');
    if ($('modalStep2Title')) $('modalStep2Title').textContent = isHi ? 'तुरंत डॉक्टर से परामर्श लें यदि:' : (isOr ? 'ତୁରନ୍ତ ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ ଯଦି:' : 'Immediately Consult a Doctor If:');
    if ($('modalStep2P')) $('modalStep2P').textContent = isHi
      ? 'लक्षण बिगड़ते हैं, बुखार 3 दिन से अधिक रहता है, लगातार उल्टी हो रही है या सांस लेने में परेशानी हो रही है, तो बिना देर किए नजदीकी अस्पताल (CHC) जाएं।'
      : (isOr ? 'ରୋଗ ବଢ଼ିଯାଏ, ଜ୍ୱର ୩ ଦିନରୁ ଅଧିକ ରହେ, ବାରମ୍ବାର ବାନ୍ତି ହୁଏ ବା ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହୁଏ, ତେବେ ବିଳମ୍ବ ନକରି ନିକଟସ୍ଥ CHC ଡାକ୍ତରଖାନା ଯାଆନ୍ତୁ ।' : 'Symptoms worsen, fever exceeds 3 days, there is persistent vomiting, intense pain, breathing difficulty, or confusion. Visit your nearest Community Health Centre (CHC) or Medical Officer immediately.');
    if ($('modalStep3Title')) $('modalStep3Title').textContent = isHi ? 'अपनी मर्जी से दवा न लें या बंद न करें' : (isOr ? 'ନିଜ ମନମୁତାବକ ଔଷଧ ଖାଆନ୍ତୁ ବା ବନ୍ଦ କରନ୍ତୁ ନାହିଁ' : 'Never Self-Medicate or Skip Treatment');
    if ($('modalStep3P')) $('modalStep3P').textContent = isHi
      ? 'डॉक्टर की सलाह के बिना एंटीबायोटिक, बीपी या डायबिटीज की दवाएं कभी बंद न करें या खुराक न बदलें।'
      : (isOr ? 'ଡାକ୍ତରଙ୍କ ବିନା ପରାମର୍ଶରେ ଆଣ୍ଟିବାୟୋଟିକ୍, ପ୍ରେସର ବା ଡାଇବେଟିସ୍ ଔଷଧ କେବେହେଲେ ବନ୍ଦ କରନ୍ତୁ ନାହିଁ ।' : 'Do not start, stop, or change prescribed antibiotics, insulin, or blood pressure medicines on your own. Always consult a qualified doctor or pharmacist.');
    if ($('modalStep4Title')) $('modalStep4Title').textContent = isHi ? '24/7 निःशुल्क राष्ट्रीय आपातकालीन हेल्पलाइन नंबर' : (isOr ? '୨୪/୭ ମାଗଣା ଜରୁରୀକାଳୀନ ହେଲ୍ପଲାଇନ୍ ନମ୍ବର' : '24/7 National Emergency Helplines');
    if ($('modalStep4P')) $('modalStep4P').innerHTML = isHi
      ? '• मेडिकल एम्बुलेंस: <strong>108</strong><br>• राष्ट्रीय आपातकालीन सेवा: <strong>112</strong><br>• मानसिक स्वास्थ्य सहायता (Tele-MANAS): <strong>14416</strong> (टोल-फ्री)'
      : (isOr ? '• ଆମ୍ବୁଲାନ୍ସ: <strong>୧୦୮</strong><br>• ଜାତୀୟ ଜରୁରୀ ସେବା: <strong>୧୧୨</strong><br>• ମାନସିକ ସ୍ୱାସ୍ଥ୍ୟ ସହାୟତା (Tele-MANAS): <strong>୧୪୪୧୬</strong> (Toll-Free)' : '• Medical Ambulance: <strong>108</strong><br>• National Emergency: <strong>112</strong><br>• Tele-MANAS Mental Health Support: <strong>14416</strong> (Toll-Free)');

    // User bar buttons
    if ($('signOut')) $('signOut').textContent = isHi ? 'लॉग आउट' : (isOr ? 'ଲଗ୍ ଆଉଟ୍' : 'Sign out');
    if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').textContent = isHi ? '🗑️ हटाएं' : (isOr ? '🗑️ ଡିଲିଟ୍' : '🗑️ Delete');

    // Delete account modal
    if ($('deleteModalTitle')) $('deleteModalTitle').textContent = isHi ? '⚠️ क्या आप अपना खाता हटाना चाहते हैं?' : (isOr ? '⚠️ ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ଡିଲିଟ୍ କରିବେ କି?' : '⚠️ Delete Your Account?');
    if ($('cancelDeleteBtn')) $('cancelDeleteBtn').textContent = isHi ? 'रद्द करें' : (isOr ? 'ବାତିଲ୍' : 'Cancel');
    if ($('confirmDeleteBtn')) $('confirmDeleteBtn').textContent = isHi ? 'हाँ, स्थायी रूप से हटाएं' : (isOr ? 'ହଁ, ସ୍ଥାୟୀ ଭାବେ ଡିଲିଟ୍ କରନ୍ତୁ' : 'Yes, Permanently Delete');

    const statusText = document.querySelector('.status-indicator span:last-child') || $('chatStatusText');
    if (statusText) {
      statusText.textContent = isHi
        ? 'सत्यापित स्वास्थ्य सलाह सक्रिय • आपातकालीन 108 प्रोटोकॉल'
        : (isOr
          ? 'ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ସକ୍ରିୟ • ଜରୁରୀକାଳୀନ ୧୦୮ ପ୍ରୋଟୋକଲ'
          : 'Verified Health Guidance Active • Emergency Referral Protocol');
    }

    // Update initial welcome bubble if it is the only bubble in chat
    const bubbles = document.querySelectorAll('.bubble');
    if (bubbles.length === 1 && bubbles[0].classList.contains('bot')) {
      bubbles[0].textContent = isHi
        ? 'नमस्ते! मैं स्वास्थ्य AI, आपका स्वास्थ्य सहायक। अपने लक्षण या स्वास्थ्य प्रश्न पूछें या नीचे माइक बटन दबाकर बोलें। मैं केवल WHO और स्वास्थ्य मंत्रालय के आधिकारिक व सत्यापित स्रोतों से सलाह देता हूँ।'
        : (isOr
          ? 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟ AI, ଓଡ଼ିଶାର ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ । ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା କହିବା ପାଇଁ ତଳେ ଥିବା ବଡ଼ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ମୁଁ କେବଳ WHO ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଅନୁଯାୟୀ ଘରୋଇ ଉପଚାର ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ଦେବି ।'
          : 'Namaskar! I am Swasth AI, your public health assistant for Odisha. Describe your symptoms or ask a health question. I answer only using verified WHO and Ministry of Health sources.');
    }

    const footDisclaimer = $('footDisclaimer');
    if (footDisclaimer) {
      footDisclaimer.innerHTML = isHi
        ? 'स्वास्थ्य AI केवल सूचनात्मक स्वास्थ्य मार्गदर्शन प्रदान करता है। यह कोई डॉक्टरी नुस्खा नहीं देता। आपातकालीन स्थिति में <strong>108</strong> या <strong>112</strong> पर कॉल करें।'
        : (isOr
          ? 'ସ୍ୱାସ୍ଥ୍ୟ AI କେବଳ ସୂଚନାକାରୀ ପରାମର୍ଶ ଦେଇଥାଏ । ଏହା କୌଣସି ଔଷଧର ପ୍ରେସକ୍ରିପସନ୍ ଦିଏନାହିଁ । ଜରୁରୀ ପରିସ୍ଥିତିରେ <strong>108</strong> କିମ୍ବା <strong>112</strong> କୁ କଲ୍ କରନ୍ତୁ ।'
          : 'Swasth AI provides public health guidance from verified WHO & Ministry of Health sources. It is <strong>not</strong> a medical doctor and cannot issue prescriptions. In an emergency, call <strong>108</strong> or <strong>112</strong>.');
    }

    const footCombined = $('footCopyrightCombined') || $('footCopyrightSmall') || $('footCopyrightMain');
    if (footCombined) {
      const siteLink = '&bull; <a href="https://swasth-ai.pages.dev" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:700;text-decoration:underline;">swasth-ai.pages.dev</a>';
      footCombined.innerHTML = isHi
        ? `&copy; 2026 स्वास्थ्य AI &bull; सर्वाधिकार सुरक्षित &bull; सार्वजनिक स्वास्थ्य सहायक &bull; F-204 DEMO PROJECT ${siteLink}`
        : (isOr
          ? `&copy; ୨୦୨୬ ସ୍ୱାସ୍ଥ୍ୟ AI &bull; ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ &bull; ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ &bull; F-204 DEMO PROJECT ${siteLink}`
          : `&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; F-204 DEMO PROJECT ${siteLink}`);
    }
  }

  function startChat() {
    if (started) return;
    started = true;
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    const welcome = isHi
      ? 'नमस्ते! मैं स्वास्थ्य AI, आपका स्वास्थ्य सहायक। अपने लक्षण या स्वास्थ्य प्रश्न पूछें या नीचे माइक बटन दबाकर बोलें। मैं केवल WHO और स्वास्थ्य मंत्रालय के आधिकारिक व सत्यापित स्रोतों से सलाह देता हूँ।'
      : (isOr
        ? 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟ AI, ଓଡ଼ିଶାର ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ । ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା କହିବା ପାଇଁ ତଳେ ଥିବା ବଡ଼ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ମୁଁ କେବଳ WHO ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଅନୁଯାୟୀ ଘରୋଇ ଉପଚାର ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ଦେବି ।'
        : 'Namaskar! I am Swasth AI, your public health assistant for Odisha. Describe your symptoms or ask a health question. I answer only using verified WHO and Ministry of Health sources.');
    addBubble('bot', welcome);
    renderChips();
    applyLanguage(currentLang);
  }

  // ---------- Audio Speech Synthesis (Voice Output - Step 3) ----------
  let activeAudio = null;
  let activeSpeakBtn = null;
  let keepAliveTimer = null;
  let sharedAudioCtx = null;
  let activeAudioSource = null;

  function getAudioContext() {
    try {
      if (!sharedAudioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) sharedAudioCtx = new AudioCtxClass();
      }
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
    return sharedAudioCtx;
  }

  function stopSpeaking() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {}
      activeAudio = null;
    }
    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch {}
      activeAudioSource = null;
    }
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (activeSpeakBtn) {
      activeSpeakBtn.classList.remove('speaking');
      const label = activeSpeakBtn.querySelector('.speak-label');
      if (label) {
        label.textContent = currentLang === 'hi' ? '🔊 सुनें' : (currentLang === 'or' ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen');
      }
      activeSpeakBtn = null;
    }
    if (typeof window !== 'undefined') window._activeSpeechUtterance = null;
  }

  function findVoiceByLang(voices, langCode) {
    if (!Array.isArray(voices)) return null;
    return voices.find((v) => {
      const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
      const name = (v.name || '').toLowerCase();
      if (langCode === 'hi') {
        return lang === 'hi-in' || lang === 'hi' || lang.startsWith('hi-') || name.includes('hindi');
      }
      return (
        lang === 'or-in' ||
        lang === 'or' ||
        lang === 'ory-in' ||
        lang === 'ory' ||
        lang.startsWith('or-') ||
        lang.startsWith('ory-') ||
        name.includes('odia') ||
        name.includes('oriya')
      );
    }) || null;
  }

  function fallbackBrowserSpeech(clean, btn, targetLang) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      stopSpeaking();
      return;
    }
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      const isOdia = targetLang === 'or' || /[\u0B00-\u0B7F]/.test(clean);
      const isHindi = targetLang === 'hi' || /[\u0900-\u097F]/.test(clean);

      if (isOdia) {
        const nativeOdiaVoice = findVoiceByLang(voices, 'or');
        if (!nativeOdiaVoice) {
          stopSpeaking();
          const label = btn.querySelector('.speak-label');
          if (label) {
            label.textContent = '⚠️ ଅଡିଓ ସଂଯୋଗ ହେଉନାହିଁ';
            setTimeout(() => { if (label) label.textContent = '🔊 ଶୁଣନ୍ତୁ'; }, 3000);
          }
          return;
        }

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = nativeOdiaVoice.lang || 'or-IN';
        utterance.voice = nativeOdiaVoice;
        utterance.rate = 0.88;
        utterance.pitch = 1.0;

        window._activeSpeechUtterance = utterance;
        const label = btn.querySelector('.speak-label');
        if (label) label.textContent = '⏹️ ବନ୍ଦ କରନ୍ତୁ';

        utterance.onend = () => stopSpeaking();
        utterance.onerror = () => stopSpeaking();

        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } else if (isHindi) {
        const hindiVoice = findVoiceByLang(voices, 'hi');
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = hindiVoice ? (hindiVoice.lang || 'hi-IN') : 'hi-IN';
        if (hindiVoice) utterance.voice = hindiVoice;
        utterance.rate = 0.90;
        utterance.pitch = 1.0;

        window._activeSpeechUtterance = utterance;
        const label = btn.querySelector('.speak-label');
        if (label) label.textContent = '⏹️ रोकें';

        utterance.onend = () => stopSpeaking();
        utterance.onerror = () => {
          stopSpeaking();
          const label = btn.querySelector('.speak-label');
          if (label) {
            label.textContent = '⚠️ ऑडियो उपलब्ध नहीं';
            setTimeout(() => { if (label) label.textContent = '🔊 सुनें'; }, 3000);
          }
        };

        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } else {
        const englishVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = englishVoice ? englishVoice.lang : 'en-US';
        if (englishVoice) utterance.voice = englishVoice;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        window._activeSpeechUtterance = utterance;
        const label = btn.querySelector('.speak-label');
        if (label) label.textContent = '⏹️ Stop';

        utterance.onend = () => stopSpeaking();
        utterance.onerror = () => {
          stopSpeaking();
          const label = btn.querySelector('.speak-label');
          if (label) {
            label.textContent = '⚠️ Audio not available';
            setTimeout(() => { if (label) label.textContent = '🔊 Listen'; }, 3000);
          }
        };

        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      stopSpeaking();
      const label = btn.querySelector('.speak-label');
      if (label) {
        const isHi = targetLang === 'hi' || /[\u0900-\u097F]/.test(clean);
        const isOr = targetLang === 'or' || /[\u0B00-\u0B7F]/.test(clean);
        label.textContent = isHi ? '⚠️ ऑडियो उपलब्ध नहीं' : (isOr ? '⚠️ ଅଡିଓ ସଂଯୋଗ ହେଉନାହିଁ' : '⚠️ Audio not available');
        setTimeout(() => { if (label) label.textContent = isHi ? '🔊 सुनें' : (isOr ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen'); }, 3000);
      }
    }
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Cache pre-generated audio for zero-lag instant playback (stores { blobUrl, arrayBuffer })
  const audioCache = new Map();

  function prepareSpokenText(rawText, maxLen = 400) {
    if (!rawText) return '';
    let clean = String(rawText)
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[📘🏠⚠️🏥🚨✨💡🗑️🦟🐕💧🤰☀️🔍📷]/g, '')
      .replace(/[*_#`~[\]()]/g, ' ')
      .replace(/^[ \t]*[-•]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (clean.length > maxLen) {
      let cutIdx = -1;
      const candidates = ['. ', '। ', '? ', '! ', '\n', ' '];
      for (const sep of candidates) {
        const last = clean.lastIndexOf(sep, maxLen);
        if (last > cutIdx && last > maxLen * 0.5) {
          cutIdx = last;
          break;
        }
      }
      if (cutIdx > 0) {
        clean = clean.slice(0, cutIdx);
      } else {
        clean = clean.slice(0, maxLen);
      }
    }
    // Clean trailing combining diacritics in Odia / Hindi or dangling punctuation
    clean = clean.replace(/[\u0B01-\u0B03\u0B3E-\u0B57\u0901-\u0903\u093E-\u094F\u0951-\u0957\s,;:.-]+$/u, '').trim();
    return clean;
  }

  async function fetchServerAudio(clean, lang) {
    if (!clean) return null;
    const l = lang || currentLang;
    const cacheKey = l + ':' + clean;
    if (audioCache.has(cacheKey)) return audioCache.get(cacheKey);

    try {
      let { data } = await sb.auth.getSession();
      let token = data?.session?.access_token;
      if (!token) {
        try {
          const refreshed = await sb.auth.refreshSession();
          token = refreshed?.data?.session?.access_token;
        } catch {}
      }
      if (!token && cfg.SUPABASE_ANON_KEY) {
        token = cfg.SUPABASE_ANON_KEY;
      }
      if (!token) return null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ text: clean, lang: l })
          });
          if (res.ok) {
            const out = await res.json();
            if (out.audio) {
              const arrayBuffer = base64ToArrayBuffer(out.audio);
              const blob = new Blob([arrayBuffer], { type: out.mimeType || 'audio/wav' });
              const blobUrl = URL.createObjectURL(blob);
              const cached = { blobUrl, arrayBuffer, mimeType: out.mimeType || 'audio/wav' };
              audioCache.set(cacheKey, cached);
              return cached;
            }
          } else if (res.status === 401 && attempt === 1) {
            try {
              const refreshed = await sb.auth.refreshSession();
              token = refreshed?.data?.session?.access_token || cfg.SUPABASE_ANON_KEY;
            } catch {}
          }
        } catch (e) {
          console.warn('TTS attempt ' + attempt + ' failed:', e);
          if (attempt === 1) await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (sessionErr) {
      console.warn('Session error in fetchServerAudio:', sessionErr);
    }
    return null;
  }

  async function preloadAudioForAnswer(rawText) {
    if (!rawText) return;
    const isRegional = /[\u0B00-\u0B7F\u0900-\u097F]/.test(rawText);
    if (!isRegional) return;

    const clean = prepareSpokenText(rawText, 380);
    const cacheKey = currentLang + ':' + clean;
    if (!clean || audioCache.has(cacheKey)) return;
    try {
      await fetchServerAudio(clean, currentLang);
    } catch {}
  }

  async function playWithWebAudio(arrayBuffer, btn, langCode) {
    const ctx = getAudioContext();
    if (!ctx) return false;
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      if (activeAudioSource) {
        try { activeAudioSource.stop(); } catch {}
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeAudioSource = source;

      const label = btn.querySelector('.speak-label');
      if (label) {
        label.textContent = langCode === 'hi' ? '⏹️ रोकें' : (langCode === 'or' ? '⏹️ ବନ୍ଦ କରନ୍ତୁ' : '⏹️ Stop');
      }

      source.onended = () => {
        if (activeAudioSource === source) {
          activeAudioSource = null;
          stopSpeaking();
        }
      };
      source.start(0);
      return true;
    } catch (err) {
      console.warn('WebAudio playback error:', err);
      return false;
    }
  }

  async function speakText(rawText, btn) {
    if (activeSpeakBtn === btn) {
      stopSpeaking();
      return;
    }
    stopSpeaking();

    // Unlock Web Audio Context immediately in the click gesture so laptop browsers never block playback
    getAudioContext();

    const clean = prepareSpokenText(rawText, 400);
    if (!clean) return;

    btn.classList.add('speaking');
    const label = btn.querySelector('.speak-label');
    const isOdia = /[\u0B00-\u0B7F]/.test(clean);
    const isHindi = /[\u0900-\u097F]/.test(clean);
    const langCode = isHindi ? 'hi' : (isOdia ? 'or' : 'en');
    activeSpeakBtn = btn;
    if (label) {
      label.textContent = isHindi ? '⏳ ऑडियो तैयार...' : (isOdia ? '⏳ ଅଡିଓ ପ୍ରସ୍ତୁତ...' : '⏳ Loading...');
    }

    try {
      const audioData = await fetchServerAudio(clean, langCode);
      if (audioData) {
        let played = false;
        try {
          const audio = new Audio(audioData.blobUrl);
          activeAudio = audio;
          if (label) {
            label.textContent = isHindi ? '⏹️ रोकें' : (isOdia ? '⏹️ ବନ୍ଦ କରନ୍ତୁ' : '⏹️ Stop');
          }

          audio.onended = () => stopSpeaking();
          audio.onerror = async () => {
            console.warn('HTML5 audio error, falling back to WebAudio decoder');
            played = await playWithWebAudio(audioData.arrayBuffer, btn, langCode);
            if (!played) fallbackBrowserSpeech(clean, btn, langCode);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            played = true;
          }
        } catch (playErr) {
          console.warn('HTML5 play rejected (e.g. autoplay policy), falling back to WebAudio:', playErr);
          played = await playWithWebAudio(audioData.arrayBuffer, btn, langCode);
        }
        if (played) return;
      }

      // If server audio failed after retries, try browser SpeechSynthesis fallback
      fallbackBrowserSpeech(clean, btn, langCode);
    } catch (e) {
      console.warn('Speech playback unexpected error:', e);
      stopSpeaking();
      fallbackBrowserSpeech(clean, btn, langCode);
    }
  }

  function typing() {
    const d = document.createElement('div');
    d.className = 'bubble bot';
    d.setAttribute('aria-label', 'Swasth AI is thinking');
    const t = document.createElement('span');
    t.className = 'typing';
    for (let i = 0; i < 3; i++) t.appendChild(document.createElement('i'));
    d.appendChild(t);
    $('messages').appendChild(d);
    d.scrollIntoView({ block: 'end' });
    setTimeout(() => {
      const mb = $('messages');
      if (mb) mb.scrollTop = mb.scrollHeight;
    }, 60);
    return d;
  }

  function scanningIndicator() {
    const d = document.createElement('div');
    d.className = 'bubble bot scanning-bubble';
    d.setAttribute('aria-label', 'Swasth AI is analyzing photo');

    const box = document.createElement('div');
    box.className = 'scan-laser-box';
    const icon = document.createElement('span');
    icon.textContent = '📸';
    icon.style.fontSize = '18px';
    const beam = document.createElement('div');
    beam.className = 'scan-laser-beam';
    box.appendChild(icon);
    box.appendChild(beam);

    const txtGroup = document.createElement('div');
    txtGroup.className = 'scan-text-group';
    const title = document.createElement('span');
    title.className = 'scan-title';
    const sub = document.createElement('span');
    sub.className = 'scan-sub';

    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    title.textContent = isHi
      ? '📸 क्लिनिकल फोटो विश्लेषण जारी है...'
      : (isOr ? '📸 ଡାକ୍ତରୀ ଫଟୋ ପରୀକ୍ଷା ଚାଲିଛି...' : '📸 AI Clinical Photo Analyzing...');
    sub.textContent = isHi
      ? 'लक्षण, सुरक्षा प्रोटोकॉल व प्राथमिक उपचार जाँचे जा रहे हैं'
      : (isOr ? 'ଲକ୍ଷଣ, ସୁରକ୍ଷା ପ୍ରୋଟୋକଲ୍ ଓ ଚିକିତ୍ସା ଯାଞ୍ଚ ହେଉଛି' : 'Analyzing clinical features & triage safety protocol');

    txtGroup.appendChild(title);
    txtGroup.appendChild(sub);
    d.appendChild(box);
    d.appendChild(txtGroup);
    $('messages').appendChild(d);
    d.scrollIntoView({ block: 'end' });
    setTimeout(() => {
      const mb = $('messages');
      if (mb) mb.scrollTop = mb.scrollHeight;
    }, 60);
    return d;
  }

  function renderAnswer(data) {
    const isVision = data.kind === 'vision_skin';
    const kind = ['emergency', 'blocked', 'no_answer'].includes(data.kind) ? data.kind : (isVision ? 'vision-skin' : '');
    const d = addBubble('bot ' + kind, data.answer || '');

    if (isVision) {
      const dermaHeader = document.createElement('div');
      dermaHeader.className = 'derma-card-header';
      const dept = data.department || 'photo';
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';

      let icon = '📸';
      let title = isHi ? '📸 क्लिनिकल फोटो मूल्यांकन (Clinical Assessment)' : (isOr ? '📸 ଡାକ୍ତରୀ ଫଟୋ ପରୀକ୍ଷା' : '📸 AI Clinical Photo Assessment');
      let subtitle = isHi ? 'त्वचा, आँख, मुँह, घाव व बाल स्वास्थ्य जांच प्रोटोकॉल' : (isOr ? 'ଚର୍ମ, ଆଖି, ମୁଖ, ଘା\' ଓ ଶିଶୁ ସୁରକ୍ଷା ଯାଞ୍ଚ' : 'Multi-Condition Clinical Triage & Safety Protocol');

      if (dept === 'derma' || dept === 'photo') {
        icon = '📸';
        title = isHi ? '📸 क्लिनिकल फोटो मूल्यांकन' : (isOr ? '📸 ଡାକ୍ତରୀ ଫଟୋ ପରୀକ୍ଷା' : '📸 AI Clinical Photo Assessment');
        subtitle = isHi ? 'लक्षण, प्राथमिक उपचार व सुरक्षा प्रोटोकॉल' : (isOr ? 'ଲକ୍ଷଣ, ସୁରକ୍ଷା ଓ ପ୍ରାଥମିକ ଚିକିତ୍ସା ଯାଞ୍ଚ' : 'Clinical Triage, First Aid & Safety Protocol');
      } else if (dept === 'eye') {
        icon = '👁️';
        title = isHi ? '👁️ नेत्र चिकित्सा व दृष्टि मूल्यांकन (Netra Pariksha)' : (isOr ? '👁️ ନେତ୍ର ବିଭାଗ ଓ ଦୃଷ୍ଟି ପରୀକ୍ଷା (ନେତ୍ର ପରୀକ୍ଷା)' : '👁️ Ophthalmology & Eye Department (Netra Pariksha)');
        subtitle = isHi ? 'कंजक्टिवाइटिस, लाल आँख व आपातकालीन जांच' : (isOr ? 'କଞ୍ଜକ୍ଟିଭାଇଟିସ୍, ଲାଲ୍ ଆଖି ଓ ଜରୁରୀ ପରାମର୍ଶ' : 'Conjunctivitis, Stye, Red Eye & Visual Triage Protocol');
      } else if (dept === 'oral') {
        icon = '👄';
        title = isHi ? '👄 मुख स्वास्थ्य व कैंसर पूर्व जांच (Mukh Swasthya)' : (isOr ? '👄 ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ ଓ କର୍କଟ ପୂର୍ବ ଯାଞ୍ଚ (ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ)' : '👄 Oral Health & Pre-Cancer Screening (Mukh Swasthya)');
        subtitle = isHi ? 'मुँह के छाले, तंबाकू व ल्यूकोप्लाकिया सुरक्षा जांच' : (isOr ? 'ତମାଖୁ, ଗୁଟ୍‌ଖା, ପାନ ଓ ଘା\' ଯାଞ୍ଚ ପ୍ରୋଟୋକଲ୍' : 'Aphthous Ulcers, OSMF & Pre-Malignancy Triage');
      } else if (dept === 'pediatric') {
        icon = '👶';
        title = isHi ? '👶 शिशु स्वास्थ्य व नवजात मूल्यांकन (Shishu Swasthya)' : (isOr ? '👶 ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ ଓ ନବଜାତ ଯତ୍ନ (ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ)' : '👶 Pediatrics & Newborn Triage (Shishu Swasthya)');
        subtitle = isHi ? 'नवजात पीलिया (Jaundice), डायपर रैश व निर्जलीकरण जांच' : (isOr ? 'କାମଳ (Jaundice), ଡାଏପର ରାସ୍ ଓ ଶିଶୁ ସୁରକ୍ଷା' : 'Neonatal Jaundice, Dehydration & Pediatric Triage');
      } else if (dept === 'wound') {
        icon = '🩹';
        title = isHi ? '🩹 घाव, जलन व पशु काटना (Khyata & Porajala)' : (isOr ? '🩹 ଘା\', ପୋଡ଼ାଜଳା ଓ ପଶୁ କାମୁଡ଼ା (କ୍ଷତ ଓ ପୋଡ଼ାଜଳା)' : '🩹 Wounds, Burns & Animal Bites (Khyata & Porajala)');
        subtitle = isHi ? 'कुत्ता काटने पर 15 मिनट पानी से धोने व रेबीज सुरक्षा प्रोटोकॉल' : (isOr ? 'କୁକୁର କାମୁଡ଼ା ରେବିସ୍ ସୁରକ୍ଷା ଓ ୧୫ ମିନିଟ୍ ଧୋଇବା ପ୍ରୋଟୋକଲ୍' : '15-Min Running Water Rabies Wash & Burn Triage');
      } else if (dept === 'nail') {
        icon = '💅';
        title = isHi ? '💅 नाखून व एनीमिया दृश्य मूल्यांकन (Nakha Pariksha)' : (isOr ? '💅 ନଖ ଓ ରକ୍ତହୀନତା ପରୀକ୍ଷା (ନଖ ପରୀକ୍ଷା)' : '💅 Nails & Anemia Visual Screening (Nakha Pariksha)');
        subtitle = isHi ? 'रक्तहीनता (Pallor), ऑक्सीजन स्तर व पोषण जांच' : (isOr ? 'ରକ୍ତହୀନତା (Pallor), ଅକ୍ସିଜେନ୍ ଓ ପୋଷଣ ଯାଞ୍ଚ' : 'Subungual Pallor, Koilonychia & Hemoglobin Triage');
      }

      dermaHeader.innerHTML = `
        <div class="derma-head-icon">${icon}</div>
        <div class="derma-head-content">
          <div class="derma-head-title">${title}</div>
          <div class="derma-head-sub">${subtitle}</div>
        </div>
      `;
      d.prepend(dermaHeader);
    }

    // Preload audio in background for instant 0ms playback when user clicks Listen
    if (data.answer) preloadAudioForAnswer(data.answer);

    // Voice Output Audio Speaker Button (Step 3: Listen aloud in Hindi / Odia / English)
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
    }

    // In-Chat Emergency Live Hospital Map Card
    if (data.kind === 'emergency') {
      const emCard = document.createElement('div');
      emCard.className = 'emergency-chat-map-card';
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';
      emCard.innerHTML = `
        <div class="emergency-chat-map-header">
          <span class="emergency-chat-map-badge">${isHi ? '🚨 तत्काल चिकित्सकीय सहायता' : (isOr ? '🚨 ତୁରନ୍ତ ଡାକ୍ତରୀ ସହାୟତା ଆବଶ୍ୟକ' : '🚨 Immediate Medical Care Required')}</span>
          <strong>${isHi ? 'निकटतम 24x7 अस्पताल व आपातकालीन दिशा-निर्देश' : (isOr ? 'ନିକଟସ୍ଥ ୨୪x୭ ଡାକ୍ତରଖାନା ଓ ରାସ୍ତା ଦେଖନ୍ତୁ' : 'Find Nearest Emergency Hospital & Route')}</strong>
          <p>${isHi ? 'अपने पास के सरकारी अस्पताल, ट्रॉमा सेंटर या सीएचसी का लाइव नक्शा देखें।' : (isOr ? 'ଆପଣଙ୍କ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲ, ଟ୍ରମା ସେଣ୍ଟର ବା CHC ର ଲାଇଭ୍ ମ୍ୟାପ୍ ଦେଖନ୍ତୁ ।' : 'Locate the closest government hospital, trauma centre, or CHC with live directions.')}</p>
        </div>
        <button class="btn danger small emergency-locate-btn" type="button">
          📍 ${isHi ? 'निकटतम अस्पताल खोजें (GPS नक्शा)' : (isOr ? 'ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ଖୋଜନ୍ତୁ (GPS ମ୍ୟାପ୍)' : 'Locate Nearest Hospital (GPS Live Map)')}
        </button>
      `;
      const locBtn = emCard.querySelector('.emergency-locate-btn');
      if (locBtn) locBtn.addEventListener('click', () => openHospitalMap());
      d.appendChild(emCard);
    }

    if (Array.isArray(data.sources) && data.sources.length) {
      const s = document.createElement('div');
      s.className = 'sources';
      const srcTitle = currentLang === 'hi' ? 'सत्यापित स्रोत: ' : (currentLang === 'or' ? 'ଯାଞ୍ଚ ହୋଇଥିବା ଉତ୍ସ: ' : 'Verified Source: ');
      s.appendChild(document.createTextNode(srcTitle));
      data.sources.forEach((src, i) => {
        if (i) s.appendChild(document.createTextNode('; '));
        if (src.url && /^https?:\/\//.test(src.url)) {
          const a = document.createElement('a');
          a.href = src.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = src.name;
          s.appendChild(a);
        } else {
          s.appendChild(document.createTextNode(src.name));
        }
      });
      d.appendChild(s);
    }
    const discText = currentLang === 'hi'
      ? (data.disclaimer && /[\u0900-\u097F]/.test(data.disclaimer) ? data.disclaimer : 'यह सामान्य स्वास्थ्य जानकारी है, कोई डॉक्टरी नुस्खा नहीं। किसी भी स्वास्थ्य समस्या के लिए कृपया डॉक्टर या नजदीकी स्वास्थ्य केंद्र से संपर्क करें।')
      : (currentLang === 'or'
        ? (data.disclaimer && /[\u0B00-\u0B7F]/.test(data.disclaimer) ? data.disclaimer : 'ଏହା ଏକ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା, କୌଣସି ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନ୍ ନୁହେଁ । ଯେକୌଣସି ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ପାଇଁ ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ଯାଆନ୍ତୁ ।')
        : (data.disclaimer && !/[\u0B00-\u0B7F\u0900-\u097F]/.test(data.disclaimer) ? data.disclaimer : 'This is general health information, not a diagnosis. For any health problem, please see a doctor or your nearest health worker.'));
    const p = document.createElement('div');
    p.className = 'disc';
    p.textContent = discText;
    d.appendChild(p);
    d.scrollIntoView({ block: 'end' });
  }

  function setRemaining(n) {
    if ($('remaining')) {
      $('remaining').textContent = typeof n === 'number'
        ? (currentLang === 'hi'
          ? `आज आप ${n} और प्रश्न पूछ सकते हैं`
          : (currentLang === 'or' ? `ଆଜି ଆଉ ${n} ଟି ପ୍ରଶ୍ନ ପଚାରିପାରିବେ` : `${n} question${n === 1 ? '' : 's'} left today`))
        : '';
    }
  }

  // ---------- Skin Photo / Camera & 6-Department Integration ----------
  let pendingSkinImage = null; // { data: base64, mimeType: string, previewUrl: string }
  let selectedDepartment = 'auto';
  let lastQueryWasVoice = false;

  function initDeptPills() {
    const pills = document.querySelectorAll('.dept-pill');
    pills.forEach((p) => {
      p.addEventListener('click', (e) => {
        e.preventDefault();
        pills.forEach((x) => x.classList.remove('active'));
        p.classList.add('active');
        selectedDepartment = p.getAttribute('data-dept') || 'auto';
      });
    });
  }

  function clearPendingImage() {
    pendingSkinImage = null;
    selectedDepartment = 'auto';
    const pills = document.querySelectorAll('.dept-pill');
    pills.forEach((x, i) => x.classList.toggle('active', i === 0));
    const tray = $('imagePreviewTray');
    if (tray) tray.hidden = true;
    const thumb = $('imagePreviewThumb');
    if (thumb) thumb.remove();
    const input = $('cameraInput');
    if (input) input.value = '';
  }

  function compressAndSetImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const base64Data = compressedDataUrl.split(',')[1];
        pendingSkinImage = {
          data: base64Data,
          mimeType: 'image/jpeg',
          previewUrl: compressedDataUrl
        };
        let thumb = $('imagePreviewThumb');
        if (!thumb) {
          thumb = document.createElement('img');
          thumb.id = 'imagePreviewThumb';
          thumb.className = 'image-preview-thumb';
          thumb.alt = 'Skin symptom preview';
          $('imagePreviewThumbBox')?.appendChild(thumb);
        }
        thumb.src = compressedDataUrl;
        const tray = $('imagePreviewTray');
        if (tray) tray.hidden = false;
        $('question')?.focus();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initCameraControl() {
    const cameraInput = $('cameraInput');
    const cameraBtn = $('cameraBtn');
    const photoBox = $('photoActionBox');
    const regionalCameraBtn = $('regionalCameraBtn');
    const removeBtn = $('removeImageBtn');
    const analyzeBtn = $('analyzePhotoBtn');

    if (cameraBtn && cameraInput) {
      cameraBtn.addEventListener('click', () => cameraInput.click());
    }
    if (photoBox && cameraInput) {
      photoBox.addEventListener('click', () => cameraInput.click());
    }
    if (regionalCameraBtn && cameraInput) {
      regionalCameraBtn.addEventListener('click', () => cameraInput.click());
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => clearPendingImage());
    }
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        if (pendingSkinImage && !busy) {
          send($('question')?.value || '');
        }
      });
    }
    if (cameraInput) {
      cameraInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) compressAndSetImage(file);
      });
    }
  }

  async function send(raw) {
    const text = (raw || '').trim();
    if ((!text && !pendingSkinImage) || busy) return;
    if (text.length > MAX) {
      addBubble('error', currentLang === 'hi'
        ? `कृपया अपना प्रश्न ${MAX} अक्षरों के भीतर रखें।`
        : (currentLang === 'or'
          ? `ଦୟାକରି ଆପଣଙ୍କ ପ୍ରଶ୍ନ ${MAX} ଅକ୍ଷର ମଧ୍ୟରେ ସୀମିତ ରଖନ୍ତୁ ।`
          : `Please keep your question under ${MAX} characters.`));
      return;
    }
    busy = true;
    $('sendBtn').disabled = true;
    if ($('chips')) $('chips').hidden = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('chat-has-results');
      const cv = $('chatView'); if (cv) cv.classList.add('chat-has-results');
    }

    const activeImage = pendingSkinImage;
    const activeDept = selectedDepartment;
    clearPendingImage();

    const userBubbleText = text || (currentLang === 'hi'
      ? '📷 क्लिनिकल फोटो मूल्यांकन के लिए भेजी गई'
      : (currentLang === 'or' ? '📷 ଡାକ୍ତରୀ ପରୀକ୍ଷା ପାଇଁ ଫଟୋ ପଠାଗଲା' : '📷 Clinical photo sent for assessment'));
    const userBubble = addBubble('user', userBubbleText);
    if (activeImage && activeImage.previewUrl) {
      const card = document.createElement('div');
      card.className = 'user-sent-image-card';
      const imgEl = document.createElement('img');
      imgEl.src = activeImage.previewUrl;
      imgEl.className = 'user-sent-image';
      imgEl.alt = 'Uploaded clinical photo';
      const badge = document.createElement('span');
      badge.className = 'user-image-badge';
      badge.textContent = currentLang === 'hi'
        ? '📷 फोटो (Photo)'
        : (currentLang === 'or' ? '📷 ଫଟୋ (Photo)' : '📷 Photo');
      card.appendChild(imgEl);
      card.appendChild(badge);
      userBubble.prepend(card);
    }

    $('question').value = '';
    resizeInput();
    updateCounter();
    const wait = activeImage ? scanningIndicator() : typing();

    try {
      const { data } = await sb.auth.getSession();
      const session = data && data.session;
      if (!session) {
        wait.remove();
        addBubble('error', currentLang === 'hi'
          ? 'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।'
          : (currentLang === 'or'
            ? 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁଣି ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।'
            : 'Your session has ended. Please sign in again.'));
        await sb.auth.signOut();
        return;
      }

      const endpoint = activeImage ? '/api/vision-skin' : '/api/chat';
      const payload = activeImage
        ? { image: activeImage.data, mimeType: activeImage.mimeType, symptoms: text, lang: currentLang, department: activeDept }
        : { message: text, lang: currentLang };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token
        },
        body: JSON.stringify(payload)
      });
      let body = {};
      try { body = await res.json(); } catch (e) {}
      wait.remove();
      if (res.ok) {
        renderAnswer(body);
        if (body.remaining !== undefined) setRemaining(body.remaining);
      } else if (res.status === 401) {
        addBubble('error', currentLang === 'hi'
          ? 'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।'
          : (currentLang === 'or'
            ? 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁଣି ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।'
            : 'Your session has ended. Please sign in again.'));
        await sb.auth.signOut();
      } else {
        const defaultErr = currentLang === 'hi'
          ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।'
          : (currentLang === 'or' ? 'କିଛି ତ୍ରୁଟି ଘଟିଲା । ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ ।' : 'Something went wrong. Please try again.');
        addBubble('error', body.message || defaultErr);
      }
    } catch (e) {
      wait.remove();
      addBubble('error', currentLang === 'hi'
        ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना इंटरनेट जांचें और पुनः प्रयास करें।'
        : (currentLang === 'or'
          ? 'ସର୍ଭର ସହ ସଂଯୋଗ ହୋଇପାରିଲା ନାହିଁ । ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ ।'
          : 'Could not reach the server. Check your internet and try again.'));
    } finally {
      busy = false;
      $('sendBtn').disabled = false;
      $('question').focus();
    }
  }

  function resizeInput() {
    const q = $('question');
    if (!q) return;
    q.style.height = 'auto';
    q.style.height = Math.min(q.scrollHeight, 140) + 'px';
  }
  function updateCounter() {
    const q = $('question');
    if (!q || !$('counter')) return;
    const n = q.value.length;
    $('counter').textContent = `${n} / ${MAX}`;
  }

  if ($('question')) {
    $('question').addEventListener('input', () => { updateCounter(); resizeInput(); });
    $('question').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send($('question').value);
      }
    });
  }
  if ($('chatForm')) {
    $('chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      send($('question').value);
      updateCounter();
    });
  }

  // ---------- Dedicated Odia Voice Control (No type box) ----------
  let odiaRecording = false;
  let odiaMediaRecorder = null;
  let odiaAudioChunks = [];
  let odiaTimer = null;

  function resetOdiaVoiceBtn() {
    odiaRecording = false;
    const voiceBox = $('voiceActionBox');
    if (voiceBox) voiceBox.classList.remove('recording');
    const mainBtn = $('odiaVoiceMainBtn');
    if (mainBtn) mainBtn.classList.remove('recording');
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    const voiceBoxTitle = $('voiceBoxTitle');
    const voiceBoxSub = $('voiceBoxSub');
    if (voiceBoxTitle) {
      voiceBoxTitle.textContent = isHi ? '🎙️ आवाज़ (Voice)' : (isOr ? '🎙️ ଭଏସ୍ (Voice)' : '🎙️ Voice Message');
    }
    if (voiceBoxSub) {
      voiceBoxSub.textContent = isHi ? 'बोलकर पूछें' : (isOr ? 'ଓଡ଼ିଆରେ କୁହନ୍ତୁ' : 'Tap to speak');
    }
  }

  function initOdiaVoiceControl() {
    const mainBtn = $('odiaVoiceMainBtn');
    const voiceBox = $('voiceActionBox');
    if (!mainBtn && !voiceBox) return;

    const startStopVoice = async () => {
      // If mic is active, clicking it immediately stops recording, turns mic off, and finds results!
      if (odiaRecording) {
        if (odiaTimer) clearTimeout(odiaTimer);
        if (odiaMediaRecorder && odiaMediaRecorder.state === 'recording') {
          odiaMediaRecorder.stop();
        }
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(currentLang === 'hi'
          ? 'इस ब्राउज़र में माइक्रोफ़ोन समर्थित नहीं है।'
          : (currentLang === 'or' ? 'ମାଇକ୍ରୋଫୋନ୍ ସମର୍ଥନ ଏହି ବ୍ରାଉଜରରେ ଉପଲବ୍ଧ ନାହିଁ ।' : 'Microphone not supported in this browser'));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm'))
          ? 'audio/webm'
          : 'audio/mp4';

        odiaMediaRecorder = new MediaRecorder(stream);
        odiaAudioChunks = [];

        odiaMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) odiaAudioChunks.push(e.data);
        };

        odiaMediaRecorder.onstart = () => {
          odiaRecording = true;
          if (mainBtn) mainBtn.classList.add('recording');
          if (voiceBox) voiceBox.classList.add('recording');
          const isOr = currentLang === 'or';
          const isHi = currentLang === 'hi';
          const voiceBoxTitle = $('voiceBoxTitle');
          const voiceBoxSub = $('voiceBoxSub');
          if (voiceBoxTitle) {
            voiceBoxTitle.textContent = isHi
              ? '🔴 सुन रहा हूँ... (रोकने के लिए टैप करें)'
              : (isOr ? '🔴 ଶୁଣୁଛି... (ରୋକିବାକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ)' : '🔴 Listening... (Tap to Send)');
          }
          if (voiceBoxSub) {
            voiceBoxSub.textContent = isHi
              ? 'पूरा होने पर यहाँ फिर से टैप करें'
              : (isOr ? 'ସରିଲେ ଏଠାରେ ପୁଣି ଟ୍ୟାପ୍ କରନ୍ତୁ' : 'Tap when done speaking');
          }
        };

        odiaMediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          odiaRecording = false;
          if (mainBtn) mainBtn.classList.remove('recording');
          if (voiceBox) voiceBox.classList.remove('recording');
          const isOr = currentLang === 'or';
          const isHi = currentLang === 'hi';
          const voiceBoxTitle = $('voiceBoxTitle');
          const voiceBoxSub = $('voiceBoxSub');
          if (voiceBoxTitle) {
            voiceBoxTitle.textContent = isHi
              ? '⏳ आवाज़ की जाँच हो रही है...'
              : (isOr ? '⏳ ସ୍ୱର ଯାଞ୍ଚ ହେଉଛି...' : '⏳ Processing voice...');
          }
          if (voiceBoxSub) {
            voiceBoxSub.textContent = isHi
              ? 'डॉक्टर की सलाह खोजी जा रही है...'
              : (isOr ? 'ଡାକ୍ତରୀ ପରାମର୍ଶ ଖୋଜା ଚାଲିଛି...' : 'Finding verified medical guidance...');
          }

          if (!odiaAudioChunks.length) {
            resetOdiaVoiceBtn();
            return;
          }

          const audioBlob = new Blob(odiaAudioChunks, { type: mimeType });
          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Audio = (reader.result || '').split(',')[1];
              if (!base64Audio) {
                resetOdiaVoiceBtn();
                return;
              }

              const { data } = await sb.auth.getSession();
              const token = data?.session?.access_token;
              if (!token) {
                resetOdiaVoiceBtn();
                addBubble('error', currentLang === 'hi'
                  ? 'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।'
                  : 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁନର୍ବାର ଲଗଇନ୍ କରନ୍ତୁ ।');
                return;
              }

              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ audio: base64Audio, mimeType, lang: currentLang })
              });

              resetOdiaVoiceBtn();

              if (res.ok) {
                const out = await res.json();
                if (out.text && out.text.trim()) {
                  // Show the transcribed question on screen and fetch clinical guidance
                  lastQueryWasVoice = true;
                  send(out.text.trim());
                } else {
                  addBubble('error', currentLang === 'hi'
                    ? 'आवाज़ स्पष्ट सुनाई नहीं दी। कृपया फिर से बोलें। (Could not hear clearly, please try speaking again).'
                    : 'ସ୍ୱର ସ୍ପଷ୍ଟ ଶୁଣାଗଲା ନାହିଁ । ଦୟାକରି ପୁଣି ଥରେ କୁହନ୍ତୁ । (Could not hear clearly, please try speaking again).');
                }
              } else {
                addBubble('error', currentLang === 'hi'
                  ? 'आवाज़ पहचान सेवा इस समय व्यस्त है। कृपया पुनः प्रयास करें।'
                  : 'ସ୍ୱର ଯାଞ୍ଚ ସେବା ବର୍ତ୍ତମାନ ବ୍ୟସ୍ତ ଅଛି । ଦୟାକରି ଆଉଥରେ ଚେଷ୍ଟା କରନ୍ତୁ ।');
              }
            };
          } catch (err) {
            console.error('Audio transcribe error:', err);
            resetOdiaVoiceBtn();
            addBubble('error', currentLang === 'hi'
              ? 'ऑडियो प्रसंस्करण में त्रुटि हुई। कृपया फिर से बोलें।'
              : 'ଅଡିଓ ଯାଞ୍ଚରେ ତ୍ରୁଟି ହେଲା । ଦୟାକରି ପୁଣି ଥରେ କୁହନ୍ତୁ ।');
          }
        };

        odiaMediaRecorder.start(250);
        // Automatically stop recording after 3.8 seconds if not clicked manually (minimizes wait lag)
        odiaTimer = setTimeout(() => {
          if (odiaMediaRecorder && odiaMediaRecorder.state === 'recording') {
            odiaMediaRecorder.stop();
          }
        }, 3800);

      } catch (err) {
        console.error('Mic permission error:', err);
        alert(currentLang === 'hi'
          ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया माइक की अनुमति दें।'
          : 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ । ଦୟାକରି ମାଇକ୍ ଅନୁମତି ଦିଅନ୍ତୁ । (Microphone permission was not granted)');
        resetOdiaVoiceBtn();
      }
    };

    if (mainBtn) mainBtn.addEventListener('click', startStopVoice);
    if (voiceBox) voiceBox.addEventListener('click', startStopVoice);
  }

  // ---------- English / Hindi Mic Button (Composer) ----------
  const micBtn = $('micBtn');
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  if (micBtn) {
    let recording = false;
    let recognition = null;

    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : (currentLang === 'or' ? 'or-IN' : 'en-IN');

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            const q = $('question');
            if (q) {
              q.value = (q.value ? q.value + ' ' : '') + transcript;
              updateCounter();
              resizeInput();
              q.focus();
            }
          }
          recording = false;
          micBtn.classList.remove('recording');
        };

        recognition.onend = () => {
          recording = false;
          micBtn.classList.remove('recording');
        };
        recognition.onerror = () => {
          recording = false;
          micBtn.classList.remove('recording');
        };
      } catch (e) {
        recognition = null;
      }
    }

    micBtn.addEventListener('click', () => {
      if (!recognition) {
        // Smooth fallback to MediaRecorder voice input if Web Speech Recognition is not supported in mobile browser
        const regionalVoice = $('odiaVoiceMainBtn');
        if (regionalVoice) {
          regionalVoice.click();
          return;
        }
        alert(currentLang === 'hi'
          ? 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया अपना प्रश्न टाइप करें।'
          : (currentLang === 'or' ? 'ଏହି ବ୍ରାଉଜରରେ ସ୍ୱର ଚିହ୍ନଟ ସମର୍ଥିତ ନୁହେଁ ।' : 'Speech recognition is not supported in this browser. Please type your question.'));
        return;
      }
      if (recording) {
        try { recognition.stop(); } catch {}
        recording = false;
        micBtn.classList.remove('recording');
        return;
      }
      try {
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : (currentLang === 'or' ? 'or-IN' : 'en-IN');
        recognition.start();
        recording = true;
        micBtn.classList.add('recording');
      } catch {
        recording = false;
        micBtn.classList.remove('recording');
      }
    });
  }

  // ---------- Language Switcher Setup ----------
  const langEnBtn = $('langEnBtn');
  const langOrBtn = $('langOrBtn');
  const langHiBtn = $('langHiBtn');
  if (langEnBtn) langEnBtn.addEventListener('click', () => applyLanguage('en'));
  if (langOrBtn) langOrBtn.addEventListener('click', () => applyLanguage('or'));
  if (langHiBtn) langHiBtn.addEventListener('click', () => applyLanguage('hi'));

  initOdiaVoiceControl();
  initCameraControl();
  initDeptPills();

  // ---------- PWA & Service Worker Registration ----------
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Swasth AI PWA ServiceWorker active:', reg.scope);
      }).catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    });
  }

  // ---------- 1-Tap PWA Mobile App Install Prompt ----------
  let deferredPrompt = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const installBtn = $('pwaInstallBtn');
      if (installBtn) {
        installBtn.hidden = false;
        const isOr = currentLang === 'or';
        const isHi = currentLang === 'hi';
        installBtn.textContent = isHi ? '📲 ऐप इंस्टॉल करें' : (isOr ? '📲 ଆପ୍ ଇନଷ୍ଟଲ୍' : '📲 Install App');
        installBtn.onclick = async () => {
          installBtn.hidden = true;
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('User PWA install response:', outcome);
            deferredPrompt = null;
          }
        };
      }
    });

    window.addEventListener('appinstalled', () => {
      const installBtn = $('pwaInstallBtn');
      if (installBtn) installBtn.hidden = true;
      console.log('Swasth AI successfully installed on home screen!');
    });
  }

  // =========================================================================
  // EMERGENCY HOSPITAL LOCATOR & DELIVERY-AGENT STYLE LIVE MAP (Leaflet + Google Maps)
  // Comprehensive coverage across ALL 30 DISTRICTS of Odisha + National Apex
  // =========================================================================
  const GOVT_HOSPITALS = [
    // --- 1. KHORDHA / BHUBANESWAR ---
    {
      id: 'bbsr-aiims',
      name: 'AIIMS Bhubaneswar',
      nameOr: 'ଏମ୍ସ ଭୁବନେଶ୍ୱର (AIIMS Bhubaneswar)',
      nameHi: 'एम्स भुवनेश्वर (AIIMS Bhubaneswar)',
      lat: 20.2312,
      lng: 85.7760,
      district: 'khordha',
      type: 'National Apex Referral & Trauma',
      address: 'Sijua, Patrapada, Bhubaneswar - 751019',
      phone: '0674-2476789',
      emergencyPhone: '108',
      casualty: '24x7 Emergency & Multi-Specialty Trauma Centre'
    },
    {
      id: 'bbsr-capital',
      name: 'Capital Hospital & PGIER Bhubaneswar',
      nameOr: 'କ୍ୟାପିଟାଲ୍ ହସ୍ପିଟାଲ୍ ଓ ପିଜିଆଇଇଆର (Capital Hospital)',
      nameHi: 'कैपिटल हॉस्पिटल व पीजीआईईआर, भुवनेश्वर',
      lat: 20.2644,
      lng: 85.8281,
      district: 'khordha',
      type: 'Postgraduate Institute & Apex Hospital',
      address: 'Unit-6, Ganga Nagar, Bhubaneswar - 751001',
      phone: '0674-2391983',
      emergencyPhone: '108',
      casualty: '24x7 State Emergency & Casualty Desk'
    },
    {
      id: 'khordha-dhh',
      name: 'District Headquarters Hospital (DHH) Khordha',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଖୋର୍ଦ୍ଧା',
      nameHi: 'जिला मुख्य अस्पताल (DHH), खोर्धा',
      lat: 20.1843,
      lng: 85.6212,
      district: 'khordha',
      type: 'District Headquarters Hospital',
      address: 'Near Collectorate, Khordha - 752055',
      phone: '06755-220444',
      emergencyPhone: '108',
      casualty: '24x7 Casualty & Emergency Ward'
    },

    // --- 2. CUTTACK ---
    {
      id: 'ctc-scb',
      name: 'SCB Medical College & Hospital',
      nameOr: 'ଏସସିବି ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, କଟକ (SCB Cuttack)',
      nameHi: 'एससीबी मेडिकल कॉलेज व अस्पताल, कटक (SCB Cuttack)',
      lat: 20.4727,
      lng: 85.8885,
      district: 'cuttack',
      type: 'Premier Medical College & Super-Specialty',
      address: 'Mangalabag, Cuttack - 753007',
      phone: '0671-2414080',
      emergencyPhone: '108',
      casualty: '24x7 Apex Emergency Casualty & Trauma ICU'
    },
    {
      id: 'ctc-city-dhh',
      name: 'City Hospital (DHH) Cuttack',
      nameOr: 'ସିଟି ହସ୍ପିଟାଲ (DHH), କଟକ',
      nameHi: 'सिटी अस्पताल (DHH), कटक',
      lat: 20.4631,
      lng: 85.8752,
      district: 'cuttack',
      type: 'District Headquarters Hospital',
      address: 'Buxi Bazaar, Cuttack - 753001',
      phone: '0671-2301140',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Ward & OPD'
    },

    // --- 3. KEONJHAR (KENDUJHAR) ---
    {
      id: 'keonjhar-ddmch',
      name: 'Dharanidhar Medical College & Hospital (DDMCH / DHH Keonjhar)',
      nameOr: 'ଧରଣୀଧର ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ (DDMCH), କେନ୍ଦୁଝର',
      nameHi: 'धरणीधर मेडिकल कॉलेज व अस्पताल (DDMCH), केंदुझर',
      lat: 21.6288,
      lng: 85.5817,
      district: 'keonjhar',
      type: 'Govt Medical College & District Hospital',
      address: 'Hospital Road, Keonjhar - 758001',
      phone: '06766-255444',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Trauma Care'
    },
    {
      id: 'keonjhar-sdh-anandapur',
      name: 'Sub-Divisional Hospital (SDH) Anandapur',
      nameOr: 'ଉପଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଆନନ୍ଦପୁର, କେନ୍ଦୁଝର',
      nameHi: 'उपखंड अस्पताल (SDH), आनंदपुर, केंदुझर',
      lat: 21.2223,
      lng: 86.1217,
      district: 'keonjhar',
      type: 'Sub-Divisional Hospital & Emergency',
      address: 'Anandapur, Keonjhar - 758021',
      phone: '06731-220022',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Desk & Delivery Ward'
    },

    // --- 4. BHADRAK ---
    {
      id: 'bhadrak-dhh',
      name: 'District Headquarters Hospital (DHH) Bhadrak',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଭଦ୍ରକ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), भद्रक',
      lat: 21.0583,
      lng: 86.5028,
      district: 'bhadrak',
      type: 'District Headquarters Hospital',
      address: 'Hospital Road, Bhadrak - 756100',
      phone: '06784-251410',
      emergencyPhone: '108',
      casualty: '24x7 Casualty & Dialysis Centre'
    },

    // --- 5. JAJPUR ---
    {
      id: 'jajpur-mch-dhh',
      name: 'Govt Medical College & DHH Jajpur',
      nameOr: 'ଯାଜପୁର ସରକାରୀ ମେଡିକାଲ କଲେଜ ଓ DHH',
      nameHi: 'सरकारी मेडिकल कॉलेज व DHH, जाजपुर',
      lat: 20.8497,
      lng: 86.3353,
      district: 'jajpur',
      type: 'Govt Medical College & District Hospital',
      address: 'Jajpur Town, Odisha - 755001',
      phone: '06728-222040',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Trauma & ICU Desk'
    },
    {
      id: 'jajpur-sdh-vyasanagar',
      name: 'Sub-Divisional Hospital Jajpur Road (Vyasanagar)',
      nameOr: 'ଉପଖଣ୍ଡ ଚିକିତ୍ସାଳୟ, ଯାଜପୁର ରୋଡ୍ (ବ୍ୟାସନଗର)',
      nameHi: 'उपखंड अस्पताल, जाजपुर रोड (व्यासनगर)',
      lat: 20.9463,
      lng: 86.1362,
      district: 'jajpur',
      type: 'Sub-Divisional Hospital & Trauma Centre',
      address: 'Jajpur Road, Vyasanagar - 755019',
      phone: '06726-220130',
      emergencyPhone: '108',
      casualty: '24x7 Industrial Emergency & Trauma Desk'
    },

    // --- 6. BALASORE ---
    {
      id: 'balasore-fmmc',
      name: 'Fakir Mohan Medical College (FMMC) Balasore',
      nameOr: 'ଫକୀର ମୋହନ ମେଡିକାଲ କଲେଜ (FMMC), ବାଲେଶ୍ୱର',
      nameHi: 'फकीर मोहन मेडिकल कॉलेज (FMMC), बालेश्वर',
      lat: 21.5034,
      lng: 86.9157,
      district: 'balasore',
      type: 'Govt Medical College & Hospital',
      address: 'Remuna, Balasore - 756019',
      phone: '06782-224801',
      emergencyPhone: '108',
      casualty: '24x7 Northern Coastal Emergency Centre'
    },

    // --- 7. MAYURBHANJ ---
    {
      id: 'baripada-prm',
      name: 'Pandit Raghunath Murmu MCH & DHH Baripada',
      nameOr: 'ପଣ୍ଡିତ ରଘୁନାଥ ମୁର୍ମୁ ମେଡିକାଲ କଲେଜ, ବାରିପଦା',
      nameHi: 'पंडित रघुनाथ मुर्मू मेडिकल कॉलेज, बारीपदा',
      lat: 21.9347,
      lng: 86.7327,
      district: 'mayurbhanj',
      type: 'Govt Medical College & Hospital',
      address: 'Baripada, Mayurbhanj - 757107',
      phone: '06792-252132',
      emergencyPhone: '108',
      casualty: '24x7 Tribal Emergency & Trauma Ward'
    },
    {
      id: 'mayurbhanj-sdh-rairangpur',
      name: 'Sub-Divisional Hospital (SDH) Rairangpur',
      nameOr: 'ଉପଖଣ୍ଡ ଚିକିତ୍ସାଳୟ, ରାଇରଙ୍ଗପୁର, ମୟୂରଭଞ୍ଜ',
      nameHi: 'उपखंड अस्पताल, राइरंगपुर, मयूरभंज',
      lat: 22.2687,
      lng: 86.1772,
      district: 'mayurbhanj',
      type: 'Sub-Divisional Hospital & Emergency',
      address: 'Rairangpur, Mayurbhanj - 757043',
      phone: '06794-222045',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty Desk'
    },

    // --- 8. GANJAM ---
    {
      id: 'berhampur-mkcg',
      name: 'MKCG Medical College & Hospital',
      nameOr: 'ଏମକେସିଜି ମେଡିକାଲ କଲେଜ, ବ୍ରହ୍ମପୁର (MKCG Berhampur)',
      nameHi: 'एमकेसीजी मेडिकल कॉलेज, ब्रह्मपुर (MKCG Berhampur)',
      lat: 19.3093,
      lng: 84.8091,
      district: 'ganjam',
      type: 'Southern Regional Referral Hospital',
      address: 'Medical Campus, Berhampur, Ganjam - 760004',
      phone: '0680-2292746',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Critical Care'
    },
    {
      id: 'ganjam-city-dhh',
      name: 'City Hospital (DHH), Berhampur',
      nameOr: 'ସିଟି ହସ୍ପିଟାଲ (DHH), ବ୍ରହ୍ମପୁର, ଗଞ୍ଜାମ',
      nameHi: 'सिटी अस्पताल (DHH), ब्रह्मपुर, गंजम',
      lat: 19.3146,
      lng: 84.7933,
      district: 'ganjam',
      type: 'District Headquarters Hospital',
      address: 'Old Bus Stand Road, Berhampur - 760001',
      phone: '0680-2220140',
      emergencyPhone: '108',
      casualty: '24x7 Emergency & Maternity Wing'
    },

    // --- 9. PURI ---
    {
      id: 'puri-dhh',
      name: 'District Headquarters Hospital (DHH) Puri',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ପୁରୀ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), पुरी',
      lat: 19.8135,
      lng: 85.8312,
      district: 'puri',
      type: 'District Headquarters Hospital',
      address: 'Grand Road, Puri - 752001',
      phone: '06752-222068',
      emergencyPhone: '108',
      casualty: '24x7 Coastal Emergency & Dialysis Ward'
    },

    // --- 10. SAMBALPUR ---
    {
      id: 'burla-vimsar',
      name: 'VIMSAR Medical College & Hospital',
      nameOr: 'ଭିମସାର ମେଡିକାଲ କଲେଜ, ବୁର୍ଲା, ସମ୍ବଲପୁର (VIMSAR Burla)',
      nameHi: 'विमसार मेडिकल कॉलेज, बुर्ला, संबलपुर (VIMSAR Burla)',
      lat: 21.4984,
      lng: 83.8741,
      district: 'sambalpur',
      type: 'Western Regional Apex Hospital',
      address: 'Burla, Sambalpur - 768017',
      phone: '0663-2430768',
      emergencyPhone: '108',
      casualty: '24x7 Western Odisha Emergency & Trauma'
    },
    {
      id: 'sambalpur-dhh',
      name: 'District Headquarters Hospital (DHH) Sambalpur',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ସମ୍ବଲପୁର',
      nameHi: 'जिला मुख्य अस्पताल (DHH), संबलपुर',
      lat: 21.4669,
      lng: 83.9756,
      district: 'sambalpur',
      type: 'District Headquarters Hospital',
      address: 'Modipara, Sambalpur - 768001',
      phone: '0663-2400104',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Burn Unit'
    },

    // --- 11. SUNDARGARH / ROURKELA ---
    {
      id: 'rourkela-rgh',
      name: 'Rourkela Govt Hospital (RGH)',
      nameOr: 'ରାଉରକେଲା ସରକାରୀ ହସ୍ପିଟାଲ (RGH), ସୁନ୍ଦରଗଡ଼',
      nameHi: 'राउरकेला सरकारी अस्पताल (RGH), सुंदरगढ़',
      lat: 22.2272,
      lng: 84.8536,
      district: 'sundargarh',
      type: 'District / General Hospital',
      address: 'Panposh Road, Rourkela - 769004',
      phone: '0661-2401314',
      emergencyPhone: '108',
      casualty: '24x7 Industrial Emergency & Trauma Desk'
    },
    {
      id: 'sundargarh-mch-dhh',
      name: 'Govt Medical College & DHH Sundargarh',
      nameOr: 'ସରକାରୀ ମେଡିକାଲ କଲେଜ ଓ DHH, ସୁନ୍ଦରଗଡ଼',
      nameHi: 'सरकारी मेडिकल कॉलेज व DHH, सुंदरगढ़',
      lat: 22.1190,
      lng: 84.0326,
      district: 'sundargarh',
      type: 'Govt Medical College & Hospital',
      address: 'Mission Road, Sundargarh - 770001',
      phone: '06622-272214',
      emergencyPhone: '108',
      casualty: '24x7 District Casualty & ICU'
    },

    // --- 12. BALANGIR ---
    {
      id: 'bolangir-bbmc',
      name: 'Bhima Bhoi Medical College & Hospital (BBMC)',
      nameOr: 'ଭୀମ ଭୋଇ ମେଡିକାଲ କଲେଜ, ବଲାଙ୍ଗୀର (Bolangir)',
      nameHi: 'भीम भोई मेडिकल कॉलेज, बलांगीर (Bolangir)',
      lat: 20.7108,
      lng: 83.4862,
      district: 'balangir',
      type: 'Govt Medical College & Hospital',
      address: 'Gandhinagar, Bolangir - 767001',
      phone: '06652-232333',
      emergencyPhone: '108',
      casualty: '24x7 Casualty & Critical Care'
    },
    {
      id: 'balangir-sdh-titilagarh',
      name: 'Sub-Divisional Hospital (SDH) Titilagarh',
      nameOr: 'ଉପଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଟିଟିଲାଗଡ଼',
      nameHi: 'उपखंड अस्पताल (SDH), टिटिलागढ़',
      lat: 20.2974,
      lng: 83.1517,
      district: 'balangir',
      type: 'Sub-Divisional Hospital & Emergency',
      address: 'Titilagarh, Balangir - 767033',
      phone: '06655-220033',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Desk & Ambulance Hub'
    },

    // --- 13. BARGARH ---
    {
      id: 'bargarh-dhh',
      name: 'District Headquarters Hospital (DHH) Bargarh',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବରଗଡ଼',
      nameHi: 'जिला मुख्य अस्पताल (DHH), बरगढ़',
      lat: 21.3323,
      lng: 83.6214,
      district: 'bargarh',
      type: 'District Headquarters Hospital',
      address: 'Near Old Bus Stand, Bargarh - 768028',
      phone: '06646-231210',
      emergencyPhone: '108',
      casualty: '24x7 District Emergency & Delivery Care'
    },

    // --- 14. JHARSUGUDA ---
    {
      id: 'jharsuguda-dhh',
      name: 'District Headquarters Hospital (DHH) Jharsuguda',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଝାରସୁଗୁଡ଼ା',
      nameHi: 'जिला मुख्य अस्पताल (DHH), झारसुगुड़ा',
      lat: 21.8540,
      lng: 84.0084,
      district: 'jharsuguda',
      type: 'District Headquarters Hospital',
      address: 'Mangalbazar, Jharsuguda - 768201',
      phone: '06645-270110',
      emergencyPhone: '108',
      casualty: '24x7 Trauma & Industrial Emergency Desk'
    },

    // --- 15. DEOGARH ---
    {
      id: 'deogarh-dhh',
      name: 'District Headquarters Hospital (DHH) Deogarh',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଦେବଗଡ଼',
      nameHi: 'जिला मुख्य अस्पताल (DHH), देवगढ़',
      lat: 21.5367,
      lng: 84.7336,
      district: 'deogarh',
      type: 'District Headquarters Hospital',
      address: 'Purunagarh, Deogarh - 768119',
      phone: '06641-226420',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty Desk'
    },

    // --- 16. ANGUL ---
    {
      id: 'angul-dhh',
      name: 'District Headquarters Hospital (DHH) Angul',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଅନୁଗୋଳ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), अनुगुल',
      lat: 20.8398,
      lng: 85.1011,
      district: 'angul',
      type: 'District Headquarters Hospital',
      address: 'Amalapada, Angul - 759122',
      phone: '06764-230301',
      emergencyPhone: '108',
      casualty: '24x7 Industrial Emergency Desk'
    },

    // --- 17. DHENKANAL ---
    {
      id: 'dhenkanal-dhh',
      name: 'District Headquarters Hospital (DHH) Dhenkanal',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଢେଙ୍କାନାଳ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), ढेंकानाल',
      lat: 20.6628,
      lng: 85.5986,
      district: 'dhenkanal',
      type: 'District Headquarters Hospital',
      address: 'Kunjakanta, Dhenkanal - 759001',
      phone: '06762-224410',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty Desk'
    },

    // --- 18. KENDRAPARA ---
    {
      id: 'kendrapara-dhh',
      name: 'District Headquarters Hospital (DHH) Kendrapara',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), କେନ୍ଦ୍ରାପଡ଼ା',
      nameHi: 'जिला मुख्य अस्पताल (DHH), केंद्रापड़ा',
      lat: 20.4996,
      lng: 86.4253,
      district: 'kendrapara',
      type: 'District Headquarters Hospital',
      address: 'Santahi, Kendrapara - 754211',
      phone: '06727-232140',
      emergencyPhone: '108',
      casualty: '24x7 Coastal Emergency & Maternal Care'
    },

    // --- 19. JAGATSINGHPUR ---
    {
      id: 'jagatsinghpur-dhh',
      name: 'District Headquarters Hospital (DHH) Jagatsinghpur',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଜଗତସିଂହପୁର',
      nameHi: 'जिला मुख्य अस्पताल (DHH), जगतसिंहपुर',
      lat: 20.2575,
      lng: 86.1683,
      district: 'jagatsinghpur',
      type: 'District Headquarters Hospital',
      address: 'Near Collectorate, Jagatsinghpur - 754103',
      phone: '06724-220130',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Dialysis'
    },
    {
      id: 'jagatsinghpur-paradip-port',
      name: 'Biju Memorial & Port Hospital, Paradip',
      nameOr: 'ବିଜୁ ମେମୋରିଆଲ ଓ ପୋର୍ଟ ହସ୍ପିଟାଲ, ପାରାଦୀପ',
      nameHi: 'बीजू मेमोरियल व पोर्ट अस्पताल, पारादीप',
      lat: 20.2889,
      lng: 86.6712,
      district: 'jagatsinghpur',
      type: 'Port & Industrial Trauma Hospital',
      address: 'Paradip Port, Jagatsinghpur - 754142',
      phone: '06722-222030',
      emergencyPhone: '108',
      casualty: '24x7 Coastal Trauma & Emergency Desk'
    },

    // --- 20. NAYAGARH ---
    {
      id: 'nayagarh-dhh',
      name: 'District Headquarters Hospital (DHH) Nayagarh',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନୟାଗଡ଼',
      nameHi: 'जिला मुख्य अस्पताल (DHH), नयागढ़',
      lat: 20.1264,
      lng: 85.1065,
      district: 'nayagarh',
      type: 'District Headquarters Hospital',
      address: 'Old Bus Stand Road, Nayagarh - 752069',
      phone: '06753-252110',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Newborn Care'
    },

    // --- 21. BOUDH ---
    {
      id: 'boudh-dhh',
      name: 'District Headquarters Hospital (DHH) Boudh',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବୌଦ୍ଧ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), बौध',
      lat: 20.8407,
      lng: 84.3236,
      district: 'boudh',
      type: 'District Headquarters Hospital',
      address: 'Hospital Road, Boudh - 762014',
      phone: '06841-222230',
      emergencyPhone: '108',
      casualty: '24x7 District Casualty & Emergency'
    },

    // --- 22. SUBARNAPUR (SONEPUR) ---
    {
      id: 'sonepur-dhh',
      name: 'District Headquarters Hospital (DHH) Sonepur',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ସୁବର୍ଣ୍ଣପୁର',
      nameHi: 'जिला मुख्य अस्पताल (DHH), सोनपुर',
      lat: 20.8378,
      lng: 83.9168,
      district: 'sonepur',
      type: 'District Headquarters Hospital',
      address: 'Manmunda Road, Sonepur - 767017',
      phone: '06654-220230',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Desk & Critical Care'
    },

    // --- 23. KANDHAMAL ---
    {
      id: 'kandhamal-dhh',
      name: 'District Headquarters Hospital (DHH) Phulbani',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଫୁଲବାଣୀ, କନ୍ଧମାଳ',
      nameHi: 'जिला मुख्य अस्पताल (DHH), फुलबानी, कंधमाल',
      lat: 20.4776,
      lng: 84.2327,
      district: 'kandhamal',
      type: 'District Headquarters Hospital',
      address: 'Phulbani, Kandhamal - 762001',
      phone: '06842-253210',
      emergencyPhone: '108',
      casualty: '24x7 Tribal Emergency & Trauma Ward'
    },

    // --- 24. KALAHANDI ---
    {
      id: 'kalahandi-dhh',
      name: 'Saheed Rendo Majhi MCH & DHH Bhawanipatna',
      nameOr: 'ସହିଦ ରେନ୍ଦୋ ମାଝୀ ମେଡିକାଲ କଲେଜ ଓ DHH, ଭବାନୀପାଟଣା',
      nameHi: 'शहीद रेंदो माझी मेडिकल कॉलेज व DHH, भवानीपटना',
      lat: 19.9075,
      lng: 83.1659,
      district: 'kalahandi',
      type: 'Govt Medical College & District Hospital',
      address: 'Bhawanipatna, Kalahandi - 766001',
      phone: '06670-230303',
      emergencyPhone: '108',
      casualty: '24x7 District Casualty & Maternal Ward'
    },

    // --- 25. NUAPADA ---
    {
      id: 'nuapada-dhh',
      name: 'District Headquarters Hospital (DHH) Nuapada',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନୂଆପଡ଼ା',
      nameHi: 'जिला मुख्य अस्पताल (DHH), नुआपड़ा',
      lat: 20.8354,
      lng: 82.5292,
      district: 'nuapada',
      type: 'District Headquarters Hospital',
      address: 'Hospital Square, Nuapada - 766105',
      phone: '06678-223120',
      emergencyPhone: '108',
      casualty: '24x7 Border District Emergency & ICU'
    },

    // --- 26. RAYAGADA ---
    {
      id: 'rayagada-dhh',
      name: 'District Headquarters Hospital (DHH) Rayagada',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ରାୟଗଡ଼ା',
      nameHi: 'जिला मुख्य अस्पताल (DHH), रायगड़ा',
      lat: 19.1678,
      lng: 83.4144,
      district: 'rayagada',
      type: 'District Headquarters Hospital',
      address: 'Hospital Road, Rayagada - 765001',
      phone: '06856-222320',
      emergencyPhone: '108',
      casualty: '24x7 Southern Tribal Emergency Ward'
    },
    {
      id: 'rayagada-sdh-gunupur',
      name: 'Sub-Divisional Hospital (SDH) Gunupur',
      nameOr: 'ଉପଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଗୁଣୁପୁର, ରାୟଗଡ଼ା',
      nameHi: 'उपखंड अस्पताल (SDH), गुणुपुर, रायगड़ा',
      lat: 19.0805,
      lng: 83.8118,
      district: 'rayagada',
      type: 'Sub-Divisional Hospital & Emergency',
      address: 'Gunupur, Rayagada - 765022',
      phone: '06857-220130',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Desk & Ambulance Wing'
    },

    // --- 27. KORAPUT ---
    {
      id: 'koraput-sln',
      name: 'SLN Medical College & Hospital, Koraput',
      nameOr: 'ଏସଏଲଏନ ମେଡିକାଲ କଲେଜ, କୋରାପୁଟ (SLN Koraput)',
      nameHi: 'एसएलएन मेडिकल कॉलेज, कोरापुट (SLN Koraput)',
      lat: 18.8166,
      lng: 82.7166,
      district: 'koraput',
      type: 'Govt Medical College & Apex Hospital',
      address: 'Koraput, Odisha - 764020',
      phone: '06852-250100',
      emergencyPhone: '108',
      casualty: '24x7 Southern Tribal Trauma Facility'
    },
    {
      id: 'koraput-sdh-jeypore',
      name: 'Sub-Divisional Hospital (SDH) Jeypore',
      nameOr: 'ଉପଖଣ୍ଡ ଚିକିତ୍ସାଳୟ, ଜୟପୁର, କୋରାପୁଟ',
      nameHi: 'उपखंड अस्पताल, जयपुर, कोरापुट',
      lat: 18.8601,
      lng: 82.5694,
      district: 'koraput',
      type: 'Sub-Divisional Hospital & Trauma Centre',
      address: 'Main Road, Jeypore - 764001',
      phone: '06854-230140',
      emergencyPhone: '108',
      casualty: '24x7 Commercial & Trauma Emergency Wing'
    },

    // --- 28. NABARANGPUR ---
    {
      id: 'nabarangpur-dhh',
      name: 'District Headquarters Hospital (DHH) Nabarangpur',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନବରଙ୍ଗପୁର',
      nameHi: 'जिला मुख्य अस्पताल (DHH), नवरंगपुर',
      lat: 19.2318,
      lng: 82.5516,
      district: 'nabarangpur',
      type: 'District Headquarters Hospital',
      address: 'Mission Road, Nabarangpur - 764059',
      phone: '06858-222140',
      emergencyPhone: '108',
      casualty: '24x7 Tribal Emergency & Delivery Unit'
    },

    // --- 29. MALKANGIRI ---
    {
      id: 'malkangiri-dhh',
      name: 'District Headquarters Hospital (DHH) Malkangiri',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ମାଲକାନଗିରି',
      nameHi: 'जिला मुख्य अस्पताल (DHH), मालकानगिरि',
      lat: 18.3512,
      lng: 81.8974,
      district: 'malkangiri',
      type: 'District Headquarters Hospital',
      address: 'DNK Road, Malkangiri - 764045',
      phone: '06861-230230',
      emergencyPhone: '108',
      casualty: '24x7 Deep Southern Border Emergency Desk'
    },

    // --- 30. GAJAPATI ---
    {
      id: 'gajapati-dhh',
      name: 'District Headquarters Hospital Paralakhemundi',
      nameOr: 'ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ପାରଳାଖେମୁଣ୍ଡି, ଗଜପତି',
      nameHi: 'जिला मुख्य अस्पताल (DHH), पारलाखेमुंडी, गजपति',
      lat: 18.7758,
      lng: 84.0908,
      district: 'gajapati',
      type: 'District Headquarters Hospital',
      address: 'Palace Street, Paralakhemundi - 761200',
      phone: '06815-222340',
      emergencyPhone: '108',
      casualty: '24x7 Border Emergency & Maternity Ward'
    },

    // --- NATIONAL APEX REFERRAL ---
    {
      id: 'delhi-aiims',
      name: 'AIIMS New Delhi (National Apex)',
      nameOr: 'ଏମ୍ସ ନୂଆଦିଲ୍ଲୀ (AIIMS New Delhi)',
      nameHi: 'एम्स नई दिल्ली (AIIMS New Delhi)',
      lat: 28.5672,
      lng: 77.2100,
      district: 'national',
      type: 'National Apex Referral Institute',
      address: 'Ansari Nagar, New Delhi - 110029',
      phone: '011-26588500',
      emergencyPhone: '108',
      casualty: '24x7 Emergency Casualty & Trauma'
    }
  ];

  // GEOGRAPHICAL CENTERS FOR ALL 30 DISTRICTS (Guarantees fallback < 1-5 km)
  const DISTRICT_CENTERS = {
    angul: { lat: 20.8398, lng: 85.1011, name: 'Angul (ଅନୁଗୋଳ)' },
    balangir: { lat: 20.7108, lng: 83.4862, name: 'Balangir (ବଲାଙ୍ଗୀର)' },
    balasore: { lat: 21.5034, lng: 86.9157, name: 'Balasore (ବାଲେଶ୍ୱର)' },
    bargarh: { lat: 21.3323, lng: 83.6214, name: 'Bargarh (ବରଗଡ଼)' },
    bhadrak: { lat: 21.0583, lng: 86.5028, name: 'Bhadrak (ଭଦ୍ରକ)' },
    boudh: { lat: 20.8407, lng: 84.3236, name: 'Boudh (ବୌଦ୍ଧ)' },
    cuttack: { lat: 20.4727, lng: 85.8885, name: 'Cuttack (କଟକ)' },
    deogarh: { lat: 21.5367, lng: 84.7336, name: 'Deogarh (ଦେବଗଡ଼)' },
    dhenkanal: { lat: 20.6628, lng: 85.5986, name: 'Dhenkanal (ଢେଙ୍କାନାଳ)' },
    gajapati: { lat: 18.7758, lng: 84.0908, name: 'Gajapati (ଗଜପତି)' },
    ganjam: { lat: 19.3093, lng: 84.8091, name: 'Ganjam / Berhampur (ଗଞ୍ଜାମ)' },
    jagatsinghpur: { lat: 20.2575, lng: 86.1683, name: 'Jagatsinghpur (ଜଗତସିଂହପୁର)' },
    jajpur: { lat: 20.8497, lng: 86.3353, name: 'Jajpur (ଯାଜପୁର)' },
    jharsuguda: { lat: 21.8540, lng: 84.0084, name: 'Jharsuguda (ଝାରସୁଗୁଡ଼ା)' },
    kalahandi: { lat: 19.9075, lng: 83.1659, name: 'Kalahandi / Bhawanipatna (କଳାହାଣ୍ଡି)' },
    kandhamal: { lat: 20.4776, lng: 84.2327, name: 'Kandhamal / Phulbani (କନ୍ଧମାଳ)' },
    kendrapara: { lat: 20.4996, lng: 86.4253, name: 'Kendrapara (କେନ୍ଦ୍ରାପଡ଼ା)' },
    keonjhar: { lat: 21.6288, lng: 85.5817, name: 'Kendujhar / Keonjhar (କେନ୍ଦୁଝର)' },
    khordha: { lat: 20.2644, lng: 85.8281, name: 'Khordha / Bhubaneswar (ଖୋର୍ଦ୍ଧା)' },
    koraput: { lat: 18.8166, lng: 82.7166, name: 'Koraput / Jeypore (କୋରାପୁଟ)' },
    malkangiri: { lat: 18.3512, lng: 81.8974, name: 'Malkangiri (ମାଲକାନଗିରି)' },
    mayurbhanj: { lat: 21.9347, lng: 86.7327, name: 'Mayurbhanj / Baripada (ମୟୂରଭଞ୍ଜ)' },
    nabarangpur: { lat: 19.2318, lng: 82.5516, name: 'Nabarangpur (ନବରଙ୍ଗପୁର)' },
    nayagarh: { lat: 20.1264, lng: 85.1065, name: 'Nayagarh (ନୟାଗଡ଼)' },
    nuapada: { lat: 20.8354, lng: 82.5292, name: 'Nuapada (ନୂଆପଡ଼ା)' },
    puri: { lat: 19.8135, lng: 85.8312, name: 'Puri (ପୁରୀ)' },
    rayagada: { lat: 19.1678, lng: 83.4144, name: 'Rayagada (ରାୟଗଡ଼ା)' },
    sambalpur: { lat: 21.4984, lng: 83.8741, name: 'Sambalpur / Burla (ସମ୍ବଲପୁର)' },
    sonepur: { lat: 20.8378, lng: 83.9168, name: 'Subarnapur / Sonepur (ସୁବର୍ଣ୍ଣପୁର)' },
    sundargarh: { lat: 22.2272, lng: 84.8536, name: 'Sundargarh / Rourkela (ସୁନ୍ଦରଗଡ଼)' }
  };

  let hospitalMapInstance = null;
  let userLocationCoords = null;
  let routePolyline = null;

  function toRad(deg) { return (deg * Math.PI) / 180; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calcDriveMinutes(km) {
    return Math.max(3, Math.round((km / 32) * 60) + 1);
  }

  function updateHospitalMapLanguage() {
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    const title = $('hospitalMapModalTitle');
    if (title) {
      title.textContent = isHi ? '🏥 आपातकालीन अस्पताल लोकेटर' : (isOr ? '🏥 ଜରୁରୀକାଳୀନ ଡାକ୍ତରଖାନା ଲୋକେଟର୍' : '🏥 Emergency Hospital Locator');
    }
    const heading = $('nearestHospitalsHeading');
    if (heading) {
      heading.textContent = isHi ? 'निकटतम 24x7 सरकारी अस्पताल व सीएचसी' : (isOr ? 'ନିକଟସ୍ଥ ୨୪x୭ ସରକାରୀ ଡାକ୍ତରଖାନା ଓ CHC' : 'Nearest 24x7 Government Hospitals & CHCs');
    }
    const pillLabel = $('emergencyMapPillLabel');
    if (pillLabel) {
      pillLabel.textContent = isHi ? '📍 अस्पताल नक्शा' : (isOr ? '📍 ଡାକ୍ତରଖାନା ମ୍ୟାପ୍' : '📍 Nearest Hospital');
    }
    const refreshBtn = $('refreshGpsBtn');
    if (refreshBtn) {
      refreshBtn.textContent = isHi ? '🔄 जीपीएस रिफ्रेश' : (isOr ? '🔄 GPS ରିଫ୍ରେଶ୍' : '🔄 Refresh GPS');
    }
    const districtSelectLabel = $('districtSelectLabel');
    if (districtSelectLabel) {
      districtSelectLabel.textContent = isHi ? '📍 अपना जिला / क्षेत्र चुनें:' : (isOr ? '📍 ନିଜ ଜିଲ୍ଲା / ଅଞ୍ଚଳ ବାଛନ୍ତୁ:' : '📍 District / Region:');
    }
    const extGmapsLabel = $('externalGmapsLabel');
    if (extGmapsLabel) {
      extGmapsLabel.textContent = isHi
        ? 'Google Maps ऐप पर निकटतम लाइव अस्पताल देखें'
        : (isOr ? 'Google Maps ଆପ୍‌ରେ ନିକଟତମ ଡାକ୍ତରଖାନା ଖୋଜନ୍ତୁ' : 'Open Nearest Live Hospitals on Google Maps App');
    }
    if (userLocationCoords) {
      renderHospitalMapAndCards(userLocationCoords);
    }
  }

  function openHospitalMap() {
    const modal = $('hospitalMapModal');
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      try { modal.showModal(); } catch { modal.setAttribute('open', ''); }
    } else {
      modal.setAttribute('open', '');
    }
    updateHospitalMapLanguage();
    locateUserAndRender();
  }

  function closeHospitalMap() {
    const modal = $('hospitalMapModal');
    if (!modal) return;
    if (typeof modal.close === 'function') {
      try { modal.close(); } catch { modal.removeAttribute('open'); }
    } else {
      modal.removeAttribute('open');
    }
  }

  function locateUserAndRender(forceDistrict) {
    const statusText = $('hospitalGpsStatusText');
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    const districtSelect = $('districtSelect');

    const selectedDistrict = forceDistrict || (districtSelect ? districtSelect.value : 'auto');

    // If user explicitly picked a district from dropdown
    if (selectedDistrict && selectedDistrict !== 'auto' && DISTRICT_CENTERS[selectedDistrict]) {
      const center = DISTRICT_CENTERS[selectedDistrict];
      userLocationCoords = {
        lat: center.lat,
        lng: center.lng,
        isFallback: false,
        district: selectedDistrict,
        districtName: center.name
      };
      if (statusText) {
        statusText.textContent = isHi
          ? `📍 चयनित जिला: ${center.name}`
          : (isOr ? `📍 ଚୟନିତ ଜିଲ୍ଲା: ${center.name}` : `📍 Selected District: ${center.name}`);
      }
      renderHospitalMapAndCards(userLocationCoords);
      return;
    }

    if (statusText) {
      statusText.textContent = isHi ? 'लाइव जीपीएस स्थिति खोजी जा रही है...' : (isOr ? 'ଲାଇଭ୍ GPS ସ୍ଥିତି ଯାଞ୍ଚ ହେଉଛି...' : 'Acquiring live GPS location...');
    }

    const defaultLocation = { lat: 20.2644, lng: 85.8281, isFallback: true };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Stage 1: Fast network-based location (Cell/WiFi, resolves in < 1 second)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocationCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isFallback: false
          };
          if (statusText) {
            statusText.textContent = isHi ? '🟢 लाइव जीपीएस सक्रिय' : (isOr ? '🟢 ଲାଇଭ୍ GPS ସକ୍ରିୟ' : '🟢 Live GPS Active');
          }
          if (districtSelect && districtSelect.value !== 'auto') {
            districtSelect.value = 'auto';
          }
          renderHospitalMapAndCards(userLocationCoords);

          // Stage 2: Asynchronous high-accuracy GPS refinement in background
          navigator.geolocation.getCurrentPosition(
            (refinedPos) => {
              userLocationCoords = {
                lat: refinedPos.coords.latitude,
                lng: refinedPos.coords.longitude,
                isFallback: false
              };
              renderHospitalMapAndCards(userLocationCoords);
            },
            () => { /* Keep stage 1 coords */ },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
          );
        },
        (err) => {
          console.warn('GPS location fallback:', err.message);
          userLocationCoords = defaultLocation;
          if (statusText) {
            statusText.textContent = isHi
              ? '📍 GPS अक्षम: ऊपर दिए गए ड्रॉपडाउन से अपना जिला चुनें'
              : (isOr ? '📍 GPS ଅନୁମତି ମିଳିନାହିଁ: ଉପର ତାଲିକାରୁ ନିଜ ଜିଲ୍ଲା ବାଛନ୍ତୁ' : '📍 GPS Unavailable: Select your District above');
          }
          renderHospitalMapAndCards(userLocationCoords);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      userLocationCoords = defaultLocation;
      if (statusText) {
        statusText.textContent = isHi
          ? '📍 ऊपर ड्रॉपडाउन से अपना जिला चुनें'
          : (isOr ? '📍 ଉପର ତାଲିକାରୁ ନିଜ ଜିଲ୍ଲା ବାଛନ୍ତୁ' : '📍 Select your District from the dropdown above');
      }
      renderHospitalMapAndCards(userLocationCoords);
    }
  }

  function renderHospitalMapAndCards(userPos) {
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';

    const sorted = GOVT_HOSPITALS.map((h) => {
      const dist = haversineKm(userPos.lat, userPos.lng, h.lat, h.lng);
      const eta = calcDriveMinutes(dist);
      return { ...h, dist, eta };
    }).sort((a, b) => a.dist - b.dist);

    const closest = sorted[0];

    // Update Delivery-Style Floating HUD
    const hud = $('liveRouteHud');
    const hudName = $('liveRouteHospitalName');
    const hudEta = $('liveRouteEta');
    const hudBtn = $('liveRouteGmapsBtn');

    if (hud && closest) {
      hud.hidden = false;
      const displayName = isHi ? closest.nameHi : (isOr ? closest.nameOr : closest.name);
      if (hudName) hudName.textContent = displayName;
      if (hudEta) {
        hudEta.textContent = isHi
          ? `🚗 ${closest.dist.toFixed(1)} किमी • ~${closest.eta} मिनट ड्राइव`
          : (isOr ? `🚗 ${closest.dist.toFixed(1)} କିମି • ~${closest.eta} ମିନିଟ୍ ଡ୍ରାଇଭ୍` : `🚗 ${closest.dist.toFixed(1)} km • ~${closest.eta} min drive`);
      }
      if (hudBtn) {
        hudBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${closest.lat},${closest.lng}&travelmode=driving`;
        hudBtn.textContent = isHi ? 'दिशा देखें ↗' : (isOr ? 'ରାସ୍ତା ଦେଖନ୍ତୁ ↗' : 'Navigate ↗');
      }
    }

    // Direct 1-Click Search: Centers Google Maps with live coordinates on hospitals/clinics
    const extGmaps = $('externalGmapsNearMe');
    if (extGmaps) {
      extGmaps.href = `https://www.google.com/maps/search/hospitals+near+me/@${userPos.lat},${userPos.lng},14z`;
    }

    const container = $('hospitalListContainer');
    if (container) {
      container.innerHTML = '';
      sorted.slice(0, 6).forEach((h, idx) => {
        const card = document.createElement('div');
        card.className = 'hospital-card' + (idx === 0 ? ' closest' : '');
        const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
        const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`;
        const phone = h.phone || '108';

        card.innerHTML = `
          <div class="hospital-card-top">
            <div>
              <h4 class="hospital-card-name">${dispName}</h4>
              <div class="hospital-card-sub">${h.address}</div>
            </div>
            <span class="hospital-card-badge">${idx === 0 ? (isHi ? '🏆 सबसे पास' : (isOr ? '🏆 ନିକଟତମ' : '🏆 Closest')) : '🚨 24x7'}</span>
          </div>
          <div class="hospital-card-meta">
            <span class="hospital-meta-dist">
              🚗 ${h.dist.toFixed(1)} km • ~${h.eta} min drive
            </span>
            <span style="color:var(--muted);">&bull;</span>
            <span style="font-size:0.75rem;color:var(--muted);">${h.type}</span>
          </div>
          <div class="hospital-card-actions">
            <a href="${gmapsDirUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav-gmaps">
              🧭 ${isHi ? 'Google Maps पर लाइव रास्ता' : (isOr ? 'Google Maps ରେ ରାସ୍ତା ଦେଖନ୍ତୁ' : 'Start Google Maps Navigation')}
            </a>
            <a href="tel:${phone}" class="btn-call-hospital">
              📞 ${isHi ? 'हेल्पलाइन कॉल' : (isOr ? 'କଲ୍ କରନ୍ତୁ' : 'Call Desk')}
            </a>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // Leaflet map rendering (Delivery-agent style tracking)
    if (typeof window !== 'undefined' && typeof window.L !== 'undefined') {
      const mapContainer = $('hospitalLiveMap');
      if (!mapContainer) return;

      if (hospitalMapInstance) {
        try { hospitalMapInstance.remove(); } catch {}
        hospitalMapInstance = null;
      }

      try {
        hospitalMapInstance = window.L.map('hospitalLiveMap', {
          zoomControl: true,
          attributionControl: false
        }).setView([userPos.lat, userPos.lng], 12);

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(hospitalMapInstance);

        const userRadarIcon = window.L.divIcon({
          className: 'user-radar-pin',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        const userMarker = window.L.marker([userPos.lat, userPos.lng], { icon: userRadarIcon }).addTo(hospitalMapInstance);
        userMarker.bindPopup(isHi ? '📍 आपकी लाइव स्थिति' : (isOr ? '📍 ଆପଣଙ୍କ ଲାଇଭ୍ ସ୍ଥିତି' : '📍 Your Live Location'));

        const bounds = [[userPos.lat, userPos.lng]];
        sorted.slice(0, 6).forEach((h) => {
          const hospIcon = window.L.divIcon({
            className: 'hospital-beacon-pin',
            html: '🏥',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          const m = window.L.marker([h.lat, h.lng], { icon: hospIcon }).addTo(hospitalMapInstance);
          const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
          m.bindPopup(`<strong>${dispName}</strong><br/>🚗 ${h.dist.toFixed(1)} km (~${h.eta} min)<br/><a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}" target="_blank">Navigate ↗</a>`);
          bounds.push([h.lat, h.lng]);
        });

        if (closest) {
          routePolyline = window.L.polyline(
            [[userPos.lat, userPos.lng], [closest.lat, closest.lng]],
            { color: '#0d9488', weight: 4, dashArray: '6, 8', opacity: 0.9 }
          ).addTo(hospitalMapInstance);
        }

        if (bounds.length > 1) {
          hospitalMapInstance.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        }

        setTimeout(() => {
          if (hospitalMapInstance) hospitalMapInstance.invalidateSize();
        }, 300);
      } catch (mapErr) {
        console.warn('Leaflet map render error:', mapErr);
      }
    }
  }

  function initHospitalMapControls() {
    const pillBtn = $('emergencyMapPillBtn');
    if (pillBtn) pillBtn.addEventListener('click', openHospitalMap);

    const closeBtn = $('closeHospitalMapBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeHospitalMap);

    const refreshBtn = $('refreshGpsBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => locateUserAndRender('auto'));

    const districtSelect = $('districtSelect');
    if (districtSelect) {
      districtSelect.addEventListener('change', (e) => {
        locateUserAndRender(e.target.value);
      });
    }

    const modal = $('hospitalMapModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeHospitalMap();
      });
    }
  }

  initHospitalMapControls();

  // ---------- Boot / Init ----------
  sb.auth.onAuthStateChange((_event, session) => route(session));
  sb.auth.getSession().then(({ data }) => route(data && data.session)).catch(() => route(null));
  setMode('signin');
})();
