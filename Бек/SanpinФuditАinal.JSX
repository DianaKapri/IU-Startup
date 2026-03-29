import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════
// SUBJECT MAPPING — full Russian names → short keys
// ═══════════════════════════════════════════════════════════════

const SF = {мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект',экон:'Экономика',родн:'Родной язык',черч:'Черчение'};

const NAME_TO_KEY = {};
// Build reverse map + common variations
const ALIASES = {
  мат:['математика','матем','матем.'],
  алг:['алгебра','алг','алг.','алгебра и начала','алгебра и начала математического анализа','алгебра и начала анализа'],
  гео:['геометрия','геом','геом.'],
  рус:['русский язык','русский','рус яз','рус.яз','рус.яз.','рус. яз.','рус. яз','русск','русск.'],
  лит:['литература','лит-ра','лит.','литературное чтение','лит. чтение'],
  ия:['английский язык','английский','англ яз','англ.яз','англ. яз.','англ. яз','иностранный язык','ин яз','ин.яз','ин. яз.','ин. яз','немецкий язык','немецкий','франц. яз','французский язык','испанский язык','китайский язык'],
  физ:['физика','физ.','физ'],
  хим:['химия','хим.','хим'],
  био:['биология','биол','биол.','биолог'],
  ист:['история','ист.','история россии','всеобщая история','истор'],
  общ:['обществознание','общество','общ.','обществ','обществозн'],
  геогр:['география','геогр','геогр.','географ'],
  инф:['информатика','информ','информ.','информатика и икт','инф.'],
  фк:['физкультура','физ-ра','физра','физ. культура','физическая культура','физ.культура','физ. к.'],
  изо:['изо','изобразительное искусство','рисование'],
  муз:['музыка','муз.','муз'],
  техн:['технология','техн.','техн','труд'],
  обж:['обж','основы безопасности жизнедеятельности','об.ж.','обж.'],
  астр:['астрономия','астрон','астр.'],
  однк:['однкнр','однк','основы духовно-нравственной','однкр'],
  мхк:['мхк','мировая художественная культура','искусство'],
  право:['право'],
  элект:['элективный','элективный курс','элект','элект.','факультатив','факультат'],
  проект:['проект','проектная деятельность','индивидуальный проект','инд. проект'],
  экон:['экономика','эконом'],
  родн:['родной язык','родной','родн. яз','родная литература','родн. лит'],
  черч:['черчение','черч.'],
};
for (const [key, names] of Object.entries(ALIASES)) {
  for (const name of names) NAME_TO_KEY[name.toLowerCase().trim()] = key;
}

function normalizeSubject(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const n = raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"".,;:!()\-–—\/\\]/g,'').replace(/\s+/g,' ').trim();
  if (!n) return '';
  // exact match
  if (NAME_TO_KEY[n]) return NAME_TO_KEY[n];
  // substring match
  for (const [name, key] of Object.entries(NAME_TO_KEY)) {
    if (n.includes(name) || name.includes(n)) return key;
  }
  // first word match
  const fw = n.split(' ')[0];
  if (fw.length >= 3) {
    for (const [name, key] of Object.entries(NAME_TO_KEY)) {
      if (name.startsWith(fw)) return key;
    }
  }
  return n.slice(0, 6); // fallback: use first 6 chars as key
}

// ═══════════════════════════════════════════════════════════════
// EXCEL PARSER
// ═══════════════════════════════════════════════════════════════

const DAY_NAMES = {
  'понедельник':'Пн','пн':'Пн','пон':'Пн',
  'вторник':'Вт','вт':'Вт','вто':'Вт',
  'среда':'Ср','ср':'Ср','сре':'Ср',
  'четверг':'Чт','чт':'Чт','чет':'Чт',
  'пятница':'Пт','пт':'Пт','пят':'Пт',
  'суббота':'Сб','сб':'Сб','суб':'Сб',
};

function parseDayName(raw) {
  if (!raw) return null;
  const n = String(raw).toLowerCase().trim();
  return DAY_NAMES[n] || null;
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data || data.length < 2) { reject('Пустой файл'); return; }
        const result = tryParseLong(data) || tryParseWide(data);
        if (!result) { reject('Не удалось распознать формат. Используйте формат: Класс | День | 1 | 2 | 3 | 4 | 5 | 6 | 7'); return; }
        resolve(result);
      } catch (err) { reject('Ошибка чтения файла: ' + err.message); }
    };
    reader.onerror = () => reject('Ошибка загрузки файла');
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Long format:
 * Класс | День | 1 | 2 | 3 | 4 | 5 | 6 | 7
 * 5А | Понедельник | Математика | Русский язык | ...
 */
function tryParseLong(data) {
  const header = data[0].map(h => String(h).toLowerCase().trim());
  // Check if we have Класс and День columns
  const classCol = header.findIndex(h => h.includes('класс') || h === 'class');
  const dayCol = header.findIndex(h => h.includes('день') || h === 'day' || parseDayName(h));
  if (classCol === -1) return null;

  const schedules = {};
  const classGrades = {};

  if (dayCol !== -1) {
    // Has day column — each row = one day for one class
    const lessonCols = [];
    for (let i = 0; i < header.length; i++) {
      if (i !== classCol && i !== dayCol) {
        const num = parseInt(header[i]);
        if (!isNaN(num) || header[i].includes('урок') || header[i].includes('lesson')) {
          lessonCols.push(i);
        }
      }
    }
    if (lessonCols.length === 0) {
      // If no numbered columns, take all columns after day
      for (let i = Math.max(classCol, dayCol) + 1; i < header.length; i++) lessonCols.push(i);
    }

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const cls = String(row[classCol] || '').trim();
      const day = parseDayName(row[dayCol]);
      if (!cls || !day) continue;

      if (!schedules[cls]) {
        schedules[cls] = { 'Пн': [], 'Вт': [], 'Ср': [], 'Чт': [], 'Пт': [] };
        const grade = parseInt(cls.replace(/[^0-9]/g, ''));
        classGrades[cls] = grade || 5;
      }
      const subjects = lessonCols.map(ci => normalizeSubject(String(row[ci] || '')));
      schedules[cls][day] = subjects;
    }
  } else {
    // No day column — try: each class has 5 consecutive rows (Mon-Fri)
    const lessonCols = [];
    for (let i = 0; i < header.length; i++) {
      if (i !== classCol) lessonCols.push(i);
    }
    const dayOrder = ['Пн','Вт','Ср','Чт','Пт'];
    let dayIdx = 0;
    let currentClass = '';
    for (let r = 1; r < data.length; r++) {
      const cls = String(data[r][classCol] || '').trim();
      if (cls && cls !== currentClass) {
        currentClass = cls;
        dayIdx = 0;
        schedules[cls] = { 'Пн': [], 'Вт': [], 'Ср': [], 'Чт': [], 'Пт': [] };
        const grade = parseInt(cls.replace(/[^0-9]/g, ''));
        classGrades[cls] = grade || 5;
      }
      if (currentClass && dayIdx < 5) {
        const subjects = lessonCols.map(ci => normalizeSubject(String(data[r][ci] || '')));
        schedules[currentClass][dayOrder[dayIdx]] = subjects;
        dayIdx++;
      }
    }
  }

  // Convert to array format
  return convertToArrayFormat(schedules, classGrades);
}

/**
 * Wide format: days as column groups
 * Класс | Пн_1 | Пн_2 | ... | Вт_1 | Вт_2 | ...
 */
function tryParseWide(data) {
  const header = data[0].map(h => String(h).toLowerCase().trim());
  const classCol = header.findIndex(h => h.includes('класс') || h === 'class' || h === '');

  // Try to find day groups in header
  const dayGroups = {};
  let currentDay = null;
  for (let i = 0; i < header.length; i++) {
    const day = parseDayName(header[i]);
    if (day) { currentDay = day; dayGroups[day] = []; }
    else if (currentDay) {
      dayGroups[currentDay].push(i);
    }
  }

  // Also check if second row has lesson numbers
  if (data.length >= 2) {
    const row2 = data[1].map(h => String(h).trim());
    let ci = 0;
    for (let i = 0; i < header.length; i++) {
      const day = parseDayName(header[i]);
      if (day) ci = 0;
      const num = parseInt(row2[i]);
      if (!isNaN(num) && num >= 1 && num <= 8) {
        if (currentDay && !dayGroups[currentDay]) dayGroups[currentDay] = [];
      }
    }
  }

  if (Object.keys(dayGroups).length < 3) return null;

  const schedules = {};
  const classGrades = {};
  const startRow = data.length >= 2 && !isNaN(parseInt(String(data[1][1]))) ? 2 : 1;

  for (let r = startRow; r < data.length; r++) {
    const row = data[r];
    const cls = String(row[classCol >= 0 ? classCol : 0] || '').trim();
    if (!cls || cls.length > 10) continue;

    const grade = parseInt(cls.replace(/[^0-9]/g, ''));
    if (isNaN(grade)) continue;

    schedules[cls] = {};
    classGrades[cls] = grade;

    for (const [day, cols] of Object.entries(dayGroups)) {
      schedules[cls][day] = cols.map(ci => normalizeSubject(String(row[ci] || '')));
    }
  }

  return convertToArrayFormat(schedules, classGrades);
}

function convertToArrayFormat(schedMap, classGrades) {
  const schedules = {};
  const cg = {};
  const dayOrder = ['Пн','Вт','Ср','Чт','Пт'];

  for (const [cls, dayMap] of Object.entries(schedMap)) {
    const maxLen = Math.max(...dayOrder.map(d => (dayMap[d] || []).length), 1);
    schedules[cls] = dayOrder.map(d => {
      const subs = dayMap[d] || [];
      while (subs.length < maxLen) subs.push('');
      return subs;
    });
    cg[cls] = classGrades[cls] || 5;
  }

  if (Object.keys(schedules).length === 0) return null;
  return { schedules, classGrades: cg };
}

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

const DEMO_SCH = {
  '5А':[['мат','рус','ия','ист','техн','фк'],['рус','мат','био','ия','геогр','изо'],['мат','лит','общ','муз','фк',''],['рус','ия','мат','лит','однк','техн'],['рус','мат','био','ист','инф','']],
  '5Б':[['рус','мат','лит','ия','изо','фк'],['мат','рус','ист','био','техн','муз'],['ия','мат','рус','геогр','фк',''],['мат','лит','ия','общ','однк','техн'],['рус','мат','био','инф','ист','']],
  '6А':[['рус','мат','ия','ист','геогр','техн'],['мат','рус','био','ия','общ','фк'],['мат','рус','лит','муз','изо','инф'],['ия','мат','рус','геогр','фк','техн'],['рус','мат','лит','ист','био','обж']],
  '7А':[['алг','рус','физ','ия','ист','геогр','фк'],['гео','рус','ия','био','общ','инф',''],['рус','алг','лит','физ','муз','техн',''],['ия','гео','рус','ист','обж','фк',''],['алг','рус','физ','лит','био','геогр','изо']],
  '8А':[['хим','алг','рус','физ','ия','ист','обж'],['алг','рус','хим','био','общ','инф','фк'],['рус','гео','ия','лит','геогр','техн',''],['физ','алг','рус','ист','ия','фк',''],['рус','гео','хим','лит','био','геогр','инф']],
  '9А':[['хим','алг','рус','физ','ист','ия','обж'],['алг','рус','гео','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','',''],['физ','алг','хим','ист','рус','ия','фк'],['рус','гео','лит','био','геогр','инф','']],
  '10А':[['алг','рус','физ','хим','ист','ия','обж'],['гео','алг','лит','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','астр',''],['хим','алг','рус','ист','ия','элект','фк'],['алг','рус','физ','лит','био','проект','инф']],
  '11А':[['алг','рус','хим','физ','ист','ия','обж'],['гео','алг','лит','био','общ','элект','фк'],['рус','физ','ия','астр','геогр','лит',''],['хим','алг','рус','ист','ия','инф','фк'],['алг','рус','физ','лит','право','проект','элект']],
};
const DEMO_CG = {'5А':5,'5Б':5,'6А':6,'7А':7,'8А':8,'9А':9,'10А':10,'11А':11};

// ═══════════════════════════════════════════════════════════════
// DIFFICULTY
// ═══════════════════════════════════════════════════════════════

const CC = {мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0',экон:'#a080c8',родн:'#5090d0',черч:'#90b0b0'};
const DS = ['Пн','Вт','Ср','Чт','Пт'];

const D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13,7:null,8:null,9:null},гео:{5:null,6:null,7:12,8:10,9:8},алг:{5:null,6:null,7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{5:null,6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1,8:null,9:null},муз:{5:2,6:1,7:1,8:1,9:null},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{5:null,6:null,7:8,8:5,9:5}};
const D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4};
const D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5,экон:5,родн:9,черч:5};

function gd(s,g){if(!s)return 0;if(g<=4)return D14[s]||5;if(g>=10)return D1011[s]||5;const e=D59[s];if(!e)return 5;const v=e[g];if(v!=null)return v;for(let d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}return 5;}

// ═══════════════════════════════════════════════════════════════
// AUDIT + OPTIMIZER (same as before)
// ═══════════════════════════════════════════════════════════════

const WMAX={5:29,6:30,7:32,8:33,9:33,10:34,11:34};
const DM={5:6,6:6,7:7,8:7,9:7,10:7,11:7};

function runAudit(sch,cg){
  const cr={};
  for(const[cls,days]of Object.entries(sch)){
    const g=cg[cls]||5,ch=[];
    const dt=days.map(d=>d.filter(s=>s).length);
    const wt=dt.reduce((a,b)=>a+b,0);
    const dd=days.map(d=>d.reduce((s,sub)=>s+gd(sub,g),0));
    const th=g<=4?7:8, wm=WMAX[g]||34, dm=DM[g]||7;
    if(wt>wm)ch.push({id:'C-02',name:'Недельная нагрузка',st:'violation',desc:`${cls}: ${wt} ч (макс. ${wm})`,sug:`Уберите ${wt-wm} ч`});
    days.forEach((d,di)=>{const c=d.filter(s=>s).length;if(c>dm)ch.push({id:'C-01',name:'Макс. уроков/день',st:'violation',desc:`${cls} ${DS[di]}: ${c} (макс. ${dm})`,sug:`Уберите ${c-dm} ур.`});});
    const ac=dt.filter(c=>c>0);
    if(ac.length>1&&Math.max(...ac)-Math.min(...ac)>1)ch.push({id:'C-03',name:'Равномерность',st:'violation',desc:`${cls}: разница ${Math.max(...ac)-Math.min(...ac)} (${dt.join('-')})`,sug:'Перераспределите'});
    const light=dd.map((d,i)=>({d,i})).filter(x=>x.d>0).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.i);
    if(dd.filter(d=>d>0).length>2&&!light.includes(2)&&!light.includes(3))ch.push({id:'E-02',name:'Облегчённый день',st:'violation',desc:`${cls}: лёгкие ${light.map(i=>DS[i]).join(', ')} — не Ср/Чт`,sug:'Разгрузите Ср или Чт'});
    let hp=0;const pd=[];
    days.forEach((d,di)=>{const ss=d.filter(s=>s);for(let i=0;i<ss.length-1;i++){if(gd(ss[i],g)>=th&&gd(ss[i+1],g)>=th){hp++;if(pd.length<2)pd.push(`${DS[di]}: ${SF[ss[i]]||ss[i]}→${SF[ss[i+1]]||ss[i+1]}`);}}});
    if(hp>0)ch.push({id:'D-01',name:'Сложные подряд',st:'warning',desc:`${cls}: ${hp} пар`,sug:'Вставьте лёгкий предмет'});
    let bs=0;
    days.forEach((d,di)=>{d.forEach((sub,li)=>{if(sub&&gd(sub,g)>=th&&(li<1||li>3))bs++;});});
    if(bs>0)ch.push({id:'E-01',name:'Сложные не на 2–4',st:'warning',desc:`${cls}: ${bs} случ.`,sug:'Переместите на 2–4'});
    cr[cls]={ch,dd,wt,dt};
  }
  const all=Object.entries(cr).flatMap(([c,r])=>r.ch.map(x=>({...x,cls:c})));
  const vi=all.filter(c=>c.st==='violation'),wa=all.filter(c=>c.st==='warning');
  const byR={};all.forEach(c=>{if(!byR[c.id])byR[c.id]={...c,classes:[]};byR[c.id].classes.push(c.cls);});
  const top=Object.values(byR).sort((a,b)=>(a.st==='violation'?0:2)+(a.classes.length>1?0:1)-((b.st==='violation'?0:2)+(b.classes.length>1?0:1))).slice(0,6);
  const tot=Object.values(cr).reduce((s,r)=>s+5+r.ch.length,0);
  return{cr,vi,wa,top,all,score:Math.round((tot-vi.length-wa.length)/tot*100),passed:tot-vi.length-wa.length};
}

function cloneS(o){return JSON.parse(JSON.stringify(o));}

function optimize(sch,cg,mode){
  const f=cloneS(sch);
  for(const[cls,days]of Object.entries(f)){
    const g=cg[cls]||5,th=g<=4?7:8;
    if(mode==='soft'){
      for(let p=0;p<3;p++){days.forEach(d=>{
        if(d.filter(s=>s).length<3)return;
        if(d[0]&&gd(d[0],g)>=th){for(let j=1;j<=3&&j<d.length;j++){if(d[j]&&gd(d[j],g)<th){[d[0],d[j]]=[d[j],d[0]];break;}}}
        for(let i=4;i<d.length;i++){if(d[i]&&gd(d[i],g)>=th){for(let j=1;j<=3;j++){if(d[j]&&gd(d[j],g)<th){[d[i],d[j]]=[d[j],d[i]];break;}}}}
        for(let i=0;i<d.length-1;i++){if(d[i]&&d[i+1]&&gd(d[i],g)>=th&&gd(d[i+1],g)>=th){for(let j=i+2;j<d.length;j++){if(d[j]&&gd(d[j],g)<th){[d[i+1],d[j]]=[d[j],d[i+1]];break;}}}}
      });}
    } else {
      days.forEach(d=>{
        const subs=d.map((s,i)=>({s,i})).filter(x=>x.s);
        if(subs.length<4)return;
        const scored=subs.map(x=>({s:x.s,d:gd(x.s,g)})).sort((a,b)=>b.d-a.d);
        const n=scored.length,res=new Array(n);
        const best=[1,2,3].filter(i=>i<n);
        const edge=Array.from({length:n},(_,i)=>i).filter(i=>!best.includes(i));
        best.forEach((sl,idx)=>{if(idx<scored.length)res[sl]=scored[idx];});
        edge.forEach((sl,idx)=>{const si=best.length+idx;if(si<scored.length)res[sl]=scored[si];});
        let ri=0;for(let i=0;i<d.length;i++){if(d[i]){d[i]=res[ri]?res[ri].s:d[i];ri++;}}
      });
    }
    for(let att=0;att<3;att++){
      const dd=days.map(d=>d.reduce((s,sub)=>s+gd(sub,g),0));
      const active=dd.map((d,i)=>({d,i})).filter(x=>x.d>0).sort((a,b)=>a.d-b.d);
      const tl=active.slice(0,2).map(x=>x.i);
      if(tl.includes(2)||tl.includes(3))break;
      const tgt=2,pi=dd.reduce((mi,v,i)=>i!==tgt&&v>dd[mi]?i:mi,0);
      const ts=days[tgt].map((s,i)=>({s,i,d:gd(s,g)})).filter(x=>x.s).sort((a,b)=>b.d-a.d);
      const ps=days[pi].map((s,i)=>({s,i,d:gd(s,g)})).filter(x=>x.s).sort((a,b)=>a.d-b.d);
      if(ts.length&&ps.length&&ts[0].d>ps[0].d){days[tgt][ts[0].i]=ps[0].s;days[pi][ps[0].i]=ts[0].s;}else break;
    }
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ScoreRing({score,size=66}){
  const r=size*0.38,c=2*Math.PI*r,off=c-(score/100)*c;
  const col=score>=90?'#22c55e':score>=70?'#eab308':'#ef4444';
  return(<div style={{position:'relative',width:size,height:size}}>
    <svg viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={size*0.06}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={size*0.06} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/>
    </svg>
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
      <span style={{fontSize:size*0.3,fontWeight:800,color:col,lineHeight:1}}>{score}</span>
      <span style={{fontSize:size*0.09,color:'#64748b'}}>/ 100</span>
    </div>
  </div>);
}

function CounterBadge({icon,value,label,color,items}){
  const[hover,setHover]=useState(false);
  return(<div style={{position:'relative'}} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <div style={{textAlign:'center',padding:'5px 12px',borderRadius:8,background:'#0f172a',border:`1px solid ${hover?color:`${color}33`}`,cursor:'default',transition:'border-color 0.2s'}}>
      <div style={{fontSize:20,fontWeight:800,color}}>{value}</div>
      <div style={{fontSize:8,color:'#64748b'}}>{icon} {label}</div>
    </div>
    {hover&&items&&items.length>0&&(
      <div style={{position:'absolute',top:'100%',right:0,marginTop:6,zIndex:50,background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 12px',minWidth:260,maxWidth:340,maxHeight:300,overflowY:'auto',boxShadow:'0 12px 40px rgba(0,0,0,0.7)',fontSize:11,color:'#e2e8f0'}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:6,color}}>{icon} {label}: {value}</div>
        {items.slice(0,10).map((item,i)=>(
          <div key={i} style={{padding:'4px 0',borderBottom:i<Math.min(items.length,10)-1?'1px solid #1e293b':'none',display:'flex',gap:5}}>
            <span style={{background:`${color}22`,color,fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:4,flexShrink:0}}>{item.id}</span>
            <div><div style={{color:'#cbd5e1',lineHeight:1.3}}>{item.desc}</div>{item.sug&&<div style={{color:'#22d3ee',fontSize:10,marginTop:1}}>💡 {item.sug}</div>}</div>
          </div>
        ))}
        {items.length>10&&<div style={{color:'#475569',fontSize:10,marginTop:4}}>…и ещё {items.length-10}</div>}
      </div>
    )}
  </div>);
}

function TipBox({info,x,y}){
  if(!info)return null;
  const{subj,grade,score,thresh,flags,lessonIdx,prevSubj,prevDiff}=info;
  const table=grade<=4?'6.9':grade<=9?'6.10':'6.11';
  const level=score>=10?'Очень сложный':score>=thresh?'Сложный':score>=5?'Средний':'Лёгкий';
  const left=typeof window!=='undefined'?Math.min(x+14,window.innerWidth-320):x+14;
  return(<div style={{position:'fixed',left,top:y-8,zIndex:100,background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 14px',maxWidth:310,fontSize:12,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',pointerEvents:'none',color:'#e2e8f0',lineHeight:1.5}}>
    <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{SF[subj]||subj}</div>
    <div style={{display:'flex',gap:14,marginBottom:6}}>
      <div><div style={{color:'#64748b',fontSize:9}}>Балл</div><div style={{fontSize:20,fontWeight:800,color:score>=thresh?'#ef4444':score>=5?'#eab308':'#22c55e'}}>{score}</div></div>
      <div><div style={{color:'#64748b',fontSize:9}}>Уровень</div><div style={{fontWeight:600,color:score>=10?'#ef4444':score>=thresh?'#eab308':'#94a3b8'}}>{level}</div></div>
      <div><div style={{color:'#64748b',fontSize:9}}>Табл.</div><div style={{color:'#94a3b8'}}>{table}</div></div>
    </div>
    <div style={{fontSize:9,color:'#475569',marginBottom:5}}>СанПиН 1.2.3685-21 • {grade} кл. • порог ≥ {thresh}</div>
    {flags.badSlot&&<div style={{background:'#ef444418',border:'1px solid #ef444444',borderRadius:6,padding:'4px 8px',marginBottom:3,fontSize:11}}><span style={{color:'#ef4444',fontWeight:600}}>⚠ </span><span style={{color:'#fca5a5'}}>Балл {score} на {lessonIdx+1}-м уроке — нужно 2–4</span></div>}
    {flags.hardPair&&<div style={{background:'#ef444418',border:'1px solid #ef444444',borderRadius:6,padding:'4px 8px',marginBottom:3,fontSize:11}}><span style={{color:'#ef4444',fontWeight:600}}>⚠ </span><span style={{color:'#fca5a5'}}>{SF[prevSubj]||prevSubj} ({prevDiff}) → {SF[subj]||subj} ({score}) подряд</span></div>}
    {!flags.badSlot&&!flags.hardPair&&<div style={{background:'#22c55e18',border:'1px solid #22c55e44',borderRadius:6,padding:'4px 8px',fontSize:11}}><span style={{color:'#22c55e'}}>✓ {score>=thresh?`Сложный на ${lessonIdx+1}-м — оптимально`:'Нарушений нет'}</span></div>}
  </div>);
}

function Grid({scheds,cg,aud,compact}){
  const[tip,setTip]=useState(null);
  const[mp,setMp]=useState({x:0,y:0});
  const cls=Object.keys(scheds);
  const ml=Math.max(...cls.map(c=>Math.max(...scheds[c].map(d=>d.length))),6);
  const ths={padding:'4px 2px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:compact?8:10};
  const tds={padding:0,background:'#0a0e17',verticalAlign:'middle'};
  return(<div style={{position:'relative'}}>
    <div style={{overflowX:'auto',borderRadius:8,border:'1px solid #1e293b'}}>
      <table style={{borderCollapse:'collapse',width:'100%',minWidth:compact?600:800}}>
        <thead>
          <tr><th style={{...ths,width:38,position:'sticky',left:0,zIndex:3,background:'#0f172a'}}></th>
            {DS.map((d,i)=><th key={i} colSpan={ml} style={{...ths,borderLeft:'2px solid #334155'}}>{d}</th>)}</tr>
          <tr><th style={{...ths,position:'sticky',left:0,zIndex:3,background:'#0f172a'}}></th>
            {DS.map((_,di)=>Array.from({length:ml},(_2,li)=><th key={`h${di}-${li}`} style={{...ths,width:compact?26:34,fontSize:7,color:'#475569',borderLeft:li===0?'2px solid #334155':'1px solid #1e293b'}}>{li+1}</th>))}</tr>
        </thead>
        <tbody>
          {cls.map(cl=>{const g=cg[cl]||5,days=scheds[cl],hasV=aud?.cr?.[cl]?.ch?.some(c=>c.st==='violation');
            return(<tr key={cl}>
              <td style={{...tds,position:'sticky',left:0,zIndex:2,background:'#0f172a',fontWeight:700,fontSize:10,padding:'0 3px',color:hasV?'#ef4444':'#e2e8f0',borderBottom:'1px solid #1e293b'}}>{cl}</td>
              {days.map((daySubs,di)=>Array.from({length:ml},(_,li)=>{
                const subj=daySubs[li]||'';
                if(!subj)return <td key={`${di}-${li}`} style={{...tds,borderLeft:li===0?'2px solid #334155':'1px solid #0a0e17',borderBottom:'1px solid #1e293b',padding:1}}></td>;
                const diff=gd(subj,g),thresh=g<=4?7:8;
                const badSlot=diff>=thresh&&(li<1||li>3);
                const hardPair=li>0&&daySubs[li-1]&&diff>=thresh&&gd(daySubs[li-1],g)>=thresh;
                const problem=badSlot||hardPair;
                const bg=CC[subj]||'#666';
                return(<td key={`${di}-${li}`}
                  onMouseEnter={e=>{let pS=null,pD=0;if(hardPair){pS=daySubs[li-1];pD=gd(pS,g);}setTip({subj,grade:g,score:diff,thresh,flags:{badSlot,hardPair},lessonIdx:li,prevSubj:pS,prevDiff:pD});setMp({x:e.clientX,y:e.clientY});}}
                  onMouseMove={e=>setMp({x:e.clientX,y:e.clientY})} onMouseLeave={()=>setTip(null)}
                  style={{...tds,borderLeft:li===0?'2px solid #334155':'1px solid #0a0e17',borderBottom:'1px solid #1e293b',padding:1,cursor:'default'}}>
                  <div style={{background:problem?bg:bg+'cc',color:'#fff',borderRadius:3,padding:'2px 1px',textAlign:'center',fontSize:compact?8:10,fontWeight:600,lineHeight:1.1,minHeight:compact?15:20,border:problem?'2px solid #ef4444':`1px solid ${bg}50`,textShadow:'0 1px 2px rgba(0,0,0,0.6)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <span>{subj}</span><span style={{fontSize:compact?5:7,opacity:0.6}}>{diff}</span>
                  </div>
                </td>);
              }))}
            </tr>);
          })}
        </tbody>
      </table>
    </div>
    <TipBox info={tip} x={mp.x} y={mp.y}/>
  </div>);
}

function HeatMap({aud}){
  const ths2={padding:'4px 6px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:10};
  return(<div style={{overflowX:'auto',borderRadius:8,border:'1px solid #1e293b'}}>
    <table style={{borderCollapse:'collapse',width:'100%',minWidth:380}}>
      <thead><tr><th style={{...ths2,width:48}}>Класс</th>{DS.map((d,i)=><th key={i} style={ths2}>{d}</th>)}<th style={ths2}>Σ</th></tr></thead>
      <tbody>{Object.entries(aud.cr).map(([cls,res])=>{
        const mx=Math.max(...res.dd),mn=Math.min(...res.dd.filter(d=>d>0));
        return(<tr key={cls}><td style={{padding:'4px 6px',background:'#0a0e17',fontWeight:700,color:'#e2e8f0',fontSize:11,borderBottom:'1px solid #1e293b'}}>{cls}</td>
          {res.dd.map((d,i)=>{const isL=d===mn&&d>0,isP=d===mx;return <td key={i} style={{padding:'4px 8px',textAlign:'center',background:isL?'#22c55e18':isP?'#ef444418':'#0a0e17',borderBottom:'1px solid #1e293b'}}><span style={{fontWeight:700,color:isL?'#22c55e':isP?'#ef4444':'#94a3b8'}}>{d}</span></td>;})}
          <td style={{padding:'4px 8px',textAlign:'center',fontWeight:600,color:'#64748b',background:'#0a0e17',borderBottom:'1px solid #1e293b'}}>{res.wt}</td></tr>);
      })}</tbody>
    </table>
  </div>);
}

function Recs({aud}){
  return(<div style={{display:'flex',flexDirection:'column',gap:7}}>
    {aud.top.map((iss,i)=>{const isV=iss.st==='violation';
      return(<div key={i} style={{background:isV?'#1c1117':'#1a1810',border:`1px solid ${isV?'#ef444433':'#eab30833'}`,borderRadius:10,padding:'10px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
          <span style={{background:isV?'#ef4444':'#eab308',color:'#000',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5}}>{isV?'❌':'⚠️'} {iss.id}</span>
          <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>{iss.name}</span>
          <span style={{fontSize:10,color:'#64748b',marginLeft:'auto'}}>{iss.classes.length>4?`${iss.classes.slice(0,3).join(', ')} +${iss.classes.length-3}`:iss.classes.join(', ')}</span>
        </div>
        <p style={{fontSize:11,color:'#cbd5e1',margin:'0 0 2px',lineHeight:1.4}}>{iss.desc}</p>
        {iss.sug&&<p style={{fontSize:11,color:'#22d3ee',margin:0}}>💡 {iss.sug}</p>}
      </div>);
    })}
  </div>);
}

function CompareTab({sch,cg}){
  const orig=useMemo(()=>runAudit(sch,cg),[sch,cg]);
  const vA=useMemo(()=>optimize(sch,cg,'soft'),[sch,cg]);
  const vB=useMemo(()=>optimize(sch,cg,'bell'),[sch,cg]);
  const aA=useMemo(()=>runAudit(vA,cg),[vA,cg]);
  const aB=useMemo(()=>runAudit(vB,cg),[vB,cg]);
  function Row({l,o,a,b}){return(<div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,marginBottom:2}}>
    <span style={{width:80,color:'#64748b',textAlign:'right',fontSize:10}}>{l}</span>
    <span style={{width:40,textAlign:'center',color:'#94a3b8',background:'#1e293b',borderRadius:4,padding:'2px 4px'}}>{o}</span>
    <span style={{color:'#334155',fontSize:10}}>→</span>
    <span style={{width:40,textAlign:'center',fontWeight:700,color:a<o?'#22c55e':a>o?'#ef4444':'#94a3b8',background:'#0f172a',border:`1px solid ${a<o?'#22c55e33':'#1e293b'}`,borderRadius:4,padding:'2px 4px'}}>{a}</span>
    <span style={{width:40,textAlign:'center',fontWeight:700,color:b<o?'#22c55e':b>o?'#ef4444':'#94a3b8',background:'#0f172a',border:`1px solid ${b<o?'#22c55e33':'#1e293b'}`,borderRadius:4,padding:'2px 4px'}}>{b}</span>
  </div>);}
  return(<div>
    <div style={{background:'#0f172a',borderRadius:10,border:'1px solid #1e293b',padding:10,marginBottom:12}}>
      <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,marginBottom:5,color:'#475569'}}><span style={{width:80,textAlign:'right'}}></span><span style={{width:40,textAlign:'center',fontWeight:700}}>Исход.</span><span style={{width:14}}></span><span style={{width:40,textAlign:'center',fontWeight:700,color:'#60a5fa'}}>А</span><span style={{width:40,textAlign:'center',fontWeight:700,color:'#a78bfa'}}>Б</span></div>
      <Row l="Score" o={orig.score} a={aA.score} b={aB.score}/><Row l="❌ Наруш." o={orig.vi.length} a={aA.vi.length} b={aB.vi.length}/><Row l="⚠️ Рекоменд." o={orig.wa.length} a={aA.wa.length} b={aB.wa.length}/>
    </div>
    <div style={{marginBottom:14}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
        <span style={{background:'#1d4ed8',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:5}}>А</span>
        <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>Мягкая</span><span style={{fontSize:10,color:'#64748b'}}>— минимум перестановок</span>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}><ScoreRing score={aA.score} size={36}/><div style={{fontSize:8,color:'#64748b'}}>❌{aA.vi.length} ⚠️{aA.wa.length}</div></div>
      </div>
      <Grid scheds={vA} cg={cg} aud={aA} compact/>
    </div>
    <div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
        <span style={{background:'#7c3aed',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:5}}>Б</span>
        <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>Колокол</span><span style={{fontSize:10,color:'#64748b'}}>— сложные на 2–4, лёгкие по краям</span>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}><ScoreRing score={aB.score} size={36}/><div style={{fontSize:8,color:'#64748b'}}>❌{aB.vi.length} ⚠️{aB.wa.length}</div></div>
      </div>
      <Grid scheds={vB} cg={cg} aud={aB} compact/>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD ZONE
// ═══════════════════════════════════════════════════════════════

function UploadZone({ onData, onError, hasData }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await parseExcel(file);
      onData(result);
    } catch (err) {
      onError(typeof err === 'string' ? err : err.message);
    }
    setLoading(false);
  }, [onData, onError]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragging ? '#22d3ee' : '#334155'}`,
        borderRadius: 12, padding: hasData ? '10px 16px' : '24px 16px',
        textAlign: 'center', cursor: 'pointer',
        background: dragging ? '#22d3ee08' : '#0f172a',
        transition: 'all 0.2s',
        marginBottom: 12,
      }}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = (e) => handleFile(e.target.files[0]);
        input.click();
      }}
    >
      {loading ? (
        <div style={{ color: '#22d3ee', fontSize: 13 }}>⏳ Загрузка...</div>
      ) : hasData ? (
        <div style={{ color: '#64748b', fontSize: 11 }}>
          📎 Нажмите или перетащите новый файл для замены
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 32, marginBottom: 6 }}>📄</div>
          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Загрузите расписание
          </div>
          <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5 }}>
            Перетащите .xlsx / .xls файл сюда или нажмите для выбора
          </div>
          <div style={{ color: '#475569', fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
            Формат: <b>Класс | День | 1 | 2 | 3 | 4 | 5 | 6 | 7</b><br/>
            Каждая строка — один день одного класса. Названия предметов на русском.<br/>
            <span style={{ color: '#22d3ee', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); }}>
              Или нажмите «Демо» ниже для примера
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [schedData, setSchedData] = useState(null); // {schedules, classGrades}
  const [error, setError] = useState('');
  const [tab, setTab] = useState('grid');
  const [fileName, setFileName] = useState('');

  const sch = schedData?.schedules || DEMO_SCH;
  const cg = schedData?.classGrades || DEMO_CG;
  const isDemo = !schedData;
  const aud = useMemo(() => runAudit(sch, cg), [sch, cg]);
  const classCount = Object.keys(sch).length;

  const handleData = useCallback((result) => {
    setSchedData(result);
    setError('');
    setTab('grid');
  }, []);

  const handleError = useCallback((msg) => {
    setError(msg);
    setSchedData(null);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: '#0a0e17', color: '#e2e8f0', minHeight: '100vh', padding: '14px 10px' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* UPLOAD */}
      <UploadZone onData={handleData} onError={handleError} hasData={!!schedData} />

      {error && (
        <div style={{ background: '#1c1117', border: '1px solid #ef444444', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#fca5a5' }}>
          ❌ {error}
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <ScoreRing score={aud.score} size={66} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
            <span style={{ color: '#22d3ee' }}>СанПиН</span>-аудит
          </h1>
          <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>
            {classCount} классов • {isDemo ? 'демо-данные' : 'загруженное расписание'} • v3.0
          </p>
          {isDemo && (
            <button onClick={() => { setSchedData(null); setError(''); }}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '2px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 10, marginTop: 3 }}>
              📋 Демо-данные
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <CounterBadge icon="✅" value={aud.passed} label="прош." color="#22c55e" items={null} />
          <CounterBadge icon="⚠️" value={aud.wa.length} label="рек." color="#eab308" items={aud.wa} />
          <CounterBadge icon="❌" value={aud.vi.length} label="нар." color="#ef4444" items={aud.vi} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 8, overflowX: 'auto' }}>
        {[['grid', '📅 Сетка'], ['heat', '🌡️ Трудность'], ['recs', '📋 Проблемы'], ['compare', '🔄 Варианты']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? '#1e293b' : 'transparent', color: tab === id ? '#e2e8f0' : '#64748b', border: 'none', padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</button>
        ))}
      </div>

      {/* CONTENT */}
      {tab === 'grid' && <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 8, color: '#94a3b8', marginBottom: 5 }}>
          {[{ l: 'Мат.', c: '#e06070' }, { l: 'Рус.', c: '#5090d0' }, { l: 'Ин.яз', c: '#40b0a0' }, { l: 'Ест.', c: '#d08040' }, { l: 'Общ.', c: '#9070c0' }, { l: 'ФК', c: '#80c8a0' }, { l: 'Инф.', c: '#e09030' }].map((c, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: c.c }} /><span>{c.l}</span></div>)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><div style={{ width: 7, height: 7, borderRadius: 2, border: '2px solid #ef4444' }} /><span style={{ color: '#ef4444' }}>Нарушение</span></div>
          <span style={{ color: '#475569' }}>• Наведите для подробностей</span>
        </div>
        <Grid scheds={sch} cg={cg} aud={aud} />
      </div>}
      {tab === 'heat' && <div><p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 5px' }}><span style={{ color: '#22c55e' }}>■</span> облегчённый <span style={{ color: '#ef4444' }}>■</span> пик — облегчённый должен быть Ср или Чт.</p><HeatMap aud={aud} /></div>}
      {tab === 'recs' && <Recs aud={aud} />}
      {tab === 'compare' && <CompareTab sch={sch} cg={cg} />}
    </div>
  );
}
