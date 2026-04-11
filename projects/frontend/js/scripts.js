document.addEventListener('DOMContentLoaded', function () {
'use strict';

/* ═══ Scroll reveal ═══ */
var sio = new IntersectionObserver(function (en) {
  en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); sio.unobserve(e.target); } });
}, { threshold: .15 });
document.querySelectorAll('.fade-in').forEach(function (el) { sio.observe(el); });

/* ═══ Nav theme ═══ */
var nav = document.getElementById('nav');
var darkSections = document.querySelectorAll('.hero,.showcase--dark,.ribbon,.demo,.cta-register,.demo-hero,.demo-main,.sub-hero,.sub-main');
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

function wizSelect(i){
  wizSel=i;
  var c1=document.getElementById('wizCard1'),c2=document.getElementById('wizCard2');
  if(c1)c1.style.borderColor=i===0?'#3b82f6':'#222';
  if(c2)c2.style.borderColor=i===1?'#22c55e':'#222';
  var cta=document.getElementById('wizCta');
  if(cta){cta.style.pointerEvents='auto';cta.style.background=i===0?'#3b82f6':'#22c55e';cta.style.color='#fff';cta.className='wiz-cta';}
}

function wizOpen(){
  if(wizSel<0)return;
  /* Path 0 = audit → redirect to demo page */
  if(wizSel===0){window.location.href='/demo.html';return;}
  /* Path 1 = generation → open wizard */
  var l=document.getElementById('wizLanding'),f=document.getElementById('wizFlow');
  if(l)l.style.display='none';
  if(f)f.style.display='block';
  wizStep=0;wizShowStep();
}

function wizClose(){
  var l=document.getElementById('wizLanding'),f=document.getElementById('wizFlow');
  if(f)f.style.display='none';
  if(l)l.style.display='block';
}

function wizShowStep(){
  var lbl=document.getElementById('wizStepLabel');
  if(lbl)lbl.textContent=wizLabels[wizStep];
  var prog=document.getElementById('wizProgress');
  if(prog)prog.style.display=wizStep===0?'none':'';
  for(var i=0;i<=4;i++){var el=document.getElementById('wizStep'+i);if(el)el.style.display=i===wizStep?'':'none';}
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
  if(back)back.style.display=wizStep>0?'block':'none';
  if(next){next.style.display=wizStep===0?'none':'block';next.textContent=wizStep===4?'Сгенерировать':'Далее \u2192';}
}

function wizNext(){if(wizStep<4){wizStep++;wizShowStep();}}
function wizPrev(){if(wizStep>0){wizStep--;wizShowStep();}}
