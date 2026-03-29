import { useState, useMemo } from "react";

const SF = {мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект'};

const SCH = {
  '5А':[['мат','рус','ия','ист','техн','фк'],['рус','мат','био','ия','геогр','изо'],['мат','лит','общ','муз','фк',''],['рус','ия','мат','лит','однк','техн'],['рус','мат','био','ист','инф','']],
  '5Б':[['рус','мат','лит','ия','изо','фк'],['мат','рус','ист','био','техн','муз'],['ия','мат','рус','геогр','фк',''],['мат','лит','ия','общ','однк','техн'],['рус','мат','био','инф','ист','']],
  '6А':[['рус','мат','ия','ист','геогр','техн'],['мат','рус','био','ия','общ','фк'],['мат','рус','лит','муз','изо','инф'],['ия','мат','рус','геогр','фк','техн'],['рус','мат','лит','ист','био','обж']],
  '6Б':[['мат','рус','ия','общ','техн','фк'],['рус','мат','ист','био','геогр','муз'],['мат','ия','рус','лит','инф','изо'],['рус','мат','ия','ист','фк','техн'],['мат','рус','лит','геогр','био','обж']],
  '7А':[['алг','рус','физ','ия','ист','геогр','фк'],['гео','рус','ия','био','общ','инф',''],['рус','алг','лит','физ','муз','техн',''],['ия','гео','рус','ист','обж','фк',''],['алг','рус','физ','лит','био','геогр','изо']],
  '7Б':[['рус','алг','ия','физ','геогр','фк',''],['алг','рус','гео','био','ист','муз','техн'],['физ','ия','рус','общ','лит','инф',''],['рус','гео','алг','ист','обж','изо',''],['ия','рус','физ','алг','лит','био','фк']],
  '8А':[['хим','алг','рус','физ','ия','ист','обж'],['алг','рус','хим','био','общ','инф','фк'],['рус','гео','ия','лит','геогр','техн',''],['физ','алг','рус','ист','ия','фк',''],['рус','гео','хим','лит','био','геогр','инф']],
  '9А':[['хим','алг','рус','физ','ист','ия','обж'],['алг','рус','гео','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','',''],['физ','алг','хим','ист','рус','ия','фк'],['рус','гео','лит','био','геогр','инф','']],
  '10А':[['алг','рус','физ','хим','ист','ия','обж'],['гео','алг','лит','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','астр',''],['хим','алг','рус','ист','ия','элект','фк'],['алг','рус','физ','лит','био','проект','инф']],
  '11А':[['алг','рус','хим','физ','ист','ия','обж'],['гео','алг','лит','био','общ','элект','фк'],['рус','физ','ия','астр','геогр','лит',''],['хим','алг','рус','ист','ия','инф','фк'],['алг','рус','физ','лит','право','проект','элект']],
};

const DS=['Пн','Вт','Ср','Чт','Пт'];
const CG={'5А':5,'5Б':5,'6А':6,'6Б':6,'7А':7,'7Б':7,'8А':8,'9А':9,'10А':10,'11А':11};
const CC={мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0'};

const D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13,7:null,8:null,9:null},гео:{5:null,6:null,7:12,8:10,9:8},алг:{5:null,6:null,7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{5:null,6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1,8:null,9:null},муз:{5:2,6:1,7:1,8:1,9:null},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{5:null,6:null,7:8,8:5,9:5}};
const D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4};
const D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};

function gd(s,g){if(!s)return 0;if(g<=4)return D14[s]||5;if(g>=10)return D1011[s]||5;const e=D59[s];if(!e)return 5;const v=e[g];if(v!=null)return v;for(let d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}return 5;}

const WMAX={5:29,6:30,7:32,8:33,9:33,10:34,11:34};
const DMAX_T={5:6,6:6,7:7,8:7,9:7,10:7,11:7};

function runAudit(sch,cg){
  const cr={};
  for(const[cls,days]of Object.entries(sch)){
    const g=cg[cls],ch=[];
    const dt=days.map(d=>d.filter(s=>s).length);
    const wt=dt.reduce((a,b)=>a+b,0);
    const dd=days.map(d=>d.reduce((s,sub)=>s+gd(sub,g),0));
    const th=g<=4?7:8;
    const wm=WMAX[g]||34;
    if(wt>wm)ch.push({id:'C-02',name:'Недельная нагрузка',st:'violation',desc:`${cls}: ${wt} ч (макс. ${wm})`,sug:`Уберите ${wt-wm} ч`});
    const dm=DMAX_T[g]||7;
    days.forEach((d,di)=>{const c=d.filter(s=>s).length;if(c>dm)ch.push({id:'C-01',name:'Макс. уроков/день',st:'violation',desc:`${cls} ${DS[di]}: ${c} ур. (макс. ${dm})`,sug:`Уберите ${c-dm} ур.`});});
    const ac=dt.filter(c=>c>0);
    if(ac.length>1&&Math.max(...ac)-Math.min(...ac)>1)ch.push({id:'C-03',name:'Равномерность',st:'violation',desc:`${cls}: разница ${Math.max(...ac)-Math.min(...ac)} (${dt.join('-')})`,sug:'Перераспределите уроки'});
    const light=dd.map((d,i)=>({d,i})).filter(x=>x.d>0).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.i);
    if(!light.includes(2)&&!light.includes(3))ch.push({id:'E-02',name:'Облегчённый день',st:'violation',desc:`${cls}: лёгкие дни ${light.map(i=>DS[i]).join(', ')} — не Ср/Чт`,sug:'Разгрузите Ср или Чт'});
    let hp=0;const pd=[];
    days.forEach((d,di)=>{const ss=d.filter(s=>s);for(let i=0;i<ss.length-1;i++){if(gd(ss[i],g)>=th&&gd(ss[i+1],g)>=th){hp++;if(pd.length<2)pd.push(`${DS[di]}: ${SF[ss[i]]||ss[i]}→${SF[ss[i+1]]||ss[i+1]}`);}}});
    if(hp>0)ch.push({id:'D-01',name:'Сложные подряд',st:'warning',desc:`${cls}: ${hp} пар (${pd.join('; ')}${hp>2?'...':''})`,sug:'Вставьте лёгкий предмет'});
    let bs=0;const sd2=[];
    days.forEach((d,di)=>{d.forEach((sub,li)=>{if(sub&&gd(sub,g)>=th&&(li<1||li>3)){bs++;if(sd2.length<2)sd2.push(`${DS[di]}: ${SF[sub]||sub} ${li+1}-й`);}});});
    if(bs>0)ch.push({id:'E-01',name:'Сложные не на 2–4',st:'warning',desc:`${cls}: ${bs} случ. (${sd2.join('; ')}${bs>2?'...':''})`,sug:'Переместите на 2–4'});
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

// ═══════════════════════════════════════════════════════════════
// SMART OPTIMIZER — targets 0 violations, 0 warnings
// ═══════════════════════════════════════════════════════════════

function optimizeSmart(sch, cg, strategy) {
  const f = cloneS(sch);
  for (const [cls, days] of Object.entries(f)) {
    const g = cg[cls];
    const th = g <= 4 ? 7 : 8;

    if (strategy === 'soft') {
      // Strategy A: minimal swaps — fix slot violations and pairs
      for (let pass = 0; pass < 3; pass++) {
        days.forEach(d => {
          const subs = d.filter(s => s);
          if (subs.length < 3) return;
          // Fix hard subject on slot 0: swap with first light in slots 1-3
          if (d[0] && gd(d[0], g) >= th) {
            for (let j = 1; j <= 3 && j < d.length; j++) {
              if (d[j] && gd(d[j], g) < th) { [d[0], d[j]] = [d[j], d[0]]; break; }
            }
          }
          // Fix hard subject on last slots: swap with light in slots 1-3
          for (let i = 4; i < d.length; i++) {
            if (d[i] && gd(d[i], g) >= th) {
              for (let j = 1; j <= 3; j++) {
                if (d[j] && gd(d[j], g) < th) { [d[i], d[j]] = [d[j], d[i]]; break; }
              }
            }
          }
          // Break consecutive hard pairs
          for (let i = 0; i < d.length - 1; i++) {
            if (d[i] && d[i + 1] && gd(d[i], g) >= th && gd(d[i + 1], g) >= th) {
              // Find nearest light to insert between
              for (let j = i + 2; j < d.length; j++) {
                if (d[j] && gd(d[j], g) < th) { [d[i + 1], d[j]] = [d[j], d[i + 1]]; break; }
              }
            }
          }
        });
      }
    } else {
      // Strategy B: bell-curve sort — hard in center, light at edges
      days.forEach(d => {
        const subs = d.map((s, i) => ({ s, i })).filter(x => x.s);
        if (subs.length < 4) return;
        const scored = subs.map(x => ({ s: x.s, d: gd(x.s, g) })).sort((a, b) => b.d - a.d);
        // Place in bell: hardest at center positions
        const n = scored.length;
        const result = new Array(n);
        const center = Math.floor(n / 2);
        const positions = [center];
        for (let k = 1; k < n; k++) {
          if (center - k >= 0) positions.push(center - k);
          if (center + k < n) positions.push(center + k);
        }
        // But also ensure positions 1,2,3 (0-indexed) get the hardest
        const idealOrder = [];
        // Slots 1,2,3 (0-indexed) = best for hard subjects
        const bestSlots = [1, 2, 3].filter(i => i < n);
        const edgeSlots = Array.from({ length: n }, (_, i) => i).filter(i => !bestSlots.includes(i));
        // Hard subjects → best slots, light → edges
        const sortedByDiff = [...scored]; // already sorted desc
        bestSlots.forEach((slot, idx) => { if (idx < sortedByDiff.length) result[slot] = sortedByDiff[idx]; });
        edgeSlots.forEach((slot, idx) => { const si = bestSlots.length + idx; if (si < sortedByDiff.length) result[slot] = sortedByDiff[si]; });
        // Write back
        let ri = 0;
        for (let i = 0; i < d.length; i++) {
          if (d[i]) { d[i] = result[ri] ? result[ri].s : d[i]; ri++; }
        }
      });
    }

    // Fix E-02: ensure Wed or Thu is among 2 lightest days
    // Try swapping heaviest subject from Wed with lightest from peak day
    for (let attempt = 0; attempt < 3; attempt++) {
      const dd = days.map(d => d.reduce((s, sub) => s + gd(sub, g), 0));
      const activeDays = dd.map((d, i) => ({ d, i })).filter(x => x.d > 0).sort((a, b) => a.d - b.d);
      const twoLightest = activeDays.slice(0, 2).map(x => x.i);
      if (twoLightest.includes(2) || twoLightest.includes(3)) break;

      // Need to make Wed(2) or Thu(3) lighter
      const targetDay = 2; // prefer Wed
      const peakIdx = dd.reduce((mi, v, i) => i !== targetDay && v > dd[mi] ? i : mi, dd[targetDay] < dd[3] ? 3 : 0);

      const tSubs = days[targetDay].map((s, i) => ({ s, i, d: gd(s, g) })).filter(x => x.s).sort((a, b) => b.d - a.d);
      const pSubs = days[peakIdx].map((s, i) => ({ s, i, d: gd(s, g) })).filter(x => x.s).sort((a, b) => a.d - b.d);

      if (tSubs.length && pSubs.length && tSubs[0].d > pSubs[0].d) {
        days[targetDay][tSubs[0].i] = pSubs[0].s;
        days[peakIdx][pSubs[0].i] = tSubs[0].s;
      } else break;
    }
  }
  return f;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ScoreRing({score,size=70}){
  const r=size*0.38,c=2*Math.PI*r,off=c-(score/100)*c;
  const col=score>=90?'#22c55e':score>=70?'#eab308':'#ef4444';
  return(
    <div style={{position:'relative',width:size,height:size}}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={size*0.06}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={size*0.06} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:size*0.3,fontWeight:800,color:col,lineHeight:1}}>{score}</span>
        <span style={{fontSize:size*0.09,color:'#64748b'}}>/ 100</span>
      </div>
    </div>
  );
}

// Counter with hover popup
function CounterBadge({ icon, value, label, color, items }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{
        textAlign: 'center', padding: '5px 12px', borderRadius: 8,
        background: '#0f172a', border: `1px solid ${color}33`, cursor: 'default',
        transition: 'border-color 0.2s',
        borderColor: hover ? color : `${color}33`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 8, color: '#64748b' }}>{icon} {label}</div>
      </div>
      {hover && items && items.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
          padding: '10px 12px', minWidth: 280, maxWidth: 360, maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)', fontSize: 11, color: '#e2e8f0',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color }}>
            {icon} {label}: {value}
          </div>
          {items.map((item, i) => (
            <div key={i} style={{
              padding: '5px 0', borderBottom: i < items.length - 1 ? '1px solid #1e293b' : 'none',
              display: 'flex', gap: 6, alignItems: 'flex-start',
            }}>
              <span style={{
                background: `${color}22`, color, fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 4, flexShrink: 0,
              }}>{item.id}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#cbd5e1', lineHeight: 1.3 }}>{item.desc}</div>
                {item.sug && <div style={{ color: '#22d3ee', fontSize: 10, marginTop: 2 }}>💡 {item.sug}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TipBox({info,x,y}){
  if(!info)return null;
  const{subj,grade,score,thresh,flags,lessonIdx,prevSubj,prevDiff}=info;
  const table=grade<=4?'6.9':grade<=9?'6.10':'6.11';
  const level=score>=10?'Очень сложный':score>=thresh?'Сложный':score>=5?'Средний':'Лёгкий';
  return(
    <div style={{position:'fixed',left:Math.min(x+14,window.innerWidth-320),top:y-8,zIndex:100,background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 14px',maxWidth:310,fontSize:12,boxShadow:'0 8px 32px rgba(0,0,0,0.7)',pointerEvents:'none',color:'#e2e8f0',lineHeight:1.5}}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{SF[subj]||subj}</div>
      <div style={{display:'flex',gap:14,marginBottom:6}}>
        <div><div style={{color:'#64748b',fontSize:9}}>Балл</div><div style={{fontSize:20,fontWeight:800,color:score>=thresh?'#ef4444':score>=5?'#eab308':'#22c55e'}}>{score}</div></div>
        <div><div style={{color:'#64748b',fontSize:9}}>Уровень</div><div style={{fontWeight:600,color:score>=10?'#ef4444':score>=thresh?'#eab308':'#94a3b8'}}>{level}</div></div>
        <div><div style={{color:'#64748b',fontSize:9}}>Таблица</div><div style={{color:'#94a3b8'}}>{table}</div></div>
      </div>
      <div style={{fontSize:9,color:'#475569',marginBottom:5}}>СанПиН 1.2.3685-21, табл. {table} • Порог для {grade} кл. ≥ {thresh}</div>
      {flags.badSlot&&<div style={{background:'#ef444418',border:'1px solid #ef444444',borderRadius:6,padding:'4px 8px',marginBottom:3,fontSize:11}}>
        <span style={{color:'#ef4444',fontWeight:600}}>⚠ Позиция: </span>
        <span style={{color:'#fca5a5'}}>Балл {score} на {lessonIdx+1}-м уроке — нужно на 2–4 (пик 10:00–12:00).</span>
      </div>}
      {flags.hardPair&&<div style={{background:'#ef444418',border:'1px solid #ef444444',borderRadius:6,padding:'4px 8px',marginBottom:3,fontSize:11}}>
        <span style={{color:'#ef4444',fontWeight:600}}>⚠ Подряд: </span>
        <span style={{color:'#fca5a5'}}>{SF[prevSubj]||prevSubj} ({prevDiff}) → {SF[subj]||subj} ({score})</span>
      </div>}
      {!flags.badSlot&&!flags.hardPair&&<div style={{background:'#22c55e18',border:'1px solid #22c55e44',borderRadius:6,padding:'4px 8px',fontSize:11}}>
        <span style={{color:'#22c55e'}}>✓ {score>=thresh?`Сложный на ${lessonIdx+1}-м — оптимально.`:'Нарушений нет.'}</span>
      </div>}
    </div>
  );
}

function Grid({scheds,cg,aud,compact}){
  const[tip,setTip]=useState(null);
  const[mp,setMp]=useState({x:0,y:0});
  const cls=Object.keys(scheds);
  const ml=7;
  const ths={padding:'4px 2px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:compact?8:10};
  const tds={padding:0,background:'#0a0e17',verticalAlign:'middle'};

  return(
    <div style={{position:'relative'}}>
      <div style={{overflowX:'auto',borderRadius:8,border:'1px solid #1e293b'}}>
        <table style={{borderCollapse:'collapse',width:'100%',minWidth:compact?660:860}}>
          <thead>
            <tr>
              <th style={{...ths,width:38,position:'sticky',left:0,zIndex:3,background:'#0f172a'}}></th>
              {DS.map((d,i)=><th key={i} colSpan={ml} style={{...ths,borderLeft:'2px solid #334155'}}>{d}</th>)}
            </tr>
            <tr>
              <th style={{...ths,position:'sticky',left:0,zIndex:3,background:'#0f172a'}}></th>
              {DS.map((_,di)=>Array.from({length:ml},(_2,li)=>(
                <th key={`h${di}-${li}`} style={{...ths,width:compact?28:36,fontSize:7,color:'#475569',borderLeft:li===0?'2px solid #334155':'1px solid #1e293b'}}>{li+1}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {cls.map(cl=>{
              const g=cg[cl],days=scheds[cl];
              const hasV=aud?.cr?.[cl]?.ch?.some(c=>c.st==='violation');
              return(
                <tr key={cl}>
                  <td style={{...tds,position:'sticky',left:0,zIndex:2,background:'#0f172a',fontWeight:700,fontSize:10,padding:'0 3px',color:hasV?'#ef4444':'#e2e8f0',borderBottom:'1px solid #1e293b'}}>{cl}</td>
                  {days.map((daySubs,di)=>Array.from({length:ml},(_,li)=>{
                    const subj=daySubs[li]||'';
                    if(!subj)return <td key={`${di}-${li}`} style={{...tds,borderLeft:li===0?'2px solid #334155':'1px solid #0a0e17',borderBottom:'1px solid #1e293b',padding:1}}></td>;
                    const diff=gd(subj,g),thresh=g<=4?7:8;
                    const badSlot=diff>=thresh&&(li<1||li>3);
                    const hardPair=li>0&&daySubs[li-1]&&diff>=thresh&&gd(daySubs[li-1],g)>=thresh;
                    const problem=badSlot||hardPair;
                    const bg=CC[subj]||'#666';
                    return(
                      <td key={`${di}-${li}`}
                        onMouseEnter={e=>{
                          let pS=null,pD=0;if(hardPair){pS=daySubs[li-1];pD=gd(pS,g);}
                          setTip({subj,grade:g,score:diff,thresh,flags:{badSlot,hardPair},lessonIdx:li,prevSubj:pS,prevDiff:pD});
                          setMp({x:e.clientX,y:e.clientY});
                        }}
                        onMouseMove={e=>setMp({x:e.clientX,y:e.clientY})}
                        onMouseLeave={()=>setTip(null)}
                        style={{...tds,borderLeft:li===0?'2px solid #334155':'1px solid #0a0e17',borderBottom:'1px solid #1e293b',padding:1,cursor:'default'}}>
                        <div style={{
                          background:problem?bg:bg+'cc',color:'#fff',borderRadius:3,padding:'2px 1px',textAlign:'center',
                          fontSize:compact?8:10,fontWeight:600,lineHeight:1.1,minHeight:compact?15:20,
                          border:problem?'2px solid #ef4444':`1px solid ${bg}50`,
                          textShadow:'0 1px 2px rgba(0,0,0,0.6)',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                        }}>
                          <span>{subj}</span>
                          <span style={{fontSize:compact?5:7,opacity:0.6}}>{diff}</span>
                        </div>
                      </td>
                    );
                  }))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TipBox info={tip} x={mp.x} y={mp.y}/>
    </div>
  );
}

function Recs({aud}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      {aud.top.map((iss,i)=>{
        const isV=iss.st==='violation';
        return(
          <div key={i} style={{background:isV?'#1c1117':'#1a1810',border:`1px solid ${isV?'#ef444433':'#eab30833'}`,borderRadius:10,padding:'10px 12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
              <span style={{background:isV?'#ef4444':'#eab308',color:'#000',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5}}>{isV?'❌':'⚠️'} {iss.id}</span>
              <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>{iss.name}</span>
              <span style={{fontSize:10,color:'#64748b',marginLeft:'auto'}}>{iss.classes.length>4?`${iss.classes.slice(0,3).join(', ')} +${iss.classes.length-3}`:iss.classes.join(', ')}</span>
            </div>
            <p style={{fontSize:11,color:'#cbd5e1',margin:'0 0 2px',lineHeight:1.4}}>{iss.desc}</p>
            {iss.sug&&<p style={{fontSize:11,color:'#22d3ee',margin:0}}>💡 {iss.sug}</p>}
          </div>
        );
      })}
    </div>
  );
}

function CompareTab({sch,cg}){
  const orig=useMemo(()=>runAudit(sch,cg),[]);
  const vA=useMemo(()=>optimizeSmart(sch,cg,'soft'),[]);
  const vB=useMemo(()=>optimizeSmart(sch,cg,'bell'),[]);
  const aA=useMemo(()=>runAudit(vA,cg),[]);
  const aB=useMemo(()=>runAudit(vB,cg),[]);

  const canBeZero = orig.vi.every(v => ['D-01','E-01','E-02','C-03'].includes(v.id));

  function StatRow({l,o,a,b}){
    return(
      <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,marginBottom:2}}>
        <span style={{width:80,color:'#64748b',textAlign:'right',fontSize:10}}>{l}</span>
        <span style={{width:40,textAlign:'center',color:'#94a3b8',background:'#1e293b',borderRadius:4,padding:'2px 4px'}}>{o}</span>
        <span style={{color:'#334155',fontSize:10}}>→</span>
        <span style={{width:40,textAlign:'center',fontWeight:700,color:a<o?'#22c55e':a>o?'#ef4444':'#94a3b8',background:'#0f172a',border:`1px solid ${a<o?'#22c55e33':a===0&&o>0?'#22c55e66':'#1e293b'}`,borderRadius:4,padding:'2px 4px'}}>{a}</span>
        <span style={{width:40,textAlign:'center',fontWeight:700,color:b<o?'#22c55e':b>o?'#ef4444':'#94a3b8',background:'#0f172a',border:`1px solid ${b<o?'#22c55e33':b===0&&o>0?'#22c55e66':'#1e293b'}`,borderRadius:4,padding:'2px 4px'}}>{b}</span>
      </div>
    );
  }

  return(
    <div>
      {!canBeZero && (
        <div style={{background:'#1c1117',border:'1px solid #ef444433',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:11,color:'#fca5a5'}}>
          ⚠ Некоторые нарушения (C-01, C-02) связаны с превышением нагрузки — их нельзя исправить перестановкой. Нужно менять учебный план.
        </div>
      )}

      <div style={{background:'#0f172a',borderRadius:10,border:'1px solid #1e293b',padding:10,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,marginBottom:5,color:'#475569'}}>
          <span style={{width:80,textAlign:'right'}}></span>
          <span style={{width:40,textAlign:'center',fontWeight:700}}>Исход.</span>
          <span style={{width:14}}></span>
          <span style={{width:40,textAlign:'center',fontWeight:700,color:'#60a5fa'}}>А</span>
          <span style={{width:40,textAlign:'center',fontWeight:700,color:'#a78bfa'}}>Б</span>
        </div>
        <StatRow l="Score" o={orig.score} a={aA.score} b={aB.score}/>
        <StatRow l="❌ Наруш." o={orig.vi.length} a={aA.vi.length} b={aB.vi.length}/>
        <StatRow l="⚠️ Рекоменд." o={orig.wa.length} a={aA.wa.length} b={aB.wa.length}/>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
          <span style={{background:'#1d4ed8',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:5}}>Вариант А</span>
          <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>Мягкая оптимизация</span>
          <span style={{fontSize:10,color:'#64748b'}}>— минимум перестановок</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}>
            <ScoreRing score={aA.score} size={36}/>
            <div style={{fontSize:8,color:'#64748b'}}><div>❌{aA.vi.length} ⚠️{aA.wa.length}</div></div>
          </div>
        </div>
        <Grid scheds={vA} cg={cg} aud={aA} compact/>
      </div>

      <div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
          <span style={{background:'#7c3aed',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:5}}>Вариант Б</span>
          <span style={{fontSize:12,fontWeight:600,color:'#e2e8f0'}}>Колокол трудности</span>
          <span style={{fontSize:10,color:'#64748b'}}>— сложные на 2–4, лёгкие по краям</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}>
            <ScoreRing score={aB.score} size={36}/>
            <div style={{fontSize:8,color:'#64748b'}}><div>❌{aB.vi.length} ⚠️{aB.wa.length}</div></div>
          </div>
        </div>
        <Grid scheds={vB} cg={cg} aud={aB} compact/>
      </div>
    </div>
  );
}

function Legend2(){
  const cats=[{l:'Мат.',c:'#e06070'},{l:'Рус.',c:'#5090d0'},{l:'Ин.яз',c:'#40b0a0'},{l:'Ест.',c:'#d08040'},{l:'Общ.',c:'#9070c0'},{l:'Тв.',c:'#c0a060'},{l:'ФК',c:'#80c8a0'},{l:'Инф.',c:'#e09030'}];
  return(
    <div style={{display:'flex',gap:6,flexWrap:'wrap',fontSize:8,color:'#94a3b8',marginBottom:5}}>
      {cats.map((c,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:2}}><div style={{width:7,height:7,borderRadius:2,background:c.c}}/><span>{c.l}</span></div>)}
      <div style={{display:'flex',alignItems:'center',gap:2}}><div style={{width:7,height:7,borderRadius:2,border:'2px solid #ef4444'}}/><span style={{color:'#ef4444'}}>Нарушение</span></div>
      <span style={{color:'#475569'}}>• Наведите для подробностей</span>
    </div>
  );
}

function HeatMap({aud}){
  return(
    <div style={{overflowX:'auto',borderRadius:8,border:'1px solid #1e293b'}}>
      <table style={{borderCollapse:'collapse',width:'100%',minWidth:380}}>
        <thead><tr>
          <th style={{padding:'4px 6px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:10,width:48}}>Класс</th>
          {DS.map((d,i)=><th key={i} style={{padding:'4px 6px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:10}}>{d}</th>)}
          <th style={{padding:'4px 6px',background:'#0f172a',color:'#94a3b8',fontWeight:600,borderBottom:'1px solid #1e293b',textAlign:'center',fontSize:10}}>Σ</th>
        </tr></thead>
        <tbody>
          {Object.entries(aud.cr).map(([cls,res])=>{
            const mx=Math.max(...res.dd),mn=Math.min(...res.dd.filter(d=>d>0));
            return(
              <tr key={cls}>
                <td style={{padding:'4px 6px',background:'#0a0e17',fontWeight:700,color:'#e2e8f0',fontSize:11,borderBottom:'1px solid #1e293b'}}>{cls}</td>
                {res.dd.map((d,i)=>{
                  const isL=d===mn&&d>0,isP=d===mx;
                  return <td key={i} style={{padding:'4px 8px',textAlign:'center',background:isL?'#22c55e18':isP?'#ef444418':'#0a0e17',borderBottom:'1px solid #1e293b'}}>
                    <span style={{fontWeight:700,color:isL?'#22c55e':isP?'#ef4444':'#94a3b8'}}>{d}</span>
                  </td>;
                })}
                <td style={{padding:'4px 8px',textAlign:'center',fontWeight:600,color:'#64748b',background:'#0a0e17',borderBottom:'1px solid #1e293b'}}>{res.wt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App(){
  const aud=useMemo(()=>runAudit(SCH,CG),[]);
  const[tab,setTab]=useState('grid');
  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:'#0a0e17',color:'#e2e8f0',minHeight:'100vh',padding:'14px 10px'}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <ScoreRing score={aud.score} size={66}/>
        <div style={{flex:1,minWidth:140}}>
          <h1 style={{fontSize:17,fontWeight:800,margin:0}}><span style={{color:'#22d3ee'}}>СанПиН</span>-аудит</h1>
          <p style={{fontSize:9,color:'#64748b',margin:'2px 0 0'}}>10 классов • 5–11 параллели • v3.0</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          <CounterBadge icon="✅" value={aud.passed} label="прош." color="#22c55e" items={null}/>
          <CounterBadge icon="⚠️" value={aud.wa.length} label="рек." color="#eab308" items={aud.wa}/>
          <CounterBadge icon="❌" value={aud.vi.length} label="нар." color="#ef4444" items={aud.vi}/>
        </div>
      </div>
      <div style={{display:'flex',gap:3,marginBottom:8,overflowX:'auto'}}>
        {[['grid','📅 Сетка'],['heat','🌡️ Трудность'],['recs','📋 Проблемы'],['compare','🔄 Варианты']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{background:tab===id?'#1e293b':'transparent',color:tab===id?'#e2e8f0':'#64748b',border:'none',padding:'5px 10px',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{label}</button>
        ))}
      </div>
      {tab==='grid'&&<div><Legend2/><Grid scheds={SCH} cg={CG} aud={aud}/></div>}
      {tab==='heat'&&<div><p style={{fontSize:10,color:'#94a3b8',margin:'0 0 5px'}}><span style={{color:'#22c55e'}}>■</span> облегчённый <span style={{color:'#ef4444'}}>■</span> пик — облегчённый должен быть Ср или Чт.</p><HeatMap aud={aud}/></div>}
      {tab==='recs'&&<Recs aud={aud}/>}
      {tab==='compare'&&<CompareTab sch={SCH} cg={CG}/>}
    </div>
  );
}
