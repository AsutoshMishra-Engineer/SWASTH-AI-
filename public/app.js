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
    'ଡେଙ୍ଗୁରୁ କିପରି ବଞ୍ଚିବା?',
    'କୁକୁର କାମୁଡ଼ିଲେ କ\'ଣ କରିବା?',
    'ଘରେ ORS କିପରି ପ୍ରସ୍ତୁତ କରିବେ?',
    'ଗର୍ଭାବସ୍ଥାରେ ବିପଦର ଲକ୍ଷଣ କ\'ଣ?',
    'ଅଂଶୁଘାତରୁ ରକ୍ଷା ଓ ପ୍ରାଥମିକ ଯତ୍ନ'
  ];
  const EXAMPLES_HI = [
    'डेंगू से कैसे बचें?',
    'कुत्ते के काटने पर क्या करें?',
    'घर पर ओआरएस (ORS) घोल कैसे बनाएं?',
    'गर्भावस्था में खतरे के मुख्य लक्षण क्या हैं?',
    'लू (सनस्ट्रोक) से बचाव और प्राथमिक उपचार'
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
  let isGuestMode = false;
  const GUEST_DAILY_LIMIT = 5;

  function getGuestId() {
    let gid = '';
    try { gid = localStorage.getItem('swasth_guest_id'); } catch {}
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      try { localStorage.setItem('swasth_guest_id', gid); } catch {}
    }
    return gid;
  }

  function getGuestRemaining() {
    const today = new Date().toISOString().slice(0, 10);
    let storedDate = '';
    let used = 0;
    try {
      storedDate = localStorage.getItem('swasth_guest_date');
      if (storedDate !== today) {
        localStorage.setItem('swasth_guest_date', today);
        localStorage.setItem('swasth_guest_used', '0');
        return GUEST_DAILY_LIMIT;
      }
      used = parseInt(localStorage.getItem('swasth_guest_used') || '0', 10);
    } catch {
      return GUEST_DAILY_LIMIT;
    }
    return Math.max(0, GUEST_DAILY_LIMIT - used);
  }

  function recordGuestQuestionUsed() {
    const today = new Date().toISOString().slice(0, 10);
    let used = 0;
    try {
      const storedDate = localStorage.getItem('swasth_guest_date');
      if (storedDate === today) {
        used = parseInt(localStorage.getItem('swasth_guest_used') || '0', 10);
      } else {
        localStorage.setItem('swasth_guest_date', today);
      }
      used += 1;
      localStorage.setItem('swasth_guest_used', String(used));
    } catch {}
    updateGuestUI();
    return Math.max(0, GUEST_DAILY_LIMIT - used);
  }

  function updateGuestUI() {
    const rem = getGuestRemaining();
    const banner = $('guestChatBanner');
    const txt = $('guestRemainingText');
    if (banner) banner.hidden = !isGuestMode;
    if (txt) {
      const isHi = currentLang === 'hi';
      const isOr = currentLang === 'or';
      txt.textContent = isHi
        ? `अतिथि मोड: आज 5 में से ${rem} प्रश्न शेष`
        : (isOr ? `ଅତିଥି ମୋଡ୍: ଆଜି ୫ ରୁ ${rem} ଟି ପ୍ରଶ୍ନ ବାକି` : `${rem} of ${GUEST_DAILY_LIMIT} questions left today`);
    }
    setRemaining(rem);
  }

  function enterGuestMode() {
    isGuestMode = true;
    viewingLanding = false;
    if (typeof window !== 'undefined') window.viewingLanding = false;
    showChatPage();
    updateGuestUI();
  }

  function exitGuestMode() {
    isGuestMode = false;
    showLandingPage();
  }

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
    isGuestMode = false;
    if (typeof window !== 'undefined') window.viewingLanding = true;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('chat-active');
      document.body.classList.remove('chat-has-results');
      document.body.classList.remove('guest-active');
    }
    if ($('authView')) $('authView').hidden = false;
    if ($('chatView')) $('chatView').hidden = true;
    const ok = isVerified(currentSession);
    if ($('navChatBtn')) $('navChatBtn').hidden = true;
    if ($('navHomeBtn')) $('navHomeBtn').hidden = true;
    if ($('navSignInBtn')) $('navSignInBtn').hidden = true;
    if ($('guestChatBanner')) $('guestChatBanner').hidden = true;
    if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = true;
    if ($('loggedInCardContent')) $('loggedInCardContent').hidden = !ok;
    if ($('loggedOutAuthContent')) $('loggedOutAuthContent').hidden = ok;
    if ($('signOut')) $('signOut').hidden = !ok;
    if ($('userEmail')) $('userEmail').hidden = !ok;
    if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').hidden = !ok;
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
      footCombined.innerHTML = '&copy; 2026 Swasth AI &bull; All Rights Reserved &bull; Odisha Public Health Assistant &bull; <a href="https://swasth-ai.pages.dev" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:700;text-decoration:underline;">swasth-ai.pages.dev</a>';
    }
  }

  function showChatPage() {
    viewingLanding = false;
    if (typeof window !== 'undefined') window.viewingLanding = false;
    const ok = isVerified(currentSession);
    if (ok || isGuestMode) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('chat-active');
        if (isGuestMode) {
          document.body.classList.add('guest-active');
        } else {
          document.body.classList.remove('guest-active');
        }
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
      if ($('navHomeBtn')) $('navHomeBtn').hidden = !isGuestMode;
      if ($('navSignInBtn')) $('navSignInBtn').hidden = !isGuestMode;
      if ($('guestChatBanner')) $('guestChatBanner').hidden = !isGuestMode;
      if ($('signOut')) $('signOut').hidden = true;
      if ($('userEmail')) $('userEmail').hidden = true;
      if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').hidden = isGuestMode || !ok;
      if ($('heroLoggedInBanner')) $('heroLoggedInBanner').hidden = true;
      if (isGuestMode) updateGuestUI();
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
      if (isGuestMode) {
        showChatPage();
        return;
      }
      viewingLanding = isAndroidClient;
      if ($('navChatBtn')) $('navChatBtn').hidden = true;
      if ($('navHomeBtn')) $('navHomeBtn').hidden = true;
      if ($('navSignInBtn')) $('navSignInBtn').hidden = true;
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
    window.enterGuestMode = enterGuestMode;
    window.exitGuestMode = exitGuestMode;
    window.viewingLanding = viewingLanding;
  }

  const brandBtn = $('brandBtn');
  if (brandBtn) {
    brandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isVerified(currentSession)) {
        if (viewingLanding) showChatPage();
        else showLandingPage();
      } else if (isGuestMode) {
        showChatPage();
      } else {
        showLandingPage();
      }
    });
  }

  const navHomeBtn = $('navHomeBtn');
  if (navHomeBtn) navHomeBtn.addEventListener('click', () => {
    isGuestMode = false;
    showLandingPage();
  });
  const navSignInBtn = $('navSignInBtn');
  if (navSignInBtn) navSignInBtn.addEventListener('click', exitGuestMode);
  const guestModeBtn = $('guestModeBtn');
  if (guestModeBtn) guestModeBtn.addEventListener('click', enterGuestMode);
  const guestSignInBtn = $('guestSignInBtn');
  if (guestSignInBtn) guestSignInBtn.addEventListener('click', exitGuestMode);
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
            if (/not confirmed/i.test(error.message || '') || error.error_code === 'email_not_confirmed') startResendCooldown(0);
          } else if (data && data.session && !isVerified(data.session)) {
            setMsg('Please verify your email first. Check your inbox for the link.', 'error');
            startResendCooldown(0);
            await sb.auth.signOut();
          } else if (data && data.session) {
            showChatPage();
          }
        }
      } catch (e) {
        console.error('Auth submit exception:', e);
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
    if (!error) return 'Unable to sign in. Please try again.';
    console.warn('Supabase auth notice/error:', error);
    const m = (error.message || error.msg || error.error_description || (typeof error === 'string' ? error : '')) || '';
    const code = error.error_code || error.code || '';

    if (/invalid login|invalid[_\s]credentials/i.test(m) || code === 'invalid_credentials') {
      return 'Incorrect email or password.';
    }
    if (/user not found/i.test(m) || code === 'user_not_found') {
      return 'Account not found. Please tap Create Account to register.';
    }
    if (/not confirmed|unconfirmed/i.test(m) || code === 'email_not_confirmed') {
      return 'Email not verified yet. Open the link sent to your inbox, or tap Resend Verification below.';
    }
    if (/rate limit|too many|seconds/i.test(m) || code === 'over_email_send_rate_limit') {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (/network|fetch|failed to fetch|abort/i.test(m)) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    if (/already registered|already in use|user already exists/i.test(m) || code === 'user_already_exists') {
      return 'An account with this email already exists. Try signing in.';
    }
    if (/password/i.test(m)) {
      return m;
    }
    if (m && m.length < 120) {
      return m;
    }
    return 'Unable to sign in. Please verify your details or tap Create Account.';
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
  let lastUserQuery = '';
  function scrollChatToLatest(element, smooth = true) {
    const mb = $('messages');
    if (!mb) return;
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
    try {
      if (element && typeof mb.scrollTo === 'function') {
        const offset = element.offsetTop - mb.offsetTop;
        const targetTop = Math.max(0, offset - 12);
        if (smooth) {
          mb.scrollTo({ top: targetTop, behavior: 'smooth' });
        } else {
          mb.scrollTop = targetTop;
        }
      } else {
        if (smooth && typeof mb.scrollTo === 'function') {
          mb.scrollTo({ top: mb.scrollHeight, behavior: 'smooth' });
        } else {
          mb.scrollTop = mb.scrollHeight;
        }
      }
    } catch (e) {
      mb.scrollTop = mb.scrollHeight;
    }
  }

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
    scrollChatToLatest(d, false);
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

    // Composer & Dual Action Boxes visibility - Available in ALL languages (English, Odia, Hindi)
    if (chatForm) {
      chatForm.hidden = false;
      chatForm.style.display = 'flex';
    }
    if (composerFoot) {
      composerFoot.hidden = false;
      composerFoot.style.display = 'flex';
    }
    if (dualActionArea) dualActionArea.classList.remove('hero-mode');

    const voiceBoxTitle = $('voiceBoxTitle');
    const voiceBoxSub = $('voiceBoxSub');
    const photoBoxTitle = $('photoBoxTitle');
    const photoBoxSub = $('photoBoxSub');

    if (voiceBoxTitle) {
      voiceBoxTitle.textContent = isHi ? 'बोलकर परामर्श' : (isOr ? 'ଭଏସ୍ ପରାମର୍ଶ' : 'Voice Consultation');
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
      pwaBtn.textContent = isHi ? 'ऐप इंस्टॉल करें' : (isOr ? 'ଆପ୍ ଇନଷ୍ଟଲ୍' : 'Install App');
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
        ? '<strong>6-विभाग विज़ुअल एआई स्कैनर (फ़ोटो जांच)</strong><small>त्वचा, आंख, मुंह, शिशु पीलिया, घाव व नाखून की क्लिनिकल फोटो से तुरंत प्राथमिक परामर्श।</small>'
        : (isOr
          ? '<strong>୬-ବିଭାଗ ଭିଜୁଆଲ୍ AI ସ୍କାନର୍ (ଫଟୋ ଡାକ୍ତରୀ ପରୀକ୍ଷା)</strong><small>ଚର୍ମ, ଆଖି, ମୁଖ, ଶିଶୁ, କ୍ଷତ ଓ ନଖର ଡାକ୍ତରୀ ଫଟୋ ପରୀକ୍ଷା କରି ତୁରନ୍ତ ପରାମର୍ଶ ପାଆନ୍ତୁ ।</small>'
          : '<strong>6-Department Visual AI Scanner (ଫଟୋ ଡାକ୍ତରୀ ପରୀକ୍ଷା)</strong><small>Upload clinical photos for instant triage across 6 conditions: Rash, Eye, Oral Pre-Cancer, Pediatric, Wounds, and Nails.</small>');

      const f2 = featItems[1].querySelector('div');
      if (f2) f2.innerHTML = isHi
        ? '<strong>हिन्दी और क्षेत्रीय वॉयस परामर्श</strong><small>अपने लक्षण सीधे बोलकर बताएं और तुरंत प्रमाणित स्वास्थ्य सलाह पाएं।</small>'
        : (isOr
          ? '<strong>ଓଡ଼ିଆ ଭଏସ୍ ପରାମର୍ଶ</strong><small>ନିଜ ଲକ୍ଷଣ ସିଧାସଳଖ ଓଡ଼ିଆରେ କହି ତୁରନ୍ତ ଘରୋଇ ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ପାଆନ୍ତୁ ।</small>'
          : '<strong>Odia & Hindi Voice Consultation (ଓଡ଼ିଆ ଭଏସ୍)</strong><small>Speak your symptoms naturally to receive instant spoken voice guidance in native Odia, Hindi, or English.</small>');

      const f3 = featItems[2].querySelector('div');
      if (f3) f3.innerHTML = isHi
        ? '<strong>डॉक्टर को कब दिखाएं और आपातकालीन सेवा</strong><small>सामान्य घरेलू देखभाल बनाम खतरे के लक्षण समझें। सीने में दर्द पर तुरंत 108 एम्बुलेंस सलाह।</small>'
        : (isOr
          ? '<strong>ଡାକ୍ତର କେବେ ଦେଖାଇବେ ଓ ଜରୁରୀକାଳୀନ ଯତ୍ନ</strong><small>ଘରୋଇ ଯତ୍ନ ବନାମ ବିପଦ ଲକ୍ଷଣ ଜାଣନ୍ତୁ । ଛାତି ଯନ୍ତ୍ରଣା ହେଲେ ତୁରନ୍ତ ୧୦୮ ଆମ୍ବୁଲାନ୍ସ ରେଫରାଲ୍ ।</small>'
          : '<strong>When to See a Doctor & Emergency Care</strong><small>Learn mild home care vs. danger signs that need hospital visits. Emergency chest pain triggers immediate 108 referral.</small>');

      const f4 = featItems[3].querySelector('div');
      if (f4) f4.innerHTML = isHi
        ? '<strong>प्रमाणित क्लिनिकल गाइडलाइन्स</strong><small>WHO और भारत सरकार के स्वास्थ्य मंत्रालय के प्रमाणित तथ्यों पर आधारित।</small>'
        : (isOr
          ? '<strong>ପ୍ରମାଣିତ ଡାକ୍ତରୀ ନିର୍ଦ୍ଦେଶାବଳୀ</strong><small>WHO ଏବଂ ଭାରତ ସରକାରଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଉପରେ ଆଧାରିତ ।</small>'
          : '<strong>Evidence-Based Clinical Guidelines</strong><small>Guidance strictly backed by official WHO and Ministry of Health validated clinical protocols.</small>');
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
        ? '<strong>स्वास्थ्य AI केवल एक सूचनात्मक मार्गदर्शक है, कोई डॉक्टर नहीं</strong><p>यह सेवा केवल स्वास्थ्य जागरूकता और सामान्य सलाह के लिए है। यह किसी डॉक्टर की शारीरिक जांच, लैब टेस्ट या दवा के नुस्खे (प्रिस्क्रिप्शन) का विकल्प नहीं है।</p>'
        : (isOr ? '<strong>ସ୍ୱାସ୍ଥ୍ୟ AI କେବଳ ଏକ ସୂଚନାକାରୀ ସହାୟକ, କୌଣସି ଡାକ୍ତର ନୁହେଁ</strong><p>ଏହି ସେବା କେବଳ ସଚେତନତା ଓ ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ପାଇଁ ଉଦ୍ଦିଷ୍ଟ । ଏହା ଡାକ୍ତରୀ ଶାରୀରିକ ପରୀକ୍ଷା, ରକ୍ତ ପରୀକ୍ଷା କିମ୍ବା ଔଷଧ ପ୍ରେସକ୍ରିପସନର ବିକଳ୍ପ ନୁହେଁ ।</p>'
          : '<strong>Swasth AI is an Informational Guide, Not a Doctor</strong><p>This service provides educational public health advice and symptom awareness. It cannot replace a clinical physical examination, diagnostic blood tests, or prescribed medication from a licensed medical professional.</p>');
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
    if ($('navDeleteAccountBtn')) $('navDeleteAccountBtn').textContent = isHi ? 'खाता हटाएं' : (isOr ? 'ଆକାଉଣ୍ଟ ଡିଲିଟ୍' : 'Delete Account');

    // Delete account modal
    if ($('deleteModalTitle')) $('deleteModalTitle').textContent = isHi ? 'क्या आप अपना खाता हटाना चाहते हैं?' : (isOr ? 'ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ଡିଲିଟ୍ କରିବେ କି?' : 'Delete Your Account?');
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
    let welcome;
    if (isGuestMode) {
      welcome = isHi
        ? 'नमस्ते! आप स्वास्थ AI अतिथि मोड (Guest Mode) में हैं। आज आपके पास 5 निःशुल्क स्वास्थ्य प्रश्न हैं। अपने लक्षण पूछें या नीचे माइक दबाकर बोलें। डॉक्टर पर्ची (PDF) व असीमित प्रश्नों के लिए कभी भी साइन इन करें।'
        : (isOr
          ? 'ନମସ୍କାର! ଆପଣ ସ୍ୱାସ୍ଥ୍ୟ AI ଅତିଥି ମୋଡ୍ (Guest Mode) ରେ ଅଛନ୍ତି । ଆଜି ଆପଣଙ୍କ ପାଇଁ ୫ ଟି ମାଗଣା ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରଶ୍ନ ରହିଛି । ଲକ୍ଷଣ ପଚାରିବା ପାଇଁ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ଡାକ୍ତର ରିପୋର୍ଟ (PDF) ଓ ଅସୀମିତ ପରାମର୍ଶ ପାଇଁ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ ।'
          : 'Namaskar! You are in Swasth AI Guest Mode with 5 free health questions today. Ask symptoms or tap mic to speak. Sign in anytime to unlock unlimited consultations and official Doctor Triage PDF reports.');
    } else {
      welcome = isHi
        ? 'नमस्ते! मैं स्वास्थ्य AI, आपका स्वास्थ्य सहायक। अपने लक्षण या स्वास्थ्य प्रश्न पूछें या नीचे माइक बटन दबाकर बोलें। मैं केवल WHO और स्वास्थ्य मंत्रालय के आधिकारिक व सत्यापित स्रोतों से सलाह देता हूँ।'
        : (isOr
          ? 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟ AI, ଓଡ଼ିଶାର ଜନସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ । ଆପଣଙ୍କର ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା କହିବା ପାଇଁ ତଳେ ଥିବା ବଡ଼ ମାଇକ୍ ବଟନ୍ ଦବାନ୍ତୁ । ମୁଁ କେବଳ WHO ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ମନ୍ତ୍ରଣାଳୟର ସଠିକ୍ ତଥ୍ୟ ଅନୁଯାୟୀ ଘରୋଇ ଉପଚାର ଓ ଡାକ୍ତରୀ ପରାମର୍ଶ ଦେବି ।'
          : 'Namaskar! I am Swasth AI, your public health assistant for Odisha. Describe your symptoms or ask a health question. I answer only using verified WHO and Ministry of Health sources.');
    }
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
        label.textContent = currentLang === 'hi' ? 'सुनें' : (currentLang === 'or' ? 'ଶୁଣନ୍ତୁ' : 'Listen');
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
            label.textContent = 'ଅଡିଓ ସଂଯୋଗ ହେଉନାହିଁ';
            setTimeout(() => { if (label) label.textContent = 'ଶୁଣନ୍ତୁ'; }, 3000);
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
            label.textContent = 'ऑडियो उपलब्ध नहीं';
            setTimeout(() => { if (label) label.textContent = 'सुनें'; }, 3000);
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
            label.textContent = 'Audio not available';
            setTimeout(() => { if (label) label.textContent = 'Listen'; }, 3000);
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
        label.textContent = isHi ? 'ऑडियो उपलब्ध नहीं' : (isOr ? 'ଅଡିଓ ସଂଯୋଗ ହେଉନାହିଁ' : 'Audio not available');
        setTimeout(() => { if (label) label.textContent = isHi ? 'सुनें' : (isOr ? 'ଶୁଣନ୍ତୁ' : 'Listen'); }, 3000);
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
      let token = isGuestMode ? getGuestId() : null;
      if (!token) {
        let { data } = await sb.auth.getSession();
        token = data?.session?.access_token;
        if (!token) {
          try {
            const refreshed = await sb.auth.refreshSession();
            token = refreshed?.data?.session?.access_token;
          } catch {}
        }
        if (!token && cfg.SUPABASE_ANON_KEY) {
          token = cfg.SUPABASE_ANON_KEY;
        }
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
    scrollChatToLatest(d, false);
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
    scrollChatToLatest(d, false);
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
        icon = '📸';
        title = isHi ? 'नेत्र चिकित्सा व दृष्टि मूल्यांकन (Netra Pariksha)' : (isOr ? 'ନେତ୍ର ବିଭାଗ ଓ ଦୃଷ୍ଟି ପରୀକ୍ଷା (ନେତ୍ର ପରୀକ୍ଷା)' : 'Ophthalmology & Eye Department (Netra Pariksha)');
        subtitle = isHi ? 'कंजक्टिवाइटिस, लाल आँख व आपातकालीन जांच' : (isOr ? 'କଞ୍ଜକ୍ଟିଭାଇଟିସ୍, ଲାଲ୍ ଆଖି ଓ ଜରୁରୀ ପରାମର୍ଶ' : 'Conjunctivitis, Stye, Red Eye & Visual Triage Protocol');
      } else if (dept === 'oral') {
        icon = '📸';
        title = isHi ? 'मुख स्वास्थ्य व कैंसर पूर्व जांच (Mukh Swasthya)' : (isOr ? 'ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ ଓ କର୍କଟ ପୂର୍ବ ଯାଞ୍ଚ (ମୁଖ ସ୍ୱାସ୍ଥ୍ୟ)' : 'Oral Health & Pre-Cancer Screening (Mukh Swasthya)');
        subtitle = isHi ? 'मुँह के छाले, तंबाकू व ल्यूकोप्लाकिया सुरक्षा जांच' : (isOr ? 'ତମାଖୁ, ଗୁଟ୍‌ଖା, ପାନ ଓ ଘା\' ଯାଞ୍ଚ ପ୍ରୋଟୋକଲ୍' : 'Aphthous Ulcers, OSMF & Pre-Malignancy Triage');
      } else if (dept === 'pediatric') {
        icon = '📸';
        title = isHi ? 'शिशु स्वास्थ्य व नवजात मूल्यांकन (Shishu Swasthya)' : (isOr ? 'ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ ଓ ନବଜାତ ଯତ୍ନ (ଶିଶୁ ସ୍ୱାସ୍ଥ୍ୟ)' : 'Pediatrics & Newborn Triage (Shishu Swasthya)');
        subtitle = isHi ? 'नवजात पीलिया (Jaundice), डायपर रैश व निर्जलीकरण जांच' : (isOr ? 'କାମଳ (Jaundice), ଡାଏପର ରାସ୍ ଓ ଶିଶୁ ସୁରକ୍ଷା' : 'Neonatal Jaundice, Dehydration & Pediatric Triage');
      } else if (dept === 'wound') {
        icon = '📸';
        title = isHi ? 'घाव, जलन व पशु काटना (Khyata & Porajala)' : (isOr ? 'ଘା\', ପୋଡ଼ାଜଳା ଓ ପଶୁ କାମୁଡ଼ା (କ୍ଷତ ଓ ପୋଡ଼ାଜଳା)' : 'Wounds, Burns & Animal Bites (Khyata & Porajala)');
        subtitle = isHi ? 'कुत्ता काटने पर 15 मिनट पानी से धोने व रेबीज सुरक्षा प्रोटोकॉल' : (isOr ? 'କୁକୁର କାମୁଡ଼ା ରେବିସ୍ ସୁରକ୍ଷା ଓ ୧୫ ମିନିଟ୍ ଧୋଇବା ପ୍ରୋଟୋକଲ୍' : '15-Min Running Water Rabies Wash & Burn Triage');
      } else if (dept === 'nail') {
        icon = '📸';
        title = isHi ? 'नाखून व एनीमिया दृश्य मूल्यांकन (Nakha Pariksha)' : (isOr ? 'ନଖ ଓ ରକ୍ତହୀନତା ପରୀକ୍ଷା (ନଖ ପରୀକ୍ଷା)' : 'Nails & Anemia Visual Screening (Nakha Pariksha)');
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

    // Voice Output Audio Speaker Button & 1-Click Doctor Triage Slip PDF Button
    if (data.answer) {
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';
      const actionsBar = document.createElement('div');
      actionsBar.className = 'answer-actions-bar';

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'speak-btn';
        const btnTitle = isHi ? 'सुनें' : (isOr ? 'ଶୁଣନ୍ତୁ' : 'Listen');
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

      // 1-Click Doctor Triage Slip (PDF) Button (Omitted in Guest mode)
      if (!isGuestMode) {
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
      } else {
        const guestPdfNotice = document.createElement('span');
        guestPdfNotice.className = 'guest-pdf-notice';
        guestPdfNotice.textContent = isHi ? '🔒 डॉक्टर पर्ची (PDF): साइन इन आवश्यक' : (isOr ? '🔒 ଡାକ୍ତର ରିପୋର୍ଟ (PDF): ସାଇନ୍ ଇନ୍ ଆବଶ୍ୟକ' : '🔒 Doctor PDF: Sign in required');
        guestPdfNotice.title = 'Sign in or create a free account to download clinical doctor triage PDFs';
        actionsBar.appendChild(guestPdfNotice);
      }

      d.appendChild(actionsBar);
    }

    // In-Chat Emergency Live Hospital Map Card
    if (data.kind === 'emergency') {
      const emCard = document.createElement('div');
      emCard.className = 'emergency-chat-map-card';
      const isOr = currentLang === 'or';
      const isHi = currentLang === 'hi';
      emCard.innerHTML = `
        <div class="emergency-chat-map-header">
          <span class="emergency-chat-map-badge">${isHi ? 'तत्काल चिकित्सकीय सहायता' : (isOr ? 'ତୁରନ୍ତ ଡାକ୍ତରୀ ସହାୟତା ଆବଶ୍ୟକ' : 'Immediate Medical Care Required')}</span>
          <strong>${isHi ? 'निकटतम 24x7 अस्पताल व आपातकालीन दिशा-निर्देश' : (isOr ? 'ନିକଟସ୍ଥ ୨୪x୭ ଡାକ୍ତରଖାନା ଓ ରାସ୍ତା ଦେଖନ୍ତୁ' : 'Find Nearest Emergency Hospital & Route')}</strong>
          <p>${isHi ? 'अपने पास के सरकारी अस्पताल, ट्रॉमा सेंटर या सीएचसी का लाइव नक्शा देखें।' : (isOr ? 'ଆପଣଙ୍କ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲ, ଟ୍ରମା ସେଣ୍ଟର ବା CHC ର ଲାଇଭ୍ ମ୍ୟାପ୍ ଦେଖନ୍ତୁ ।' : 'Locate the closest government hospital, trauma centre, or CHC with live directions.')}</p>
        </div>
        <button class="btn danger small emergency-locate-btn" type="button">
          ${isHi ? 'निकटतम अस्पताल खोजें (GPS नक्शा)' : (isOr ? 'ନିକଟସ୍ଥ ଡାକ୍ତରଖାନା ଖୋଜନ୍ତୁ (GPS ମ୍ୟାପ୍)' : 'Locate Nearest Hospital (GPS Live Map)')}
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
    scrollChatToLatest(d, true);
  }

  function setRemaining(n) {
    if ($('remaining')) {
      if (isGuestMode) {
        const rem = typeof n === 'number' ? n : getGuestRemaining();
        $('remaining').textContent = currentLang === 'hi'
          ? `अतिथि मोड: आज ${rem} प्रश्न शेष`
          : (currentLang === 'or' ? `ଅତିଥି ମୋଡ୍: ଆଜି ${rem} ଟି ପ୍ରଶ୍ନ ବାକି` : `Guest Mode: ${rem} question${rem === 1 ? '' : 's'} left today`);
      } else {
        $('remaining').textContent = typeof n === 'number'
          ? (currentLang === 'hi'
            ? `आज आप ${n} और प्रश्न पूछ सकते हैं`
            : (currentLang === 'or' ? `ଆଜି ଆଉ ${n} ଟି ପ୍ରଶ୍ନ ପଚାରିପାରିବେ` : `${n} question${n === 1 ? '' : 's'} left today`))
          : '';
      }
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

    // Auto-detect Odisha town, NAC, municipality or panchayat if mentioned by user
    if (text) {
      const detectedLoc = detectOdishaLocationFromText(text);
      if (detectedLoc) {
        userLocationCoords = {
          lat: detectedLoc.lat,
          lng: detectedLoc.lng,
          district: detectedLoc.district,
          districtName: detectedLoc.name,
          isFallback: false
        };
        try {
          localStorage.setItem('swasth_user_coords', JSON.stringify(userLocationCoords));
          localStorage.setItem('swasth_user_district', detectedLoc.district);
        } catch {}
        updateQuickDistrictPill(detectedLoc.district);
        if ($('districtSelect')) {
          $('districtSelect').value = detectedLoc.district;
        }
      }
    }

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

    lastUserQuery = text || (activeImage ? 'Clinical photo examination' : '');
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
    }

    try {
      let token = null;
      if (isGuestMode) {
        const rem = getGuestRemaining();
        if (rem <= 0) {
          wait.remove();
          addBubble('bot warning', currentLang === 'hi'
            ? '⚠️ आपके आज के 5 अतिथि प्रश्न समाप्त हो चुके हैं। असीमित स्वास्थ्य परामर्श और डॉक्टर पर्ची (PDF) के लिए कृपया साइन इन करें।'
            : (currentLang === 'or'
              ? '⚠️ ଆପଣଙ୍କ ଆଜିର ୫ ଟି ଅତିଥି ପ୍ରଶ୍ନ ସମାପ୍ତ ହୋଇଛି । ଅସୀମିତ ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ ଓ ଡାକ୍ତର ରିପୋର୍ଟ (PDF) ପାଇଁ ଦୟାକରି ସାଇନ୍ ଇନ୍ କରନ୍ତୁ ।'
              : '⚠️ You have used your 5 free guest questions for today. Please sign in or create an account to unlock unlimited health consultations and downloadable Doctor Triage PDF reports.'));
          updateGuestUI();
          busy = false;
          $('sendBtn').disabled = false;
          $('question').focus();
          return;
        }
        token = getGuestId();
      } else {
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
          busy = false;
          $('sendBtn').disabled = false;
          return;
        }
        token = session.access_token;
      }

      const endpoint = activeImage ? '/api/vision-skin' : '/api/chat';
      const payload = activeImage
        ? { image: activeImage.data, mimeType: activeImage.mimeType, symptoms: text, lang: currentLang, department: activeDept }
        : { message: text, lang: currentLang };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });
      let body = {};
      try { body = await res.json(); } catch (e) {}
      wait.remove();
      if (res.ok) {
        if (isGuestMode) {
          recordGuestQuestionUsed();
        }
        renderAnswer(body);
        if (body.remaining !== undefined) setRemaining(body.remaining);
      } else if (res.status === 401) {
        if (isGuestMode) {
          addBubble('error', 'Guest session error. Please try again or sign in.');
        } else {
          addBubble('error', currentLang === 'hi'
            ? 'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।'
            : (currentLang === 'or'
              ? 'ଆପଣଙ୍କ ସେସନ୍ ସମାପ୍ତ ହୋଇଛି । ଦୟାକରି ପୁଣି ଲଗ୍ ଇନ୍ କରନ୍ତୁ ।'
              : 'Your session has ended. Please sign in again.'));
          await sb.auth.signOut();
        }
      } else if (res.status === 429 && (body.error === 'guest_limit' || isGuestMode)) {
        addBubble('bot warning', currentLang === 'hi'
          ? '⚠️ आज के 5 अतिथि प्रश्न पूरे हो चुके हैं। असीमित परामर्श और डॉक्टर पर्ची (PDF) के लिए कृपया साइन इन करें।'
          : (currentLang === 'or'
            ? '⚠️ ଆଜିର ୫ ଟି ଅତିଥି ପ୍ରଶ୍ନ ସମାପ୍ତ ହୋଇଛି । ଅସୀମିତ ପରାମର୍ଶ ଓ ଡାକ୍ତର ରିପୋର୍ଟ (PDF) ପାଇଁ ଦୟାକରି ସାଇନ୍ ଇନ୍ କରନ୍ତୁ ।'
            : '⚠️ You have reached your limit of 5 free guest questions today. Please sign in to continue with unlimited consultations and PDF doctor reports.'));
        updateGuestUI();
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
      voiceBoxTitle.textContent = isHi ? 'बोलकर परामर्श' : (isOr ? 'ଭଏସ୍ ପରାମର୍ଶ' : 'Voice Consultation');
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
              ? 'सुन रहा हूँ... (रोकने के लिए टैप करें)'
              : (isOr ? 'ଶୁଣୁଛି... (ରୋକିବାକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ)' : 'Listening... (Tap mic to stop)');
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

              let token = isGuestMode ? getGuestId() : null;
              if (!token) {
                const { data } = await sb.auth.getSession();
                token = data?.session?.access_token;
              }
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

  // ---------- PWA & Service Worker Registration & Auto-Refresh ----------
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Swasth AI PWA ServiceWorker active:', reg.scope);
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New Swasth AI version installed - refreshing');
                window.location.reload();
              }
            });
          }
        });
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
        installBtn.textContent = isHi ? 'ऐप इंस्टॉल करें' : (isOr ? 'ଆପ୍ ଇନଷ୍ଟଲ୍' : 'Install App');
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
    {
      "id": "bbsr-aiims",
      "name": "AIIMS Bhubaneswar",
      "nameOr": "ଏମ୍ସ ଭୁବନେଶ୍ୱର (AIIMS Bhubaneswar)",
      "nameHi": "एम्स भुवनेश्वर (AIIMS Bhubaneswar)",
      "lat": 20.2312,
      "lng": 85.776,
      "district": "khordha",
      "type": "National Apex Referral & Trauma Institute",
      "category": "mch",
      "address": "Sijua, Patrapada, Bhubaneswar - 751019",
      "phone": "0674-2476789",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency, Level-1 Trauma & Super-Specialty"
    },
    {
      "id": "bbsr-capital",
      "name": "Capital Hospital & PGIER Bhubaneswar",
      "nameOr": "କ୍ୟାପିଟାଲ୍ ହସ୍ପିଟାଲ୍ ଓ ପିଜିଆଇଇଆର (Capital Hospital)",
      "nameHi": "कैपिटल हॉस्पिटल व पीजीआईईआर, भुवनेश्वर",
      "lat": 20.2644,
      "lng": 85.8281,
      "district": "khordha",
      "type": "Postgraduate Institute & Apex Hospital",
      "category": "mch",
      "address": "Unit-6, Ganga Nagar, Bhubaneswar - 751001",
      "phone": "0674-2391983",
      "emergencyPhone": "108",
      "casualty": "24x7 State Emergency & Trauma Care Desk"
    },
    {
      "id": "khordha-dhh",
      "name": "District Headquarters Hospital (DHH) Khordha",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଖୋର୍ଦ୍ଧା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), खोर्धा",
      "lat": 20.1843,
      "lng": 85.6212,
      "district": "khordha",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Collectorate, Khordha - 752055",
      "phone": "06755-220444",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Inpatient"
    },
    {
      "id": "khordha-jatni-sdh",
      "name": "Sub-Divisional Hospital (SDH) Jatni",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଜଟଣୀ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), जटनी",
      "lat": 20.1602,
      "lng": 85.7042,
      "district": "khordha",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Railway Colony Road, Jatni - 752050",
      "phone": "0674-2490333",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Maternity"
    },
    {
      "id": "khordha-banpur-chc",
      "name": "Community Health Centre (CHC) Banpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଣପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बाणपुर",
      "lat": 19.8665,
      "lng": 85.1764,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Main Road, Banpur - 752031",
      "phone": "06756-251230",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Delivery Services"
    },
    {
      "id": "khordha-tangi-chc",
      "name": "Community Health Centre (CHC) Tangi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଟାଙ୍ଗୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), टांगी",
      "lat": 19.9282,
      "lng": 85.3995,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Tangi - 752023",
      "phone": "06756-254240",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Emergency OPD"
    },
    {
      "id": "khordha-balipatna-chc",
      "name": "Community Health Centre (CHC) Balipatna",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଳିପାଟଣା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बालिपटना",
      "lat": 20.1834,
      "lng": 85.9612,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Balipatna Bazaar - 752102",
      "phone": "0674-2461220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Primary Care"
    },
    {
      "id": "khordha-balianta-chc",
      "name": "Community Health Centre (CHC) Balianta",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଳିଅନ୍ତା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बालिअंता",
      "lat": 20.2882,
      "lng": 85.9124,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Block Office, Balianta - 752101",
      "phone": "0674-2462211",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Diagnostics"
    },
    {
      "id": "khordha-begunia-chc",
      "name": "Community Health Centre (CHC) Begunia",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବେଗୁନିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बेगुनिया",
      "lat": 20.1983,
      "lng": 85.4521,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Begunia Town - 752062",
      "phone": "06755-233215",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Casualty & Inpatient"
    },
    {
      "id": "khordha-bolagarh-chc",
      "name": "Community Health Centre (CHC) Bolagarh",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବୋଲଗଡ଼",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बोलगढ़",
      "lat": 20.1421,
      "lng": 85.2912,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-57, Bolagarh - 752066",
      "phone": "06755-236210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "khordha-chilika-chc",
      "name": "Community Health Centre (CHC) Chilika Barkul",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚିଲିକା ବାରକୁଲ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चिलिका बारकुल",
      "lat": 19.7824,
      "lng": 85.1956,
      "district": "khordha",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near OTDC Panthanivas, Barkul - 752030",
      "phone": "06756-257211",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal & Rural Emergency"
    },
    {
      "id": "ctc-scb",
      "name": "SCB Medical College & Hospital",
      "nameOr": "ଏସସିବି ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, କଟକ (SCB Cuttack)",
      "nameHi": "एससीबी मेडिकल कॉलेज व अस्पताल, कटक (SCB Cuttack)",
      "lat": 20.4727,
      "lng": 85.8885,
      "district": "cuttack",
      "type": "Premier Medical College & Super-Specialty",
      "category": "mch",
      "address": "Mangalabag, Cuttack - 753007",
      "phone": "0671-2414080",
      "emergencyPhone": "108",
      "casualty": "24x7 Apex Emergency Casualty & Trauma ICU"
    },
    {
      "id": "ctc-ahpgic",
      "name": "Acharya Harihar Post Graduate Institute of Cancer (AHPGIC)",
      "nameOr": "ଆଚାର୍ଯ୍ୟ ହରିହର କର୍କଟ ପ୍ରତିଷ୍ଠାନ (AHPGIC), କଟକ",
      "nameHi": "आचार्य हरिहर स्नातकोत्तर कैंसर संस्थान, कटक",
      "lat": 20.4705,
      "lng": 85.8872,
      "district": "cuttack",
      "type": "Regional Apex Oncology Institute",
      "category": "mch",
      "address": "Mangalabag, Cuttack - 753007",
      "phone": "0671-2414705",
      "emergencyPhone": "108",
      "casualty": "24x7 Cancer Emergency & Pain Palliative Unit"
    },
    {
      "id": "ctc-sishu-bhawan",
      "name": "Sardar Vallabhbhai Patel Institute of Paediatrics (Sishu Bhawan)",
      "nameOr": "ଶିଶୁ ଭବନ (Sishu Bhawan), କଟକ",
      "nameHi": "सरदार वल्लभभाई पटेल बाल चिकित्सा संस्थान (शिशु भवन), कटक",
      "lat": 20.4668,
      "lng": 85.8715,
      "district": "cuttack",
      "type": "Apex Pediatric Hospital & Institute",
      "category": "mch",
      "address": "Chandni Chowk, Cuttack - 753002",
      "phone": "0671-2367406",
      "emergencyPhone": "108",
      "casualty": "24x7 Newborn, Pediatric ICU & Emergency"
    },
    {
      "id": "ctc-city-dhh",
      "name": "City Hospital (DHH) Cuttack",
      "nameOr": "ସିଟି ହସ୍ପିଟାଲ (DHH), କଟକ",
      "nameHi": "सिटी अस्पताल (DHH), कटक",
      "lat": 20.4631,
      "lng": 85.8752,
      "district": "cuttack",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Buxi Bazaar, Cuttack - 753001",
      "phone": "0671-2301140",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & OPD"
    },
    {
      "id": "ctc-athagarh-sdh",
      "name": "Sub-Divisional Hospital (SDH) Athagarh",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଆଠଗଡ଼",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), आठगढ़",
      "lat": 20.5312,
      "lng": 85.6284,
      "district": "cuttack",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Athagarh - 754029",
      "phone": "06723-220224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency & Maternity"
    },
    {
      "id": "ctc-banki-sdh",
      "name": "Sub-Divisional Hospital (SDH) Banki",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ବାଙ୍କୀ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), बांकी",
      "lat": 20.3789,
      "lng": 85.5342,
      "district": "cuttack",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "College Road, Banki - 754008",
      "phone": "06723-240230",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Inpatient"
    },
    {
      "id": "ctc-choudwar-chc",
      "name": "Community Health Centre (CHC) Choudwar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚୌଦ୍ୱାର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चौद्वार",
      "lat": 20.5378,
      "lng": 85.9142,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Industrial Area, Choudwar - 754025",
      "phone": "0671-2491220",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Trauma & Emergency"
    },
    {
      "id": "ctc-salipur-chc",
      "name": "Community Health Centre (CHC) Salipur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସାଳେପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सालेपुर",
      "lat": 20.4856,
      "lng": 86.0824,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Salipur Bazaar - 754202",
      "phone": "0671-2352210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Delivery"
    },
    {
      "id": "ctc-badamba-chc",
      "name": "Community Health Centre (CHC) Badamba",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବଡ଼ମ୍ବା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बड़म्बा",
      "lat": 20.4284,
      "lng": 85.3412,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Badamba Town - 754031",
      "phone": "06723-234220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care"
    },
    {
      "id": "ctc-narsinghpur-chc",
      "name": "Community Health Centre (CHC) Narsinghpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନରସିଂହପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), नरसिंहपुर",
      "lat": 20.4632,
      "lng": 85.0841,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Bus Stand, Narsinghpur - 754032",
      "phone": "06723-238215",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Snakebite Care"
    },
    {
      "id": "ctc-mahanga-chc",
      "name": "Community Health Centre (CHC) Mahanga",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମାହାଙ୍ଗା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), माहांगा",
      "lat": 20.5921,
      "lng": 86.1542,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Mahanga Town - 754206",
      "phone": "0671-2372210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward"
    },
    {
      "id": "ctc-nischintakoili-chc",
      "name": "Community Health Centre (CHC) Nischintakoili",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନିଶ୍ଚିନ୍ତକୋଇଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), निश्चिंतकोइली",
      "lat": 20.4674,
      "lng": 86.1284,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Nischintakoili Bazaar - 754207",
      "phone": "0671-2385210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency & Maternity"
    },
    {
      "id": "ctc-tangi-chc",
      "name": "Community Health Centre (CHC) Tangi Choudwar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଟାଙ୍ଗୀ ଚୌଦ୍ୱାର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), टांगी चौद्वार",
      "lat": 20.5892,
      "lng": 85.9612,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Tangi, Cuttack - 754022",
      "phone": "0671-2495210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency & Trauma"
    },
    {
      "id": "ctc-niali-chc",
      "name": "Community Health Centre (CHC) Niali",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନିଆଳି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), निआली",
      "lat": 20.1462,
      "lng": 86.0612,
      "district": "cuttack",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Niali Town - 754004",
      "phone": "0671-2396210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "keonjhar-ddmch",
      "name": "Dharanidhar Medical College & Hospital (DDMCH / DHH Keonjhar)",
      "nameOr": "ଧରଣୀଧର ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ (DDMCH), କେନ୍ଦୁଝର",
      "nameHi": "धरणीधर मेडिकल कॉलेज व अस्पताल (DDMCH), केंदुझर",
      "lat": 21.6288,
      "lng": 85.5817,
      "district": "keonjhar",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Kabitra, Keonjhar - 758001",
      "phone": "06766-255420",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Multi-Specialty ICU"
    },
    {
      "id": "keonjhar-anandapur-sdh",
      "name": "Sub-Divisional Hospital (SDH) Anandapur",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଆନନ୍ଦପୁର, କେନ୍ଦୁଝର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), आनंदपुर, केंदुझर",
      "lat": 21.2183,
      "lng": 86.1192,
      "district": "keonjhar",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Anandapur - 758021",
      "phone": "06731-220235",
      "emergencyPhone": "108",
      "casualty": "24x7 Trauma Unit, Blood Bank & Emergency Ward"
    },
    {
      "id": "keonjhar-champua-sdh",
      "name": "Sub-Divisional Hospital (SDH) Champua",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଚମ୍ପୁଆ, କେନ୍ଦୁଝର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), चंपुआ, केंदुझर",
      "lat": 22.0833,
      "lng": 85.6667,
      "district": "keonjhar",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Near Old Bus Stand, Champua - 758041",
      "phone": "06767-240224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency & Maternity Wing"
    },
    {
      "id": "keonjhar-ghatagaon-chc",
      "name": "Community Health Centre (CHC) Ghatagaon",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଘଟଗାଁ, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), घटगांव, केंदुझर",
      "lat": 21.5034,
      "lng": 85.9124,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tarini Temple Road, Ghatagaon - 758027",
      "phone": "06733-235220",
      "emergencyPhone": "108",
      "casualty": "24x7 Pilgrim & Rural Highway Emergency Care"
    },
    {
      "id": "keonjhar-telkoi-chc",
      "name": "Community Health Centre (CHC) Telkoi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତେଲକୋଇ, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तेलकोई, केंदुझर",
      "lat": 21.3651,
      "lng": 85.4012,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Block Road, Telkoi - 758019",
      "phone": "06766-231215",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Snakebite Ward"
    },
    {
      "id": "keonjhar-harichandanpur-chc",
      "name": "Community Health Centre (CHC) Harichandanpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ହରିଚନ୍ଦନପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), हरिचंदनपुर",
      "lat": 21.3412,
      "lng": 85.7891,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Railway Station, Harichandanpur - 758028",
      "phone": "06733-241220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "keonjhar-patna-chc",
      "name": "Community Health Centre (CHC) Patna",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପାଟଣା, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पटना, केंदुझर",
      "lat": 21.7241,
      "lng": 85.8342,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Patna Bazaar - 758017",
      "phone": "06766-243210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "keonjhar-joda-chc",
      "name": "Tata Steel / Govt CHC Joda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଯୋଡ଼ା, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जोडा, केंदुझर",
      "lat": 22.0162,
      "lng": 85.4241,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Mining Colony, Joda - 758034",
      "phone": "06767-272210",
      "emergencyPhone": "108",
      "casualty": "24x7 Mining Trauma & Industrial Emergency"
    },
    {
      "id": "keonjhar-barbil-chc",
      "name": "Community Health Centre (CHC) Barbil",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବଡ଼ବିଲ, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बड़बिल, केंदुझर",
      "lat": 22.1184,
      "lng": 85.3982,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Main Road, Barbil - 758035",
      "phone": "06767-275320",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Emergency & Trauma Unit"
    },
    {
      "id": "keonjhar-jhumpura-chc",
      "name": "Community Health Centre (CHC) Jhumpura",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଝୁମ୍ପୁରା, କେନ୍ଦୁଝର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), झुमपुरा, केंदुझर",
      "lat": 21.8214,
      "lng": 85.5742,
      "district": "keonjhar",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Jhumpura Town - 758031",
      "phone": "06766-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "balasore-fmmch",
      "name": "Fakir Mohan Medical College & Hospital (FM MCH Balasore)",
      "nameOr": "ଫକୀର ମୋହନ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ (FM MCH), ବାଲେଶ୍ୱର",
      "nameHi": "फ़कीर मोहन मेडिकल कॉलेज व अस्पताल (FM MCH), बालेश्वर",
      "lat": 21.5034,
      "lng": 86.9157,
      "district": "balasore",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Remuna, Balasore - 756019",
      "phone": "06782-262100",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Centre"
    },
    {
      "id": "balasore-dhh",
      "name": "District Headquarters Hospital (DHH) Balasore",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବାଲେଶ୍ୱର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), बालेश्वर",
      "lat": 21.4925,
      "lng": 86.9324,
      "district": "balasore",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Hospital Road, Balasore Town - 756001",
      "phone": "06782-262015",
      "emergencyPhone": "108",
      "casualty": "24x7 Casualty & Emergency Ward"
    },
    {
      "id": "balasore-nilagiri-sdh",
      "name": "Sub-Divisional Hospital (SDH) Nilagiri",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ନୀଳଗିରି",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), नीलगिरि",
      "lat": 21.4608,
      "lng": 86.7642,
      "district": "balasore",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Main Road, Nilagiri - 756040",
      "phone": "06782-233215",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Labor Room"
    },
    {
      "id": "balasore-jaleswar-chc",
      "name": "Community Health Centre (CHC) Jaleswar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜଳେଶ୍ୱର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जलेश्वर",
      "lat": 21.8012,
      "lng": 87.2145,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Station Road, Jaleswar - 756032",
      "phone": "06781-222210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Highway Emergency"
    },
    {
      "id": "balasore-soro-chc",
      "name": "Community Health Centre (CHC) Soro",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସୋରୋ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सोरो",
      "lat": 21.2891,
      "lng": 86.6892,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Soro - 756045",
      "phone": "06788-222215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Emergency"
    },
    {
      "id": "balasore-basta-chc",
      "name": "Community Health Centre (CHC) Basta",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବସ୍ତା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बस्ता",
      "lat": 21.6841,
      "lng": 87.0612,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Basta Bazaar - 756029",
      "phone": "06781-231210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "balasore-baliapal-chc",
      "name": "Community Health Centre (CHC) Baliapal",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଲିଆପାଳ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बालियापाल",
      "lat": 21.6542,
      "lng": 87.2891,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Baliapal Town - 756026",
      "phone": "06781-235210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Emergency & Delivery"
    },
    {
      "id": "balasore-bhograi-chc",
      "name": "Community Health Centre (CHC) Bhograi Jaleswarpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭୋଗରାଇ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भोगराई",
      "lat": 21.6742,
      "lng": 87.4124,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Jaleswarpur, Bhograi - 756038",
      "phone": "06781-238210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Border Emergency"
    },
    {
      "id": "balasore-remuna-chc",
      "name": "Community Health Centre (CHC) Remuna",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରେମୁଣା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), रेमुणा",
      "lat": 21.5284,
      "lng": 86.8741,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Gopinath Temple, Remuna - 756019",
      "phone": "06782-252210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care"
    },
    {
      "id": "balasore-simulia-chc",
      "name": "Community Health Centre (CHC) Simulia",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସିମୁଳିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सिमूलिया",
      "lat": 21.1892,
      "lng": 86.5891,
      "district": "balasore",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Simulia - 756126",
      "phone": "06788-234210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "mayurbhanj-prmmch",
      "name": "Pandit Raghunath Murmu Medical College & Hospital (PRM MCH)",
      "nameOr": "ପଣ୍ଡିତ ରଘୁନାଥ ମୁର୍ମୁ ମେଡିକାଲ କଲେଜ (PRM MCH), ବାରିପଦା",
      "nameHi": "पंडित रघुनाथ मुर्मू मेडिकल कॉलेज व अस्पताल (PRM MCH), बारीपदा",
      "lat": 21.9347,
      "lng": 86.7327,
      "district": "mayurbhanj",
      "type": "Medical College & Regional Apex Hospital",
      "category": "mch",
      "address": "Rangamatia, Baripada - 757107",
      "phone": "06792-255420",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma ICU"
    },
    {
      "id": "mayurbhanj-dhh",
      "name": "District Headquarters Hospital (DHH) Baripada",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବାରିପଦା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), बारीपदा",
      "lat": 21.9312,
      "lng": 86.7456,
      "district": "mayurbhanj",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Bada Bazaar, Baripada - 757001",
      "phone": "06792-252135",
      "emergencyPhone": "108",
      "casualty": "24x7 Casualty & Emergency Ward"
    },
    {
      "id": "mayurbhanj-rairangpur-sdh",
      "name": "Sub-Divisional Hospital (SDH) Rairangpur",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ରାଇରଙ୍ଗପୁର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), रायरंगपुर",
      "lat": 22.2667,
      "lng": 86.1667,
      "district": "mayurbhanj",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Rairangpur - 757043",
      "phone": "06794-222230",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "mayurbhanj-karanjia-sdh",
      "name": "Sub-Divisional Hospital (SDH) Karanjia",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), କରଞ୍ଜିଆ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), करंजिया",
      "lat": 21.7833,
      "lng": 85.9667,
      "district": "mayurbhanj",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Near Bus Stand, Karanjia - 757037",
      "phone": "06796-220224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency & Maternity"
    },
    {
      "id": "mayurbhanj-udala-sdh",
      "name": "Sub-Divisional Hospital (SDH) Udala",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଉଦଳା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), उदला",
      "lat": 21.5833,
      "lng": 86.5667,
      "district": "mayurbhanj",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Kaptipada Road, Udala - 757041",
      "phone": "06795-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Inpatient"
    },
    {
      "id": "mayurbhanj-betnoti-chc",
      "name": "Community Health Centre (CHC) Betnoti",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବେତନଟୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बेतनटी",
      "lat": 21.7342,
      "lng": 86.8541,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-18, Betnoti - 757025",
      "phone": "06793-222215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "mayurbhanj-jashipur-chc",
      "name": "Community Health Centre (CHC) Jashipur (Similipal)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଯଶୀପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जशीपुर",
      "lat": 21.9674,
      "lng": 86.0841,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-49, Jashipur - 757034",
      "phone": "06797-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Eco-Trauma & Snakebite Emergency"
    },
    {
      "id": "mayurbhanj-morada-chc",
      "name": "Community Health Centre (CHC) Morada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମୋରଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मोरड़ा",
      "lat": 21.8412,
      "lng": 86.9892,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Morada Town - 757020",
      "phone": "06792-236210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "mayurbhanj-badasahi-chc",
      "name": "Community Health Centre (CHC) Badasahi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବଡ଼ସାହି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बड़साही",
      "lat": 21.7312,
      "lng": 86.7341,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Badasahi Bazaar - 757026",
      "phone": "06792-238210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency Care"
    },
    {
      "id": "mayurbhanj-bisoi-chc",
      "name": "Community Health Centre (CHC) Bisoi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବିଶୋଇ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बिसोई",
      "lat": 22.1542,
      "lng": 86.4124,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-49, Bisoi - 757033",
      "phone": "06794-234210",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Belt Highway Emergency"
    },
    {
      "id": "mayurbhanj-bangriposi-chc",
      "name": "Community Health Centre (CHC) Bangriposi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଙ୍ଗିରିପୋଷି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बांगिरिपोषी",
      "lat": 22.1521,
      "lng": 86.5342,
      "district": "mayurbhanj",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Ghati Road, Bangriposi - 757032",
      "phone": "06791-223210",
      "emergencyPhone": "108",
      "casualty": "24x7 Ghat Road Trauma & Emergency"
    },
    {
      "id": "bhadrak-dhh",
      "name": "District Headquarters Hospital (DHH) Bhadrak",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଭଦ୍ରକ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), भद्रक",
      "lat": 21.0583,
      "lng": 86.5028,
      "district": "bhadrak",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Bonth Chhak, Bhadrak - 756100",
      "phone": "06784-251785",
      "emergencyPhone": "108",
      "casualty": "24x7 Trauma Care & Emergency Casualty"
    },
    {
      "id": "bhadrak-chandbali-chc",
      "name": "Community Health Centre (CHC) Chandbali (Port Region)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚାନ୍ଦବାଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चांदबाली",
      "lat": 20.7765,
      "lng": 86.7412,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Riverside Road, Chandbali - 756133",
      "phone": "06786-220230",
      "emergencyPhone": "108",
      "casualty": "24x7 Riverine & Coastal Emergency Center"
    },
    {
      "id": "bhadrak-basudevpur-chc",
      "name": "Community Health Centre (CHC) Basudevpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାସୁଦେବପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बासुदेवपुर",
      "lat": 21.1392,
      "lng": 86.7461,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Basudevpur Town - 756125",
      "phone": "06784-271220",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Emergency & Maternity"
    },
    {
      "id": "bhadrak-dhamnagar-chc",
      "name": "Community Health Centre (CHC) Dhamnagar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଧାମନଗର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), धामनगर",
      "lat": 20.9234,
      "lng": 86.4421,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Dhamnagar Bazaar - 756117",
      "phone": "06786-236215",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "bhadrak-tihidi-chc",
      "name": "Community Health Centre (CHC) Tihidi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତିହିଡ଼ି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तिहिड़ी",
      "lat": 20.9841,
      "lng": 86.6124,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tihidi Town - 756130",
      "phone": "06784-263210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Labor Room"
    },
    {
      "id": "bhadrak-bhandaripokhari-chc",
      "name": "Community Health Centre (CHC) Bhandaripokhari",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭଣ୍ଡାରିପୋଖରୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भंडारीपोखरी",
      "lat": 20.9521,
      "lng": 86.3741,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Bhandaripokhari - 756120",
      "phone": "06786-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "bhadrak-bonth-chc",
      "name": "Community Health Centre (CHC) Bonth",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବନ୍ତ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बंत",
      "lat": 21.1412,
      "lng": 86.3412,
      "district": "bhadrak",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bonth Bazaar - 756114",
      "phone": "06784-268210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "jajpur-mch",
      "name": "Jajpur Government Medical College & Hospital (MCH Jajpur)",
      "nameOr": "ଯାଜପୁର ସରକାରୀ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, ଯାଜପୁର",
      "nameHi": "जाजपुर सरकारी मेडिकल कॉलेज व अस्पताल",
      "lat": 20.8521,
      "lng": 86.3312,
      "district": "jajpur",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Ankula, Jajpur Town - 755001",
      "phone": "06728-222055",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Centre"
    },
    {
      "id": "jajpur-dhh",
      "name": "District Headquarters Hospital (DHH) Jajpur Town",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଯାଜପୁର ଟାଉନ୍",
      "nameHi": "जिला मुख्य अस्पताल (DHH), जाजपुर टाउन",
      "lat": 20.8497,
      "lng": 86.3353,
      "district": "jajpur",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Biraja Temple, Jajpur Town - 755001",
      "phone": "06728-222045",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Inpatient"
    },
    {
      "id": "jajpur-vyasanagar-sdh",
      "name": "Sub-Divisional Hospital (SDH) Vyasanagar (Jajpur Road)",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ବ୍ୟାସନଗର (ଯାଜପୁର ରୋଡ଼)",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), व्यासनगर (जाजपुर रोड)",
      "lat": 20.9521,
      "lng": 86.1342,
      "district": "jajpur",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Station Road, Vyasanagar - 755019",
      "phone": "06726-220220",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial & Railway Trauma"
    },
    {
      "id": "jajpur-sukinda-chc",
      "name": "Community Health Centre (CHC) Sukinda (Mining Belt)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସୁକିନ୍ଦା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सुकिंदा",
      "lat": 20.9741,
      "lng": 85.9124,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chromite Mining Area, Sukinda - 755018",
      "phone": "06726-241215",
      "emergencyPhone": "108",
      "casualty": "24x7 Mining Trauma & Poisoning Emergency"
    },
    {
      "id": "jajpur-danagadi-chc",
      "name": "Community Health Centre (CHC) Danagadi (Kalinganagar)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଦାନଗଦୀ (କଳିଙ୍ଗନଗର)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), दानगदी (कलिंगनगर)",
      "lat": 20.9412,
      "lng": 86.0421,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kalinganagar Industrial Complex - 755026",
      "phone": "06726-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Steel Plant Emergency & Trauma"
    },
    {
      "id": "jajpur-dharmasala-chc",
      "name": "Community Health Centre (CHC) Dharmasala",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଧର୍ମଶାଳା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), धर्मशाला",
      "lat": 20.8214,
      "lng": 86.1742,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Jaraka, Dharmasala - 755050",
      "phone": "06728-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 NH-16 Highway Emergency"
    },
    {
      "id": "jajpur-chandikhole-chc",
      "name": "Community Health Centre (CHC) Chandikhole",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚଣ୍ଡୀଖୋଲ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चंडीखोल",
      "lat": 20.6984,
      "lng": 86.1542,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16 / NH-53 Junction, Chandikhole - 755044",
      "phone": "06725-226210",
      "emergencyPhone": "108",
      "casualty": "24x7 Major Highway Trauma Center"
    },
    {
      "id": "jajpur-binjharpur-chc",
      "name": "Community Health Centre (CHC) Binjharpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବିଂଝାରପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बिंझारपुर",
      "lat": 20.8241,
      "lng": 86.4521,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Binjharpur Town - 755004",
      "phone": "06728-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "jajpur-bari-chc",
      "name": "Community Health Centre (CHC) Bari",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବରୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बरी",
      "lat": 20.7241,
      "lng": 86.3892,
      "district": "jajpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bari Ramachandrapur - 755003",
      "phone": "06728-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "kendrapara-dhh",
      "name": "District Headquarters Hospital (DHH) Kendrapara",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), କେନ୍ଦ୍ରାପଡ଼ା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), केंद्रपड़ा",
      "lat": 20.4996,
      "lng": 86.4253,
      "district": "kendrapara",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Garapur, Kendrapara - 754211",
      "phone": "06727-232145",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Dialysis Unit"
    },
    {
      "id": "kendrapara-pattamundai-sdh",
      "name": "Sub-Divisional Hospital (SDH) Pattamundai",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ପଟ୍ଟାମୁଣ୍ଡାଇ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), पट्टामुंडाई",
      "lat": 20.5752,
      "lng": 86.5641,
      "district": "kendrapara",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Brahmani Bridge Road, Pattamundai - 754215",
      "phone": "06727-242220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency & Maternity"
    },
    {
      "id": "kendrapara-aul-sdh",
      "name": "Sub-Divisional Hospital (SDH) Aul",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଆଳି",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), आलि",
      "lat": 20.6741,
      "lng": 86.6421,
      "district": "kendrapara",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Aul Bazaar - 754219",
      "phone": "06727-247215",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "kendrapara-rajkanika-chc",
      "name": "Community Health Centre (CHC) Rajkanika",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାଜକନିକା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), राजकनिका",
      "lat": 20.7641,
      "lng": 86.7214,
      "district": "kendrapara",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Rajkanika Town - 754220",
      "phone": "06727-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal & Rural Emergency"
    },
    {
      "id": "kendrapara-rajnagar-chc",
      "name": "Community Health Centre (CHC) Rajnagar (Bhitarkanika)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାଜନଗର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), राजनगर (भीतरकनिका)",
      "lat": 20.5841,
      "lng": 86.8642,
      "district": "kendrapara",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Gateway to Bhitarkanika, Rajnagar - 754225",
      "phone": "06727-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal & Marine Emergency"
    },
    {
      "id": "kendrapara-mahakalapada-chc",
      "name": "Community Health Centre (CHC) Mahakalapada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମହାକାଳପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), महाकालपड़ा",
      "lat": 20.4284,
      "lng": 86.5891,
      "district": "kendrapara",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Mahakalapada Town - 754224",
      "phone": "06727-256210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Emergency"
    },
    {
      "id": "kendrapara-marshaghai-chc",
      "name": "Community Health Centre (CHC) Marshaghai",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମାର୍ଶାଘାଇ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मारिशाघाई",
      "lat": 20.4521,
      "lng": 86.4912,
      "district": "kendrapara",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Cuttack-Chandbali Road, Marshaghai - 754213",
      "phone": "06727-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "kendrapara-derabish-chc",
      "name": "Community Health Centre (CHC) Derabish",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଡେରାବିଶ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), डेराबीश",
      "lat": 20.5142,
      "lng": 86.3214,
      "district": "kendrapara",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Derabish Bazaar - 754250",
      "phone": "06727-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "jagatsinghpur-dhh",
      "name": "District Headquarters Hospital (DHH) Jagatsinghpur",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଜଗତସିଂହପୁର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), जगतसिंहपुर",
      "lat": 20.2575,
      "lng": 86.1683,
      "district": "jagatsinghpur",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Hospital Road, Jagatsinghpur - 754103",
      "phone": "06724-220045",
      "emergencyPhone": "108",
      "casualty": "24x7 Casualty & Trauma Unit"
    },
    {
      "id": "jagatsinghpur-paradeep-sdh",
      "name": "Biju Memorial Sub-Divisional Hospital (SDH) Paradeep",
      "nameOr": "ବିଜୁ ମେମୋରିଆଲ୍ ହସ୍ପିଟାଲ୍ (SDH), ପାରାଦ୍ୱୀପ",
      "nameHi": "बीजू मेमोरियल अस्पताल (SDH), पारादीप",
      "lat": 20.3164,
      "lng": 86.6114,
      "district": "jagatsinghpur",
      "type": "Port & Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Port City Area, Paradeep - 754142",
      "phone": "06722-222230",
      "emergencyPhone": "108",
      "casualty": "24x7 Port, Marine & Chemical Trauma Centre"
    },
    {
      "id": "jagatsinghpur-tirtol-chc",
      "name": "Community Health Centre (CHC) Tirtol",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତିର୍ତ୍ତୋଲ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तिर्तोल",
      "lat": 20.3124,
      "lng": 86.3241,
      "district": "jagatsinghpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Cuttack-Paradeep Road, Tirtol - 754137",
      "phone": "06722-231215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Emergency"
    },
    {
      "id": "jagatsinghpur-kujang-chc",
      "name": "Community Health Centre (CHC) Kujang",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୁଜଙ୍ଗ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कुजंग",
      "lat": 20.3184,
      "lng": 86.5342,
      "district": "jagatsinghpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kujang Town - 754141",
      "phone": "06722-234210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care"
    },
    {
      "id": "jagatsinghpur-balikuda-chc",
      "name": "Community Health Centre (CHC) Balikuda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଲିକୁଦା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बालिकुदा",
      "lat": 20.1421,
      "lng": 86.3421,
      "district": "jagatsinghpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Balikuda Bazaar - 754108",
      "phone": "06724-234215",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Rural Emergency"
    },
    {
      "id": "jagatsinghpur-naugaon-chc",
      "name": "Community Health Centre (CHC) Naugaon",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନାଉଗାଁ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), नाउगांव",
      "lat": 20.1842,
      "lng": 86.2412,
      "district": "jagatsinghpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Naugaon Hat - 754113",
      "phone": "06724-237210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "jagatsinghpur-ersama-chc",
      "name": "Community Health Centre (CHC) Ersama",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଏରସମା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), एरसमा",
      "lat": 20.1742,
      "lng": 86.6124,
      "district": "jagatsinghpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Coastal Belt, Ersama - 754139",
      "phone": "06722-238210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Cyclone Resilience Emergency"
    },
    {
      "id": "puri-sjmch",
      "name": "Shri Jagannath Medical College & Hospital (SJMCH Puri)",
      "nameOr": "ଶ୍ରୀ ଜଗନ୍ନାଥ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ (SJMCH), ପୁରୀ",
      "nameHi": "श्री जगन्नाथ मेडिकल कॉलेज व अस्पताल (SJMCH), पुरी",
      "lat": 19.8242,
      "lng": 85.8451,
      "district": "puri",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Samanga, Puri - 752002",
      "phone": "06752-252100",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Centre"
    },
    {
      "id": "puri-dhh",
      "name": "District Headquarters Hospital (DHH) Puri",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ପୁରୀ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), पुरी",
      "lat": 19.8135,
      "lng": 85.8312,
      "district": "puri",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Grand Road (Badadanda), Puri - 752001",
      "phone": "06752-222045",
      "emergencyPhone": "108",
      "casualty": "24x7 Pilgrim Emergency & Casualty Unit"
    },
    {
      "id": "puri-konark-chc",
      "name": "Community Health Centre (CHC) Konark (Sun Temple Hub)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଣାର୍କ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोणार्क",
      "lat": 19.8965,
      "lng": 86.0942,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Main Road, Konark - 752111",
      "phone": "06758-236220",
      "emergencyPhone": "108",
      "casualty": "24x7 Tourist & Coastal Emergency Desk"
    },
    {
      "id": "puri-pipili-chc",
      "name": "Community Health Centre (CHC) Pipili",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପିପିଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पिपिली",
      "lat": 20.1142,
      "lng": 85.8312,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-316, Pipili - 752104",
      "phone": "06758-240215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency & Maternity"
    },
    {
      "id": "puri-nimapara-chc",
      "name": "Community Health Centre (CHC) Nimapara",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନିମାପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), निमापड़ा",
      "lat": 20.0612,
      "lng": 86.0124,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Nimapara Town - 752106",
      "phone": "06758-243220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "puri-delanga-chc",
      "name": "Community Health Centre (CHC) Delanga",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଡେଲାଙ୍ଗ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), डेलंग",
      "lat": 20.0342,
      "lng": 85.7512,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Delanga Bazaar - 752015",
      "phone": "06758-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "puri-brahmagiri-chc",
      "name": "Community Health Centre (CHC) Brahmagiri (Alarnath)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବ୍ରହ୍ମଗିରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), ब्रह्मगिरि",
      "lat": 19.7984,
      "lng": 85.6642,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Alarnath Road, Brahmagiri - 752011",
      "phone": "06752-237210",
      "emergencyPhone": "108",
      "casualty": "24x7 Pilgrim & Coastal Emergency"
    },
    {
      "id": "puri-kakatpur-chc",
      "name": "Community Health Centre (CHC) Kakatpur (Mangala Temple)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କାକଟପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), काकटपुर",
      "lat": 20.0124,
      "lng": 86.2041,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Temple Road, Kakatpur - 752108",
      "phone": "06758-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "puri-satyabadi-chc",
      "name": "Community Health Centre (CHC) Satyabadi (Sakhigopal)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସତ୍ୟବାଦୀ (ସାକ୍ଷୀଗୋପାଳ)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सत्यवादी (साक्षीगोपाल)",
      "lat": 19.9542,
      "lng": 85.8214,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Sakhigopal Town - 752014",
      "phone": "06752-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care"
    },
    {
      "id": "puri-gop-chc",
      "name": "Community Health Centre (CHC) Gop",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗୋପ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गोप",
      "lat": 19.9984,
      "lng": 86.0124,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Gop Bazaar - 752110",
      "phone": "06758-246210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "puri-krushnaprasad-chc",
      "name": "Community Health Centre (CHC) Krushnaprasad (Chilika Island)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୃଷ୍ଣପ୍ରସାଦ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कृष्णप्रसाद",
      "lat": 19.6841,
      "lng": 85.3982,
      "district": "puri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chilika Island Belt, Krushnaprasad - 752030",
      "phone": "06752-259210",
      "emergencyPhone": "108",
      "casualty": "24x7 Island Rural Emergency Care"
    },
    {
      "id": "ganjam-mkcg",
      "name": "MKCG Medical College & Hospital Berhampur",
      "nameOr": "ଏମକେସିଜି ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, ବ୍ରହ୍ମପୁର (MKCG)",
      "nameHi": "एमकेसीजी मेडिकल कॉलेज व अस्पताल, ब्रह्मपुर (MKCG)",
      "lat": 19.3093,
      "lng": 84.8091,
      "district": "ganjam",
      "type": "Premier Medical College & Super-Specialty",
      "category": "mch",
      "address": "Medical College Road, Berhampur - 760004",
      "phone": "0680-2292746",
      "emergencyPhone": "108",
      "casualty": "24x7 South Odisha Apex Trauma Centre & ICU"
    },
    {
      "id": "ganjam-city-berhampur",
      "name": "City Hospital Berhampur",
      "nameOr": "ସିଟି ହସ୍ପିଟାଲ, ବ୍ରହ୍ମପୁର",
      "nameHi": "सिटी अस्पताल, ब्रह्मपुर",
      "lat": 19.3142,
      "lng": 84.7912,
      "district": "ganjam",
      "type": "Sub-Divisional & Urban Hospital",
      "category": "sdh",
      "address": "Old Bus Stand, Berhampur - 760001",
      "phone": "0680-2220410",
      "emergencyPhone": "108",
      "casualty": "24x7 Urban Emergency & Maternity"
    },
    {
      "id": "ganjam-dhh-chatrapur",
      "name": "District Headquarters Hospital (DHH) Chatrapur",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଛତ୍ରପୁର, ଗଞ୍ଜାମ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), छत्रपुर, गंजाम",
      "lat": 19.3564,
      "lng": 84.9912,
      "district": "ganjam",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Collectorate, Chatrapur - 761020",
      "phone": "06811-262235",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Ward"
    },
    {
      "id": "ganjam-bhanjanagar-sdh",
      "name": "Sub-Divisional Hospital (SDH) Bhanjanagar",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଭଞ୍ଜନଗର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), भंजनगर",
      "lat": 19.9312,
      "lng": 84.5824,
      "district": "ganjam",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Bhanjanagar - 761126",
      "phone": "06821-240224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Blood Bank"
    },
    {
      "id": "ganjam-aska-sdh",
      "name": "Sub-Divisional Hospital (SDH) Aska",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଆସିକା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), आसिका",
      "lat": 19.6084,
      "lng": 84.6612,
      "district": "ganjam",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Sugar Mill Road, Aska - 761110",
      "phone": "06822-273215",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Inpatient"
    },
    {
      "id": "ganjam-hinjilicut-sdh",
      "name": "Sub-Divisional Hospital (SDH) Hinjilicut",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ହିଞ୍ଜିଳିକାଟୁ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), हिंजिलीकाटु",
      "lat": 19.4812,
      "lng": 84.7412,
      "district": "ganjam",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Main Road, Hinjilicut - 761102",
      "phone": "06811-280220",
      "emergencyPhone": "108",
      "casualty": "24x7 Modern Emergency & Dialysis"
    },
    {
      "id": "ganjam-polasara-chc",
      "name": "Community Health Centre (CHC) Polasara",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପୋଲସରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पोलसरा",
      "lat": 19.7041,
      "lng": 84.8142,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Polasara Bazaar - 761105",
      "phone": "06821-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "ganjam-bellaguntha-chc",
      "name": "Community Health Centre (CHC) Bellaguntha",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବେଲଗୁଣ୍ଠା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बेलगुंठा",
      "lat": 19.8812,
      "lng": 84.6412,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bellaguntha Town - 761119",
      "phone": "06821-257210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "ganjam-digapahandi-chc",
      "name": "Community Health Centre (CHC) Digapahandi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଦିଗପହଣ୍ଡି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), दिगपहंडी",
      "lat": 19.2142,
      "lng": 84.5741,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Digapahandi Town - 761012",
      "phone": "06814-246210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "ganjam-khallikote-chc",
      "name": "Community Health Centre (CHC) Khallikote",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଖଲ୍ଲିକୋଟ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), खल्लिकोट",
      "lat": 19.6142,
      "lng": 85.0841,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-16, Khallikote - 761030",
      "phone": "06810-256210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "ganjam-purushottampur-chc",
      "name": "Community Health Centre (CHC) Purushottampur (Tara Tarini)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପୁରୁଷୋତ୍ତମପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पुरुषोत्तमपुर",
      "lat": 19.5241,
      "lng": 84.8912,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Tara Tarini Junction, Purushottampur - 761018",
      "phone": "06811-274210",
      "emergencyPhone": "108",
      "casualty": "24x7 Pilgrim & Rural Emergency"
    },
    {
      "id": "ganjam-sanakhemundi-chc",
      "name": "Community Health Centre (CHC) Sanakhemundi (Adapada)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସାନଖେମୁଣ୍ଡି (ଆଡ଼ପଡ଼ା)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सानखेमुंडी",
      "lat": 19.3421,
      "lng": 84.5891,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Adapada, Sanakhemundi - 761011",
      "phone": "06814-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "ganjam-chikiti-chc",
      "name": "Community Health Centre (CHC) Chikiti",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚିକିଟି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चिकिटी",
      "lat": 19.2041,
      "lng": 84.6214,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chikiti Town - 761010",
      "phone": "0680-264210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "ganjam-buguda-chc",
      "name": "Community Health Centre (CHC) Buguda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବୁଗୁଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बुगुड़ा",
      "lat": 19.8112,
      "lng": 84.7912,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Buguda NAC Town - 761118",
      "phone": "06821-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Trauma Care"
    },
    {
      "id": "ganjam-kodala-chc",
      "name": "Community Health Centre (CHC) Kodala",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଦଳା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोदला",
      "lat": 19.6312,
      "lng": 84.9412,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kodala NAC Town - 761032",
      "phone": "06811-253210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Delivery Centre"
    },
    {
      "id": "ganjam-kabisuryanagar-chc",
      "name": "Community Health Centre (CHC) Kabi Surya Nagar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କବିସୂର୍ଯ୍ୟନଗର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कविसूर्यनगर",
      "lat": 19.5812,
      "lng": 84.7812,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kabi Surya Nagar NAC - 761104",
      "phone": "06811-260210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Services & Maternity"
    },
    {
      "id": "ganjam-surada-chc",
      "name": "Community Health Centre (CHC) Surada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସୁରଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सुरडा",
      "lat": 19.7541,
      "lng": 84.4312,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Surada NAC Town - 761108",
      "phone": "06821-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency & Rural Care"
    },
    {
      "id": "ganjam-town-chc",
      "name": "Community Health Centre (CHC) Ganjam Town",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗଞ୍ଜାମ ସହର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गंजम टाउन",
      "lat": 19.3812,
      "lng": 85.0512,
      "district": "ganjam",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Ganjam NAC Town, Rushikulya - 761026",
      "phone": "06811-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Coastal Emergency & Accident Trauma"
    },
    {
      "id": "gajapati-dhh",
      "name": "District Headquarters Hospital (DHH) Paralakhemundi",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ପାରଳାଖେମୁଣ୍ଡି, ଗଜପତି",
      "nameHi": "जिला मुख्य अस्पताल (DHH), पारलाखेमुंडी, गजपति",
      "lat": 18.7758,
      "lng": 84.0908,
      "district": "gajapati",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Palace Street, Paralakhemundi - 761200",
      "phone": "06815-222340",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Emergency & Maternity Ward"
    },
    {
      "id": "gajapati-mohana-chc",
      "name": "Community Health Centre (CHC) Mohana",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମୋହନା, ଗଜପତି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मोहना, गजपति",
      "lat": 19.4284,
      "lng": 84.2712,
      "district": "gajapati",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-326, Mohana - 761015",
      "phone": "06816-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Ghat Road Emergency & Tribal Health Unit"
    },
    {
      "id": "gajapati-rudayagiri-chc",
      "name": "Community Health Centre (CHC) R.Udayagiri",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଆର୍. ଉଦୟଗିରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), आर.उदयगिरि",
      "lat": 19.1641,
      "lng": 84.1412,
      "district": "gajapati",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "R.Udayagiri Town - 761016",
      "phone": "06816-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Belt Emergency & Inpatient"
    },
    {
      "id": "gajapati-kashinagar-chc",
      "name": "Community Health Centre (CHC) Kashinagar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କାଶୀନଗର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), काशीनगर",
      "lat": 18.7912,
      "lng": 83.9841,
      "district": "gajapati",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kashinagar Town - 761206",
      "phone": "06815-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Emergency Care"
    },
    {
      "id": "gajapati-rayagada-chc",
      "name": "Community Health Centre (CHC) Rayagada Gajapati",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାୟଗଡ଼ା (ଗଜପତି)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), रायगड़ा (गजपति)",
      "lat": 18.9142,
      "lng": 84.1542,
      "district": "gajapati",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Rayagada Block - 761213",
      "phone": "06815-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency Care"
    },
    {
      "id": "gajapati-nuagada-chc",
      "name": "Community Health Centre (CHC) Nuagada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନୂଆଗଡ଼, ଗଜପତି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), नुआगड़ा",
      "lat": 19.0124,
      "lng": 84.1891,
      "district": "gajapati",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Nuagada Block HQ - 761214",
      "phone": "06816-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "nayagarh-dhh",
      "name": "District Headquarters Hospital (DHH) Nayagarh",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନୟାଗଡ଼",
      "nameHi": "जिला मुख्य अस्पताल (DHH), नयागढ़",
      "lat": 20.1264,
      "lng": 85.1065,
      "district": "nayagarh",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "College Road, Nayagarh - 752069",
      "phone": "06753-252245",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Ward"
    },
    {
      "id": "nayagarh-daspalla-sdh",
      "name": "Sub-Divisional Hospital (SDH) Daspalla",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଦଶପଲ୍ଲା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), दशपल्ला",
      "lat": 20.3412,
      "lng": 84.8542,
      "district": "nayagarh",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "NH-57, Daspalla - 752084",
      "phone": "06757-220220",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency & Maternity"
    },
    {
      "id": "nayagarh-odagaon-chc",
      "name": "Community Health Centre (CHC) Odagaon (Raghunath Temple)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଓଡ଼ଗାଁ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), ओड़गांव",
      "lat": 19.9892,
      "lng": 85.0124,
      "district": "nayagarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Temple Town, Odagaon - 752090",
      "phone": "06753-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Pilgrim & Rural Emergency Care"
    },
    {
      "id": "nayagarh-ranpur-chc",
      "name": "Community Health Centre (CHC) Ranpur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରଣପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), रणपुर",
      "lat": 20.0612,
      "lng": 85.3421,
      "district": "nayagarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Ranpur Rajbati Road - 752026",
      "phone": "06753-246210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "nayagarh-khandapada-chc",
      "name": "Community Health Centre (CHC) Khandapada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଖଣ୍ଡପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), खंडपड़ा",
      "lat": 20.2641,
      "lng": 85.1842,
      "district": "nayagarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Khandapada Town - 752077",
      "phone": "06757-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward"
    },
    {
      "id": "nayagarh-bhapur-chc",
      "name": "Community Health Centre (CHC) Bhapur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭାପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भापुर",
      "lat": 20.2891,
      "lng": 85.3124,
      "district": "nayagarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bhapur Bazaar - 752063",
      "phone": "06757-235210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "nayagarh-gania-chc",
      "name": "Community Health Centre (CHC) Gania",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗଣିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गणिआ",
      "lat": 20.3842,
      "lng": 84.9741,
      "district": "nayagarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near Satkosia Gorge, Gania - 752085",
      "phone": "06757-238210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency & Snakebite Care"
    },
    {
      "id": "dhenkanal-dhh",
      "name": "District Headquarters Hospital (DHH) Dhenkanal",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଢେଙ୍କାନାଳ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), ढेंकानाल",
      "lat": 20.6628,
      "lng": 85.5986,
      "district": "dhenkanal",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Stadium, Dhenkanal - 759001",
      "phone": "06762-225245",
      "emergencyPhone": "108",
      "casualty": "24x7 Trauma Unit & Emergency Ward"
    },
    {
      "id": "dhenkanal-kamakhyanagar-sdh",
      "name": "Sub-Divisional Hospital (SDH) Kamakhyanagar",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), କାମାକ୍ଷାନଗର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), कामाख्यानगर",
      "lat": 20.9312,
      "lng": 85.5642,
      "district": "dhenkanal",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Kamakhyanagar - 759018",
      "phone": "06769-270220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Maternity"
    },
    {
      "id": "dhenkanal-hindol-sdh",
      "name": "Sub-Divisional Hospital (SDH) Hindol",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ହିନ୍ଦୋଳ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), हिन्दोल",
      "lat": 20.6084,
      "lng": 85.2041,
      "district": "dhenkanal",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hindol Town - 759022",
      "phone": "06762-236215",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Inpatient"
    },
    {
      "id": "dhenkanal-bhuban-chc",
      "name": "Community Health Centre (CHC) Bhuban",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭୁବନ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भुबन",
      "lat": 20.8841,
      "lng": 85.8342,
      "district": "dhenkanal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bhuban Town - 759017",
      "phone": "06769-272210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "dhenkanal-gondia-chc",
      "name": "Community Health Centre (CHC) Gondia",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗନ୍ଦିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गोंदिया",
      "lat": 20.7342,
      "lng": 85.7312,
      "district": "dhenkanal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Gondia Block HQ - 759016",
      "phone": "06762-241210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "dhenkanal-odapada-chc",
      "name": "Community Health Centre (CHC) Odapada (Hindol Road)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଓଡ଼ାପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), ओड़ापड़ा",
      "lat": 20.7124,
      "lng": 85.4521,
      "district": "dhenkanal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-55, Odapada - 759019",
      "phone": "06762-244210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "dhenkanal-parjang-chc",
      "name": "Community Health Centre (CHC) Parjang",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପରଜଙ୍ଗ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), परजंग",
      "lat": 20.9741,
      "lng": 85.3421,
      "district": "dhenkanal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Parjang Town - 759120",
      "phone": "06769-275210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "angul-dhh",
      "name": "District Headquarters Hospital (DHH) Angul",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଅନୁଗୋଳ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), अनुगुल",
      "lat": 20.8398,
      "lng": 85.1011,
      "district": "angul",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Amalapada, Angul - 759122",
      "phone": "06764-230345",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Trauma, ICU & Casualty"
    },
    {
      "id": "angul-talcher-sdh",
      "name": "Sub-Divisional Hospital (SDH) Talcher (Coal Capital)",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ତାଳଚେର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), तालचेर",
      "lat": 20.9512,
      "lng": 85.2184,
      "district": "angul",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hatatota, Talcher - 759100",
      "phone": "06760-240224",
      "emergencyPhone": "108",
      "casualty": "24x7 Coalfield Trauma & Emergency"
    },
    {
      "id": "angul-pallahara-sdh",
      "name": "Sub-Divisional Hospital (SDH) Pallahara",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ପାଲଲହଡ଼ା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), पाललहड़ा",
      "lat": 21.4312,
      "lng": 85.1842,
      "district": "angul",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "NH-49, Pallahara - 759119",
      "phone": "06765-276220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "angul-athamallik-sdh",
      "name": "Sub-Divisional Hospital (SDH) Athamallik",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ଆଠମଲ୍ଲିକ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), आठमल्लिक",
      "lat": 20.7184,
      "lng": 84.5412,
      "district": "angul",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Athamallik - 759125",
      "phone": "06763-254220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Inpatient"
    },
    {
      "id": "angul-banarpal-chc",
      "name": "Community Health Centre (CHC) Banarpal (NALCO Belt)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବଅଁରପାଳ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बंअरपाल",
      "lat": 20.8841,
      "lng": 85.1842,
      "district": "angul",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-55, Banarpal - 759128",
      "phone": "06764-252210",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Emergency"
    },
    {
      "id": "angul-chendipada-chc",
      "name": "Community Health Centre (CHC) Chendipada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଛେଣ୍ଡିପଦା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), छेंडीपदा",
      "lat": 21.0841,
      "lng": 84.8741,
      "district": "angul",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chendipada Town - 759124",
      "phone": "06764-257210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "angul-kishorenagar-chc",
      "name": "Community Health Centre (CHC) Kishorenagar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କିଶୋରନଗର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), किशोरनगर",
      "lat": 20.9124,
      "lng": 84.5891,
      "district": "angul",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-55, Kishorenagar - 759126",
      "phone": "06763-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "angul-kaniha-chc",
      "name": "Community Health Centre (CHC) Kaniha (NTPC)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କଣିହାଁ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कणिहा",
      "lat": 21.0841,
      "lng": 85.1412,
      "district": "angul",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Near NTPC Super Thermal, Kaniha - 759117",
      "phone": "06760-264210",
      "emergencyPhone": "108",
      "casualty": "24x7 Power Plant Belt Emergency"
    },
    {
      "id": "sambalpur-vimsar",
      "name": "VIMSAR Burla (Veer Surendra Sai Medical College)",
      "nameOr": "ଭିମସାର ବୁର୍ଲା (VIMSAR Medical College, Burla)",
      "nameHi": "विमसार बुर्ला (वीर सुरेंद्र साय मेडिकल कॉलेज)",
      "lat": 21.4984,
      "lng": 83.8741,
      "district": "sambalpur",
      "type": "Western Odisha Premier Medical College & Super-Specialty",
      "category": "mch",
      "address": "Burla, Sambalpur - 768017",
      "phone": "0663-2430768",
      "emergencyPhone": "108",
      "casualty": "24x7 Apex Super-Specialty Trauma & Emergency"
    },
    {
      "id": "sambalpur-dhh",
      "name": "District Headquarters Hospital (DHH) Sambalpur",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ସମ୍ବଲପୁର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), सम्बलपुर",
      "lat": 21.4682,
      "lng": 83.9784,
      "district": "sambalpur",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Modipara, Sambalpur - 768002",
      "phone": "0663-2400340",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Dialysis"
    },
    {
      "id": "sambalpur-kuchinda-sdh",
      "name": "Sub-Divisional Hospital (SDH) Kuchinda",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), କୁଚିଣ୍ଡା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), कुचिंडा",
      "lat": 21.7342,
      "lng": 84.3412,
      "district": "sambalpur",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Kuchinda - 768222",
      "phone": "06642-220220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency & Maternity Wing"
    },
    {
      "id": "sambalpur-rairakhol-sdh",
      "name": "Sub-Divisional Hospital (SDH) Rairakhol",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ରେଢ଼ାଖୋଲ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), रेढ़ाखोल",
      "lat": 21.0641,
      "lng": 84.3412,
      "district": "sambalpur",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "NH-55, Rairakhol - 768106",
      "phone": "06644-253220",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Emergency"
    },
    {
      "id": "sambalpur-jamankira-chc",
      "name": "Community Health Centre (CHC) Jamankira",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜମନକିରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जमनकिरा",
      "lat": 21.5641,
      "lng": 84.3892,
      "district": "sambalpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-49, Jamankira - 768107",
      "phone": "06642-234210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "sambalpur-jujumura-chc",
      "name": "Community Health Centre (CHC) Jujumura",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜୁଜୁମୁରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जुजुमुरा",
      "lat": 21.3124,
      "lng": 84.1542,
      "district": "sambalpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-55, Jujumura - 768105",
      "phone": "0663-256210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "sambalpur-dhankauda-chc",
      "name": "Community Health Centre (CHC) Dhankauda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଧନକଉଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), धनकउड़ा",
      "lat": 21.5124,
      "lng": 83.9841,
      "district": "sambalpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Dhankauda Block HQ - 768006",
      "phone": "0663-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward"
    },
    {
      "id": "sambalpur-bamra-chc",
      "name": "Community Health Centre (CHC) Bamra",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାମରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बामरा",
      "lat": 22.0641,
      "lng": 84.2891,
      "district": "sambalpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Station Road, Bamra - 768221",
      "phone": "06642-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Railway & Rural Emergency"
    },
    {
      "id": "sundargarh-gmc",
      "name": "Government Medical College & Hospital Sundargarh",
      "nameOr": "ସରକାରୀ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, ସୁନ୍ଦରଗଡ଼",
      "nameHi": "सरकारी मेडिकल कॉलेज व अस्पताल, सुंदरगढ़",
      "lat": 22.1241,
      "lng": 84.0341,
      "district": "sundargarh",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Chhatabar, Sundargarh - 770001",
      "phone": "06622-273220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma ICU"
    },
    {
      "id": "sundargarh-igh-rourkela",
      "name": "Ispat General Hospital (IGH) Rourkela",
      "nameOr": "ଇସ୍ପାତ ଜେନେରାଲ ହସ୍ପିଟାଲ (IGH), ରାଉରକେଲା",
      "nameHi": "इस्पात जनरल अस्पताल (IGH), राउरकेला",
      "lat": 22.2541,
      "lng": 84.8584,
      "district": "sundargarh",
      "type": "Apex Steel Plant Super-Specialty Hospital",
      "category": "mch",
      "address": "Sector-19, Rourkela - 769005",
      "phone": "0661-2510200",
      "emergencyPhone": "108",
      "casualty": "24x7 Burn Unit, Cardiac ICU & Multi-Specialty Trauma"
    },
    {
      "id": "sundargarh-rgh-sdh",
      "name": "Rourkela Government Hospital (RGH / SDH Panposh)",
      "nameOr": "ରାଉରକେଲା ସରକାରୀ ହସ୍ପିଟାଲ (RGH), ରାଉରକେଲା",
      "nameHi": "राउरकेला सरकारी अस्पताल (RGH), राउरकेला",
      "lat": 22.2272,
      "lng": 84.8536,
      "district": "sundargarh",
      "type": "Major Referral & Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Panposh Road, Rourkela - 769004",
      "phone": "0661-2500425",
      "emergencyPhone": "108",
      "casualty": "24x7 Apex City Trauma & Emergency Wing"
    },
    {
      "id": "sundargarh-dhh",
      "name": "District Headquarters Hospital (DHH) Sundargarh",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ସୁନ୍ଦରଗଡ଼",
      "nameHi": "जिला मुख्य अस्पताल (DHH), सुंदरगढ़",
      "lat": 22.1205,
      "lng": 84.0321,
      "district": "sundargarh",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Regent Market, Sundargarh - 770001",
      "phone": "06622-272240",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Inpatient"
    },
    {
      "id": "sundargarh-bonai-sdh",
      "name": "Sub-Divisional Hospital (SDH) Bonai",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ବଣାଇ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), बोनाई",
      "lat": 21.7542,
      "lng": 84.9741,
      "district": "sundargarh",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Bonaigarh - 770038",
      "phone": "06626-242220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "sundargarh-rajgangpur-chc",
      "name": "Community Health Centre (CHC) Rajgangpur (Dalmia Belt)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାଜଗାଙ୍ଗପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), राजगांगपुर",
      "lat": 22.1912,
      "lng": 84.5841,
      "district": "sundargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Cement Nagar Road, Rajgangpur - 770017",
      "phone": "06624-220215",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Emergency"
    },
    {
      "id": "sundargarh-koida-chc",
      "name": "Community Health Centre (CHC) Koida (Mining Valley)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଇଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोइड़ा",
      "lat": 21.9124,
      "lng": 85.1412,
      "district": "sundargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Iron Ore Belt, Koida - 770048",
      "phone": "06626-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Heavy Mining Trauma & Emergency"
    },
    {
      "id": "sundargarh-hemgir-chc",
      "name": "Community Health Centre (CHC) Hemgir (Coal Belt)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ହେମଗିରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), हेमगिर",
      "lat": 21.9412,
      "lng": 83.7124,
      "district": "sundargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "MCL Coal Area, Hemgir - 770013",
      "phone": "06621-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Mining Emergency"
    },
    {
      "id": "sundargarh-lephripada-chc",
      "name": "Community Health Centre (CHC) Lephripada",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଲେଫ୍ରିପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), लेफ्रिपड़ा",
      "lat": 22.0412,
      "lng": 83.8412,
      "district": "sundargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Lephripada Bazaar - 770012",
      "phone": "06621-236210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "sundargarh-bisra-chc",
      "name": "Community Health Centre (CHC) Bisra",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବିସ୍ରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बिसरा",
      "lat": 22.2412,
      "lng": 85.0124,
      "district": "sundargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Border Highway, Bisra - 770035",
      "phone": "0661-267210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Emergency"
    },
    {
      "id": "jharsuguda-dhh",
      "name": "District Headquarters Hospital (DHH) Jharsuguda",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଝାରସୁଗୁଡ଼ା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), झारसुगुड़ा",
      "lat": 21.854,
      "lng": 84.0084,
      "district": "jharsuguda",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Main Road, Jharsuguda - 768201",
      "phone": "06645-272340",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Trauma & Emergency Ward"
    },
    {
      "id": "jharsuguda-brajrajnagar-sdh",
      "name": "Sub-Divisional Hospital (SDH) Brajrajnagar",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ବ୍ରଜରାଜନଗର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), ब्रजराजनगर",
      "lat": 21.8241,
      "lng": 83.9214,
      "district": "jharsuguda",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Paper Mill Area, Brajrajnagar - 768216",
      "phone": "06645-242220",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial Emergency"
    },
    {
      "id": "jharsuguda-belpahar-chc",
      "name": "Community Health Centre (CHC) Belpahar (TRL)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବେଲପାହାଡ଼",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बेलपहाड़",
      "lat": 21.8124,
      "lng": 83.8542,
      "district": "jharsuguda",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Refractory Area, Belpahar - 768218",
      "phone": "06645-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial & Rural Emergency"
    },
    {
      "id": "jharsuguda-kolabira-chc",
      "name": "Community Health Centre (CHC) Kolabira",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଲାବିରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोलाबिरा",
      "lat": 21.8941,
      "lng": 84.1542,
      "district": "jharsuguda",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kolabira Block HQ - 768213",
      "phone": "06645-256210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "jharsuguda-laikera-chc",
      "name": "Community Health Centre (CHC) Laikera",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଲାଇକେରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), लाइकेरा",
      "lat": 22.0124,
      "lng": 84.0841,
      "district": "jharsuguda",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Laikera Town - 768215",
      "phone": "06645-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency Care"
    },
    {
      "id": "bargarh-dhh",
      "name": "District Headquarters Hospital (DHH) Bargarh",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବରଗଡ଼",
      "nameHi": "जिला मुख्य अस्पताल (DHH), बरगढ़",
      "lat": 21.3323,
      "lng": 83.6214,
      "district": "bargarh",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Bhatli Road, Bargarh - 768028",
      "phone": "06646-231340",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Dialysis"
    },
    {
      "id": "bargarh-padampur-sdh",
      "name": "Sub-Divisional Hospital (SDH) Padampur",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ପଦ୍ମପୁର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), पदमपुर",
      "lat": 20.9984,
      "lng": 83.0612,
      "district": "bargarh",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Rajborasambar, Padampur - 768036",
      "phone": "06683-223220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Wing"
    },
    {
      "id": "bargarh-attabira-chc",
      "name": "Community Health Centre (CHC) Attabira",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଅତାବିରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), अताबिरा",
      "lat": 21.3841,
      "lng": 83.7842,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-53, Attabira - 768027",
      "phone": "06646-244215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Emergency"
    },
    {
      "id": "bargarh-bheden-chc",
      "name": "Community Health Centre (CHC) Bheden",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭେଡ଼େନ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भेड़ेन",
      "lat": 21.2641,
      "lng": 83.7412,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bheden Block HQ - 768104",
      "phone": "06646-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "bargarh-sohela-chc",
      "name": "Community Health Centre (CHC) Sohela",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସୋହେଲା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सोहेला",
      "lat": 21.2841,
      "lng": 83.4214,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-53 Border, Sohela - 768033",
      "phone": "06685-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "bargarh-barpali-chc",
      "name": "Community Health Centre (CHC) Barpali (Weavers Hub)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବରପାଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बरपाली",
      "lat": 21.1984,
      "lng": 83.5841,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Main Road, Barpali - 768029",
      "phone": "06646-256210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Maternity"
    },
    {
      "id": "bargarh-bhatli-chc",
      "name": "Community Health Centre (CHC) Bhatli",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଭଟଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), भटली",
      "lat": 21.5124,
      "lng": 83.5412,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Dadhibaman Temple Road, Bhatli - 768030",
      "phone": "06646-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "bargarh-paikmal-chc",
      "name": "Community Health Centre (CHC) Paikmal (Nrusinghanath)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପାଇକମାଳ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पाइकमाल",
      "lat": 20.9124,
      "lng": 82.8412,
      "district": "bargarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Gandhamardan Hills, Paikmal - 768039",
      "phone": "06684-253210",
      "emergencyPhone": "108",
      "casualty": "24x7 Forest Belt & Pilgrim Emergency"
    },
    {
      "id": "balangir-bbmch",
      "name": "Bhima Bhoi Medical College & Hospital (BBMCH Balangir)",
      "nameOr": "ଭୀମ ଭୋଇ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, ବଲାଙ୍ଗୀର",
      "nameHi": "भीमा भोई मेडिकल कॉलेज व अस्पताल, बलांगीर",
      "lat": 20.7108,
      "lng": 83.4862,
      "district": "balangir",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Gandhinagar, Balangir - 767001",
      "phone": "06652-232145",
      "emergencyPhone": "108",
      "casualty": "24x7 Super-Specialty Emergency & ICU"
    },
    {
      "id": "balangir-dhh",
      "name": "District Headquarters Hospital (DHH) Balangir",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବଲାଙ୍ଗୀର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), बलांगीर",
      "lat": 20.7092,
      "lng": 83.4841,
      "district": "balangir",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Hospital Square, Balangir - 767001",
      "phone": "06652-232040",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Ward"
    },
    {
      "id": "balangir-titilagarh-sdh",
      "name": "Sub-Divisional Hospital (SDH) Titilagarh",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ତିତିଲାଗଡ଼",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), टिटिलागढ़",
      "lat": 20.2984,
      "lng": 83.1456,
      "district": "balangir",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Station Road, Titilagarh - 767033",
      "phone": "06655-220224",
      "emergencyPhone": "108",
      "casualty": "24x7 Railway Junction & Heatwave Emergency Hub"
    },
    {
      "id": "balangir-patnagarh-sdh",
      "name": "Sub-Divisional Hospital (SDH) Patnagarh",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ପାଟଣାଗଡ଼",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), पाटनागढ़",
      "lat": 20.7184,
      "lng": 83.1342,
      "district": "balangir",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Patnagarh - 767025",
      "phone": "06658-222220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Maternity"
    },
    {
      "id": "balangir-loisingha-chc",
      "name": "Community Health Centre (CHC) Loisingha",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଲୋଇସିଂହା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), लोइसिंघा",
      "lat": 20.8641,
      "lng": 83.5124,
      "district": "balangir",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-57, Loisingha - 767020",
      "phone": "06653-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "balangir-tushura-chc",
      "name": "Community Health Centre (CHC) Tushura (Gudvella)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତୁଷୁରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तुषुरा",
      "lat": 20.5412,
      "lng": 83.4521,
      "district": "balangir",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tushura Town - 767030",
      "phone": "06655-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "balangir-muribahal-chc",
      "name": "Community Health Centre (CHC) Muribahal",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମୁରିବାହାଲ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मुरीबहाल",
      "lat": 20.3641,
      "lng": 82.9841,
      "district": "balangir",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Muribahal Block - 767037",
      "phone": "06657-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "balangir-belpara-chc",
      "name": "Community Health Centre (CHC) Belpara",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବେଲପଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बेलपड़ा",
      "lat": 20.6124,
      "lng": 82.9412,
      "district": "balangir",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Belpara Town - 767026",
      "phone": "06658-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "sonepur-dhh",
      "name": "District Headquarters Hospital (DHH) Sonepur",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ସୁବର୍ଣ୍ଣପୁର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), सोनेपुर",
      "lat": 20.8378,
      "lng": 83.9168,
      "district": "sonepur",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Maharaj Bagicha, Sonepur - 767017",
      "phone": "06654-220235",
      "emergencyPhone": "108",
      "casualty": "24x7 River Confluence Emergency Care"
    },
    {
      "id": "sonepur-birmaharajpur-sdh",
      "name": "Sub-Divisional Hospital (SDH) Birmaharajpur",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଚିକିତ୍ସାଳୟ (SDH), ବୀରମହାରାଜପୁର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), बीरमहाराजपुर",
      "lat": 20.8841,
      "lng": 84.1412,
      "district": "sonepur",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Birmaharajpur - 767018",
      "phone": "06654-242220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "sonepur-tarbha-chc",
      "name": "Community Health Centre (CHC) Tarbha",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତରଭା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तरभा",
      "lat": 20.6841,
      "lng": 83.7412,
      "district": "sonepur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tarbha Town - 767016",
      "phone": "06654-252210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "sonepur-dunguripali-chc",
      "name": "Community Health Centre (CHC) Dunguripali",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଡୁଙ୍ଗୁରିପାଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), डुंगुरिपाली",
      "lat": 21.0124,
      "lng": 83.8412,
      "district": "sonepur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Station Road, Dunguripali - 767023",
      "phone": "06653-255210",
      "emergencyPhone": "108",
      "casualty": "24x7 Railway & Rural Emergency"
    },
    {
      "id": "sonepur-binika-chc",
      "name": "Community Health Centre (CHC) Binika",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବିନିକା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बिनिका",
      "lat": 21.0342,
      "lng": 83.9841,
      "district": "sonepur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Mahanadi Bank, Binika - 767019",
      "phone": "06654-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "deogarh-dhh",
      "name": "District Headquarters Hospital (DHH) Deogarh",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଦେବଗଡ଼",
      "nameHi": "जिला मुख्य अस्पताल (DHH), देवगढ़",
      "lat": 21.5367,
      "lng": 84.7336,
      "district": "deogarh",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Pradhanpat, Deogarh - 768108",
      "phone": "06641-226245",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Ward"
    },
    {
      "id": "deogarh-barkote-chc",
      "name": "Community Health Centre (CHC) Barkote",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାରକୋଟ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बारकोट",
      "lat": 21.5412,
      "lng": 84.9841,
      "district": "deogarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-49, Barkote - 768110",
      "phone": "06641-234210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "deogarh-reamal-chc",
      "name": "Community Health Centre (CHC) Reamal",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରିଆମାଳ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), रिआमाल",
      "lat": 21.3641,
      "lng": 84.7841,
      "district": "deogarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Reamal Block HQ - 768109",
      "phone": "06641-238210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "deogarh-tileibani-chc",
      "name": "Community Health Centre (CHC) Tileibani",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତିଳେଇବଣୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तिलेइबनी",
      "lat": 21.5124,
      "lng": 84.5841,
      "district": "deogarh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tileibani Block - 768119",
      "phone": "06641-241210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "boudh-dhh",
      "name": "District Headquarters Hospital (DHH) Boudh",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ବୌଦ୍ଧ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), बौद्ध",
      "lat": 20.8407,
      "lng": 84.3236,
      "district": "boudh",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Mahanadi Road, Boudh - 762014",
      "phone": "06841-222235",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Dialysis Unit"
    },
    {
      "id": "boudh-kantamal-chc",
      "name": "Community Health Centre (CHC) Kantamal",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କଣ୍ଟାମାଳ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कंटामाल",
      "lat": 20.6541,
      "lng": 83.7412,
      "district": "boudh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tel River Belt, Kantamal - 762017",
      "phone": "06841-236210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care & Maternity"
    },
    {
      "id": "boudh-harbhanga-chc",
      "name": "Community Health Centre (CHC) Harbhanga (Charichhak)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ହରଭଙ୍ଗା (ଚାରିଛକ)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), हरभङ्गा (चारिछक)",
      "lat": 20.7841,
      "lng": 84.6124,
      "district": "boudh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-57, Charichhak - 762024",
      "phone": "06841-241210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "boudh-baunsuni-chc",
      "name": "Community Health Centre (CHC) Baunsuni",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବାଉଁଶୁଣୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बाउंसुनी",
      "lat": 20.8124,
      "lng": 84.0412,
      "district": "boudh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-57, Baunsuni - 762015",
      "phone": "06841-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway & Rural Emergency"
    },
    {
      "id": "boudh-purunakatak-chc",
      "name": "Community Health Centre (CHC) Purunakatak",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପୁରୁଣାକଟକ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पुरानाकटक",
      "lat": 20.7342,
      "lng": 84.4521,
      "district": "boudh",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Purunakatak Town - 762013",
      "phone": "06841-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "kandhamal-dhh",
      "name": "District Headquarters Hospital (DHH) Phulbani",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଫୁଲବାଣୀ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), फुलबाणी",
      "lat": 20.4776,
      "lng": 84.2327,
      "district": "kandhamal",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Hospital Square, Phulbani - 762001",
      "phone": "06842-253245",
      "emergencyPhone": "108",
      "casualty": "24x7 Hill Tribe Emergency, Trauma & ICU"
    },
    {
      "id": "kandhamal-balliguda-sdh",
      "name": "Sub-Divisional Hospital (SDH) Balliguda",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ବାଲିଗୁଡ଼ା",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), बालिगुड़ा",
      "lat": 20.2184,
      "lng": 83.9124,
      "district": "kandhamal",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Main Road, Balliguda - 762103",
      "phone": "06846-243220",
      "emergencyPhone": "108",
      "casualty": "24x7 Highland Emergency & Maternity"
    },
    {
      "id": "kandhamal-gudayagiri-chc",
      "name": "Community Health Centre (CHC) G. Udayagiri",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜି. ଉଦୟଗିରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जी. उदयगिरि",
      "lat": 20.1342,
      "lng": 84.3841,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "G. Udayagiri Town - 762100",
      "phone": "06847-260215",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Health Emergency"
    },
    {
      "id": "kandhamal-daringbadi-chc",
      "name": "Community Health Centre (CHC) Daringbadi (Hill Station)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଦାରିଙ୍ଗବାଡ଼ି (କାଶ୍ମୀର ଅଫ୍ ଓଡ଼ିଶା)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), दारिंगबाड़ी (हिल स्टेशन)",
      "lat": 19.9124,
      "lng": 84.1342,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Hill Station HQ, Daringbadi - 762104",
      "phone": "06847-264210",
      "emergencyPhone": "108",
      "casualty": "24x7 Eco-Tourism & Hill Emergency Care"
    },
    {
      "id": "kandhamal-tikabali-chc",
      "name": "Community Health Centre (CHC) Tikabali",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଟିକାବାଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), टिटाबाली",
      "lat": 20.2841,
      "lng": 84.3412,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tikabali Bazaar - 762010",
      "phone": "06847-267210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "kandhamal-raikia-chc",
      "name": "Community Health Centre (CHC) Raikia",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାଇକିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), राइकिआ",
      "lat": 20.0641,
      "lng": 84.2412,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Raikia Town - 762101",
      "phone": "06847-271210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Room"
    },
    {
      "id": "kandhamal-kotagarh-chc",
      "name": "Community Health Centre (CHC) Kotagarh",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଟଗଡ଼",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोटगढ़",
      "lat": 19.8841,
      "lng": 83.8412,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Kotagarh Block - 762105",
      "phone": "06846-265210",
      "emergencyPhone": "108",
      "casualty": "24x7 Deep Forest Belt Emergency"
    },
    {
      "id": "kandhamal-tumudibandha-chc",
      "name": "Community Health Centre (CHC) Tumudibandha",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତୁମୁଡ଼ିବନ୍ଧ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तुमुड़ीबंध",
      "lat": 19.9542,
      "lng": 83.7124,
      "district": "kandhamal",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tumudibandha Town - 762107",
      "phone": "06846-268210",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Primary Emergency"
    },
    {
      "id": "kalahandi-gmc",
      "name": "Government Medical College & Hospital Kalahandi (GMC Bhawanipatna)",
      "nameOr": "ସରକାରୀ ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, କଳାହାଣ୍ଡି (ଭବାନୀପାଟଣା)",
      "nameHi": "सरकारी मेडिकल कॉलेज व अस्पताल, कालाहांडी (भवानीपटना)",
      "lat": 19.9075,
      "lng": 83.1659,
      "district": "kalahandi",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Bhawanipatna - 766001",
      "phone": "06670-230450",
      "emergencyPhone": "108",
      "casualty": "24x7 Multi-Specialty Emergency & ICU"
    },
    {
      "id": "kalahandi-dhh",
      "name": "District Headquarters Hospital (DHH) Kalahandi",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ଭବାନୀପାଟଣା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), भवानीपटना",
      "lat": 19.9054,
      "lng": 83.1641,
      "district": "kalahandi",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Hospital Square, Bhawanipatna - 766001",
      "phone": "06670-230340",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Trauma Ward"
    },
    {
      "id": "kalahandi-dharamgarh-sdh",
      "name": "Sub-Divisional Hospital (SDH) Dharamgarh",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଧର୍ମଗଡ଼",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), धरमगढ़",
      "lat": 19.8641,
      "lng": 82.7841,
      "district": "kalahandi",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Road, Dharamgarh - 766015",
      "phone": "06672-242220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Maternity"
    },
    {
      "id": "kalahandi-junagarh-chc",
      "name": "Community Health Centre (CHC) Junagarh",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜୁନାଗଡ଼",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जूनागढ़",
      "lat": 19.8612,
      "lng": 82.9341,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-26, Junagarh - 766014",
      "phone": "06672-245215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "kalahandi-jaipatna-chc",
      "name": "Community Health Centre (CHC) Jaipatna (Indravati Hub)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଜୟପାଟଣା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), जयपटना",
      "lat": 19.4641,
      "lng": 82.8124,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Indravati Dam Road, Jaipatna - 766018",
      "phone": "06673-232210",
      "emergencyPhone": "108",
      "casualty": "24x7 Hydro Belt & Rural Emergency"
    },
    {
      "id": "kalahandi-kesinga-chc",
      "name": "Community Health Centre (CHC) Kesinga",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କେସିଙ୍ଗା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), केसिंगा",
      "lat": 20.2041,
      "lng": 83.2241,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Station Road, Kesinga - 766012",
      "phone": "06670-252210",
      "emergencyPhone": "108",
      "casualty": "24x7 Railway & Highway Trauma"
    },
    {
      "id": "kalahandi-koksara-chc",
      "name": "Community Health Centre (CHC) Koksara",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋକସରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोकसरा",
      "lat": 19.6412,
      "lng": 82.6841,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Koksara Block - 766019",
      "phone": "06672-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "kalahandi-mrampur-chc",
      "name": "Community Health Centre (CHC) M.Rampur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଏମ୍. ରାମପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), एम. रामपुर",
      "lat": 20.0612,
      "lng": 83.5412,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "M.Rampur Town - 766102",
      "phone": "06676-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "kalahandi-golamunda-chc",
      "name": "Community Health Centre (CHC) Golamunda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗୋଲାମୁଣ୍ଡା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गोलामुंडा",
      "lat": 19.9841,
      "lng": 82.8841,
      "district": "kalahandi",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Golamunda Block HQ - 766022",
      "phone": "06672-271210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "nuapada-dhh",
      "name": "District Headquarters Hospital (DHH) Nuapada",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନୂଆପଡ଼ା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), नुआपड़ा",
      "lat": 20.8354,
      "lng": 82.5292,
      "district": "nuapada",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "NH-353, Nuapada - 766105",
      "phone": "06678-223450",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Emergency & Trauma Care"
    },
    {
      "id": "nuapada-khariar-sdh",
      "name": "Sub-Divisional Hospital (SDH) Khariar",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଖଡ଼ିଆଳ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), खरियार",
      "lat": 20.2984,
      "lng": 82.7641,
      "district": "nuapada",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Square, Khariar - 766107",
      "phone": "06671-232224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Maternity"
    },
    {
      "id": "nuapada-sinapalli-chc",
      "name": "Community Health Centre (CHC) Sinapalli",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସିନାପାଲି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सिनापाली",
      "lat": 20.0841,
      "lng": 82.6412,
      "district": "nuapada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Sinapalli Town - 766108",
      "phone": "06671-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "nuapada-boden-chc",
      "name": "Community Health Centre (CHC) Boden",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବୋଡ଼େନ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बोडेन",
      "lat": 20.3841,
      "lng": 82.6124,
      "district": "nuapada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Boden Block - 766111",
      "phone": "06671-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency"
    },
    {
      "id": "nuapada-komna-chc",
      "name": "Community Health Centre (CHC) Komna",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋମନା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोमना",
      "lat": 20.5124,
      "lng": 82.6641,
      "district": "nuapada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-353, Komna - 766106",
      "phone": "06678-241210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "rayagada-dhh",
      "name": "District Headquarters Hospital (DHH) Rayagada",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ରାୟଗଡ଼ା",
      "nameHi": "जिला मुख्य अस्पताल (DHH), रायगड़ा",
      "lat": 19.1678,
      "lng": 83.4144,
      "district": "rayagada",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Near Kapilash Temple, Rayagada - 765001",
      "phone": "06856-222340",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial & Tribal Emergency Casualty"
    },
    {
      "id": "rayagada-gunupur-sdh",
      "name": "Sub-Divisional Hospital (SDH) Gunupur",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଗୁଣୁପୁର",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), गुणुपुर",
      "lat": 19.0833,
      "lng": 83.8167,
      "district": "rayagada",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Vamsadhara Road, Gunupur - 765022",
      "phone": "06857-220224",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Labor Wing"
    },
    {
      "id": "rayagada-bissamcuttack-chc",
      "name": "Community Health Centre (CHC) Bissamcuttack",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବିଷମକଟକ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बिषमकटक",
      "lat": 19.5184,
      "lng": 83.5124,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Niyamgiri Foothills, Bissamcuttack - 765019",
      "phone": "06863-247220",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Health Emergency"
    },
    {
      "id": "rayagada-muniguda-chc",
      "name": "Community Health Centre (CHC) Muniguda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମୁନିଗୁଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मुनिगुड़ा",
      "lat": 19.6241,
      "lng": 83.4891,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Railway Junction, Muniguda - 765020",
      "phone": "06863-245215",
      "emergencyPhone": "108",
      "casualty": "24x7 Industrial & Railway Emergency"
    },
    {
      "id": "rayagada-kashipur-chc",
      "name": "Community Health Centre (CHC) Kashipur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କାଶୀପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), काशीपुर",
      "lat": 19.2142,
      "lng": 83.1241,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Utkal Alumina Area, Kashipur - 765015",
      "phone": "06856-258210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highland Emergency & Malaria Care"
    },
    {
      "id": "rayagada-padmapur-chc",
      "name": "Community Health Centre (CHC) Padmapur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପଦ୍ମପୁର, ରାୟଗଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पद्मपुर, रायगड़ा",
      "lat": 19.2412,
      "lng": 83.8124,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Padmapur Block - 765025",
      "phone": "06857-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "rayagada-gudari-chc",
      "name": "Community Health Centre (CHC) Gudari",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଗୁଡାରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), गुड़ारी",
      "lat": 19.3412,
      "lng": 83.7841,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Vamsadhara Bank, Gudari - 765026",
      "phone": "06857-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "rayagada-kolnara-chc",
      "name": "Community Health Centre (CHC) Kolnara",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଲନରା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोलनरा",
      "lat": 19.2841,
      "lng": 83.4521,
      "district": "rayagada",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-326, Kolnara - 765017",
      "phone": "06856-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway & Primary Emergency"
    },
    {
      "id": "koraput-slnmch",
      "name": "Saheed Laxman Nayak Medical College & Hospital (SLN MCH Koraput)",
      "nameOr": "ଶହୀଦ ଲକ୍ଷ୍ମଣ ନାୟକ ମେଡିକାଲ କଲେଜ (SLN MCH), କୋରାପୁଟ",
      "nameHi": "शहीद लक्ष्मण नायक मेडिकल कॉलेज व अस्पताल (SLN MCH), कोरापुट",
      "lat": 18.8166,
      "lng": 82.7166,
      "district": "koraput",
      "type": "Medical College & Super-Specialty Hospital",
      "category": "mch",
      "address": "Near Bus Stand, Koraput - 764020",
      "phone": "06852-250100",
      "emergencyPhone": "108",
      "casualty": "24x7 Apex Tribal Health & Trauma ICU"
    },
    {
      "id": "koraput-dhh",
      "name": "District Headquarters Hospital (DHH) Koraput",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), କୋରାପୁଟ",
      "nameHi": "जिला मुख्य अस्पताल (DHH), कोरापुट",
      "lat": 18.8134,
      "lng": 82.7124,
      "district": "koraput",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Main Road, Koraput - 764020",
      "phone": "06852-250045",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Casualty & Inpatient"
    },
    {
      "id": "koraput-jeypore-sdh",
      "name": "Sub-Divisional Hospital (SDH) Jeypore",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଜୟପୁର, କୋରାପୁଟ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), जयपुर, कोरापुट",
      "lat": 18.8574,
      "lng": 82.5692,
      "district": "koraput",
      "type": "Sub-Divisional & Urban Hospital",
      "category": "sdh",
      "address": "Old Post Office Road, Jeypore - 764001",
      "phone": "06854-232225",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Labor Room"
    },
    {
      "id": "koraput-semiliguda-chc",
      "name": "Community Health Centre (CHC) Semiliguda (HAL / Sunabeda)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ସେମିଳିଗୁଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), सेमिलिगुड़ा",
      "lat": 18.7041,
      "lng": 82.8641,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-26, Semiliguda - 764036",
      "phone": "06853-228220",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Trauma & Industrial Care"
    },
    {
      "id": "koraput-kotpad-chc",
      "name": "Community Health Centre (CHC) Kotpad",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋଟପାଡ଼",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोटपाड़",
      "lat": 19.1412,
      "lng": 82.3241,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-63, Kotpad - 764058",
      "phone": "06854-245210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Highway Emergency"
    },
    {
      "id": "koraput-borigumma-chc",
      "name": "Community Health Centre (CHC) Borigumma",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବୋରିଗୁମ୍ମା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बोरिगुम्मा",
      "lat": 18.9841,
      "lng": 82.5641,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-26 Junction, Borigumma - 764056",
      "phone": "06854-248210",
      "emergencyPhone": "108",
      "casualty": "24x7 Major Highway Emergency"
    },
    {
      "id": "koraput-pottangi-chc",
      "name": "Community Health Centre (CHC) Pottangi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପଟ୍ଟାଙ୍ଗୀ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पट्टांगी",
      "lat": 18.5641,
      "lng": 82.9741,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-26 Ghat Road, Pottangi - 764039",
      "phone": "06853-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Hill Ghat Road Emergency"
    },
    {
      "id": "koraput-boipariguda-chc",
      "name": "Community Health Centre (CHC) Boipariguda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ବୈପାରୀଗୁଡ଼ା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), बैपारीगुड़ा",
      "lat": 18.7542,
      "lng": 82.4214,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Gupteswar Road, Boipariguda - 764043",
      "phone": "06854-252210",
      "emergencyPhone": "108",
      "casualty": "24x7 Forest Belt & Cave Pilgrim Care"
    },
    {
      "id": "koraput-nandapur-chc",
      "name": "Community Health Centre (CHC) Nandapur",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ନନ୍ଦପୁର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), नंदपुर",
      "lat": 18.5742,
      "lng": 82.7214,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Historic Town, Nandapur - 764037",
      "phone": "06853-246210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highland Tribal Emergency"
    },
    {
      "id": "koraput-lamtaput-chc",
      "name": "Community Health Centre (CHC) Lamtaput (Machkund)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଲମତାପୁଟ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), लमतापुट",
      "lat": 18.6641,
      "lng": 82.5412,
      "district": "koraput",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Machkund Dam Area, Lamtaput - 764081",
      "phone": "06853-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Remote Tribal Emergency Care"
    },
    {
      "id": "nabarangpur-dhh",
      "name": "District Headquarters Hospital (DHH) Nabarangpur",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ନବରଙ୍ଗପୁର",
      "nameHi": "जिला मुख्य अस्पताल (DHH), नवरंगपुर",
      "lat": 19.2318,
      "lng": 82.5516,
      "district": "nabarangpur",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "Main Road, Nabarangpur - 764059",
      "phone": "06858-222340",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Emergency & Trauma Wing"
    },
    {
      "id": "nabarangpur-umerkote-sdh",
      "name": "Sub-Divisional Hospital (SDH) Umerkote",
      "nameOr": "ଉପ-ଖଣ୍ଡ ଡାକ୍ତରଖାନା (SDH), ଉମରକୋଟ",
      "nameHi": "उप-मंडलीय अस्पताल (SDH), उमरकोट",
      "lat": 19.6641,
      "lng": 82.2142,
      "district": "nabarangpur",
      "type": "Sub-Divisional Hospital",
      "category": "sdh",
      "address": "Hospital Square, Umerkote - 764073",
      "phone": "06866-270220",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Care & Maternity"
    },
    {
      "id": "nabarangpur-raighar-chc",
      "name": "Community Health Centre (CHC) Raighar",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ରାଇଘର",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), रायघर",
      "lat": 19.8641,
      "lng": 82.0412,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chhattisgarh Border, Raighar - 764074",
      "phone": "06866-281210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Tribal Emergency"
    },
    {
      "id": "nabarangpur-chandahandi-chc",
      "name": "Community Health Centre (CHC) Chandahandi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚନ୍ଦାହାଣ୍ଡି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चंदाहांडी",
      "lat": 19.7841,
      "lng": 82.3841,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Chandahandi Block - 764077",
      "phone": "06866-285210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "nabarangpur-jharigaon-chc",
      "name": "Community Health Centre (CHC) Jharigaon",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଝରିଗାଁ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), झरिगांव",
      "lat": 19.5841,
      "lng": 82.4124,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Jharigaon Town - 764076",
      "phone": "06866-288210",
      "emergencyPhone": "108",
      "casualty": "24x7 Emergency Ward & Labor Room"
    },
    {
      "id": "nabarangpur-dabugaon-chc",
      "name": "Community Health Centre (CHC) Dabugaon",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଡାବୁଗାଁ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), डाबुगांव",
      "lat": 19.4521,
      "lng": 82.4512,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Dabugaon Town - 764072",
      "phone": "06858-242210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency"
    },
    {
      "id": "nabarangpur-papadahandi-chc",
      "name": "Community Health Centre (CHC) Papadahandi",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପାପଡ଼ାହାଣ୍ଡି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पापड़ाहांडी",
      "lat": 19.3412,
      "lng": 82.5841,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-26, Papadahandi - 764071",
      "phone": "06858-246210",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency"
    },
    {
      "id": "nabarangpur-tentulikhunti-chc",
      "name": "Community Health Centre (CHC) Tentulikhunti",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ତେନ୍ତୁଳିଖୁଣ୍ଟି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), तेंतुलिखुंटी",
      "lat": 19.2841,
      "lng": 82.7412,
      "district": "nabarangpur",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Tentulikhunti Block - 764070",
      "phone": "06858-251210",
      "emergencyPhone": "108",
      "casualty": "24x7 Primary Emergency Care"
    },
    {
      "id": "malkangiri-dhh",
      "name": "District Headquarters Hospital (DHH) Malkangiri",
      "nameOr": "ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ମାଲକାନଗିରି",
      "nameHi": "जिला मुख्य अस्पताल (DHH), मालकानगिरि",
      "lat": 18.3512,
      "lng": 81.8974,
      "district": "malkangiri",
      "type": "District Headquarters Hospital",
      "category": "dhh",
      "address": "DNK Road, Malkangiri - 764045",
      "phone": "06861-230240",
      "emergencyPhone": "108",
      "casualty": "24x7 Tribal Health, Snakebite & Emergency Ward"
    },
    {
      "id": "malkangiri-mathili-chc",
      "name": "Community Health Centre (CHC) Mathili",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମାଥିଲି, ମାଲକାନଗିରି",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), माथिली",
      "lat": 18.5741,
      "lng": 82.0412,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "NH-326, Mathili - 764044",
      "phone": "06861-241215",
      "emergencyPhone": "108",
      "casualty": "24x7 Highway Emergency & Anti-Venom Center"
    },
    {
      "id": "malkangiri-kalimela-chc",
      "name": "Community Health Centre (CHC) Kalimela",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କାଲିମେଳା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कालिमेला",
      "lat": 18.0412,
      "lng": 81.7124,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Main Road, Kalimela - 764047",
      "phone": "06861-254210",
      "emergencyPhone": "108",
      "casualty": "24x7 Border Tribal Emergency Care"
    },
    {
      "id": "malkangiri-motu-chc",
      "name": "Community Health Centre (CHC) Motu (Tri-Junction)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ମୋଟୁ (ତ୍ରି-ସୀମାନ୍ତ)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), मोटू (त्रि-सीमा)",
      "lat": 17.8412,
      "lng": 81.3841,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Odisha-AP-Telangana Tri-Junction, Motu - 764048",
      "phone": "06861-261210",
      "emergencyPhone": "108",
      "casualty": "24x7 Strategic Interstate Border Emergency"
    },
    {
      "id": "malkangiri-korkunda-chc",
      "name": "Community Health Centre (CHC) Korkunda",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), କୋରକୁଣ୍ଡା",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), कोरकुंडा",
      "lat": 18.2641,
      "lng": 81.9841,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Korkunda Block - 764049",
      "phone": "06861-257210",
      "emergencyPhone": "108",
      "casualty": "24x7 Rural Emergency Care"
    },
    {
      "id": "malkangiri-podia-chc",
      "name": "Community Health Centre (CHC) Podia",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ପୋଡ଼ିଆ",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), पोडिया",
      "lat": 17.9841,
      "lng": 81.5412,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Podia Block - 764053",
      "phone": "06861-264210",
      "emergencyPhone": "108",
      "casualty": "24x7 Remote Primary Emergency"
    },
    {
      "id": "malkangiri-chitrakonda-chc",
      "name": "Community Health Centre (CHC) Chitrakonda (Gurupriya Hub)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଚିତ୍ରକୋଣ୍ଡା (ଗୁରୁପ୍ରିୟା)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), चित्रकोंडा",
      "lat": 18.1124,
      "lng": 82.0841,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Swabhiman Anchal Access, Chitrakonda - 764052",
      "phone": "06861-268210",
      "emergencyPhone": "108",
      "casualty": "24x7 Swabhiman Anchal Lifeline Emergency"
    },
    {
      "id": "malkangiri-khairput-chc",
      "name": "Community Health Centre (CHC) Khairput (Bonda Hills)",
      "nameOr": "ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC), ଖଇରପୁଟ (ବୋଣ୍ଡା ଘାଟି)",
      "nameHi": "सामुदायिक स्वास्थ्य केंद्र (CHC), खैरपुट (बोंडा हिल्स)",
      "lat": 18.4214,
      "lng": 82.1641,
      "district": "malkangiri",
      "type": "Community Health Centre (CHC)",
      "category": "chc",
      "address": "Bonda Tribal Foothills, Khairput - 764051",
      "phone": "06861-272210",
      "emergencyPhone": "108",
      "casualty": "24x7 Particularly Vulnerable Tribal Group Emergency"
    },
    {
      "id": "delhi-aiims",
      "name": "AIIMS New Delhi (National Apex)",
      "nameOr": "ଏମ୍ସ ନୂଆଦିଲ୍ଲୀ (AIIMS New Delhi)",
      "nameHi": "एम्स नई दिल्ली (AIIMS New Delhi)",
      "lat": 28.5672,
      "lng": 77.21,
      "district": "national",
      "type": "National Apex Referral Institute",
      "category": "mch",
      "address": "Ansari Nagar, New Delhi - 110029",
      "phone": "011-26588500",
      "emergencyPhone": "108",
      "casualty": "24x7 National Apex Emergency & Level-1 Trauma"
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

  // Comprehensive Odisha Town, NAC, Municipality, and Panchayat Registry
  const ODISHA_TOWN_MAP = {
    // Ganjam & Berhampur
    'berhampur': { district: 'ganjam', name: 'Berhampur / Brahmapur', lat: 19.3093, lng: 84.8091 },
    'brahmapur': { district: 'ganjam', name: 'Berhampur / Brahmapur', lat: 19.3093, lng: 84.8091 },
    'mkcg': { district: 'ganjam', name: 'MKCG Medical College, Berhampur', lat: 19.3081, lng: 84.8118 },
    'ganjam': { district: 'ganjam', name: 'Ganjam', lat: 19.3093, lng: 84.8091 },
    'chatrapur': { district: 'ganjam', name: 'Chatrapur', lat: 19.3551, lng: 84.9868 },
    'hinjilicut': { district: 'ganjam', name: 'Hinjilicut', lat: 19.4812, lng: 84.7412 },
    'hinjili': { district: 'ganjam', name: 'Hinjilicut', lat: 19.4812, lng: 84.7412 },
    'bhanjanagar': { district: 'ganjam', name: 'Bhanjanagar', lat: 19.9312, lng: 84.5812 },
    'aska': { district: 'ganjam', name: 'Aska', lat: 19.6112, lng: 84.6612 },
    'buguda': { district: 'ganjam', name: 'Buguda', lat: 19.8112, lng: 84.7912 },
    'kodala': { district: 'ganjam', name: 'Kodala', lat: 19.6312, lng: 84.9412 },
    'kabisuryanagar': { district: 'ganjam', name: 'Kabi Surya Nagar', lat: 19.5812, lng: 84.7812 },
    'kabi surya nagar': { district: 'ganjam', name: 'Kabi Surya Nagar', lat: 19.5812, lng: 84.7812 },
    'surada': { district: 'ganjam', name: 'Surada', lat: 19.7541, lng: 84.4312 },
    'polasara': { district: 'ganjam', name: 'Polasara', lat: 19.7012, lng: 84.8212 },
    'bellaguntha': { district: 'ganjam', name: 'Bellaguntha', lat: 19.8812, lng: 84.6512 },
    'belguntha': { district: 'ganjam', name: 'Bellaguntha', lat: 19.8812, lng: 84.6512 },
    'digapahandi': { district: 'ganjam', name: 'Digapahandi', lat: 19.3712, lng: 84.5712 },
    'khallikote': { district: 'ganjam', name: 'Khallikote', lat: 19.6112, lng: 85.0812 },
    'purushottampur': { district: 'ganjam', name: 'Purushottampur', lat: 19.5212, lng: 84.8912 },
    'sanakhemundi': { district: 'ganjam', name: 'Sanakhemundi', lat: 19.4212, lng: 84.5912 },
    'chikiti': { district: 'ganjam', name: 'Chikiti', lat: 19.2012, lng: 84.6112 },
    'gopalpur': { district: 'ganjam', name: 'Gopalpur', lat: 19.2612, lng: 84.9112 },
    'rambha': { district: 'ganjam', name: 'Rambha', lat: 19.5167, lng: 85.1000 },
    'kabisurya nagar': { district: 'ganjam', name: 'Kabi Surya Nagar', lat: 19.5812, lng: 84.7812 },

    // Khordha & Bhubaneswar
    'bhubaneswar': { district: 'khordha', name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
    'khordha': { district: 'khordha', name: 'Khordha', lat: 20.1812, lng: 85.6212 },
    'khurda': { district: 'khordha', name: 'Khordha', lat: 20.1812, lng: 85.6212 },
    'jatni': { district: 'khordha', name: 'Jatni', lat: 20.1612, lng: 85.7012 },
    'balipatna': { district: 'khordha', name: 'Balipatna', lat: 20.1712, lng: 85.9512 },
    'banapur': { district: 'khordha', name: 'Banapur', lat: 19.7812, lng: 85.1812 },
    'tangi': { district: 'khordha', name: 'Tangi', lat: 19.9212, lng: 85.3912 },
    'begunia': { district: 'khordha', name: 'Begunia', lat: 20.2112, lng: 85.4912 },

    // Cuttack
    'cuttack': { district: 'cuttack', name: 'Cuttack', lat: 20.4727, lng: 85.8885 },
    'scb': { district: 'cuttack', name: 'SCB Medical College, Cuttack', lat: 20.4651, lng: 85.8941 },
    'choudwar': { district: 'cuttack', name: 'Choudwar', lat: 20.5312, lng: 85.9112 },
    'athagarh': { district: 'cuttack', name: 'Athagarh', lat: 20.5312, lng: 85.6212 },
    'banki': { district: 'cuttack', name: 'Banki', lat: 20.3812, lng: 85.5312 },
    'salipur': { district: 'cuttack', name: 'Salipur', lat: 20.4812, lng: 86.0112 },
    'badamba': { district: 'cuttack', name: 'Badamba', lat: 20.4212, lng: 85.3412 },
    'tigiria': { district: 'cuttack', name: 'Tigiria', lat: 20.4712, lng: 85.5112 },

    // Puri
    'puri': { district: 'puri', name: 'Puri', lat: 19.8135, lng: 85.8312 },
    'konark': { district: 'puri', name: 'Konark', lat: 19.8876, lng: 86.0945 },
    'pipili': { district: 'puri', name: 'Pipili', lat: 20.1167, lng: 85.8333 },
    'nimapara': { district: 'puri', name: 'Nimapara', lat: 20.0612, lng: 86.0112 },
    'satyabadi': { district: 'puri', name: 'Satyabadi', lat: 19.9512, lng: 85.8212 },
    'brahmagiri': { district: 'puri', name: 'Brahmagiri', lat: 19.7912, lng: 85.6712 },
    'kakatpur': { district: 'puri', name: 'Kakatpur', lat: 20.0012, lng: 86.1912 },
    'astaranga': { district: 'puri', name: 'Astaranga', lat: 19.9812, lng: 86.2712 },

    // Balasore
    'balasore': { district: 'balasore', name: 'Balasore', lat: 21.5034, lng: 86.9157 },
    'baleswar': { district: 'balasore', name: 'Balasore', lat: 21.5034, lng: 86.9157 },
    'soro': { district: 'balasore', name: 'Soro', lat: 21.2912, lng: 86.6912 },
    'jaleswar': { district: 'balasore', name: 'Jaleswar', lat: 21.8112, lng: 87.2112 },
    'nilagiri': { district: 'balasore', name: 'Nilagiri', lat: 21.4612, lng: 86.7712 },
    'remuna': { district: 'balasore', name: 'Remuna', lat: 21.5212, lng: 86.8712 },

    // Bhadrak
    'bhadrak': { district: 'bhadrak', name: 'Bhadrak', lat: 21.0583, lng: 86.5028 },
    'basudevpur': { district: 'bhadrak', name: 'Basudevpur', lat: 21.1312, lng: 86.7412 },
    'chandbali': { district: 'bhadrak', name: 'Chandbali', lat: 20.7712, lng: 86.7412 },
    'dhamnagar': { district: 'bhadrak', name: 'Dhamnagar', lat: 20.9212, lng: 86.4412 },

    // Mayurbhanj
    'baripada': { district: 'mayurbhanj', name: 'Baripada', lat: 21.9347, lng: 86.7327 },
    'mayurbhanj': { district: 'mayurbhanj', name: 'Mayurbhanj', lat: 21.9347, lng: 86.7327 },
    'rairangpur': { district: 'mayurbhanj', name: 'Rairangpur', lat: 22.2612, lng: 86.1712 },
    'karanjia': { district: 'mayurbhanj', name: 'Karanjia', lat: 21.7812, lng: 85.9712 },
    'udala': { district: 'mayurbhanj', name: 'Udala', lat: 21.5812, lng: 86.5712 },

    // Sundargarh
    'rourkela': { district: 'sundargarh', name: 'Rourkela', lat: 22.2512, lng: 84.8812 },
    'sundargarh': { district: 'sundargarh', name: 'Sundargarh', lat: 22.1212, lng: 84.0312 },
    'rajgangpur': { district: 'sundargarh', name: 'Rajgangpur', lat: 22.1912, lng: 84.5812 },
    'biramitrapur': { district: 'sundargarh', name: 'Biramitrapur', lat: 22.4012, lng: 84.7312 },
    'bonai': { district: 'sundargarh', name: 'Bonai', lat: 21.8212, lng: 84.9712 },

    // Sambalpur
    'sambalpur': { district: 'sambalpur', name: 'Sambalpur', lat: 21.4984, lng: 83.8741 },
    'burla': { district: 'sambalpur', name: 'Burla (VIMSAR)', lat: 21.5012, lng: 83.8712 },
    'hirakud': { district: 'sambalpur', name: 'Hirakud', lat: 21.5212, lng: 83.8712 },
    'kuchinda': { district: 'sambalpur', name: 'Kuchinda', lat: 21.7412, lng: 84.3412 },
    'rairakhol': { district: 'sambalpur', name: 'Rairakhol', lat: 21.0612, lng: 84.3412 },

    // Bargarh
    'bargarh': { district: 'bargarh', name: 'Bargarh', lat: 21.3323, lng: 83.6214 },
    'padampur': { district: 'bargarh', name: 'Padampur', lat: 20.9912, lng: 83.0612 },
    'barpali': { district: 'bargarh', name: 'Barpali', lat: 21.1912, lng: 83.5812 },
    'attabira': { district: 'bargarh', name: 'Attabira', lat: 21.3912, lng: 83.7912 },

    // Jharsuguda
    'jharsuguda': { district: 'jharsuguda', name: 'Jharsuguda', lat: 21.8540, lng: 84.0084 },
    'brajrajnagar': { district: 'jharsuguda', name: 'Brajrajnagar', lat: 21.8212, lng: 83.9212 },
    'belpahar': { district: 'jharsuguda', name: 'Belpahar', lat: 21.8512, lng: 83.8612 },

    // Balangir
    'balangir': { district: 'balangir', name: 'Balangir', lat: 20.7108, lng: 83.4862 },
    'titilagarh': { district: 'balangir', name: 'Titilagarh', lat: 20.3012, lng: 83.1412 },
    'patnagarh': { district: 'balangir', name: 'Patnagarh', lat: 20.7112, lng: 83.1412 },
    'kantabanji': { district: 'balangir', name: 'Kantabanji', lat: 20.4812, lng: 82.8412 },

    // Kalahandi
    'bhawanipatna': { district: 'kalahandi', name: 'Bhawanipatna', lat: 19.9075, lng: 83.1659 },
    'kalahandi': { district: 'kalahandi', name: 'Kalahandi', lat: 19.9075, lng: 83.1659 },
    'kesinga': { district: 'kalahandi', name: 'Kesinga', lat: 20.2012, lng: 83.2312 },
    'dharamgarh': { district: 'kalahandi', name: 'Dharamgarh', lat: 19.8812, lng: 82.7812 },
    'junagarh': { district: 'kalahandi', name: 'Junagarh', lat: 19.8612, lng: 82.9312 },

    // Koraput
    'koraput': { district: 'koraput', name: 'Koraput', lat: 18.8166, lng: 82.7166 },
    'jeypore': { district: 'koraput', name: 'Jeypore', lat: 18.8512, lng: 82.5712 },
    'sunabeda': { district: 'koraput', name: 'Sunabeda', lat: 18.7212, lng: 82.8312 },
    'kotpad': { district: 'koraput', name: 'Kotpad', lat: 19.1412, lng: 82.3212 },
    'damanjodi': { district: 'koraput', name: 'Damanjodi', lat: 18.7812, lng: 82.9112 },

    // Rayagada
    'rayagada': { district: 'rayagada', name: 'Rayagada', lat: 19.1678, lng: 83.4144 },
    'gunupur': { district: 'rayagada', name: 'Gunupur', lat: 19.0812, lng: 83.8112 },
    'bissam cuttack': { district: 'rayagada', name: 'Bissam Cuttack', lat: 19.5112, lng: 83.5112 },
    'muniguda': { district: 'rayagada', name: 'Muniguda', lat: 19.6212, lng: 83.4812 },

    // Gajapati
    'paralakhemundi': { district: 'gajapati', name: 'Paralakhemundi', lat: 18.7758, lng: 84.0908 },
    'gajapati': { district: 'gajapati', name: 'Gajapati', lat: 18.7758, lng: 84.0908 },
    'kashinagar': { district: 'gajapati', name: 'Kashinagar', lat: 18.9112, lng: 83.8212 },
    'mohana': { district: 'gajapati', name: 'Mohana', lat: 19.4312, lng: 84.2812 },

    // Angul
    'angul': { district: 'angul', name: 'Angul', lat: 20.8398, lng: 85.1011 },
    'talcher': { district: 'angul', name: 'Talcher', lat: 20.9512, lng: 85.2212 },
    'athmallik': { district: 'angul', name: 'Athmallik', lat: 20.7212, lng: 84.5412 },
    'pallahara': { district: 'angul', name: 'Pallahara', lat: 21.4312, lng: 85.1912 },

    // Dhenkanal
    'dhenkanal': { district: 'dhenkanal', name: 'Dhenkanal', lat: 20.6628, lng: 85.5986 },
    'kamakhyanagar': { district: 'dhenkanal', name: 'Kamakhyanagar', lat: 20.9312, lng: 85.8612 },
    'bhuban': { district: 'dhenkanal', name: 'Bhuban', lat: 20.8812, lng: 85.9812 },
    'hindol': { district: 'dhenkanal', name: 'Hindol', lat: 20.6012, lng: 85.2012 },

    // Jajpur
    'jajpur': { district: 'jajpur', name: 'Jajpur', lat: 20.8497, lng: 86.3353 },
    'vyasanagar': { district: 'jajpur', name: 'Vyasanagar / Jajpur Road', lat: 20.9112, lng: 86.1312 },
    'jajpur road': { district: 'jajpur', name: 'Vyasanagar / Jajpur Road', lat: 20.9112, lng: 86.1312 },
    'chandikhole': { district: 'jajpur', name: 'Chandikhole', lat: 20.7012, lng: 86.1512 },

    // Kendrapara
    'kendrapara': { district: 'kendrapara', name: 'Kendrapara', lat: 20.4996, lng: 86.4253 },
    'pattamundai': { district: 'kendrapara', name: 'Pattamundai', lat: 20.5712, lng: 86.5612 },
    'aul': { district: 'kendrapara', name: 'Aul', lat: 20.6712, lng: 86.6412 },
    'rajkanika': { district: 'kendrapara', name: 'Rajkanika', lat: 20.7412, lng: 86.7212 },

    // Jagatsinghpur
    'jagatsinghpur': { district: 'jagatsinghpur', name: 'Jagatsinghpur', lat: 20.2575, lng: 86.1683 },
    'paradip': { district: 'jagatsinghpur', name: 'Paradip', lat: 20.3165, lng: 86.6114 },
    'kujang': { district: 'jagatsinghpur', name: 'Kujang', lat: 20.3212, lng: 86.5312 },
    'tirtol': { district: 'jagatsinghpur', name: 'Tirtol', lat: 20.3112, lng: 86.3312 },

    // Keonjhar
    'keonjhar': { district: 'keonjhar', name: 'Kendujhar / Keonjhar', lat: 21.6288, lng: 85.5817 },
    'kendujhar': { district: 'keonjhar', name: 'Kendujhar / Keonjhar', lat: 21.6288, lng: 85.5817 },
    'barbil': { district: 'keonjhar', name: 'Barbil', lat: 22.1212, lng: 85.4012 },
    'joda': { district: 'keonjhar', name: 'Joda', lat: 22.0112, lng: 85.4212 },
    'anandapur': { district: 'keonjhar', name: 'Anandapur', lat: 21.2112, lng: 86.1212 },
    'champua': { district: 'keonjhar', name: 'Champua', lat: 22.0812, lng: 85.6712 },

    // Kandhamal
    'phulbani': { district: 'kandhamal', name: 'Phulbani', lat: 20.4776, lng: 84.2327 },
    'kandhamal': { district: 'kandhamal', name: 'Kandhamal', lat: 20.4776, lng: 84.2327 },
    'baliguda': { district: 'kandhamal', name: 'Baliguda', lat: 20.2112, lng: 83.9112 },
    'g. udayagiri': { district: 'kandhamal', name: 'G. Udayagiri', lat: 20.1312, lng: 84.3712 },
    'daringbadi': { district: 'kandhamal', name: 'Daringbadi', lat: 19.9112, lng: 84.1312 },

    // Malkangiri
    'malkangiri': { district: 'malkangiri', name: 'Malkangiri', lat: 18.3512, lng: 81.8974 },
    'balimela': { district: 'malkangiri', name: 'Balimela', lat: 18.2512, lng: 82.1312 },
    'kalimela': { district: 'malkangiri', name: 'Kalimela', lat: 18.0412, lng: 81.7112 },

    // Nabarangpur
    'nabarangpur': { district: 'nabarangpur', name: 'Nabarangpur', lat: 19.2318, lng: 82.5516 },
    'umerkote': { district: 'nabarangpur', name: 'Umerkote', lat: 19.6712, lng: 82.2112 },
    'chandahandi': { district: 'nabarangpur', name: 'Chandahandi', lat: 19.8212, lng: 82.4112 },

    // Nuapada
    'nuapada': { district: 'nuapada', name: 'Nuapada', lat: 20.8354, lng: 82.5292 },
    'khariar': { district: 'nuapada', name: 'Khariar', lat: 20.2912, lng: 82.7612 },
    'khariar road': { district: 'nuapada', name: 'Khariar Road', lat: 20.8712, lng: 82.5312 },

    // Nayagarh
    'nayagarh': { district: 'nayagarh', name: 'Nayagarh', lat: 20.1264, lng: 85.1065 },
    'khandapada': { district: 'nayagarh', name: 'Khandapada', lat: 20.2612, lng: 85.1812 },
    'odagaon': { district: 'nayagarh', name: 'Odagaon', lat: 19.9812, lng: 84.9712 },
    'ranpur': { district: 'nayagarh', name: 'Ranpur', lat: 20.0612, lng: 85.3412 },
    'daspalla': { district: 'nayagarh', name: 'Daspalla', lat: 20.3412, lng: 84.8512 },

    // Sonepur (Subarnapur)
    'sonepur': { district: 'sonepur', name: 'Subarnapur / Sonepur', lat: 20.8378, lng: 83.9168 },
    'subarnapur': { district: 'sonepur', name: 'Subarnapur / Sonepur', lat: 20.8378, lng: 83.9168 },
    'binka': { district: 'sonepur', name: 'Binka', lat: 20.9512, lng: 83.8112 },
    'tarbha': { district: 'sonepur', name: 'Tarbha', lat: 20.7312, lng: 83.6412 },

    // Boudh
    'boudh': { district: 'boudh', name: 'Boudh', lat: 20.8407, lng: 84.3236 },
    'kantamal': { district: 'boudh', name: 'Kantamal', lat: 20.6512, lng: 83.7412 },

    // Deogarh
    'deogarh': { district: 'deogarh', name: 'Deogarh', lat: 21.5367, lng: 84.7336 },
    'barkote': { district: 'deogarh', name: 'Barkote', lat: 21.5512, lng: 85.0112 }
  };

  let hospitalMapInstance = null;
  let userLocationCoords = null;
  let routePolyline = null;
  let activeHospitalCategory = 'all';
  let hospitalSearchQuery = '';
  let hospitalVisibleCount = 12;

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

  function getNearestDistrictKey(lat, lng) {
    let nearestKey = 'ganjam';
    let minDist = Infinity;
    for (const [key, center] of Object.entries(DISTRICT_CENTERS)) {
      const d = haversineKm(lat, lng, center.lat, center.lng);
      if (d < minDist) {
        minDist = d;
        nearestKey = key;
      }
    }
    return nearestKey;
  }

  function detectOdishaLocationFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    // Specific Odia script checks
    if (/ବ୍ରହ୍ମପୁର|ବେରହାମପୁର|ଗଞ୍ଜାମ/.test(lower)) return ODISHA_TOWN_MAP['berhampur'];
    if (/ଭୁବନେଶ୍ୱର|ଖୋର୍ଦ୍ଧା/.test(lower)) return ODISHA_TOWN_MAP['bhubaneswar'];
    if (/କଟକ/.test(lower)) return ODISHA_TOWN_MAP['cuttack'];
    if (/ପୁରୀ/.test(lower)) return ODISHA_TOWN_MAP['puri'];
    if (/ରାଉରକେଲା|ସୁନ୍ଦରଗଡ଼/.test(lower)) return ODISHA_TOWN_MAP['rourkela'];
    if (/ସମ୍ବଲପୁର|ବୁର୍ଲା/.test(lower)) return ODISHA_TOWN_MAP['sambalpur'];
    if (/ବାଲେଶ୍ୱର/.test(lower)) return ODISHA_TOWN_MAP['balasore'];
    if (/ଭଦ୍ରକ/.test(lower)) return ODISHA_TOWN_MAP['bhadrak'];
    if (/ବାରିପଦା|ମୟୂରଭଞ୍ଜ/.test(lower)) return ODISHA_TOWN_MAP['baripada'];
    if (/କୋରାପୁଟ|ଜୟପୁର/.test(lower)) return ODISHA_TOWN_MAP['koraput'];
    if (/ରାୟଗଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['rayagada'];
    if (/ପାରଳାଖେମୁଣ୍ଡି|ଗଜପତି/.test(lower)) return ODISHA_TOWN_MAP['paralakhemundi'];
    if (/ଭବାନୀପାଟଣା|କଳାହାଣ୍ଡି/.test(lower)) return ODISHA_TOWN_MAP['bhawanipatna'];
    if (/ବଲାଙ୍ଗୀର/.test(lower)) return ODISHA_TOWN_MAP['balangir'];
    if (/ବରଗଡ଼/.test(lower)) return ODISHA_TOWN_MAP['bargarh'];
    if (/ଝାରସୁଗୁଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['jharsuguda'];
    if (/ଅନୁଗୋଳ|ତାଳଚେର/.test(lower)) return ODISHA_TOWN_MAP['angul'];
    if (/ଢେଙ୍କାନାଳ/.test(lower)) return ODISHA_TOWN_MAP['dhenkanal'];
    if (/ଯାଜପୁର/.test(lower)) return ODISHA_TOWN_MAP['jajpur'];
    if (/କେନ୍ଦ୍ରାପଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['kendrapara'];
    if (/ଜଗତସିଂହପୁର|ପାରାଦୀପ/.test(lower)) return ODISHA_TOWN_MAP['jagatsinghpur'];
    if (/କେନ୍ଦୁଝର/.test(lower)) return ODISHA_TOWN_MAP['keonjhar'];
    if (/ଫୁଲବାଣୀ|କନ୍ଧମାଳ/.test(lower)) return ODISHA_TOWN_MAP['phulbani'];
    if (/ମାଲକାନଗିରି/.test(lower)) return ODISHA_TOWN_MAP['malkangiri'];
    if (/ନବରଙ୍ଗପୁର/.test(lower)) return ODISHA_TOWN_MAP['nabarangpur'];
    if (/ନୂଆପଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['nuapada'];
    if (/ନୟାଗଡ଼/.test(lower)) return ODISHA_TOWN_MAP['nayagarh'];
    if (/ସୁବର୍ଣ୍ଣପୁର|ସୋନପୁର/.test(lower)) return ODISHA_TOWN_MAP['sonepur'];
    if (/ବୌଦ୍ଧ/.test(lower)) return ODISHA_TOWN_MAP['boudh'];
    if (/ଦେବଗଡ଼/.test(lower)) return ODISHA_TOWN_MAP['deogarh'];
    if (/ଆସିକା/.test(lower)) return ODISHA_TOWN_MAP['aska'];
    if (/ଭଞ୍ଜନଗର/.test(lower)) return ODISHA_TOWN_MAP['bhanjanagar'];
    if (/ଛତ୍ରପୁର/.test(lower)) return ODISHA_TOWN_MAP['chatrapur'];
    if (/ହିଞ୍ଜିଳିକାଟୁ|ହିଞ୍ଜିଳି/.test(lower)) return ODISHA_TOWN_MAP['hinjilicut'];
    if (/ବୁଗୁଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['buguda'];
    if (/କୋଦଳା/.test(lower)) return ODISHA_TOWN_MAP['kodala'];
    if (/କବିସୂର୍ଯ୍ୟନଗର/.test(lower)) return ODISHA_TOWN_MAP['kabisuryanagar'];
    if (/ସୁରଡ଼ା/.test(lower)) return ODISHA_TOWN_MAP['surada'];
    if (/ଚିକିଟି/.test(lower)) return ODISHA_TOWN_MAP['chikiti'];
    if (/ଦିଗପହଣ୍ଡି/.test(lower)) return ODISHA_TOWN_MAP['digapahandi'];
    if (/ଖଲ୍ଲିକୋଟ/.test(lower)) return ODISHA_TOWN_MAP['khallikote'];
    if (/ପୁରୁଷୋତ୍ତମପୁର/.test(lower)) return ODISHA_TOWN_MAP['purushottampur'];
    if (/ପୋଲସରା/.test(lower)) return ODISHA_TOWN_MAP['polasara'];
    if (/ବେଲଗୁଣ୍ଠା|ବେଲ୍ଲାଗୁଣ୍ଠା/.test(lower)) return ODISHA_TOWN_MAP['bellaguntha'];

    // English word boundary match (longest keys first)
    const sortedKeys = Object.keys(ODISHA_TOWN_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const escaped = key.replace('.', '\\.');
      const reg = new RegExp('(\\b|\\W|^)' + escaped + '(\\b|\\W|$)', 'i');
      if (reg.test(lower)) {
        return ODISHA_TOWN_MAP[key];
      }
    }
    return null;
  }

  function updateQuickDistrictPill(districtKeyOrName) {
    const label = $('quickDistrictPillLabel');
    if (!label) return;
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';
    if (!districtKeyOrName || districtKeyOrName === 'auto') {
      label.textContent = isHi ? 'स्थान: ऑटो जीपीएस' : (isOr ? 'ସ୍ଥାନ: ଅଟୋ GPS' : 'Location: Auto GPS');
      return;
    }
    const center = DISTRICT_CENTERS[districtKeyOrName];
    if (center) {
      const cleanName = center.name.split('(')[0].trim();
      label.textContent = cleanName;
    } else {
      label.textContent = districtKeyOrName;
    }
  }

  function autoInitUserLocation() {
    try {
      const savedCoords = localStorage.getItem('swasth_user_coords');
      const savedDistrict = localStorage.getItem('swasth_user_district');
      if (savedCoords) {
        userLocationCoords = JSON.parse(savedCoords);
        if (savedDistrict && $('districtSelect')) {
          $('districtSelect').value = savedDistrict;
        }
        updateQuickDistrictPill(savedDistrict || (userLocationCoords && userLocationCoords.districtName) || 'auto');
        return;
      }
    } catch (e) {
      console.warn('Could not read user location from storage:', e);
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocationCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isFallback: false
          };
          const distKey = getNearestDistrictKey(userLocationCoords.lat, userLocationCoords.lng);
          if (distKey) {
            userLocationCoords.district = distKey;
            try {
              localStorage.setItem('swasth_user_coords', JSON.stringify(userLocationCoords));
              localStorage.setItem('swasth_user_district', distKey);
            } catch {}
            updateQuickDistrictPill(distKey);
          }
        },
        () => {
          updateQuickDistrictPill('auto');
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
      );
    }
  }

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
      title.textContent = isHi ? 'आपातकालीन अस्पताल लोकेटर' : (isOr ? 'ଜରୁରୀକାଳୀନ ଡାକ୍ତରଖାନା ଲୋକେଟର୍' : 'Emergency Hospital Locator');
    }
    const heading = $('nearestHospitalsHeading');
    if (heading) {
      heading.textContent = isHi ? 'निकटतम 24x7 सरकारी अस्पताल व सीएचसी' : (isOr ? 'ନିକଟସ୍ଥ ୨୪x୭ ସରକାରୀ ଡାକ୍ତରଖାନା ଓ CHC' : 'Nearest 24x7 Government Hospitals & CHCs');
    }
    const pillLabel = $('emergencyMapPillLabel');
    if (pillLabel) {
      pillLabel.textContent = isHi ? 'अस्पताल नक्शा' : (isOr ? 'ଡାକ୍ତରଖାନା ମ୍ୟାପ୍' : 'Nearest Hospital');
    }
    const refreshBtn = $('refreshGpsBtn');
    if (refreshBtn) {
      refreshBtn.textContent = isHi ? 'जीपीएस रिफ्रेश' : (isOr ? 'GPS ରିଫ୍ରେଶ୍' : 'Refresh GPS');
    }
    const searchInput = $('hospitalSearchInput');
    if (searchInput) {
      searchInput.placeholder = isHi
        ? 'अस्पताल, सीएचसी, ब्लॉक या जिला खोजें...'
        : (isOr ? 'ଡାକ୍ତରଖାନା, ସିଏଚସି, ବ୍ଲକ ବା ଜିଲ୍ଲା ଖୋଜନ୍ତୁ...' : 'Search hospital, CHC, block, or district...');
    }
    const filterAll = $('filterHospAll');
    if (filterAll) filterAll.textContent = isHi ? 'सभी (249)' : (isOr ? 'ସମସ୍ତ (୨୪୯)' : 'All (249)');
    const filterMch = $('filterHospMch');
    if (filterMch) filterMch.textContent = isHi ? 'एम्स / मेडिकल कॉलेज' : (isOr ? 'ମେଡିକାଲ କଲେଜ (MCH)' : 'Medical Colleges (MCH)');
    const filterDhh = $('filterHospDhh');
    if (filterDhh) filterDhh.textContent = isHi ? 'जिला मुख्य (DHH)' : (isOr ? 'ଜିଲ୍ଲା ମୁଖ୍ୟ (DHH)' : 'District (DHH)');
    const filterSdh = $('filterHospSdh');
    if (filterSdh) filterSdh.textContent = isHi ? 'उप-मंडलीय (SDH)' : (isOr ? 'ଉପ-ଖଣ୍ଡ (SDH)' : 'Sub-Divisional (SDH)');
    const filterChc = $('filterHospChc');
    if (filterChc) filterChc.textContent = isHi ? 'ग्रामीण सीएचसी (CHC)' : (isOr ? 'ଗ୍ରାମୀଣ ସିଏଚସି (CHC)' : 'Rural CHC');
    const districtSelectLabel = $('districtSelectLabel');
    if (districtSelectLabel) {
      districtSelectLabel.textContent = isHi ? 'अपना जिला / क्षेत्र चुनें:' : (isOr ? 'ନିଜ ଜିଲ୍ଲା / ଅଞ୍ଚଳ ବାଛନ୍ତୁ:' : 'District / Region:');
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
      try {
        localStorage.setItem('swasth_user_coords', JSON.stringify(userLocationCoords));
        localStorage.setItem('swasth_user_district', selectedDistrict);
      } catch {}
      updateQuickDistrictPill(selectedDistrict);
      if (statusText) {
        statusText.textContent = isHi
          ? `चयनित जिला: ${center.name}`
          : (isOr ? `ଚୟନିତ ଜିଲ୍ଲା: ${center.name}` : `Selected District: ${center.name}`);
      }
      renderHospitalMapAndCards(userLocationCoords);
      return;
    }

    if (statusText) {
      statusText.textContent = isHi ? 'लाइव जीपीएस स्थिति खोजी जा रही है...' : (isOr ? 'ଲାଇଭ୍ GPS ସ୍ଥିତି ଯାଞ୍ଚ ହେଉଛି...' : 'Acquiring live GPS location...');
    }

    // Default to saved location if present, else Berhampur/Ganjam
    let defaultLocation = null;
    try {
      const saved = localStorage.getItem('swasth_user_coords');
      if (saved) defaultLocation = JSON.parse(saved);
    } catch {}
    if (!defaultLocation && userLocationCoords && !userLocationCoords.isFallback) {
      defaultLocation = userLocationCoords;
    }
    if (!defaultLocation) {
      defaultLocation = { lat: 19.3093, lng: 84.8091, district: 'ganjam', districtName: 'Ganjam / Berhampur', isFallback: true };
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Stage 1: Fast network-based location (Cell/WiFi, resolves in < 1 second)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const distKey = getNearestDistrictKey(pos.coords.latitude, pos.coords.longitude);
          userLocationCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            district: distKey,
            districtName: DISTRICT_CENTERS[distKey] ? DISTRICT_CENTERS[distKey].name : 'Odisha',
            isFallback: false
          };
          try {
            localStorage.setItem('swasth_user_coords', JSON.stringify(userLocationCoords));
            localStorage.setItem('swasth_user_district', distKey);
          } catch {}
          updateQuickDistrictPill(distKey);
          if (statusText) {
            statusText.textContent = isHi ? 'लाइव जीपीएस सक्रिय' : (isOr ? 'ଲାଇଭ୍ GPS ସକ୍ରିୟ' : 'Live GPS Active');
          }
          if (districtSelect && districtSelect.value !== 'auto') {
            districtSelect.value = 'auto';
          }
          renderHospitalMapAndCards(userLocationCoords);

          // Stage 2: Asynchronous high-accuracy GPS refinement in background
          navigator.geolocation.getCurrentPosition(
            (refinedPos) => {
              const refinedDistKey = getNearestDistrictKey(refinedPos.coords.latitude, refinedPos.coords.longitude);
              userLocationCoords = {
                lat: refinedPos.coords.latitude,
                lng: refinedPos.coords.longitude,
                district: refinedDistKey,
                districtName: DISTRICT_CENTERS[refinedDistKey] ? DISTRICT_CENTERS[refinedDistKey].name : 'Odisha',
                isFallback: false
              };
              try {
                localStorage.setItem('swasth_user_coords', JSON.stringify(userLocationCoords));
                localStorage.setItem('swasth_user_district', refinedDistKey);
              } catch {}
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
              ? 'GPS अक्षम: ऊपर दिए गए ड्रॉपडाउन से अपना जिला चुनें'
              : (isOr ? 'GPS ଅନୁମତି ମିଳିନାହିଁ: ଉପର ତାଲିକାରୁ ନିଜ ଜିଲ୍ଲା ବାଛନ୍ତୁ' : 'GPS Unavailable: Select your District above');
          }
          renderHospitalMapAndCards(userLocationCoords);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      userLocationCoords = defaultLocation;
      if (statusText) {
        statusText.textContent = isHi
          ? 'ऊपर ड्रॉपडाउन से अपना जिला चुनें'
          : (isOr ? 'ଉପର ତାଲିକାରୁ ନିଜ ଜିଲ୍ଲା ବାଛନ୍ତୁ' : 'Select your District from the dropdown above');
      }
      renderHospitalMapAndCards(userLocationCoords);
    }
  }

  function renderHospitalMapAndCards(userPos) {
    const isOr = currentLang === 'or';
    const isHi = currentLang === 'hi';

    const sortedAll = GOVT_HOSPITALS.map((h) => {
      const dist = haversineKm(userPos.lat, userPos.lng, h.lat, h.lng);
      const eta = calcDriveMinutes(dist);
      return { ...h, dist, eta };
    }).sort((a, b) => a.dist - b.dist);

    const closestOverall = sortedAll[0];

    // Filter by category and search query
    const filtered = sortedAll.filter((h) => {
      if (activeHospitalCategory !== 'all' && h.category !== activeHospitalCategory) {
        return false;
      }
      if (hospitalSearchQuery) {
        const q = hospitalSearchQuery.toLowerCase().trim();
        const haystack = (h.name + ' ' + (h.nameOr || '') + ' ' + (h.nameHi || '') + ' ' + (h.address || '') + ' ' + (h.district || '') + ' ' + (h.type || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const closest = filtered[0] || closestOverall;

    // Update Floating Delivery-Style HUD
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
          ? `${closest.dist.toFixed(1)} किमी • ~${closest.eta} मिनट ड्राइव`
          : (isOr ? `${closest.dist.toFixed(1)} କିମି • ~${closest.eta} ମିନିଟ୍ ଡ୍ରାଇଭ୍` : `${closest.dist.toFixed(1)} km • ~${closest.eta} min drive`);
      }
      if (hudBtn) {
        hudBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${closest.lat},${closest.lng}&travelmode=driving`;
        hudBtn.textContent = isHi ? 'दिशा देखें ↗' : (isOr ? 'ରାସ୍ତା ଦେଖନ୍ତୁ ↗' : 'Navigate ↗');
      }
    }

    // Direct 1-Click Search: Centers Google Maps with live coordinates
    const extGmaps = $('externalGmapsNearMe');
    if (extGmaps) {
      extGmaps.href = `https://www.google.com/maps/search/hospitals+near+me/@${userPos.lat},${userPos.lng},14z`;
    }

    const badge = $('hospitalCountBadge');
    if (badge) {
      badge.textContent = isHi
        ? `${filtered.length} स्वास्थ्य केंद्र उपलब्ध`
        : (isOr ? `${filtered.length}ଟି ସ୍ୱାସ୍ଥ୍ୟକେନ୍ଦ୍ର ସକ୍ରିୟ` : `${filtered.length} Verified Facilities Active`);
    }

    const container = $('hospitalListContainer');
    if (container) {
      container.innerHTML = '';
      if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:24px 12px;color:var(--muted);font-weight:600;">${
          isHi ? 'कोई अस्पताल नहीं मिला। कृपया दूसरा शब्द या जिला खोजें।' : (isOr ? 'କୌଣସି ଡାକ୍ତରଖାନା ମିଳିଲା ନାହିଁ । ଦୟାକରି ଅନ୍ୟ ଜିଲ୍ଲା ବା ଶବ୍ଦ ଖୋଜନ୍ତୁ ।' : 'No matching facilities found. Try another search or select a district.')
        }</div>`;
      }

      const visibleList = filtered.slice(0, hospitalVisibleCount);
      visibleList.forEach((h, idx) => {
        const card = document.createElement('div');
        card.className = 'hospital-card' + (idx === 0 ? ' closest' : '');
        const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
        const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`;
        const phone = h.phone || '108';

        let catClass = 'cat-chc';
        let catLabel = isHi ? 'सीएचसी' : (isOr ? 'ସିଏଚସି' : 'CHC');
        if (h.category === 'mch') {
          catClass = 'cat-mch';
          catLabel = isHi ? 'एम्स / मेडिकल कॉलेज' : (isOr ? 'ମେଡିକାଲ କଲେଜ' : 'Apex MCH');
        } else if (h.category === 'dhh') {
          catClass = 'cat-dhh';
          catLabel = isHi ? 'जिला मुख्य अस्पताल (DHH)' : (isOr ? 'ଜିଲ୍ଲା ମୁଖ୍ୟ (DHH)' : 'District Hospital (DHH)');
        } else if (h.category === 'sdh') {
          catClass = 'cat-sdh';
          catLabel = isHi ? 'उप-मंडलीय अस्पताल (SDH)' : (isOr ? 'ଉପ-ଖଣ୍ଡ (SDH)' : 'Sub-Divisional (SDH)');
        }

        card.innerHTML = `
          <div class="hospital-card-top">
            <div>
              <h4 class="hospital-card-name">${dispName} <span class="cat-badge ${catClass}">${catLabel}</span></h4>
              <div class="hospital-card-sub">${h.address}</div>
            </div>
            <span class="hospital-card-badge">${idx === 0 ? (isHi ? 'सबसे पास' : (isOr ? 'ନିକଟତମ' : 'Closest')) : '24x7 Emergency'}</span>
          </div>
          <div class="hospital-card-meta">
            <span class="hospital-meta-dist">
              ${h.dist.toFixed(1)} km • ~${h.eta} min drive
            </span>
            <span style="color:var(--muted);">&bull;</span>
            <span style="font-size:0.75rem;color:var(--muted);">${h.type}</span>
          </div>
          <div class="hospital-card-actions">
            <a href="${gmapsDirUrl}" target="_blank" rel="noopener noreferrer" class="btn-nav-gmaps">
              ${isHi ? 'Google Maps पर लाइव रास्ता' : (isOr ? 'Google Maps ରେ ରାସ୍ତା ଦେଖନ୍ତୁ' : 'Start Google Maps Navigation')}
            </a>
            <a href="tel:${phone}" class="btn-call-hospital">
              ${isHi ? 'हेल्पलाइन कॉल' : (isOr ? 'କଲ୍ କରନ୍ତୁ' : 'Call Desk')}
            </a>
          </div>
        `;
        container.appendChild(card);
      });

      if (filtered.length > hospitalVisibleCount) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn-load-more-hospitals';
        moreBtn.type = 'button';
        const remaining = filtered.length - hospitalVisibleCount;
        moreBtn.textContent = isHi
          ? `और अस्पताल देखें (${remaining} और बाकी)`
          : (isOr ? `ଅଧିକ ଡାକ୍ତରଖାନା ଦେଖନ୍ତୁ (${remaining}ଟି ବାକି)` : `Load More Hospitals (${remaining} remaining)`);
        moreBtn.addEventListener('click', () => {
          hospitalVisibleCount += 12;
          renderHospitalMapAndCards(userPos);
        });
        container.appendChild(moreBtn);
      }
    }

    // Leaflet map rendering (Delivery-agent style tracking with top 10 pins)
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
        userMarker.bindPopup(isHi ? 'आपकी लाइव स्थिति' : (isOr ? 'ଆପଣଙ୍କ ଲାଇଭ୍ ସ୍ଥିତି' : 'Your Live Location'));

        const bounds = [[userPos.lat, userPos.lng]];
        filtered.slice(0, 10).forEach((h) => {
          const hospIcon = window.L.divIcon({
            className: 'hospital-beacon-pin',
            html: '<span class="map-marker-dot ' + (h.category || 'chc') + '"></span>', 
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          const m = window.L.marker([h.lat, h.lng], { icon: hospIcon }).addTo(hospitalMapInstance);
          const dispName = isHi ? h.nameHi : (isOr ? h.nameOr : h.name);
          m.bindPopup(`<strong>${dispName}</strong><br/>${h.dist.toFixed(1)} km (~${h.eta} min)<br/><a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}" target="_blank">Navigate</a>`);
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

    const quickPillBtn = $('quickDistrictPillBtn');
    if (quickPillBtn) quickPillBtn.addEventListener('click', openHospitalMap);

    const closeBtn = $('closeHospitalMapBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeHospitalMap);

    const refreshBtn = $('refreshGpsBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => locateUserAndRender('auto'));

    const districtSelect = $('districtSelect');
    if (districtSelect) {
      districtSelect.addEventListener('change', (e) => {
        hospitalVisibleCount = 12;
        locateUserAndRender(e.target.value);
      });
    }

    const searchInput = $('hospitalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        hospitalSearchQuery = e.target.value;
        hospitalVisibleCount = 12;
        if (userLocationCoords) renderHospitalMapAndCards(userLocationCoords);
      });
    }

    document.querySelectorAll('.hosp-filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.hosp-filter-btn').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeHospitalCategory = e.currentTarget.getAttribute('data-filter') || 'all';
        hospitalVisibleCount = 12;
        if (userLocationCoords) renderHospitalMapAndCards(userLocationCoords);
      });
    });

    const modal = $('hospitalMapModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeHospitalMap();
      });
    }
  }
  initHospitalMapControls();
  autoInitUserLocation();


  // ============================================================
  // 1-CLICK DOCTOR TRIAGE SLIP (PDF) & OFFLINE EMERGENCY SUITE
  // ============================================================

  // Minimal standard-compliant PDF 1.3 container wrapper for JPEG stream (Under 50 KB)
  function wrapJpegInPdf(jpegBytes, width, height) {
    const contentStream = 'q\n595.28 0 0 841.89 0 0 cm\n/Im1 Do\nQ\n';
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

    add('%PDF-1.3\n');
    
    offsets[1] = cur;
    add('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n');

    offsets[2] = cur;
    add('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n');

    offsets[3] = cur;
    add('3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources <</XObject <</Im1 4 0 R>>>> /Contents 5 0 R>>\nendobj\n');

    offsets[4] = cur;
    add('4 0 obj\n<</Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + '>>\nstream\n');
    add(jpegBytes);
    add('\nendstream\nendobj\n');

    offsets[5] = cur;
    add('5 0 obj\n<</Length ' + contentStream.length + '>>\nstream\n' + contentStream + 'endstream\nendobj\n');

    const startxref = cur;
    add('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) {
      const off = String(offsets[i]).padStart(10, '0');
      add(off + ' 00000 n \n');
    }
    add('trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n' + startxref + '\n%%EOF\n');

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
      // 1. High-Resolution 1200x1700 Canvas (Crisp Retina Print Quality)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 1700);

      // Top Emerald Header Banner (Small & Compact)
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 1200, 110);

      // 2. Official System Logo on Top Left (Exact Official App Icon Vector)
      function drawRoundRect(c, x, y, w, h, r) {
        if (typeof c.roundRect === 'function') {
          c.beginPath();
          c.roundRect(x, y, w, h, r);
          return;
        }
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      }

      function drawOfficialSwasthLogo(c, x, y, size) {
        const s = size / 512;
        c.save();

        // Background Rounded Rect with Official Emerald/Teal Gradient
        const grad = c.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, '#0d9488');
        grad.addColorStop(1, '#0f766e');
        c.fillStyle = grad;
        drawRoundRect(c, x, y, size, size, 128 * s);
        c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        c.lineWidth = Math.max(1.5, 4 * s);
        c.stroke();

        // Outer Medical Shield Ring
        c.beginPath();
        c.arc(x + 256 * s, y + 256 * s, 190 * s, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        c.lineWidth = Math.max(2, 12 * s);
        c.stroke();

        // Central White Medical Cross
        c.fillStyle = '#ffffff';
        drawRoundRect(c, x + 220 * s, y + 128 * s, 72 * s, 256 * s, 20 * s);
        c.fill();
        drawRoundRect(c, x + 128 * s, y + 220 * s, 256 * s, 72 * s, 20 * s);
        c.fill();

        // Stethoscope ECG Pulse Wave
        c.beginPath();
        c.moveTo(x + 160 * s, y + 256 * s);
        c.lineTo(x + 210 * s, y + 256 * s);
        c.lineTo(x + 235 * s, y + 210 * s);
        c.lineTo(x + 265 * s, y + 300 * s);
        c.lineTo(x + 290 * s, y + 240 * s);
        c.lineTo(x + 310 * s, y + 256 * s);
        c.lineTo(x + 352 * s, y + 256 * s);
        c.strokeStyle = '#0d9488';
        c.lineWidth = Math.max(2.5, 10 * s);
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // Brand Subtitle Text
        c.fillStyle = '#ffffff';
        c.font = 'bold ' + Math.round(34 * s) + 'px "Plus Jakarta Sans", sans-serif';
        c.textAlign = 'center';
        c.fillText('SWASTH AI', x + 256 * s, y + 442 * s);
        c.restore();
      }

      drawOfficialSwasthLogo(ctx, 45, 14, 82);

      // Title & Header Text (Compact Header)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('SWASTH AI (ସ୍ୱାସ୍ଥ୍ୟ AI / स्वास्थ्य AI)', 145, 52);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('Public Health Digital Triage Companion • Odisha', 145, 82);

      // Top Right Digital Badge (Compact)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(940, 35, 215, 40);
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(940, 35, 215, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DIGITAL TRIAGE SLIP', 1047, 60);
      ctx.textAlign = 'left';

      // 3. Metadata Info Bar (Compact Y: 110 to 168)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 110, 1200, 58);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 168);
      ctx.lineTo(1200, 168);
      ctx.stroke();

      const triageId = 'OD-TRG-' + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SLIP REF: ' + triageId, 45, 145);
      ctx.fillStyle = '#475569';
      ctx.fillText('DATE: ' + dateStr + ', ' + timeStr, 340, 145);

      // FACILITY: [ AI DIAGNOSED ] (Compact box)
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(830, 121, 325, 36);
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(830, 121, 325, 36);
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FACILITY: [ AI DIAGNOSED ]', 992, 144);
      ctx.textAlign = 'left';

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

      function wrapTextToLines(text, maxWidth, font) {
        ctx.font = font;
        const paragraphs = (text || '').replace(/\r/g, '').split('\n').map(l => l.trim());
        const result = [];
        for (let p = 0; p < paragraphs.length; p++) {
          const para = paragraphs[p];
          if (!para) continue;
          const words = para.split(/\s+/);
          let curLine = '';
          for (let i = 0; i < words.length; i++) {
            const testLine = curLine ? (curLine + ' ' + words[i]) : words[i];
            if (ctx.measureText(testLine).width > maxWidth && curLine) {
              result.push(curLine);
              curLine = words[i];
            } else {
              curLine = testLine;
            }
          }
          if (curLine) result.push(curLine);
        }
        return result;
      }

      function renderLines(lines, x, startY, lineHeight, maxLines, font, color) {
        ctx.font = font;
        ctx.fillStyle = color;
        let y = startY;
        const count = Math.min(lines.length, maxLines);
        for (let i = 0; i < count; i++) {
          ctx.fillText(lines[i], x, y);
          y += lineHeight;
        }
        return y;
      }

      // Prepare text content for dynamic layout calculation
      const cleanQuery = (queryText || 'General symptom consultation and clinical advice').trim();
      const cleanAnswer = (answerText || '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      let careGuidanceText = cleanAnswer;
      let doctorSignsText = 'High persistent fever, sudden shortness of breath, severe dehydration, chest pain, convulsions, maternal complications, or symptoms not improving after 48 hours requires immediate transfer to Community Health Centre (CHC) or District Hospital (DHH).';

      if (cleanAnswer.includes('⚠️') || cleanAnswer.includes('Danger') || cleanAnswer.includes('ବିପଦ') || cleanAnswer.includes('खतरे')) {
        const parts = cleanAnswer.split(/⚠️|ବିପଦର ଲକ୍ଷଣ|खतरे के लक्षण/);
        if (parts.length > 1) {
          careGuidanceText = parts[0].trim();
          doctorSignsText = parts.slice(1).join('\n').trim();
        }
      }

      // Calculate lines dynamically for each section
      const qFont = '15.5px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      const gFont = '15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      const dFont = '15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';

      const complaintLines = wrapTextToLines(cleanQuery, 1070, qFont);
      const guidanceLines = wrapTextToLines(careGuidanceText, 1070, gFont);
      const doctorLines = wrapTextToLines(doctorSignsText, 1070, dFont);

      // Consistent uniform inter-box gap (removes excessive gaps between sections)
      const gap = 16;

      // Exact text-fitting box heights: actual lines needed + maximum 1 line of bottom breathing space
      const box1Lines = Math.min(3, Math.max(1, complaintLines.length));
      const box1H = 34 + (box1Lines * 24) + 18;

      const box2Lines = guidanceLines.length;
      const box2H = 34 + (box2Lines * 24) + 20;

      const box3Lines = doctorLines.length;
      const box3H = 34 + (box3Lines * 24) + 20;

      // Section 4 (24x7 Helplines) & Section 5 (Nearest Hospital) tight clean heights
      const box4H = 68;
      const box5H = 80;
      const noticeH = 152;

      let curY = 185;

      // 4. SECTION 1: PATIENT REPORTED COMPLAINT
      drawBox(45, curY, 1110, box1H, '#f8fafc', '#e2e8f0', '#0d9488');
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('1. PATIENT REPORTED COMPLAINT (Chief Symptoms / ସମସ୍ୟା):', 65, curY + 26);
      renderLines(complaintLines, 65, curY + 52, 24, box1Lines, qFont, '#1e293b');
      curY += box1H + gap;

      // 5. SECTION 2: CLINICAL TRIAGE GUIDANCE & SAFE HOME CARE (Fitted tightly to text + 1 line)
      drawBox(45, curY, 1110, box2H, '#ffffff', '#cbd5e1', '#0284c7');
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('2. CLINICAL TRIAGE GUIDANCE & SAFE HOME CARE:', 65, curY + 26);
      renderLines(guidanceLines, 65, curY + 52, 24, box2Lines, gFont, '#1e293b');
      curY += box2H + gap;

      // 6. SECTION 3: WHEN TO SEE A DOCTOR / RED FLAG WARNING SIGNS (Fitted tightly to text + 1 line)
      drawBox(45, curY, 1110, box3H, '#fef2f2', '#fca5a5', '#dc2626');
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('3. WHEN TO SEE A DOCTOR / RED FLAG WARNING SIGNS (ତୁରନ୍ତ ଡାକ୍ତରଖାନା ଯିବା ବିପଦ ଲକ୍ଷଣ):', 65, curY + 26);
      renderLines(doctorLines, 65, curY + 52, 24, box3Lines, dFont, '#991b1b');
      curY += box3H + gap;

      // 7. SECTION 4: 24×7 ODISHA STATE EMERGENCY DIRECTORY & HELPLINES (Exact Screenshot Format)
      drawBox(45, curY, 1110, box4H, '#f0fdf4', '#86efac', '#059669');
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", sans-serif';
      ctx.fillText('4. 24×7 ODISHA STATE EMERGENCY DIRECTORY & HELPLINES:', 65, curY + 24);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Ambulance: 108', 65, curY + 48);
      ctx.fillText('National Emergency: 112', 320, curY + 48);
      ctx.fillText('State Health Helpline: 104', 600, curY + 48);
      ctx.fillText('Tele-MANAS: 14416', 890, curY + 48);
      curY += box4H + gap;

      // 8. SECTION 5: NEAREST RECOMMENDED GOVERNMENT HEALTHCARE FACILITY & DISTANCE IN KM
      let userPos = (typeof userLocationCoords !== 'undefined' && userLocationCoords && userLocationCoords.lat)
        ? userLocationCoords
        : null;

      // Auto-detect location from user consultation query or answer (e.g. Berhampur, Brahmapur, Buguda, etc.)
      const detectedInSlip = detectOdishaLocationFromText(cleanQuery) || detectOdishaLocationFromText(cleanAnswer);
      if (detectedInSlip) {
        userPos = { lat: detectedInSlip.lat, lng: detectedInSlip.lng, district: detectedInSlip.district, districtName: detectedInSlip.name };
      } else if (!userPos) {
        try {
          const savedCoords = localStorage.getItem('swasth_user_coords');
          if (savedCoords) userPos = JSON.parse(savedCoords);
        } catch {}
      }

      if (!userPos) {
        userPos = { lat: 19.3093, lng: 84.8091, district: 'ganjam', districtName: 'Ganjam / Berhampur', isFallback: true };
      }

      let nearestHosp = null;
      if (typeof GOVT_HOSPITALS !== 'undefined' && Array.isArray(GOVT_HOSPITALS) && GOVT_HOSPITALS.length > 0) {
        let minDist = Infinity;
        for (let i = 0; i < GOVT_HOSPITALS.length; i++) {
          const h = GOVT_HOSPITALS[i];
          const d = haversineKm(userPos.lat, userPos.lng, h.lat, h.lng);
          if (d < minDist) {
            minDist = d;
            nearestHosp = { ...h, distanceKm: d };
          }
        }
      }
      if (!nearestHosp) {
        nearestHosp = {
          name: 'MKCG Medical College & Hospital Berhampur',
          nameOr: 'ଏମକେସିଜି ମେଡିକାଲ କଲେଜ ଓ ହସ୍ପିଟାଲ, ବ୍ରହ୍ମପୁର (MKCG)',
          type: 'Medical College & Hospital (MCH) / Super-Speciality',
          district: 'Ganjam',
          distanceKm: 0.4
        };
      }

      drawBox(45, curY, 1110, box5H, '#ecfdf5', '#a7f3d0', '#0d9488');
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 16px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('5. NEAREST RECOMMENDED GOVERNMENT HEALTHCARE FACILITY (ନିକଟସ୍ଥ ସରକାରୀ ଡାକ୍ତରଖାନା):', 65, curY + 24);

      const isOr = lang === 'or';
      const isHi = lang === 'hi';
      const hospDisplayName = (isOr && nearestHosp.nameOr) ? `${nearestHosp.name} (${nearestHosp.nameOr})` : nearestHosp.name;
      const distBadge = nearestHosp.distanceKm < 0.5 ? 'Distance: ~0.4 km (Immediate Emergency Reach)' : `Distance: ~${nearestHosp.distanceKm.toFixed(1)} km from current location`;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px "Plus Jakarta Sans", "Noto Sans Oriya", sans-serif';
      ctx.fillText(hospDisplayName, 65, curY + 48);

      // Distance Badge in Emerald
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(distBadge, 1130, curY + 48);
      ctx.textAlign = 'left';

      // Facility Details Line
      ctx.fillStyle = '#475569';
      ctx.font = '13.5px "Plus Jakarta Sans", sans-serif';
      const hospFacilityLine = `Level: ${nearestHosp.type || 'Community Health Centre (CHC)'}  •  District: ${String(nearestHosp.district || 'Odisha').toUpperCase()}  •  24×7 Casualty & Emergency Active`;
      ctx.fillText(hospFacilityLine, 65, curY + 68);

      curY += box5H + gap;

      // 9. BILINGUAL YELLOW / AMBER NOTICE BOX (For Consulting Medical Officer - Compact & Sleek)
      drawBox(45, curY, 1110, noticeH, '#fffbeb', '#f59e0b', '#b45309');
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 15px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif';
      ctx.fillText('⚠️ NOTICE FOR CONSULTING MEDICAL OFFICER (CHC / PHC / DHH):', 65, curY + 24);

      // Part 1: English
      const noticeEn = 'This clinical triage slip was generated by Swasth AI to assist patients and frontline health workers (ASHA/ANM) with early symptom awareness. The patient was STRICTLY instructed NOT to self-medicate with unprescribed antibiotics or OTC steroids. Please conduct a comprehensive physical clinical examination, blood/diagnostic tests, and prescribe authorized medicines.';
      const enLines = wrapTextToLines(noticeEn, 1070, '13.5px "Plus Jakarta Sans", sans-serif');
      renderLines(enLines, 65, curY + 46, 19, 3, '13.5px "Plus Jakarta Sans", sans-serif', '#78350f');

      // Part 2: Selected Regional Language
      const noticeLang = isHi
        ? '⚠️ डॉक्टर के लिए निर्देश: यह पर्ची प्रारंभिक लक्षण जागरूकता के लिए तैयार की गई है। मरीज को बिना डॉक्टर के पर्चे कोई भी एंटीबायोटिक या स्टेरॉयड दवा न लेने की सख्त हिदायत दी गई है। कृपया शारीरिक जांच कर औपचारिक नुस्खा प्रदान करें।'
        : (isOr
          ? '⚠️ ଡାକ୍ତରଙ୍କ ପାଇଁ ନିର୍ଦ୍ଦେଶ: ଏହି ସ୍ୱାସ୍ଥ୍ୟ ସାରାଂଶ ସଚେତନତା ପାଇଁ ପ୍ରସ୍ତୁତ କରାଯାଇଛି । ରୋଗୀଙ୍କୁ ବିନା ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନରେ କୌଣସି ଆଣ୍ଟିବାୟୋଟିକ୍ ବା ଷ୍ଟେରଏଡ୍ ଔଷଧ ନଖାଇବାକୁ କଡ଼ା ଚେତାବନୀ ଦିଆଯାଇଛି । ଦୟାକରି ଶାରୀରିକ ପରୀକ୍ଷା ଓ ରକ୍ତ ଯାଞ୍ଚ କରି ଆବଶ୍ୟକ ଔଷଧ ପ୍ରଦାନ କରନ୍ତୁ ।'
          : '⚠️ SECONDARY DIRECTIVE: Ensure immediate vitals check (Blood Pressure, Pulse, SpO2, Temperature) and rule out acute complications before outpatient discharge.');

      const langLines = wrapTextToLines(noticeLang, 1070, '13.5px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif');
      renderLines(langLines, 65, curY + 110, 20, 2, '13.5px "Plus Jakarta Sans", "Noto Sans Oriya", "Noto Sans Devanagari", sans-serif', '#92400e');

      // 10. Bottom Line - EXACTLY AS INSTRUCTED (Nothing more, nothing less)
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
  const OFFLINE_PROTOCOLS = [
  {
    "id": "snakebite",
    "icon": "[FIRST AID]",
    "title": {
      "en": "Snakebite Emergency Protocol",
      "or": "ସାପ କାମୁଡ଼ା ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା",
      "hi": "सांप काटने का आपातकालीन प्रोटोकॉल"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "Immediate hospital transfer required for Anti-Snake Venom (ASV). Minutes count.",
      "or": "ତୁରନ୍ତ ସରକାରୀ ହସ୍ପିଟାଲ ନେଇ Anti-Snake Venom (ASV) ଇଞ୍ଜେକ୍ସନ ଦିଅନ୍ତୁ । ପ୍ରତି ମିନିଟ୍ ମୂଲ୍ୟବାନ ।",
      "hi": "एंटी-स्नेक वेनम (ASV) के लिए तुरंत अस्पताल ले जाएं। समय बहुत कीमती है।"
    },
    "dos": {
      "en": [
        "Keep patient calm, lying down, and completely still.",
        "Immobilize the bitten limb using a rigid splint or cloth sling below heart level.",
        "Remove rings, anklets, bracelets, and tight clothing before swelling starts.",
        "Immediately call 108 for an ambulance or transport to nearest CHC/DHH.",
        "Note time of bite and snake features if seen safely (do NOT try to catch it)."
      ],
      "or": [
        "ରୋଗୀଙ୍କୁ ଶାନ୍ତ ରଖନ୍ତୁ ଓ ସମ୍ପୂର୍ଣ୍ଣ ସ୍ଥିର ଭାବେ ଶୁଆଇ ରଖନ୍ତୁ ।",
        "କାମୁଡ଼ା ହୋଇଥିବା ହାତ ବା ଗୋଡ଼କୁ କାଠି/ପଟି ବାନ୍ଧି ହୃଦୟର ସ୍ତରଠାରୁ ତଳକୁ ସ୍ଥିର ରଖନ୍ତୁ ।",
        "ଫୁଲିବା ଆରମ୍ଭ ହେବା ପୂର୍ବରୁ ମୁଦି, ଝୁଣ୍ଟିଆ, ଚୁଡ଼ି ଓ କଷା ପୋଷାକ ଖୋଲିଦିଅନ୍ତୁ ।",
        "ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ବା ନିକଟସ୍ଥ CHC/DHH କୁ ଶୀଘ୍ର ନିଅନ୍ତୁ ।",
        "ସାପର ରଙ୍ଗ ବା ଚିହ୍ନ ମନେ ରଖନ୍ତୁ (କିନ୍ତୁ ସାପ ଧରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ) ।"
      ],
      "hi": [
        "मरीज को शांत रखें और बिल्कुल स्थिर लेटा कर रखें।",
        "काटे हुए हाथ या पैर को बिना हिलाए लकड़ी या कपड़े के सहारे हृदय के स्तर से नीचे रखें।",
        "सूजन शुरू होने से पहले अंगूठी, बिछिया, कड़े और तंग कपड़े तुरंत उतार दें।",
        "तुरंत 108 पर कॉल करें या नजदीकी सरकारी अस्पताल (CHC/DHH) ले जाएं।",
        "सांप का रंग या रूप याद रखें (किंतु उसे पकड़ने की कोशिश न करें)।"
      ]
    },
    "donts": {
      "en": [
        "NEVER cut the wound or make incisions (causes severe bleeding).",
        "NEVER attempt to suck venom by mouth or suction device.",
        "NEVER tie a tight rope/wire tourniquet (cuts circulation, causes gangrene and limb loss).",
        "NEVER apply electric shock, ice, cow dung, mud, or herbal pastes.",
        "NEVER waste critical time visiting traditional healers, gunias, or quacks."
      ],
      "or": [
        "କଦାପି କ୍ଷତ ସ୍ଥାନକୁ ବ୍ଲେଡ୍ ବା ଛୁରୀରେ କାଟନ୍ତୁ ନାହିଁ (ଭୟଙ୍କର ରକ୍ତସ୍ରାବ ହୁଏ) ।",
        "କଦାପି ପାଟିରେ ବିଷ ଶୋଷିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଦଉଡ଼ି ବା ତାରରେ କଷିକରି ବାନ୍ଧନ୍ତୁ ନାହିଁ (ରକ୍ତ ଚଳାଚଳ ବନ୍ଦ ହୋଇ ଅଙ୍ଗ ସଢ଼ିଯାଏ) ।",
        "କଦାପି ବରଫ, ଗୋବର, ମାଟି ବା ଜଡ଼ିବୁଟି ଲେପ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଗୁଣିଆ ବା ଝାଡ଼ଫୁଙ୍କ କରି ଅମୂଲ୍ୟ ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "घाव पर कभी ब्लेड या चाकू से चीरा न लगाएं (गंभीर रक्तस्राव होता है)।",
        "मुंह से कभी जहर चूसने का प्रयास न करें।",
        "रस्सी या तार से कसकर टूनिकेट कभी न बांधें (रक्त प्रवाह रुकने से अंग काटना पड़ सकता है)।",
        "बर्फ, गोबर, मिट्टी या कोई जड़ी-बूटी कभी न लगाएं।",
        "झाड़-फूंक या तांत्रिक के पास जाकर कीमती समय कभी बर्बाद न करें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "snake",
      "snakebite",
      "poison",
      "venom",
      "viper",
      "krait",
      "cobra",
      "ସାପ",
      "ବିଷ",
      "ନାଗ",
      "ଚନ୍ଦନବୋଡ଼ା",
      "ବାଉଁଶରାଣୀ",
      "କାମୁଡ଼ା",
      "सांप",
      "सर्प",
      "जहर",
      "काटना"
    ]
  },
  {
    "id": "diarrhea",
    "icon": "[ORS CARE]",
    "title": {
      "en": "Acute Diarrhea & Dehydration (WHO ORS)",
      "or": "ତରଳ ଝାଡ଼ା ଓ ନିର୍ଜଳନ (WHO ORS ପଦ୍ଧତି)",
      "hi": "दस्त और गंभीर निर्जलीकरण (WHO ORS)"
    },
    "urgency": "HIGH",
    "summary": {
      "en": "Prevention of fatal dehydration via WHO ORS and Zinc. Strictly NO unprescribed antibiotics.",
      "or": "ଜୀବନ ରକ୍ଷାକାରୀ WHO ORS ଏବଂ ଜିଙ୍କ୍ ଉପଚାର । ବିନା ଡାକ୍ତରୀ ପରାମର୍ଶରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ଖାଆନ୍ତୁ ନାହିଁ ।",
      "hi": "जीवनरक्षक WHO ORS और जिंक। बिना डॉक्टर की सलाह के एंटीबायोटिक बिल्कुल न लें।"
    },
    "dos": {
      "en": [
        "Mix 1 full packet of WHO ORS into exactly 1 Liter of clean boiled & cooled water.",
        "Give small frequent sips after every loose stool (Children: 50-100ml, Adults: 200-400ml).",
        "Emergency homemade solution (if no packet): 1 Liter clean water + 6 level teaspoons sugar + 1/2 teaspoon salt.",
        "Continue regular breastfeeding and light soft meals (khichdi, banana, coconut water).",
        "Give Zinc tablets (20mg daily) for 14 days to children under 5 to restore intestinal lining."
      ],
      "or": [
        "୧ ପ୍ୟାକେଟ୍ WHO ORS କୁ ଠିକ୍ ୧ ଲିଟର ଫୁଟା ଥଣ୍ଡା ପାଣିରେ ସମ୍ପୂର୍ଣ୍ଣ ଗୋଳାନ୍ତୁ ।",
        "ପ୍ରତିଥର ଝାଡ଼ା ପରେ ଧୀରେ ଧୀରେ ଚାମଚରେ ପିଆନ୍ତୁ (ଶିଶୁ: ୫୦-୧୦୦ମିଲି, ବଡ଼ମଣିଷ: ୨୦୦-୪୦୦ମିଲି) ।",
        "ଘରୋଇ ଜରୁରୀ ପାନୀୟ (ପ୍ୟାକେଟ୍ ନଥିଲେ): ୧ ଲିଟର ପାଣି + ୬ ଚାମଚ ଚିନି + ଅଧା ଚାମଚ ଲୁଣ ।",
        "ମାତୃସ୍ତନ୍ୟ ଦୁଗ୍ଧ ଏବଂ ନରମ ଖାଦ୍ୟ (ଜାଉ, ଖେଚୁଡ଼ି, କଦଳୀ, ଡାବ ପାଣି) ବନ୍ଦ କରନ୍ତୁ ନାହିଁ ।",
        "୫ ବର୍ଷରୁ କମ୍ ପିଲାଙ୍କୁ ପୂରା ୧୪ ଦିନ ପର୍ଯ୍ୟନ୍ତ ଦୈନିକ ୨୦ ମିଗ୍ରା ଜିଙ୍କ୍ ବଟିକା ଖୁଆନ୍ତୁ ।"
      ],
      "hi": [
        "1 पैकेट WHO ORS को ठीक 1 लीटर उबले और ठंडे पानी में अच्छी तरह घोलें।",
        "हर बार दस्त के बाद थोड़ा-थोड़ा पिलाएं (बच्चे: 50-100ml, वयस्क: 200-400ml)।",
        "घरेलू आपातकालीन घोल: 1 लीटर पानी + 6 चम्मच चीनी + 1/2 चम्मच नमक।",
        "स्तनपान और हल्का भोजन (खिचड़ी, केला, नारियल पानी) जारी रखें।",
        "5 साल से कम उम्र के बच्चों को पूरे 14 दिन तक रोजाना 20mg जिंक की गोली दें।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT give unprescribed antibiotics or antimotility pills (Loperamide/Norflox-TZ).",
        "DO NOT dilute ORS with milk, tea, juice, or sweetened aerated drinks.",
        "DO NOT stop breastfeeding or withhold food from a sick child."
      ],
      "or": [
        "କଦାପି ବିନା ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନରେ ଆଣ୍ଟିବାୟୋଟିକ୍ ବା ଝାଡ଼ା ବନ୍ଦ ଔଷଧ (Loperamide) ଖାଆନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ORS କୁ କ୍ଷୀର, ଚାହା, କୋଲ୍ଡ ଡ୍ରିଙ୍କ୍ସ ବା ମିଠା ରସରେ ଗୋଳାନ୍ତୁ ନାହିଁ ।",
        "ଅସୁସ୍ଥ ଶିଶୁକୁ ମାତୃସ୍ତନ୍ୟ ଦୁଗ୍ଧ ବା ଖାଦ୍ୟ ଦେବାରୁ କେବେ ବଞ୍ଚିତ କରନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "बिना डॉक्टर के पर्चे के एंटीबायोटिक या दस्त रोकने वाली दवाएं (Loperamide) न लें।",
        "ORS को दूध, चाय, जूस या कोल्ड ड्रिंक्स में न घोलें।",
        "बीमार बच्चे का स्तनपान या भोजन कभी बंद न करें।"
      ]
    },
    "helpline": "104",
    "keywords": [
      "diarrhea",
      "dehydration",
      "ors",
      "vomiting",
      "loose motions",
      "stomach infection",
      "zinc",
      "ଝାଡ଼ା",
      "ବାନ୍ତି",
      "ପତଳା ଝାଡ଼ା",
      "ନିର୍ଜଳନ",
      "ଓଆରଏସ",
      "ଜଳଶୂନ୍ୟତା",
      "दस्त",
      "उल्टी",
      "ओआरएस",
      "निर्जलीकरण"
    ]
  },
  {
    "id": "heatstroke",
    "icon": "[HEATSTROKE]",
    "title": {
      "en": "Heatstroke & Loo Emergency",
      "or": "ଅଂଶୁଘାତ (ଲୁ) ଜରୁରୀକାଳୀନ ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      "hi": "लू लगना व हीटस्ट्रोक आपातकालीन उपचार"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "Rapid cooling protocol to prevent fatal brain and organ damage during extreme heat.",
      "or": "ଅତ୍ୟଧିକ ଖରା ଓ ତାତି ଯୋଗୁଁ ମସ୍ତିଷ୍କ ଓ ଶରୀରକୁ ସୁରକ୍ଷା ଦେବା ପାଇଁ ତୁରନ୍ତ ଥଣ୍ଡା କରିବା ପ୍ରୋଟୋକଲ୍ ।",
      "hi": "अत्यधिक गर्मी में मस्तिष्क और अंगों को नुकसान से बचाने हेतु त्वरित शीतलन प्रोटोकॉल।"
    },
    "dos": {
      "en": [
        "Immediately move victim to a shaded, well-ventilated, or fan-cooled area.",
        "Remove or loosen tight and heavy clothing.",
        "Sponge the entire body continuously with cool tap water.",
        "Place cold damp cloths or ice packs on neck, armpits, and groin.",
        "Fan vigorously. If alert, give cool water with ORS or coconut water.",
        "Call 108 if body temperature exceeds 104°F, or if patient is delirious or unconscious."
      ],
      "or": [
        "ରୋଗୀଙ୍କୁ ତୁରନ୍ତ ଖରାରୁ ଆଣି ଛାଇ, ପବନ ଚଳାଚଳ ଥିବା ଥଣ୍ଡା ସ୍ଥାନରେ ଶୁଆନ୍ତୁ ।",
        "ପୋଷାକ ଢିଲା କରନ୍ତୁ ବା ଅତ୍ୟଧିକ ପୋଷାକ କାଢ଼ିଦିଅନ୍ତୁ ।",
        "ସାରା ଶରୀରରେ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ପଟି ପକାଇ ସ୍ପଞ୍ଜ କରନ୍ତୁ ।",
        "ବେକ, କାଖ ଓ ଜଙ୍ଘ ମୂଳରେ ଥଣ୍ଡା ପାଣି ପଟି ରଖନ୍ତୁ ।",
        "ଜୋରରେ ପଙ୍ଖା କରନ୍ତୁ । ଚେତା ଥିଲେ ଥଣ୍ଡା ପାଣିରେ ORS, ଲେମ୍ବୁ ପାଣି ବା ଡାବ ପାଣି ଦିଅନ୍ତୁ ।",
        "ଜ୍ୱର ୧୦୪°F ରୁ ଅଧିକ ହେଲେ କିମ୍ବା ବାତ ମାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।"
      ],
      "hi": [
        "मरीज को तुरंत धूप से हटाकर छायादार और हवादार स्थान पर ले जाएं।",
        "मरीज के तंग और भारी कपड़े ढीले करें या उतार दें।",
        "पूरे शरीर पर ठंडे सामान्य पानी की पट्टियां रखकर लगातार स्पंज करें।",
        "गर्दन, बगल और जांघों के जोड़ों पर ठंडे पानी की पट्टियां रखें।",
        "लगातार पंखा चलाएं। होश में होने पर ओआरएस या नींबू-नमक का पानी पिलाएं।",
        "बुखार 104°F से अधिक होने या बेहोश होने पर तुरंत 108 पर एम्बुलेंस बुलाएं।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT give oral fluids to an unconscious, seizing, or vomiting person.",
        "DO NOT give Paracetamol/Aspirin for heatstroke (ineffective and can harm liver).",
        "DO NOT plunge patient into ice water."
      ],
      "or": [
        "ଅଚେତ, ବାତ ମାରୁଥିବା ବା ବାନ୍ତି କରୁଥିବା ରୋଗୀଙ୍କୁ କଦାପି ପାଣି ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "ଅଂଶୁଘାତ ପାଇଁ ପାରାସିଟାମଲ ବା ଆସ୍ପିରିନ୍ ଦିଅନ୍ତୁ ନାହିଁ (ଏହା ଯକୃତ ପାଇଁ ହାନିକାରକ) ।",
        "ରୋଗୀଙ୍କୁ ସିଧାସଳଖ ବରଫ ପାଣିରେ ବୁଡ଼ାନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "बेहोश या उल्टी कर रहे व्यक्ति के मुंह में पानी या कोई तरल बिल्कुल न डालें।",
        "लू लगने पर पैरासिटामोल या एस्पिरिन न दें।",
        "मरीज को सीधे बर्फ के पानी में न डुबोएं।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "heat",
      "heatstroke",
      "loo",
      "sunstroke",
      "extreme heat",
      "summer fever",
      "ଅଂଶୁଘାତ",
      "ଲୁ",
      "ଖରା",
      "ଗରମ",
      "ତାତି",
      "लू",
      "हीटस्ट्रोक",
      "गर्मी",
      "धूप"
    ]
  },
  {
    "id": "pregnancy",
    "icon": "[MATERNAL]",
    "title": {
      "en": "Maternal Red Flags in Pregnancy",
      "or": "ଗର୍ଭାବସ୍ଥାରେ ଜରୁରୀକାଳୀନ ବିପଦ ଲକ୍ଷଣ",
      "hi": "गर्भावस्था में आपातकालीन खतरे के संकेत"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "Immediate emergency transport via 108 or Janani Express 102. Saves mother and child.",
      "or": "୧୦୮ ବା ଜନନୀ ଏକ୍ସପ୍ରେସ୍ ୧୦୨ ଦ୍ୱାରା ତୁରନ୍ତ ଡାକ୍ତରଖାନା ସ୍ଥାନାନ୍ତର । ମାତା ଓ ଶିଶୁର ଜୀବନ ରକ୍ଷା ।",
      "hi": "108 या जननी एक्सप्रेस 102 द्वारा तुरंत अस्पताल ले जाएं। मां और बच्चे की जान बचाएं।"
    },
    "dos": {
      "en": [
        "Any vaginal bleeding requires immediate hospital transfer.",
        "Severe persistent headache, blurred vision, or facial swelling indicates high blood pressure (Eclampsia).",
        "Lie the mother on her LEFT side to optimize blood flow to fetus.",
        "Call 108 (Ambulance) or 102 (Janani Express) immediately.",
        "Keep Mother and Child Protection (MCP) card ready."
      ],
      "or": [
        "ଗର୍ଭାବସ୍ଥାରେ କିମ୍ବା ପ୍ରସବ ପରେ ଯେକୌଣସି ରକ୍ତସ୍ରାବ ଦେଖାଦେଲେ ତୁରନ୍ତ ଡାକ୍ତରଖାନା ନିଅନ୍ତୁ ।",
        "ଅତ୍ୟଧିକ ମୁଣ୍ଡବିନ୍ଧା, ଆଖିକୁ ଝାପ୍‌ସା ଦେଖାଯିବା, ମୁହଁ ଓ ହାତ ଫୁଲିବା (ଉଚ୍ଚ ରକ୍ତଚାପ/ବାତର ଲକ୍ଷଣ) ।",
        "ଗର୍ଭବତୀ ମାତାଙ୍କୁ ବାମ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଶିଶୁକୁ ଠିକ୍ ଭାବେ ରକ୍ତ ଚଳାଚଳ ହେବ ।",
        "ତୁରନ୍ତ ୧୦୮ (ଆମ୍ବୁଲାନ୍ସ) ବା ୧୦୨ (ଜନନୀ ଏକ୍ସପ୍ରେସ୍) କୁ ଫୋନ୍ କରନ୍ତୁ ।",
        "ମମତା/ମାତୃ ସୁରକ୍ଷା କାର୍ଡ଼ (MCP Card) ସାଙ୍ଗରେ ନିଅନ୍ତୁ ।"
      ],
      "hi": [
        "गर्भावस्था या प्रसव के बाद कोई भी रक्तस्राव होने पर तुरंत अस्पताल ले जाएं।",
        "तेज सिरदर्द, धुंधला दिखना, चेहरे पर सूजन उच्च रक्तचाप का संकेत है।",
        "गर्भवती महिला को बाईं करवट लिटाएं।",
        "तुरंत 108 (एम्बुलेंस) या 102 (जननी एक्सप्रेस) पर फोन करें।",
        "मातृ एवं शिशु सुरक्षा (MCP) कार्ड साथ रखें।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT delay seeking care if baby stops moving for 12 hours.",
        "DO NOT attempt unassisted home delivery if high-risk signs are present.",
        "DO NOT consume unverified herbal concoctions."
      ],
      "or": [
        "ଶିଶୁର ଚଳପ୍ରଚଳ ୧୨ ଘଣ୍ଟା ଧରି ବନ୍ଦ ଥିଲେ ଆଦୌ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ ।",
        "ବିପଦ ଲକ୍ଷଣ ଥିଲେ କଦାପି ଘରେ ପ୍ରସବ କରାଇବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ ନାହିଁ ।",
        "ବେଦନା କମାଇବା ପାଇଁ କୌଣସି ଜଡ଼ିବୁଟି ବା କାଢ଼ା ପିଇବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "यदि बच्चा 12 घंटे तक न हिले तो जरा भी देरी न करें।",
        "खतरे के संकेत होने पर कभी भी घर पर प्रसव कराने का जोखिम न लें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "pregnancy",
      "pregnant",
      "bleeding",
      "labor",
      "delivery",
      "maternal",
      "baby movement",
      "preeclampsia",
      "ଗର୍ଭବତୀ",
      "ରକ୍ତସ୍ରାବ",
      "ପ୍ରସବ",
      "ମାତୃ",
      "ଶିଶୁ ଚଳନ",
      "ଗର୍ଭ",
      "गर्भावस्था",
      "गर्भवती",
      "प्रसव",
      "रक्तस्राव"
    ]
  },
  {
    "id": "chestpain",
    "icon": "[CARDIAC]",
    "title": {
      "en": "Chest Pain & Suspected Heart Attack",
      "or": "ଛାତି ଯନ୍ତ୍ରଣା ଓ ହୃଦଘାତ ଆପାତକାଳୀନ ପଦକ୍ଷେପ",
      "hi": "सीने में दर्द व संभावित दिल का दौरा"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "0ms emergency referral to 108 ambulance with Golden Hour cardiac rest.",
      "or": "ଗୋଲ୍ଡେନ୍ ଆୱାର୍ ହୃଦ୍‌ରୋଗ ସୁରକ୍ଷା ପାଇଁ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ବିଶ୍ରାମ ।",
      "hi": "गोल्डन ऑवर में 108 एम्बुलेंस को कॉल और पूर्ण आराम।"
    },
    "dos": {
      "en": [
        "Have patient stop all activity and sit upright in comfortable supported posture (W-sitting).",
        "Loosen collar, tie, belt, and tight clothing.",
        "If not allergic and advised, have adult chew one 300mg Soluble Aspirin/Disprin.",
        "Immediately call 108 for an ambulance.",
        "If person stops breathing normally, start CPR (30 chest compressions at 100-120 bpm)."
      ],
      "or": [
        "ରୋଗୀଙ୍କ ସମସ୍ତ ଚଳପ୍ରଚଳ ବନ୍ଦ କରାଇ ଆଉଜି ବସାନ୍ତୁ (W-position) ।",
        "କଲର, ବେଲ୍ଟ ଓ କଷା ପୋଷାକ ଢିଲା କରନ୍ତୁ ।",
        "ଯଦି ଆଲର୍ଜି ନାହିଁ, ୩୦୦ ମିଗ୍ରା ଆସ୍ପିରିନ୍ (Disprin) ବଟିକା ଚୋବାଇ ଖାଇବାକୁ ଦିଅନ୍ତୁ ।",
        "ତୁରନ୍ତ ୧୦୮ ଆମ୍ବୁଲାନ୍ସକୁ କଲ୍ କରନ୍ତୁ ।",
        "ରୋଗୀ ଅଚେତ ହୋଇ ଶ୍ୱାସକ୍ରିୟା ବନ୍ଦ ହେଲେ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ ।"
      ],
      "hi": [
        "मरीज की सारी हलचल रोकें और पीठ को सहारा देकर आराम से बैठाएं।",
        "कॉलर, बेल्ट और तंग कपड़े ढीले करें।",
        "यदि एलर्जी न हो, तो 300mg एस्पिरिन (डिस्प्रिन) की एक गोली चबाने को दें।",
        "तुरंत 108 पर एम्बुलेंस बुलाएं।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT let the patient walk, climb stairs, or exert themselves.",
        "DO NOT assume it is mere \"gas\" if accompanied by cold sweat and arm pain."
      ],
      "or": [
        "ରୋଗୀଙ୍କୁ ଆଦୌ ଚାଲିବାକୁ ବା ସିଡ଼ି ଚଢ଼ିବାକୁ ଦିଅନ୍ତୁ ନାହିଁ ।",
        "ପ୍ରବଳ ଝାଳ ବୋହିବା ଓ ବାମ ହାତ ଯନ୍ତ୍ରଣା ଥିଲେ ଏହାକୁ କେବଳ ଗ୍ୟାସ ଭାବି ଅଣଦେଖା କରନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "मरीज को चलने, सीढ़ी चढ़ने बिल्कुल न दें।",
        "पसीने के साथ दर्द को केवल गैस मानकर नजरअंदाज न करें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "chest pain",
      "heart attack",
      "heart",
      "cardiac",
      "left arm pain",
      "sweating",
      "angina",
      "ଛାତି ଯନ୍ତ୍ରଣା",
      "ହୃଦଘାତ",
      "ହାର୍ଟ ଆଟାକ",
      "ବାମ ହାତ ବିନ୍ଧା",
      "ଛାତି",
      "सीने में दर्द",
      "हार्ट अटैक",
      "दिल का दौरा"
    ]
  },
  {
    "id": "burns",
    "icon": "[BURN CARE]",
    "title": {
      "en": "Burn Injuries & Scalds First Aid",
      "or": "ପୋଡ଼ିଯିବା ଆଘାତର ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      "hi": "जलने व झुलसने पर प्राथमिक उपचार"
    },
    "urgency": "HIGH",
    "summary": {
      "en": "20 minutes continuous cool tap water. Strictly avoid toothpaste, ink, or turmeric.",
      "or": "ଲଗାତାର ୨୦ ମିନିଟ୍ ସାଧାରଣ ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ । କଦାପି କାଳି, କୋଲଗେଟ୍ ବା ହଳଦୀ ଲଗାନ୍ତୁ ନାହିଁ ।",
      "hi": "लगातार 20 मिनट तक नल का ठंडा पानी डालें। टूथपेस्ट, स्याही या हल्दी बिल्कुल न लगाएं।"
    },
    "dos": {
      "en": [
        "Pour clean, cool running tap water continuously over the burn for at least 15 to 20 minutes.",
        "Gently remove rings, jewelry, and loose clothing before the burnt area swells.",
        "Cover loosely with a clean, sterile cloth.",
        "Seek urgent medical care at nearest CHC/DHH burn unit."
      ],
      "or": [
        "ପୋଡ଼ିଯାଇଥିବା ସ୍ଥାନ ଉପରେ ଅତିକମରେ ୧୫ ରୁ ୨୦ ମିନିଟ୍ ଧରି ନଳକୂଅ ବା ଟ୍ୟାପ୍ ର ସଫା ଥଣ୍ଡା ପାଣି ଢାଳନ୍ତୁ ।",
        "ଫୁଲିବା ପୂର୍ବରୁ ଆଘାତ ପାଖରେ ଥିବା ମୁଦି, ଚୁଡ଼ି ଓ ଢିଲା ପୋଷାକ ସାବଧାନରେ ଖୋଲିଦିଅନ୍ତୁ ।",
        "ସଂକ୍ରମଣରୁ ରକ୍ଷା ପାଇଁ ପରିଷ୍କାର ସଫା କପଡ଼ାରେ ଢିଲା ଭାବେ ଘୋଡ଼ାଇ ରଖନ୍ତୁ ।",
        "ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/DHH ର ବର୍ଣ୍ଣ ୱାର୍ଡ଼କୁ ନିଅନ୍ତୁ ।"
      ],
      "hi": [
        "जले हुए स्थान पर कम से कम 15 से 20 मिनट तक नल का साफ ठंडा पानी लगातार डालें।",
        "अंगूठी, कड़े और ढीले कपड़े सूजन आने से पहले उतार दें।",
        "संक्रमण से बचाने के लिए साफ सूखे कपड़े से ढकें।",
        "नजदीकी अस्पताल तुरंत ले जाएं।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT apply toothpaste, ink, engine oil, turmeric, cow dung, or butter.",
        "DO NOT use freezing ice or ice water.",
        "DO NOT pop or prick burn blisters."
      ],
      "or": [
        "କଦାପି କୋଲଗେଟ୍/ଟୁଥପେଷ୍ଟ, କାଳି, ତେଲ, ହଳଦୀ, ଗୋବର ବା ଘିଅ ଲଗାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ବରଫ ଲଗାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ପୋଡ଼ା ଫୋଟକାକୁ ଫୁଟାନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "टूथपेस्ट, स्याही, तेल, हल्दी, गोबर कभी न लगाएं।",
        "बर्फ का सीधा इस्तेमाल न करें।",
        "जले के छालों को न फोड़ें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "burn",
      "burns",
      "scald",
      "fire",
      "hot water",
      "electric burn",
      "ପୋଡ଼ିଯିବା",
      "ନିଆଁ",
      "ଗରମ ପାଣି",
      "ଜଳାପୋଡ଼ା",
      "ଫୋଟକା",
      "जलना",
      "झुलसना",
      "आग",
      "छाला"
    ]
  },
  {
    "id": "dogbite",
    "icon": "[RABIES AID]",
    "title": {
      "en": "Dog Bite & Rabies Prevention Protocol",
      "or": "କୁକୁର କାମୁଡ଼ା ଓ ରେବିସ୍ ସୁରକ୍ଷା ପ୍ରୋଟୋକଲ୍",
      "hi": "कुत्ता काटना व रेबीज रोकथाम"
    },
    "urgency": "HIGH",
    "summary": {
      "en": "15-minute continuous soap water wash + urgent Anti-Rabies Vaccine (ARV).",
      "or": "୧୫ ମିନିଟ୍ ସାବୁନ ଓ ଟ୍ୟାପ୍ ପାଣିରେ ଧୋଇବା + ତୁରନ୍ତ ଡାକ୍ତରଖାନାରେ ଆଣ୍ଟି-ରେବିସ୍ ଟିକା (ARV) ।",
      "hi": "15 मिनट तक साबुन-पानी से लगातार धोएं + तुरंत एंटी-रेबीज टीका (ARV) लगवाएं।"
    },
    "dos": {
      "en": [
        "Immediately wash bite wound under running tap water with soap for a FULL 15 MINUTES.",
        "Washing removes over 80% of rabies virus particles before they bind to nerves.",
        "Apply povidone-iodine (Betadine) antiseptic if available.",
        "Rush to nearest government CHC/DHH for full 4-dose Anti-Rabies Vaccine (ARV) regimen."
      ],
      "or": [
        "କାମୁଡ଼ା ବା ଆଞ୍ଚୁଡ଼ା ସ୍ଥାନକୁ ତୁରନ୍ତ ଟ୍ୟାପ୍ ର ଚାଲୁଥିବା ପାଣି ଏବଂ ସାବୁନରେ ପୂରା ୧୫ ମିନିଟ୍ ଧରି ଲଗାତାର ଧୁଅନ୍ତୁ ।",
        "ଏହି ୧୫ ମିନିଟ୍ ଧୋଇବା ଦ୍ୱାରା ୮୦% ରୁ ଅଧିକ ରେବିସ୍ ଭାଇରସ୍ ନଷ୍ଟ ହୋଇଯାଏ ।",
        "ଉପଲବ୍ଧ ଥିଲେ ପୋଭିଡୋନ୍-ଆୟୋଡିନ୍ (ବେଟାଡାଇନ୍) ଲଗାନ୍ତୁ ।",
        "ତୁରନ୍ତ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲକୁ ଯାଇ Anti-Rabies Vaccine (ARV) ଟିକା ନିଅନ୍ତୁ ।"
      ],
      "hi": [
        "घाव को तुरंत नल के बहते पानी और साबुन से पूरे 15 मिनट तक लगातार धोएं।",
        "15 मिनट धोने से 80% से अधिक रेबीज वायरस घाव से बाहर निकल जाता है।",
        "उपलब्ध हो तो पोविडोन-आयोडीन (बीटाडीन) लगाएं।",
        "तुरंत नजदीकी अस्पताल जाकर एंटी-रेबीज टीका (ARV) लगवाएं।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT stitch or suture the wound immediately.",
        "DO NOT apply chili powder, lime, mud, or plant juices."
      ],
      "or": [
        "କଦାପି କ୍ଷତରେ ତୁରନ୍ତ ସିଲେଇ ବା ଷ୍ଟିଚ୍ ପକାନ୍ତୁ ନାହିଁ ।",
        "କଦାପି ଲଙ୍କାଗୁଣ୍ଡ, ଚୂନ ବା ମାଟି ଲଗାନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "घाव पर तुरंत टांके कभी न लगवाएं।",
        "घाव पर मिर्च पाउडर, चूना, मिट्टी कभी न लगाएं।"
      ]
    },
    "helpline": "104",
    "keywords": [
      "dog",
      "dog bite",
      "rabies",
      "animal bite",
      "cat bite",
      "monkey bite",
      "arv",
      "କୁକୁର",
      "କୁକୁର କାମୁଡ଼ା",
      "ରେବିସ୍",
      "ପଶୁ କାମୁଡ଼ା",
      "ବିରାଡ଼ି",
      "ଟିକା",
      "कुत्ता",
      "काटना",
      "रेबीज",
      "टीका"
    ]
  },
  {
    "id": "choking",
    "icon": "[CHOKING AID]",
    "title": {
      "en": "Choking & Airway Emergency",
      "or": "ଶ୍ୱାସରୁଦ୍ଧ (ତଣ୍ଟିରେ ଖାଦ୍ୟ ଲାଗିଯିବା) ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      "hi": "दम घुटना (गले में कुछ अटकना) प्राथमिक उपचार"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "Heimlich maneuver for adults; back blows and chest thrusts for infants.",
      "or": "ବଡ଼ମଣିଷଙ୍କ ପାଇଁ ହାଇମଲିକ୍ ଚାପ ଏବଂ ଛୋଟ ଶିଶୁଙ୍କ ପାଇଁ ପିଠି ଥାପୁଡ଼ା ପଦ୍ଧତି ।",
      "hi": "वयस्कों के लिए हेमलिच पैंतरेबाजी और शिशुओं के लिए पीठ पर थपकी विधि।"
    },
    "dos": {
      "en": [
        "For Adults: Stand behind them, place fist above navel, give quick upward abdominal thrusts (Heimlich maneuver).",
        "For Infants: Place baby face down on forearm, deliver 5 firm back blows between shoulder blades.",
        "Call 108 immediately if victim cannot breathe or speak."
      ],
      "or": [
        "ବୟସ୍କଙ୍କ ପାଇଁ: ପଛପଟେ ଛିଡ଼ା ହୋଇ ନାଭି ଉପରେ ମୁଠା ରଖି ଉପର ଆଡ଼କୁ ଚାପ ଦିଅନ୍ତୁ (Heimlich Maneuver) ।",
        "ଶିଶୁଙ୍କ ପାଇଁ: ହାତ ଉପରେ ଶିଶୁର ମୁହଁ ତଳକୁ ରଖି ପିଠିର ଦୁଇ ଡେଣା ମଝିରେ ୫ ଥର ସାବଧାନରେ ଥାପୁଡ଼ା ଦିଅନ୍ତୁ ।",
        "ରୋଗୀ ଶ୍ୱାସ ନେଇ ନପାରିଲେ ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।"
      ],
      "hi": [
        "वयस्कों के लिए: पीछे खड़े होकर नाभि के ऊपर मुट्ठी रखकर ऊपर की ओर झटका दें।",
        "शिशु के लिए: मुंह नीचे रखकर पीठ पर 5 बार थपकी दें।",
        "तुरंत 108 पर कॉल करें।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT perform blind finger sweeps in mouth.",
        "DO NOT slap back while adult is standing upright."
      ],
      "or": [
        "ପାଟି ଭିତରେ ଅନ୍ଧାରିଆ ଭାବେ ଆଙ୍ଗୁଠି ପୂରାନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "मुंह में अंधी उंगली डालकर निकालने की कोशिश न करें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "choking",
      "airway",
      "swallowed",
      "food stuck",
      "cannot breathe",
      "heimlich",
      "ଶ୍ୱାସରୁଦ୍ଧ",
      "ତଣ୍ଟି",
      "ଅଟକିଯିବା",
      "ଉಬ್ಬାସ",
      "ଦମ୍ ବନ୍ଦ",
      "दम घुटना",
      "गले में अटकना"
    ]
  },
  {
    "id": "febrile",
    "icon": "[FEVER CARE]",
    "title": {
      "en": "Pediatric High Fever & Febrile Fits",
      "or": "ଶିଶୁଙ୍କ ଅତ୍ୟଧିକ ଜ୍ୱର ଓ କମ୍ପଜ୍ୱର (ବାତ ମାରିବା)",
      "hi": "बच्चों में तेज़ बुखार व दौरे (कम्पन)"
    },
    "urgency": "HIGH",
    "summary": {
      "en": "Safe recovery positioning and tepid tap-water sponging. Never force spoons into mouth.",
      "or": "ପିଲାଙ୍କୁ କଡ଼ ମାଡ଼ି ଶୁଆଇବା ଏବଂ ସାଧାରଣ ପାଣିରେ ସ୍ପଞ୍ଜ କରିବା । କଦାପି ପାଟିରେ ଚାମଚ ଦିଅନ୍ତୁ ନାହିଁ ।",
      "hi": "करवट लिटाएं और सामान्य पानी से स्पंज करें। मुंह में चम्मच या उंगली कभी न डालें।"
    },
    "dos": {
      "en": [
        "Place child gently onto their side (recovery position) to prevent choking on saliva.",
        "Sponge forehead, neck, and limbs continuously with normal room-temperature tap water.",
        "Loosen clothes and maintain gentle air circulation.",
        "Take child to nearest CHC/PHC for clinical evaluation after the fit stops."
      ],
      "or": [
        "ପିଲାକୁ ନରମ ବିଛଣାରେ କଡ଼ ମାଡ଼ି ଶୁଆନ୍ତୁ ଯାହାଦ୍ୱାରା ଲାଳ ବା ବାନ୍ତିରେ ଶ୍ୱାସରୁଦ୍ଧ ହେବ ନାହିଁ ।",
        "କପାଳ, ବେକ ଓ ହାତଗୋଡ଼କୁ ସାଧାରଣ ଟାପ୍ ପାଣି ପଟିରେ ଲଗାତାର ସ୍ପଞ୍ଜ କରନ୍ତୁ ।",
        "ବାତ ବନ୍ଦ ହେବା ପରେ ତୁରନ୍ତ ନିକଟସ୍ଥ CHC/PHC ଡାକ୍ତରଙ୍କ ପାଖକୁ ନିଅନ୍ତୁ ।"
      ],
      "hi": [
        "बच्चे को करवट लिटाएं ताकि लार से सांस न रुके।",
        "माथे, गर्दन और हाथ-पैरों पर सामान्य पानी की पट्टी रखकर स्पंज करें।",
        "दौरा शांत होने पर तुरंत अस्पताल ले जाएं।"
      ]
    },
    "donts": {
      "en": [
        "NEVER force a spoon, finger, or cloth into child's mouth during a seizure.",
        "NEVER give oral medicine or water while child is actively convulsing."
      ],
      "or": [
        "ବାତ ମାରୁଥିବା ସମୟରେ କଦାପି ପାଟିରେ ଚାମଚ, ଆଙ୍ଗୁଠି ବା କପଡ଼ା ଜୋରକରି ପୂରାନ୍ତୁ ନାହିଁ ।",
        "ଅଚେତ ଥିବା ବେଳେ ପାଟିରେ ଔଷଧ ବା ପାଣି ଦିଅନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "दौरे के समय मुंह में चम्मच या उंगली बिल्कुल न डालें।",
        "बेहोशी में मुंह में दवा या पानी न डालें।"
      ]
    },
    "helpline": "104",
    "keywords": [
      "fever",
      "high fever",
      "convulsions",
      "seizures",
      "fits",
      "child fever",
      "febrile",
      "ଜ୍ୱର",
      "ବାତ",
      "କମ୍ପ",
      "ପିଲା ଜ୍ୱର",
      "ଫିଟ୍ସ",
      "ତେଜ ଜ୍ୱର",
      "बुखार",
      "दौरा",
      "कम्पन",
      "बच्चा"
    ]
  },
  {
    "id": "drowning",
    "icon": "[RESCUE AID]",
    "title": {
      "en": "Drowning & CPR First Aid Protocol",
      "or": "ପାଣିରେ ବୁଡ଼ିଯିବା ଓ CPR ପ୍ରାଥମିକ ଚିକିତ୍ସା",
      "hi": "डूबने पर प्राथमिक उपचार व सीपीआर"
    },
    "urgency": "CRITICAL",
    "summary": {
      "en": "Safe extrication, clearing airway, and immediate CPR (30 compressions : 2 rescue breaths).",
      "or": "ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର, ଶ୍ୱାସନଳୀ ସଫା କରିବା ଏବଂ ତୁରନ୍ତ CPR (୩୦ ଛାତି ଚାପ : ୨ ଶ୍ୱାସ) ।",
      "hi": "सुरक्षित बाहर निकालें, सांस की नली साफ करें और तुरंत सीपीआर (30 दबाव : 2 सांस) दें।"
    },
    "dos": {
      "en": [
        "Remove victim from water safely. Call 108 immediately.",
        "Check breathing. If not breathing normally, place on firm ground.",
        "Start CPR: Place heel of hand on center of chest. Push hard and fast (100-120 compressions/min).",
        "Give 30 chest compressions followed by 2 gentle rescue breaths."
      ],
      "or": [
        "ରୋଗୀଙ୍କୁ ପାଣିରୁ ସୁରକ୍ଷିତ ଉଦ୍ଧାର କରନ୍ତୁ । ତୁରନ୍ତ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।",
        "ଶ୍ୱାସ ନଚାଲିଲେ ଟାଣ ଚଟାଣରେ ଶୁଆଇ ତୁରନ୍ତ CPR ଆରମ୍ଭ କରନ୍ତୁ (ମିନିଟକୁ ୧୦୦-୧୨୦ ଥର ଛାତି ଚାପ) ।",
        "୩୦ ଥର ଛାତି ଚାପ ପରେ ମୁଣ୍ଡ ଟେକି ନାକ ଚିପି ପାଟିରେ ୨ ଥର ଫୁଙ୍କ ଦିଅନ୍ତୁ ।"
      ],
      "hi": [
        "मरीज को पानी से सुरक्षित बाहर निकालें। तुरंत 108 पर एम्बुलेंस बुलाएं।",
        "सांस न चलने पर तुरंत सीपीआर (30 दबाव : 2 सांस) शुरू करें।"
      ]
    },
    "donts": {
      "en": [
        "DO NOT waste time trying to pump water out of the stomach.",
        "DO NOT delay CPR if breathing is absent."
      ],
      "or": [
        "ପେଟରୁ ପାଣି ବାହାର କରିବା ପାଇଁ ଓଲଟା କରି ସମୟ ନଷ୍ଟ କରନ୍ତୁ ନାହିଁ ।",
        "ଶ୍ୱାସ ଚାଲୁନଥିଲେ CPR ଆରମ୍ଭ କରିବାରେ ଆଦୌ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ ।"
      ],
      "hi": [
        "पेट से पानी निकालने के चक्कर में उल्टा लटकाकर समय बर्बाद न करें।"
      ]
    },
    "helpline": "108",
    "keywords": [
      "drowning",
      "water",
      "pond",
      "river",
      "cpr",
      "submersion",
      "ପାଣିରେ ବୁଡ଼ିଯିବା",
      "ନଈ",
      "ପୋଖରୀ",
      "ପାଣି",
      "ଶ୍ୱାସ ବନ୍ଦ",
      "डूबना",
      "पानी",
      "सीपीआर"
    ]
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

    const dosHeader = isHi ? 'क्या करें (प्राथमिक उपचार):' : (isOr ? 'କ\'ଣ କରିବେ (ପ୍ରାଥମିକ ଚିକିତ୍ସା):' : 'WHAT TO DO (First Aid):');
    const dontsHeader = isHi ? 'क्या न करें (सख्त मना):' : (isOr ? 'କ\'ଣ କରିବେ ନାହିଁ (କଡ଼ା ନିଷେଧ):' : 'WHAT NOT TO DO (Dangerous):');
    const doctorHeader = isHi ? 'डॉक्टर परामर्श:' : (isOr ? 'ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ:' : 'Hospital Consultation:');
    const doctorText = isHi
      ? 'तत्काल नजदीकी सीएचसी (CHC) या सरकारी अस्पताल ले जाएं। 108 पर कॉल करें।'
      : (isOr
        ? 'ତୁରନ୍ତ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲ ବା CHC କୁ ନିଅନ୍ତୁ । ଆମ୍ବୁଲାନ୍ସ ପାଇଁ ୧୦୮ କୁ କଲ୍ କରନ୍ତୁ ।'
        : 'Immediately transfer to nearest Community Health Centre (CHC) or District Hospital. Call 108 for ambulance.');

    let out = '**' + title + '**\n\n';
    out += '**' + (isHi ? 'प्रोटोकॉल सारांश' : (isOr ? 'ପ୍ରୋଟୋକଲ୍ ସାରାଂଶ' : 'Protocol Overview')) + ':** ' + summary + '\n\n';
    out += '**' + dosHeader + '**\n' + dosList.map((d) => '• ' + d).join('\n') + '\n\n';
    out += '**' + dontsHeader + '**\n' + dontsList.map((d) => '• ' + d).join('\n') + '\n\n';
    out += '**' + doctorHeader + '** ' + doctorText;
    return out;
  }

  function formatDefaultOfflineGuide(lang) {
    const isOr = lang === 'or';
    const isHi = lang === 'hi';
    if (isHi) {
      return '**ऑफ़लाइन आपातकालीन सेवा सक्रिय**\n\n**ऑफ़लाइन गाइड:** इंटरनेट कनेक्शन उपलब्ध नहीं है। स्वास्थ एआई में 10 जीवनरक्षक आपातकालीन प्रोटोकॉल और ओडिशा के सभी 249 सरकारी अस्पताल पहले से सुरक्षित (Pre-installed) हैं।\n\n**उपलब्ध सुविधाएँ:**\n• ऊपर "आपातकालीन ऑफ़लाइन गाइड" बटन दबाकर सर्पदंश, लू, दस्त, प्रसव व जलने के प्रोटोकॉल देखें।\n• सभी 30 जिलों के 249 अस्पतालों की सूची बिना इंटरनेट के देखें।\n\n**आपातकालीन हेल्पलाइन:**\n• एम्बुलेंस: 108 | आपदा व पुलिस: 112 | स्वास्थ्य सलाह: 104';
    }
    if (isOr) {
      return '**ଅଫଲାଇନ୍ ଜରୁରୀକାଳୀନ ସେବା ସକ୍ରିୟ**\n\n**ଅଫଲାଇନ୍ ସୂଚନା:** ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଉପଲବ୍ଧ ନାହିଁ । ସ୍ୱାସ୍ଥ୍ୟ AI ରେ ୧୦ଟି ପ୍ରମୁଖ ଜରୁରୀକାଳୀନ ଚିକିତ୍ସା ନିର୍ଦ୍ଦେଶାବଳୀ ଏବଂ ଓଡ଼ିଶାର ସମସ୍ତ ୨୪୯ ସରକାରୀ ଡାକ୍ତରଖାନା ପୂର୍ବରୁ ଆପଣଙ୍କ ଫୋନରେ ସୁରକ୍ଷିତ ଅଛି ।\n\n**ଅଫଲାଇନ୍ ଉପଲବ୍ଧ ସୁବିଧା:**\n• ଉପରେ ଥିବା "ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ କେୟାର" ବଟନ୍ ଦବାଇ ସାପ କାମୁଡ଼ା, ଅଂଶୁଘାତ, ଝାଡ଼ା ଓ ଗର୍ଭବତୀ ବିପଦ ଲକ୍ଷଣ ଦେଖନ୍ତୁ ।\n• ୩୦ଟି ଜିଲ୍ଲାର ୨୪୯ ସରକାରୀ ଡାକ୍ତରଖାନା ବିନା ଇଣ୍ଟରନେଟରେ ଖୋଜନ୍ତୁ ।\n\n**ଜରୁରୀକାଳୀନ ନମ୍ବର:**\n• ଆମ୍ବୁଲାନ୍ସ: ୧୦୮ | ଜରୁରୀ ସହାୟତା: ୧୧୨ | ସ୍ୱାସ୍ଥ୍ୟ ପରାମର୍ଶ: ୧୦୪';
    }
    return '**Offline Emergency Protocol Active**\n\n**Offline Mode:** No active internet connection detected. Swasth AI has 10 pre-installed emergency life-saving protocols and all 249 Odisha government hospitals stored locally on your device.\n\n**Offline Capabilities:**\n• Tap the "Offline Protocols" button above to browse Snakebite, Heatstroke, Diarrhea, Maternal, and Burn protocols.\n• Search all 249 government hospitals across 30 districts completely offline.\n\n**Emergency Helplines:**\n• Ambulance: 108 | National Emergency: 112 | Health Helpline: 104';
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

      card.innerHTML = `
        <div class="offline-proto-head">
          <div class="offline-proto-title-box">
            <span class="offline-proto-icon">${p.icon}</span>
            <span class="offline-proto-title">${title}</span>
          </div>
          <div class="offline-proto-meta">
            <span class="offline-proto-badge badge-${p.urgency === 'CRITICAL' ? 'critical' : 'high'}">${p.urgency}</span>
            <span class="offline-proto-chevron">▼</span>
          </div>
        </div>
        <div class="offline-proto-body">
          <p class="offline-summary-text">${summary}</p>
          <div class="offline-section-box box-dos">
            <strong>${isHi ? 'क्या करें (DOs):' : (isOr ? 'କ\'ଣ କରିବେ:' : 'What to do (DOs):')}</strong>
            <ul class="offline-list">
              ${dosList.map((item) => '<li>' + item + '</li>').join('')}
            </ul>
          </div>
          <div class="offline-section-box box-donts">
            <strong>${isHi ? 'क्या न करें (DON\'Ts):' : (isOr ? 'କ\'ଣ କରିବେ ନାହିଁ:' : 'What NOT to do (DON\'Ts):')}</strong>
            <ul class="offline-list">
              ${dontsList.map((item) => '<li>' + item + '</li>').join('')}
            </ul>
          </div>
          <div class="offline-proto-foot">
            <span style="font-size:0.75rem; color:#64748b;">${isHi ? 'आपातकालीन सहायता:' : (isOr ? 'ଜରୁରୀକାଳୀନ ସେବା:' : 'Emergency Helpline:')}</span>
            <a href="tel:${p.helpline}" class="btn-offline-call">Call ${p.helpline}</a>
          </div>
        </div>
      `;

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
          ? 'ऑफ़लाइन आपातकालीन सेवा सक्रिय • 10 प्रोटोकॉल व 249 अस्पताल सुरक्षित'
          : (currentLang === 'or'
            ? 'ଜରୁରୀକାଳୀନ ଅଫଲାଇନ୍ ମୋଡ୍ ସକ୍ରିୟ • ୧୦ଟି ପ୍ରୋଟୋକଲ୍ ଓ ୨୪୯ ଡାକ୍ତରଖାନା ଉପଲବ୍ଧ'
            : 'Offline Emergency Care Active • 10 Critical Protocols & 249 Hospitals Offline');
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

  // ---------- Boot / Init ----------
  sb.auth.onAuthStateChange((_event, session) => route(session));
  sb.auth.getSession().then(({ data }) => route(data && data.session)).catch(() => route(null));
  setMode('signin');
})();
