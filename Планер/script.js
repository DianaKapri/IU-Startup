document.addEventListener('DOMContentLoaded', () => {

  /* ===== SCROLL REVEAL ===== */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));


  /* ===== NAV THEME (dark on dark sections) ===== */
  const nav = document.getElementById('nav');
  const darkSections = document.querySelectorAll('.hero, .showcase--dark, .form-section, .ribbon, .demo');

  function updateNavTheme() {
    const navBottom = nav.getBoundingClientRect().bottom;
    let onDark = false;

    darkSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top < navBottom && rect.bottom > navBottom) {
        onDark = true;
      }
    });

    nav.classList.toggle('nav--dark', onDark);
  }

  window.addEventListener('scroll', updateNavTheme, { passive: true });
  updateNavTheme();


  /* ===== COUNTER ANIMATION ===== */
  let counterFired = false;

  const counterObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !counterFired) {
      counterFired = true;
      animateCounters();
    }
  }, { threshold: 0.3 });

  const ribbon = document.querySelector('.ribbon');
  if (ribbon) counterObserver.observe(ribbon);

  function animateCounters() {
    document.querySelectorAll('.ribbon__number[data-target]').forEach(el => {
      const target = +el.dataset.target;
      const duration = 1800;
      const start = performance.now();

      (function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }


  /* ===== FORM ===== */
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  function setError(id, msg) {
    const span = document.getElementById(id);
    const input = span && span.previousElementSibling;
    if (span) span.textContent = msg;
    if (input) input.classList.toggle('error', !!msg);
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  form.querySelectorAll('.form__input').forEach(input => {
    input.addEventListener('input', () => {
      const err = input.nextElementSibling;
      if (err && err.classList.contains('form__error')) {
        err.textContent = '';
        input.classList.remove('error');
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;

    const name   = form.name.value.trim();
    const school = form.school.value.trim();
    const email  = form.email.value.trim();

    setError('nameError', '');
    setError('schoolError', '');
    setError('emailError', '');

    if (!name)   { setError('nameError', 'Введите имя');   ok = false; }
    if (!school) { setError('schoolError', 'Укажите школу'); ok = false; }
    if (!email)  { setError('emailError', 'Введите email'); ok = false; }
    else if (!isEmail(email)) { setError('emailError', 'Некорректный email'); ok = false; }

    if (!ok) return;

    const btn = form.querySelector('.form__btn');
    btn.disabled = true;
    btn.textContent = 'Отправка…';

    setTimeout(() => {
      form.style.display = 'none';
      document.querySelector('.form-section__left').style.display = 'none';
      success.classList.add('active');
    }, 900);
  });


  /* ===== LIVE DEMO: AUDIT ENGINE ===== */
  const SF={мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект'};
  const CC={мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0'};
  const DS=['Пн','Вт','Ср','Чт','Пт'];
  const D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13,7:null,8:null,9:null},гео:{5:null,6:null,7:12,8:10,9:8},алг:{5:null,6:null,7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{5:null,6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1,8:null,9:null},муз:{5:2,6:1,7:1,8:1,9:null},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{5:null,6:null,7:8,8:5,9:5}};
  const D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4};
  const D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};
  const WMAX={5:29,6:30,7:32,8:33,9:33,10:34,11:34};
  const DMX={5:6,6:6,7:7,8:7,9:7,10:7,11:7};

  function gd(s,g){if(!s)return 0;if(g<=4)return D14[s]||5;if(g>=10)return D1011[s]||5;const e=D59[s];if(!e)return 5;const v=e[g];if(v!=null)return v;for(let d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}return 5;}

  function auditSchedule(sch,cg){
    const cr={};
    for(const[cls,days]of Object.entries(sch)){
      const g=cg[cls]||5,ch=[];
      const dt=days.map(d=>d.filter(s=>s).length);
      const wt=dt.reduce((a,b)=>a+b,0);
      const dd=days.map(d=>d.reduce((s,sub)=>s+gd(sub,g),0));
      const th=g<=4?7:8,wm=WMAX[g]||34,dm=DMX[g]||7;
      if(wt>wm)ch.push({id:'C-02',name:'Недельная нагрузка',st:'violation',desc:`${cls}: ${wt} ч (макс. ${wm})`,sug:`Уберите ${wt-wm} ч`});
      days.forEach((d,di)=>{const c=d.filter(s=>s).length;if(c>dm)ch.push({id:'C-01',name:'Макс. уроков/день',st:'violation',desc:`${cls} ${DS[di]}: ${c} (макс. ${dm})`,sug:`Уберите ${c-dm} ур.`});});
      const ac=dt.filter(c=>c>0);
      if(ac.length>1&&Math.max(...ac)-Math.min(...ac)>1)ch.push({id:'C-03',name:'Равномерность',st:'violation',desc:`${cls}: разница ${Math.max(...ac)-Math.min(...ac)}`,sug:'Перераспределите уроки'});
      const light=dd.map((d,i)=>({d,i})).filter(x=>x.d>0).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.i);
      if(dd.filter(d=>d>0).length>2&&!light.includes(2)&&!light.includes(3))ch.push({id:'E-02',name:'Облегчённый день',st:'violation',desc:`${cls}: лёгкие дни ${light.map(i=>DS[i]).join(', ')} — не Ср/Чт`,sug:'Разгрузите Ср или Чт'});
      let hp=0;const pd=[];
      days.forEach((d,di)=>{const ss=d.filter(s=>s);for(let i=0;i<ss.length-1;i++){if(gd(ss[i],g)>=th&&gd(ss[i+1],g)>=th){hp++;if(pd.length<2)pd.push(`${DS[di]}: ${SF[ss[i]]||ss[i]}→${SF[ss[i+1]]||ss[i+1]}`);}}});
      if(hp>0)ch.push({id:'D-01',name:'Сложные подряд',st:'warning',desc:`${cls}: ${hp} пар`,sug:'Вставьте лёгкий предмет между ними'});
      let bs=0;
      days.forEach((d)=>{d.forEach((sub,li)=>{if(sub&&gd(sub,g)>=th&&(li<1||li>3))bs++;});});
      if(bs>0)ch.push({id:'E-01',name:'Сложные не на 2–4',st:'warning',desc:`${cls}: ${bs} случ.`,sug:'Переместите на 2–4 уроки'});
      cr[cls]={ch,dd,wt,dt};
    }
    const all=Object.entries(cr).flatMap(([c,r])=>r.ch.map(x=>({...x,cls:c})));
    const vi=all.filter(c=>c.st==='violation'),wa=all.filter(c=>c.st==='warning');
    const byR={};all.forEach(c=>{if(!byR[c.id])byR[c.id]={...c,classes:[]};byR[c.id].classes.push(c.cls);});
    const top=Object.values(byR).sort((a,b)=>(a.st==='violation'?0:2)+(a.classes.length>1?0:1)-((b.st==='violation'?0:2)+(b.classes.length>1?0:1))).slice(0,5);
    const tot=Object.values(cr).reduce((s,r)=>s+5+r.ch.length,0);
    return{cr,vi,wa,top,score:Math.round((tot-vi.length-wa.length)/tot*100),passed:tot-vi.length-wa.length};
  }

  const DEMO_SCH={
    '5А':[['мат','рус','ия','ист','техн','фк'],['рус','мат','био','ия','геогр','изо'],['мат','лит','общ','муз','фк',''],['рус','ия','мат','лит','однк','техн'],['рус','мат','био','ист','инф','']],
    '5Б':[['рус','мат','лит','ия','изо','фк'],['мат','рус','ист','био','техн','муз'],['ия','мат','рус','геогр','фк',''],['мат','лит','ия','общ','однк','техн'],['рус','мат','био','инф','ист','']],
    '7А':[['алг','рус','физ','ия','ист','геогр','фк'],['гео','рус','ия','био','общ','инф',''],['рус','алг','лит','физ','муз','техн',''],['ия','гео','рус','ист','обж','фк',''],['алг','рус','физ','лит','био','геогр','изо']],
    '8А':[['хим','алг','рус','физ','ия','ист','обж'],['алг','рус','хим','био','общ','инф','фк'],['рус','гео','ия','лит','геогр','техн',''],['физ','алг','рус','ист','ия','фк',''],['рус','гео','хим','лит','био','геогр','инф']],
    '10А':[['алг','рус','физ','хим','ист','ия','обж'],['гео','алг','лит','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','астр',''],['хим','алг','рус','ист','ия','элект','фк'],['алг','рус','физ','лит','био','проект','инф']],
    '11А':[['алг','рус','хим','физ','ист','ия','обж'],['гео','алг','лит','био','общ','элект','фк'],['рус','физ','ия','астр','геогр','лит',''],['хим','алг','рус','ист','ия','инф','фк'],['алг','рус','физ','лит','право','проект','элект']],
  };
  const DEMO_CG={'5А':5,'5Б':5,'7А':7,'8А':8,'10А':10,'11А':11};

  const ALIASES={мат:['математика','матем'],алг:['алгебра'],гео:['геометрия'],рус:['русский язык','русский','рус яз','рус. яз'],лит:['литература','лит-ра','литературное чтение'],ия:['английский язык','английский','англ яз','англ. яз','иностранный язык','ин яз','ин. яз','немецкий язык','французский язык'],физ:['физика'],хим:['химия'],био:['биология'],ист:['история','история россии','всеобщая история'],общ:['обществознание','обществозн'],геогр:['география'],инф:['информатика','информатика и икт'],фк:['физкультура','физ-ра','физра','физическая культура'],изо:['изо','изобразительное искусство'],муз:['музыка'],техн:['технология','труд'],обж:['обж','основы безопасности жизнедеятельности'],астр:['астрономия'],однк:['однкнр','однк'],мхк:['мхк','искусство'],право:['право'],элект:['элективный','элективный курс','факультатив'],проект:['проект','проектная деятельность','индивидуальный проект']};
  const N2K={};
  for(const[k,names]of Object.entries(ALIASES))for(const n of names)N2K[n.toLowerCase().trim()]=k;

  function normSubj(raw){
    if(!raw||typeof raw!=='string')return '';
    const n=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"".,;:!()\-–—\/\\]/g,'').replace(/\s+/g,' ').trim();
    if(!n)return '';if(N2K[n])return N2K[n];
    for(const[name,key]of Object.entries(N2K)){if(n.includes(name)||name.includes(n))return key;}
    const fw=n.split(' ')[0];
    if(fw.length>=3){for(const[name,key]of Object.entries(N2K)){if(name.startsWith(fw))return key;}}
    return n.slice(0,6);
  }

  const DAY_MAP={'понедельник':'Пн','пн':'Пн','вторник':'Вт','вт':'Вт','среда':'Ср','ср':'Ср','четверг':'Чт','чт':'Чт','пятница':'Пт','пт':'Пт'};
  function parseDay(r){if(!r)return null;return DAY_MAP[String(r).toLowerCase().trim()]||null;}

  function parseExcelData(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=(e)=>{
        try{
          const wb=XLSX.read(e.target.result,{type:'array'});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          if(!data||data.length<2){reject('Пустой файл');return;}
          const hdr=data[0].map(h=>String(h).toLowerCase().trim());
          const cCol=hdr.findIndex(h=>h.includes('класс'));
          const dCol=hdr.findIndex(h=>h.includes('день')||parseDay(h));
          if(cCol===-1){reject('Не найден столбец «Класс». Формат: Класс | День | 1 | 2 | 3 | 4 | 5 | 6 | 7');return;}
          const lCols=[];
          for(let i=0;i<hdr.length;i++){if(i!==cCol&&i!==dCol)lCols.push(i);}
          const schedMap={},cgMap={};
          for(let r=1;r<data.length;r++){
            const row=data[r];
            const cls=String(row[cCol]||'').trim();
            const day=dCol>=0?parseDay(row[dCol]):null;
            if(!cls)continue;
            if(!schedMap[cls]){schedMap[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cgMap[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
            if(day)schedMap[cls][day]=lCols.map(ci=>normSubj(String(row[ci]||'')));
          }
          const dayOrd=['Пн','Вт','Ср','Чт','Пт'];
          const sch={},cg={};
          for(const[cls,dm]of Object.entries(schedMap)){
            const ml2=Math.max(...dayOrd.map(d=>(dm[d]||[]).length),1);
            sch[cls]=dayOrd.map(d=>{const s2=dm[d]||[];while(s2.length<ml2)s2.push('');return s2;});
            cg[cls]=cgMap[cls];
          }
          if(!Object.keys(sch).length){reject('Не удалось извлечь расписание');return;}
          resolve({sch,cg});
        }catch(err){reject('Ошибка: '+err.message);}
      };
      reader.onerror=()=>reject('Не удалось прочитать файл');
      reader.readAsArrayBuffer(file);
    });
  }

  function renderScoreRing(score,el){
    const sz=72,r=sz*.38,c=2*Math.PI*r,off=c-(score/100)*c;
    const col=score>=90?'#30d158':score>=70?'#ffd60a':'#ff453a';
    el.innerHTML=`<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="transform:rotate(-90deg)"><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${sz*.06}"/><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sz*.06}" stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:${sz*.3}px;font-weight:800;color:${col};line-height:1">${score}</span><span style="font-size:${sz*.09}px;color:var(--gray-mid)">/ 100</span></div>`;
    el.style.cssText=`position:relative;width:${sz}px;height:${sz}px;flex-shrink:0`;
  }

  function renderGrid(sch,cg,aud,tbl){
    const classes=Object.keys(sch);
    const ml=Math.max(...classes.map(c=>Math.max(...sch[c].map(d=>d.length))),6);
    let h='<thead><tr><th class="demo__grid-cls"></th>';
    DS.forEach(d=>{h+=`<th class="demo__grid-dayhdr" colspan="${ml}">${d}</th>`;});
    h+='</tr><tr><th class="demo__grid-cls"></th>';
    DS.forEach(()=>{for(let i=0;i<ml;i++)h+=`<th${i===0?' class="demo__grid-daystart"':''}>${i+1}</th>`;});
    h+='</tr></thead><tbody>';
    classes.forEach(cls=>{
      const g=cg[cls]||5,days=sch[cls],th2=g<=4?7:8;
      const hasV=aud.cr[cls]?.ch?.some(c2=>c2.st==='violation');
      h+=`<tr><td class="demo__grid-cls${hasV?' demo__grid-cls--err':''}">${cls}</td>`;
      days.forEach((daySubs,di)=>{
        for(let li=0;li<ml;li++){
          const subj=daySubs[li]||'';
          const ds2=li===0?' demo__grid-daystart':'';
          if(!subj){h+=`<td class="${ds2}"></td>`;continue;}
          const diff=gd(subj,g);
          const badSlot=diff>=th2&&(li<1||li>3);
          const hardPair=li>0&&daySubs[li-1]&&diff>=th2&&gd(daySubs[li-1],g)>=th2;
          const err=badSlot||hardPair;
          const bg=CC[subj]||'#666';
          const ps=hardPair?daySubs[li-1]:'';
          const pd=hardPair?gd(ps,g):0;
          h+=`<td class="${ds2}"><div class="demo__grid-cell${err?' demo__grid-cell--err':''}" style="background:${bg}${err?'':'cc'};border:1px solid ${bg}50" data-subj="${subj}" data-grade="${g}" data-diff="${diff}" data-li="${li}" data-bad="${badSlot?1:0}" data-pair="${hardPair?1:0}" data-prev="${ps}" data-prevd="${pd}"><span>${subj}</span><span class="demo__grid-cell-diff">${diff}</span></div></td>`;
        }
      });
      h+='</tr>';
    });
    h+='</tbody>';
    tbl.innerHTML=h;
  }

  function renderPopup(items,el,tagCls){
    if(!items.length){el.innerHTML='';return;}
    el.innerHTML=items.slice(0,8).map(it=>`<div class="demo__popup-item"><span class="demo__popup-tag ${tagCls}">${it.id}</span><div><div class="demo__popup-desc">${it.desc}</div>${it.sug?`<div class="demo__popup-sug">💡 ${it.sug}</div>`:''}</div></div>`).join('')+(items.length>8?`<div style="color:var(--gray-mid);font-size:.65rem;margin-top:4px">…и ещё ${items.length-8}</div>`:'');
  }

  function renderRecs(top,el){
    el.innerHTML=top.map(iss=>{
      const isV=iss.st==='violation';
      return`<div class="demo__rec demo__rec--${isV?'violation':'warning'}"><div class="demo__rec-header"><span class="demo__rec-tag demo__rec-tag--${isV?'red':'yellow'}">${isV?'❌':'⚠️'} ${iss.id}</span><span class="demo__rec-name">${iss.name}</span><span class="demo__rec-classes">${iss.classes.length>3?iss.classes.slice(0,3).join(', ')+' +'+(iss.classes.length-3):iss.classes.join(', ')}</span></div><div class="demo__rec-desc">${iss.desc}</div>${iss.sug?`<div class="demo__rec-sug">💡 ${iss.sug}</div>`:''}</div>`;
    }).join('');
  }

  function showDashboard(sch,cg){
    const aud=auditSchedule(sch,cg);
    document.getElementById('demoUpload').style.display='none';
    const dash=document.getElementById('demoDashboard');
    dash.style.display='block';
    renderScoreRing(aud.score,document.getElementById('demoScore'));
    document.querySelector('#cntPass .demo__counter-val').textContent=aud.passed;
    document.querySelector('#cntWarn .demo__counter-val').textContent=aud.wa.length;
    document.querySelector('#cntViol .demo__counter-val').textContent=aud.vi.length;
    renderPopup(aud.wa,document.getElementById('warnPopup'),'demo__popup-tag--yellow');
    renderPopup(aud.vi,document.getElementById('violPopup'),'demo__popup-tag--red');
    renderGrid(sch,cg,aud,document.getElementById('demoGrid'));
    renderHeatmap(sch,cg,aud,document.getElementById('demoHeat'));
    renderRecs(aud.top,document.getElementById('demoRecs'));
    renderVariants(sch,cg,aud,document.getElementById('demoVars'));
    // Reset tabs to grid
    document.querySelectorAll('.demo__tab').forEach(t=>t.classList.remove('demo__tab--active'));
    document.querySelector('.demo__tab[data-tab="grid"]').classList.add('demo__tab--active');
    document.querySelectorAll('.demo__panel').forEach(p=>p.style.display='none');
    document.getElementById('panelGrid').style.display='';
    // Store for tab use
    window.__demoSch=sch; window.__demoCg=cg; window.__demoAud=aud;
    dash.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // Tab switching
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.demo__tab');
    if(!tab)return;
    document.querySelectorAll('.demo__tab').forEach(t=>t.classList.remove('demo__tab--active'));
    tab.classList.add('demo__tab--active');
    const panels={grid:'panelGrid',heat:'panelHeat',recs:'panelRecs',vars:'panelVars'};
    document.querySelectorAll('.demo__panel').forEach(p=>p.style.display='none');
    const target=panels[tab.dataset.tab];
    if(target)document.getElementById(target).style.display='';
  });

  function renderHeatmap(sch,cg,aud,tbl){
    const classes=Object.keys(sch);
    let h='<thead><tr><th style="width:50px">Класс</th>';
    DS.forEach(d=>{h+=`<th>${d}</th>`;});
    h+='<th>Σ нед.</th></tr></thead><tbody>';
    classes.forEach(cls=>{
      const res=aud.cr[cls]; if(!res)return;
      const mx=Math.max(...res.dd),mn=Math.min(...res.dd.filter(d=>d>0));
      h+=`<tr><td style="font-weight:700;padding:6px 8px">${cls}</td>`;
      res.dd.forEach(d=>{
        const isL=d===mn&&d>0,isP=d===mx;
        const cls2=isL?'demo__heat-light':isP?'demo__heat-peak':'demo__heat-normal';
        h+=`<td class="${cls2}">${d}</td>`;
      });
      h+=`<td class="demo__heat-normal">${res.wt}</td></tr>`;
    });
    h+='</tbody>';
    tbl.innerHTML=h;
  }

  // Optimizer
  function cloneObj(o){return JSON.parse(JSON.stringify(o));}

  function optimizeSchedule(sch,cg,mode){
    const f=cloneObj(sch);
    for(const[cls,days]of Object.entries(f)){
      const g=cg[cls]||5,th2=g<=4?7:8;
      if(mode==='soft'){
        for(let p=0;p<3;p++){days.forEach(d=>{
          if(d.filter(s=>s).length<3)return;
          if(d[0]&&gd(d[0],g)>=th2){for(let j=1;j<=3&&j<d.length;j++){if(d[j]&&gd(d[j],g)<th2){[d[0],d[j]]=[d[j],d[0]];break;}}}
          for(let i=4;i<d.length;i++){if(d[i]&&gd(d[i],g)>=th2){for(let j=1;j<=3;j++){if(d[j]&&gd(d[j],g)<th2){[d[i],d[j]]=[d[j],d[i]];break;}}}}
          for(let i=0;i<d.length-1;i++){if(d[i]&&d[i+1]&&gd(d[i],g)>=th2&&gd(d[i+1],g)>=th2){for(let j=i+2;j<d.length;j++){if(d[j]&&gd(d[j],g)<th2){[d[i+1],d[j]]=[d[j],d[i+1]];break;}}}}
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

  function varValClass(v,o){return v<o?'demo__var-val--better':v>o?'demo__var-val--worse':'demo__var-val--same';}

  function renderVariants(sch,cg,origAud,container){
    const vA=optimizeSchedule(sch,cg,'soft');
    const vB=optimizeSchedule(sch,cg,'bell');
    const aA=auditSchedule(vA,cg);
    const aB=auditSchedule(vB,cg);
    const o=origAud;

    // Stats comparison
    let h=`<div class="demo__var-stats">
      <div class="demo__var-row"><span class="demo__var-label"></span><span class="demo__var-val demo__var-val--base">Сейчас</span><span class="demo__var-arrow"></span><span class="demo__var-val demo__var-val--base" style="color:#60a5fa">Вар. А</span><span class="demo__var-val demo__var-val--base" style="color:#a78bfa">Вар. Б</span></div>
      <div class="demo__var-row"><span class="demo__var-label">Score</span><span class="demo__var-val demo__var-val--base">${o.score}</span><span class="demo__var-arrow">→</span><span class="demo__var-val ${varValClass(o.score,aA.score)}" style="border:1px solid">${aA.score}</span><span class="demo__var-val ${varValClass(o.score,aB.score)}" style="border:1px solid">${aB.score}</span></div>
      <div class="demo__var-row"><span class="demo__var-label">❌ Наруш.</span><span class="demo__var-val demo__var-val--base">${o.vi.length}</span><span class="demo__var-arrow">→</span><span class="demo__var-val ${varValClass(aA.vi.length,o.vi.length)}">${aA.vi.length}</span><span class="demo__var-val ${varValClass(aB.vi.length,o.vi.length)}">${aB.vi.length}</span></div>
      <div class="demo__var-row"><span class="demo__var-label">⚠️ Рекоменд.</span><span class="demo__var-val demo__var-val--base">${o.wa.length}</span><span class="demo__var-arrow">→</span><span class="demo__var-val ${varValClass(aA.wa.length,o.wa.length)}">${aA.wa.length}</span><span class="demo__var-val ${varValClass(aB.wa.length,o.wa.length)}">${aB.wa.length}</span></div>
    </div>`;

    // Variant A grid
    h+=`<div class="demo__var-block">
      <div class="demo__var-header">
        <span class="demo__var-badge demo__var-badge--a">Вариант А</span>
        <span class="demo__var-name">Мягкая оптимизация</span>
        <span class="demo__var-desc">— минимум перестановок</span>
        <div class="demo__var-meta"><div class="demo__var-meta-txt">❌${aA.vi.length} ⚠️${aA.wa.length} Score: ${aA.score}</div></div>
      </div>
      <div class="demo__grid-wrap"><table class="demo__grid" id="demoGridA"></table></div>
    </div>`;

    // Variant B grid
    h+=`<div class="demo__var-block">
      <div class="demo__var-header">
        <span class="demo__var-badge demo__var-badge--b">Вариант Б</span>
        <span class="demo__var-name">Колокол трудности</span>
        <span class="demo__var-desc">— сложные на 2–4, лёгкие по краям</span>
        <div class="demo__var-meta"><div class="demo__var-meta-txt">❌${aB.vi.length} ⚠️${aB.wa.length} Score: ${aB.score}</div></div>
      </div>
      <div class="demo__grid-wrap"><table class="demo__grid" id="demoGridB"></table></div>
    </div>`;

    container.innerHTML=h;
    renderGrid(vA,cg,aA,document.getElementById('demoGridA'));
    renderGrid(vB,cg,aB,document.getElementById('demoGridB'));
  }

  // Tooltip
  const tooltip=document.getElementById('demoTooltip');
  if(tooltip){
    document.addEventListener('mouseover',e=>{
      const cell=e.target.closest('.demo__grid-cell');
      if(!cell){tooltip.style.display='none';return;}
      const subj=cell.dataset.subj,grade=+cell.dataset.grade,diff=+cell.dataset.diff;
      const li=+cell.dataset.li,bad=cell.dataset.bad==='1',pair=cell.dataset.pair==='1';
      const prev=cell.dataset.prev,prevd=+cell.dataset.prevd;
      const th3=grade<=4?7:8;
      const table=grade<=4?'6.9':grade<=9?'6.10':'6.11';
      const level=diff>=10?'Очень сложный':diff>=th3?'Сложный':diff>=5?'Средний':'Лёгкий';
      const vc=diff>=th3?'demo__tip-stat-val--hard':diff>=5?'demo__tip-stat-val--mid':'demo__tip-stat-val--easy';
      let alerts='';
      if(bad)alerts+=`<div class="demo__tip-alert demo__tip-alert--bad">⚠ Балл ${diff} на ${li+1}-м уроке — рекомендуется 2–4 (пик работоспособности).</div>`;
      if(pair)alerts+=`<div class="demo__tip-alert demo__tip-alert--bad">⚠ Два сложных подряд: ${SF[prev]||prev} (${prevd}) → ${SF[subj]||subj} (${diff})</div>`;
      if(!bad&&!pair)alerts=`<div class="demo__tip-alert demo__tip-alert--ok">✓ ${diff>=th3?`Сложный на ${li+1}-м — оптимально.`:'Нарушений нет.'}</div>`;
      tooltip.innerHTML=`<div class="demo__tip-name">${SF[subj]||subj}</div><div class="demo__tip-stats"><div><div class="demo__tip-stat-label">Балл</div><div class="demo__tip-stat-val ${vc}" style="font-size:1.2rem">${diff}</div></div><div><div class="demo__tip-stat-label">Уровень</div><div class="demo__tip-stat-val" style="color:var(--gray-mid)">${level}</div></div><div><div class="demo__tip-stat-label">Табл.</div><div class="demo__tip-stat-val" style="color:var(--gray-mid)">${table}</div></div></div><div class="demo__tip-ref">СанПиН 1.2.3685-21 • ${grade} кл. • порог ≥ ${th3}</div>${alerts}`;
      tooltip.style.display='block';
    });
    document.addEventListener('mousemove',e=>{if(tooltip.style.display==='block'){tooltip.style.left=Math.min(e.clientX+14,window.innerWidth-320)+'px';tooltip.style.top=(e.clientY-8)+'px';}});
    document.addEventListener('mouseout',e=>{if(!e.target.closest||!e.target.closest('.demo__grid-cell'))tooltip.style.display='none';});
  }

  // Upload
  const dropzone=document.getElementById('dropzone');
  const fileInput=document.getElementById('fileInput');
  const demoError=document.getElementById('demoError');
  if(dropzone){
    dropzone.addEventListener('click',()=>fileInput.click());
    dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('drag-over');});
    dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('drag-over');const f=e.dataTransfer?.files?.[0];if(f)handleFile(f);});
    fileInput.addEventListener('change',e=>{if(e.target.files[0])handleFile(e.target.files[0]);});
  }
  document.getElementById('loadDemoBtn')?.addEventListener('click',()=>{demoError.textContent='';showDashboard(DEMO_SCH,DEMO_CG);});
  document.getElementById('resetBtn')?.addEventListener('click',()=>{document.getElementById('demoDashboard').style.display='none';document.getElementById('demoUpload').style.display='block';demoError.textContent='';});

  async function handleFile(file){
    demoError.textContent='';
    try{const{sch,cg}=await parseExcelData(file);showDashboard(sch,cg);}catch(err){demoError.textContent=typeof err==='string'?err:err.message;}
  }

});
  /* ===== COUNTER ANIMATION ===== */
  let counterFired = false;

  const counterObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !counterFired) {
      counterFired = true;
      animateCounters();
    }
  }, { threshold: 0.3 });

  const ribbon = document.querySelector('.ribbon');
  if (ribbon) counterObserver.observe(ribbon);

  function animateCounters() {
    document.querySelectorAll('.ribbon__number[data-target]').forEach(el => {
      const target = +el.dataset.target;
      const duration = 1800;
      const start = performance.now();

      (function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }


  /* ===== FORM ===== */
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  function setError(id, msg) {
    const span = document.getElementById(id);
    const input = span && span.previousElementSibling;
    if (span) span.textContent = msg;
    if (input) input.classList.toggle('error', !!msg);
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  form.querySelectorAll('.form__input').forEach(input => {
    input.addEventListener('input', () => {
      const err = input.nextElementSibling;
      if (err && err.classList.contains('form__error')) {
        err.textContent = '';
        input.classList.remove('error');
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;

    const name   = form.name.value.trim();
    const school = form.school.value.trim();
    const email  = form.email.value.trim();

    setError('nameError', '');
    setError('schoolError', '');
    setError('emailError', '');

    if (!name)   { setError('nameError', 'Введите имя');   ok = false; }
    if (!school) { setError('schoolError', 'Укажите школу'); ok = false; }
    if (!email)  { setError('emailError', 'Введите email'); ok = false; }
    else if (!isEmail(email)) { setError('emailError', 'Некорректный email'); ok = false; }

    if (!ok) return;

    const btn = form.querySelector('.form__btn');
    btn.disabled = true;
    btn.textContent = 'Отправка…';

    setTimeout(() => {
      form.style.display = 'none';
      document.querySelector('.form-section__left').style.display = 'none';
      success.classList.add('active');
    }, 900);
  });


  /* ===== LIVE DEMO: AUDIT ENGINE ===== */
  const SF={мат:'Математика',алг:'Алгебра',гео:'Геометрия',рус:'Русский язык',лит:'Литература',ия:'Ин. язык',физ:'Физика',хим:'Химия',био:'Биология',ист:'История',общ:'Обществознание',геогр:'География',инф:'Информатика',фк:'Физкультура',изо:'ИЗО',муз:'Музыка',техн:'Технология',обж:'ОБЖ',астр:'Астрономия',однк:'ОДНКНР',мхк:'МХК',право:'Право',элект:'Элективный',проект:'Проект'};
  const CC={мат:'#e06070',алг:'#e06070',гео:'#d04858',рус:'#5090d0',лит:'#6aa0d8',ия:'#40b0a0',физ:'#d08040',хим:'#c06040',био:'#60b060',астр:'#d08040',ист:'#9070c0',общ:'#a080c8',геогр:'#70a070',право:'#a080c8',инф:'#e09030',фк:'#80c8a0',изо:'#c0a060',муз:'#c0a0c0',техн:'#90b0b0',обж:'#a0a0a0',однк:'#b090c0',мхк:'#b090b0',проект:'#80a0c0',элект:'#9090b0'};
  const DS=['Пн','Вт','Ср','Чт','Пт'];
  const D59={физ:{5:null,6:null,7:8,8:9,9:13},хим:{5:null,6:null,7:null,8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13,7:null,8:null,9:null},гео:{5:null,6:null,7:12,8:10,9:8},алг:{5:null,6:null,7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{5:null,6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1,8:null,9:null},муз:{5:2,6:1,7:1,8:1,9:null},общ:{5:6,6:9,7:9,8:5,9:5},однк:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{5:null,6:null,7:8,8:5,9:5}};
  const D14={мат:8,рус:7,ия:7,изо:3,муз:3,техн:2,фк:1,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4};
  const D1011={физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};
  const WMAX={5:29,6:30,7:32,8:33,9:33,10:34,11:34};
  const DMX={5:6,6:6,7:7,8:7,9:7,10:7,11:7};

  function gd(s,g){if(!s)return 0;if(g<=4)return D14[s]||5;if(g>=10)return D1011[s]||5;const e=D59[s];if(!e)return 5;const v=e[g];if(v!=null)return v;for(let d=1;d<=4;d++){if(e[g-d]!=null)return e[g-d];if(e[g+d]!=null)return e[g+d];}return 5;}

  function auditSchedule(sch,cg){
    const cr={};
    for(const[cls,days]of Object.entries(sch)){
      const g=cg[cls]||5,ch=[];
      const dt=days.map(d=>d.filter(s=>s).length);
      const wt=dt.reduce((a,b)=>a+b,0);
      const dd=days.map(d=>d.reduce((s,sub)=>s+gd(sub,g),0));
      const th=g<=4?7:8,wm=WMAX[g]||34,dm=DMX[g]||7;
      if(wt>wm)ch.push({id:'C-02',name:'Недельная нагрузка',st:'violation',desc:`${cls}: ${wt} ч (макс. ${wm})`,sug:`Уберите ${wt-wm} ч`});
      days.forEach((d,di)=>{const c=d.filter(s=>s).length;if(c>dm)ch.push({id:'C-01',name:'Макс. уроков/день',st:'violation',desc:`${cls} ${DS[di]}: ${c} (макс. ${dm})`,sug:`Уберите ${c-dm} ур.`});});
      const ac=dt.filter(c=>c>0);
      if(ac.length>1&&Math.max(...ac)-Math.min(...ac)>1)ch.push({id:'C-03',name:'Равномерность',st:'violation',desc:`${cls}: разница ${Math.max(...ac)-Math.min(...ac)}`,sug:'Перераспределите уроки'});
      const light=dd.map((d,i)=>({d,i})).filter(x=>x.d>0).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.i);
      if(dd.filter(d=>d>0).length>2&&!light.includes(2)&&!light.includes(3))ch.push({id:'E-02',name:'Облегчённый день',st:'violation',desc:`${cls}: лёгкие дни ${light.map(i=>DS[i]).join(', ')} — не Ср/Чт`,sug:'Разгрузите Ср или Чт'});
      let hp=0;const pd=[];
      days.forEach((d,di)=>{const ss=d.filter(s=>s);for(let i=0;i<ss.length-1;i++){if(gd(ss[i],g)>=th&&gd(ss[i+1],g)>=th){hp++;if(pd.length<2)pd.push(`${DS[di]}: ${SF[ss[i]]||ss[i]}→${SF[ss[i+1]]||ss[i+1]}`);}}});
      if(hp>0)ch.push({id:'D-01',name:'Сложные подряд',st:'warning',desc:`${cls}: ${hp} пар`,sug:'Вставьте лёгкий предмет между ними'});
      let bs=0;
      days.forEach((d)=>{d.forEach((sub,li)=>{if(sub&&gd(sub,g)>=th&&(li<1||li>3))bs++;});});
      if(bs>0)ch.push({id:'E-01',name:'Сложные не на 2–4',st:'warning',desc:`${cls}: ${bs} случ.`,sug:'Переместите на 2–4 уроки'});
      cr[cls]={ch,dd,wt,dt};
    }
    const all=Object.entries(cr).flatMap(([c,r])=>r.ch.map(x=>({...x,cls:c})));
    const vi=all.filter(c=>c.st==='violation'),wa=all.filter(c=>c.st==='warning');
    const byR={};all.forEach(c=>{if(!byR[c.id])byR[c.id]={...c,classes:[]};byR[c.id].classes.push(c.cls);});
    const top=Object.values(byR).sort((a,b)=>(a.st==='violation'?0:2)+(a.classes.length>1?0:1)-((b.st==='violation'?0:2)+(b.classes.length>1?0:1))).slice(0,5);
    const tot=Object.values(cr).reduce((s,r)=>s+5+r.ch.length,0);
    return{cr,vi,wa,top,score:Math.round((tot-vi.length-wa.length)/tot*100),passed:tot-vi.length-wa.length};
  }

  const DEMO_SCH={
    '5А':[['мат','рус','ия','ист','техн','фк'],['рус','мат','био','ия','геогр','изо'],['мат','лит','общ','муз','фк',''],['рус','ия','мат','лит','однк','техн'],['рус','мат','био','ист','инф','']],
    '5Б':[['рус','мат','лит','ия','изо','фк'],['мат','рус','ист','био','техн','муз'],['ия','мат','рус','геогр','фк',''],['мат','лит','ия','общ','однк','техн'],['рус','мат','био','инф','ист','']],
    '7А':[['алг','рус','физ','ия','ист','геогр','фк'],['гео','рус','ия','био','общ','инф',''],['рус','алг','лит','физ','муз','техн',''],['ия','гео','рус','ист','обж','фк',''],['алг','рус','физ','лит','био','геогр','изо']],
    '8А':[['хим','алг','рус','физ','ия','ист','обж'],['алг','рус','хим','био','общ','инф','фк'],['рус','гео','ия','лит','геогр','техн',''],['физ','алг','рус','ист','ия','фк',''],['рус','гео','хим','лит','био','геогр','инф']],
    '10А':[['алг','рус','физ','хим','ист','ия','обж'],['гео','алг','лит','био','общ','инф','фк'],['рус','физ','ия','лит','геогр','астр',''],['хим','алг','рус','ист','ия','элект','фк'],['алг','рус','физ','лит','био','проект','инф']],
    '11А':[['алг','рус','хим','физ','ист','ия','обж'],['гео','алг','лит','био','общ','элект','фк'],['рус','физ','ия','астр','геогр','лит',''],['хим','алг','рус','ист','ия','инф','фк'],['алг','рус','физ','лит','право','проект','элект']],
  };
  const DEMO_CG={'5А':5,'5Б':5,'7А':7,'8А':8,'10А':10,'11А':11};

  const ALIASES={мат:['математика','матем'],алг:['алгебра'],гео:['геометрия'],рус:['русский язык','русский','рус яз','рус. яз'],лит:['литература','лит-ра','литературное чтение'],ия:['английский язык','английский','англ яз','англ. яз','иностранный язык','ин яз','ин. яз','немецкий язык','французский язык'],физ:['физика'],хим:['химия'],био:['биология'],ист:['история','история россии','всеобщая история'],общ:['обществознание','обществозн'],геогр:['география'],инф:['информатика','информатика и икт'],фк:['физкультура','физ-ра','физра','физическая культура'],изо:['изо','изобразительное искусство'],муз:['музыка'],техн:['технология','труд'],обж:['обж','основы безопасности жизнедеятельности'],астр:['астрономия'],однк:['однкнр','однк'],мхк:['мхк','искусство'],право:['право'],элект:['элективный','элективный курс','факультатив'],проект:['проект','проектная деятельность','индивидуальный проект']};
  const N2K={};
  for(const[k,names]of Object.entries(ALIASES))for(const n of names)N2K[n.toLowerCase().trim()]=k;

  function normSubj(raw){
    if(!raw||typeof raw!=='string')return '';
    const n=raw.toLowerCase().replace(/ё/g,'е').replace(/[«»"".,;:!()\-–—\/\\]/g,'').replace(/\s+/g,' ').trim();
    if(!n)return '';if(N2K[n])return N2K[n];
    for(const[name,key]of Object.entries(N2K)){if(n.includes(name)||name.includes(n))return key;}
    const fw=n.split(' ')[0];
    if(fw.length>=3){for(const[name,key]of Object.entries(N2K)){if(name.startsWith(fw))return key;}}
    return n.slice(0,6);
  }

  const DAY_MAP={'понедельник':'Пн','пн':'Пн','вторник':'Вт','вт':'Вт','среда':'Ср','ср':'Ср','четверг':'Чт','чт':'Чт','пятница':'Пт','пт':'Пт'};
  function parseDay(r){if(!r)return null;return DAY_MAP[String(r).toLowerCase().trim()]||null;}

  function parseExcelData(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=(e)=>{
        try{
          const wb=XLSX.read(e.target.result,{type:'array'});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          if(!data||data.length<2){reject('Пустой файл');return;}
          const hdr=data[0].map(h=>String(h).toLowerCase().trim());
          const cCol=hdr.findIndex(h=>h.includes('класс'));
          const dCol=hdr.findIndex(h=>h.includes('день')||parseDay(h));
          if(cCol===-1){reject('Не найден столбец «Класс». Формат: Класс | День | 1 | 2 | 3 | 4 | 5 | 6 | 7');return;}
          const lCols=[];
          for(let i=0;i<hdr.length;i++){if(i!==cCol&&i!==dCol)lCols.push(i);}
          const schedMap={},cgMap={};
          for(let r=1;r<data.length;r++){
            const row=data[r];
            const cls=String(row[cCol]||'').trim();
            const day=dCol>=0?parseDay(row[dCol]):null;
            if(!cls)continue;
            if(!schedMap[cls]){schedMap[cls]={'Пн':[],'Вт':[],'Ср':[],'Чт':[],'Пт':[]};cgMap[cls]=parseInt(cls.replace(/[^0-9]/g,''))||5;}
            if(day)schedMap[cls][day]=lCols.map(ci=>normSubj(String(row[ci]||'')));
          }
          const dayOrd=['Пн','Вт','Ср','Чт','Пт'];
          const sch={},cg={};
          for(const[cls,dm]of Object.entries(schedMap)){
            const ml2=Math.max(...dayOrd.map(d=>(dm[d]||[]).length),1);
            sch[cls]=dayOrd.map(d=>{const s2=dm[d]||[];while(s2.length<ml2)s2.push('');return s2;});
            cg[cls]=cgMap[cls];
          }
          if(!Object.keys(sch).length){reject('Не удалось извлечь расписание');return;}
          resolve({sch,cg});
        }catch(err){reject('Ошибка: '+err.message);}
      };
      reader.onerror=()=>reject('Не удалось прочитать файл');
      reader.readAsArrayBuffer(file);
    });
  }

  function renderScoreRing(score,el){
    const sz=72,r=sz*.38,c=2*Math.PI*r,off=c-(score/100)*c;
    const col=score>=90?'#30d158':score>=70?'#ffd60a':'#ff453a';
    el.innerHTML=`<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="transform:rotate(-90deg)"><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${sz*.06}"/><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sz*.06}" stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/></svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:${sz*.3}px;font-weight:800;color:${col};line-height:1">${score}</span><span style="font-size:${sz*.09}px;color:var(--gray-mid)">/ 100</span></div>`;
    el.style.cssText=`position:relative;width:${sz}px;height:${sz}px;flex-shrink:0`;
  }

  function renderGrid(sch,cg,aud,tbl){
    const classes=Object.keys(sch);
    const ml=Math.max(...classes.map(c=>Math.max(...sch[c].map(d=>d.length))),6);
    let h='<thead><tr><th class="demo__grid-cls"></th>';
    DS.forEach(d=>{h+=`<th class="demo__grid-dayhdr" colspan="${ml}">${d}</th>`;});
    h+='</tr><tr><th class="demo__grid-cls"></th>';
    DS.forEach(()=>{for(let i=0;i<ml;i++)h+=`<th${i===0?' class="demo__grid-daystart"':''}>${i+1}</th>`;});
    h+='</tr></thead><tbody>';
    classes.forEach(cls=>{
      const g=cg[cls]||5,days=sch[cls],th2=g<=4?7:8;
      const hasV=aud.cr[cls]?.ch?.some(c2=>c2.st==='violation');
      h+=`<tr><td class="demo__grid-cls${hasV?' demo__grid-cls--err':''}">${cls}</td>`;
      days.forEach((daySubs,di)=>{
        for(let li=0;li<ml;li++){
          const subj=daySubs[li]||'';
          const ds2=li===0?' demo__grid-daystart':'';
          if(!subj){h+=`<td class="${ds2}"></td>`;continue;}
          const diff=gd(subj,g);
          const badSlot=diff>=th2&&(li<1||li>3);
          const hardPair=li>0&&daySubs[li-1]&&diff>=th2&&gd(daySubs[li-1],g)>=th2;
          const err=badSlot||hardPair;
          const bg=CC[subj]||'#666';
          const ps=hardPair?daySubs[li-1]:'';
          const pd=hardPair?gd(ps,g):0;
          h+=`<td class="${ds2}"><div class="demo__grid-cell${err?' demo__grid-cell--err':''}" style="background:${bg}${err?'':'cc'};border:1px solid ${bg}50" data-subj="${subj}" data-grade="${g}" data-diff="${diff}" data-li="${li}" data-bad="${badSlot?1:0}" data-pair="${hardPair?1:0}" data-prev="${ps}" data-prevd="${pd}"><span>${subj}</span><span class="demo__grid-cell-diff">${diff}</span></div></td>`;
        }
      });
      h+='</tr>';
    });
    h+='</tbody>';
    tbl.innerHTML=h;
  }

  function renderPopup(items,el,tagCls){
    if(!items.length){el.innerHTML='';return;}
    el.innerHTML=items.slice(0,8).map(it=>`<div class="demo__popup-item"><span class="demo__popup-tag ${tagCls}">${it.id}</span><div><div class="demo__popup-desc">${it.desc}</div>${it.sug?`<div class="demo__popup-sug">💡 ${it.sug}</div>`:''}</div></div>`).join('')+(items.length>8?`<div style="color:var(--gray-mid);font-size:.65rem;margin-top:4px">…и ещё ${items.length-8}</div>`:'');
  }

  function renderRecs(top,el){
    el.innerHTML=top.map(iss=>{
      const isV=iss.st==='violation';
      return`<div class="demo__rec demo__rec--${isV?'violation':'warning'}"><div class="demo__rec-header"><span class="demo__rec-tag demo__rec-tag--${isV?'red':'yellow'}">${isV?'❌':'⚠️'} ${iss.id}</span><span class="demo__rec-name">${iss.name}</span><span class="demo__rec-classes">${iss.classes.length>3?iss.classes.slice(0,3).join(', ')+' +'+(iss.classes.length-3):iss.classes.join(', ')}</span></div><div class="demo__rec-desc">${iss.desc}</div>${iss.sug?`<div class="demo__rec-sug">💡 ${iss.sug}</div>`:''}</div>`;
    }).join('');
  }

  function showDashboard(sch,cg){
    const aud=auditSchedule(sch,cg);
    document.getElementById('demoUpload').style.display='none';
    const dash=document.getElementById('demoDashboard');
    dash.style.display='block';
    renderScoreRing(aud.score,document.getElementById('demoScore'));
    document.querySelector('#cntPass .demo__counter-val').textContent=aud.passed;
    document.querySelector('#cntWarn .demo__counter-val').textContent=aud.wa.length;
    document.querySelector('#cntViol .demo__counter-val').textContent=aud.vi.length;
    renderPopup(aud.wa,document.getElementById('warnPopup'),'demo__popup-tag--yellow');
    renderPopup(aud.vi,document.getElementById('violPopup'),'demo__popup-tag--red');
    renderGrid(sch,cg,aud,document.getElementById('demoGrid'));
    renderRecs(aud.top,document.getElementById('demoRecs'));
    dash.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // Tooltip
  const tooltip=document.getElementById('demoTooltip');
  if(tooltip){
    document.addEventListener('mouseover',e=>{
      const cell=e.target.closest('.demo__grid-cell');
      if(!cell){tooltip.style.display='none';return;}
      const subj=cell.dataset.subj,grade=+cell.dataset.grade,diff=+cell.dataset.diff;
      const li=+cell.dataset.li,bad=cell.dataset.bad==='1',pair=cell.dataset.pair==='1';
      const prev=cell.dataset.prev,prevd=+cell.dataset.prevd;
      const th3=grade<=4?7:8;
      const table=grade<=4?'6.9':grade<=9?'6.10':'6.11';
      const level=diff>=10?'Очень сложный':diff>=th3?'Сложный':diff>=5?'Средний':'Лёгкий';
      const vc=diff>=th3?'demo__tip-stat-val--hard':diff>=5?'demo__tip-stat-val--mid':'demo__tip-stat-val--easy';
      let alerts='';
      if(bad)alerts+=`<div class="demo__tip-alert demo__tip-alert--bad">⚠ Балл ${diff} на ${li+1}-м уроке — рекомендуется 2–4 (пик работоспособности).</div>`;
      if(pair)alerts+=`<div class="demo__tip-alert demo__tip-alert--bad">⚠ Два сложных подряд: ${SF[prev]||prev} (${prevd}) → ${SF[subj]||subj} (${diff})</div>`;
      if(!bad&&!pair)alerts=`<div class="demo__tip-alert demo__tip-alert--ok">✓ ${diff>=th3?`Сложный на ${li+1}-м — оптимально.`:'Нарушений нет.'}</div>`;
      tooltip.innerHTML=`<div class="demo__tip-name">${SF[subj]||subj}</div><div class="demo__tip-stats"><div><div class="demo__tip-stat-label">Балл</div><div class="demo__tip-stat-val ${vc}" style="font-size:1.2rem">${diff}</div></div><div><div class="demo__tip-stat-label">Уровень</div><div class="demo__tip-stat-val" style="color:var(--gray-mid)">${level}</div></div><div><div class="demo__tip-stat-label">Табл.</div><div class="demo__tip-stat-val" style="color:var(--gray-mid)">${table}</div></div></div><div class="demo__tip-ref">СанПиН 1.2.3685-21 • ${grade} кл. • порог ≥ ${th3}</div>${alerts}`;
      tooltip.style.display='block';
    });
    document.addEventListener('mousemove',e=>{if(tooltip.style.display==='block'){tooltip.style.left=Math.min(e.clientX+14,window.innerWidth-320)+'px';tooltip.style.top=(e.clientY-8)+'px';}});
    document.addEventListener('mouseout',e=>{if(!e.target.closest||!e.target.closest('.demo__grid-cell'))tooltip.style.display='none';});
  }

  // Upload
  const dropzone=document.getElementById('dropzone');
  const fileInput=document.getElementById('fileInput');
  const demoError=document.getElementById('demoError');
  if(dropzone){
    dropzone.addEventListener('click',()=>fileInput.click());
    dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('drag-over');});
    dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('drag-over');const f=e.dataTransfer?.files?.[0];if(f)handleFile(f);});
    fileInput.addEventListener('change',e=>{if(e.target.files[0])handleFile(e.target.files[0]);});
  }
  document.getElementById('loadDemoBtn')?.addEventListener('click',()=>{demoError.textContent='';showDashboard(DEMO_SCH,DEMO_CG);});
  document.getElementById('resetBtn')?.addEventListener('click',()=>{document.getElementById('demoDashboard').style.display='none';document.getElementById('demoUpload').style.display='block';demoError.textContent='';});

  async function handleFile(file){
    demoError.textContent='';
    try{const{sch,cg}=await parseExcelData(file);showDashboard(sch,cg);}catch(err){demoError.textContent=typeof err==='string'?err:err.message;}
  }

});
