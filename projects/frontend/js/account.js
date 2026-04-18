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

spRequireAuth(function () {
  var user = null;

  /* ═══ Fill nav header ═══ */
  function refreshHeader() {
    spGetCurrentUser().then(function (u) {
      if (!u) return;
      user = u;
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
      if (dashTitle)  dashTitle.textContent  = u.school || 'Личный кабинет';
      if (accWelcome) accWelcome.textContent = 'Добро пожаловать, ' + firstName + '. Загрузите файл расписания — аудит займёт секунды.';
      if (navBuyBtn)  navBuyBtn.style.display = u.plan === 'paid' ? 'none' : '';
    });
  }
  refreshHeader();

  /* ═══ Profile modal ═══ */
  var profileModal   = document.getElementById('profileModal');
  var profileOverlay = document.getElementById('profileOverlay');
  var profileClose   = document.getElementById('profileClose');
  var profileForm    = document.getElementById('profileForm');
  var navProfileBtn  = document.getElementById('navProfileBtn');

  function openProfile() {
    if (!profileModal) return;
    spGetCurrentUser().then(function (u) {
      if (!u) return;
      var nameEl    = document.getElementById('profileName');
      var schoolEl  = document.getElementById('profileSchool');
      var emailEl   = document.getElementById('profileEmail');
      var passEl    = document.getElementById('profilePassword');
      var successEl = document.getElementById('profileSuccess');
      var globalErr = document.getElementById('profileGlobalErr');
      if (nameEl)    nameEl.value   = u.name;
      if (schoolEl)  schoolEl.value = u.school;
      if (emailEl)   emailEl.value  = u.email;
      if (passEl)    passEl.value   = '';
      if (successEl) successEl.style.display = 'none';
      if (globalErr) globalErr.textContent   = '';
      clearProfileErrors();
      profileModal.classList.add('profile-modal--open');
      profileOverlay.classList.add('profile-overlay--open');
      if (nameEl) nameEl.focus();
    });
  }

  function closeProfile() {
    if (profileModal)   profileModal.classList.remove('profile-modal--open');
    if (profileOverlay) profileOverlay.classList.remove('profile-overlay--open');
  }

  if (navProfileBtn)  navProfileBtn.addEventListener('click', openProfile);
  if (profileOverlay) profileOverlay.addEventListener('click', closeProfile);
  if (profileClose)   profileClose.addEventListener('click', closeProfile);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeProfile(); });

  function clearProfileErrors() {
    ['profileNameErr','profileSchoolErr','profileEmailErr','profilePasswordErr'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = '';
    });
  }

  function profileErr(id, msg) {
    var el = document.getElementById(id); if (el) el.textContent = msg;
  }

  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearProfileErrors();
      var globalErr = document.getElementById('profileGlobalErr');
      if (globalErr) globalErr.textContent = '';

      var nameVal   = (document.getElementById('profileName')     || {}).value.trim();
      var schoolVal = (document.getElementById('profileSchool')   || {}).value.trim();
      var emailVal  = (document.getElementById('profileEmail')    || {}).value.trim().toLowerCase();
      var passVal   = (document.getElementById('profilePassword') || {}).value;

      var valid = true;
      if (!nameVal)   { profileErr('profileNameErr', 'Введите имя'); valid = false; }
      if (!schoolVal) { profileErr('profileSchoolErr', 'Введите название школы'); valid = false; }
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        profileErr('profileEmailErr', 'Введите корректный email'); valid = false;
      }
      if (passVal && passVal.length < 6) {
        profileErr('profilePasswordErr', 'Пароль должен содержать не менее 6 символов'); valid = false;
      }
      if (!valid) return;

      spUpdateProfile(nameVal, schoolVal, emailVal, passVal || null).then(function (res) {
        if (!res.ok) {
          if (globalErr) globalErr.textContent = res.error || 'Ошибка сохранения';
          return;
        }
        var successEl = document.getElementById('profileSuccess');
        if (successEl) successEl.style.display = 'block';
        refreshHeader();
        setTimeout(closeProfile, 1400);
      });
    });
  }

  /* ═══ Logout ═══ */
  var profileLogout = document.getElementById('profileLogout');
  if (profileLogout) {
    profileLogout.addEventListener('click', function () {
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
      try {
        showBuilderError('');
        var built = buildScheduleFromBuilder();
        showResults(built.sch, built.cg);
        switchTab('optimized');
      } catch (err) {
        showBuilderError(err.message || 'Ошибка генерации расписания');
      }
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
