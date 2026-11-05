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
  let viewingLanding = false;

  function showLandingPage() {
    viewingLanding = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('chat-active');
      document.body.classList.remove('chat-has-results');
    }
    if ($('authView')) $('authView').hidden = false;
    if ($('chatView')) $('chatView').hidden = true;
    const ok = isVerified(currentSession);
    if ($('navChatBtn')) $('navChatBtn').hidden = !ok;
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
      viewingLanding = false;
      if ($('navChatBtn')) $('navChatBtn').hidden = true;
      if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = true;
      if ($('loggedInCardContent')) $('loggedInCardContent').hidden = true;
      if ($('loggedOutAuthContent')) $('loggedOutAuthContent').hidden = false;
      if ($('authView')) $('authView').hidden = false;
      if ($('chatView')) $('chatView').hidden = true;
      clearChat();
    }
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
    if (kind.startsWith('bot') && (text.includes('📘') || text.includes('🏠') || text.includes('⚠️') || text.includes('🏥') || text.includes('**'))) {
      const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let formatted = escape(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^[ \t]*(📘\s*(?:ସମ୍ଭାବ୍ୟ କାରଣ|Possible Condition):?)/gim, '<strong>$1</strong>')
        .replace(/^[ \t]*(🏠\s*(?:ଘରୋଇ ଉପଚାର ଓ ଯତ୍ନ|Safe Home Care (?:&amp;|&|and) Relief):?)/gim, '<strong>$1</strong>')
        .replace(/^[ \t]*(⚠️\s*(?:ବିପଦର ଲକ୍ଷଣ|Warning Signs to Watch):?)/gim, '<strong>$1</strong>')
        .replace(/^[ \t]*(🏥\s*(?:ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ|When to See a Doctor):?)/gim, '<strong>$1</strong>');
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
    const list = currentLang === 'or' ? EXAMPLES_OR : EXAMPLES_EN;
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
    if ($('langEnBtn')) {
      $('langEnBtn').classList.toggle('active', !isOr);
      $('langEnBtn').setAttribute('aria-pressed', String(!isOr));
    }
    if ($('langOrBtn')) {
      $('langOrBtn').classList.toggle('active', isOr);
      $('langOrBtn').setAttribute('aria-pressed', String(isOr));
    }

    // Composer & Voice Area visibility
    const chatForm = $('chatForm');
    const odiaVoiceArea = $('odiaVoiceArea');
    const composerFoot = document.querySelector('.composer-foot');

    if (chatForm) chatForm.style.display = '';
    if (composerFoot) composerFoot.style.display = '';
    if (odiaVoiceArea) odiaVoiceArea.hidden = !isOr;

    const odiaVoiceMainText = $('odiaVoiceMainText');
    if (odiaVoiceMainText) odiaVoiceMainText.textContent = '🎙️ ଆପଣଙ୍କ ସମସ୍ୟା କୁହନ୍ତୁ';
    const odiaVoiceSubText = $('odiaVoiceSubText');
    if (odiaVoiceSubText) odiaVoiceSubText.textContent = 'ଏଠାରେ ଟ୍ୟାପ୍ କରି ଓଡ଼ିଆରେ କୁହନ୍ତୁ';
    const odiaVoiceHint = $('odiaVoiceHint');
    if (odiaVoiceHint) odiaVoiceHint.textContent = 'କହି ସାରିବା ପରେ ପୁଣି ଟ୍ୟାପ୍ କରନ୍ତୁ ବା ଅଟକିଗଲେ ଆପେ ଆପେ ପରାମର୍ଶ ମିଳିବ';

    const sendBtnSpan = $('sendBtn')?.querySelector('span');
    if (sendBtnSpan) sendBtnSpan.textContent = isOr ? 'ପଠାନ୍ତୁ' : 'Send';
    const micBadge = document.querySelector('.mic-odia-badge');
    if (micBadge) micBadge.textContent = isOr ? 'ମାଇକ୍' : 'Mic';

    // Refresh chips to current language
    renderChips();

    // Landing Page / Auth View complete separation
    if ($('authTitle')) {
      $('authTitle').textContent = isOr ? 'ତୁରନ୍ତ ଏବଂ ବିଶ୍ୱସନୀୟ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ' : 'Instant, Trusted Health Answers';
    }
    const heroDesc = document.querySelector('.hero > p');
    if (heroDesc) {
      heroDesc.textContent = isOr
        ? 'ସାଧାରଣ ରୋଗ ଲକ୍ଷଣ, ରୋଗ ପ୍ରତିରୋଧ, ଶିଶୁ ଟିକାଦାନ, ଗର୍ଭବତୀ ଯତ୍ନ ଓ ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା ବିଷୟରେ ପଚାରନ୍ତୁ । ସରକାରୀ ସ୍ୱାସ୍ଥ୍ୟ ବିଭାଗ ଓ WHO ର ନିର୍ଭୁଲ ତଥ୍ୟ ।'
        : 'Ask about everyday symptoms, disease prevention, child vaccines, pregnancy care, and emergency first aid. Clear facts from official public health authorities.';
    }
    const heroPill = document.querySelector('.hero-pill');
    if (heroPill) {
      heroPill.textContent = isOr ? 'ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ଓ ପ୍ରତିରୋଧ' : 'Verified Health Guidance & Prevention';
    }
    const heroChatBtn = $('heroChatBtn');
    if (heroChatBtn) {
      heroChatBtn.textContent = isOr ? '💬 ସ୍ୱାସ୍ଥ୍ୟ ଚାଟ୍ ଆରମ୍ଭ କରନ୍ତୁ →' : '💬 Open Health Chat Assistant →';
    }
    const cardChatBtn = $('cardChatBtn');
    if (cardChatBtn) {
      cardChatBtn.textContent = isOr ? '💬 ସ୍ୱାସ୍ଥ୍ୟ ଚାଟ୍ ଖୋଲନ୍ତୁ →' : '💬 Open Health Chat →';
    }
    const navChatBtn = $('navChatBtn');
    if (navChatBtn) {
      navChatBtn.textContent = isOr ? '💬 ପରାମର୍ଶ' : '💬 Chat';
    }
    if ($('tabSignIn')) $('tabSignIn').textContent = isOr ? 'ଲଗ୍ ଇନ୍' : 'Sign In';
    if ($('tabSignUp')) $('tabSignUp').textContent = isOr ? 'ନୂଆ ଆକାଉଣ୍ଟ' : 'Create Account';
    if ($('authSubmit')) {
      const isUp = $('tabSignUp')?.classList.contains('active');
      $('authSubmit').textContent = isOr ? (isUp ? 'ଆକାଉଣ୍ଟ ଖୋଲନ୍ତୁ' : 'ଲଗ୍ ଇନ୍ କରନ୍ତୁ') : (isUp ? 'Create account' : 'Sign in');
    }
    const emailLabel = document.querySelector('label[for="email"]');
    if (emailLabel) emailLabel.textContent = isOr ? 'ଇମେଲ୍ ଠିକଣା' : 'Email Address';
    const pwLabel = document.querySelector('label[for="password"]');
    if (pwLabel) pwLabel.textContent = isOr ? 'ପାସୱାର୍ଡ' : 'Password';
    const pwHint = $('pwHint');
    if (pwHint) pwHint.textContent = isOr ? '(ଅତିକମରେ ୮ ଅକ୍ଷର)' : '(at least 8 characters)';

    // Feature items on landing page
    const featItems = document.querySelectorAll('.features-grid .feat-item');
    if (featItems.length >= 4) {
      const f1 = featItems[0].querySelector('div');
      if (f1) f1.innerHTML = isOr
        ? '<strong>ଓଡ଼ିଆ ଭଏସ୍ ପରାମର୍ଶ</strong><small>ନିଜ ଲକ୍ଷଣ ସିଧାସଳଖ ଓଡ଼ିଆରେ କହି ତୁରନ୍ତ ଘରୋଇ ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ପାଆନ୍ତୁ ।</small>'
        : '<strong>Odia Voice Consultation</strong><small>Speak your symptoms directly in Odia to receive instant regional care guidance.</small>';

      const f2 = featItems[1].querySelector('div');
      if (f2) f2.innerHTML = isOr
        ? '<strong>ଡାକ୍ତର କେବେ ଦେଖାଇବେ</strong><small>ଘରୋଇ ଯତ୍ନ ବନାମ ବିପଦ ଲକ୍ଷଣ ଜାଣନ୍ତୁ ଯାହା ପାଇଁ ଡାକ୍ତରଖାନା ଯିବା ଆବଶ୍ୟକ ।</small>'
        : '<strong>When to See a Doctor</strong><small>Learn mild home care vs. danger signs that need hospital visits.</small>';

      const f3 = featItems[2].querySelector('div');
      if (f3) f3.innerHTML = isOr
        ? '<strong>ଯାଞ୍ଚ ହୋଇଥିବା ଡାକ୍ତରୀ ତଥ୍ୟ</strong><small>WHO ଏବଂ ଭାରତ ସରକାରଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଉପରେ ଆଧାରିତ ।</small>'
        : '<strong>Verified Medical Sources</strong><small>Guidance backed by official WHO and Ministry of Health data.</small>';

      const f4 = featItems[3].querySelector('div');
      if (f4) f4.innerHTML = isOr
        ? '<strong>ସମ୍ପୂର୍ଣ୍ଣ ଗୋପନୀୟ ଓ ସୁରକ୍ଷିତ</strong><small>ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ କେବେହେଲେ ଆପଣଙ୍କ ନାମ ସହିତ ସଂରକ୍ଷିତ ହୁଏନାହିଁ ।</small>'
        : '<strong>Confidential & Private</strong><small>Your health questions are never saved with your name.</small>';
    }

    // Update static UI strings in DOM for Consultation / Chat view
    const emergencySpan = $('emergencyText');
    if (emergencySpan) {
      emergencySpan.innerHTML = isOr
        ? '<strong>ଡାକ୍ତରୀ ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି?</strong> ପ୍ରବଳ ଛାତି ଯନ୍ତ୍ରଣା, ନିଶ୍ୱାସ କଷ୍ଟ କିମ୍ବା ରକ୍ତସ୍ରାବ ହେଉଛି? ତୁରନ୍ତ <a href="tel:108">108</a> (ଆମ୍ବୁଲାନ୍ସ) କିମ୍ବା <a href="tel:112">112</a> କୁ କଲ୍ କରନ୍ତୁ ।'
        : '<strong>Medical Emergency?</strong> Severe chest pain, trouble breathing, or heavy bleeding? Call <a href="tel:108">108</a> (Ambulance) or <a href="tel:112">112</a> immediately.';
    }

    const questionInput = $('question');
    if (questionInput) {
      questionInput.placeholder = isOr
        ? 'ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ବା ଲକ୍ଷଣ ଲେଖନ୍ତୁ...'
        : 'Express your symptoms or health problem...';
    }

    const brandBadge = document.querySelector('.brand-badge');
    if (brandBadge) {
      brandBadge.textContent = isOr ? 'ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ' : 'Public Health Assistant';
    }

    const guidanceText = document.querySelector('.guidance-btn-text');
    if (guidanceText) {
      guidanceText.textContent = isOr ? 'ଜରୁରୀ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା' : 'Important Medical Notice';
    }

    // Guidance Modal Content in Odia vs English
    if ($('modalTitle')) $('modalTitle').textContent = isOr ? 'ଜରୁରୀ ସ୍ୱାସ୍ଥ୍ୟ ଓ ଡାକ୍ତରୀ ସୂଚନା' : 'Important Health & Doctor Notice';
    if ($('modalNoticeCard')) {
      $('modalNoticeCard').innerHTML = isOr
        ? '<strong>⚠️ ସ୍ୱାସ୍ଥ୍ୟ AI କେବଳ ଏକ ସୂଚନାକାରୀ ସହାୟକ, କୌଣସି ଡାକ୍ତର ନୁହେଁ</strong><p>ଏହି ସେବା କେବଳ ସଚେତନତା ଓ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ପାଇଁ ଉଦ୍ଦିଷ୍ଟ । ଏହା ଡାକ୍ତରୀ ଶାରୀରିକ ପରୀକ୍ଷା, ରକ୍ତ ପରୀକ୍ଷା କିମ୍ବା ଔଷଧ ପ୍ରେସକ୍ରିପସନର ବିକଳ୍ପ ନୁହେଁ ।</p>'
        : '<strong>⚠️ Swasth AI is an Informational Guide, Not a Doctor</strong><p>This service provides educational public health advice and symptom awareness. It cannot replace a clinical physical examination, diagnostic blood tests, or prescribed medication from a licensed medical professional.</p>';
    }
    if ($('modalStep1Title')) $('modalStep1Title').textContent = isOr ? 'ଲକ୍ଷଣଗୁଡ଼ିକ ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ' : 'Ask Symptoms Clearly';
    if ($('modalStep1P')) $('modalStep1P').textContent = isOr ? 'ଆପଣ ବା ପରିବାର ଲୋକଙ୍କର କେଉଁ ସମସ୍ୟା ହେଉଛି (ଯଥା: ଜ୍ୱର କେତେ ଦିନରୁ, ମୁଣ୍ଡ ବିନ୍ଧା, ବାନ୍ତି, କାଶ ବା କୁକୁର କାମୁଡ଼ା) ତାହା ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ ।' : 'Describe clearly what you or a family member are experiencing (e.g. fever duration, headache, vomiting, rash, or animal bite) for accurate health guidance.';
    if ($('modalStep2Title')) $('modalStep2Title').textContent = isOr ? 'ତୁରନ୍ତ ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ନିଅନ୍ତୁ ଯଦି:' : 'Immediately Consult a Doctor If:';
    if ($('modalStep2P')) $('modalStep2P').textContent = isOr ? 'ରୋଗ ବଢ଼ିଯାଏ, ଜ୍ୱର ୩ ଦିନରୁ ଅଧିକ ରହେ, ବାରମ୍ବାର ବାନ୍ତି ହୁଏ ବା ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହୁଏ, ତେବେ ବିଳମ୍ବ ନକରି ନିକଟସ୍ଥ CHC ଡାକ୍ତରଖାନା ଯାଆନ୍ତୁ ।' : 'Symptoms worsen, fever exceeds 3 days, there is persistent vomiting, intense pain, breathing difficulty, or confusion. Visit your nearest Community Health Centre (CHC) or Medical Officer immediately.';
    if ($('modalStep3Title')) $('modalStep3Title').textContent = isOr ? 'ନିଜ ମନମୁତାବକ ଔଷଧ ଖାଆନ୍ତୁ ବା ବନ୍ଦ କରନ୍ତୁ ନାହିଁ' : 'Never Self-Medicate or Skip Treatment';
    if ($('modalStep3P')) $('modalStep3P').textContent = isOr ? 'ଡାକ୍ତରଙ୍କ ବିନା ପରାମର୍ଶରେ ଆଣ୍ଟିବାୟୋଟିକ୍, ପ୍ରେସର ବା ଡାଇବେଟିସ୍ ଔଷଧ କେବେହେଲେ ବନ୍ଦ କରନ୍ତୁ ନାହିଁ ।' : 'Do not start, stop, or change prescribed antibiotics, insulin, or blood pressure medicines on your own. Always consult a qualified doctor or pharmacist.';
    if ($('modalStep4Title')) $('modalStep4Title').textContent = isOr ? '୨୪/୭ ମାଗଣା ଜରୁରୀକାଳୀନ ହେଲ୍ପଲାଇନ୍ ନମ୍ବର' : '24/7 National Emergency Helplines';
    if ($('modalStep4P')) $('modalStep4P').innerHTML = isOr ? '• ଆମ୍ବୁଲାନ୍ସ: <strong>୧୦୮</strong><br>• ଜାତୀୟ ଜରୁରୀ ସେବା: <strong>୧୧୨</strong><br>• ମାନସିକ ସ୍ୱାସ୍ଥ୍ୟ ସହାୟତା (Tele-MANAS): <strong>୧୪୪୧୬</strong> (Toll-Free)' : '• Medical Ambulance: <strong>108</strong><br>• National Emergency: <strong>112</strong><br>• Tele-MANAS Mental Health Support: <strong>14416</strong> (Toll-Free)';

    // User bar buttons
    if ($('signOut')) $('signOut').textContent = isOr ? 'ଲଗ୍ ଆଉଟ୍' : 'Sign out';
    if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').textContent = isOr ? '🗑️ ଡିଲିଟ୍' : '🗑️ Delete';

    // Delete account modal
    if ($('deleteModalTitle')) $('deleteModalTitle').textContent = isOr ? '⚠️ ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ଡିଲିଟ୍ କରିବେ କି?' : '⚠️ Delete Your Account?';
    if ($('cancelDeleteBtn')) $('cancelDeleteBtn').textContent = isOr ? 'ବାତିଲ୍' : 'Cancel';
    if ($('confirmDeleteBtn')) $('confirmDeleteBtn').textContent = isOr ? 'ହଁ, ସ୍ଥାୟୀ ଭାବେ ଡିଲିଟ୍ କରନ୍ତୁ' : 'Yes, Permanently Delete';

    const statusText = document.querySelector('.status-indicator span:last-child') || $('chatStatusText');
    if (statusText) {
      statusText.textContent = isOr
        ? 'ଯାଞ୍ଚ ହୋଇଥିବା ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ସକ୍ରିୟ • ଜରୁରୀକାଳୀନ ୧୦୮ ପ୍ରୋଟୋକଲ'
        : 'Verified Health Guidance Active • Emergency Referral Protocol';
    }

    // Update initial welcome bubble if it is the only bubble in chat
    const bubbles = document.querySelectorAll('.bubble');
    if (bubbles.length === 1 && bubbles[0].classList.contains('bot')) {
      bubbles[0].textContent = isOr
        ? 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟ AI, ଓଡ଼ିଶାର ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ । ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା କହିବା ପାଇଁ ତଳେ ଥିବା ବଡ଼ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ମୁଁ କେବଳ WHO ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଅନୁଯାୟୀ ଘରୋଇ ଉପଚାର ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ଦେବି ।'
        : 'Namaskar! I am Swasth AI, your public health assistant for Odisha. Describe your symptoms or ask a health question. I answer only using verified WHO and Ministry of Health sources.';
    }

    const footDisclaimer = $('footDisclaimer');
    if (footDisclaimer) {
      footDisclaimer.innerHTML = isOr
        ? 'ସ୍ୱାସ୍ଥ୍ୟ AI କେବଳ ସୂଚନାକାରୀ ପରାମର୍ଶ ଦେଇଥାଏ । ଏହା କୌଣସି ଔଷଧର ପ୍ରେସକ୍ରିପସନ୍ ଦିଏନାହିଁ । ଜରୁରୀ ପରିସ୍ଥିତିରେ <strong>108</strong> କିମ୍ବା <strong>112</strong> କୁ କଲ୍ କରନ୍ତୁ ।'
        : 'Swasth AI provides public health guidance from verified WHO & Ministry of Health sources. It is <strong>not</strong> a medical doctor and cannot issue prescriptions. In an emergency, call <strong>108</strong> or <strong>112</strong>.';
    }

    const footCombined = $('footCopyrightCombined') || $('footCopyrightSmall') || $('footCopyrightMain');
    if (footCombined) {
      footCombined.innerHTML = isOr
        ? '&copy; ୨୦୨୬ ସ୍ୱାସ୍ଥ୍ୟ AI &bull; ସମସ୍ତ ଅଧିକାର ସଂରକ୍ଷିତ &bull; ଓଡ଼ିଶା ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ &bull; F-204 DEMO PROJECT'
        : '&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; F-204 DEMO PROJECT';
    }
  }

  function startChat() {
    if (started) return;
    started = true;
    const isOr = currentLang === 'or';
    const welcome = isOr
      ? 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟ AI, ଓଡ଼ିଶାର ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ । ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା କହିବା ପାଇଁ ତଳେ ଥିବା ବଡ଼ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ମୁଁ କେବଳ WHO ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଅନୁଯାୟୀ ଘରୋଇ ଉପଚାର ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ଦେବି ।'
      : 'Namaskar! I am Swasth AI, your public health assistant for Odisha. Describe your symptoms or ask a health question. I answer only using verified WHO and Ministry of Health sources.';
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
      if (label) label.textContent = currentLang === 'or' ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen';
      activeSpeakBtn = null;
    }
    if (typeof window !== 'undefined') window._activeSpeechUtterance = null;
  }

  function findOdiaVoice(voices) {
    if (!Array.isArray(voices)) return null;
    return voices.find((v) => {
      const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
      const name = (v.name || '').toLowerCase();
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

  function fallbackBrowserSpeech(clean, btn, isOdia) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      stopSpeaking();
      return;
    }
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      const nativeOdiaVoice = findOdiaVoice(voices);
      const englishVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));

      if (isOdia) {
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
      } else {
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
        label.textContent = isOdia ? '⚠️ ଅଡିଓ ସଂଯୋଗ ହେଉନାହିଁ' : '⚠️ Audio not available';
        setTimeout(() => { if (label) label.textContent = isOdia ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen'; }, 3000);
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

  async function fetchServerAudio(clean) {
    if (!clean) return null;
    if (audioCache.has(clean)) return audioCache.get(clean);

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
            body: JSON.stringify({ text: clean })
          });
          if (res.ok) {
            const out = await res.json();
            if (out.audio) {
              const arrayBuffer = base64ToArrayBuffer(out.audio);
              const blob = new Blob([arrayBuffer], { type: out.mimeType || 'audio/wav' });
              const blobUrl = URL.createObjectURL(blob);
              const cached = { blobUrl, arrayBuffer, mimeType: out.mimeType || 'audio/wav' };
              audioCache.set(clean, cached);
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
    const isOdia = /[\u0B00-\u0B7F]/.test(rawText);
    if (!isOdia) return;

    const clean = String(rawText || '')
      .replace(/[📘🏠⚠️🏥🚨✨💡🗑️🦟🐕💧🤰☀️]/g, '')
      .replace(/[*_#`~]/g, '')
      .replace(/^[ \t]*[-•]\s*/gm, '')
      .slice(0, 420)
      .trim();

    if (!clean || audioCache.has(clean)) return;
    try {
      await fetchServerAudio(clean);
    } catch {}
  }

  async function playWithWebAudio(arrayBuffer, btn, isOdia) {
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
      if (label) label.textContent = isOdia ? '⏹️ ବନ୍ଦ କରନ୍ତୁ' : '⏹️ Stop';

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

    const clean = String(rawText || '')
      .replace(/[📘🏠⚠️🏥🚨✨💡🗑️🦟🐕💧🤰☀️]/g, '')
      .replace(/[*_#`~]/g, '')
      .replace(/^[ \t]*[-•]\s*/gm, '')
      .slice(0, 420)
      .trim();

    if (!clean) return;

    btn.classList.add('speaking');
    const label = btn.querySelector('.speak-label');
    const isOdia = /[\u0B00-\u0B7F]/.test(clean);
    activeSpeakBtn = btn;
    if (label) label.textContent = isOdia ? '⏳ ଅଡିଓ ପ୍ରସ୍ତୁତ...' : '⏳ Loading...';

    try {
      const audioData = await fetchServerAudio(clean);
      if (audioData) {
        let played = false;
        try {
          const audio = new Audio(audioData.blobUrl);
          activeAudio = audio;
          if (label) label.textContent = isOdia ? '⏹️ ବନ୍ଦ କରନ୍ତୁ' : '⏹️ Stop';

          audio.onended = () => stopSpeaking();
          audio.onerror = async () => {
            console.warn('HTML5 audio error, falling back to WebAudio decoder');
            played = await playWithWebAudio(audioData.arrayBuffer, btn, isOdia);
            if (!played) fallbackBrowserSpeech(clean, btn, isOdia);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            played = true;
          }
        } catch (playErr) {
          console.warn('HTML5 play rejected (e.g. autoplay policy), falling back to WebAudio:', playErr);
          played = await playWithWebAudio(audioData.arrayBuffer, btn, isOdia);
        }
        if (played) return;
      }

      // If server audio failed after retries, try browser SpeechSynthesis fallback
      fallbackBrowserSpeech(clean, btn, isOdia);
    } catch (e) {
      console.warn('Speech playback unexpected error:', e);
      stopSpeaking();
      fallbackBrowserSpeech(clean, btn, isOdia);
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

  function renderAnswer(data) {
    const kind = ['emergency', 'blocked', 'no_answer'].includes(data.kind) ? data.kind : '';
    const d = addBubble('bot ' + kind, data.answer || '');

    // Preload audio in background for instant 0ms playback when user clicks Listen
    if (data.answer) preloadAudioForAnswer(data.answer);

    // Voice Output Audio Speaker Button (Step 3: Listen aloud in Odia / English)
    if (data.answer && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const speakBar = document.createElement('div');
      speakBar.className = 'speak-bar';
      const speakBtn = document.createElement('button');
      speakBtn.type = 'button';
      speakBtn.className = 'speak-btn';
      const isOr = currentLang === 'or';
      speakBtn.title = isOr ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen';
      speakBtn.setAttribute('aria-label', isOr ? 'ଶୁଣନ୍ତୁ' : 'Listen');

      const spkLabel = document.createElement('span');
      spkLabel.className = 'speak-label';
      spkLabel.textContent = isOr ? '🔊 ଶୁଣନ୍ତୁ' : '🔊 Listen';
      speakBtn.appendChild(spkLabel);

      speakBtn.addEventListener('click', () => speakText(data.answer, speakBtn));
      speakBar.appendChild(speakBtn);
      d.appendChild(speakBar);
    }

    if (Array.isArray(data.sources) && data.sources.length) {
      const s = document.createElement('div');
      s.className = 'sources';
      s.appendChild(document.createTextNode(currentLang === 'or' ? 'ଯାଞ୍ଚ ହୋଇଥିବା ଉତ୍ସ: ' : 'Verified Source: '));
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
    const discText = currentLang === 'or'
      ? (data.disclaimer && /[\u0B00-\u0B7F]/.test(data.disclaimer) ? data.disclaimer : 'ଏହା ଏକ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା, କୌଣସି ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନ୍ ନୁହେଁ । ଯେକୌଣସି ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା ପାଇଁ ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ଯାଆନ୍ତୁ ।')
      : (data.disclaimer && !/[\u0B00-\u0B7F]/.test(data.disclaimer) ? data.disclaimer : 'This is general health information, not a diagnosis. For any health problem, please see a doctor or your nearest health worker.');
    const p = document.createElement('div');
    p.className = 'disc';
    p.textContent = discText;
    d.appendChild(p);
    d.scrollIntoView({ block: 'end' });
  }

  function setRemaining(n) {
    if ($('remaining')) {
      $('remaining').textContent = typeof n === 'number'
        ? (currentLang === 'or' ? `ଆଜି ଆଉ ${n} ଟି ପ୍ରଶ୍ନ ପଚାରିପାରିବେ` : `${n} question${n === 1 ? '' : 's'} left today`)
        : '';
    }
  }

  async function send(raw) {
    const text = (raw || '').trim();
    if (!text || busy) return;
    if (text.length > MAX) {
      addBubble('error', currentLang === 'or'
        ? `ଦୟାକରି ଆପଣଙ୍କ ପ୍ରଶ୍ନ ${MAX} ଅକ୍ଷର ମଧ୍ୟରେ ସୀମିତ ରଖନ୍ତୁ ।`
        : `Please keep your question under ${MAX} characters.`);
      return;
    }
    busy = true;
    $('sendBtn').disabled = true;
    if ($('chips')) $('chips').hidden = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('chat-has-results');
      const cv = $('chatView'); if (cv) cv.classList.add('chat-has-results');
    }
    addBubble('user', text);
    $('question').value = '';
    resizeInput();
    updateCounter();
    const wait = typing();

    try {
      const { data } = await sb.auth.getSession();
      const session = data && data.session;
      if (!session) {
        wait.remove();
        addBubble('error', currentLang === 'or'
          ? 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁଣି ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।'
          : 'Your session has ended. Please sign in again.');
        await sb.auth.signOut();
        return;
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ message: text, lang: currentLang })
      });
      let body = {};
      try { body = await res.json(); } catch (e) {}
      wait.remove();
      if (res.ok) {
        renderAnswer(body);
        setRemaining(body.remaining);
      } else if (res.status === 401) {
        addBubble('error', currentLang === 'or'
          ? 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁଣି ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।'
          : 'Your session has ended. Please sign in again.');
        await sb.auth.signOut();
      } else {
        addBubble('error', body.message || (currentLang === 'or' ? 'କିଛି ତ୍ରୁଟି ଘଟିଲା । ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ ।' : 'Something went wrong. Please try again.'));
      }
    } catch (e) {
      wait.remove();
      addBubble('error', currentLang === 'or'
        ? 'ସର୍ଭର ସହ ସଂଯୋଗ ହୋଇପାରିଲା ନାହିଁ । ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ ।'
        : 'Could not reach the server. Check your internet and try again.');
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
    const mainBtn = $('odiaVoiceMainBtn');
    if (mainBtn) mainBtn.classList.remove('recording');
    const mainText = $('odiaVoiceMainText');
    const subText = $('odiaVoiceSubText');
    if (mainText) mainText.textContent = '🎙️ ଆପଣଙ୍କ ସମସ୍ୟା କୁହନ୍ତୁ';
    if (subText) subText.textContent = 'ଏଠାରେ ଟ୍ୟାପ୍ କରି ଓଡ଼ିଆରେ କୁହନ୍ତୁ (Tap to speak in Odia)';
  }

  function initOdiaVoiceControl() {
    const mainBtn = $('odiaVoiceMainBtn');
    if (!mainBtn) return;

    mainBtn.addEventListener('click', async () => {
      // If mic is active, clicking it immediately stops recording, turns mic off, and finds results!
      if (odiaRecording) {
        if (odiaTimer) clearTimeout(odiaTimer);
        if (odiaMediaRecorder && odiaMediaRecorder.state === 'recording') {
          odiaMediaRecorder.stop();
        }
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('ମାଇକ୍ରୋଫୋନ୍ ସମର୍ଥନ ଏହି ବ୍ରାଉଜରରେ ଉପଲବ୍ଧ ନାହିଁ । (Microphone not supported in this browser)');
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
          mainBtn.classList.add('recording');
          const mainText = $('odiaVoiceMainText');
          const subText = $('odiaVoiceSubText');
          if (mainText) mainText.textContent = '🔴 ଶୁଣୁଛି... କୁହନ୍ତୁ (Listening)';
          if (subText) subText.textContent = 'ସରିଲେ ଏଠାରେ ଟ୍ୟାପ୍ କରନ୍ତୁ (Tap when done)';
        };

        odiaMediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          odiaRecording = false;
          mainBtn.classList.remove('recording');

          const mainText = $('odiaVoiceMainText');
          const subText = $('odiaVoiceSubText');
          if (mainText) mainText.textContent = '⏳ ସ୍ୱର ଯାଞ୍ଚ ହେଉଛି (Recognizing)...';
          if (subText) subText.textContent = 'ଡାକ୍ତରୀ ପରାମର୍ଶ ଖୋଜା ଚାଲିଛି...';

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
                addBubble('error', 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁନର୍ବାର ଲଗଇନ୍ କରନ୍ତୁ ।');
                return;
              }

              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ audio: base64Audio, mimeType })
              });

              resetOdiaVoiceBtn();

              if (res.ok) {
                const out = await res.json();
                if (out.text && out.text.trim()) {
                  // Show the transcribed Odia question on screen and fetch clinical guidance
                  send(out.text.trim());
                } else {
                  addBubble('error', 'ସ୍ୱର ସ୍ପଷ୍ଟ ଶୁଣାଗଲା ନାହିଁ । ଦୟାକରି ପୁଣି ଥରେ କୁହନ୍ତୁ । (Could not hear clearly, please try speaking again).');
                }
              } else {
                addBubble('error', 'ସ୍ୱର ଯାଞ୍ଚ ସେବା ବର୍ତ୍ତମାନ ବ୍ୟସ୍ତ ଅଛି । ଦୟାକରି ଆଉଥରେ ଚେଷ୍ଟା କରନ୍ତୁ ।');
              }
            };
          } catch (err) {
            console.error('Audio transcribe error:', err);
            resetOdiaVoiceBtn();
            addBubble('error', 'ଅଡିଓ ଯାଞ୍ଚରେ ତ୍ରୁଟି ହେଲା । ଦୟାକରି ପୁଣି ଥରେ କୁହନ୍ତୁ ।');
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
        alert('ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ । ଦୟାକରି ମାଇକ୍ ଅନୁମତି ଦିଅନ୍ତୁ । (Microphone permission was not granted)');
        resetOdiaVoiceBtn();
      }
    });
  }

  // ---------- English Mic Button (Composer) ----------
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
        recognition.lang = 'en-IN';

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
        alert('Speech recognition is not supported in this browser. Please type your question.');
        return;
      }
      if (recording) {
        try { recognition.stop(); } catch {}
        recording = false;
        micBtn.classList.remove('recording');
        return;
      }
      try {
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
  if (langEnBtn) langEnBtn.addEventListener('click', () => applyLanguage('en'));
  if (langOrBtn) langOrBtn.addEventListener('click', () => applyLanguage('or'));

  initOdiaVoiceControl();

  // ---------- Boot / Init ----------
  sb.auth.onAuthStateChange((_event, session) => route(session));
  sb.auth.getSession().then(({ data }) => route(data && data.session)).catch(() => route(null));
  setMode('signin');
})();
