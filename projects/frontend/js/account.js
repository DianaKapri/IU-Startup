document.addEventListener('DOMContentLoaded', function () {
'use strict';

// ─── Scroll Animations ───
function initScrollAnimations() {
  if (typeof window.IntersectionObserver !== 'function') {
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('fade-in--visible');
    });
    return;
  }

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in--visible');
      }
    });
  }, observerOptions);

  // Наблюдаем за элементами с классом fade-in
  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

// ─── Enhanced Hover Effects ───
function initHoverEffects() {
  // Эффекты для карточек продуктов
  const productCards = document.querySelectorAll('.pg-product-card');
  productCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Эффекты для кнопок
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 8px 16px rgba(0,113,227,0.3)';
    });
    
    btn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
  });

  // Эффекты для вкладок
  const tabs = document.querySelectorAll('.acc-tab');
  tabs.forEach(tab => {
    tab.addEventListener('mouseenter', function() {
      if (!this.classList.contains('acc-tab--active')) {
        this.style.backgroundColor = 'rgba(255,255,255,0.08)';
      }
    });
    
    tab.addEventListener('mouseleave', function() {
      if (!this.classList.contains('acc-tab--active')) {
        this.style.backgroundColor = 'transparent';
      }
    });
  });
}

// ─── Parallax Effects ───
function initParallaxEffects() {
  const header = document.querySelector('.acc-header');
  const intro = document.querySelector('.acc-intro');
  
  if (header || intro) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;
      
      if (header) {
        header.style.transform = `translateY(${rate * 0.3}px)`;
        header.style.opacity = 1 - scrolled / 500;
      }
      
      if (intro) {
        intro.style.transform = `translateY(${rate * 0.2}px)`;
      }
    });
  }
}

// Инициализация всех эффектов
initScrollAnimations();
initHoverEffects();
initParallaxEffects();

// Top-level handle so the profile-save handler can refresh the header
// once the dashboard initialises it inside spRequireAuth.
var __refreshHeader = function () {};

// Profile menu + modals are bound at top level (NOT inside spRequireAuth)
// so the dropdown opens even if Supabase fails to initialise. Otherwise
// the auth callback never runs and every click handler stays unbound.
initProfileUI();

function initProfileUI() {
  var profileModal   = document.getElementById('profileModal');
  var profileOverlay = document.getElementById('profileOverlay');
  var profileClose   = document.getElementById('profileClose');
  var profileForm    = document.getElementById('profileForm');
  var navProfileBtn  = document.getElementById('navProfileBtn');
  var profileMenu    = document.getElementById('profileMenu');
  var profileWrap    = navProfileBtn ? navProfileBtn.parentNode : null;

  /* ─── Profile dropdown menu ─── */
  function setMenuOpen(open) {
    if (!profileWrap || !navProfileBtn) return;
    profileWrap.classList.toggle('is-open', !!open);
    navProfileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (profileMenu) profileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  function toggleMenu() {
    setMenuOpen(!(profileWrap && profileWrap.classList.contains('is-open')));
  }

  if (navProfileBtn) {
    navProfileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });
  }
  document.addEventListener('click', function (e) {
    if (!profileWrap) return;
    if (!profileWrap.contains(e.target)) setMenuOpen(false);
  });

  function clearProfileErrors() {
    ['profileNameErr','profileSchoolErr','profileEmailErr'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = '';
    });
  }
  function profileErr(id, msg) {
    var el = document.getElementById(id); if (el) el.textContent = msg;
  }

  function openProfile() {
    setMenuOpen(false);
    if (!profileModal) return;
    var nameEl    = document.getElementById('profileName');
    var schoolEl  = document.getElementById('profileSchool');
    var emailEl   = document.getElementById('profileEmail');
    var successEl = document.getElementById('profileSuccess');
    var globalErr = document.getElementById('profileGlobalErr');
    if (successEl) successEl.style.display = 'none';
    if (globalErr) globalErr.textContent   = '';
    clearProfileErrors();
    profileModal.classList.add('profile-modal--open');
    if (profileOverlay) profileOverlay.classList.add('profile-overlay--open');

    spGetCurrentUser().then(function (u) {
      if (!u) return;
      if (nameEl)   nameEl.value   = u.name || '';
      if (schoolEl) schoolEl.value = u.school || '';
      if (emailEl)  emailEl.value  = u.email || '';
      if (nameEl)   nameEl.focus();
    }).catch(function () { /* keep modal open with empty fields */ });
  }

  function closeProfile() {
    if (profileModal)   profileModal.classList.remove('profile-modal--open');
    if (profileOverlay) profileOverlay.classList.remove('profile-overlay--open');
    closePassword();
  }

  /* ─── Change-password dialog ─── */
  var passwordModal = document.getElementById('passwordModal');
  var passwordForm  = document.getElementById('passwordForm');
  var passwordClose = document.getElementById('passwordClose');

  function clearPasswordErrors() {
    ['currentPasswordErr','newPasswordErr','newPasswordConfirmErr'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = '';
    });
    var globalErr = document.getElementById('passwordGlobalErr');
    if (globalErr) globalErr.textContent = '';
  }
  function passwordErr(id, msg) {
    var el = document.getElementById(id); if (el) el.textContent = msg;
  }

  function openPassword() {
    setMenuOpen(false);
    if (!passwordModal) return;
    ['currentPassword','newPassword','newPasswordConfirm'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var successEl = document.getElementById('passwordSuccess');
    if (successEl) successEl.style.display = 'none';
    clearPasswordErrors();
    passwordModal.classList.add('profile-modal--open');
    if (profileOverlay) profileOverlay.classList.add('profile-overlay--open');
    var firstInput = document.getElementById('currentPassword');
    if (firstInput) firstInput.focus();
  }

  function closePassword() {
    if (passwordModal)  passwordModal.classList.remove('profile-modal--open');
    if (profileOverlay && profileModal && !profileModal.classList.contains('profile-modal--open')) {
      profileOverlay.classList.remove('profile-overlay--open');
    }
  }

  if (passwordClose) passwordClose.addEventListener('click', closePassword);

  if (passwordForm) {
    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof cooldown === 'function' && !cooldown('changePassword')) return;
      clearPasswordErrors();

      var current = (document.getElementById('currentPassword')    || {}).value || '';
      var next    = (document.getElementById('newPassword')        || {}).value || '';
      var confirm = (document.getElementById('newPasswordConfirm') || {}).value || '';

      var valid = true;
      if (!current) { passwordErr('currentPasswordErr', 'Введите текущий пароль'); valid = false; }
      if (!next || next.length < 6) {
        passwordErr('newPasswordErr', 'Не менее 6 символов'); valid = false;
      }
      if (next !== confirm) {
        passwordErr('newPasswordConfirmErr', 'Пароли не совпадают'); valid = false;
      }
      if (!valid) return;

      var globalErr = document.getElementById('passwordGlobalErr');
      var submitBtn = passwordForm.querySelector('button[type="submit"]');
      var origLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Сохраняем…'; }

      spChangePassword(current, next).then(function (res) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
        if (!res.ok) {
          if (globalErr) globalErr.textContent = res.error || 'Не удалось изменить пароль';
          return;
        }
        var successEl = document.getElementById('passwordSuccess');
        if (successEl) successEl.style.display = 'block';
        ['currentPassword','newPassword','newPasswordConfirm'].forEach(function (id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        setTimeout(closePassword, 1600);
      }).catch(function (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
        if (globalErr) globalErr.textContent = (err && err.message) || 'Не удалось изменить пароль';
      });
    });
  }

  /* ─── Profile form submit ─── */
  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof cooldown === 'function' && !cooldown('profileSave')) return;
      clearProfileErrors();
      var globalErr = document.getElementById('profileGlobalErr');
      if (globalErr) globalErr.textContent = '';

      var nameVal   = (document.getElementById('profileName')   || {}).value.trim();
      var schoolVal = (document.getElementById('profileSchool') || {}).value.trim();
      var emailVal  = (document.getElementById('profileEmail')  || {}).value.trim().toLowerCase();

      var valid = true;
      if (!nameVal)   { profileErr('profileNameErr', 'Введите имя'); valid = false; }
      if (!schoolVal) { profileErr('profileSchoolErr', 'Введите название школы'); valid = false; }
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        profileErr('profileEmailErr', 'Введите корректный email'); valid = false;
      }
      if (!valid) return;

      spUpdateProfile(nameVal, schoolVal, emailVal, null).then(function (res) {
        if (!res.ok) {
          if (globalErr) globalErr.textContent = res.error || 'Ошибка сохранения';
          return;
        }
        var successEl = document.getElementById('profileSuccess');
        if (successEl) successEl.style.display = 'block';
        try { __refreshHeader(); } catch (_) {}
        setTimeout(closeProfile, 1400);
      });
    });
  }

  /* ─── Menu item handlers ─── */
  var menuOpenProfile    = document.getElementById('menuOpenProfile');
  var menuChangePassword = document.getElementById('menuChangePassword');
  var menuLogout         = document.getElementById('menuLogout');

  if (menuOpenProfile)    menuOpenProfile.addEventListener('click', openProfile);
  if (menuChangePassword) menuChangePassword.addEventListener('click', openPassword);
  if (menuLogout) {
    menuLogout.addEventListener('click', function () {
      if (typeof cooldown === 'function' && !cooldown('logout')) return;
      setMenuOpen(false);
      spLogout().then(function () { window.location.href = '/'; })
        .catch(function () { window.location.href = '/'; });
    });
  }

  if (profileOverlay) profileOverlay.addEventListener('click', closeProfile);
  if (profileClose)   profileClose.addEventListener('click', closeProfile);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setMenuOpen(false);
      closeProfile();
    }
  });
}

spRequireAuth(function () {
  var user = null;

  /* ═══ Plan helpers (T-3.1, T-3.2) ═══ */
  function formatPlanDate(isoString) {
    if (!isoString) return '';
    try {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }).format(d);
    } catch (_) { return ''; }
  }

  function isPlanExpired(u) {
    if (!u) return true;
    if (!u.plan_expires_at) return u.plan !== 'paid' ? false : true; // paid without date = expired (fail-closed)
    var t = new Date(u.plan_expires_at).getTime();
    if (isNaN(t)) return true;
    return t <= Date.now();
  }

  function hasPaidAccess(u) {
    return !!u && u.plan === 'paid' && !isPlanExpired(u);
  }

  function renderPlanBadge(u) {
    var badge = document.getElementById('planBadge');
    if (!badge || !u) return;
    badge.className = 'plan-badge';
    if (u.plan === 'paid') {
      var dateStr = formatPlanDate(u.plan_expires_at);
      badge.textContent = dateStr ? ('Тариф активен до ' + dateStr) : 'Тариф активен';
      badge.classList.add('plan-badge--paid');
    } else if (u.plan === 'trial') {
      var td = formatPlanDate(u.plan_expires_at);
      badge.textContent = td ? ('Пробный до ' + td) : 'Пробный период';
      badge.classList.add('plan-badge--trial');
    } else {
      badge.textContent = 'Тариф: Бесплатно';
      badge.classList.add('plan-badge--free');
    }
    badge.hidden = false;
  }

  var LOCK_SVG = '<svg class="plan-lock" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  function decorateBuildCardLock(u) {
    var buildCard = document.getElementById('accModeBuild');
    if (!buildCard) return;
    var existing = buildCard.querySelector('.plan-lock');
    if (hasPaidAccess(u)) {
      if (existing) existing.remove();
    } else {
      if (!existing) {
        var wrap = document.createElement('span');
        wrap.innerHTML = LOCK_SVG;
        var svg = wrap.firstChild;
        if (svg) buildCard.appendChild(svg);
      }
    }
  }

  /* ═══ Fill nav header ═══ */
  function refreshHeader() {
    spGetCurrentUser().then(function (u) {
      if (!u) return;
      user = u;
      window.currentUser = u;
      var accName    = document.getElementById('accName');
      var accSchool  = document.getElementById('accSchool');
      var accAvatar  = document.getElementById('accAvatar');
      var dashTitle  = document.getElementById('accDashTitle');
      var accWelcome = document.getElementById('accWelcome');
      var navBuyBtn  = document.getElementById('navBuyBtn');
      var firstName  = (u.name || '').split(' ')[0] || u.name;
      if (accName)    accName.textContent    = u.name;
      if (accSchool)  accSchool.textContent  = u.school;
      if (accAvatar)  accAvatar.textContent  = (u.name || 'У').charAt(0).toUpperCase();
      if (dashTitle) {
        var schoolLabel = u.school ? String(u.school) : '';
        dashTitle.innerHTML = schoolLabel
          ? ('С возвращением,<br/><span class="acc-header__title--gradient">' + schoolLabel.replace(/[<>&"']/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c];}) + '</span>')
          : 'Ваше расписание —<br/><span class="acc-header__title--gradient">без нарушений СанПиН</span>';
      }
      if (accWelcome) accWelcome.innerHTML = 'Привет, ' + firstName + '. Загрузите готовое расписание — найдём нарушения за минуту.<br class="hide-mobile"/>Или соберём новое из учебного плана с учётом всех норм.';
      if (navBuyBtn)  navBuyBtn.style.display = hasPaidAccess(u) ? 'none' : '';

      renderPlanBadge(u);
      decorateBuildCardLock(u);
    });
  }
  // Expose to the top-level profile-save handler in initProfileUI()
  __refreshHeader = refreshHeader;
  refreshHeader();


  /* ═══ Logout ═══ */
  var profileLogout = document.getElementById('profileLogout');
  if (profileLogout) {
    profileLogout.addEventListener('click', function () {
      if (typeof cooldown === 'function' && !cooldown('logout')) return;
      spLogout().then(function () {
        window.location.href = '/';
      });
    });
  }

  /* ═══ File upload / drag-and-drop ═══ */
  var dropzone  = document.getElementById('accDropzone');
  var fileInput = document.getElementById('accFileInput');
  var errEl     = document.getElementById('accError');
  var accStart  = document.getElementById('accStart');
  var accUpload = document.getElementById('accUpload');
  var accIntro  = document.getElementById('accIntro');
  var accBuilder = document.getElementById('accBuilder');

  var selectedMode = '';
  var modeCards = document.querySelectorAll('.acc-start-card');
  var modeContinue = document.getElementById('accModeContinue');

  function setMode(mode) {
    selectedMode = mode;
    modeCards.forEach(function (card) {
      card.classList.toggle('acc-start-card--active', card.dataset.mode === mode);
    });
    if (modeContinue) modeContinue.disabled = !selectedMode;
  }

  modeCards.forEach(function (card) {
    card.addEventListener('click', function () {
      setMode(card.dataset.mode || '');
    });
  });
  // Fallback delegation: keeps selector working even if cards are re-rendered.
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.acc-start-card');
    if (!card) return;
    setMode(card.dataset.mode || '');
  });

  if (modeContinue) {
    modeContinue.addEventListener('click', function () {
      if (!selectedMode) return;

      // T-3.2: gate schedule builder for non-paid users. Audit stays free.
      if (selectedMode === 'build' && !hasPaidAccess(window.currentUser)) {
        if (typeof window.openPaywall === 'function') {
          window.openPaywall({
            reason: 'Составление расписания доступно на тарифе «Школа». Оформите подписку, чтобы продолжить.'
          });
        }
        return;
      }

      if (accStart) accStart.style.display = 'none';
      if (selectedMode === 'audit') {
        if (accUpload) accUpload.style.display = '';
        if (accBuilder) accBuilder.style.display = 'none';
        if (accIntro) accIntro.style.display = '';
        if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        if (accBuilder) accBuilder.style.display = '';
        if (accUpload) accUpload.style.display = 'none';
        if (accIntro) accIntro.style.display = 'none';
        initBuilderFlow();
        if (accBuilder) accBuilder.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ═══ Builder flow on account page ═══ */
  var builderStep = 1;
  var builderBackBtn = document.getElementById('builderBackBtn');
  var builderNextBtn = document.getElementById('builderNextBtn');
  var builderGenerateBtn = document.getElementById('builderGenerateBtn');
  var builderErr = document.getElementById('builderError');

  function showBuilderError(msg) {
    if (!builderErr) return;
    builderErr.textContent = msg || '';
    builderErr.style.display = msg ? 'block' : 'none';
  }

  function updateBuilderStep() {
    document.querySelectorAll('.acc-builder-panel').forEach(function (panel) {
      panel.style.display = Number(panel.getAttribute('data-step')) === builderStep ? '' : 'none';
    });
    document.querySelectorAll('.acc-builder-step').forEach(function (stepEl) {
      stepEl.classList.toggle('acc-builder-step--active', Number(stepEl.getAttribute('data-step-dot')) === builderStep);
    });
    if (builderBackBtn) builderBackBtn.style.display = builderStep > 1 ? '' : 'none';
    if (builderNextBtn) builderNextBtn.style.display = builderStep < 3 ? '' : 'none';
    if (builderGenerateBtn) builderGenerateBtn.style.display = builderStep === 3 ? '' : 'none';
  }

  function initBuilderFlow() {
    builderStep = 1;
    showBuilderError('');
    updateBuilderStep();
  }

  if (builderBackBtn) {
    builderBackBtn.addEventListener('click', function () {
      if (builderStep > 1) {
        builderStep -= 1;
        updateBuilderStep();
      }
    });
  }
  if (builderNextBtn) {
    builderNextBtn.addEventListener('click', function () {
      if (builderStep < 3) {
        builderStep += 1;
        updateBuilderStep();
      }
    });
  }

  function parseClasses(raw) {
    return String(raw || '')
      .split(/[,\n;]+/)
      .map(function (item) { return item.trim(); })
      .filter(function (item) { return /^\d{1,2}\s*[А-ЯA-Zа-яa-z]{1,2}$/.test(item); })
      .map(function (item) { return item.replace(/\s+/g, ''); });
  }

  function parseTeachers(raw) {
    return String(raw || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var parts = line.split('|').map(function (p) { return p.trim(); });
        return {
          name: parts[0] || '',
          subject: parts[1] || '',
          hours: Number(parts[2] || 0),
          classes: parseClasses(parts[3] || '')
        };
      })
      .filter(function (row) {
        return row.subject && row.hours > 0 && row.classes.length > 0;
      });
  }

  function buildScheduleFromBuilder() {
    var classes = parseClasses((document.getElementById('builderClasses') || {}).value);
    var maxLessons = Number((document.getElementById('builderMaxLessons') || {}).value) || 7;
    var teachers = parseTeachers((document.getElementById('builderTeachers') || {}).value);

    if (!classes.length) throw new Error('Добавьте хотя бы один класс в шаге 2');
    if (!teachers.length) throw new Error('Добавьте корректные строки учителей в шаге 3');

    var cg = {};
    classes.forEach(function (cls) {
      var grade = Number((cls.match(/^(\d{1,2})/) || [])[1] || 7);
      cg[cls] = grade;
    });

    var lessonsPerClass = {};
    classes.forEach(function (cls) { lessonsPerClass[cls] = []; });
    teachers.forEach(function (teacher) {
      var code = normSubj(teacher.subject);
      teacher.classes.forEach(function (cls) {
        if (!lessonsPerClass[cls]) return;
        for (var i = 0; i < teacher.hours; i += 1) lessonsPerClass[cls].push(code);
      });
    });

    var sch = {};
    classes.forEach(function (cls) {
      var dayBuckets = [[], [], [], [], []];
      var lessons = lessonsPerClass[cls].slice();
      lessons.sort(function () { return Math.random() - 0.5; });
      lessons.forEach(function (subject) {
        var bestDay = 0;
        for (var d = 1; d < 5; d += 1) {
          if (dayBuckets[d].length < dayBuckets[bestDay].length) bestDay = d;
        }
        if (dayBuckets[bestDay].length < maxLessons) dayBuckets[bestDay].push(subject);
      });
      sch[cls] = dayBuckets;
    });

    return { sch: sch, cg: cg };
  }

  if (builderGenerateBtn) {
    builderGenerateBtn.addEventListener('click', function () {
      // T-3.2: block generator execution for non-paid users even if they
      // bypassed the start-screen gate (e.g. cached open builder).
      if (!hasPaidAccess(window.currentUser)) {
        if (typeof window.openPaywall === 'function') {
          window.openPaywall({
            reason: 'Генерация расписания доступна на тарифе «Школа». Оформите подписку, чтобы продолжить.'
          });
        }
        return;
      }
      if (typeof cooldown === 'function' && !cooldown('generate')) return;
      showBuilderError('');

      var classes, teachers, days;
      try {
        classes  = parseClasses((document.getElementById('builderClasses')  || {}).value);
        teachers = parseTeachers((document.getElementById('builderTeachers') || {}).value);
        days     = Number((document.getElementById('builderDays') || {}).value) || 5;
        if (!classes.length)  throw new Error('Добавьте хотя бы один класс в шаге 2');
        if (!teachers.length) throw new Error('Добавьте корректные строки учителей в шаге 3');
      } catch (err) { showBuilderError(err.message); return; }

      var curriculum = [];
      teachers.forEach(function (t, idx) {
        var teacherId = 'T' + (idx + 1);
        t.classes.forEach(function (cls) {
          if (classes.indexOf(cls) === -1) return;
          curriculum.push({
            classId: cls, subject: t.subject, weeklyHours: t.hours,
            teacherId: teacherId, roomId: 'к.1',
          });
        });
      });

      var origLabel = builderGenerateBtn.textContent;
      builderGenerateBtn.disabled = true;
      builderGenerateBtn.textContent = 'Генерируется…';

      fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: classes, curriculum: curriculum, weekDays: days === 6 ? 6 : 5 }),
      })
        .then(function (r) { return r.json(); })
        .then(function (resp) {
          if (!resp || !resp.ok) {
            var msg = (resp && resp.error && resp.error.message) || 'Не удалось сгенерировать расписание';
            throw new Error(msg);
          }
          var sch = {};
          Object.keys(resp.schedule).forEach(function (cls) {
            sch[cls] = resp.schedule[cls].map(function (day) {
              return day.map(function (subj) { return normSubj(subj) || subj; });
            });
          });
          var cg = {};
          classes.forEach(function (cls) {
            var m = cls.match(/^(\d+)/);
            cg[cls] = m ? parseInt(m[1], 10) : 7;
          });
          showResults(sch, cg);
          switchTab('optimized');
        })
        .catch(function (err) {
          showBuilderError(err.message || 'Ошибка генерации расписания');
        })
        .then(function () {
          builderGenerateBtn.disabled = false;
          builderGenerateBtn.textContent = origLabel;
        });
    });
  }

  /* ═══ Быстрый старт через Excel-шаблон ═══ */
  var builderXlsxBtn   = document.getElementById('builderXlsxBtn');
  var builderXlsxInput = document.getElementById('builderXlsxInput');

  if (builderXlsxBtn && builderXlsxInput) {
    builderXlsxBtn.addEventListener('click', function () { builderXlsxInput.click(); });

    builderXlsxInput.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (typeof cooldown === 'function' && !cooldown('generateXlsx')) return;

      showBuilderError('');
      var origXlsxLabel = builderXlsxBtn.textContent;
      builderXlsxBtn.disabled = true;
      builderXlsxBtn.textContent = 'Обрабатывается…';

      var fd = new FormData();
      fd.append('file', file);
      var daysEl = document.getElementById('builderDays');
      var days   = daysEl ? Number(daysEl.value) : 5;
      fd.append('weekDays', days === 6 ? '6' : '5');

      fetch('/api/generate/from-xlsx', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (resp) {
          if (!resp || !resp.ok) {
            var err = resp && resp.error;
            if (err && Array.isArray(err.details)) {
              var msgs = err.details.slice(0, 5).map(function (d) {
                return (d.sheet ? 'Лист «' + d.sheet + '»' + (d.row ? ', стр. ' + d.row : '') + ': ' : '') + d.message;
              });
              throw new Error(msgs.join(' | '));
            }
            throw new Error((err && err.message) || 'Не удалось обработать шаблон');
          }
          var sch = {};
          Object.keys(resp.schedule).forEach(function (cls) {
            sch[cls] = resp.schedule[cls].map(function (day) {
              return day.map(function (subj) { return normSubj(subj) || subj; });
            });
          });
          var cg = {};
          Object.keys(sch).forEach(function (cls) {
            var m = cls.match(/^(\d+)/);
            cg[cls] = m ? parseInt(m[1], 10) : 7;
          });
          showResults(sch, cg);
          switchTab('optimized');
          if (resp.warnings && resp.warnings.length) {
            console.info('[xlsx warnings]', resp.warnings);
          }
        })
        .catch(function (e) {
          showBuilderError(e.message || 'Ошибка загрузки шаблона');
        })
        .then(function () {
          builderXlsxBtn.disabled = false;
          builderXlsxBtn.textContent = origXlsxLabel;
          builderXlsxInput.value = '';
        });
    });
  }

  function showError(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = msg ? 'block' : 'none'; }
  }

  if (dropzone) {
    dropzone.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('acc-dropzone--over'); });
    dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('acc-dropzone--over'); });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('acc-dropzone--over');
      var file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });
  }

  function handleFile(file) {
    if (typeof cooldown === 'function' && !cooldown('accUpload')) return;
    if (typeof requireHuman === 'function') {
      requireHuman(function() { _doHandleFile(file); });
    } else { _doHandleFile(file); }
  }
  function _doHandleFile(file) {
    showError('');
    if (!file.name.match(/\.(xlsx|xls)$/i)) { showError('Поддерживаются файлы .xlsx и .xls'); return; }
    if (file.size > 5 * 1024 * 1024) { showError('Файл слишком большой (максимум 5 МБ)'); return; }
    parseXls(file).then(function (result) {
      showResults(result.sch, result.cg);
    }).catch(function (err) {
      showError(typeof err === 'string' ? err : 'Ошибка обработки файла. Попробуйте шаблон.');
    });
  }

  /* ═══ Demo button ═══ */
  var demoBtn = document.getElementById('accDemoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', function () { 
      // Load demo file and show results in main account section
      showResults(DEM, DCG);
    });
  }

  /* ═══ Inline Demo Panel Functions (like on main page) */
  var _inlineDemoReady = false;
  function _initInlineDemo() {
    if (_inlineDemoReady) return;
    _inlineDemoReady = true;
    try {
      var audit = doAudit(DEM, DCG);
      var gridEl = document.getElementById('inlineDemoTabGrid');
      var tbl = document.createElement('table');
      tbl.className = 'acc-grid-tbl';
      gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
      gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
      renderGrid(DEM, DCG, audit, tbl);
      var recsEl = document.getElementById('inlineDemoTabRecs');
      renderRecs(audit.top, recsEl);
      _renderOptimizedTab(DEM, DCG, audit);
    } catch(e) { console.warn('Demo init error:', e); }
  }

  function toggleInlineDemo() {
    var panel = document.getElementById('inlineDemo');
    var visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';
    if (!visible) { 
      _initInlineDemo(); 
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }
  }

  function showInlineDemo() {
    var panel = document.getElementById('inlineDemo');
    panel.style.display = 'block';
    _initInlineDemo();
    document.getElementById('accResults').scrollIntoView({ behavior: 'smooth' });
  }

  function _renderOptimizedTab(sch, cg, origAudit) {
    var el = document.getElementById('inlineDemoTabOptimized');
    if (!el) return;
    try {
      var opt = optSchedule(sch, cg, 'bell');
      var audit = doAudit(opt, cg);
      var h = '<div class="demo-optimized-summary">';
      h += '<h3>Improved Schedule</h3>';
      h += '<div class="demo-score-comparison">';
      h += '<div class="demo-score-item"><span class="demo-score-label">Original:</span><span class="demo-score-value" style="color:' + (origAudit.score >= 90 ? '#30d158' : origAudit.score >= 70 ? '#ff9f0a' : '#ff453a') + '">' + origAudit.score + '/100</span></div>';
      h += '<div class="demo-score-item"><span class="demo-score-label">Improved:</span><span class="demo-score-value" style="color:' + (audit.score >= 90 ? '#30d158' : audit.score >= 70 ? '#ff9f0a' : '#ff453a') + '">' + audit.score + '/100</span></div>';
      h += '</div></div><div class="acc-tbl-wrap"></div>';
      el.innerHTML = h;
      var tbl = document.createElement('table');
      tbl.className = 'acc-grid-tbl';
      el.querySelector('.acc-tbl-wrap').appendChild(tbl);
      renderGrid(opt, cg, audit, tbl);
    } catch(e) { console.warn('Optimized tab error:', e); }
  }

  // Tab switching for inline demo
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.demo-tab'); 
    if (!tab) return;
    var panel = tab.closest('#inlineDemo'); 
    if (!panel) return;
    panel.querySelectorAll('.demo-tab').forEach(function (t) { t.classList.remove('demo-tab--active'); });
    tab.classList.add('demo-tab--active');
    var map = { grid: 'inlineDemoTabGrid', recs: 'inlineDemoTabRecs', optimized: 'inlineDemoTabOptimized', rules: 'inlineDemoTabRules' };
    panel.querySelectorAll('.demo-tab-panel').forEach(function (p) { p.style.display = 'none'; });
    var target = map[tab.getAttribute('data-tab')];
    if (target) { 
      var paneEl = document.getElementById(target); 
      if (paneEl) paneEl.style.display = 'block'; 
    }
  });

  /* ═══ Reset ═══ */
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var results = document.getElementById('accResults');
      var actions = document.getElementById('accActions');
      var introEl2 = document.getElementById('accIntro');
      if (results)  results.style.display  = 'none';
      if (actions)  actions.style.display  = 'none';
      if (accStart) accStart.style.display = '';
      if (accBuilder) accBuilder.style.display = 'none';
      if (accUpload) accUpload.style.display = 'none';
      if (introEl2) introEl2.style.display = 'none';
      showError('');
      if (fileInput) fileInput.value = '';
      setMode('');
    });
  }

  /* ═══ Show results ═══ */
  function showResults(sch, cg) {
    var audit   = doAudit(sch, cg);
    var results = document.getElementById('accResults');
    var actions = document.getElementById('accActions');
    var introEl = document.getElementById('accIntro');

    // Сохраняем данные аудита для возможности сохранения
    currentAuditData = audit;

    if (accUpload) accUpload.style.display = 'none';
    if (accStart) accStart.style.display = 'none';
    if (results) results.style.display = '';
    if (actions) actions.style.display = '';
    if (introEl) introEl.style.display = 'none';


    /* --- Grid tab --- */
    var gridEl = document.getElementById('tabGrid');
    if (gridEl) {
      var tbl = document.createElement('table');
      tbl.className = 'acc-grid-tbl';
      gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
      gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
      renderGrid(sch, cg, audit, tbl);
    }

    /* --- Recs tab --- */
    var recsEl = document.getElementById('tabRecs');
    if (recsEl) { renderRecs(audit.top, recsEl); }

    /* --- Optimized tab --- */
    var optimizedEl = document.getElementById('tabOptimized');
    if (optimizedEl) { renderOptimized(sch, cg, audit, optimizedEl); }

    /* --- Rules tab --- */
    var rulesEl = document.getElementById('tabRules');
    if (rulesEl) { renderRules(rulesEl); }

    /* --- Switch to grid tab --- */
    switchTab('grid');
  }

  /* ═══ Tab switching ═══ */
  function switchTab(name) {
    var panels = { grid: 'tabGrid', recs: 'tabRecs', optimized: 'tabOptimized', rules: 'tabRules' };
    for (var key in panels) {
      var el = document.getElementById(panels[key]);
      if (el) el.style.display = key === name ? '' : 'none';
    }
    document.querySelectorAll('.acc-tab').forEach(function (btn) {
      btn.classList.toggle('acc-tab--active', btn.dataset.tab === name);
    });
  }

  document.querySelectorAll('.acc-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  /* ═══ Save Audit Functionality ═══ */
  var saveAuditBtn = document.getElementById('saveAuditBtn');
  var currentAuditData = null;

  if (saveAuditBtn) {
    saveAuditBtn.addEventListener('click', function () {
      if (!currentAuditData) {
        alert('Нет данных аудита для сохранения');
        return;
      }
      saveAuditToSupabase(currentAuditData);
    });
  }

  function saveAuditToSupabase(auditData) {
    spGetCurrentUser().then(function (user) {
      if (!user) {
        alert('Пользователь не авторизован');
        return;
      }

      var auditRecord = {
        user_id: user.id,
        school_name: user.school || '',
        audit_data: JSON.stringify(auditData),
        violations_count: auditData.vi ? auditData.vi.length : 0,
        recommendations_count: auditData.wa ? auditData.wa.length : 0,
        score: auditData.score || 0,
        created_at: new Date().toISOString()
      };

      // Сохранение в Supabase
      supabase
        .from('saved_audits')
        .insert([auditRecord])
        .then(function (response) {
          if (response.error) {
            console.error('Ошибка сохранения аудита:', response.error);
            alert('Ошибка при сохранении аудита: ' + response.error.message);
          } else {
            alert('Аудит успешно сохранен!');
            console.log('Аудит сохранен:', response.data);
          }
        })
        .catch(function (error) {
          console.error('Ошибка запроса:', error);
          alert('Произошла ошибка при сохранении аудита');
        });
    });
  }

  // Обновляем функцию renderResults для сохранения текущих данных
  var originalRenderResults = window.renderResults;
  if (originalRenderResults) {
    window.renderResults = function(sch, cg, audit) {
      currentAuditData = audit;
      return originalRenderResults(sch, cg, audit);
    };
  } else {
    // Если функции нет, создаем свою
    window.renderResults = function(sch, cg, audit) {
      currentAuditData = audit;
      // Здесь можно добавить логику отображения результатов
    };
  }

  /* ─── Render Optimized Schedule ─── */
  function renderOptimized(sch, cg, audit, container) {
    var optimized = optSchedule(sch, cg, 'bell');
    var optimizedAudit = doAudit(optimized, cg);
    var scoreDiff = optimizedAudit.score - audit.score;

    container.innerHTML = '<div class="acc-optimized-note">'
      + '<strong>Улучшенная сетка уроков</strong> — сформирована алгоритмом оптимизации с повторной проверкой по тем же правилам.'
      + '<div class="acc-optimized-kpi">Было: ' + audit.score + '/100 · Стало: '
      + optimizedAudit.score + '/100'
      + (scoreDiff > 0 ? ' <span class="acc-optimized-kpi__up">(+'
      + scoreDiff + ')</span>' : '')
      + '</div>'
      + '</div><div class="acc-tbl-wrap"></div>';

    var tbl = document.createElement('table');
    tbl.className = 'acc-grid-tbl';
    container.querySelector('.acc-tbl-wrap').appendChild(tbl);
    renderGrid(optimized, cg, optimizedAudit, tbl);
  }

  /* ─── Render Rules ─── */
  function renderRules(container) {
    container.innerHTML = `
      <div class="rules-hero">
        <div class="rules-hero__badge">Нормативная база</div>
      </div>

      <div class="rules-score-box">
        <div class="rules-score-box__formula">Score = (7 × number of classes - violations - recommendations) ÷ (7 × number of classes) × 100</div>
        <div class="rules-score-box__scale">
          <span class="rules-scale rules-scale--green">90-100 compliant</span>
          <span class="rules-scale rules-scale--yellow">70-89 recommendations</span>
          <span class="rules-scale rules-scale--red">0-69 violations</span>
        </div>
      </div>

      <div class="rules-columns">
        <div class="rules-col">
          <div class="rules-col__track">
            <div class="rules-card rules-card--hard">
              <div class="rules-card__badge rules-card__badge--hard">C-01</div>
              <div class="rules-card__title">Maximum lessons per day</div>
              <div class="rules-card__text">1st grade: 4 lessons (once 5 for PE). 2-4 grades: 5 (once 6 with PE). 5-6 grades: 6. 7-11 grades: 7.</div>
              <div class="rules-card__src">SP 2.4.3648-20, p. 3.4.16</div>
            </div>
            <div class="rules-card rules-card--hard">
              <div class="rules-card__badge rules-card__badge--hard">C-02</div>
              <div class="rules-card__title">Weekly workload</div>
              <div class="rules-card__text">5-day week: 1st grade - 21 h, 2-4 - 23, 5 - 29, 6 - 30, 7 - 32, 8-9 - 33, 10-11 - 34 h. Exceeding = violation.</div>
              <div class="rules-card__src">SanPiN 1.2.3685-21, table 6.6</div>
            </div>
            <div class="rules-card rules-card--hard">
              <div class="rules-card__badge rules-card__badge--hard">C-03</div>
              <div class="rules-card__title">Workload uniformity</div>
              <div class="rules-card__text">Difference between max and min lessons per day <= 1. Acceptable: 6-6-6-6-5. Violation: 4-7-6-7-7.</div>
              <div class="rules-card__src">SP 2.4.3648-20, p. 3.4.16</div>
            </div>
            <div class="rules-card rules-card--info">
              <div class="rules-card__badge rules-card__badge--info">?</div>
              <div class="rules-card__title">Difficulty scale</div>
              <div class="rules-card__text">Each subject has a difficulty score from 1 to 13. PE = 1, Math = 8-10, Physics = 8-13. Scores depend on grade.</div>
              <div class="rules-card__src">SanPiN table 6.9-6.11</div>
            </div>
          </div>
        </div>
        <div class="rules-col rules-col--md">
          <div class="rules-col__track rules-col__track--slow">
            <div class="rules-card rules-card--hard">
              <div class="rules-card__badge rules-card__badge--hard">E-02</div>
              <div class="rules-card__title">Light day</div>
              <div class="rules-card__text">Wednesday or Thursday - the lightest day by difficulty score sum. If minimum on Mon or Fri - violation.</div>
              <div class="rules-card__src">SanPiN p. 189; MR p. 3.3</div>
            </div>
            <div class="rules-card rules-card--hard">
              <div class="rules-card__badge rules-card__badge--hard">X-01</div>
              <div class="rules-card__title">Windows in schedule</div>
              <div class="rules-card__text">Empty lessons between first and last - forbidden. 6 lessons = consecutively, without gaps. Windows for students are unacceptable.</div>
              <div class="rules-card__src">Common practice</div>
            </div>
            <div class="rules-card rules-card--info">
              <div class="rules-card__badge rules-card__badge--info">?</div>
              <div class="rules-card__title">How Score is calculated</div>
              <div class="rules-card__text">Each class is checked by 7 rules. Total checks = 7 × number of classes. Each violation or recommendation reduces Score. 100 = no problems.</div>
              <div class="rules-card__src">ShkolaPlan Formula</div>
            </div>
            <div class="rules-card rules-card--info">
              <div class="rules-card__badge rules-card__badge--info">?</div>
              <div class="rules-card__title">Hard vs Soft</div>
              <div class="rules-card__text">5 hard (C-01, C-02, C-03, E-02, X-01) - red, SanPiN violations. 2 soft (E-01, E-03) - orange, MR recommendations.</div>
              <div class="rules-card__src">ShkolaPlan Classification</div>
            </div>
          </div>
        </div>
        <div class="rules-col rules-col--lg">
          <div class="rules-col__track rules-col__track--fast">
            <div class="rules-card rules-card--soft">
              <div class="rules-card__badge rules-card__badge--soft">E-01</div>
              <div class="rules-card__title">Difficult subjects in 2-4 lessons</div>
              <div class="rules-card__text">Subjects >= 8 points - in 2-4 lessons (peak performance 10:00-12:00). In 1st and 5+ - undesirable but acceptable.</div>
              <div class="rules-card__src">MR 2.4.0331-23, p. 3.2</div>
            </div>
            <div class="rules-card rules-card--soft">
              <div class="rules-card__badge rules-card__badge--soft">E-03</div>
              <div class="rules-card__title">Alternating subjects</div>
              <div class="rules-card__text">2 difficult in a row (>= 8 b.) - warning. 3+ in a row - strong warning. This is a recommendation, not a prohibition.</div>
              <div class="rules-card__src">MR p. 3.2; SP p. 3.4.16</div>
            </div>
            <div class="rules-card rules-card--info">
              <div class="rules-card__badge rules-card__badge--info">?</div>
              <div class="rules-card__title">Regulatory documents</div>
              <div class="rules-card__text">SanPiN 1.2.3685-21 (ed. 24.12.2025) - valid until 01.03.2027. SP 2.4.3648-20 - until 01.01.2027. MR 2.4.0331-23 - indefinitely.</div>
              <div class="rules-card__src">Rospotrebnadzor</div>
            </div>
            <div class="rules-card rules-card--info">
              <div class="rules-card__badge rules-card__badge--info">?</div>
              <div class="rules-card__title">Why E-03 is not a prohibition</div>
              <div class="rules-card__text">In a real school with limited number of teachers and classrooms, separating all difficult subjects with easy ones is often physically impossible.</div>
              <div class="rules-card__src">Practical experience</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
})});
