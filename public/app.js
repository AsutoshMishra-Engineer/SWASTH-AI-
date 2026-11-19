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
      footCombined.innerHTML = '&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; F-204 DEMO PROJECT';
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
      voiceBoxTitle.textContent = isHi ? '🎙️ आवाज़ से बोलें (Voice Message)' : (isOr ? '🎙️ ଭଏସ୍ ମେସେଜ୍ (Voice Message)' : '🎙️ Voice Message');
    }
    if (voiceBoxSub) {
      voiceBoxSub.textContent = isHi ? 'यहाँ टैप करें और बोलकर बताएं' : (isOr ? 'ଏଠାରେ ଟ୍ୟାପ୍ କରି ଓଡ଼ିଆରେ କୁହନ୍ତୁ' : 'Tap to speak your health issue');
    }
    if (photoBoxTitle) {
      photoBoxTitle.textContent = isHi ? '📷 फोटो / गैलरी अपलोड (Upload Photo)' : (isOr ? '📷 ଫଟୋ / ଗ୍ୟାଲେରୀ ଅପ୍‌ଲୋଡ୍ (Upload Photo)' : '📷 Upload Photo / Gallery');
    }
    if (photoBoxSub) {
      photoBoxSub.textContent = isHi ? 'कैमरा या गैलरी से फोटो चुनें' : (isOr ? 'କ୍ୟାମେରା କିମ୍ବା ଗ୍ୟାଲେରୀରୁ ଫଟୋ ବାଛନ୍ତୁ' : 'Camera or choose from gallery');
    }

    const imagePreviewLabel = $('imagePreviewLabel');
    if (imagePreviewLabel) imagePreviewLabel.textContent = isHi ? '📷 फोटो संलग्न है' : (isOr ? '📷 ଫଟୋ ସଂଲଗ୍ନ ହୋଇଛି' : '📷 Clinical Photo Attached');
    const imagePreviewHint = $('imagePreviewHint');
    if (imagePreviewHint) imagePreviewHint.textContent = isHi ? 'लक्षण लिखें या भेजें दबाएं' : (isOr ? 'ଲକ୍ଷଣ ଲେଖନ୍ତୁ ବା ପଠାନ୍ତୁ ଦବାନ୍ତୁ' : 'Type symptoms or tap Send to analyze');

    const pwaBtn = $('pwaInstallBtn');
    if (pwaBtn && !pwaBtn.hidden) {
      pwaBtn.textContent = isHi ? '📲 ऐप इंस्टॉल करें' : (isOr ? '📲 ଆପ୍ ଇନଷ୍ଟଲ୍' : '📲 Install App');
    }

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
      footCombined.innerHTML = isHi
        ? '&copy; 2026 स्वास्थ्य AI &bull; सर्वाधिकार सुरक्षित &bull; सार्वजनिक स्वास्थ्य सहायक &bull; F-204 DEMO PROJECT'
        : (isOr
          ? '&copy; ୨୦୨୬ ସ୍ୱାସ୍ଥ୍ୟ AI &bull; ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ &bull; ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ &bull; F-204 DEMO PROJECT'
          : '&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; F-204 DEMO PROJECT');
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
    return d;
  }

  function scanningIndicator() {
    const d = document.createElement('div');
    d.className = 'bubble bot scanning-bubble';
    d.setAttribute('aria-label', 'Swasth AI is scanning skin photo');

    const box = document.createElement('div');
    box.className = 'scan-laser-box';
    const icon = document.createElement('span');
    icon.textContent = '🔬';
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
      ? 'त्वचा फोटो विश्लेषण जारी है...'
      : (isOr ? 'ଚର୍ମ ଫଟୋ ପରୀକ୍ଷା ଚାଲିଛି...' : 'AI Dermatologist Analyzing...');
    sub.textContent = isHi
      ? 'रिंगवर्म, संक्रमण व सुरक्षित उपाय जाँचे जा रहे हैं'
      : (isOr ? 'ଦାଦ, ସଂକ୍ରମଣ ଓ ଘରୋଇ ଯତ୍ନ ଯାଞ୍ଚ ହେଉଛି' : 'Scanning lesion borders & clinical safety');

    txtGroup.appendChild(title);
    txtGroup.appendChild(sub);
    d.appendChild(box);
    d.appendChild(txtGroup);
    $('messages').appendChild(d);
    d.scrollIntoView({ block: 'end' });
    return d;
  }

  function renderAnswer(data) {
    const isVision = data.kind === 'vision_skin';
    const kind = ['emergency', 'blocked', 'no_answer'].includes(data.kind) ? data.kind : (isVision ? 'vision-skin' : '');
    const d = addBubble('bot ' + kind, data.answer || '');

    if (isVision) {
      const dermaHeader = document.createElement('div');
      dermaHeader.className = 'derma-card-header';
      const dept = data.department || 'derma';
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';

      let icon = '🔬';
      let title = isHi ? '🔬 त्वचा रोग विशेषज्ञ मूल्यांकन (Dermatology Triage)' : (isOr ? '🔬 ଚର୍ମ ରୋଗ ବିଭାଗ ପରୀକ୍ଷା' : '🔬 AI Clinical Dermatology Assessment');
      let subtitle = isHi ? 'केस 608: रिंगवर्म, एलर्जी व स्टेरॉयड सुरक्षा प्रोटोकॉल' : (isOr ? 'କେସ୍ 608: ଦାଦ, ଆଲର୍ଜି ଓ ଷ୍ଟେରଏଡ୍ ସୁରକ୍ଷା ଯାଞ୍ଚ' : 'Case 608: Allergy, Ringworm & Steroid Safety Protocol');

      if (dept === 'eye') {
        icon = '👁️';
        title = isHi ? '👁️ नेत्र चिकित्सा व दृष्टि मूल्यांकन (Ophthalmology Triage)' : (isOr ? '👁️ ନେତ୍ର ଚିକିତ୍ସା ଓ ଦୃଷ୍ଟି ପରୀକ୍ଷା (Ophthalmology Triage)' : '👁️ Clinical Ophthalmology & Eye Assessment');
        subtitle = isHi ? 'कंजक्टिवाइटिस, लाल आँख व आपातकालीन जांच' : (isOr ? 'କଞ୍ଜକ୍ଟିଭାଇଟିସ୍, ଲାଲ୍ ଆଖି ଓ ଜରୁରୀ ପରାମର୍ଶ' : 'Conjunctivitis, Stye & Red Eye Triage Protocol');
      } else if (dept === 'oral') {
        icon = '👄';
        title = isHi ? '👄 मुख स्वास्थ्य व कैंसर पूर्व जांच (Oral Health Triage)' : (isOr ? '👄 ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ ଓ କର୍କଟ ପୂର୍ବ ଯାଞ୍ଚ (Oral Health Triage)' : '👄 Oral Health & Pre-Cancer Screening');
        subtitle = isHi ? 'मुँह के छाले, तंबाकू व ल्यूकोप्लाकिया सुरक्षा जांच' : (isOr ? 'ତମାଖୁ, ଗୁଟ୍‌ଖା, ପାନ ଓ ଘା\' ଯାଞ୍ଚ ପ୍ରୋଟୋକଲ୍' : 'Aphthous Ulcer & Tobacco Leukoplakia Triage');
      } else if (dept === 'pediatric') {
        icon = '👶';
        title = isHi ? '👶 शिशु स्वास्थ्य व नवजात मूल्यांकन (Pediatric Triage)' : (isOr ? '👶 ଶିଶୁ ଯତ୍ନ ଓ ନବଜାତ ପରୀକ୍ଷା (Pediatric Triage)' : '👶 Pediatric & Newborn Care Triage');
        subtitle = isHi ? 'नवजात पीलिया (Jaundice), डायपर रैश व निर्जलीकरण जांच' : (isOr ? 'କାମଳ (Jaundice), ଡାଏପର ରାସ୍ ଓ ଶିଶୁ ସୁରକ୍ଷା' : 'Neonatal Jaundice & Dehydration Triage');
      } else if (dept === 'wound') {
        icon = '🩹';
        title = isHi ? '🩹 घाव, जलन व काटने की प्राथमिक चिकित्सा (Wound & Burn Triage)' : (isOr ? '🩹 ଘା\', ପୋଡ଼ାଜଳା ଓ କାମୁଡ଼ା ପ୍ରାଥମିକ ଚିକିତ୍ସା (Wound & Burn Triage)' : '🩹 Wound, Burn & Bite Emergency Triage');
        subtitle = isHi ? 'कुत्ता काटने पर 15 मिनट पानी से धोने व रेबीज सुरक्षा प्रोटोकॉल' : (isOr ? 'କୁକୁର କାମୁଡ଼ା ରେବିସ୍ ସୁରକ୍ଷା ଓ ଘା\' ପରିଷ୍କାର ପ୍ରୋଟୋକଲ୍' : 'Burn Depth & 15-Minute Rabies Wash Protocol');
      } else if (dept === 'nail') {
        icon = '💅';
        title = isHi ? '💅 नाखून व एनीमिया जांच (Nail & Anemia Screening)' : (isOr ? '💅 ନଖ ଓ ରକ୍ତହୀନତା ପରୀକ୍ଷା (Nail & Anemia Screening)' : '💅 Nail & Anemia Visual Assessment');
        subtitle = isHi ? 'रक्तहीनता (Pallor), ऑक्सीजन स्तर व पोषण जांच' : (isOr ? 'ରକ୍ତହୀନତା (Pallor), ଅକ୍ସିଜେନ୍ ଓ ପୋଷଣ ଯାଞ୍ଚ' : 'Koilonychia Pallor & Nutritional Triage');
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
      ? '📷 त्वचा की जांच के लिए फोटो भेजी गई'
      : (currentLang === 'or' ? '📷 ଚର୍ମ ପରୀକ୍ଷା ପାଇଁ ଫଟୋ ପଠାଗଲା' : '📷 Skin photo sent for assessment'));
    const userBubble = addBubble('user', userBubbleText);
    if (activeImage && activeImage.previewUrl) {
      const card = document.createElement('div');
      card.className = 'user-sent-image-card';
      const imgEl = document.createElement('img');
      imgEl.src = activeImage.previewUrl;
      imgEl.className = 'user-sent-image';
      imgEl.alt = 'Uploaded skin photo';
      const badge = document.createElement('span');
      badge.className = 'user-image-badge';
      badge.textContent = currentLang === 'hi'
        ? '📷 त्वचा फोटो'
        : (currentLang === 'or' ? '📷 ଚର୍ମ ଫଟୋ' : '📷 Skin Photo');
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
      voiceBoxTitle.textContent = isHi ? '🎙️ आवाज़ से बोलें (Voice Message)' : (isOr ? '🎙️ ଭଏସ୍ ମେସେଜ୍ (Voice Message)' : '🎙️ Voice Message');
    }
    if (voiceBoxSub) {
      voiceBoxSub.textContent = isHi ? 'यहाँ टैप करें और बोलकर बताएं' : (isOr ? 'ଏଠାରେ ଟ୍ୟାପ୍ କରି ଓଡ଼ିଆରେ କୁହନ୍ତୁ' : 'Tap to speak your health issue');
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

  // ---------- Boot / Init ----------
  sb.auth.onAuthStateChange((_event, session) => route(session));
  sb.auth.getSession().then(({ data }) => route(data && data.session)).catch(() => route(null));
  setMode('signin');
})();
