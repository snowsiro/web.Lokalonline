(function () {
  'use strict';

  var ADMIN_EMAIL = 'snowsiro@gmail.com';
  var sbClient = window.supabase
    ? window.supabase.createClient(
        'https://vhnourjddnlslgabrasb.supabase.co',
        'sb_publishable_y5l1cAZXoAj8xaSVXUkBfw_Pk9pxb6H'
      )
    : null;

  // ── Auth state ────────────────────────────────────────────────────
  function updateNavAuth(session) {
    var openBtn  = document.getElementById('openAuthBtn');
    var navUser  = document.getElementById('navUser');
    var mobileLink = document.getElementById('mobileAuthLink');

    if (session) {
      var email = session.user.email;
      var initial = email.charAt(0).toUpperCase();
      if (openBtn)  openBtn.style.display = 'none';
      if (navUser)  navUser.style.display = 'flex';
      var initEl = document.getElementById('userInitial');
      if (initEl) initEl.textContent = initial;
      // 포털 링크 설정
      var portalLink = document.getElementById('portalLink');
      if (portalLink) {
        portalLink.href = email === ADMIN_EMAIL ? '/admin/dashboard.html' : '/portal/dashboard.html';
        portalLink.textContent = currentLang === 'en' ? 'My area' : 'Mein Bereich';
      }
      if (mobileLink) {
        mobileLink.textContent = currentLang === 'en' ? 'My area' : 'Mein Bereich';
        mobileLink.href = email === ADMIN_EMAIL ? '/admin/dashboard.html' : '/portal/dashboard.html';
      }
    } else {
      if (openBtn)  openBtn.style.display = '';
      if (navUser)  navUser.style.display = 'none';
      if (mobileLink) {
        mobileLink.textContent = currentLang === 'en' ? 'Sign in' : 'Anmelden';
        mobileLink.href = '#';
        mobileLink.onclick = function (e) { e.preventDefault(); openAuthModal('login'); };
      }
    }
  }

  if (sbClient) {
    sbClient.auth.getSession().then(function (ref) {
      updateNavAuth(ref.data.session);
    });
    sbClient.auth.onAuthStateChange(function (event, session) {
      updateNavAuth(session);
    });
  }

  // ── Auth modal ────────────────────────────────────────────────────
  function openAuthModal(panel) {
    var overlay = document.getElementById('authOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (panel) switchPanel(panel);
  }

  function closeAuthModal() {
    var overlay = document.getElementById('authOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function switchPanel(name) {
    document.querySelectorAll('.auth-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-panel') === name);
    });
    document.querySelectorAll('.auth-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel' + name.charAt(0).toUpperCase() + name.slice(1));
    });
  }

  var openAuthBtn = document.getElementById('openAuthBtn');
  var closeAuth   = document.getElementById('closeAuth');
  var authOverlay = document.getElementById('authOverlay');

  if (openAuthBtn) openAuthBtn.addEventListener('click', function () { openAuthModal('login'); });
  if (closeAuth)   closeAuth.addEventListener('click', closeAuthModal);
  if (authOverlay) authOverlay.addEventListener('click', function (e) { if (e.target === authOverlay) closeAuthModal(); });

  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { switchPanel(tab.getAttribute('data-panel')); });
  });

  // Login
  var loginSubmitBtn = document.getElementById('loginSubmitBtn');
  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', async function () {
      var email    = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;
      var errEl    = document.getElementById('loginError');
      errEl.classList.remove('show');
      loginSubmitBtn.disabled = true; loginSubmitBtn.textContent = '…';

      var { error } = await sbClient.auth.signInWithPassword({ email: email, password: password });
      if (error) {
        errEl.textContent = 'E-Mail oder Passwort falsch.';
        errEl.classList.add('show');
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = currentLang === 'en' ? 'Sign in' : 'Anmelden';
      } else {
        closeAuthModal();
        var dest = email === ADMIN_EMAIL ? '/admin/dashboard.html' : '/portal/dashboard.html';
        location.href = dest;
      }
    });
  }

  // Signup
  var signupSubmitBtn = document.getElementById('signupSubmitBtn');
  if (signupSubmitBtn) {
    signupSubmitBtn.addEventListener('click', async function () {
      var name     = document.getElementById('signupName').value.trim();
      var email    = document.getElementById('signupEmail').value.trim();
      var password = document.getElementById('signupPassword').value;
      var errEl    = document.getElementById('signupError');
      var okEl     = document.getElementById('signupSuccess');
      errEl.classList.remove('show');
      okEl.style.display = 'none';

      if (!name || !email || password.length < 6) {
        errEl.textContent = currentLang === 'en' ? 'Please fill all fields (min. 6 char password).' : 'Bitte alle Felder ausfüllen (Passwort mind. 6 Zeichen).';
        errEl.classList.add('show'); return;
      }

      signupSubmitBtn.disabled = true; signupSubmitBtn.textContent = '…';
      var meta = {
        full_name: name,
        business:  document.getElementById('signupBusiness').value.trim() || null,
        phone:     document.getElementById('signupPhone').value.trim() || null,
        address:   document.getElementById('signupAddress').value.trim() || null,
        instagram: document.getElementById('signupInstagram').value.trim() || null,
        website:   document.getElementById('signupWebsite').value.trim() || null
      };
      var { error } = await sbClient.auth.signUp({ email: email, password: password, options: { data: meta } });

      if (error) {
        errEl.textContent = error.message;
        errEl.classList.add('show');
      } else {
        okEl.style.display = 'block';
        document.getElementById('signupName').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        // 바로 로그인 후 포털로
        setTimeout(function () {
          closeAuthModal();
          location.href = '/portal/dashboard.html';
        }, 1200);
      }
      signupSubmitBtn.disabled = false;
      signupSubmitBtn.textContent = currentLang === 'en' ? 'Create account' : 'Konto erstellen';
    });
  }

  // User dropdown toggle
  var userMenuBtn  = document.getElementById('userMenuBtn');
  var userDropdown = document.getElementById('userDropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function () { userDropdown.classList.remove('open'); });
  }

  // Signout
  var signoutBtn = document.getElementById('signoutBtn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async function () {
      await sbClient.auth.signOut();
      location.reload();
    });
  }

  // ── Language toggle ──────────────────────────────────────────────
  let currentLang = localStorage.getItem('lang') || 'de';

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-de]').forEach(function (el) {
      var text = el.getAttribute('data-' + lang);
      if (!text) return;
      if (el.tagName === 'INPUT' || el.tagName === 'OPTION') {
        el.textContent = text;
      } else if (el.tagName === 'TEXTAREA') {
        // leave placeholder alone
      } else {
        el.textContent = text;
      }
    });

    // Update select option text
    document.querySelectorAll('select option[data-de]').forEach(function (opt) {
      var text = opt.getAttribute('data-' + lang);
      if (text) opt.textContent = text;
    });

    // Update page title
    if (lang === 'en') {
      document.title = 'lokalonline — Websites for Vienna\'s small businesses';
    } else {
      document.title = 'lokalonline — Websites für Wiener Kleinunternehmen';
    }

    var btn = document.getElementById('langToggle');
    if (btn) btn.textContent = lang === 'de' ? 'EN' : 'DE';

    // Update form placeholders
    var placeholders = {
      de: { name: 'Maria Mustermann', business: 'Café Wien', email: 'maria@example.at', phone: '+43 660 000 00 00', message: 'Erzählen Sie uns kurz von Ihrem Betrieb...' },
      en: { name: 'Maria Sample', business: 'Café Vienna', email: 'maria@example.at', phone: '+43 660 000 00 00', message: 'Tell us briefly about your business...' }
    };
    var p = placeholders[lang];
    setPlaceholder('name', p.name);
    setPlaceholder('business', p.business);
    setPlaceholder('email', p.email);
    setPlaceholder('phone', p.phone);
    setPlaceholder('message', p.message);
  }

  function setPlaceholder(id, text) {
    var el = document.getElementById(id);
    if (el) el.placeholder = text;
  }

  var langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      applyLang(currentLang === 'de' ? 'en' : 'de');
    });
  }

  // Apply saved language on load (skip if 'de' since HTML already defaults to German)
  if (currentLang === 'en') applyLang('en');

  // ── Mobile nav burger ─────────────────────────────────────────────
  var burger = document.getElementById('navBurger');
  var mobileMenu = document.getElementById('navMobile');

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
      });
    });
  }

  // ── Pricing toggle ────────────────────────────────────────────────
  var billingToggle = document.getElementById('billingToggle');

  function updatePrices(yearly) {
    document.querySelectorAll('.price-amount').forEach(function (el) {
      var monthly = parseFloat(el.getAttribute('data-monthly'));
      var yearlyVal = parseFloat(el.getAttribute('data-yearly'));
      if (yearly) {
        el.textContent = '€' + yearlyVal.toFixed(2).replace('.00', '');
      } else {
        el.textContent = '€' + monthly;
      }
    });

    var perLabels = document.querySelectorAll('.price-per');
    perLabels.forEach(function (el) {
      var deText = yearly ? '/Monat*' : '/Monat';
      var enText = yearly ? '/month*' : '/month';
      el.setAttribute('data-de', deText);
      el.setAttribute('data-en', enText);
      el.textContent = currentLang === 'en' ? enText : deText;
    });
  }

  if (billingToggle) {
    billingToggle.addEventListener('change', function () {
      updatePrices(this.checked);
    });
  }

  // ── Contact form (Supabase) ───────────────────────────────────────
  var form = document.getElementById('contactForm');
  var successMsg = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; }

      var payload = {
        name: form.name.value.trim(),
        business: form.business.value.trim() || null,
        email: form.email.value.trim(),
        phone: form.phone.value.trim() || null,
        plan_interest: form.plan.value || null,
        message: form.message.value.trim() || null,
        status: 'new'
      };

      var ok = false;
      if (sbClient) {
        var ref = await sbClient.from('inquiries').insert([payload]);
        ok = !ref.error;
      }

      if (ok) {
        form.reset();
        if (successMsg) successMsg.classList.add('show');
      } else {
        alert(
          currentLang === 'en'
            ? 'Something went wrong. Please try again or contact us directly.'
            : 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.'
        );
      }
      if (submitBtn) { submitBtn.disabled = false; }
    });
  }

  // ── Footer year ───────────────────────────────────────────────────
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Smooth scroll for nav links ───────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Nav shadow on scroll ──────────────────────────────────────────
  var navWrapper = document.querySelector('.nav-wrapper');
  if (navWrapper) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 8) {
        navWrapper.style.boxShadow = '0 2px 20px rgba(30,58,95,0.1)';
      } else {
        navWrapper.style.boxShadow = 'none';
      }
    }, { passive: true });
  }

  // ── Promo popup ───────────────────────────────────────────────────
  var TOTAL_SPOTS = 10;
  var TAKEN_SPOTS = 0; // 실제 계약 수로 업데이트하세요

  var overlay   = document.getElementById('promoOverlay');
  var closeBtn  = document.getElementById('promoClose');
  var dismissBtn = document.getElementById('promoDismiss');
  var popupCta  = document.querySelector('.popup-cta');

  function openPopup() {
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // 언어 반영
    overlay.querySelectorAll('[data-de]').forEach(function (el) {
      var text = el.getAttribute('data-' + currentLang);
      if (text) el.textContent = text;
    });
  }

  function closePopup() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    sessionStorage.setItem('promoClosed', '1');
  }

  if (closeBtn)  closeBtn.addEventListener('click', closePopup);
  if (dismissBtn) dismissBtn.addEventListener('click', closePopup);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });
  }
  if (popupCta) {
    popupCta.addEventListener('click', closePopup);
  }

  // 세션당 1회만 표시 (닫은 경우 재표시 안 함)
  if (!sessionStorage.getItem('promoClosed') && TAKEN_SPOTS < TOTAL_SPOTS) {
    setTimeout(openPopup, 1800);
  }

})();
