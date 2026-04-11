document.addEventListener('DOMContentLoaded', function () {
'use strict';

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
    demoBtn.addEventListener('click', function () { showResults(DEM, DCG); });
  }

  /* ═══ Reset ═══ */
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var results = document.getElementById('accResults');
      var actions = document.getElementById('accActions');
      var introEl2 = document.getElementById('accIntro');
      if (results)  results.style.display  = 'none';
      if (actions)  actions.style.display  = 'none';
      if (dropzone) dropzone.style.display = '';
      if (introEl2) introEl2.style.display = '';
      showError('');
      if (fileInput) fileInput.value = '';
    });
  }

  /* ═══ Show results ═══ */
  function showResults(sch, cg) {
    var audit   = doAudit(sch, cg);
    var results = document.getElementById('accResults');
    var actions = document.getElementById('accActions');
    var introEl = document.getElementById('accIntro');
    if (dropzone) dropzone.style.display = 'none';
    if (introEl)  introEl.style.display  = 'none';
    if (results) results.style.display = '';
    if (actions) actions.style.display = '';

    /* --- Audit tab --- */
    var auditEl = document.getElementById('tabAudit');
    if (auditEl) {
      var classes = Object.keys(sch);
      var h = '<div class="acc-audit-scores">';
      classes.forEach(function (cl) {
        var r = audit.cr[cl]; if (!r) return;
        var hv = r.ch.some(function (c) { return c.st === 'v'; });
        var hw = r.ch.some(function (c) { return c.st === 'w'; });
        var col = hv ? '#ff453a' : hw ? '#ff9f0a' : '#30d158';
        var issues = r.ch.map(function (c) {
          return '<div class="acc-issue acc-issue--' + c.st + '"><span class="acc-issue__id">' + c.id + '</span> ' + c.nm + '</div>';
        }).join('');
        h += '<div class="acc-score-card"><div class="acc-score-card__name" style="color:' + col + '">' + cl + '</div>' + issues + '</div>';
      });
      h += '</div>';
      if (audit.vi.length || audit.wa.length) {
        h += '<div class="acc-audit-summary"><span class="acc-audit-stat acc-audit-stat--v">❌ ' + audit.vi.length + ' нарушений</span> <span class="acc-audit-stat acc-audit-stat--w">⚠️ ' + audit.wa.length + ' рекомендаций</span> <span class="acc-audit-stat">Балл: ' + audit.score + '/100</span></div>';
      } else {
        h += '<div class="acc-audit-summary acc-audit-summary--ok">✅ Нарушений не обнаружено. Балл: ' + audit.score + '/100</div>';
      }
      auditEl.innerHTML = h;
    }

    /* --- Grid tab --- */
    var gridEl = document.getElementById('tabGrid');
    if (gridEl) {
      var tbl = document.createElement('table');
      tbl.className = 'acc-grid-tbl';
      gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
      gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
      renderGrid(sch, cg, audit, tbl);
    }

    /* --- Heat tab --- */
    var heatEl = document.getElementById('tabHeat');
    if (heatEl) {
      var htbl = document.createElement('table');
      htbl.className = 'acc-heat-tbl';
      heatEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
      heatEl.querySelector('.acc-tbl-wrap').appendChild(htbl);
      renderHeat(sch, cg, audit, htbl);
    }

    /* --- Recs tab --- */
    var recsEl = document.getElementById('tabRecs');
    if (recsEl) { renderRecs(audit.top, recsEl); }

    /* --- Switch to audit tab --- */
    switchTab('audit');
  }

  /* ═══ Tab switching ═══ */
  function switchTab(name) {
    var panels = { audit: 'tabAudit', grid: 'tabGrid', heat: 'tabHeat', recs: 'tabRecs' };
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

}); // end spRequireAuth

});
