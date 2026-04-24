document.addEventListener('DOMContentLoaded', function () {
'use strict';

loadWizardComponent();

/* ═══ Scroll reveal ═══ */
var sio = new IntersectionObserver(function (en) {
  en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); sio.unobserve(e.target); } });
}, { threshold: .15 });
document.querySelectorAll('.fade-in').forEach(function (el) { sio.observe(el); });

/* ═══ Nav theme ═══ */
var nav = document.getElementById('nav');
var darkSections = document.querySelectorAll('.hero,.pg,.showcase--dark,.ribbon,.demo,.cta-register,.demo-hero,.demo-main,.sub-hero,.sub-main');
function navTheme() {
  if (!nav) return;
  var nb = nav.getBoundingClientRect().bottom;
  var dark = false;
  darkSections.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top < nb && r.bottom > nb) dark = true; });
  nav.classList.toggle('nav--dark', dark);
}
if (nav) { window.addEventListener('scroll', navTheme, { passive: true }); navTheme(); }

/* ═══ Counter animation ═══ */
var cf = false;
var cio = new IntersectionObserver(function (en) {
  if (en[0].isIntersecting && !cf) {
    cf = true;
    document.querySelectorAll('.ribbon__number[data-target]').forEach(function (el) {
      var t = +el.dataset.target, dur = 1800, st = performance.now();
      (function tk(now) { var p = Math.min((now - st) / dur, 1); el.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tk); })(st);
    });
  }
}, { threshold: .3 });
var rib = document.querySelector('.ribbon'); if (rib) cio.observe(rib);


/* ═══ Demo section ═══ */
var loadDemoBtn = document.getElementById('loadDemoBtn');
if (loadDemoBtn) {
  loadDemoBtn.addEventListener('click', function () { showDash(DEM, DCG); });
}

/* ═══ Reset to upload view ═══ */
var resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', function () {
    var dash = document.getElementById('demoDash');
    var upload = document.getElementById('demoUpload');
    if (dash) dash.style.display = 'none';
    if (upload) upload.style.display = 'block';
  });
}

/* ═══ Tab switching ═══ */
document.addEventListener('click', function (e) {
  var tab = e.target.closest('.demo__tab'); if (!tab) return;
  var dash = tab.closest('#demoDash'); if (!dash) return;
  dash.querySelectorAll('.demo__tab').forEach(function (t) { t.classList.remove('demo__tab--on'); });
  tab.classList.add('demo__tab--on');
  var map = { grid: 'pGrid', heat: 'pHeat', recs: 'pRecs', vars: 'pVars' };
  dash.querySelectorAll('.demo__pane').forEach(function (p) { p.style.display = 'none'; });
  var target = map[tab.getAttribute('data-t')];
  if (target) { var paneEl = document.getElementById(target); if (paneEl) paneEl.style.display = 'block'; }
});

/* ═══ Tooltip on hover over schedule cells ═══ */
var ttip = document.getElementById('ttip');
if (ttip) {
  document.addEventListener('mouseover', function (e) {
    var cell = e.target.closest('.demo__cell');
    if (!cell) { ttip.style.display = 'none'; return; }
    var s = cell.getAttribute('data-s'), g = +cell.getAttribute('data-g'), df = +cell.getAttribute('data-d'), li = +cell.getAttribute('data-l');
    var bad = cell.getAttribute('data-b') === '1', pair = cell.getAttribute('data-p') === '1';
    var ps = cell.getAttribute('data-ps'), pv = +cell.getAttribute('data-pv');
    var th3 = g <= 4 ? 7 : 8, tbl = g <= 4 ? '6.9' : g <= 9 ? '6.10' : '6.11';
    var lv = df >= 10 ? 'Очень сложный' : df >= th3 ? 'Сложный' : df >= 5 ? 'Средний' : 'Лёгкий';
    var vc = df >= th3 ? '#ff453a' : df >= 5 ? '#ffd60a' : '#30d158';
    var al = '';
    if (bad)  al += '<div style="background:rgba(255,159,10,.12);border:1px solid rgba(255,159,10,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#ffd6a5">⚠ <b>E-01:</b> предмет на ' + (li + 1) + '-м уроке — рекомендуется 2–4.</div>';
    if (pair) al += '<div style="background:rgba(255,159,10,.12);border:1px solid rgba(255,159,10,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#ffd6a5">⚠ <b>E-03:</b> ' + (SF[ps] || ps) + ' (' + pv + ' б.) и ' + (SF[s] || s) + ' (' + df + ' б.) подряд.</div>';
    if (!bad && !pair) al = '<div style="background:rgba(48,209,88,.12);border:1px solid rgba(48,209,88,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#86efac">✓ Нарушений нет.</div>';
    ttip.innerHTML = '<div style="font-weight:700;font-size:.88rem;margin-bottom:6px">' + (SF[s] || s) + '</div><div style="display:flex;gap:14px;margin-bottom:6px"><div><div style="font-size:.6rem;color:#86868b">Балл</div><div style="font-size:1.2rem;font-weight:800;color:' + vc + '">' + df + '</div></div><div><div style="font-size:.6rem;color:#86868b">Уровень</div><div style="font-weight:600;color:#86868b">' + lv + '</div></div><div><div style="font-size:.6rem;color:#86868b">Табл.</div><div style="color:#86868b">' + tbl + '</div></div></div>' + al;
    ttip.style.display = 'block';
  });
  document.addEventListener('mousemove', function (e) { if (ttip.style.display === 'block') { ttip.style.left = Math.min(e.clientX + 14, window.innerWidth - 320) + 'px'; ttip.style.top = (e.clientY - 8) + 'px'; } });
  document.addEventListener('mouseout', function (e) { if (!e.target.closest || !e.target.closest('.demo__cell')) ttip.style.display = 'none'; });
}

});

/* ═══ WIZARD ═══ */
var wizSel=-1,wizStep=0;
var wizLabels=['','Шаг 1 из 4 — Школа и учебный план','Шаг 2 из 4 — Учителя','Шаг 3 из 4 — Кабинеты','Шаг 4 из 4 — Готово'];

var SUBJECTS=['Алгебра','Биология','География','Геометрия','Английский язык','Информатика','История','Изобразительное искусство','Литература','Математика','Музыка','Нач. классы','ОБЖ','Обществознание','Право','Русский язык','Технология','Физика','Физкультура','Химия','Черчение'];
var FLOORCOLORS=['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4'];
var wizData={
  schoolName:'Школа №42, г. Москва', shifts:1, days:5,
  teachers:[
    {name:'Иванова А.П.',subject:'Математика',hours:22,classes:'5А, 6Б, 7А',room:'105',notes:''},
    {name:'Петров С.И.',subject:'Физика',hours:18,classes:'7А, 8А, 9А',room:'301',notes:'Вт — метод. день'},
    {name:'Сидорова Е.В.',subject:'Русский язык',hours:26,classes:'5А, 5Б, 6А',room:'201',notes:'Не ранее 2-го ур.'}
  ],
  floors:[
    {label:'1 этаж',color:'#3b82f6',rooms:[{num:'101',subject:'Нач. классы',seats:30,equipment:''},{num:'105',subject:'Математика',seats:32,equipment:''}]},
    {label:'2 этаж',color:'#8b5cf6',rooms:[{num:'201',subject:'Русский язык',seats:30,equipment:''},{num:'204',subject:'Информатика',seats:15,equipment:'Компьютеры'}]},
    {label:'3 этаж',color:'#22c55e',rooms:[{num:'301',subject:'Физика',seats:30,equipment:'Лаборатория'},{num:'305',subject:'Химия',seats:28,equipment:'Лаборатория'}]}
  ]
};

var WIZARD_STORAGE_KEY = 'shkolaplan_wizard_runs';
var WIZARD_SOURCE_KEY = 'shkolaplan_wizard_source';
var WIZARD_OPEN_KEY = 'shkolaplan_wizard_open_item';
var CURRENT_WIZARD_CONTEXT = null;

function loadWizardComponent() {
  var mounts = document.querySelectorAll('[data-wizard-mount]');
  if (!mounts.length) return;
  fetch('./wizard.html').then(function (res) {
    if (!res.ok) throw new Error('wizard template unavailable');
    return res.text();
  }).then(function (html) {
    mounts.forEach(function (mount) {
      mount.innerHTML = html;
      CURRENT_WIZARD_CONTEXT = mount.getAttribute('data-wizard-mount') || CURRENT_WIZARD_CONTEXT;
    });
    mounts.forEach(function (mount) {
      var mode = mount.getAttribute('data-wizard-mount');
      if (mode === 'account') {
        var sec = mount.querySelector('#wizard-section');
        if (sec) sec.scrollMarginTop = '92px';
      }
    });
    renderSavedWizardRuns();
    spLoadRunsFromSupabase();
  }).catch(function (err) {
    console.warn('Wizard load failed:', err.message);
  });
}

function getSavedWizardRuns() {
  try {
    var raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function setSavedWizardRuns(items) {
  localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(items));
}

function saveWizardRun(type, title, data) {
  var items = getSavedWizardRuns();
  var id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);
  var item = {
    id: id,
    type: type,
    title: title,
    createdAt: new Date().toISOString(),
    payload: data
  };
  items.unshift(item);
  setSavedWizardRuns(items.slice(0, 50));
  renderSavedWizardRuns();
  spSyncRunToSupabase(item);
  return id;
}

function deleteWizardRun(id) {
  var next = getSavedWizardRuns().filter(function (item) { return item.id !== id; });
  setSavedWizardRuns(next);
  renderSavedWizardRuns();
  spDeleteRunFromSupabase(id);
}

// ─── 2.2.2 sync с Supabase (таблица schedules_generated) ──────
// Если пользователь залогинен и таблица существует — записи дублируются
// в Supabase, что даёт сохранность между устройствами и сессиями.
// Если что-то падает — silently fallback на localStorage (UI работает как раньше).

function spSyncRunToSupabase(item) {
  if (typeof _initSupabase !== 'function' || !item) return;
  _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (!res.data || !res.data.user) return null;
      return sb.from('schedules_generated').insert({
        id:         item.id,
        user_id:    res.data.user.id,
        type:       item.type,
        title:      item.title,
        payload:    item.payload,
        created_at: item.createdAt,
      });
    });
  }).then(function (res) {
    if (res && res.error) console.warn('[sync→supabase] insert:', res.error.message);
  }).catch(function (e) { console.warn('[sync→supabase] error:', e && e.message); });
}

function spDeleteRunFromSupabase(id) {
  if (typeof _initSupabase !== 'function' || !id) return;
  _initSupabase().then(function (sb) {
    return sb.from('schedules_generated').delete().eq('id', id);
  }).then(function (res) {
    if (res && res.error) console.warn('[sync→supabase] delete:', res.error.message);
  }).catch(function (e) { console.warn('[sync→supabase] error:', e && e.message); });
}

function spLoadRunsFromSupabase() {
  if (typeof _initSupabase !== 'function') return Promise.resolve();
  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (!res.data || !res.data.user) return null;
      return sb.from('schedules_generated')
        .select('*')
        .eq('user_id', res.data.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
    });
  }).then(function (res) {
    if (!res || res.error || !Array.isArray(res.data)) return;
    var local = getSavedWizardRuns();
    var localIds = {};
    local.forEach(function (x) { localIds[x.id] = true; });
    var merged = local.slice();
    res.data.forEach(function (r) {
      if (!localIds[r.id]) {
        merged.push({
          id: r.id, type: r.type, title: r.title,
          createdAt: r.created_at, payload: r.payload,
        });
      }
    });
    merged.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    setSavedWizardRuns(merged.slice(0, 50));
    renderSavedWizardRuns();
  }).catch(function (e) { console.warn('[sync→supabase] load:', e && e.message); });
}

function renderSavedWizardRuns() {
  var host = document.getElementById('savedRunsList');
  if (!host) return;
  var items = getSavedWizardRuns();
  if (!items.length) {
    host.innerHTML = '<div class="profile-wizard-history__empty">Пока нет сохранённых элементов.</div>';
    return;
  }
  host.innerHTML = items.map(function (item) {
    var dt = new Date(item.createdAt).toLocaleString('ru-RU');
    return '<div class="profile-wizard-history__item">'
      + '<div><span class="profile-wizard-history__name">' + escH(item.title) + '</span>'
      + '<span class="profile-wizard-history__date">' + dt + '</span></div>'
      + '<div style="display:flex;gap:8px">'
      + '<button class="profile-wizard-history__open" onclick="openWizardRun(\'' + item.id + '\')">Открыть</button>'
      + '<button class="profile-wizard-history__delete" onclick="deleteWizardRun(\'' + item.id + '\')">Удалить</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function openWizardRun(id) {
  var item = getSavedWizardRuns().find(function (entry) { return entry.id === id; });
  if (!item) return;
  if (item.type === 'schedule') {
    try { sessionStorage.setItem('wizSchedule', JSON.stringify(item.payload || {})); } catch (_) {}
    localStorage.setItem(WIZARD_SOURCE_KEY, 'account');
    localStorage.setItem(WIZARD_OPEN_KEY, id);
    window.location.href = './schedule.html';
    return;
  }
  if (item.type === 'audit' && item.payload && item.payload.sch) {
    localStorage.setItem(WIZARD_SOURCE_KEY, 'account');
    localStorage.setItem(WIZARD_OPEN_KEY, id);
    window.location.href = './audit-view.html';
    return;
  }
  /* Legacy fallback for old "Проверка расписания" stubs without payload */
  var auditSection = document.getElementById('accountAuditSection') || document.getElementById('audit');
  if (auditSection) auditSection.style.display = 'block';
  var panel = document.getElementById('inlineDemo');
  if (panel) {
    panel.style.display = 'block';
    _initInlineDemo();
  }
  if (auditSection && auditSection.scrollIntoView) auditSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _accFmtDate(d) {
  d = d || new Date();
  return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2);
}

function _accBuildAuditTitle(school) {
  var s = (school || '').trim() || 'расписание';
  return 'Аудит — ' + s + ', ' + _accFmtDate();
}

function _accSaveAuditRun(sch, cg, school, fileName, isDemo) {
  try {
    var audit = doAudit(sch, cg);
    return {
      id: saveWizardRun('audit', _accBuildAuditTitle(school), {
        sch: sch,
        cg: cg,
        school: school || '',
        fileName: fileName || '',
        isDemo: !!isDemo,
        score: audit.score,
        violations: audit.vi ? audit.vi.length : 0,
        warnings: audit.wa ? audit.wa.length : 0
      }),
      audit: audit
    };
  } catch (e) {
    console.warn('Save audit run failed:', e);
    return null;
  }
}

/* In-wizard audit step: open audit-view.html for a fresh saved record */
function _wizGotoAuditView(id) {
  if (!id) return;
  try {
    localStorage.setItem(WIZARD_SOURCE_KEY, CURRENT_WIZARD_CONTEXT === 'account' ? 'account' : 'index');
    localStorage.setItem(WIZARD_OPEN_KEY, id);
  } catch (_) {}
  window.location.href = './audit-view.html';
}

function _wizShowAuditResult(saved, schoolLabel) {
  var resultEl = document.getElementById('wizAuditResult');
  var cardEl = document.getElementById('wizAuditResultCard');
  var openBtn = document.getElementById('wizAuditOpenBtn');
  var statusEl = document.getElementById('wizAuditStatus');
  if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
  if (!saved || !cardEl || !resultEl || !openBtn) return;
  var a = saved.audit || {};
  var score = (typeof a.score === 'number') ? a.score : '—';
  var vi = (a.vi || []).length;
  var wa = (a.wa || []).length;
  var color = score === '—' ? '#86868b' : (score >= 90 ? '#30d158' : (score >= 70 ? '#ffd60a' : '#ff453a'));
  cardEl.innerHTML = ''
    + '<div><b>' + escH(schoolLabel || 'Расписание') + '</b></div>'
    + '<div style="margin-top:6px">Оценка: <b style="color:' + color + '">' + score + '/100</b> · '
    + 'Нарушений: <b>' + vi + '</b> · Рекомендаций: <b>' + wa + '</b></div>';
  resultEl.style.display = 'flex';
  openBtn.onclick = function () { _wizGotoAuditView(saved.id); };
}

function _wizSetAuditStatus(text, isError) {
  var statusEl = document.getElementById('wizAuditStatus');
  if (!statusEl) return;
  statusEl.textContent = text || '';
  statusEl.style.color = isError ? '#ff453a' : '#86868b';
  statusEl.style.display = text ? 'block' : 'none';
}

function _wizBindAuditStep() {
  var fi = document.getElementById('wizAuditFileInput');
  if (fi && !fi._bound) {
    fi._bound = true;
    fi.addEventListener('change', function () {
      var file = fi.files && fi.files[0];
      if (!file) return;
      if (typeof parseXls !== 'function') { _wizSetAuditStatus('Движок аудита недоступен. Перезагрузите страницу.', true); return; }
      _wizSetAuditStatus('Анализируем файл…');
      var resultEl = document.getElementById('wizAuditResult');
      if (resultEl) resultEl.style.display = 'none';
      parseXls(file).then(function (result) {
        var schoolName = '';
        try {
          var s = document.getElementById('accSchool');
          if (s) schoolName = (s.textContent || '').trim();
        } catch (_) {}
        if (!schoolName || schoolName === '—') schoolName = file.name.replace(/\.xlsx?$/i, '');
        var saved = _accSaveAuditRun(result.sch, result.cg, schoolName, file.name, false);
        _wizShowAuditResult(saved, schoolName);
      }).catch(function (err) {
        _wizSetAuditStatus('Не удалось обработать файл: ' + (err && err.message ? err.message : err), true);
      });
      fi.value = '';
    });
  }
  var demo = document.getElementById('wizAuditDemoBtn');
  if (demo && !demo._bound) {
    demo._bound = true;
    demo.addEventListener('click', function () {
      if (typeof cooldown === 'function' && !cooldown('wizAuditDemo', 800)) return;
      _wizSetAuditStatus('Запускаем аудит на демо-данных…');
      setTimeout(function () {
        var saved = _accSaveAuditRun(DEM, DCG, 'Школа №42 (демо)', '', true);
        _wizShowAuditResult(saved, 'Школа №42 (демо-данные)');
      }, 250);
    });
  }
}

function _wizShowAuditStep() {
  /* Hide all numeric steps and progress bar; show only the audit step */
  for (var i = 0; i <= 4; i++) {
    var el = document.getElementById('wizStep' + i);
    if (el) el.style.display = 'none';
  }
  var prog = document.getElementById('wizProgress');
  if (prog) prog.style.display = 'none';
  var back = document.getElementById('wizBack');
  if (back) back.style.display = 'none';
  var next = document.getElementById('wizNext');
  if (next) next.style.display = 'none';
  var lbl = document.getElementById('wizStepLabel');
  if (lbl) lbl.textContent = 'Проверка расписания';
  var step = document.getElementById('wizStepAudit');
  if (step) step.style.display = 'block';
  var resultEl = document.getElementById('wizAuditResult');
  if (resultEl) resultEl.style.display = 'none';
  _wizSetAuditStatus('');
  _wizBindAuditStep();
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function subjOpts(sel){return SUBJECTS.map(function(s){return '<option value="'+escH(s)+'"'+(s===sel?' selected':'')+'>'+escH(s)+'</option>';}).join('');}

var _inlineDemoReady = false;
function _initInlineDemo() {
  if (_inlineDemoReady) return;
  var gridEl = document.getElementById('inlineDemoTabGrid');
  if (!gridEl || typeof renderGrid !== 'function') return;
  _inlineDemoReady = true;
  try {
    var audit = doAudit(DEM, DCG);
    var tbl = document.createElement('table');
    tbl.className = 'acc-grid-tbl';
    gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
    gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
    renderGrid(DEM, DCG, audit, tbl);
    var recsEl = document.getElementById('inlineDemoTabRecs');
    if (recsEl && typeof renderRecs === 'function') renderRecs(audit.top, recsEl);
  } catch (_) {}
}

function showInlineDemo() {
  var panel = document.getElementById('inlineDemo');
  if (!panel) return;
  panel.style.display = 'block';
  _initInlineDemo();
  if (CURRENT_WIZARD_CONTEXT !== 'account') {
    var auditEl = document.getElementById('audit');
    if (auditEl) auditEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function toggleInlineDemo() {
  var panel = document.getElementById('inlineDemo');
  if (!panel) return;
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) _initInlineDemo();
}

function renderTeachers(){
  var el=document.getElementById('wizTeachersTable');if(!el)return;
  var h='<div class="wiz-table wiz-table--edit"><div class="wiz-table__hdr wiz-table__hdr--t"><span>ФИО</span><span>Предмет</span><span>Часов</span><span>Классы</span><span>Каб.</span><span>Ограничения</span><span></span></div>';
  wizData.teachers.forEach(function(t,i){
    h+='<div class="wiz-table__row wiz-table__row--t">'
      +'<span><input class="wiz-ci" value="'+escH(t.name)+'" placeholder="ФИО" onchange="wizData.teachers['+i+'].name=this.value"/></span>'
      +'<span><select class="wiz-ci wiz-ci--sel" onchange="wizData.teachers['+i+'].subject=this.value">'+subjOpts(t.subject)+'</select></span>'
      +'<span><input class="wiz-ci wiz-ci--num" type="number" min="1" max="40" value="'+t.hours+'" onchange="wizData.teachers['+i+'].hours=+this.value"/></span>'
      +'<span><input class="wiz-ci" value="'+escH(t.classes)+'" placeholder="5А, 6Б" onchange="wizData.teachers['+i+'].classes=this.value"/></span>'
      +'<span><input class="wiz-ci wiz-ci--sm" value="'+escH(t.room)+'" placeholder="101" onchange="wizData.teachers['+i+'].room=this.value"/></span>'
      +'<span><input class="wiz-ci" value="'+escH(t.notes)+'" placeholder="—" onchange="wizData.teachers['+i+'].notes=this.value"/></span>'
      +'<span><button class="wiz-del" onclick="wizDelT('+i+')">×</button></span>'
      +'</div>';
  });
  h+='<div class="wiz-table__add" onclick="wizAddT()">+ добавить учителя</div></div>';
  el.innerHTML=h;
}
function wizAddT(){wizData.teachers.push({name:'',subject:SUBJECTS[0],hours:18,classes:'',room:'',notes:''});renderTeachers();}
function wizDelT(i){wizData.teachers.splice(i,1);renderTeachers();}

function renderRooms(){
  var el=document.getElementById('wizRoomsContainer');if(!el)return;
  var h='';
  wizData.floors.forEach(function(fl,fi){
    h+='<div class="wiz-floor"><div class="wiz-floor__label"><div class="wiz-floor__dot" style="background:'+fl.color+'"></div>'
      +'<input class="wiz-ci wiz-floor__ni" value="'+escH(fl.label)+'" onchange="wizData.floors['+fi+'].label=this.value"/>'
      +'<button class="wiz-del wiz-del--floor" onclick="wizDelFloor('+fi+')" title="Удалить этаж">×</button></div>'
      +'<div class="wiz-table wiz-table--rooms wiz-table--edit"><div class="wiz-table__hdr wiz-table__hdr--r"><span>Каб.</span><span>Предмет</span><span>Мест</span><span>Оборудование</span><span></span></div>';
    fl.rooms.forEach(function(r,ri){
      h+='<div class="wiz-table__row wiz-table__row--r">'
        +'<span><input class="wiz-ci wiz-ci--sm" value="'+escH(r.num)+'" placeholder="101" onchange="wizData.floors['+fi+'].rooms['+ri+'].num=this.value"/></span>'
        +'<span><select class="wiz-ci wiz-ci--sel" onchange="wizData.floors['+fi+'].rooms['+ri+'].subject=this.value">'+subjOpts(r.subject)+'</select></span>'
        +'<span><input class="wiz-ci wiz-ci--num" type="number" min="1" value="'+r.seats+'" onchange="wizData.floors['+fi+'].rooms['+ri+'].seats=+this.value"/></span>'
        +'<span><input class="wiz-ci" value="'+escH(r.equipment)+'" placeholder="—" onchange="wizData.floors['+fi+'].rooms['+ri+'].equipment=this.value"/></span>'
        +'<span><button class="wiz-del" onclick="wizDelRoom('+fi+','+ri+')">×</button></span>'
        +'</div>';
    });
    h+='<div class="wiz-table__add" onclick="wizAddRoom('+fi+')">+ кабинет</div></div></div>';
  });
  el.innerHTML=h;
}
function wizAddRoom(fi){wizData.floors[fi].rooms.push({num:'',subject:SUBJECTS[0],seats:30,equipment:''});renderRooms();}
function wizDelRoom(fi,ri){wizData.floors[fi].rooms.splice(ri,1);renderRooms();}
function wizAddFloor(){var n=wizData.floors.length;wizData.floors.push({label:(n+1)+' этаж',color:FLOORCOLORS[n%FLOORCOLORS.length],rooms:[]});renderRooms();}
function wizDelFloor(fi){if(wizData.floors.length>1)wizData.floors.splice(fi,1);renderRooms();}

/* Toggle handlers — attached once after DOM ready via event delegation */
document.addEventListener('click',function(e){
  var opt=e.target.closest('.wiz-toggle__opt');if(!opt)return;
  var toggle=opt.closest('.wiz-toggle');if(!toggle)return;
  toggle.querySelectorAll('.wiz-toggle__opt').forEach(function(o){o.classList.remove('wiz-toggle__opt--on');});
  opt.classList.add('wiz-toggle__opt--on');
  var val=+opt.getAttribute('data-val');
  if(toggle.id==='wizShiftsToggle')wizData.shifts=val;
  if(toggle.id==='wizDaysToggle')wizData.days=val;
});
document.getElementById('wizAddFloorBtn')&&document.getElementById('wizAddFloorBtn').addEventListener('click',wizAddFloor);
document.getElementById('wizSchoolNameInput')&&document.getElementById('wizSchoolNameInput').addEventListener('change',function(){wizData.schoolName=this.value;});

document.addEventListener('DOMContentLoaded', function () {
  if (!document.body.classList.contains('acc-page')) return;
  var fileInput = document.getElementById('auditFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file || typeof parseXls !== 'function') return;
      parseXls(file).then(function (result) {
        var panel = document.getElementById('inlineDemo');
        if (panel) panel.style.display = 'block';
        _inlineDemoReady = true;
        var audit = doAudit(result.sch, result.cg);
        var gridEl = document.getElementById('inlineDemoTabGrid');
        if (gridEl) {
          var tbl = document.createElement('table');
          tbl.className = 'acc-grid-tbl';
          gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
          gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
          renderGrid(result.sch, result.cg, audit, tbl);
        }
        var recsEl = document.getElementById('inlineDemoTabRecs');
        if (recsEl) renderRecs(audit.top, recsEl);
        var schoolName = '';
        try {
          var nameEl = document.getElementById('accSchool');
          if (nameEl) schoolName = (nameEl.textContent || '').trim();
        } catch (_) {}
        if (!schoolName || schoolName === '—') schoolName = file.name.replace(/\.xlsx?$/i, '');
        _accSaveAuditRun(result.sch, result.cg, schoolName, file.name, false);
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      fileInput.value = '';
    });
  }

  /* Демо-кнопка "Смотреть аудит на демо-данных" — раскрывает панель и сохраняет аудит */
  var demoBtn = document.getElementById('accountDemoAuditBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', function () {
      if (typeof cooldown === 'function' && !cooldown('accDemoAudit', 800)) return;
      var panel = document.getElementById('inlineDemo');
      if (!panel) return;
      var visible = panel.style.display !== 'none';
      panel.style.display = visible ? 'none' : 'block';
      if (!visible) {
        _initInlineDemo();
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        _accSaveAuditRun(DEM, DCG, 'Школа №42 (демо)', '', true);
      }
    });
  }

  var tabs = document.querySelectorAll('#inlineDemoTabs .demo-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('demo-tab--active'); });
      tab.classList.add('demo-tab--active');
      var which = tab.getAttribute('data-tab');
      var grid = document.getElementById('inlineDemoTabGrid');
      var recs = document.getElementById('inlineDemoTabRecs');
      var rules = document.getElementById('inlineDemoTabRules');
      if (grid) grid.style.display = which === 'grid' ? '' : 'none';
      if (recs) recs.style.display = which === 'recs' ? '' : 'none';
      if (rules) rules.style.display = which === 'rules' ? '' : 'none';
    });
  });
});

function wizSelect(i){
  wizSel=i;
  var c1=document.getElementById('wizCard1'),c2=document.getElementById('wizCard2');
  if(c1)c1.style.borderColor=i===0?'#3b82f6':'#222';
  if(c2)c2.style.borderColor=i===1?'#22c55e':'#222';
  var cta=document.getElementById('wizCta');
  if(cta){cta.style.pointerEvents='auto';cta.style.background=i===0?'#3b82f6':'#22c55e';cta.style.color='#fff';cta.className='wiz-cta';}
}

function wizOpen(){
  if(!cooldown('wizOpen'))return;
  if(wizSel<0)return;
  /* Path 0 = audit */
  if(wizSel===0){
    if (CURRENT_WIZARD_CONTEXT === 'account') {
      /* Account page: show the in-wizard audit step (no scrolling, no duplicated section) */
      var l0=document.getElementById('wizLanding'),f0=document.getElementById('wizFlow');
      if(l0)l0.style.display='none';
      if(f0)f0.style.display='block';
      _wizShowAuditStep();
    } else {
      /* Index page: keep original behavior — show the inline demo block at #audit */
      showInlineDemo();
    }
    return;
  }
  /* Path 1 = generation → open wizard */
  var l=document.getElementById('wizLanding'),f=document.getElementById('wizFlow');
  if(l)l.style.display='none';
  if(f)f.style.display='block';
  wizStep = CURRENT_WIZARD_CONTEXT === 'account' ? 1 : 0;
  wizShowStep();
}

function wizClose(){
  var l=document.getElementById('wizLanding'),f=document.getElementById('wizFlow');
  if(f)f.style.display='none';
  if(l)l.style.display='block';
}

function wizBackToLanding(){
  wizStep=0;
  var auditStep = document.getElementById('wizStepAudit');
  if (auditStep) auditStep.style.display = 'none';
  var inline = document.getElementById('inlineDemo');
  if (inline) inline.style.display = 'none';
  wizClose();
}

function wizShowStep(){
  var lbl=document.getElementById('wizStepLabel');
  if(lbl)lbl.textContent=wizLabels[wizStep];
  var prog=document.getElementById('wizProgress');
  if(prog)prog.style.display=wizStep===0?'none':'';
  /* Always hide the audit step when navigating numeric generation steps */
  var auditStepEl=document.getElementById('wizStepAudit');
  if(auditStepEl)auditStepEl.style.display='none';
  for(var i=0;i<=4;i++){var el=document.getElementById('wizStep'+i);if(el)el.style.display=i===wizStep?'block':'none';}
  if(wizStep===2)renderTeachers();
  if(wizStep===3)renderRooms();
  for(var j=1;j<=4;j++){
    var s=document.getElementById('ws'+j);
    if(s){var dot=s.querySelector('.wiz-progress__dot'),p2=s.querySelector('p');
      if(j<=wizStep){s.classList.add('active');if(dot){dot.style.background='#3b82f6';dot.style.color='#fff';}if(p2)p2.style.color='#3b82f6';}
      else{s.classList.remove('active');if(dot){dot.style.background='#222';dot.style.color='#555';}if(p2)p2.style.color='#555';}
    }
  }
  var bar=document.getElementById('wizProgbar');
  if(bar)bar.style.width=wizStep>0?((wizStep-1)*25+12.5)+'%':'0%';
  var back=document.getElementById('wizBack'),next=document.getElementById('wizNext');
  if(back)back.style.display=(wizStep>0&&wizStep<4)?'block':'none';
  if(next){next.style.display=(wizStep===0||wizStep===4)?'none':'block';next.textContent=wizStep===3?'Сгенерировать \u2192':'Далее \u2192';}
}

function wizNext(){
  if(!cooldown('wizNext',1500))return;
  if(wizStep<4){wizStep++;wizShowStep();}
  if(wizStep===4){wizStartGeneration();}
}

function wizStartGeneration(){
  if(!cooldown('wizGenerate',5000))return;
  requireHuman(function() {
  var el=document.getElementById('wizStep4');if(!el)return;
  var school=escH(wizData.schoolName||'школы');
  el.innerHTML='<div class="wiz-gen">'
    +'<p class="wiz-gen__title">Генерация расписания</p>'
    +'<p class="wiz-gen__school">'+school+'</p>'
    +'<div class="wiz-gen__bar-wrap"><div class="wiz-gen__bar" id="wizGenBar"></div></div>'
    +'<p class="wiz-gen__status" id="wizGenStatus">Анализируем учителей и кабинеты…</p>'
    +'<div class="wiz-gen__done" id="wizGenDone" style="display:none">'
    +'<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="10" stroke="#22c55e" stroke-width="1.5"/><path d="M6 11l3.5 3.5 6.5-7" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'<span>Расписание готово!</span></div>'
    +'<button onclick="wizOpenSchedule()" class="wiz-gen__cta" id="wizGenCta" style="display:none">Открыть расписание →</button>'
    +'</div>';
  var steps=[
    {pct:15,msg:'Анализируем учителей и кабинеты…'},
    {pct:32,msg:'Проверяем ограничения по СанПиН…'},
    {pct:55,msg:'Распределяем нагрузку по дням…'},
    {pct:74,msg:'Разрешаем конфликты кабинетов…'},
    {pct:90,msg:'Финальная проверка нарушений…'},
    {pct:100,msg:'Готово'}
  ];
  var bar=document.getElementById('wizGenBar'),st=document.getElementById('wizGenStatus');
  var i=0;
  function tick(){
    if(i>=steps.length){
      var done=document.getElementById('wizGenDone'),cta=document.getElementById('wizGenCta');
      if(done)done.style.display='flex';
      if(cta)cta.style.display='inline-block';
      return;
    }
    var s=steps[i++];
    if(bar)bar.style.width=s.pct+'%';
    if(st&&s.msg!=='Готово')st.textContent=s.msg;
    setTimeout(tick,i===steps.length?600:900);
  }
  setTimeout(tick,300);
  }); /* end requireHuman */
}
function wizPrev(){
  var minStep = CURRENT_WIZARD_CONTEXT === 'account' ? 1 : 0;
  if(wizStep>minStep){wizStep--;wizShowStep();}
}

function wizBuildSchedule(){
  var days=wizData.days||5;
  var classSubjects={},classGrades={};
  wizData.teachers.forEach(function(t){
    var sub=t.subject||'';
    var code=normSubj(sub)||sub.toLowerCase().slice(0,6);
    if(!code)return;
    var hrs=parseInt(t.hoursPerWeek||t.hours)||2;
    var classes=(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean);
    classes.forEach(function(cls){
      if(!classSubjects[cls])classSubjects[cls]=[];
      classSubjects[cls].push({code:code,hours:hrs});
      if(!classGrades[cls]){var m=cls.match(/^(\d+)/);classGrades[cls]=m?parseInt(m[1]):7;}
    });
  });
  if(!Object.keys(classSubjects).length)return null;
  var sch={};
  Object.keys(classSubjects).forEach(function(cls){
    var grade=classGrades[cls]||7;
    var maxPD=grade<=4?5:grade<=8?6:7;
    var lessons=[];
    classSubjects[cls].forEach(function(s){for(var h=0;h<s.hours;h++)lessons.push(s.code);});
    /* shuffle lessons */
    for(var i=lessons.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=lessons[i];lessons[i]=lessons[j];lessons[j]=tmp;}
    var dayArr=[];for(var d=0;d<5;d++)dayArr.push([]);
    lessons.forEach(function(l){
      var best=0,mn=dayArr[0].length;
      for(var d=1;d<5;d++){if(dayArr[d].length<mn){mn=dayArr[d].length;best=d;}}
      if(dayArr[best].length<maxPD)dayArr[best].push(l);
    });
    sch[cls]=dayArr;
  });
  return{sch:sch,cg:classGrades};
}

// Эпик 1.4: загрузка Excel-шаблона из визарда
function wizXlsxUpload(file){
  if(!file)return;
  if(!cooldown('wizXlsxUpload',2000))return;

  var statusEl=document.getElementById('wizXlsxStatus');
  function setStatus(msg,isErr){
    if(!statusEl)return;
    statusEl.textContent=msg;
    statusEl.style.display='block';
    statusEl.style.color=isErr?'#ef4444':'#86868b';
  }
  setStatus('Обрабатывается шаблон…',false);

  var fd=new FormData();
  fd.append('file',file);
  fd.append('weekDays',String(wizData.days||5));

  fetch('/api/generate/from-xlsx',{method:'POST',body:fd})
    .then(function(r){return r.json();})
    .then(function(resp){
      if(!resp||!resp.ok){
        var err=resp&&resp.error;
        if(err&&Array.isArray(err.details)){
          var msgs=err.details.slice(0,3).map(function(d){
            return (d.sheet?'[Лист «'+d.sheet+'»'+(d.row?', стр.'+d.row:'')+'] ':'')+d.message;
          });
          throw new Error(msgs.join(' | '));
        }
        throw new Error((err&&err.message)||'Не удалось обработать шаблон');
      }
      var sch={};
      Object.keys(resp.schedule).forEach(function(cls){
        sch[cls]=resp.schedule[cls].map(function(day){
          return day.map(function(subj){
            return (typeof normSubj==='function'?normSubj(subj):subj)||subj;
          });
        });
      });
      var cg={};
      Object.keys(sch).forEach(function(cls){
        var m=cls.match(/^(\d+)/);
        cg[cls]=m?parseInt(m[1],10):7;
      });
      var built={sch:sch,cg:cg,school:wizData.schoolName||''};
      saveWizardRun('schedule','Расписание (Excel): '+(built.school||'Без названия'),built);
      localStorage.setItem(WIZARD_SOURCE_KEY,CURRENT_WIZARD_CONTEXT==='account'?'account':'index');
      try{sessionStorage.setItem('wizSchedule',JSON.stringify(built));}catch(e){}
      setStatus('Готово! Переход к расписанию…',false);
      window.location.href='./schedule.html';
    })
    .catch(function(err){
      setStatus('Ошибка: '+(err.message||err),true);
    });
}

function wizOpenSchedule(){
  if(!cooldown('wizSchedule'))return;

  var classes=[],curriculum=[];
  wizData.teachers.forEach(function(t,idx){
    if(!t.subject||!t.classes)return;
    var teacherId='T'+(idx+1);
    var tCls=String(t.classes).split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean);
    tCls.forEach(function(cls){
      if(classes.indexOf(cls)===-1)classes.push(cls);
      curriculum.push({
        classId:cls,subject:t.subject,
        weeklyHours:parseInt(t.hoursPerWeek||t.hours)||2,
        teacherId:teacherId,roomId:t.room||'к.1',
      });
    });
  });

  if(!classes.length){alert('Добавьте учителей с классами на шаге 2');return;}

  var days=wizData.days||5;

  fetch('/api/generate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({classes:classes,curriculum:curriculum,weekDays:days===6?6:5}),
  })
    .then(function(r){return r.json();})
    .then(function(resp){
      if(!resp||!resp.ok){
        var msg=(resp&&resp.error&&resp.error.message)||'Не удалось сгенерировать расписание';
        throw new Error(msg);
      }
      var sch={};
      Object.keys(resp.schedule).forEach(function(cls){
        sch[cls]=resp.schedule[cls].map(function(day){
          return day.map(function(subj){
            return (typeof normSubj==='function'?normSubj(subj):subj)||subj;
          });
        });
      });
      var cg={};
      classes.forEach(function(cls){
        var m=cls.match(/^(\d+)/);
        cg[cls]=m?parseInt(m[1],10):7;
      });
      var built={sch:sch,cg:cg,school:wizData.schoolName||''};
      saveWizardRun('schedule','Расписание: '+(built.school||'Без названия'),built);
      localStorage.setItem(WIZARD_SOURCE_KEY,CURRENT_WIZARD_CONTEXT==='account'?'account':'index');
      try{sessionStorage.setItem('wizSchedule',JSON.stringify(built));}catch(e){}
      window.location.href='./schedule.html';
    })
    .catch(function(err){
      alert('Ошибка генерации: '+(err.message||err));
    });
}
