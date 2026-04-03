document.addEventListener('DOMContentLoaded',function(){
"use strict";

/* ═══ SCROLL REVEAL ═══ */
var sio=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');sio.unobserve(e.target);}});},{threshold:.15});
document.querySelectorAll('.fade-in').forEach(function(el){sio.observe(el);});

/* ═══ NAV THEME ═══ */
var nav=document.getElementById('nav');
var darkS=document.querySelectorAll('.hero,.showcase--dark,.form-section,.ribbon,.demo');
function navTheme(){var nb=nav.getBoundingClientRect().bottom;var d=false;darkS.forEach(function(s){var r=s.getBoundingClientRect();if(r.top<nb&&r.bottom>nb)d=true;});nav.classList.toggle('nav--dark',d);}
window.addEventListener('scroll',navTheme,{passive:true});navTheme();

/* ═══ COUNTER ANIMATION ═══ */
var cf=false;
var cio=new IntersectionObserver(function(en){if(en[0].isIntersecting&&!cf){cf=true;document.querySelectorAll('.ribbon__number[data-target]').forEach(function(el){var t=+el.dataset.target,dur=1800,st=performance.now();(function tk(now){var p=Math.min((now-st)/dur,1);el.textContent=Math.round(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tk);})(st);});}},{threshold:.3});
var rib=document.querySelector('.ribbon');if(rib)cio.observe(rib);

/* ═══ FORM ═══ */
var form=document.getElementById('contactForm');
if(form){
  function setErr(id,msg){var s=document.getElementById(id);if(s)s.textContent=msg;var inp=s&&s.previousElementSibling;if(inp)inp.classList.toggle('error',!!msg);}
  form.querySelectorAll('.form__input').forEach(function(i){i.addEventListener('input',function(){var e=i.nextElementSibling;if(e&&e.classList.contains('form__error')){e.textContent='';i.classList.remove('error');}});});
  form.addEventListener('submit',function(e){
    e.preventDefault();var ok=true;
    var n=form.name.value.trim(),s=form.school.value.trim(),em=form.email.value.trim();
    setErr('nameError','');setErr('schoolError','');setErr('emailError','');
    if(!n){setErr('nameError','Введите имя');ok=false;}
    if(!s){setErr('schoolError','Укажите школу');ok=false;}
    if(!em){setErr('emailError','Введите email');ok=false;}
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){setErr('emailError','Некорректный email');ok=false;}
    if(!ok)return;
    var btn=form.querySelector('.form__btn');btn.disabled=true;btn.textContent='Отправка…';
    setTimeout(function(){form.style.display='none';document.querySelector('.form-section__left').style.display='none';document.getElementById('formSuccess').classList.add('active');},900);
  });
}

/* ═══════════════════════════════════════════════════════════
   AUDIT ENGINE — difficulty tables, audit, optimizer
   ═══════════════════════════════════════════════════════════ */

/* Subject names & colors */
var SF={мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект',окрмир:'Окр. мир',орксэ:'ОРКСЭ',черч:'Черчение'};
var CL={мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0',окрмир:'#60b060',орксэ:'#b090c0',черч:'#90b0b0'};
var DN=['Пн','Вт','Ср','Чт','Пт'];

/* Difficulty: tables 6.9 (1-4), 6.10 (5-9 grade-specific), 6.11 (10-11) */
var D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13},гео:{7:12,8:10,9:8},алг:{7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1},муз:{5:2,6:1,7:1,8:1},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{7:8,8:5,9:5}};
var D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4,окрмир:6,орксэ:4,черч:5};
var D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};
var WM={5:29,6:30,7:32,8:33,9:33,10:34,11:34};
var DX={5:6,6:6,7:7,8:7,9:7,10:7,11:7};

/** Get difficulty score for subject in grade */
function gd(s,g){
  if(!s)return 0;
  if(g<=4)return D14[s]||5;
  if(g>=10)return D1011[s]||5;
  var e=D59[s];if(!e)return 5;
  if(e[g]!=null)return e[g];
  for(var d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}
  return 5;
}

/** Run audit per СанПиН reference (A/B/C/E/G/H/X checks).
 *  st='v' = violation (HARD, red), 'w' = warning (SOFT, orange), 'i' = info */
function doAudit(sch,cg){
  var cr={};
  for(var cls in sch){if(!sch.hasOwnProperty(cls))continue;
    var days=sch[cls],g=cg[cls]||5,ch=[],th=g<=4?7:8;
    var dt=days.map(function(d){return d.filter(function(s){return s;}).length;});
    var wt=dt.reduce(function(a,b){return a+b;},0);
    var dd=days.map(function(d){return d.reduce(function(s,sub){return s+gd(sub,g);},0);});
    /* C-01: daily max lessons — HARD. 1кл:4(1×5 с физ-рой), 2-4кл:5(1×6 с физ-рой), 5-6кл:6, 7-11кл:7 */
    var dmBase=g<=1?4:g<=4?5:g<=6?6:7;
    days.forEach(function(d,di){
      var c=d.filter(function(s){return s;}).length;
      if(c>dmBase){
        /* 1-4 кл: допускается +1 если это физкультура */
        if(g<=4&&c===dmBase+1){
          var hasPE=d.some(function(s){return s==='фк';});
          if(hasPE)return; /* допустимо */
        }
        ch.push({id:'C-01',nm:'Макс. уроков/день',st:'v',ds:cls+' '+DN[di]+': '+c+' ур. (макс. '+dmBase+')',sg:'Уберите '+(c-dmBase)+' урок'});
      }
    });
    /* C-02: weekly overload — HARD */
    var wm=WM[g]||34;
    if(wt>wm)ch.push({id:'C-02',nm:'Недельная нагрузка',st:'v',ds:cls+': '+wt+' ч (макс. '+wm+')',sg:'Уберите '+(wt-wm)+' ч'});
    /* C-03: uniformity — HARD (разница ≤1 между макс. и мин. уроков/день) */
    var ac=dt.filter(function(c){return c>0;});
    if(ac.length>1){
      var diff=Math.max.apply(null,ac)-Math.min.apply(null,ac);
      if(diff>1)ch.push({id:'C-03',nm:'Равномерность нагрузки',st:'v',ds:cls+': разница '+diff+' ур. ('+dt.join('–')+')',sg:'Перераспределите уроки между днями'});
    }
    /* E-02: light day not Wed/Thu — HARD */
    var activeDiffs=dd.filter(function(d){return d>0;});
    if(activeDiffs.length>2){
      var sorted=dd.map(function(d,i){return{d:d,i:i};}).filter(function(x){return x.d>0;}).sort(function(a,b){return a.d-b.d;});
      var lightest=sorted[0].i;
      if(lightest!==2&&lightest!==3){
        ch.push({id:'E-02',nm:'Облегчённый день',st:'v',ds:cls+': самый лёгкий — '+DN[lightest]+' ('+sorted[0].d+' б.), не Ср/Чт',sg:'Разгрузите Ср или Чт'});
      }
    }
    /* E-01: hard subjects not on slots 2-4 — SOFT (рекомендация МР 2.4.0331-23) */
    var badSlots=0;
    days.forEach(function(d){d.forEach(function(sub,li){if(sub&&gd(sub,g)>=th&&(li<1||li>3))badSlots++;});});
    if(badSlots>0)ch.push({id:'E-01',nm:'Сложные не на 2–4 уроках',st:'w',ds:cls+': '+badSlots+' случ.',sg:'Сложные предметы ставьте на 2–4 уроки (пик 10:00–12:00)'});
    /* E-03: consecutive hard subjects — SOFT (рекомендация, не hard constraint!)
       2 подряд → warning (penalty 2), 3+ подряд → strong warning (penalty 5) */
    var pairs=0,triples=0;
    days.forEach(function(d){
      var ss=d.filter(function(s){return s;});
      var streak=0;
      for(var i=0;i<ss.length;i++){
        if(gd(ss[i],g)>=th){
          streak++;
          if(streak===2)pairs++;
          if(streak>=3)triples++;
        } else {streak=0;}
      }
    });
    if(triples>0)ch.push({id:'E-03',nm:'3+ сложных подряд',st:'w',ds:cls+': '+triples+' случ. (тройки/более)',sg:'Вставьте лёгкий предмет между сложными'});
    else if(pairs>0)ch.push({id:'E-03',nm:'Сложные подряд',st:'w',ds:cls+': '+pairs+' пар',sg:'Чередуйте сложные и лёгкие предметы'});
    /* X-01: windows — HARD (no gaps between lessons) */
    var gaps=0,gapInfo=[];
    days.forEach(function(d,di){
      var nums=[];d.forEach(function(s,i){if(s)nums.push(i);});
      if(nums.length<=1)return;
      var occ={};nums.forEach(function(n){occ[n]=true;});
      for(var wi=nums[0]+1;wi<nums[nums.length-1];wi++){if(!occ[wi]){gaps++;if(gapInfo.length<3)gapInfo.push(DN[di]+' '+(wi+1)+'-й');}}
    });
    if(gaps>0)ch.push({id:'X-01',nm:'Окна в расписании',st:'v',ds:cls+': '+gaps+' окон'+(gapInfo.length?' ('+gapInfo.join(', ')+')':''),sg:'Уроки должны идти подряд без пропусков'});
    cr[cls]={ch:ch,dd:dd,wt:wt,dt:dt};
  }
  var all=[],vi=[],wa=[];
  for(var c in cr){if(!cr.hasOwnProperty(c))continue;cr[c].ch.forEach(function(x){var o={id:x.id,nm:x.nm,st:x.st,ds:x.ds,sg:x.sg,cls:c};all.push(o);if(x.st==='v')vi.push(o);else wa.push(o);});}
  var byR={};all.forEach(function(c){if(!byR[c.id])byR[c.id]={id:c.id,nm:c.nm,st:c.st,ds:c.ds,sg:c.sg,classes:[]};byR[c.id].classes.push(c.cls);});
  var top=[];for(var k in byR){if(byR.hasOwnProperty(k))top.push(byR[k]);}
  top.sort(function(a,b){return(a.st==='v'?0:2)+(a.classes.length>1?0:1)-((b.st==='v'?0:2)+(b.classes.length>1?0:1));});
  top=top.slice(0,8);
  var tot=0;for(var k2 in cr){if(cr.hasOwnProperty(k2))tot+=5+cr[k2].ch.length;}
  return{cr:cr,vi:vi,wa:wa,top:top,score:Math.round((tot-vi.length-wa.length)/tot*100),passed:tot-vi.length-wa.length};
}

/** Compact a day: move all subjects to front, empties to end. ZERO WINDOWS. */
function compact(days){
  days.forEach(function(d){
    var filled=[];for(var i=0;i<d.length;i++){if(d[i])filled.push(d[i]);}
    for(var i=0;i<d.length;i++){d[i]=i<filled.length?filled[i]:'';}
  });
}

/** Optimizer mode='soft' (minimal swaps) or 'bell' (full reorder). Both guarantee 0 windows. */
function optSchedule(sch,cg,mode){
  var f=JSON.parse(JSON.stringify(sch));
  for(var cls in f){if(!f.hasOwnProperty(cls))continue;
    var days=f[cls],g=cg[cls]||5,th=g<=4?7:8;
    /* Always compact first */
    compact(days);
    if(mode==='soft'){
      /* Soft: minimal swaps — move hard from slot 0 and last slots to 1-3 */
      for(var pass=0;pass<4;pass++){
        days.forEach(function(d){
          var subs=d.filter(function(s){return s;});if(subs.length<3)return;
          /* Move hard from slot 0 */
          if(d[0]&&gd(d[0],g)>=th){for(var j=1;j<=Math.min(3,d.length-1);j++){if(d[j]&&gd(d[j],g)<th){var t=d[0];d[0]=d[j];d[j]=t;break;}}}
          /* Move hard from slot 4+ to 1-3 */
          for(var i=4;i<d.length;i++){if(d[i]&&gd(d[i],g)>=th){for(var j=1;j<=3;j++){if(j<d.length&&d[j]&&gd(d[j],g)<th){var t=d[i];d[i]=d[j];d[j]=t;break;}}}}
          /* Break consecutive hard */
          for(var i=0;i<d.length-1;i++){if(d[i]&&d[i+1]&&gd(d[i],g)>=th&&gd(d[i+1],g)>=th){for(var j=i+2;j<d.length;j++){if(d[j]&&gd(d[j],g)<th){var t=d[i+1];d[i+1]=d[j];d[j]=t;break;}}}}
        });
      }
    } else {
      /* Bell: full reorder — hard at 1,3 (interleaved), light at edges */
      days.forEach(function(d){
        var su=[];d.forEach(function(s){if(s)su.push({s:s,d:gd(s,g)});});
        if(su.length<3)return;
        var hard=[],light=[];su.forEach(function(x){if(x.d>=th)hard.push(x);else light.push(x);});
        hard.sort(function(a,b){return b.d-a.d;});light.sort(function(a,b){return a.d-b.d;});
        var res=new Array(su.length),hi=0,li=0;
        [1,3,2].forEach(function(sl){if(hi<hard.length&&sl<su.length&&!res[sl]){res[sl]=hard[hi++];}});
        [0,4,5,6,7].forEach(function(sl){if(hi<hard.length&&sl<su.length&&!res[sl]){res[sl]=hard[hi++];}});
        for(var j=0;j<su.length;j++){if(!res[j]&&li<light.length){res[j]=light[li++];}}
        var ri=0;for(var i=0;i<d.length;i++){if(d[i]){d[i]=res[ri]?res[ri].s:d[i];ri++;}}
      });
      /* Break consecutive hard */
      for(var p=0;p<4;p++){
        var changed=false;
        days.forEach(function(d){
          for(var i=0;i<d.length-1;i++){
            if(d[i]&&d[i+1]&&gd(d[i],g)>=th&&gd(d[i+1],g)>=th){
              for(var j=i+2;j<d.length;j++){
                if(d[j]&&gd(d[j],g)<th){var t=d[i+1];d[i+1]=d[j];d[j]=t;changed=true;break;}
              }
            }
          }
        });
        if(!changed)break;
      }
    }
    compact(days); /* compact after placement */
    /* Fix C-01: if a day exceeds max lessons, move excess to lighter days */
    var dmBase2=g<=1?4:g<=4?5:g<=6?6:7;
    for(var c01=0;c01<10;c01++){
      var counts=days.map(function(d){return d.filter(function(s){return s;}).length;});
      var overIdx=-1;
      counts.forEach(function(c,i){if(c>dmBase2&&overIdx===-1)overIdx=i;});
      if(overIdx===-1)break;
      /* Find lightest day that can accept */
      var minIdx=-1,minC=999;
      counts.forEach(function(c,i){if(i!==overIdx&&c<dmBase2&&c<minC){minC=c;minIdx=i;}});
      if(minIdx===-1)break;
      /* Move last subject from heavy day to light day (if not duplicate) */
      var heavy=days[overIdx],lightD=days[minIdx];
      var moved=false;
      for(var si=heavy.length-1;si>=0&&!moved;si--){
        if(!heavy[si])continue;
        var subj=heavy[si];
        /* Check no duplicate in target day */
        var hasDup=false;
        for(var ti=0;ti<lightD.length;ti++){if(lightD[ti]===subj){hasDup=true;break;}}
        if(!hasDup){
          heavy[si]='';
          lightD.push(subj);
          moved=true;
        }
      }
      if(!moved)break;
      compact(days);
    }
    /* Fix C-03: equalize lesson counts (max-min ≤ 1) by moving lessons between days */
    for(var c03=0;c03<10;c03++){
      var cnts=days.map(function(d){return d.filter(function(s){return s;}).length;});
      var mx=Math.max.apply(null,cnts),mn=Math.min.apply(null,cnts.filter(function(c){return c>0;})||[0]);
      if(mx-mn<=1)break;
      /* Find heaviest and lightest day indices */
      var hiIdx=-1,loIdx=-1;
      cnts.forEach(function(c,i){if(c===mx&&hiIdx===-1)hiIdx=i;});
      cnts.forEach(function(c,i){if(c===mn&&c>0&&loIdx===-1)loIdx=i;});
      if(hiIdx===-1||loIdx===-1||hiIdx===loIdx)break;
      /* Try to move a subject from heavy→light without creating duplicate */
      var hDay=days[hiIdx],lDay=days[loIdx];
      var moved2=false;
      /* Prefer moving light subjects (low difficulty) to minimize disruption */
      var candidates=[];
      hDay.forEach(function(s,i){if(s)candidates.push({s:s,i:i,d:gd(s,g)});});
      candidates.sort(function(a,b){return a.d-b.d;}); /* lightest first */
      for(var ci=0;ci<candidates.length&&!moved2;ci++){
        var cand=candidates[ci];
        /* Check target day doesn't already have this subject */
        var dupInTarget=false;
        for(var ti=0;ti<lDay.length;ti++){if(lDay[ti]===cand.s){dupInTarget=true;break;}}
        if(!dupInTarget){
          hDay[cand.i]='';
          lDay.push(cand.s);
          moved2=true;
        }
      }
      if(!moved2)break;
      compact(days);
    }
    /* Fix E-02 — make Wed or Thu among lightest 2 */
    for(var a=0;a<4;a++){
      var dd=days.map(function(d){return d.reduce(function(s,sub){return s+gd(sub,g);},0);});
      var av=dd.map(function(d,i){return{d:d,i:i};}).filter(function(x){return x.d>0;}).sort(function(a2,b){return a2.d-b.d;});
      var tl=av.slice(0,2).map(function(x){return x.i;});
      if(tl.indexOf(2)!==-1||tl.indexOf(3)!==-1)break;
      var tgt=dd[2]<=dd[3]?2:3;
      var pi=0;dd.forEach(function(v,i){if(i!==tgt&&v>dd[pi])pi=i;});
      var ts=[],ps=[];
      days[tgt].forEach(function(s,i){if(s)ts.push({s:s,i:i,d:gd(s,g)});});ts.sort(function(a2,b){return b.d-a2.d;});
      days[pi].forEach(function(s,i){if(s)ps.push({s:s,i:i,d:gd(s,g)});});ps.sort(function(a2,b){return a2.d-b.d;});
      var swapped=false;
      for(var ti=0;ti<ts.length&&!swapped;ti++){
        for(var pj=0;pj<ps.length&&!swapped;pj++){
          if(ts[ti].d<=ps[pj].d)continue;
          var t1=days[tgt].slice(),t2=days[pi].slice();
          t1[ts[ti].i]=ps[pj].s;t2[ps[pj].i]=ts[ti].s;
          var u1=new Set(t1.filter(function(s){return s;})),u2=new Set(t2.filter(function(s){return s;}));
          if(u1.size===t1.filter(function(s){return s;}).length&&u2.size===t2.filter(function(s){return s;}).length){
            days[tgt][ts[ti].i]=ps[pj].s;days[pi][ps[pj].i]=ts[ti].s;swapped=true;
          }
        }
      }
      if(!swapped)break;
    }
    compact(days); /* FINAL compact — absolute guarantee of zero windows */
  }
  return f;
}

/* ═══ Demo data — 21 класс, тестовое расписание с нарушениями СанПиН ═══ */
var DEM={
  '5А':[
    ['мат','рус','ист','ия','био','фк','техн'],
    ['лит','мат','рус','геогр','муз','обж',''],
    ['мат','ия','рус','био','инф','ист',''],
    ['рус','мат','лит','фк','техн','',''],
    ['ия','мат','рус','общ','изо','',''],
  ],
  '5Б':[
    ['рус','мат','ия','лит','фк','обж'],
    ['мат','рус','био','ист','техн','муз'],
    ['ия','мат','рус','геогр','изо',''],
    ['рус','мат','инф','общ','лит','фк'],
    ['мат','ия','рус','био','ист',''],
  ],
  '5В':[
    ['лит','мат','рус','ия','фк',''],
    ['рус','мат','био','ист','техн','обж'],
    ['муз','лит','рус','изо','фк',''],
    ['мат','ия','рус','инф','геогр','общ'],
    ['ия','мат','рус','био','ист',''],
  ],
  '6А':[
    ['мат','рус','ия','лит','био','фк'],
    ['рус','мат','ист','общ','техн','муз'],
    ['изо','лит','фк','обж','муз',''],
    ['мат','ия','рус','инф','геогр','био'],
    ['ия','мат','рус','ист','техн',''],
  ],
  '6Б':[
    ['лит','мат','рус','муз','фк',''],
    ['рус','мат','ия','ист','техн','обж'],
    ['мат','ия','рус','инф','био','общ'],
    ['мат','рус','лит','геогр','изо','фк'],
    ['ия','мат','рус','био','ист','техн'],
  ],
  '6В':[
    ['лит','мат','рус','ия','ист','фк'],
    ['рус','мат','био','общ','техн','муз'],
    ['изо','лит','обж','фк','геогр',''],
    ['мат','ия','рус','инф','био','ист'],
    ['ия','мат','рус','лит','техн',''],
  ],
  '7А':[
    ['рус','алг','ист','ия','био','фк',''],
    ['лит','гео','физ','рус','общ','техн','обж'],
    ['гео','физ','алг','ия','рус','инф','мхк'],
    ['ия','алг','лит','геогр','муз','фк',''],
    ['рус','алг','био','ист','техн','',''],
  ],
  '7Б':[
    ['лит','алг','рус','ия','био','обж',''],
    ['рус','гео','физ','ист','техн','муз','фк'],
    ['ия','лит','геогр','изо','фк','',''],
    ['алг','рус','ия','физ','общ','инф','мхк'],
    ['гео','рус','алг','био','ист','техн',''],
  ],
  '7В':[
    ['лит','алг','муз','фк','','',''],
    ['рус','гео','физ','ия','био','техн','обж'],
    ['алг','рус','ия','ист','геогр','мхк',''],
    ['рус','гео','физ','общ','лит','инф','фк'],
    ['алг','ия','рус','био','ист','техн','изо'],
  ],
  '8А':[
    ['алг','рус','ия','физ','био','обж','',''],
    ['гео','хим','рус','лит','ист','общ','фк',''],
    ['алг','ия','хим','физ','рус','инф','геогр','техн'],
    ['рус','гео','ия','био','лит','фк','',''],
    ['алг','рус','ист','черч','техн','муз','',''],
  ],
  '8Б':[
    ['лит','алг','рус','ия','био','обж',''],
    ['рус','гео','физ','хим','ист','общ','фк'],
    ['ия','лит','геогр','черч','муз','фк',''],
    ['алг','хим','рус','ия','инф','био','ист'],
    ['гео','физ','алг','рус','лит','техн',''],
  ],
  '8В':[
    ['лит','алг','рус','ия','ист','фк',''],
    ['рус','гео','физ','хим','общ','техн','обж'],
    ['ия','лит','муз','геогр','черч','фк',''],
    ['алг','хим','рус','ия','био','инф','ист'],
    ['гео','физ','алг','рус','лит','био',''],
  ],
  '9А':[
    ['алг','рус','ист','ия','био','фк',''],
    ['гео','хим','физ','лит','общ','обж','инф'],
    ['рус','алг','ия','ист','геогр','лит',''],
    ['физ','хим','алг','гео','ия','рус','био'],
    ['лит','алг','рус','общ','фк','техн',''],
  ],
  '9Б':[
    ['лит','алг','рус','ия','ист','фк',''],
    ['рус','гео','физ','хим','био','общ','обж'],
    ['ия','лит','геогр','инф','фк','',''],
    ['алг','рус','хим','ия','ист','техн','лит'],
    ['гео','физ','алг','рус','био','общ',''],
  ],
  '9В':[
    ['алг','рус','физ','ия','ист','био','обж'],
    ['гео','хим','рус','лит','общ','инф','фк'],
    ['алг','ия','рус','физ','геогр','лит','техн'],
    ['хим','гео','ия','алг','ист','био','фк'],
    ['рус','алг','лит','общ','техн','черч','изо'],
  ],
  '10А':[
    ['лит','алг','рус','ия','био','обж',''],
    ['гео','хим','рус','ист','общ','фк',''],
    ['ия','лит','геогр','инф','фк','',''],
    ['алг','рус','хим','ия','био','ист','физ'],
    ['гео','физ','алг','лит','общ','мхк',''],
  ],
  '10Б':[
    ['лит','алг','рус','ия','ист','обж',''],
    ['рус','гео','физ','хим','общ','фк',''],
    ['ия','лит','геогр','мхк','фк','',''],
    ['алг','хим','рус','ия','био','инф','ист'],
    ['гео','физ','алг','лит','био','общ',''],
  ],
  '10В':[
    ['рус','алг','хим','ия','лит','обж',''],
    ['гео','физ','рус','био','ист','общ',''],
    ['ия','алг','лит','геогр','фк','',''],
    ['алг','хим','рус','ия','инф','мхк','фк'],
    ['гео','физ','алг','лит','био','ист',''],
  ],
  '11А':[
    ['лит','алг','рус','физ','ия','био',''],
    ['гео','хим','рус','ист','общ','обж','фк'],
    ['ия','алг','лит','инф','фк','',''],
    ['алг','физ','хим','рус','ия','геогр','ист'],
    ['гео','рус','лит','общ','био','мхк',''],
  ],
  '11Б':[
    ['лит','алг','рус','ия','ист','обж',''],
    ['рус','гео','физ','хим','общ','фк',''],
    ['ия','лит','мхк','инф','фк','',''],
    ['алг','хим','рус','ия','био','геогр','ист'],
    ['гео','физ','алг','лит','био','общ',''],
  ],
  '11В':[
    ['лит','ия','мхк','фк','','',''],
    ['рус','гео','физ','хим','общ','обж',''],
    ['алг','рус','ия','ист','био','инф',''],
    ['алг','хим','рус','ия','био','геогр','фк'],
    ['гео','физ','алг','рус','ист','лит','общ'],
  ],
};
var DCG={'5А':5,'5Б':5,'5В':5,'6А':6,'6Б':6,'6В':6,'7А':7,'7Б':7,'7В':7,'8А':8,'8Б':8,'8В':8,'9А':9,'9Б':9,'9В':9,'10А':10,'10Б':10,'10В':10,'11А':11,'11Б':11,'11В':11};

/* ═══ Subject normalization for Excel import ═══ */
var AL={мат:['математика','матем','матем.'],алг:['алгебра','алг.'],гео:['геометрия','геом','геом.'],рус:['русский язык','русский','рус яз','рус. яз','рус.яз','рус.яз.','русяз','руссяз','руський'],лит:['литература','лит-ра','литературное чтение','литерат чтение','литерат. чтение','литер','лит.'],ия:['английский язык','английский','англ яз','англ. яз','англ.яз','англ.яз.','англяз','иностранный язык','ин яз','ин. яз','ин.яз','ин.яз.','инояз','немецкий язык','французский язык','немецкий','французский'],физ:['физика','физ.'],хим:['химия','хим.'],био:['биология','биол','биол.'],ист:['история','история россии','всеобщая история','истор','ист.'],общ:['обществознание','обществозн','общество','общ.'],геогр:['география','географ','геогр','геогр.'],инф:['информатика','информатика и икт','информ','информ.','инф.'],фк:['физкультура','физ-ра','физра','физическая культура','физ.культура','физ. культура','физк','физк.'],изо:['изо','изобразительное искусство','рисование'],муз:['музыка','муз.'],техн:['технология','труд','техн.'],обж:['обж','основы безопасности жизнедеятельности','обж.'],астр:['астрономия','астрон','астр.'],однк:['однкнр','однк','однк.'],мхк:['мхк','искусство','мхк.','мировая художественная культура'],право:['право'],элект:['элективный','элективный курс','факультатив','элект','элект.'],проект:['проект','проектная деятельность','индивидуальный проект','инд. проект','инд проект'],окрмир:['окружающий мир','окр мир','окр. мир'],орксэ:['орксэ','основы религиозных культур','орксе'],черч:['черчение','черч.']};
var NK={};for(var kk in AL){AL[kk].forEach(function(n){NK[n]=kk;});}
function normSubj(raw){
  if(!raw||typeof raw!=='string')return '';
  var n=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"".,;:!()\-–—\/\\]/g,'').replace(/\s+/g,' ').trim();
  if(!n)return '';
  /* Also try version with dots removed but spaces kept */
  var noDots=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"";:!()\-–—\/\\]/g,'').replace(/\./g,' ').replace(/\s+/g,' ').trim();
  if(NK[n])return NK[n];
  if(NK[noDots])return NK[noDots];
  for(var nm in NK){if(NK.hasOwnProperty(nm)&&(n.indexOf(nm)!==-1||nm.indexOf(n)!==-1))return NK[nm];}
  for(var nm2 in NK){if(NK.hasOwnProperty(nm2)&&(noDots.indexOf(nm2)!==-1||nm2.indexOf(noDots)!==-1))return NK[nm2];}
  var fw=n.split(' ')[0];if(fw.length>=3){for(var nm3 in NK){if(NK.hasOwnProperty(nm3)&&nm3.indexOf(fw)===0)return NK[nm3];}}
  return n.slice(0,6);
}

/* ═══ Excel parser — universal format detection ═══ */
var DYM={'понедельник':'Пн','пн':'Пн','понед':'Пн','вторник':'Вт','вт':'Вт','втор':'Вт','среда':'Ср','ср':'Ср','сред':'Ср','четверг':'Чт','чт':'Чт','четв':'Чт','пятница':'Пт','пт':'Пт','пятн':'Пт','суббота':'Сб','сб':'Сб','субб':'Сб'};
function parseDay(r){if(!r)return null;var s=String(r).toLowerCase().replace(/[.\s]/g,'').trim();return DYM[s]||null;}
function isClassName(s){if(!s)return false;var v=String(s).trim();return /^\d{1,2}\s*[А-Яа-яA-Za-z]{0,2}$/.test(v)&&parseInt(v)>=1&&parseInt(v)<=11;}
function cellStr(v){return v==null?'':String(v).trim();}

function parseXls(file){return new Promise(function(ok,no){
  var rd=new FileReader();
  rd.onload=function(ev){try{
    var wb=XLSX.read(ev.target.result,{type:'array'});
    var result=null;
    /* Try each sheet until one produces data */
    for(var si=0;si<wb.SheetNames.length&&!result;si++){
      var ws=wb.Sheets[wb.SheetNames[si]];
      var data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      if(!data||data.length<2)continue;
      result=tryParseLong(data)||tryParseWide(data)||tryParseTransposed(data)||tryParseVertical(data)||tryParseAuto(data);
    }
    if(!result){no('Не удалось распознать формат расписания. Поддерживаются любые табличные форматы с названиями классов (5А, 7Б...) и предметами.');return;}
    ok(result);
  }catch(err){no('Ошибка чтения: '+err.message);}};
  rd.onerror=function(){no('Не удалось прочитать файл');};
  rd.readAsArrayBuffer(file);
});}

/** Strategy 1: Long format — columns with class names + day names + subjects
 *  Looks for any column containing class names and any column containing day names.
 *  Doesn't require specific header names. */
function tryParseLong(data){
  /* Scan first 3 rows to find columns with class names and day names */
  var classCol=-1,dayCol=-1,startRow=0;
  /* Check if row 0 is a header */
  var r0=data[0].map(function(c){return cellStr(c).toLowerCase();});
  r0.forEach(function(h,i){
    if(classCol===-1&&(h.indexOf('класс')!==-1||h==='class'||h==='кл'||h==='кл.'))classCol=i;
    if(dayCol===-1&&(h.indexOf('день')!==-1||h==='day'||parseDay(h)))dayCol=i;
  });
  /* If no header match, scan data rows to detect columns by content */
  if(classCol===-1||dayCol===-1){
    var classCount={},dayCount={};
    for(var r=0;r<Math.min(data.length,30);r++){
      for(var c=0;c<Math.min(data[r].length,15);c++){
        var v=cellStr(data[r][c]);
        if(isClassName(v)){classCount[c]=(classCount[c]||0)+1;}
        if(parseDay(v)){dayCount[c]=(dayCount[c]||0)+1;}
      }
    }
    /* Column with most class names */
    if(classCol===-1){var maxCC=0;for(var ci in classCount){if(classCount[ci]>maxCC){maxCC=classCount[ci];classCol=+ci;}}}
    if(dayCol===-1){var maxDC=0;for(var di in dayCount){if(dayCount[di]>maxDC){maxDC=dayCount[di];dayCol=+di;}}}
  }
  if(classCol===-1||dayCol===-1)return null;
  /* Determine lesson columns: everything except class and day columns */
  var lc=[];
  var numCols=0;data.forEach(function(row){if(row.length>numCols)numCols=row.length;});
  for(var i=0;i<numCols;i++){if(i!==classCol&&i!==dayCol)lc.push(i);}
  if(lc.length<1)return null;
  /* Determine start row (skip header) */
  startRow=0;
  if(!isClassName(cellStr(data[0][classCol]))&&!parseDay(cellStr(data[0][dayCol])))startRow=1;
  /* Parse */
  var sm={},cm={};
  for(var r=startRow;r<data.length;r++){
    var row=data[r];
    var clsR=cellStr(row[classCol]);
    var day=parseDay(cellStr(row[dayCol]));
    /* Handle merged cells: class name may be empty if merged vertically */
    if(!clsR&&r>startRow){
      /* Look back for nearest class name */
      for(var rb=r-1;rb>=startRow;rb--){var prev=cellStr(data[rb][classCol]);if(prev&&isClassName(prev)){clsR=prev;break;}}
    }
    if(!clsR||!day)continue;
    if(!isClassName(clsR))continue;
    if(!sm[clsR]){sm[clsR]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[clsR]=parseInt(clsR.replace(/[^0-9]/g,''))||5;}
    sm[clsR][day]=lc.map(function(ci){return normSubj(cellStr(row[ci]));});
  }
  return buildResult(sm,cm);
}

/** Strategy 2: Wide format — days as column groups in header row
 *  Row 0 or 1 has day names spanning multiple columns, classes in leftmost column */
function tryParseWide(data){
  if(data.length<3)return null;
  /* Find day groups in first 2 rows */
  var dayGroups={},curDay=null;
  for(var ri=0;ri<Math.min(2,data.length);ri++){
    for(var ci=0;ci<data[ri].length;ci++){
      var d=parseDay(cellStr(data[ri][ci]));
      if(d){curDay=d;if(!dayGroups[d])dayGroups[d]=[];}
      else if(curDay&&cellStr(data[ri][ci])){
        dayGroups[curDay].push(ci);
      }
    }
  }
  if(Object.keys(dayGroups).length<3)return null;
  /* Find class column (first column with class names) */
  var classCol=0;
  var dataRow=Object.keys(dayGroups).length>0?2:1;
  /* Look for first data row with class names */
  for(var r=dataRow;r<Math.min(data.length,5);r++){
    for(var c=0;c<3;c++){
      if(isClassName(cellStr(data[r][c]))){classCol=c;dataRow=r;break;}
    }
  }
  var sm={},cm={};
  for(var r=dataRow;r<data.length;r++){
    var cls=cellStr(data[r][classCol]);
    if(!cls||!isClassName(cls))continue;
    if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
    for(var day in dayGroups){
      if(!dayGroups.hasOwnProperty(day))continue;
      sm[cls][day]=dayGroups[day].map(function(ci){return normSubj(cellStr(data[r][ci]));});
    }
  }
  return buildResult(sm,cm);
}

/** Strategy 3: Vertical — class name once, then 5 rows follow (Mon-Fri implied or explicit) */
function tryParseVertical(data){
  /* Detect: column 0 has class names appearing every ~5 rows */
  var classRows=[];
  for(var r=0;r<data.length;r++){
    if(isClassName(cellStr(data[r][0]))){classRows.push(r);}
  }
  if(classRows.length<1)return null;
  /* Check if days are in column 0 or 1 between class rows */
  var hasDayCol=false;
  if(classRows.length>=1){
    var nextR=classRows.length>1?classRows[1]:data.length;
    for(var r=classRows[0]+1;r<Math.min(nextR,classRows[0]+6);r++){
      if(r<data.length){
        var v0=cellStr(data[r][0]),v1=cellStr(data[r][1]);
        if(parseDay(v0)||parseDay(v1))hasDayCol=true;
      }
    }
  }
  var dor=['Пн','Вт','Ср','Чт','Пт'];
  var sm={},cm={};
  for(var ci=0;ci<classRows.length;ci++){
    var cr=classRows[ci];
    var cls=cellStr(data[cr][0]);
    if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
    var di=0;
    /* Does the class row itself contain subjects? */
    var rowHasSubjects=false;
    for(var c=1;c<data[cr].length;c++){if(normSubj(cellStr(data[cr][c])))rowHasSubjects=true;}
    var startR=rowHasSubjects?cr:cr+1;
    for(var r=startR;r<data.length&&di<5;r++){
      if(r!==cr&&isClassName(cellStr(data[r][0])))break;
      var row=data[r];
      /* Detect where subjects start in this row */
      var subjStart=0;
      if(hasDayCol){
        /* Find day name, subjects start after it */
        for(var c=0;c<Math.min(row.length,3);c++){
          var dayVal=parseDay(cellStr(row[c]));
          if(dayVal){
            sm[cls][dayVal]=[];
            for(var sc=c+1;sc<row.length;sc++){var sv=normSubj(cellStr(row[sc]));sm[cls][dayVal].push(sv);}
            di++;break;
          }
        }
      } else {
        /* No day names — assume rows go Mon-Fri */
        var subs=[];
        for(var c=(r===cr?1:0);c<row.length;c++){subs.push(normSubj(cellStr(row[c])));}
        if(subs.some(function(s){return s;})){sm[cls][dor[di]]=subs;di++;}
      }
    }
  }
  return buildResult(sm,cm);
}

/** Strategy 4: Transposed — days in rows, classes as columns (ШколаПлан template format)
 *  Header row has День | № | 1А | 1Б | ... | 11В
 *  Data rows: day name in col 0 (merged), lesson number in col 1, subjects in cols 2+ */
function tryParseTransposed(data){
  /* Find header row with class names in columns */
  var hdrRow=-1,dayCol=-1,numCol=-1,classCols=[];
  for(var r=0;r<Math.min(data.length,10);r++){
    var classCount=0;
    for(var c=0;c<data[r].length;c++){
      if(isClassName(cellStr(data[r][c])))classCount++;
    }
    if(classCount>=2){hdrRow=r;break;}
  }
  if(hdrRow===-1)return null;
  /* Identify columns */
  for(var c=0;c<data[hdrRow].length;c++){
    var v=cellStr(data[hdrRow][c]).toLowerCase();
    if(v.indexOf('день')!==-1||v==='день')dayCol=c;
    else if(v==='№'||v==='#'||v==='n'||v==='номер'||v==='урок')numCol=c;
    else if(isClassName(cellStr(data[hdrRow][c]))){
      classCols.push({col:c,name:cellStr(data[hdrRow][c])});
    }
  }
  if(classCols.length<2)return null;
  if(dayCol===-1)dayCol=0; /* default: day in first column */

  var sm={},cm={};
  classCols.forEach(function(cc){
    sm[cc.name]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};
    cm[cc.name]=parseInt(cc.name.replace(/[^0-9]/g,''))||5;
  });

  var currentDay=null;
  for(var r=hdrRow+1;r<data.length;r++){
    var dayVal=parseDay(cellStr(data[r][dayCol]));
    if(dayVal)currentDay=dayVal;
    if(!currentDay)continue;
    /* Check if this row has any subject data */
    var hasSubjects=false;
    classCols.forEach(function(cc){if(cellStr(data[r][cc.col]))hasSubjects=true;});
    if(!hasSubjects)continue;
    /* Collect subjects for each class */
    classCols.forEach(function(cc){
      var subj=normSubj(cellStr(data[r][cc.col]));
      sm[cc.name][currentDay].push(subj);
    });
  }
  return buildResult(sm,cm);
}

/** Strategy 5: Auto-detect — scan all cells, find classes and subjects, infer structure */
function tryParseAuto(data){
  /* Last resort: find any cells that look like class names, group surrounding subjects */
  var sm={},cm={};
  var dor=['Пн','Вт','Ср','Чт','Пт'];
  for(var r=0;r<data.length;r++){
    for(var c=0;c<data[r].length;c++){
      var v=cellStr(data[r][c]);
      if(isClassName(v)){
        var cls=v;
        if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
        /* Collect subjects from cells to the right */
        var subs=[];
        for(var sc=c+1;sc<data[r].length;sc++){
          var sv=normSubj(cellStr(data[r][sc]));
          subs.push(sv);
        }
        if(subs.some(function(s){return s;})){
          /* Try to figure out which day — check if any cell in this row has a day name */
          var foundDay=null;
          for(var dc=0;dc<data[r].length;dc++){foundDay=parseDay(cellStr(data[r][dc]));if(foundDay)break;}
          if(foundDay){
            sm[cls][foundDay]=subs;
          } else {
            /* Count how many rows this class has to assign days */
            var dayIdx=0;
            for(var rr=0;rr<r;rr++){if(cellStr(data[rr][c])===cls)dayIdx++;}
            if(dayIdx<5)sm[cls][dor[dayIdx]]=subs;
          }
        }
      }
    }
  }
  return buildResult(sm,cm);
}

/** Convert parsed map to final {sch, cg} format */
function buildResult(sm,cm){
  var dor=['Пн','Вт','Ср','Чт','Пт'];
  var sch={},cg={};
  var count=0;
  for(var cls in sm){
    if(!sm.hasOwnProperty(cls))continue;
    /* Check this class has at least some subjects */
    var hasData=false;
    dor.forEach(function(d){if(sm[cls][d]&&sm[cls][d].some(function(s){return s;}))hasData=true;});
    if(!hasData)continue;
    var ml=1;dor.forEach(function(d){var l=(sm[cls][d]||[]).length;if(l>ml)ml=l;});
    sch[cls]=dor.map(function(d){var s=sm[cls][d]||[];while(s.length<ml)s.push('');return s;});
    cg[cls]=cm[cls]||5;
    count++;
  }
  if(count===0)return null;
  return{sch:sch,cg:cg};
}
/* ═══════════════════════════════════════════════════════════
   RENDERING
   ═══════════════════════════════════════════════════════════ */

function scoreRing(score,el){
  var sz=72,r=sz*.38,c=2*Math.PI*r,off=c-(score/100)*c;
  var col=score>=90?'#30d158':score>=70?'#ffd60a':'#ff453a';
  el.innerHTML='<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" style="transform:rotate(-90deg)"><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="'+(sz*.06)+'"/><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="'+(sz*.06)+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" stroke-linecap="round"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:'+(sz*.3)+'px;font-weight:800;color:'+col+';line-height:1">'+score+'</span><span style="font-size:'+(sz*.09)+'px;color:#86868b">/ 100</span></div>';
  el.style.cssText='position:relative;width:'+sz+'px;height:'+sz+'px;flex-shrink:0';
}

/** Render schedule grid. Compact is done INLINE — impossible to have windows. */
function renderGrid(sch,cg,au,tbl){
  var classes=Object.keys(sch);
  /* Count max FILLED lessons across all classes/days */
  var ml=6;
  classes.forEach(function(c){sch[c].forEach(function(d){
    var n=0;for(var i=0;i<d.length;i++){if(d[i])n++;}
    if(n>ml)ml=n;
  });});
  var h='<thead><tr><th></th>';
  DN.forEach(function(d){h+='<th colspan="'+ml+'" style="border-left:2px solid rgba(255,255,255,.1)">'+d+'</th>';});
  h+='</tr><tr><th></th>';
  DN.forEach(function(){for(var i=0;i<ml;i++)h+='<th style="font-size:.6rem;color:#6e6e73;'+(i===0?'border-left:2px solid rgba(255,255,255,.1)':'')+'">'+(i+1)+'</th>';});
  h+='</tr></thead><tbody>';
  classes.forEach(function(cl){
    var g=cg[cl]||5,th2=g<=4?7:8;
    var hasHard=au.cr[cl]&&au.cr[cl].ch.some(function(c){return c.st==='v';});
    var hasWarn=au.cr[cl]&&au.cr[cl].ch.some(function(c){return c.st==='w';});
    var clsColor=hasHard?'#ff453a':hasWarn?'#ff9f0a':'#f5f5f7';
    /* Build tooltip: brief list of issues for this class */
    var clsTip='';
    if(au.cr[cl]){au.cr[cl].ch.forEach(function(c){
      clsTip+=(c.st==='v'?'[!] ':'[i] ')+c.id+' '+c.nm+'\n';
    });}
    if(!clsTip)clsTip='OK - Нарушений нет';
    h+='<tr><td title="'+clsTip.replace(/"/g,'&quot;')+'" style="position:sticky;left:0;z-index:2;background:rgba(0,0,0,.9);font-weight:700;font-size:.72rem;padding:0 6px;color:'+clsColor+';cursor:help">'+cl+'</td>';
    sch[cl].forEach(function(dayArr,di){
      /* Extract ONLY filled subjects — this IS the compact */
      var filled=[];
      for(var i=0;i<dayArr.length;i++){if(dayArr[i])filled.push(dayArr[i]);}
      /* Render exactly ml cells: filled subjects first, then empties */
      for(var li=0;li<ml;li++){
        var bl=li===0?'border-left:2px solid rgba(255,255,255,.1);':'';
        var s=li<filled.length?filled[li]:'';
        if(!s){h+='<td style="'+bl+'padding:1px"></td>';continue;}
        var df=gd(s,g);
        var prevS=li>0&&li-1<filled.length?filled[li-1]:'';
        var bad=df>=th2&&(li<1||li>3);
        var pair=prevS&&df>=th2&&gd(prevS,g)>=th2;
        var isWarn=bad||pair;
        var bg=CL[s]||'#666';
        var bdr=isWarn?'2px solid #ff9f0a':'1px solid '+bg+'50';
        var ps=pair?prevS:'',pv=pair?gd(ps,g):0;
        h+='<td style="'+bl+'padding:1px"><div class="demo__cell" style="background:'+bg+'cc;border:'+bdr+'" data-s="'+s+'" data-g="'+g+'" data-d="'+df+'" data-l="'+li+'" data-b="'+(bad?1:0)+'" data-p="'+(pair?1:0)+'" data-ps="'+ps+'" data-pv="'+pv+'"><span>'+s+'</span><span style="font-size:.5rem;opacity:.6">'+df+'</span></div></td>';
      }
    });
    h+='</tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

function renderHeat(sch,cg,au,tbl){
  var classes=Object.keys(sch);
  var h='<thead><tr><th style="width:50px">Класс</th>';
  DN.forEach(function(d){h+='<th>'+d+'</th>';});h+='<th>Σ</th></tr></thead><tbody>';
  classes.forEach(function(cl){
    var r=au.cr[cl];if(!r)return;
    var mx=Math.max.apply(null,r.dd),mn=Math.min.apply(null,r.dd.filter(function(d){return d>0;}));
    var hv=au.cr[cl]&&au.cr[cl].ch.some(function(c){return c.st==='v';});
    var hw=au.cr[cl]&&au.cr[cl].ch.some(function(c){return c.st==='w';});
    var hc=hv?'#ff453a':hw?'#ff9f0a':'#f5f5f7';
    h+='<tr><td style="font-weight:700;padding:6px 8px;color:'+hc+'">'+cl+'</td>';
    r.dd.forEach(function(d){var il=d===mn&&d>0,ip=d===mx;h+='<td style="text-align:center;padding:6px 12px;font-weight:700;font-size:.88rem;background:'+(il?'rgba(48,209,88,.1)':ip?'rgba(255,69,58,.1)':'transparent')+';color:'+(il?'#30d158':ip?'#ff453a':'#86868b')+'">'+d+'</td>';});
    h+='<td style="text-align:center;padding:6px 12px;font-weight:600;color:#6e6e73">'+r.wt+'</td></tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

function renderRecs(top,el){
  el.innerHTML=top.map(function(t){
    var iv=t.st==='v';
    return '<div style="border-radius:10px;padding:11px 13px;margin-bottom:8px;background:'+(iv?'rgba(255,69,58,.06)':'rgba(255,159,10,.06)')+';border:1px solid '+(iv?'rgba(255,69,58,.15)':'rgba(255,159,10,.15)')+'"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:5px;color:#000;background:'+(iv?'#ff453a':'#ff9f0a')+'">'+(iv?'❌':'⚠️')+' '+t.id+'</span><span style="font-size:.82rem;font-weight:600">'+t.nm+'</span><span style="font-size:.72rem;color:#86868b;margin-left:auto">'+(t.classes.length>3?t.classes.slice(0,3).join(', ')+' +'+(t.classes.length-3):t.classes.join(', '))+'</span></div><div style="font-size:.78rem;color:rgba(255,255,255,.65);line-height:1.4">'+t.ds+'</div>'+(t.sg?'<div style="font-size:.78rem;color:#22d3ee;margin-top:3px">💡 '+t.sg+'</div>':'')+'</div>';
  }).join('');
}

function renderPopup(items,el,col){
  if(!items.length){el.innerHTML='';return;}
  el.innerHTML=items.slice(0,8).map(function(t){
    return '<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:5px"><span style="font-size:.6rem;font-weight:700;padding:1px 5px;border-radius:4px;flex-shrink:0;background:'+col+'22;color:'+col+'">'+t.id+'</span><div style="font-size:.72rem"><div style="color:rgba(255,255,255,.7);line-height:1.3">'+t.ds+'</div>'+(t.sg?'<div style="color:#22d3ee;font-size:.68rem;margin-top:1px">💡 '+t.sg+'</div>':'')+'</div></div>';
  }).join('')+(items.length>8?'<div style="color:#6e6e73;font-size:.6rem;margin-top:4px">…и ещё '+(items.length-8)+'</div>':'');
}

function renderVars(sch,cg,origAud,el){
  var vA=optSchedule(sch,cg,'soft'),vB=optSchedule(sch,cg,'bell');
  var aA=doAudit(vA,cg),aB=doAudit(vB,cg),o=origAud;
  function vc(v,base){return v<base?'color:#30d158':v>base?'color:#ff453a':'color:#86868b';}
  function vci(v,base){return v>base?'color:#30d158':v<base?'color:#ff453a':'color:#86868b';}
  /* Build hover popup badge for violations/warnings */
  function badge(au){
    /* Build HTML popup content for violations */
    function popupHtml(items,col,icon){
      if(!items.length)return '';
      return items.slice(0,10).map(function(t){
        return '<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.72rem;line-height:1.3"><span style="color:'+col+';font-weight:700">'+icon+' '+t.id+'</span> <span style="color:rgba(255,255,255,.7)">'+t.nm+'</span><div style="color:#86868b;font-size:.66rem">'+t.ds+'</div></div>';
      }).join('')+(items.length>10?'<div style="color:#6e6e73;font-size:.6rem;margin-top:3px">...и ещё '+(items.length-10)+'</div>':'');
    }
    var popStyle='display:none;position:absolute;bottom:calc(100% + 8px);right:0;z-index:60;background:#1e293b;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;min-width:280px;max-width:360px;max-height:300px;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.7);text-align:left';
    var wrapStyle='position:relative;display:inline-block;cursor:help';
    var parts=[];
    if(au.vi.length){
      parts.push('<span style="'+wrapStyle+'" onmouseenter="this.querySelector(\'.vp\').style.display=\'block\'" onmouseleave="this.querySelector(\'.vp\').style.display=\'none\'"><span style="color:#ff453a;font-weight:700">&#10060;'+au.vi.length+'</span><div class="vp" style="'+popStyle+'">'+popupHtml(au.vi,'#ff453a','&#10060;')+'</div></span>');
    }
    if(au.wa.length){
      parts.push('<span style="'+wrapStyle+'" onmouseenter="this.querySelector(\'.wp\').style.display=\'block\'" onmouseleave="this.querySelector(\'.wp\').style.display=\'none\'"><span style="color:#ff9f0a;font-weight:700">&#9888;'+au.wa.length+'</span><div class="wp" style="'+popStyle+'">'+popupHtml(au.wa,'#ff9f0a','&#9888;')+'</div></span>');
    }
    if(!au.vi.length&&!au.wa.length)parts.push('<span style="color:#30d158;font-weight:700">&#10004;</span>');
    parts.push('<span>Score: '+au.score+'</span>');
    return parts.join(' ');
  }
  var h='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 16px;margin-bottom:16px">';
  h+='<div style="display:flex;gap:6px;font-size:.75rem;margin-bottom:6px;color:#6e6e73;align-items:center"><span style="width:80px;text-align:right"></span><span style="width:44px;text-align:center;font-weight:700">Сейчас</span><span style="width:14px"></span><span style="width:44px;text-align:center;font-weight:700;color:#60a5fa">А</span><span style="width:44px;text-align:center;font-weight:700;color:#a78bfa">Б</span></div>';
  [['Score',o.score,aA.score,aB.score,true],['❌ Наруш.',o.vi.length,aA.vi.length,aB.vi.length,false],['⚠️ Рек.',o.wa.length,aA.wa.length,aB.wa.length,false]].forEach(function(r){
    var ca=r[4]?vci(r[2],r[1]):vc(r[2],r[1]),cb=r[4]?vci(r[3],r[1]):vc(r[3],r[1]);
    h+='<div style="display:flex;gap:6px;font-size:.82rem;margin-bottom:2px;align-items:center"><span style="width:80px;text-align:right;color:#6e6e73;font-size:.75rem">'+r[0]+'</span><span style="width:44px;text-align:center;background:rgba(255,255,255,.06);border-radius:4px;padding:2px 4px;color:#86868b">'+r[1]+'</span><span style="width:14px;color:rgba(255,255,255,.15);font-size:.72rem">→</span><span style="width:44px;text-align:center;font-weight:700;border-radius:4px;padding:2px 4px;'+ca+'">'+r[2]+'</span><span style="width:44px;text-align:center;font-weight:700;border-radius:4px;padding:2px 4px;'+cb+'">'+r[3]+'</span></div>';
  });
  h+='</div>';
  /* Variant A */
  h+='<div style="margin-bottom:20px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span style="background:#1d4ed8;color:#fff;font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:6px">Вариант А</span><span style="font-size:.88rem;font-weight:600">Мягкая оптимизация</span><span style="font-size:.78rem;color:#6e6e73">— минимум перестановок</span><span style="margin-left:auto;font-size:.7rem;color:#6e6e73">'+badge(aA)+'</span></div><div class="demo__tw"><table class="demo__tbl" id="tVA"></table></div></div>';
  /* Variant B */
  h+='<div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span style="background:#7c3aed;color:#fff;font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:6px">Вариант Б</span><span style="font-size:.88rem;font-weight:600">Колокол трудности</span><span style="font-size:.78rem;color:#6e6e73">— сложные на 2–4, лёгкие по краям</span><span style="margin-left:auto;font-size:.7rem;color:#6e6e73">'+badge(aB)+'</span></div><div class="demo__tw"><table class="demo__tbl" id="tVB"></table></div></div>';
  el.innerHTML=h;
  renderGrid(vA,cg,aA,document.getElementById('tVA'));
  renderGrid(vB,cg,aB,document.getElementById('tVB'));
}

/* ═══ SHOW DASHBOARD ═══ */
function showDash(sch,cg){
  var a=doAudit(sch,cg);
  document.getElementById('demoUpload').style.display='none';
  var dash=document.getElementById('demoDash');
  dash.style.display='block';
  scoreRing(a.score,document.getElementById('scoreEl'));
  document.querySelector('#cntP .demo__cnt-v').textContent=a.passed;
  document.querySelector('#cntW .demo__cnt-v').textContent=a.wa.length;
  document.querySelector('#cntV .demo__cnt-v').textContent=a.vi.length;
  renderPopup(a.wa,document.getElementById('popW'),'#ff9f0a');
  renderPopup(a.vi,document.getElementById('popV'),'#ff453a');
  renderGrid(sch,cg,a,document.getElementById('tGrid'));
  renderHeat(sch,cg,a,document.getElementById('tHeat'));
  renderRecs(a.top,document.getElementById('elRecs'));
  renderVars(sch,cg,a,document.getElementById('elVars'));
  /* Reset tabs to grid */
  document.querySelectorAll('.demo__tab').forEach(function(t){t.classList.remove('demo__tab--on');});
  document.querySelector('.demo__tab[data-t="grid"]').classList.add('demo__tab--on');
  document.querySelectorAll('.demo__pane').forEach(function(p){p.style.display='none';});
  document.getElementById('pGrid').style.display='block';
  dash.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ═══ TAB SWITCHING ═══ */
document.addEventListener('click',function(e){
  var tab=e.target.closest('.demo__tab');if(!tab)return;
  document.querySelectorAll('.demo__tab').forEach(function(t){t.classList.remove('demo__tab--on');});
  tab.classList.add('demo__tab--on');
  var map={grid:'pGrid',heat:'pHeat',recs:'pRecs',vars:'pVars'};
  document.querySelectorAll('.demo__pane').forEach(function(p){p.style.display='none';});
  var target=map[tab.getAttribute('data-t')];
  if(target)document.getElementById(target).style.display='block';
});

/* ═══ TOOLTIP ═══ */
var ttip=document.getElementById('ttip');
if(ttip){
  document.addEventListener('mouseover',function(e){
    var cell=e.target.closest('.demo__cell');
    if(!cell){ttip.style.display='none';return;}
    var s=cell.getAttribute('data-s'),g=+cell.getAttribute('data-g'),d=+cell.getAttribute('data-d'),li=+cell.getAttribute('data-l');
    var bad=cell.getAttribute('data-b')==='1',pair=cell.getAttribute('data-p')==='1';
    var ps=cell.getAttribute('data-ps'),pv=+cell.getAttribute('data-pv');
    var th3=g<=4?7:8,tbl=g<=4?'6.9':g<=9?'6.10':'6.11';
    var lv=d>=10?'Очень сложный':d>=th3?'Сложный':d>=5?'Средний':'Лёгкий';
    var vc=d>=th3?'#ff453a':d>=5?'#ffd60a':'#30d158';
    var al='';
    if(bad)al+='<div style="background:rgba(255,159,10,.12);border:1px solid rgba(255,159,10,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#ffd6a5">⚠ <b>Рекомендация:</b> предмет ('+d+' б.) на '+(li+1)+'-м уроке — рекомендуется 2–4 (пик работоспособности 10:00–12:00).<br><span style="color:#86868b;font-size:.65rem">МР 2.4.0331-23, п. 3.2</span></div>';
    if(pair)al+='<div style="background:rgba(255,159,10,.12);border:1px solid rgba(255,159,10,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#ffd6a5">⚠ <b>E-03 Рекомендация:</b> '+(SF[ps]||ps)+' ('+pv+' б.) и '+(SF[s]||s)+' ('+d+' б.) подряд — чередуйте сложные и лёгкие предметы.<br><span style="color:#86868b;font-size:.65rem">МР 2.4.0331-23, п. 3.2; СП 2.4.3648-20, п. 3.4.16</span></div>';
    if(!bad&&!pair)al='<div style="background:rgba(48,209,88,.12);border:1px solid rgba(48,209,88,.25);border-radius:6px;padding:5px 8px;margin-top:4px;font-size:.72rem;color:#86efac">✓ '+(d>=th3?'Сложный предмет на '+(li+1)+'-м уроке — оптимальная позиция.':'Нарушений нет.')+'</div>';
    ttip.innerHTML='<div style="font-weight:700;font-size:.88rem;margin-bottom:6px">'+(SF[s]||s)+'</div><div style="display:flex;gap:14px;margin-bottom:6px"><div><div style="font-size:.6rem;color:#86868b">Балл трудности</div><div style="font-size:1.2rem;font-weight:800;color:'+vc+'">'+d+'</div></div><div><div style="font-size:.6rem;color:#86868b">Уровень</div><div style="font-weight:600;color:#86868b">'+lv+'</div></div><div><div style="font-size:.6rem;color:#86868b">Таблица</div><div style="color:#86868b">'+tbl+'</div></div></div><div style="font-size:.6rem;color:rgba(255,255,255,.25);margin-bottom:4px">СанПиН 1.2.3685-21, табл. '+tbl+' • '+g+' кл. • порог сложности ≥ '+th3+' баллов</div>'+al;
    ttip.style.display='block';
  });
  document.addEventListener('mousemove',function(e){if(ttip.style.display==='block'){ttip.style.left=Math.min(e.clientX+14,window.innerWidth-320)+'px';ttip.style.top=(e.clientY-8)+'px';}});
  document.addEventListener('mouseout',function(e){if(!e.target.closest||!e.target.closest('.demo__cell'))ttip.style.display='none';});
}

/* ═══ UPLOAD & DEMO HANDLERS ═══ */
var dz=document.getElementById('dropzone'),fi=document.getElementById('fileInput'),de=document.getElementById('demoError');
if(dz){
  dz.addEventListener('click',function(){fi.click();});
  dz.addEventListener('dragover',function(e){e.preventDefault();dz.style.borderColor='#0071e3';dz.style.background='rgba(0,113,227,.06)';});
  dz.addEventListener('dragleave',function(){dz.style.borderColor='';dz.style.background='';});
  dz.addEventListener('drop',function(e){e.preventDefault();dz.style.borderColor='';dz.style.background='';var f=e.dataTransfer&&e.dataTransfer.files[0];if(f)handleFile(f);});
  fi.addEventListener('change',function(e){if(e.target.files[0])handleFile(e.target.files[0]);});
}
document.getElementById('loadDemoBtn').addEventListener('click',function(){de.textContent='';showDash(DEM,DCG);});
document.getElementById('resetBtn').addEventListener('click',function(){document.getElementById('demoDash').style.display='none';document.getElementById('demoUpload').style.display='block';de.textContent='';});

function handleFile(file){
  de.textContent='';
  parseXls(file).then(function(r){showDash(r.sch,r.cg);}).catch(function(err){de.textContent=typeof err==='string'?err:err.message;});
}

});
