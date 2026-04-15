/* ШколаПлан — Audit Engine
   Общие функции аудита, оптимизации, парсинга и рендеринга расписания.
   Подключается: index.html (демо) и account.html (полный функционал).
   Требует: XLSX (SheetJS) для парсинга Excel-файлов.
*/

/* ═══ Наименования предметов и цвета ═══ */
var SF={мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект',окрмир:'Окр. мир',орксэ:'ОРКСЭ',черч:'Черчение'};
var CL={мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0',окрмир:'#60b060',орксэ:'#b090c0',черч:'#90b0b0'};
var DN=['Пн','Вт','Ср','Чт','Пт'];

/* ═══ Таблицы трудности (СанПиН 1.2.3685-21, табл. 6.9–6.11) ═══ */
var D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13},гео:{7:12,8:10,9:8},алг:{7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1},муз:{5:2,6:1,7:1,8:1},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{7:8,8:5,9:5}};
var D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4,окрмир:6,орксэ:4,черч:5};
var D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};
var WM={5:29,6:30,7:32,8:33,9:33,10:34,11:34};

/* Балл трудности предмета для класса */
function gd(s,g){
  if(!s)return 0;
  if(g<=4)return D14[s]||5;
  if(g>=10)return D1011[s]||5;
  var e=D59[s];if(!e)return 5;
  if(e[g]!=null)return e[g];
  for(var d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}
  return 5;
}

/* ═══ Аудит по СанПиН ═══ */
function doAudit(sch,cg){
  var cr={};
  for(var cls in sch){
    if(!sch.hasOwnProperty(cls))continue;
    var days=sch[cls],g=cg[cls]||5,ch=[],th=g<=4?7:8;
    var dt=days.map(function(d){return d.filter(function(s){return s;}).length;});
    var wt=dt.reduce(function(a,b){return a+b;},0);
    var dd=days.map(function(d){return d.reduce(function(s,sub){return s+gd(sub,g);},0);});
    var dmBase=g<=1?4:g<=4?5:g<=6?6:7;
    /* C-01 */
    var peExceptionUsed=false;
    days.forEach(function(d,di){
      var c=d.filter(function(s){return s;}).length;
      if(c>dmBase){
        if(g<=4&&c===dmBase+1&&d.some(function(s){return s==='фк';})&&!peExceptionUsed){peExceptionUsed=true;return;}
        ch.push({id:'C-01',nm:'Макс. уроков/день',st:'v',ds:cls+' '+DN[di]+': '+c+' ур. (макс. '+dmBase+(g<=4?', +1 за физ-ру один раз/нед':'')+')',sg:'Уберите '+(c-dmBase)+' урок'});
      }
    });
    /* C-02 */
    var wm=WM[g]||34;
    if(wt>wm)ch.push({id:'C-02',nm:'Недельная нагрузка',st:'v',ds:cls+': '+wt+' ч (макс. '+wm+')',sg:'Уберите '+(wt-wm)+' ч'});
    /* C-03 */
    var ac=dt.filter(function(c){return c>0;});
    if(ac.length>1){var diff=Math.max.apply(null,ac)-Math.min.apply(null,ac);if(diff>1)ch.push({id:'C-03',nm:'Равномерность нагрузки',st:'v',ds:cls+': разница '+diff+' ур. ('+dt.join('\u2013')+')',sg:'Перераспределите уроки между днями'});}
    /* E-02 */
    var activeDiffs=dd.filter(function(d){return d>0;});
    if(activeDiffs.length>2){
      var sorted=dd.map(function(d,i){return{d:d,i:i};}).filter(function(x){return x.d>0;}).sort(function(a,b){return a.d-b.d;});
      if(sorted[0].i!==2&&sorted[0].i!==3)ch.push({id:'E-02',nm:'Облегчённый день',st:'v',ds:cls+': самый лёгкий — '+DN[sorted[0].i]+' ('+sorted[0].d+' б.), не Ср/Чт',sg:'Разгрузите Ср или Чт'});
    }
    /* E-01 */
    var badSlots=0;
    days.forEach(function(d){d.forEach(function(sub,li){if(sub&&gd(sub,g)>=th&&(li<1||li>3))badSlots++;});});
    if(badSlots>0)ch.push({id:'E-01',nm:'Сложные не на 2–4 уроках',st:'w',ds:cls+': '+badSlots+' случ.',sg:'Ставьте сложные предметы на 2–4 уроки'});
    /* E-03 */
    var pairs=0,triples=0;
    days.forEach(function(d){
      var ss=d.filter(function(s){return s;});var streak=0;
      for(var i=0;i<ss.length;i++){if(gd(ss[i],g)>=th){streak++;if(streak===2)pairs++;if(streak>=3)triples++;}else{streak=0;}}
    });
    if(triples>0)ch.push({id:'E-03',nm:'3+ сложных подряд',st:'w',ds:cls+': '+triples+' случ.',sg:'Вставьте лёгкий предмет между сложными'});
    else if(pairs>0)ch.push({id:'E-03',nm:'Сложные подряд',st:'w',ds:cls+': '+pairs+' пар',sg:'Чередуйте сложные и лёгкие предметы'});
    /* X-01 */
    var gaps=0,gapInfo=[];
    days.forEach(function(d,di){
      var nums=[];d.forEach(function(s,i){if(s)nums.push(i);});
      if(nums.length<=1)return;
      var occ={};nums.forEach(function(n){occ[n]=true;});
      for(var wi=nums[0]+1;wi<nums[nums.length-1];wi++){if(!occ[wi]){gaps++;if(gapInfo.length<3)gapInfo.push(DN[di]+' '+(wi+1)+'-й');}}
    });
    if(gaps>0)ch.push({id:'X-01',nm:'Окна в расписании',st:'v',ds:cls+': '+gaps+' окон'+(gapInfo.length?' ('+gapInfo.join(', ')+')':''),sg:'Уроки должны идти подряд'});
    cr[cls]={ch:ch,dd:dd,wt:wt,dt:dt};
  }
  var all=[],vi=[],wa=[];
  for(var c in cr){if(!cr.hasOwnProperty(c))continue;cr[c].ch.forEach(function(x){var o={id:x.id,nm:x.nm,st:x.st,ds:x.ds,sg:x.sg,cls:c};all.push(o);if(x.st==='v')vi.push(o);else wa.push(o);});}
  var byR={};all.forEach(function(c){if(!byR[c.id])byR[c.id]={id:c.id,nm:c.nm,st:c.st,ds:c.ds,sg:c.sg,classes:[]};byR[c.id].classes.push(c.cls);});
  var top=[];for(var k in byR){if(byR.hasOwnProperty(k))top.push(byR[k]);}
  top.sort(function(a,b){return(a.st==='v'?0:2)+(a.classes.length>1?0:1)-((b.st==='v'?0:2)+(b.classes.length>1?0:1));});
  top=top.slice(0,8);
  var tot=Object.keys(cr).length*7; /* 7 checks per class */
  var issues=vi.length+wa.length;
  var passed=tot-issues;
  return{cr:cr,vi:vi,wa:wa,top:top,score:tot>0?Math.round(passed/tot*100):100,passed:passed};
}

/* ═══ Оптимизатор ═══ */
function compact(days){
  days.forEach(function(d){
    var filled=[];for(var i=0;i<d.length;i++){if(d[i])filled.push(d[i]);}
    for(var i=0;i<d.length;i++){d[i]=i<filled.length?filled[i]:'';}
  });
}

function optSchedule(sch,cg,mode){
  var f=JSON.parse(JSON.stringify(sch));
  for(var cls in f){if(!f.hasOwnProperty(cls))continue;
    var days=f[cls],g=cg[cls]||5,th=g<=4?7:8;
    compact(days);
    if(mode==='soft'){
      for(var pass=0;pass<4;pass++){
        days.forEach(function(d){
          var subs=d.filter(function(s){return s;});if(subs.length<3)return;
          if(d[0]&&gd(d[0],g)>=th){for(var j=1;j<=Math.min(3,d.length-1);j++){if(d[j]&&gd(d[j],g)<th){var tmp=d[0];d[0]=d[j];d[j]=tmp;break;}}}
          for(var i=4;i<d.length;i++){if(d[i]&&gd(d[i],g)>=th){for(var j=1;j<=3;j++){if(j<d.length&&d[j]&&gd(d[j],g)<th){var tmp=d[i];d[i]=d[j];d[j]=tmp;break;}}}}
          for(var i=0;i<d.length-1;i++){if(d[i]&&d[i+1]&&gd(d[i],g)>=th&&gd(d[i+1],g)>=th){for(var j=i+2;j<d.length;j++){if(d[j]&&gd(d[j],g)<th){var tmp=d[i+1];d[i+1]=d[j];d[j]=tmp;break;}}}}
        });
      }
    }else{
      days.forEach(function(d){
        var su=[];d.forEach(function(s){if(s)su.push({s:s,dv:gd(s,g)});});
        if(su.length<3)return;
        var hard=[],light=[];su.forEach(function(x){if(x.dv>=th)hard.push(x);else light.push(x);});
        hard.sort(function(a,b){return b.dv-a.dv;});light.sort(function(a,b){return a.dv-b.dv;});
        /* E-01: hard at lessons 2,4 (0-indexed: 1,3) — within optimal range
           3rd hard goes to position 2 (lesson 3), also optimal
           Break-pairs step after will handle E-03 if needed */
        var res=new Array(su.length),hi=0,li=0;
        /* Hard subjects at positions 1,3 first (lessons 2,4 — optimal, not consecutive) */
        [1,3].forEach(function(sl){if(hi<hard.length&&sl<su.length&&!res[sl])res[sl]=hard[hi++];});
        /* Then position 2 (lesson 3 — still optimal range) */
        [2].forEach(function(sl){if(hi<hard.length&&sl<su.length&&!res[sl])res[sl]=hard[hi++];});
        /* Overflow hard to other positions */
        [0,4,5,6,7].forEach(function(sl){if(hi<hard.length&&sl<su.length&&!res[sl])res[sl]=hard[hi++];});
        /* Fill light subjects in remaining slots */
        for(var j=0;j<su.length;j++){if(!res[j]&&li<light.length)res[j]=light[li++];}
        /* Avoid ФК at lesson 1 (position 0) — swap with another light subject */
        if(res[0]&&res[0].s==='фк'){
          for(var sw=4;sw<su.length;sw++){if(res[sw]&&res[sw].dv<th&&res[sw].s!=='фк'){var tmp2=res[0];res[0]=res[sw];res[sw]=tmp2;break;}}
        }
        var ri=0;for(var i=0;i<d.length;i++){if(d[i]){d[i]=res[ri]?res[ri].s:d[i];ri++;}}
      });
      for(var p=0;p<4;p++){
        var changed=false;
        days.forEach(function(d){for(var i=0;i<d.length-1;i++){if(d[i]&&d[i+1]&&gd(d[i],g)>=th&&gd(d[i+1],g)>=th){for(var j=i+2;j<d.length;j++){if(d[j]&&gd(d[j],g)<th){var tmp=d[i+1];d[i+1]=d[j];d[j]=tmp;changed=true;break;}}}}});
        if(!changed)break;
      }
    }
    compact(days);
    /* Fix C-01 */
    var dmBase2=g<=1?4:g<=4?5:g<=6?6:7;
    for(var c01=0;c01<20;c01++){
      var counts=days.map(function(d){return d.filter(function(s){return s;}).length;});
      /* For grades 1-4: allow ONE day with dmBase+1 (PE exception), fix the rest */
      var overDays=[];counts.forEach(function(c,i){if(c>dmBase2)overDays.push(i);});
      if(overDays.length===0)break;
      /* If only one overloaded day at dmBase+1 for grades 1-4 and has PE — OK */
      if(g<=4&&overDays.length===1&&counts[overDays[0]]===dmBase2+1&&days[overDays[0]].some(function(s){return s==='фк';}))break;
      var overIdx=overDays[0];
      var minIdx=-1,minC=999;counts.forEach(function(c,i){if(i!==overIdx&&c<counts[overIdx]-1&&c<minC){minC=c;minIdx=i;}});
      if(minIdx===-1)break;
      var heavy=days[overIdx],lightD=days[minIdx],moved=false;
      for(var si=heavy.length-1;si>=0&&!moved;si--){if(!heavy[si])continue;var subj=heavy[si];var hasDup=false;for(var ti=0;ti<lightD.length;ti++){if(lightD[ti]===subj){hasDup=true;break;}}if(!hasDup){heavy[si]='';lightD.push(subj);moved=true;}}
      if(!moved)break;compact(days);
    }
    /* Fix C-01 PE exception: for grades 1-4, if a day has dmBase+1 lessons, 
       ensure PE (фк) is in that day. If PE is elsewhere, swap it in. */
    if(g<=4){
      compact(days);
      var cntsC01=days.map(function(d){return d.filter(function(s){return s;}).length;});
      var overDay=-1;cntsC01.forEach(function(c,i){if(c===dmBase2+1&&overDay===-1)overDay=i;});
      if(overDay!==-1&&!days[overDay].some(function(s){return s==='фк';})){
        /* Find PE in another day and swap with lightest subject from overloaded day */
        var peDay=-1,peIdx=-1;
        days.forEach(function(d,di){if(di!==overDay){for(var j=0;j<d.length;j++){if(d[j]==='фк'){peDay=di;peIdx=j;}}}}); 
        if(peDay!==-1){
          /* Find lightest subject in overloaded day to swap out */
          var lightestVal=999,lightestIdx=-1;
          days[overDay].forEach(function(s,si){
            if(s&&s!=='фк'){var v=gd(s,g);if(v<lightestVal){lightestVal=v;lightestIdx=si;}}
          });
          if(lightestIdx!==-1){
            var swapSubj=days[overDay][lightestIdx];
            days[overDay][lightestIdx]='фк';
            days[peDay][peIdx]=swapSubj;
          }
        }
        compact(days);
      }
    }
    /* Fix C-03 */
    for(var c03=0;c03<10;c03++){
      var cnts=days.map(function(d){return d.filter(function(s){return s;}).length;});
      var mxc=Math.max.apply(null,cnts),mnc=Math.min.apply(null,cnts.filter(function(c){return c>0;})||[0]);
      if(mxc-mnc<=1)break;
      var hiIdx=-1,loIdx=-1;cnts.forEach(function(c,i){if(c===mxc&&hiIdx===-1)hiIdx=i;});cnts.forEach(function(c,i){if(c===mnc&&c>0&&loIdx===-1)loIdx=i;});
      if(hiIdx===-1||loIdx===-1||hiIdx===loIdx)break;
      var hDay=days[hiIdx],lDay=days[loIdx],moved2=false;
      var candidates=[];hDay.forEach(function(s,i){if(s)candidates.push({s:s,i:i,dv:gd(s,g)});});
      candidates.sort(function(a,b){return a.dv-b.dv;});
      for(var ci=0;ci<candidates.length&&!moved2;ci++){var cand=candidates[ci];var dupInTarget=false;for(var ti=0;ti<lDay.length;ti++){if(lDay[ti]===cand.s){dupInTarget=true;break;}}if(!dupInTarget){hDay[cand.i]='';lDay.push(cand.s);moved2=true;}}
      if(!moved2)break;compact(days);
    }
    /* Fix E-02: make Wed or Thu the lightest day */
    for(var ea=0;ea<6;ea++){
      var ddx=days.map(function(d){return d.reduce(function(s,sub){return s+gd(sub,g);},0);});
      var av=ddx.map(function(d,i){return{d:d,i:i};}).filter(function(x){return x.d>0;}).sort(function(a2,b){return a2.d-b.d;});
      if(av.length<3)break;
      if(av[0].i===2||av[0].i===3)break; /* Wed or Thu is already lightest */
      /* src = current lightest (should NOT be lightest), tgt = lighter of Wed/Thu (should become lightest) */
      var src=av[0].i, tgt=ddx[2]<=ddx[3]?2:3;
      /* Swap: heavy from src → tgt, light from tgt → src (makes src heavier, tgt lighter) */
      var srcSubs=[],tgtSubs=[];
      days[src].forEach(function(s,i){if(s)srcSubs.push({s:s,i:i,dv:gd(s,g)});});
      days[tgt].forEach(function(s,i){if(s)tgtSubs.push({s:s,i:i,dv:gd(s,g)});});
      srcSubs.sort(function(a2,b){return a2.dv-b.dv;}); /* light first from src (to send out) */
      tgtSubs.sort(function(a2,b){return b.dv-a2.dv;}); /* heavy first from tgt (to send out) */
      var swapped=false;
      for(var si=0;si<tgtSubs.length&&!swapped;si++){
        for(var ti=0;ti<srcSubs.length&&!swapped;ti++){
          if(tgtSubs[si].dv<=srcSubs[ti].dv)continue; /* tgt subject must be harder than src subject */
          var s1=days[src].slice(),s2=days[tgt].slice();
          s1[srcSubs[ti].i]=tgtSubs[si].s; s2[tgtSubs[si].i]=srcSubs[ti].s;
          var u1=new Set(s1.filter(function(s){return s;})),u2=new Set(s2.filter(function(s){return s;}));
          if(u1.size===s1.filter(function(s){return s;}).length&&u2.size===s2.filter(function(s){return s;}).length){
            days[src][srcSubs[ti].i]=tgtSubs[si].s; days[tgt][tgtSubs[si].i]=srcSubs[ti].s; swapped=true;
          }
        }
      }
      if(!swapped)break;
    }
    /* Final: re-optimize within each day — move hard subjects to positions 1-3 (lessons 2-4) */
    days.forEach(function(d){
      var filled=[];for(var i=0;i<d.length;i++){if(d[i])filled.push(d[i]);}
      if(filled.length<3)return;
      for(var pass=0;pass<3;pass++){
        var changed2=false;
        for(var i=0;i<filled.length;i++){
          if(!filled[i])continue;
          var dv=gd(filled[i],g);
          /* Hard subject at bad position (0 or 4+)? */
          if(dv>=th&&(i<1||i>3)){
            /* Find a light subject at good position (1-3) to swap */
            for(var j=1;j<=3&&j<filled.length;j++){
              if(filled[j]&&gd(filled[j],g)<th){
                var tmp=filled[i];filled[i]=filled[j];filled[j]=tmp;
                changed2=true;break;
              }
            }
          }
        }
        if(!changed2)break;
      }
      /* Also avoid ФК at position 0 */
      if(filled[0]==='фк'){
        for(var sw=4;sw<filled.length;sw++){if(filled[sw]&&gd(filled[sw],g)<th&&filled[sw]!=='фк'){var tmp=filled[0];filled[0]=filled[sw];filled[sw]=tmp;break;}}
      }
      /* Write back */
      var ri=0;for(var i=0;i<d.length;i++){if(d[i]){d[i]=filled[ri++];}}
    });
    compact(days);
  }
  return f;
}

/* ═══ Демо-данные — 7 классов (по одному на параллель) ═══ */
var DEM={
  '5А':[['мат','рус','ист','ия','био','фк','техн'],['лит','мат','рус','геогр','муз','обж',''],['мат','ия','рус','био','инф','ист',''],['рус','мат','лит','фк','техн','',''],['ия','мат','рус','общ','изо','','']],
  '6А':[['мат','рус','ия','лит','био','фк'],['рус','мат','ист','общ','техн','муз'],['изо','лит','фк','обж','муз',''],['мат','ия','рус','инф','геогр','био'],['ия','мат','рус','ист','техн','']],
  '7А':[['рус','алг','ист','ия','био','фк',''],['лит','гео','физ','рус','общ','техн','обж'],['гео','физ','алг','ия','рус','инф','мхк'],['ия','алг','лит','геогр','муз','фк',''],['рус','алг','био','ист','техн','','']],
  '8А':[['алг','рус','ия','физ','био','обж','',''],['гео','хим','рус','лит','ист','общ','фк',''],['алг','ия','хим','физ','рус','инф','геогр','техн'],['рус','гео','ия','био','лит','фк','',''],['алг','рус','ист','черч','техн','муз','','']],
  '9А':[['алг','рус','ист','ия','био','фк',''],['гео','хим','физ','лит','общ','обж','инф'],['рус','алг','ия','ист','геогр','лит',''],['физ','хим','алг','гео','ия','рус','био'],['лит','алг','рус','общ','фк','техн','']],
  '10А':[['лит','алг','рус','ия','био','обж',''],['гео','хим','рус','ист','общ','фк',''],['ия','лит','геогр','инф','фк','',''],['алг','рус','хим','ия','био','ист','физ'],['гео','физ','алг','лит','общ','мхк','']],
  '11А':[['лит','алг','рус','физ','ия','био',''],['гео','хим','рус','ист','общ','обж','фк'],['ия','алг','лит','инф','фк','',''],['алг','физ','хим','рус','ия','геогр','ист'],['гео','рус','лит','общ','био','мхк','']]
};
var DCG={'5А':5,'6А':6,'7А':7,'8А':8,'9А':9,'10А':10,'11А':11};

/* ═══ Нормализация названий предметов ═══ */
var AL={мат:['математика','матем','матем.'],алг:['алгебра','алг.'],гео:['геометрия','геом','геом.'],рус:['русский язык','русский','рус яз','рус. яз','рус.яз','рус.яз.','русяз','руссяз','руський'],лит:['литература','лит-ра','литературное чтение','литерат чтение','литерат. чтение','литер','лит.'],ия:['английский язык','английский','англ яз','англ. яз','англ.яз','англ.яз.','англяз','иностранный язык','ин яз','ин. яз','ин.яз','ин.яз.','инояз','немецкий язык','французский язык','немецкий','французский'],физ:['физика','физ.'],хим:['химия','хим.'],био:['биология','биол','биол.'],ист:['история','история россии','всеобщая история','истор','ист.'],общ:['обществознание','обществозн','общество','общ.'],геогр:['география','географ','геогр','геогр.'],инф:['информатика','информатика и икт','информ','информ.','инф.'],фк:['физкультура','физ-ра','физра','физическая культура','физ.культура','физ. культура','физк','физк.'],изо:['изо','изобразительное искусство','рисование'],муз:['музыка','муз.'],техн:['технология','труд','техн.'],обж:['обж','основы безопасности жизнедеятельности','обж.'],астр:['астрономия','астрон','астр.'],однк:['однкнр','однк','однк.'],мхк:['мхк','искусство','мхк.','мировая художественная культура'],право:['право'],элект:['элективный','элективный курс','факультатив','элект','элект.'],проект:['проект','проектная деятельность','индивидуальный проект','инд. проект','инд проект'],окрмир:['окружающий мир','окр мир','окр. мир'],орксэ:['орксэ','основы религиозных культур','орксе'],черч:['черчение','черч.']};
var NK={};
(function(){for(var kk in AL){AL[kk].forEach(function(n){NK[n]=kk;});}})();

function normSubj(raw){
  if(!raw||typeof raw!=='string')return '';
  var n=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"".,;:!()\-–—\/\\]/g,'').replace(/\s+/g,' ').trim();
  if(!n)return '';
  var noDots=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"";:!()\-–—\/\\]/g,'').replace(/\./g,' ').replace(/\s+/g,' ').trim();
  if(NK[n])return NK[n];if(NK[noDots])return NK[noDots];
  for(var nm in NK){if(NK.hasOwnProperty(nm)&&(n.indexOf(nm)!==-1||nm.indexOf(n)!==-1))return NK[nm];}
  for(var nm2 in NK){if(NK.hasOwnProperty(nm2)&&(noDots.indexOf(nm2)!==-1||nm2.indexOf(noDots)!==-1))return NK[nm2];}
  var fw=n.split(' ')[0];if(fw.length>=3){for(var nm3 in NK){if(NK.hasOwnProperty(nm3)&&nm3.indexOf(fw)===0)return NK[nm3];}}
  return n.slice(0,6);
}

/* ═══ Excel-парсер ═══ */
var DYM={'понедельник':'Пн','пн':'Пн','понед':'Пн','вторник':'Вт','вт':'Вт','втор':'Вт','среда':'Ср','ср':'Ср','сред':'Ср','четверг':'Чт','чт':'Чт','четв':'Чт','пятница':'Пт','пт':'Пт','пятн':'Пт','суббота':'Сб','сб':'Сб','субб':'Сб'};
function parseDay(r){if(!r)return null;var s=String(r).toLowerCase().replace(/[.\s]/g,'').trim();return DYM[s]||null;}
function isClassName(s){if(!s)return false;var v=String(s).trim();return /^\d{1,2}\s*[А-Яа-яA-Za-z]{1,2}$/.test(v)&&parseInt(v)>=1&&parseInt(v)<=11;}
function cellStr(v){return v==null?'':String(v).trim();}

function parseXls(file){
  return new Promise(function(ok,no){
    var rd=new FileReader();
    rd.onload=function(ev){
      try{
        var wb=XLSX.read(ev.target.result,{type:'array'});
        var result=null;
        for(var si=0;si<wb.SheetNames.length&&!result;si++){
          var ws=wb.Sheets[wb.SheetNames[si]];
          var data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          if(!data||data.length<2)continue;
          result=tryParseLong(data)||tryParseWide(data)||tryParseTransposed(data)||tryParseVertical(data)||tryParseAuto(data);
        }
        if(!result){no('Не удалось распознать формат расписания.');return;}
        ok(result);
      }catch(err){no('Ошибка чтения: '+err.message);}
    };
    rd.onerror=function(){no('Не удалось прочитать файл');};
    rd.readAsArrayBuffer(file);
  });
}

function tryParseLong(data){
  var classCol=-1,dayCol=-1,startRow=0;
  var r0=data[0].map(function(c){return cellStr(c).toLowerCase();});
  r0.forEach(function(h,i){if(classCol===-1&&(h.indexOf('класс')!==-1||h==='class'||h==='кл'||h==='кл.'))classCol=i;if(dayCol===-1&&(h.indexOf('день')!==-1||h==='day'||parseDay(h)))dayCol=i;});
  if(classCol===-1||dayCol===-1){
    var clsCnt={},dayCnt={};
    for(var r=0;r<Math.min(data.length,30);r++){for(var c=0;c<Math.min(data[r].length,15);c++){var v=cellStr(data[r][c]);if(isClassName(v))clsCnt[c]=(clsCnt[c]||0)+1;if(parseDay(v))dayCnt[c]=(dayCnt[c]||0)+1;}}
    if(classCol===-1){var mc=0;for(var ci in clsCnt){if(clsCnt[ci]>mc){mc=clsCnt[ci];classCol=+ci;}}}
    if(dayCol===-1){var md=0;for(var di in dayCnt){if(dayCnt[di]>md){md=dayCnt[di];dayCol=+di;}}}
  }
  if(classCol===-1||dayCol===-1)return null;
  var lc=[];var nc=0;data.forEach(function(row){if(row.length>nc)nc=row.length;});
  for(var i=0;i<nc;i++){if(i!==classCol&&i!==dayCol)lc.push(i);}
  if(lc.length<1)return null;
  startRow=0;if(!isClassName(cellStr(data[0][classCol]))&&!parseDay(cellStr(data[0][dayCol])))startRow=1;
  var sm={},cm={};
  for(var r=startRow;r<data.length;r++){
    var row=data[r],clsR=cellStr(row[classCol]),day=parseDay(cellStr(row[dayCol]));
    if(!clsR&&r>startRow){for(var rb=r-1;rb>=startRow;rb--){var prev=cellStr(data[rb][classCol]);if(prev&&isClassName(prev)){clsR=prev;break;}}}
    if(!clsR||!day||!isClassName(clsR))continue;
    if(!sm[clsR]){sm[clsR]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[clsR]=parseInt(clsR.replace(/[^0-9]/g,''))||5;}
    sm[clsR][day]=lc.map(function(ci){return normSubj(cellStr(row[ci]));});
  }
  return buildResult(sm,cm);
}

function tryParseWide(data){
  if(data.length<3)return null;
  var dayGroups={},curDay=null;
  for(var ri=0;ri<Math.min(2,data.length);ri++){for(var ci=0;ci<data[ri].length;ci++){var d=parseDay(cellStr(data[ri][ci]));if(d){curDay=d;if(!dayGroups[d])dayGroups[d]=[];}else if(curDay&&cellStr(data[ri][ci]))dayGroups[curDay].push(ci);}}
  if(Object.keys(dayGroups).length<3)return null;
  var classCol=0,dataRow=2;
  for(var r=dataRow;r<Math.min(data.length,5);r++){for(var c=0;c<3;c++){if(isClassName(cellStr(data[r][c]))){classCol=c;dataRow=r;break;}}}
  var sm={},cm={};
  for(var r=dataRow;r<data.length;r++){
    var cls=cellStr(data[r][classCol]);if(!cls||!isClassName(cls))continue;
    if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
    for(var day in dayGroups){if(!dayGroups.hasOwnProperty(day))continue;sm[cls][day]=dayGroups[day].map(function(ci){return normSubj(cellStr(data[r][ci]));});}
  }
  return buildResult(sm,cm);
}

function tryParseVertical(data){
  var classRows=[];for(var r=0;r<data.length;r++){if(isClassName(cellStr(data[r][0])))classRows.push(r);}
  if(classRows.length<1)return null;
  var hasDayCol=false;
  var nextR=classRows.length>1?classRows[1]:data.length;
  for(var r=classRows[0]+1;r<Math.min(nextR,classRows[0]+6);r++){if(r<data.length&&(parseDay(cellStr(data[r][0]))||parseDay(cellStr(data[r][1]))))hasDayCol=true;}
  var dor=['Пн','Вт','Ср','Чт','Пт'],sm={},cm={};
  for(var ci=0;ci<classRows.length;ci++){
    var cr2=classRows[ci],cls=cellStr(data[cr2][0]);
    if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
    var di=0,rowHasSubs=false;
    for(var c=1;c<data[cr2].length;c++){if(normSubj(cellStr(data[cr2][c])))rowHasSubs=true;}
    var startR=rowHasSubs?cr2:cr2+1;
    for(var r=startR;r<data.length&&di<5;r++){
      if(r!==cr2&&isClassName(cellStr(data[r][0])))break;
      var row=data[r];
      if(hasDayCol){for(var c=0;c<Math.min(row.length,3);c++){var dv=parseDay(cellStr(row[c]));if(dv){sm[cls][dv]=[];for(var sc=c+1;sc<row.length;sc++)sm[cls][dv].push(normSubj(cellStr(row[sc])));di++;break;}}}
      else{var subs=[];for(var c=(r===cr2?1:0);c<row.length;c++)subs.push(normSubj(cellStr(row[c])));if(subs.some(function(s){return s;})){sm[cls][dor[di]]=subs;di++;}}
    }
  }
  return buildResult(sm,cm);
}

function tryParseTransposed(data){
  var hdrRow=-1,dayCol=-1,classCols=[];
  for(var r=0;r<Math.min(data.length,10);r++){var clsCnt=0;for(var c=0;c<data[r].length;c++){if(isClassName(cellStr(data[r][c])))clsCnt++;}if(clsCnt>=2){hdrRow=r;break;}}
  if(hdrRow===-1)return null;
  for(var c=0;c<data[hdrRow].length;c++){
    var v=cellStr(data[hdrRow][c]).toLowerCase();
    if(v.indexOf('день')!==-1||v==='день')dayCol=c;
    else if(isClassName(cellStr(data[hdrRow][c])))classCols.push({col:c,name:cellStr(data[hdrRow][c])});
  }
  if(classCols.length<2)return null;if(dayCol===-1)dayCol=0;
  var sm={},cm={};
  classCols.forEach(function(cc){sm[cc.name]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cc.name]=parseInt(cc.name.replace(/[^0-9]/g,''))||5;});
  var currentDay=null;
  for(var r=hdrRow+1;r<data.length;r++){
    var dv=parseDay(cellStr(data[r][dayCol]));if(dv)currentDay=dv;if(!currentDay)continue;
    var hasSubs=false;classCols.forEach(function(cc){if(cellStr(data[r][cc.col]))hasSubs=true;});if(!hasSubs)continue;
    classCols.forEach(function(cc){sm[cc.name][currentDay].push(normSubj(cellStr(data[r][cc.col])));});
  }
  return buildResult(sm,cm);
}

function tryParseAuto(data){
  var sm={},cm={},dor=['Пн','Вт','Ср','Чт','Пт'];
  for(var r=0;r<data.length;r++){for(var c=0;c<data[r].length;c++){
    var v=cellStr(data[r][c]);
    if(isClassName(v)){
      var cls=v;if(!sm[cls]){sm[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cm[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
      var subs=[];for(var sc=c+1;sc<data[r].length;sc++)subs.push(normSubj(cellStr(data[r][sc])));
      if(subs.some(function(s){return s;})){
        var foundDay=null;for(var dc=0;dc<data[r].length;dc++){foundDay=parseDay(cellStr(data[r][dc]));if(foundDay)break;}
        if(foundDay){sm[cls][foundDay]=subs;}else{var dayIdx=0;for(var rr=0;rr<r;rr++){if(cellStr(data[rr][c])===cls)dayIdx++;}if(dayIdx<5)sm[cls][dor[dayIdx]]=subs;}
      }
    }
  }}
  return buildResult(sm,cm);
}

function buildResult(sm,cm){
  var dor=['Пн','Вт','Ср','Чт','Пт'],sch={},cg={},count=0;
  for(var cls in sm){
    if(!sm.hasOwnProperty(cls))continue;
    var hasData=false;dor.forEach(function(d){if(sm[cls][d]&&sm[cls][d].some(function(s){return s;}))hasData=true;});
    if(!hasData)continue;
    var ml=1;dor.forEach(function(d){var l=(sm[cls][d]||[]).length;if(l>ml)ml=l;});
    sch[cls]=dor.map(function(d){var s=sm[cls][d]||[];while(s.length<ml)s.push('');return s;});
    cg[cls]=cm[cls]||5;count++;
  }
  if(count===0)return null;return{sch:sch,cg:cg};
}

/* ═══ Рендеринг ═══ */
function scoreRing(score,el){
  var sz=72,r=sz*.38,c=2*Math.PI*r,off=c-(score/100)*c;
  var col=score>=90?'#30d158':score>=70?'#ffd60a':'#ff453a';
  el.className='score-ring';
  el.innerHTML='<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'" class="score-ring__svg"><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="'+(sz*.06)+'"/><circle cx="'+sz/2+'" cy="'+sz/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="'+(sz*.06)+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" stroke-linecap="round"/></svg><div class="score-ring__label"><span class="score-ring__score" style="color:'+col+'">'+score+'</span><span class="score-ring__sub">/ 100</span></div>';
}

/* ═══ T-0510: Сетка аудита с цветами, тултипами и сортировкой ═══ */

var _gridSort='name'; // 'name' | 'score' | 'count'
var _gridSortAsc=true;

function _gridClassMeta(cl,cg,au){
  var g=cg[cl]||5, r=au.cr[cl], viol=0, warn=0, issues=[];
  if(r){r.ch.forEach(function(c){if(c.st==='v'){viol++;}else{warn++;}issues.push(c);});}
  return {g:g,viol:viol,warn:warn,issues:issues,total:viol+warn};
}

function _sortClasses(classes,cg,au){
  var meta={};classes.forEach(function(cl){meta[cl]=_gridClassMeta(cl,cg,au);});
  var sorted=classes.slice();
  function clsNum(c){var m=c.match(/^(\d+)/);return m?parseInt(m[1]):99;}
  function clsLetter(c){return c.replace(/^\d+/,'');}
  sorted.sort(function(a,b){
    if(_gridSort==='score'){
      var da=meta[a].viol-meta[b].viol;if(da!==0)return _gridSortAsc?da:-da;
      var dw=meta[a].warn-meta[b].warn;if(dw!==0)return _gridSortAsc?dw:-dw;
    }else if(_gridSort==='count'){
      var dt=meta[a].total-meta[b].total;if(dt!==0)return _gridSortAsc?-dt:dt;
    }
    /* Default: numeric sort 1А < 1Б < 2А < ... < 11В */
    var na=clsNum(a),nb=clsNum(b);
    if(na!==nb)return _gridSortAsc?na-nb:nb-na;
    var la=clsLetter(a),lb=clsLetter(b);
    return _gridSortAsc?la.localeCompare(lb,'ru'):lb.localeCompare(la,'ru');
  });
  return sorted;
}

function renderGrid(sch,cg,au,tbl,clean,forceMl){
  var classes=Object.keys(sch),ml=forceMl||6;
  if(!forceMl) classes.forEach(function(c){sch[c].forEach(function(d){var n=0;for(var i=0;i<d.length;i++){if(d[i])n++;}if(n>ml)ml=n;});});

  var sorted=_sortClasses(classes,cg,au);

  /* Precompute class metadata */
  var metas={};
  sorted.forEach(function(cl){ metas[cl]=_gridClassMeta(cl,cg,au); });

  /* Table header: День | № | class names */
  var h='<thead><tr><th class="tbl-day-col">День</th><th class="tbl-num-col">№</th>';
  sorted.forEach(function(cl){
    var m=metas[cl];
    var clsColor=clean?'#f5f5f7':(m.viol>0?'#ff453a':m.warn>0?'#ff9f0a':'#f5f5f7');
    var tipParts=[],tipIssues='';
    if(!clean){
      if(m.viol>0)tipParts.push(m.viol+' нар.');
      if(m.warn>0)tipParts.push(m.warn+' рек.');
      m.issues.forEach(function(c){tipIssues+='<div class="grid-tip__issue grid-tip__issue--'+c.st+'"><b>'+c.id+'</b> '+_esc(c.nm)+'</div>';});
    }
    var tipHtml=tipParts.length?tipParts.join(', '):'✓';
    var tipAttr=clean?'':' data-grid-tip="'+_esc(tipHtml+(tipIssues?'<hr class=grid-tip__hr>'+tipIssues:''))+'"';
    h+='<th class="tbl-cls-hdr'+(clean?'':' tbl-cls-hdr--click')+'" style="color:'+clsColor+'"'+(clean?'':' data-cls="'+cl+'"')+tipAttr+'>'+cl+'</th>';
  });
  h+='</tr></thead><tbody>';

  /* Rows: for each day × lesson */
  var FULL_DN=['Понедельник','Вторник','Среда','Четверг','Пятница'];
  for(var di=0;di<DN.length;di++){
    for(var li=0;li<ml;li++){
      h+='<tr'+(li===0?' class="tbl-day-first"':'')+'>';
      /* Day name — only on first lesson */
      if(li===0){
        h+='<td class="tbl-day-cell" rowspan="'+ml+'">'+FULL_DN[di]+'</td>';
      }
      /* Lesson number */
      h+='<td class="tbl-num-cell">'+(li+1)+'</td>';
      /* Subject for each class */
      sorted.forEach(function(cl){
        var m=metas[cl], g=m.g, th2=g<=4?7:8;
        var dmBase=clean?999:(g<=1?4:g<=4?5:g<=6?6:7);
        var dayArr=sch[cl][di]||[];
        var filled=[];for(var i=0;i<dayArr.length;i++){if(dayArr[i])filled.push(dayArr[i]);}
        var s=li<filled.length?filled[li]:'';
        if(!s){
          h+='<td class="tbl-subj-cell"></td>';
        } else {
          var df=gd(s,g);
          var prevS=li>0&&li-1<filled.length?filled[li-1]:'';
          var bad=clean?false:(df>=th2&&(li<1||li>3));
          var pair=clean?false:(prevS&&df>=th2&&gd(prevS,g)>=th2);
          var isExtra=!clean&&(li>=dmBase);
          var bg=CL[s]||'#666';
          var bdrCls=isExtra?'demo__cell--viol':(bad||pair)?'demo__cell--warn':'';
          var tipAttr='';
          if(!clean){
            var tipLines=[];
            if(bad)tipLines.push('⚠ E-01: сложный предмет ('+df+' б.) на '+(li+1)+'-м уроке');
            if(pair)tipLines.push('⚠ E-03: '+(SF[prevS]||prevS)+' и '+(SF[s]||s)+' подряд');
            if(m.issues){m.issues.forEach(function(iss){
              if(iss.id==='C-01'&&iss.ds&&iss.ds.indexOf(DN[di])!==-1)tipLines.push('❌ C-01: '+iss.ds);
            });}
            if(tipLines.length)tipAttr=' data-grid-tip="'+_esc((SF[s]||s)+' — '+df+' б.\n'+tipLines.join('\n'))+'"';
          }
          h+='<td class="tbl-subj-cell"><div class="demo__cell '+bdrCls+'" style="background:'+bg+'cc"'+tipAttr+'><span>'+s+'</span><span class="demo__cell-score">'+df+'</span></div></td>';
        }
      });
      h+='</tr>';
    }
  }

  tbl.innerHTML=h+'</tbody>';
  _attachGridTooltip(tbl.parentNode);

  tbl.addEventListener('click',function(e){
    var cell=e.target.closest('[data-cls]');
    if(!cell)return;
    _showClassDetail(cell.dataset.cls,sch,cg,au);
  });
}

function _plural(n,one,few,many){var m=n%10,d=n%100;if(d>=11&&d<=19)return many;if(m===1)return one;if(m>=2&&m<=4)return few;return many;}
function _esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');}
function _htmlToEl(html){var d=document.createElement('div');d.innerHTML=html;return d.firstElementChild;}

/* Floating tooltip for grid */
var _gridTipEl=null;
function _attachGridTooltip(container){
  if(!_gridTipEl){
    _gridTipEl=document.createElement('div');
    _gridTipEl.className='grid-tip';
    document.body.appendChild(_gridTipEl);
  }
  container.addEventListener('mouseover',function(e){
    var t=e.target.closest('[data-grid-tip]');
    if(!t){_gridTipEl.style.display='none';return;}
    _gridTipEl.innerHTML=t.getAttribute('data-grid-tip');
    _gridTipEl.style.display='block';
  });
  container.addEventListener('mousemove',function(e){
    if(_gridTipEl.style.display==='none')return;
    var x=Math.min(e.clientX+12,window.innerWidth-_gridTipEl.offsetWidth-10);
    var y=e.clientY-_gridTipEl.offsetHeight-8;
    if(y<4)y=e.clientY+16;
    _gridTipEl.style.left=x+'px';_gridTipEl.style.top=y+'px';
  });
  container.addEventListener('mouseout',function(e){
    var t=e.relatedTarget;
    if(t&&t.closest&&t.closest('[data-grid-tip]'))return;
    _gridTipEl.style.display='none';
  });
}

/* ═══ T-0511: Детальный отчёт по классу ═══ */

var _detailOverlay=null, _detailPanel=null;

function _ensureDetailDOM(){
  if(_detailOverlay)return;
  _detailOverlay=document.createElement('div');
  _detailOverlay.className='cls-detail-overlay';
  _detailOverlay.addEventListener('click',_closeClassDetail);
  _detailPanel=document.createElement('div');
  _detailPanel.className='cls-detail';
  document.body.appendChild(_detailOverlay);
  document.body.appendChild(_detailPanel);
}

function _closeClassDetail(){
  if(_detailOverlay)_detailOverlay.classList.remove('cls-detail-overlay--open');
  if(_detailPanel)_detailPanel.classList.remove('cls-detail--open');
}

function _showClassDetail(cl,sch,cg,au){
  _ensureDetailDOM();
  var g=cg[cl]||5, r=au.cr[cl], days=sch[cl], th2=g<=4?7:8;
  if(!r||!days)return;

  var viols=r.ch.filter(function(c){return c.st==='v';});
  var warns=r.ch.filter(function(c){return c.st==='w';});
  var clsColor=viols.length>0?'#ff453a':warns.length>0?'#ff9f0a':'#30d158';
  var statusText=viols.length>0?'Есть нарушения':warns.length>0?'Есть рекомендации':'Всё в порядке';

  var h='<div class="cls-detail__header">';
  h+='<div class="cls-detail__title"><span style="color:'+clsColor+'">'+cl+'</span> <span class="cls-detail__grade">'+g+' класс</span></div>';
  h+='<button class="cls-detail__close" onclick="_closeClassDetail()">✕</button>';
  h+='</div>';

  /* Status badge */
  h+='<div class="cls-detail__status" style="border-color:'+clsColor+'33;background:'+clsColor+'0d"><span style="color:'+clsColor+'">'+statusText+'</span>';
  h+=' — '+viols.length+' нарушени'+_plural(viols.length,'е','я','й')+', '+warns.length+' рекомендаци'+_plural(warns.length,'я','и','й');
  h+='</div>';

  /* Schedule mini-grid */
  h+='<div class="cls-detail__section"><div class="cls-detail__section-title">Расписание</div>';
  h+='<div class="cls-detail__grid-wrap"><table class="cls-detail__grid"><thead><tr><th></th>';
  var ml=0;days.forEach(function(d){var n=d.filter(function(s){return s;}).length;if(n>ml)ml=n;});
  for(var i=0;i<ml;i++)h+='<th>'+(i+1)+'</th>';
  h+='<th>Σ</th></tr></thead><tbody>';
  days.forEach(function(dayArr,di){
    var filled=dayArr.filter(function(s){return s;});
    var dayScore=filled.reduce(function(s,sub){return s+gd(sub,g);},0);
    h+='<tr><td class="cls-detail__day">'+DN[di]+'</td>';
    for(var li=0;li<ml;li++){
      var s=li<filled.length?filled[li]:'';
      if(!s){h+='<td></td>';continue;}
      var df=gd(s,g),bg=CL[s]||'#666';
      var bad=df>=th2&&(li<1||li>3);
      var prevS=li>0&&li-1<filled.length?filled[li-1]:'';
      var pair=prevS&&df>=th2&&gd(prevS,g)>=th2;
      var bdr=(bad||pair)?'border:2px solid #ff9f0a':'';
      h+='<td><div class="demo__cell" style="background:'+bg+'cc;'+bdr+'"><span>'+s+'</span><span class="demo__cell-score">'+df+'</span></div></td>';
    }
    h+='<td class="cls-detail__day-sum">'+dayScore+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div></div>';

  /* Difficulty profile */
  h+='<div class="cls-detail__section"><div class="cls-detail__section-title">Профиль трудности по дням</div>';
  h+='<div class="cls-detail__profile">';
  var maxDD=Math.max.apply(null,r.dd);
  r.dd.forEach(function(d,i){
    var pct=maxDD>0?Math.round(d/maxDD*100):0;
    var isLight=d>0&&d===Math.min.apply(null,r.dd.filter(function(x){return x>0;}));
    var isPeak=d===maxDD&&d>0;
    var barCol=isLight?'#30d158':isPeak?'#ff453a':'#0071e3';
    h+='<div class="cls-detail__bar-col"><div class="cls-detail__bar" style="height:'+pct+'%;background:'+barCol+'"></div>';
    h+='<div class="cls-detail__bar-val">'+d+'</div>';
    h+='<div class="cls-detail__bar-day">'+DN[i]+'</div></div>';
  });
  h+='</div></div>';

  /* Violations list */
  if(viols.length>0){
    h+='<div class="cls-detail__section"><div class="cls-detail__section-title" style="color:#ff453a">Нарушения</div>';
    viols.forEach(function(c){
      h+='<div class="cls-detail__issue cls-detail__issue--v">';
      h+='<div class="cls-detail__issue-head"><span class="cls-detail__issue-badge cls-detail__issue-badge--v">'+c.id+'</span><span class="cls-detail__issue-name">'+c.nm+'</span></div>';
      h+='<div class="cls-detail__issue-desc">'+c.ds+'</div>';
      if(c.sg)h+='<div class="cls-detail__issue-sug">'+c.sg+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  /* Warnings list */
  if(warns.length>0){
    h+='<div class="cls-detail__section"><div class="cls-detail__section-title" style="color:#ffd60a">Рекомендации</div>';
    warns.forEach(function(c){
      h+='<div class="cls-detail__issue cls-detail__issue--w">';
      h+='<div class="cls-detail__issue-head"><span class="cls-detail__issue-badge cls-detail__issue-badge--w">'+c.id+'</span><span class="cls-detail__issue-name">'+c.nm+'</span></div>';
      h+='<div class="cls-detail__issue-desc">'+c.ds+'</div>';
      if(c.sg)h+='<div class="cls-detail__issue-sug">'+c.sg+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  /* Download button */
  h+='<div class="cls-detail__actions">';
  h+='<button class="cls-detail__dl-btn" id="clsDetailDl">Скачать отчёт</button>';
  h+='</div>';

  _detailPanel.innerHTML=h;
  _detailOverlay.classList.add('cls-detail-overlay--open');
  _detailPanel.classList.add('cls-detail--open');

  /* Download handler */
  var dlBtn=document.getElementById('clsDetailDl');
  if(dlBtn){
    dlBtn.addEventListener('click',function(){
      _downloadClassReport(cl,g,days,r,au);
    });
  }
}

function _downloadClassReport(cl,g,days,r,au){
  var lines=[];
  lines.push('ОТЧЁТ ПО КЛАССУ: '+cl+' ('+g+' класс)');
  lines.push('Дата: '+new Date().toLocaleDateString('ru-RU'));
  lines.push('═'.repeat(50));
  lines.push('');

  /* Schedule */
  lines.push('РАСПИСАНИЕ:');
  days.forEach(function(dayArr,di){
    var filled=dayArr.filter(function(s){return s;});
    if(!filled.length)return;
    var items=filled.map(function(s,i){return (i+1)+'. '+(SF[s]||s)+' ('+gd(s,g)+' б.)';});
    lines.push('  '+DN[di]+': '+items.join(', '));
  });
  lines.push('');

  /* Difficulty profile */
  lines.push('ПРОФИЛЬ ТРУДНОСТИ:');
  r.dd.forEach(function(d,i){lines.push('  '+DN[i]+': '+d+' баллов');});
  lines.push('  Итого: '+r.wt+' ч/нед');
  lines.push('');

  /* Issues */
  var viols=r.ch.filter(function(c){return c.st==='v';});
  var warns=r.ch.filter(function(c){return c.st==='w';});
  if(viols.length){
    lines.push('НАРУШЕНИЯ ('+viols.length+'):');
    viols.forEach(function(c,i){
      lines.push('  '+(i+1)+'. ['+c.id+'] '+c.nm);
      lines.push('     '+c.ds);
      if(c.sg)lines.push('     Рекомендация: '+c.sg);
    });
    lines.push('');
  }
  if(warns.length){
    lines.push('РЕКОМЕНДАЦИИ ('+warns.length+'):');
    warns.forEach(function(c,i){
      lines.push('  '+(i+1)+'. ['+c.id+'] '+c.nm);
      lines.push('     '+c.ds);
      if(c.sg)lines.push('     Совет: '+c.sg);
    });
    lines.push('');
  }
  if(!viols.length&&!warns.length){
    lines.push('Нарушений не обнаружено.');
    lines.push('');
  }

  lines.push('─'.repeat(50));
  lines.push('Сформировано: ШколаПлан');

  var blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='audit-'+cl+'.txt';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderHeat(sch,cg,au,tbl){
  var classes=Object.keys(sch);
  var h='<thead><tr><th class="heat-class-col">Класс</th>';
  DN.forEach(function(d){h+='<th>'+d+'</th>';});h+='<th>Σ</th></tr></thead><tbody>';
  classes.forEach(function(cl){
    var r=au.cr[cl];if(!r)return;
    var mx=Math.max.apply(null,r.dd),mn=Math.min.apply(null,r.dd.filter(function(d){return d>0;}));
    var hv=r.ch.some(function(c){return c.st==='v';}),hw=r.ch.some(function(c){return c.st==='w';});
    var hc=hv?'#ff453a':hw?'#ff9f0a':'#f5f5f7';
    h+='<tr><td class="heat-class" style="color:'+hc+'">'+cl+'</td>';
    r.dd.forEach(function(d){
      var il=d===mn&&d>0,ip=d===mx;
      var bg=il?'rgba(48,209,88,.1)':ip?'rgba(255,69,58,.1)':'transparent';
      var fc=il?'#30d158':ip?'#ff453a':'#86868b';
      h+='<td class="heat-cell" style="background:'+bg+';color:'+fc+'">'+d+'</td>';
    });
    h+='<td class="heat-sum">'+r.wt+'</td></tr>';
  });
  tbl.innerHTML=h+'</tbody>';
}

function renderRecs(top,el){
  if(!top.length){el.innerHTML='<p class="rec-empty">Нарушений и рекомендаций не обнаружено.</p>';return;}
  var classMap={};
  top.forEach(function(t){t.classes.forEach(function(cl){if(!classMap[cl])classMap[cl]=[];classMap[cl].push(t);});});
  /* Group by parallel */
  var parallels={};
  Object.keys(classMap).forEach(function(cl){var g=cl.replace(/[^0-9]/g,'');if(!parallels[g])parallels[g]=[];parallels[g].push(cl);});
  var grades=Object.keys(parallels).sort(function(a,b){return parseInt(a)-parseInt(b);});
  grades.forEach(function(g){parallels[g].sort(function(a,b){return a.localeCompare(b,'ru');});});
  el.innerHTML=grades.map(function(grade){
    var cls=parallels[grade];
    var h='<div class="rec-parallel"><div class="rec-parallel__row">';
    cls.forEach(function(cl){
      var items=classMap[cl],vi=0,wa=0;
      items.forEach(function(t){if(t.st==='v')vi++;else wa++;});
      var cc=vi>0?'#ff453a':wa>0?'#ff9f0a':'#30d158';
      var meta=[];if(vi)meta.push(vi+' нар.');if(wa)meta.push(wa+' рек.');
      h+='<div class="rec-cls-card"><div class="rec-cls-card__hdr" onclick="this.parentNode.classList.toggle(\'rec-cls-card--open\')">';
      h+='<span class="rec-cls-card__name" style="color:'+cc+'">'+cl+'</span>';
      h+='<span class="rec-cls-card__meta">'+meta.join(' · ')+'</span>';
      h+='<span class="rec-cls-card__arrow">›</span></div>';
      h+='<div class="rec-cls-card__body">';
      items.forEach(function(t){
        var iv=t.st==='v';
        h+='<div class="rec-item'+(iv?' rec-item--v':'')+'"><div class="rec-item__head"><span class="rec-item__badge">'+t.id+'</span><span class="rec-item__name">'+t.nm+'</span></div><div class="rec-item__desc">'+t.ds+'</div>'+(t.sg?'<div class="rec-item__suggest">'+t.sg+'</div>':'')+'</div>';
      });
      h+='</div></div>';
    });
    h+='</div></div>';
    return h;
  }).join('');
}

function renderFixed(sch,cg,origAud,el){
  var vFixed=optSchedule(sch,cg,'soft');
  var aFixed=doAudit(vFixed,cg);
  function vc(v,base){return v<base?'color:#30d158':v>base?'color:#ff453a':'color:#86868b';}
  function vci(v,base){return v>base?'color:#30d158':v<base?'color:#ff453a':'color:#86868b';}
  var h='<div class="fix-header">';
  h+='<div class="fix-header__title">Исправленный вариант</div>';
  h+='<div class="fix-header__desc">Минимальное число перестановок уроков для устранения нарушений СанПиН</div>';
  h+='</div>';
  h+='<div class="fix-compare">';
  h+='<div class="fix-compare__row fix-compare__row--hdr"><span class="fix-compare__lbl"></span><span class="fix-compare__col">До</span><span class="fix-compare__arrow"></span><span class="fix-compare__col fix-compare__col--after">После</span></div>';
  [['Score',origAud.score,aFixed.score,true],['❌ Нарушений',origAud.vi.length,aFixed.vi.length,false],['⚠️ Рекомендаций',origAud.wa.length,aFixed.wa.length,false]].forEach(function(row){
    var ca=row[3]?vci(row[2],row[1]):vc(row[2],row[1]);
    h+='<div class="fix-compare__row"><span class="fix-compare__lbl">'+row[0]+'</span><span class="fix-compare__col fix-compare__col--before">'+row[1]+'</span><span class="fix-compare__arrow">→</span><span class="fix-compare__col fix-compare__col--after" style="'+ca+'">'+row[2]+'</span></div>';
  });
  h+='</div>';
  h+='<div class="fix-grid-wrap"><div class="acc-tbl-wrap"><table class="acc-grid-tbl" id="tFixedGrid"></table></div></div>';
  el.innerHTML=h;
  var tbl=document.getElementById('tFixedGrid');
  if(tbl)renderGrid(vFixed,cg,aFixed,tbl);
}

function renderPopup(items,el,col){
  if(!items.length){el.innerHTML='';return;}
  el.innerHTML=items.slice(0,8).map(function(t){
    return '<div class="pop-item"><span class="pop-item__badge" style="background:'+col+'22;color:'+col+'">'+t.id+'</span><div class="pop-item__body"><div class="pop-item__desc">'+t.ds+'</div>'+(t.sg?'<div class="pop-item__suggest">💡 '+t.sg+'</div>':'')+'</div></div>';
  }).join('')+(items.length>8?'<div class="pop-more">…и ещё '+(items.length-8)+'</div>':'');
}

function renderVars(sch,cg,origAud,el){
  var vA=optSchedule(sch,cg,'soft'),vB=optSchedule(sch,cg,'bell');
  var aA=doAudit(vA,cg),aB=doAudit(vB,cg),o=origAud;
  function vc(v,base){return v<base?'color:#30d158':v>base?'color:#ff453a':'color:#86868b';}
  function vci(v,base){return v>base?'color:#30d158':v<base?'color:#ff453a':'color:#86868b';}
  function badge(au){
    function ph(items,col,icon){
      if(!items.length)return '';
      return items.slice(0,10).map(function(t){return '<div class="var-popup__item"><span style="color:'+col+';font-weight:700">'+icon+' '+t.id+'</span> <span style="color:rgba(255,255,255,.7)">'+t.nm+'</span><div style="color:#86868b;font-size:.66rem">'+t.ds+'</div></div>';}).join('')+(items.length>10?'<div class="var-popup__more">...и ещё '+(items.length-10)+'</div>':'');
    }
    var parts=[];
    if(au.vi.length)parts.push('<span class="var-popup-wrap"><span style="color:#ff453a;font-weight:700">❌'+au.vi.length+'</span><div class="var-popup">'+ph(au.vi,'#ff453a','❌')+'</div></span>');
    if(au.wa.length)parts.push('<span class="var-popup-wrap"><span style="color:#ff9f0a;font-weight:700">⚠'+au.wa.length+'</span><div class="var-popup">'+ph(au.wa,'#ff9f0a','⚠')+'</div></span>');
    if(!au.vi.length&&!au.wa.length)parts.push('<span style="color:#30d158;font-weight:700">✓</span>');
    parts.push('<span>Score: '+au.score+'</span>');
    return parts.join(' ');
  }
  var h='<div class="var-compare">';
  h+='<div class="var-compare__hdr"><span class="var-compare__lbl"></span><span class="var-compare__col var-compare__col-hdr">Сейчас</span><span class="var-compare__arrow"></span><span class="var-compare__col var-compare__col-hdr var-compare__col-a">А</span><span class="var-compare__col var-compare__col-hdr var-compare__col-b">Б</span></div>';
  [['Score',o.score,aA.score,aB.score,true],['❌ Наруш.',o.vi.length,aA.vi.length,aB.vi.length,false],['⚠️ Рек.',o.wa.length,aA.wa.length,aB.wa.length,false]].forEach(function(row){
    var ca=row[4]?vci(row[2],row[1]):vc(row[2],row[1]),cb=row[4]?vci(row[3],row[1]):vc(row[3],row[1]);
    h+='<div class="var-compare__row"><span class="var-compare__lbl">'+row[0]+'</span><span class="var-compare__col var-compare__curr">'+row[1]+'</span><span class="var-compare__arrow">→</span><span class="var-compare__col var-compare__result" style="'+ca+'">'+row[2]+'</span><span class="var-compare__col var-compare__result" style="'+cb+'">'+row[3]+'</span></div>';
  });
  h+='</div>';
  h+='<div class="var-section"><div class="var-section__head"><span class="var-section__badge var-section__badge--a">Вариант А</span><span class="var-section__title">Мягкая оптимизация</span><span class="var-section__desc">— минимум перестановок</span><span class="var-section__badge-right">'+badge(aA)+'</span></div><div class="demo__tw"><table class="demo__tbl" id="tVA"></table></div></div>';
  h+='<div class="var-section"><div class="var-section__head"><span class="var-section__badge var-section__badge--b">Вариант Б</span><span class="var-section__title">Колокол трудности</span><span class="var-section__desc">— сложные на 2–4, лёгкие по краям</span><span class="var-section__badge-right">'+badge(aB)+'</span></div><div class="demo__tw"><table class="demo__tbl" id="tVB"></table></div></div>';
  el.innerHTML=h;
  renderGrid(vA,cg,aA,document.getElementById('tVA'));
  renderGrid(vB,cg,aB,document.getElementById('tVB'));
}

/* ═══ Показ дашборда (используется на обеих страницах с одинаковыми ID) ═══ */
function showDash(sch,cg){
  var a=doAudit(sch,cg);
  var upload=document.getElementById('demoUpload');if(upload)upload.style.display='none';
  var dash=document.getElementById('demoDash');if(dash)dash.style.display='block';
  var scoreEl=document.getElementById('scoreEl');if(scoreEl)scoreRing(a.score,scoreEl);
  var cntP=document.querySelector('#cntP .demo__cnt-v');if(cntP)cntP.textContent=a.passed;
  var cntW=document.querySelector('#cntW .demo__cnt-v');if(cntW)cntW.textContent=a.wa.length;
  var cntV=document.querySelector('#cntV .demo__cnt-v');if(cntV)cntV.textContent=a.vi.length;
  var popW=document.getElementById('popW');if(popW)renderPopup(a.wa,popW,'#ff9f0a');
  var popV=document.getElementById('popV');if(popV)renderPopup(a.vi,popV,'#ff453a');
  var tGrid=document.getElementById('tGrid');if(tGrid)renderGrid(sch,cg,a,tGrid);
  var tHeat=document.getElementById('tHeat');if(tHeat)renderHeat(sch,cg,a,tHeat);
  var elRecs=document.getElementById('elRecs');if(elRecs)renderRecs(a.top,elRecs);
  var elVars=document.getElementById('elVars');if(elVars)renderVars(sch,cg,a,elVars);
  if(dash){
    dash.querySelectorAll('.demo__tab').forEach(function(t){t.classList.remove('demo__tab--on');});
    var firstTab=dash.querySelector('.demo__tab[data-t="grid"]');if(firstTab)firstTab.classList.add('demo__tab--on');
    dash.querySelectorAll('.demo__pane').forEach(function(p){p.style.display='none';});
    var pGrid=document.getElementById('pGrid');if(pGrid)pGrid.style.display='block';
    dash.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
