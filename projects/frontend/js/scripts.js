document.addEventListener('DOMContentLoaded', function () {
'use strict';

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

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function subjOpts(sel){return SUBJECTS.map(function(s){return '<option value="'+escH(s)+'"'+(s===sel?' selected':'')+'>'+escH(s)+'</option>';}).join('');}

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
  /* Path 0 = audit → show inline demo */
  if(wizSel===0){showInlineDemo();return;}
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
function wizPrev(){if(wizStep>0){wizStep--;wizShowStep();}}

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

function wizOpenSchedule(){
  if(!cooldown('wizSchedule'))return;
  var built=wizBuildSchedule();
  if(!built){alert('Добавьте учителей с классами на шаге 2');return;}
  built.school=wizData.schoolName||'';
  try{sessionStorage.setItem('wizSchedule',JSON.stringify(built));}catch(e){}
  window.location.href='/schedule.html';
}
