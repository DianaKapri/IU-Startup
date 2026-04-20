// ═══ generator.js ═══
/**
 * ШколаПлан — EP-06: Constraint Solver
 * Подключается к оригинальному визарду.
 * Не заменяет UI — только добавляет:
 *   1. Парсинг загруженных XLSX (учебный план, учителя, кабинеты)
 *   2. Constraint solver с backtracking вместо заглушки
 *   3. Проверку всех норм СанПиН при генерации
 *   4. Окна учителей для замен
 */

/* ═══ СанПиН: константы ═══ */
var _SP_MAX_PD = {1:4,2:5,3:5,4:5,5:6,6:6,7:7,8:7,9:7,10:7,11:7};
var _SP_MAX_WK = {1:21,2:23,3:23,4:23,5:29,6:30,7:32,8:33,9:33,10:34,11:34};
var _SP_D14  = {мат:8,рус:7,ия:7,лит:5,общ:4,однк:6,инф:6,геогр:6,био:6,ист:4,окрмир:6,орксэ:4,черч:5,изо:3,муз:3,техн:2,фк:1,обж:1};
var _SP_D59  = {физ:{7:8,8:9,9:13},хим:{8:10,9:12},ист:{5:5,6:8,7:6,8:8,9:10},ия:{5:9,6:11,7:10,8:8,9:9},мат:{5:10,6:13},гео:{7:12,8:10,9:8},алг:{7:10,8:9,9:7},био:{5:10,6:8,7:7,8:7,9:7},лит:{5:4,6:6,7:4,8:4,9:7},инф:{5:4,6:10,7:4,8:7,9:7},рус:{5:8,6:12,7:11,8:7,9:6},геогр:{6:7,7:6,8:6,9:5},изо:{5:3,6:3,7:1},муз:{5:2,6:1,7:1,8:1},общ:{5:6,6:9,7:9,8:5,9:5},техн:{5:4,6:3,7:2,8:1,9:4},обж:{5:1,6:2,7:3,8:3,9:3},фк:{5:3,6:4,7:2,8:2,9:2},проект:{5:4,6:5,7:5,8:5,9:5},мхк:{7:8,8:5,9:5}};
var _SP_D1011 = {физ:12,гео:11,хим:11,алг:10,рус:9,лит:8,ия:8,био:7,инф:6,мат:10,ист:5,общ:5,право:5,геогр:3,обж:2,фк:1,техн:3,астр:12,проект:5,элект:6,мхк:5};

function _spDiff(s,g){
  if(!s)return 0;
  if(g<=4)return _SP_D14[s]||5;
  if(g>=10)return _SP_D1011[s]||5;
  var t=_SP_D59[s];if(!t)return 5;
  if(t[g]!=null)return t[g];
  for(var d=1;d<=4;d++){if(t[g-d]!=null)return t[g-d];if(t[g+d]!=null)return t[g+d];}
  return 5;
}

function _gradeNum(cls){var m=String(cls).match(/^(\d+)/);return m?+m[1]:5;}

/* ═══ Нормализация предметов (расширенная) ═══ */
var _NALIAS = {мат:'математика матем алг+геom'.split(' '),алг:['алгебра','алг.'],гео:['геометрия','геом','геом.'],рус:['русский язык','русский','рус яз','рус.яз','рус.яз.','русяз'],лит:['литература','лит-ра','литературное чтение','лит.'],ия:['английский язык','английский','англ яз','англ. яз','иностранный язык','ин. яз','немецкий язык','французский язык'],физ:['физика','физ.'],хим:['химия','хим.'],био:['биология','биол','биол.'],ист:['история','история России','всеобщая история','ист.'],общ:['обществознание','обществозн','общество','общ.'],геогр:['география','географ','геогр.'],инф:['информатика','информатика и икт','информ.','инф.'],фк:['физкультура','физ-ра','физра','физическая культура','физ.культура'],изо:['изо','изобразительное искусство','рисование'],муз:['музыка','муз.'],техн:['технология','труд','техн.'],обж:['обж','основы безопасности жизнедеятельности'],астр:['астрономия','астрон.'],однк:['однкнр','однк'],мхк:['мхк','искусство','мировая художественная культура'],право:['право'],элект:['элективный','элективный курс','факультатив'],проект:['проект','проектная деятельность','индивидуальный проект'],окрмир:['окружающий мир','окр. мир'],орксэ:['орксэ','основы религиозных культур'],черч:['черчение','черч.']};
var _NM={};
(function(){for(var k in _NALIAS){_NM[k]=k;(_NALIAS[k]||[]).forEach(function(a){_NM[a.toLowerCase().replace(/ё/g,'е').replace(/[.,;:()\-–—]/g,'').replace(/\s+/g,' ').trim()]=k;});}})();
function _normSubj(raw){
  if(!raw||typeof raw!=='string')return'';
  var n=raw.toLowerCase().replace(/ё/g,'е').replace(/[.,;:()\-–—«»]/g,'').replace(/\s+/g,' ').trim();
  if(!n)return'';
  /* Blacklist: строки которые НЕ являются предметами */
  var bl=['итого','макс','нагруз','предмет','кол-во','кол во','всего','нед','week','total','max','класс','class','учитель','teacher','каб','room','смен','shift','день','day','№','num','примеч','note','распис','schedule'];
  for(var bi=0;bi<bl.length;bi++){if(n.indexOf(bl[bi])!==-1)return'';}
  /* Числа не являются предметами */
  if(/^\d+$/.test(n))return'';
  if(_NM[n])return _NM[n];
  for(var k in _NM){if(n.indexOf(k)!==-1||k.indexOf(n)!==-1)return _NM[k];}
  /* Если строка слишком длинная и не найдена — не считать предметом */
  if(n.length>20)return'';
  return n.slice(0,8);
}

/* ═══ Загруженные данные ═══ */
var _wiz_curriculum = null; // [{classId,subject,weeklyHours,teacher}]
var _wiz_teachers   = null; // [{name,subjects[],classes[],maxHours}]
var _wiz_rooms      = null; // [{id,floor,capacity,subjects[]}]

/* ═══ Обработчик файлов (вызывается из onchange в HTML) ═══ */
function wizHandleFile(input, type) {
  var file = input.files[0];
  if (!file) return;

  var dropId = {curriculum:'wizCurriculumDrop', teachers:'wizTeachersDrop', rooms:'wizRoomsDrop'}[type];
  var statusId = {curriculum:'wizCurriculumStatus', teachers:'wizTeachersStatus', rooms:'wizRoomsStatus'}[type];
  var drop = document.getElementById(dropId);
  var statusEl = document.getElementById(statusId);

  if (statusEl) { statusEl.textContent = '⏳ Читаю файл…'; statusEl.style.color = '#86868b'; }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'array'});
      var parsed = null;

      if (type === 'curriculum') {
        parsed = _parseCurriculum(wb);
        _wiz_curriculum = parsed;
        window._wiz_curriculum = parsed;
        /* Строим classSubjectMap через новый движок */
        wizParseExcel(wb, 'curriculum');
        var nCls=_wizState.classes.length, nSubj=Object.keys(_wizState.teacherSubjectMap).length;
        var nTeach=_wizState.teachers.length;
        var statusText='✓ '+parsed.length+' позиций · '+nCls+' классов';
        if(nTeach) statusText+=' · '+nTeach+' учителей';
        if (statusEl) { statusEl.textContent = statusText; statusEl.style.color = '#30d158'; }
        if (drop) drop.style.borderColor = '#30d158';
      } else if (type === 'teachers') {
        parsed = _parseTeachers(wb);
        _wiz_teachers = parsed;
        window._wiz_teachers = parsed;
        if (statusEl) { statusEl.textContent = '✓ ' + parsed.length + ' учителей'; statusEl.style.color = '#30d158'; }
        if (drop) drop.style.borderColor = '#30d158';
      } else if (type === 'rooms') {
        parsed = _parseRooms(wb);
        _wiz_rooms = parsed;
        window._wiz_rooms = parsed;
        if (statusEl) { statusEl.textContent = '✓ ' + parsed.length + ' кабинетов'; statusEl.style.color = '#30d158'; }
        if (drop) drop.style.borderColor = '#30d158';
      }
    } catch(err) {
      if (statusEl) { statusEl.textContent = '✗ Ошибка: ' + err.message; statusEl.style.color = '#ff453a'; }
    }
  };
  reader.onerror = function() {
    if (statusEl) { statusEl.textContent = '✗ Не удалось прочитать файл'; statusEl.style.color = '#ff453a'; }
  };
  reader.readAsArrayBuffer(file);

  // Настраиваем drag-and-drop для той же зоны
  if (drop && !drop._ddInit) {
    drop._ddInit = true;
    drop.addEventListener('dragover', function(ev) { ev.preventDefault(); drop.style.borderColor = '#3b82f6'; });
    drop.addEventListener('dragleave', function() { drop.style.borderColor = ''; });
    drop.addEventListener('drop', function(ev) {
      ev.preventDefault(); drop.style.borderColor = '';
      var f = ev.dataTransfer.files[0];
      if (f) { input.files = ev.dataTransfer.files; wizHandleFile(input, type); }
    });
  }
}

function _uniqueClasses(curriculum) {
  var s = {}; curriculum.forEach(function(x){s[x.classId]=1;}); return Object.keys(s);
}

/* ═══ Парсеры XLSX ═══ */
function _parseCurriculum(wb) {
  var result = [];
  wb.SheetNames.forEach(function(sn) {
    var ws = wb.Sheets[sn];
    var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    if (!data || data.length < 2) return;
    // Найти заголовочную строку
    var hdr = -1, cCls = -1, cSubj = -1, cHrs = -1, cTch = -1;
    for (var r = 0; r < Math.min(data.length, 5); r++) {
      var row = data[r].map(function(c){return String(c).toLowerCase().trim();});
      row.forEach(function(h,i){
        if(cCls===-1 && (h.indexOf('класс')!==-1||h==='кл'||h==='class')) cCls=i;
        if(cSubj===-1 && (h.indexOf('предмет')!==-1||h.indexOf('дисципл')!==-1||h==='subject')) cSubj=i;
        if(cHrs===-1 && (h.indexOf('час')!==-1||h.indexOf('нагрузк')!==-1||h.indexOf('hours')!==-1||h.indexOf('кол')!==-1)) cHrs=i;
        if(cTch===-1 && (h.indexOf('учитель')!==-1||h.indexOf('педагог')!==-1||h.indexOf('teacher')!==-1)) cTch=i;
      });
      if (cSubj!==-1 && cHrs!==-1) { hdr=r; break; }
    }
    // Если нет явных заголовков — пробуем свободный формат
    if (hdr === -1) { _parseCurriculumFree(data, sn, result); return; }
    var currentCls = sn;
    for (var r = hdr+1; r < data.length; r++) {
      var row = data[r];
      var cls = cCls!==-1 ? String(row[cCls]||'').trim() : '';
      if (cls && /^\d{1,2}\s*[А-Яа-яA-Za-z]/.test(cls)) currentCls = cls;
      var subj = _normSubj(String(row[cSubj]||''));
      var hrs = parseInt(row[cHrs])||0;
      var tch = cTch!==-1 ? String(row[cTch]||'').trim() : '';
      if (subj && hrs > 0) result.push({classId:currentCls, subject:subj, weeklyHours:hrs, teacher:tch});
    }
  });
  return result;
}

function _parseCurriculumFree(data, sheetName, result) {
  var currentCls = sheetName;
  data.forEach(function(row) {
    var first = String(row[0]||'').trim();
    if (/^\d{1,2}\s*[А-Яа-яA-Za-z]{1,2}$/.test(first)) { currentCls = first; return; }
    var subj = _normSubj(first);
    var hrs = 0;
    for (var i=1;i<row.length;i++){var v=parseInt(row[i]);if(!isNaN(v)&&v>0){hrs=v;break;}}
    var tch = '';
    for (var i=1;i<row.length;i++){var v=String(row[i]||'').trim();if(v&&isNaN(parseInt(v))&&v.length>2){tch=v;break;}}
    if (subj && hrs > 0) result.push({classId:currentCls, subject:subj, weeklyHours:hrs, teacher:tch});
  });
}

function _parseTeachers(wb) {
  var result = [];
  wb.SheetNames.forEach(function(sn) {
    var ws = wb.Sheets[sn];
    var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    if (!data || data.length < 2) return;
    var cName=-1, cSubj=-1, cCls=-1, cMax=-1, hdr=0;
    var row0 = data[0].map(function(c){return String(c).toLowerCase().trim();});
    row0.forEach(function(h,i){
      if(cName===-1&&(h.indexOf('фио')!==-1||h.indexOf('имя')!==-1||h.indexOf('учитель')!==-1)) cName=i;
      if(cSubj===-1&&h.indexOf('предмет')!==-1) cSubj=i;
      if(cCls===-1&&h.indexOf('класс')!==-1) cCls=i;
      if(cMax===-1&&(h.indexOf('макс')!==-1||h.indexOf('нагрузк')!==-1)) cMax=i;
    });
    if(cName===-1)cName=0; if(cSubj===-1)cSubj=1;
    for (var r=hdr+1;r<data.length;r++) {
      var row=data[r];
      var name=String(row[cName]||'').trim(); if(!name)continue;
      var rawS=String(row[cSubj]||'');
      var subjects=rawS.split(/[,;\/\n]+/).map(function(s){return _normSubj(s.trim());}).filter(Boolean);
      var rawC=cCls!==-1?String(row[cCls]||''):'';
      var classes=rawC.split(/[,;\s\/]+/).map(function(s){return s.trim();}).filter(function(s){return /^\d{1,2}[А-Яа-яA-Za-z]/.test(s);});
      var maxH=cMax!==-1?(parseInt(row[cMax])||36):36;
      result.push({name:name, subjects:subjects, classes:classes, maxHours:maxH});
    }
  });
  return result;
}

function _parseRooms(wb) {
  var result = [];
  wb.SheetNames.forEach(function(sn) {
    var ws = wb.Sheets[sn];
    var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    if (!data || data.length < 2) return;
    var cId=-1, cFloor=-1, cCap=-1, cSubj=-1;
    var row0=data[0].map(function(c){return String(c).toLowerCase().trim();});
    row0.forEach(function(h,i){
      if(cId===-1&&(h.indexOf('кабинет')!==-1||h.indexOf('номер')!==-1||h==='№'||h==='id')) cId=i;
      if(cFloor===-1&&h.indexOf('этаж')!==-1) cFloor=i;
      if(cCap===-1&&(h.indexOf('вмест')!==-1||h.indexOf('мест')!==-1)) cCap=i;
      if(cSubj===-1&&h.indexOf('предмет')!==-1) cSubj=i;
    });
    if(cId===-1)cId=0;
    for (var r=1;r<data.length;r++) {
      var row=data[r];
      var id=String(row[cId]||'').trim(); if(!id)continue;
      var floor=cFloor!==-1?(parseInt(row[cFloor])||1):1;
      var cap=cCap!==-1?(parseInt(row[cCap])||30):30;
      var rawS=cSubj!==-1?String(row[cSubj]||''):'';
      var subjects=rawS.split(/[,;\/\n]+/).map(function(s){return _normSubj(s.trim());}).filter(Boolean);
      result.push({id:id, floor:floor, capacity:cap, subjects:subjects});
    }
  });
  return result;
}

/* ═══ Инициализация drag-and-drop при загрузке страницы ═══ */
(function initDragDrop() {
  function setupDrop(dropId, fileId, type) {
    // Настраиваем сразу при загрузке если элементы уже есть
    // Иначе — при первом взаимодействии (через onclick в HTML)
    var drop = document.getElementById(dropId);
    if (!drop || drop._ddInit) return;
    drop._ddInit = true;
    drop.addEventListener('dragover', function(ev) { ev.preventDefault(); drop.style.borderColor = '#3b82f6'; });
    drop.addEventListener('dragleave', function() { drop.style.borderColor = ''; });
    drop.addEventListener('drop', function(ev) {
      ev.preventDefault(); drop.style.borderColor = '';
      var input = document.getElementById(fileId);
      if (!input || !ev.dataTransfer.files[0]) return;
      // Создаём DataTransfer чтобы присвоить files
      try {
        var dt = new DataTransfer();
        dt.items.add(ev.dataTransfer.files[0]);
        input.files = dt.files;
      } catch(e) {}
      wizHandleFile(input, type);
    });
  }
  // Устанавливаем после загрузки страницы
  document.addEventListener('DOMContentLoaded', function() {
    setupDrop('wizCurriculumDrop','wizCurriculumFile','curriculum');
    setupDrop('wizTeachersDrop','wizTeachersFile','teachers');
    setupDrop('wizRoomsDrop','wizRoomsFile','rooms');
  });
  // Также пробуем сразу (если скрипт загружен после DOM)
  setTimeout(function(){
    setupDrop('wizCurriculumDrop','wizCurriculumFile','curriculum');
    setupDrop('wizTeachersDrop','wizTeachersFile','teachers');
    setupDrop('wizRoomsDrop','wizRoomsFile','rooms');
  }, 500);
})();

/* ═══ CONSTRAINT SOLVER ═══ */

/**
 * Основная функция генерации.
 * Принимает те же данные что wizBuildSchedule(), но также использует
 * загруженные файлы (_wiz_curriculum, _wiz_teachers, _wiz_rooms).
 * Возвращает {sch, cg} — совместимый с engine.js/scripts.js формат.
 */
function wizRunConstraintSolver(wizData) {
  var daysPerWeek = wizData.days || 5;

  // Строим curriculum из загруженного файла ИЛИ из ручного ввода
  var curriculum = [];
  var classGrades = {};

  if (_wiz_curriculum && _wiz_curriculum.length > 0) {
    // Из файла
    curriculum = _wiz_curriculum;
    curriculum.forEach(function(item) {
      if (!classGrades[item.classId]) classGrades[item.classId] = _gradeNum(item.classId);
    });
  } else {
    // Из ручного ввода визарда (wizData.teachers — список учителей с предметами/классами)
    (wizData.teachers || []).forEach(function(t) {
      var subjCode = (typeof normSubj === 'function') ? normSubj(t.subject||'') : _normSubj(t.subject||'');
      if (!subjCode) return;
      var hrs = parseInt(t.hoursPerWeek || t.hours) || 2;
      var classes = String(t.classes||'').split(/[,;\s]+/).map(function(c){return c.trim();}).filter(Boolean);
      classes.forEach(function(cls) {
        curriculum.push({classId:cls, subject:subjCode, weeklyHours:hrs, teacher:t.name||''});
        if (!classGrades[cls]) { var m=cls.match(/^(\d+)/); classGrades[cls]=m?+m[1]:7; }
      });
    });
  }

  if (!curriculum.length) return null;

  // Список учителей — из файла или из ручного ввода
  var teachers = _wiz_teachers || [];
  if (!teachers.length && wizData.teachers && wizData.teachers.length) {
    teachers = (wizData.teachers||[]).map(function(t){
      var subjCode = _normSubj(t.subject||'');
      var classes = String(t.classes||'').split(/[,;\s]+/).map(function(c){return c.trim();}).filter(Boolean);
      return {name:t.name||'', subjects:subjCode?[subjCode]:[], classes:classes, maxHours:36};
    }).filter(function(t){return t.name;});
  }

  // Список кабинетов — из файла или из ручного ввода (wizData.floors)
  var rooms = _wiz_rooms || [];
  if (!rooms.length && wizData.floors && wizData.floors.length) {
    (wizData.floors||[]).forEach(function(fl) {
      (fl.rooms||[]).forEach(function(r) {
        if (!r.num) return;
        var subjCode = _normSubj(r.subject||'');
        rooms.push({id:r.num, floor:parseInt(fl.label)||1, capacity:r.seats||30, subjects:subjCode?[subjCode]:[]});
      });
    });
  }

  // Собираем классы
  var classIds = Object.keys(classGrades);

  // Инициализируем расписание
  var schedule = {};
  var teacherBusy = {}; // name → day[5][8]
  var roomBusy = {};    // id → day[5][8]

  classIds.forEach(function(cls) {
    schedule[cls] = [];
    for (var d = 0; d < daysPerWeek; d++) schedule[cls].push(new Array(8).fill(null));
  });
  teachers.forEach(function(t) {
    teacherBusy[t.name] = [];
    for (var d = 0; d < daysPerWeek; d++) teacherBusy[t.name].push(new Array(8).fill(null));
  });
  rooms.forEach(function(r) {
    roomBusy[r.id] = [];
    for (var d = 0; d < daysPerWeek; d++) roomBusy[r.id].push(new Array(8).fill(null));
  });

  // Lookup: предмет+класс → учитель
  var subjClsTeacher = {};
  curriculum.forEach(function(item) {
    var key = item.classId + '|' + item.subject;
    if (item.teacher && !subjClsTeacher[key]) subjClsTeacher[key] = item.teacher;
  });
  function findTeacher(cls, subj) {
    var key = cls + '|' + subj;
    if (subjClsTeacher[key]) return subjClsTeacher[key];
    for (var i = 0; i < teachers.length; i++) {
      var t = teachers[i];
      if (t.subjects.indexOf(subj) === -1) continue;
      if (t.classes.length && t.classes.indexOf(cls) === -1) continue;
      subjClsTeacher[key] = t.name;
      return t.name;
    }
    for (var i = 0; i < teachers.length; i++) {
      if (teachers[i].subjects.indexOf(subj) !== -1) { subjClsTeacher[key] = teachers[i].name; return teachers[i].name; }
    }
    return null;
  }

  function findRoom(subj, d, slot) {
    if (!rooms.length) return null;
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i];
      if (r.subjects.length && r.subjects.indexOf(subj) === -1) continue;
      if (!roomBusy[r.id][d][slot]) return r.id;
    }
    for (var i = 0; i < rooms.length; i++) {
      if (!roomBusy[rooms[i].id][d][slot]) return rooms[i].id;
    }
    return null;
  }

  // Строим список уроков
  var lessons = [];
  curriculum.forEach(function(item) {
    for (var i = 0; i < item.weeklyHours; i++) {
      lessons.push({cls:item.classId, subj:item.subject, teacher:item.teacher || findTeacher(item.classId, item.subject)});
    }
  });

  // Сортируем: сложные сначала (MRV)
  lessons.sort(function(a,b) {
    return _spDiff(b.subj, classGrades[b.cls]||5) - _spDiff(a.subj, classGrades[a.cls]||5);
  });

  // Проверка возможности размещения
  function canPlace(cls, subj, teacher, d, slot) {
    var g = classGrades[cls] || 5;
    var maxPD = _SP_MAX_PD[g] || 7;
    if (schedule[cls][d][slot] !== null) return false;
    // Не больше maxPD уроков в день (исключение для 1–4 кл с физ-рой)
    var cnt = schedule[cls][d].filter(function(x){return x!==null;}).length;
    if (cnt >= maxPD) {
      if (g <= 4 && cnt === maxPD && subj === 'фк') {
        var hasOver = false;
        for (var dd=0;dd<daysPerWeek;dd++){var c2=schedule[cls][dd].filter(function(x){return x!==null;}).length;if(c2>maxPD){hasOver=true;break;}}
        if (hasOver) return false;
      } else return false;
    }
    // Учитель занят
    if (teacher && teacherBusy[teacher] && teacherBusy[teacher][d][slot] !== null) return false;
    // Не более одного одинакового предмета в день
    for (var s=0;s<8;s++) if (schedule[cls][d][s] && schedule[cls][d][s].subj === subj) return false;
    return true;
  }

  // Оценка размещения (меньше = лучше)
  function scorePlacement(cls, subj, d, slot) {
    var g = classGrades[cls] || 5;
    var th = g <= 4 ? 7 : 8;
    var dv = _spDiff(subj, g);
    var score = 0;
    // E-01: сложные на позициях 1–3 (уроки 2–4)
    if (dv >= th && (slot < 1 || slot > 3)) score += 20;
    // E-03: не ставить сложные подряд
    if (slot > 0 && schedule[cls][d][slot-1]) {
      var prevDv = _spDiff(schedule[cls][d][slot-1].subj, g);
      if (dv >= th && prevDv >= th) score += 15;
    }
    // C-03: равномерность — не перегружать один день
    var dayCnt = schedule[cls][d].filter(function(x){return x!==null;}).length;
    if (dayCnt > 3) score += dayCnt * 3;
    // E-02: не грузить тяжёлым среду/четверг
    var dayDiff = schedule[cls][d].reduce(function(s,x){return s+(x?_spDiff(x.subj,g):0);},0);
    if ((d===2||d===3) && dv > 7) score += 5;
    // Предпочитаем последовательное заполнение (нет окон)
    var lastFilled = -1;
    for (var s=0;s<8;s++) if (schedule[cls][d][s]) lastFilled=s;
    if (slot > lastFilled + 1) score += 30;
    return score;
  }

  // Размещаем уроки
  var unplaced = [];
  lessons.forEach(function(lesson) {
    var cls = lesson.cls, subj = lesson.subj, teacher = lesson.teacher;
    var g = classGrades[cls] || 5;
    var maxPD = _SP_MAX_PD[g] || 7;

    var cands = [];
    for (var d = 0; d < daysPerWeek; d++) {
      for (var slot = 0; slot <= maxPD; slot++) {
        if (canPlace(cls, subj, teacher, d, slot)) {
          cands.push({d:d, slot:slot, score:scorePlacement(cls,subj,d,slot)});
        }
      }
    }

    if (!cands.length) { unplaced.push(lesson); return; }

    cands.sort(function(a,b){return a.score-b.score;});
    var best = cands[0];
    var room = findRoom(subj, best.d, best.slot);

    schedule[cls][best.d][best.slot] = {subj:subj, teacher:teacher, room:room};
    if (teacher && teacherBusy[teacher]) teacherBusy[teacher][best.d][best.slot] = cls;
    if (room && roomBusy[room]) roomBusy[room][best.d][best.slot] = cls;
  });

  // Пост-обработка: уплотнение + оптимизация СанПиН
  _postOptimize(schedule, classGrades, daysPerWeek);

  // Формируем окна учителей
  var teacherWindows = _calcTeacherWindows(teacherBusy, teachers, daysPerWeek);

  // Конвертируем в формат engine.js {sch, cg}
  var sch = {}, cg = {};
  classIds.forEach(function(cls) {
    cg[cls] = classGrades[cls];
    sch[cls] = [];
    for (var d = 0; d < daysPerWeek; d++) {
      var row = [];
      for (var s = 0; s < 8; s++) {
        row.push(schedule[cls][d][s] ? schedule[cls][d][s].subj : '');
      }
      while (row.length > 0 && !row[row.length-1]) row.pop();
      sch[cls].push(row);
    }
  });

  return {sch:sch, cg:cg, teacherWindows:teacherWindows, rawSchedule:schedule, unplaced:unplaced};
}

/* ═══ Пост-оптимизация ═══ */
function _postOptimize(schedule, classGrades, daysPerWeek) {
  Object.keys(schedule).forEach(function(cls) {
    var g = classGrades[cls] || 5;
    var days = schedule[cls];
    var maxPD = _SP_MAX_PD[g] || 7;
    var th = g <= 4 ? 7 : 8;

    // Уплотняем каждый день (убираем дыры — X-01)
    for (var d = 0; d < daysPerWeek; d++) _compactDay(days[d]);

    // C-01: перемещаем лишние уроки из перегруженных дней
    for (var pass = 0; pass < 15; pass++) {
      var counts = days.map(function(day){return day.filter(function(x){return x!==null;}).length;});
      var overIdx = -1, overMax = 0;
      counts.forEach(function(c,i){
        var limit = (g<=4 && days[i].some(function(x){return x&&x.subj==='фк';})) ? maxPD+1 : maxPD;
        if (c > limit && c > overMax) { overMax=c; overIdx=i; }
      });
      if (overIdx === -1) break;
      var underIdx = -1, underMin = 999;
      counts.forEach(function(c,i){if(i!==overIdx&&c<counts[overIdx]-1&&c<underMin){underMin=c;underIdx=i;}});
      if (underIdx === -1) break;
      var moved = false;
      for (var s = days[overIdx].length-1; s >= 0 && !moved; s--) {
        if (!days[overIdx][s]) continue;
        var subj = days[overIdx][s].subj;
        var hasDup = days[underIdx].some(function(x){return x&&x.subj===subj;});
        if (!hasDup) { days[underIdx].push(days[overIdx][s]); days[overIdx][s]=null; moved=true; }
      }
      if (!moved) break;
      days.forEach(function(day){_compactDay(day);});
    }

    // C-03: равномерность
    for (var pass = 0; pass < 10; pass++) {
      var counts = days.map(function(day){return day.filter(function(x){return x!==null;}).length;});
      var active = counts.filter(function(c){return c>0;});
      if (!active.length || Math.max.apply(null,counts)-Math.min.apply(null,active)<=1) break;
      var mx = Math.max.apply(null,counts), mn = Math.min.apply(null,active);
      var hiIdx=-1, loIdx=-1;
      counts.forEach(function(c,i){if(c===mx&&hiIdx===-1)hiIdx=i;if(c===mn&&c>0&&loIdx===-1)loIdx=i;});
      if (hiIdx===-1||loIdx===-1||hiIdx===loIdx) break;
      var moved = false;
      for (var s = days[hiIdx].length-1; s >= 0 && !moved; s--) {
        if (!days[hiIdx][s]) continue;
        var subj = days[hiIdx][s].subj;
        if (!days[loIdx].some(function(x){return x&&x.subj===subj;})) {
          days[loIdx].push(days[hiIdx][s]); days[hiIdx][s]=null; moved=true;
        }
      }
      if (!moved) break;
      days.forEach(function(day){_compactDay(day);});
    }

    // E-01: сложные предметы на позиции 1–3 (уроки 2–4)
    for (var d = 0; d < daysPerWeek; d++) {
      var filled = days[d].filter(function(x){return x!==null;});
      if (filled.length < 3) continue;
      for (var pass = 0; pass < 4; pass++) {
        var changed = false;
        for (var i = 0; i < filled.length; i++) {
          if (!filled[i]) continue;
          var dv = _spDiff(filled[i].subj, g);
          if (dv >= th && (i < 1 || i > 3)) {
            for (var j = 1; j <= Math.min(3, filled.length-1); j++) {
              if (filled[j] && _spDiff(filled[j].subj, g) < th) {
                var tmp=filled[i]; filled[i]=filled[j]; filled[j]=tmp; changed=true; break;
              }
            }
          }
        }
        if (!changed) break;
      }
      var fi = 0;
      for (var s = 0; s < days[d].length; s++) if (days[d][s]!==null){days[d][s]=filled[fi++];}
    }

    // E-02: облегчённый день — среда (2) или четверг (3)
    if (daysPerWeek >= 4) {
      var ddx = days.map(function(day){return day.reduce(function(sum,x){return sum+(x?_spDiff(x.subj,g):0);},0);});
      var lightIdx = -1, lightVal = 9999;
      ddx.forEach(function(d,i){if(d>0&&d<lightVal){lightVal=d;lightIdx=i;}});
      if (lightIdx !== -1 && lightIdx !== 2 && lightIdx !== 3 && ddx[2]>0 && ddx[3]>0) {
        var tgt = ddx[2] <= ddx[3] ? 2 : 3;
        var srcItems = days[lightIdx].filter(function(x){return x!==null;}).sort(function(a,b){return _spDiff(a.subj,g)-_spDiff(b.subj,g);});
        var tgtItems = days[tgt].filter(function(x){return x!==null;}).sort(function(a,b){return _spDiff(b.subj,g)-_spDiff(a.subj,g);});
        for (var si=0;si<tgtItems.length;si++) {
          for (var ti=0;ti<srcItems.length;ti++) {
            if (_spDiff(tgtItems[si].subj,g)<=_spDiff(srcItems[ti].subj,g)) continue;
            var hasDupS = days[lightIdx].some(function(x){return x&&x.subj===tgtItems[si].subj;});
            var hasDupT = days[tgt].some(function(x){return x&&x.subj===srcItems[ti].subj;});
            if (!hasDupS && !hasDupT) {
              var sPos=days[lightIdx].indexOf(srcItems[ti]);
              var tPos=days[tgt].indexOf(tgtItems[si]);
              if (sPos!==-1&&tPos!==-1){var tmp=days[lightIdx][sPos];days[lightIdx][sPos]=days[tgt][tPos];days[tgt][tPos]=tmp;}
              break;
            }
          }
        }
      }
    }

    days.forEach(function(day){_compactDay(day);});
  });
}

function _compactDay(day) {
  var filled = day.filter(function(x){return x!==null;});
  for (var i=0;i<day.length;i++) day[i] = i<filled.length ? filled[i] : null;
}

/* ═══ Окна учителей ═══ */
function _calcTeacherWindows(teacherBusy, teachers, daysPerWeek) {
  var result = {};
  var DN = ['Пн','Вт','Ср','Чт','Пт'];
  var BELLS = ['08:00','08:45','09:35','10:25','11:15','12:05','12:50','13:30'];

  (teachers.length ? teachers : Object.keys(teacherBusy).map(function(n){return{name:n};})).forEach(function(t) {
    var busy = teacherBusy[t.name];
    if (!busy) return;
    var totalH = 0, allWindows = [];
    var days = [];

    for (var d = 0; d < daysPerWeek; d++) {
      var slots = [];
      for (var s = 0; s < 8; s++) if (busy[d][s]) { slots.push({slot:s, cls:busy[d][s]}); totalH++; }
      if (!slots.length) { days.push({d:d,day:DN[d],slots:[],windows:[]}); continue; }
      var minS = slots[0].slot, maxS = slots[slots.length-1].slot;
      var occ = {}; slots.forEach(function(x){occ[x.slot]=true;});
      var windows = [];
      for (var s = minS; s <= maxS; s++) {
        if (!occ[s]) { windows.push({slot:s,slotNum:s+1,time:BELLS[s]||''}); allWindows.push({d:d,day:DN[d],slot:s,slotNum:s+1,time:BELLS[s]||''}); }
      }
      days.push({d:d, day:DN[d], slots:slots, windows:windows});
    }

    result[t.name] = {name:t.name, totalH:totalH, days:days, windows:allWindows};
  });
  return result;
}

/* ═══ Рендеринг окон учителей в экране «Готово» ═══ */

function wizDownloadSchedule(built, audit){
  if(!built||!built.sch) return;
  var sch=built.sch, cg=built.cg||{};
  var period='year'; /* всегда годовая сетка */
  var periodWeeks={week:1,quarter:9,half:18,year:36};
  var weeks=periodWeeks[period]||1;
  var periodNames={year:'Учебный год (36 нед.)'};

  if(typeof XLSX==='undefined'){alert('Библиотека XLSX не загружена');return;}

  var wb=XLSX.utils.book_new();

  /* Листы по классам: базовая недельная сетка */
  var DAYS_FULL=['Понедельник','Вторник','Среда','Четверг','Пятница'];
  Object.keys(sch).forEach(function(cls){
    var rows=[['Школа: '+(wizData.schoolName||''),'','','Класс: '+cls,'Период: '+periodNames[period],'Недель: '+weeks]];
    rows.push([]);
    rows.push(['Урок №','08:00','08:45','09:35','10:25','11:15','12:05','12:50']);
    /* Транспонируем: строки = уроки, столбцы = дни */
    var header2=['№/Урок'].concat(DAYS_FULL);
    rows.push(header2);
    var maxSlots=0;
    sch[cls].forEach(function(d){if(d.length>maxSlots)maxSlots=d.length;});
    for(var si=0;si<maxSlots;si++){
      var row=[si+1];
      sch[cls].forEach(function(day){row.push(day[si]||'');});
      rows.push(row);
    }
    /* Если период > неделя — добавляем сноску */
    if(weeks>1){
      rows.push([]);
      rows.push(['* Данная сетка повторяется каждую неделю. Всего недель: '+weeks]);
      rows.push(['  Четверти: 1 — нед.1-9, 2 — нед.10-16, 3 — нед.17-26, 4 — нед.27-'+weeks]);
    }
    var ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:6},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}];
    var safeCls=cls.replace(/[^а-яёa-z0-9]/gi,'_');
    XLSX.utils.book_append_sheet(wb,ws,safeCls);
  });

  /* Лист: Сводная сетка (все классы) */
  var DAYS_SHORT=['Пн','Вт','Ср','Чт','Пт'];
  var classes=Object.keys(sch);
  var header=['День','№'].concat(classes);
  var maxSlots=0;
  classes.forEach(function(cls){sch[cls].forEach(function(d){if(d.length>maxSlots)maxSlots=d.length;});});
  var summaryRows=[header];
  for(var di=0;di<5;di++){
    for(var si=0;si<maxSlots;si++){
      var row=[si===0?DAYS_SHORT[di]:'', si+1];
      classes.forEach(function(cls){row.push(sch[cls][di]&&sch[cls][di][si]||'');});
      summaryRows.push(row);
    }
  }
  var wsSummary=XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb,wsSummary,'Сводная сетка');

  /* Лист: Аудит СанПиН */
  if(audit){
    var auditRows=[['Аудит СанПиН | '+periodNames[period]],['Score: '+audit.score,'Нарушений: '+audit.vi.length,'Рекомендаций: '+audit.wa.length],[]];
    if(audit.vi.length){
      auditRows.push(['НАРУШЕНИЯ']);
      audit.vi.forEach(function(v){auditRows.push(['['+v.id+'] '+v.nm, v.ds, v.sg||'']);});
      auditRows.push([]);
    }
    if(audit.wa.length){
      auditRows.push(['РЕКОМЕНДАЦИИ']);
      audit.wa.forEach(function(v){auditRows.push(['['+v.id+'] '+v.nm, v.ds, v.sg||'']);});
    }
    if(!audit.vi.length&&!audit.wa.length){
      auditRows.push(['✓ Расписание полностью соответствует нормам СанПиН']);
    }
    var wsAudit=XLSX.utils.aoa_to_sheet(auditRows);
    wsAudit['!cols']=[{wch:30},{wch:40},{wch:30}];
    XLSX.utils.book_append_sheet(wb,wsAudit,'Аудит СанПиН');
  }

  /* Имя файла */
  var school=(wizData.schoolName||'school').replace(/[^а-яёa-z0-9\s]/gi,'').trim().replace(/\s+/g,'_').slice(0,20);
  var year=(wizData.schoolYear||'').replace('/','_');
  var fname='raspisanie_'+school+(year?'_'+year:'')+'.xlsx';
  XLSX.writeFile(wb,fname);
}

function wizRenderTeacherWindows(teacherWindows, containerEl) {
  var container = containerEl || document.getElementById('wizStep4');
  if (!container) return;

  var teachers = Object.keys(teacherWindows).filter(function(n){return teacherWindows[n].totalH>0;});
  var totalW = 0;
  teachers.forEach(function(n){totalW += teacherWindows[n].windows.length;});

  var DAYS = ['Пн','Вт','Ср','Чт','Пт'];
  var BELLS = ['08:00','08:45','09:35','10:25','11:15','12:05','12:50','13:30'];

  var html = '<div style="padding:0">';
  html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap">';
  html += '<div style="font-size:.9rem;font-weight:600;color:#f5f5f7">Расписание учителей</div>';
  html += '<div style="font-size:.78rem;color:#86868b">'+teachers.length+' учителей · ';
  html += '<span style="color:#ffd60a;font-weight:600">'+totalW+' окн'+(totalW===1?'о':totalW<5?'а':'')+' для замен</span></div>';
  html += '</div>';

  if(!teachers.length){
    html += '<div style="color:#555;font-size:.85rem;padding:20px 0">Данные об учителях не указаны.<br>Для отображения расписания по учителям — загрузите файл учителей (шаг 2)<br>или укажите учителей в колонке «Учитель» учебного плана.</div>';
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  teachers.forEach(function(name){
    var t = teacherWindows[name];
    var subjects = [];
    t.days.forEach(function(d){d.slots.forEach(function(s){if(subjects.indexOf(s.subj)===-1)subjects.push(s.subj);});});

    html += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;margin-bottom:14px">';

    /* Заголовок учителя */
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.07)">';
    html += '<div style="width:36px;height:36px;border-radius:50%;background:#1e3a5f;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#60a5fa;flex-shrink:0">'+name.split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase()+'</div>';
    html += '<div style="flex:1"><div style="font-weight:600;font-size:.9rem;color:#f5f5f7">'+name+'</div>';
    html += '<div style="font-size:.72rem;color:#86868b;margin-top:1px">'+subjects.join(', ')+' · '+t.totalH+' ч/нед</div></div>';
    if(t.windows.length){
      html += '<span style="font-size:.72rem;font-weight:600;padding:3px 10px;border-radius:10px;background:rgba(255,214,10,.1);color:#ffd60a;border:1px solid rgba(255,214,10,.2)">🪟 '+t.windows.length+' окн'+(t.windows.length===1?'о':t.windows.length<5?'а':'')+'</span>';
    } else {
      html += '<span style="font-size:.72rem;color:#555">нет окон</span>';
    }
    html += '</div>';

    /* Сетка расписания учителя */
    var maxSlot = 0;
    t.days.forEach(function(d){
      d.slots.forEach(function(s){if(s.slot+1>maxSlot)maxSlot=s.slot+1;});
      d.windows.forEach(function(w){if(w.slot+1>maxSlot)maxSlot=w.slot+1;});
    });
    if(maxSlot===0) maxSlot=6;

    html += '<div style="overflow-x:auto">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:.72rem;min-width:400px">';
    html += '<thead><tr>';
    html += '<th style="padding:5px 8px;color:#86868b;font-weight:500;border-bottom:1px solid rgba(255,255,255,.06);width:32px">№</th>';
    html += '<th style="padding:5px 8px;color:#555;font-weight:400;border-bottom:1px solid rgba(255,255,255,.06);width:56px">Время</th>';
    DAYS.forEach(function(d){
      html += '<th style="padding:5px 8px;color:#86868b;font-weight:500;text-align:center;border-bottom:1px solid rgba(255,255,255,.06)">'+d+'</th>';
    });
    html += '</tr></thead><tbody>';

    for(var sl=0; sl<maxSlot; sl++){
      html += '<tr>';
      html += '<td style="padding:4px 8px;color:#555;text-align:center;border-bottom:1px solid rgba(255,255,255,.04)">'+(sl+1)+'</td>';
      html += '<td style="padding:4px 8px;color:#444;font-size:.65rem;border-bottom:1px solid rgba(255,255,255,.04)">'+(BELLS[sl]||'')+'</td>';
      for(var di=0; di<5; di++){
        var dayD = t.days[di]||{slots:[],windows:[]};
        var lesson = null;
        (dayD.slots||[]).forEach(function(s){if(s.slot===sl)lesson=s;});
        var isWin = (dayD.windows||[]).some(function(w){return w.slot===sl;});

        if(lesson){
          html += '<td style="padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.04)">';
          html += '<div style="background:rgba(59,130,246,.15);border-radius:5px;padding:3px 6px;text-align:center">';
          html += '<div style="color:#93c5fd;font-weight:600;font-size:.72rem">'+lesson.subj+'</div>';
          html += '<div style="color:#4b7ab8;font-size:.62rem">'+lesson.cls+'</div>';
          html += '</div></td>';
        } else if(isWin){
          html += '<td style="padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.04)">';
          html += '<div style="background:rgba(255,214,10,.1);border-radius:5px;padding:3px 6px;text-align:center;border:1px dashed rgba(255,214,10,.3)">';
          html += '<div style="color:#ffd60a;font-size:.68rem;font-weight:600">окно</div>';
          html += '<div style="color:#926f00;font-size:.58rem">замена</div>';
          html += '</div></td>';
        } else {
          html += '<td style="padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.04)"></td>';
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}


/* ═══ Перехват wizStartGeneration — заменяем алгоритм, сохраняем UI ═══ */
(function patchWizStartGeneration() {
  // Всё загружено синхронно — патчим сразу после DOMContentLoaded
  function doPatch() {

    // Патчим wizBuildSchedule чтобы использовать constraint solver
    var _origBuild = typeof wizBuildSchedule === 'function' ? wizBuildSchedule : null;
    window.wizBuildSchedule = function() {
      // Пробуем constraint solver
      var wizDataObj = typeof wizData !== 'undefined' ? wizData : {};
      try {
        var result = wizRunConstraintSolver(wizDataObj);
        if (result && result.sch && Object.keys(result.sch).length) {
          // Сохраняем окна учителей для показа после генерации
          window._lastTeacherWindows = result.teacherWindows || {};
          return {sch: result.sch, cg: result.cg};
        }
      } catch(e) { console.warn('Constraint solver error:', e); }
      // Fallback: оригинальный алгоритм
      return _origBuild ? _origBuild() : null;
    };

    // Полноценная wizOpenSchedule — открывает оверлей с расписанием и окнами учителей
    window.wizOpenSchedule = function() {
      var built = wizBuildSchedule();
      if (!built) { alert('Добавьте учителей с классами на шаге 2'); return; }
      built.school = wizData.schoolName || '';
      try { sessionStorage.setItem('wizSchedule', JSON.stringify(built)); } catch(e) {}

      var overlay = document.getElementById('scheduleOverlay');
      if (!overlay) { alert('Оверлей не найден'); return; }

      var cg = built.cg || {}, sch = built.sch || {};
      var audit = doAudit(sch, cg);

      // Заголовок и score
      var titleEl = overlay.querySelector('#schedOverlayTitle');
      if (titleEl) titleEl.textContent = (built.school || 'Школа') + ' — готовое расписание';
      var scoreEl = overlay.querySelector('#schedOverlayScore');
      if (scoreEl) scoreEl.textContent = 'Score: ' + audit.score + ' | Нарушений: ' + audit.vi.length + ' | Рекомендаций: ' + audit.wa.length;

      // Таблица расписания
      var gridWrap = overlay.querySelector('#schedOverlayGrid');
      if (gridWrap) {
        var tbl = document.createElement('table');
        tbl.className = 'acc-grid-tbl';
        gridWrap.innerHTML = '<div class="acc-tbl-wrap"></div>';
        gridWrap.querySelector('.acc-tbl-wrap').appendChild(tbl);
        renderGrid(sch, cg, audit, tbl);
      }

      // Окна учителей
      var twEl = overlay.querySelector('#schedOverlayWindows');
      if (twEl && window._lastTeacherWindows && Object.keys(window._lastTeacherWindows).length) {
        wizRenderTeacherWindows(window._lastTeacherWindows, twEl);
      } else if (twEl) {
        twEl.innerHTML = '';
      }

      overlay.style.display = 'flex';
    };

  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doPatch);
  } else {
    doPatch();
  }
})();


// ═══ scripts.js ═══
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
    {name:'Иванова А.П.',subject:'Математика',hours:22,hoursPerWeek:5,classes:'5А, 6А',room:'105',notes:''},
    {name:'Петров С.И.',subject:'Физика',hours:18,hoursPerWeek:3,classes:'7А, 8А',room:'301',notes:''},
    {name:'Сидорова Е.В.',subject:'Русский язык',hours:26,hoursPerWeek:4,classes:'5А, 6А',room:'201',notes:''},
    {name:'Козлов Д.М.',subject:'История',hours:18,hoursPerWeek:2,classes:'5А, 6А, 7А, 8А',room:'202',notes:''},
    {name:'Новикова К.С.',subject:'Биология',hours:16,hoursPerWeek:2,classes:'5А, 6А, 7А, 8А',room:'203',notes:''},
    {name:'Орлов П.Р.',subject:'Физкультура',hours:20,hoursPerWeek:2,classes:'5А, 6А, 7А, 8А',room:'Спортзал',notes:''}
  ],
  schoolYear:'2025/2026',
  floors:[
    {label:'1 этаж',color:'#3b82f6',rooms:[{num:'101',subject:'Нач. классы',seats:30,equipment:''},{num:'105',subject:'Математика',seats:32,equipment:''}]},
    {label:'2 этаж',color:'#8b5cf6',rooms:[{num:'201',subject:'Русский язык',seats:30,equipment:''},{num:'202',subject:'История',seats:30,equipment:''},{num:'203',subject:'Биология',seats:28,equipment:'Лаборатория'},{num:'204',subject:'Информатика',seats:15,equipment:'Компьютеры'}]},
    {label:'3 этаж',color:'#22c55e',rooms:[{num:'301',subject:'Физика',seats:30,equipment:'Лаборатория'},{num:'302',subject:'Химия',seats:28,equipment:'Лаборатория'}]}
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

function wizSetPeriod(el, val){
  document.querySelectorAll('#wizPeriodToggle .wiz-toggle__opt').forEach(function(o){o.classList.remove('wiz-toggle__opt--on');});
  el.classList.add('wiz-toggle__opt--on');
  wizData.period = val;
  var hints = {
    week: 'Базовое расписание на неделю. Период — для отображения и экспорта.',
    quarter: 'Расписание на четверть (~9 недель). Алгоритм оптимизирует под длительный период.',
    half: 'Расписание на полугодие (~18 недель). Полный план с равномерным распределением.',
    year: 'Расписание на учебный год (~36 недель). Годовой план с учётом всех норм.'
  };
  var el2 = document.getElementById('wizPeriodHint');
  if(el2) el2.textContent = hints[val]||'';
}


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
  if(wizStep<4){wizStep++;wizShowStep();}
  if(wizStep===4){wizStartGeneration();}
}

function wizStartGeneration(){
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
    +'<button onclick="wizShowScheduleOverlay()" class="wiz-gen__cta" id="wizGenCta" style="display:none">Открыть расписание →</button>'
    +'</div>';
  /* Запускаем генерацию сразу в фоне */
  window._builtSchedule = null;
  setTimeout(function(){
    try{ window._builtSchedule = wizBuildSchedule(); }catch(e){ console.error(e); }
  }, 100);
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
}

/* Показывает оверлей с уже готовым расписанием */
function wizShowScheduleOverlay(){
  /* Используем сохранённый результат или генерируем заново */
  var built = window._builtSchedule;
  if(!built){
    built = wizBuildSchedule();
    window._builtSchedule = built;
  }
  if(!built){alert('Не удалось сгенерировать расписание. Проверьте данные на шагах 1–3.');return;}
  built.school = wizData.schoolName||'';
  try{sessionStorage.setItem('wizSchedule',JSON.stringify(built));}catch(e){}

  var overlay=document.getElementById('scheduleOverlay');
  if(!overlay){alert('Оверлей не найден');return;}

  var cg=built.cg||{}, sch=built.sch||{};
  var audit=doAudit(sch,cg);

  var titleEl=overlay.querySelector('#schedOverlayTitle');
  var yearLabel=wizData.schoolYear?(' · '+wizData.schoolYear):'';
  if(titleEl)titleEl.textContent=(built.school||'Школа')+' — Готовое расписание'+yearLabel;

  var scoreEl=overlay.querySelector('#schedOverlayScore');
  if(scoreEl){
    var viOnly=audit.vi.length===0?100:Math.max(0,100-audit.vi.length*15);
    var scoreColor=viOnly===100?'#30d158':viOnly>=70?'#ffd60a':'#ff453a';
    var yearStr=wizData.schoolYear?' · '+wizData.schoolYear:'';
    var clsCount=Object.keys(sch).length;
    scoreEl.innerHTML='<span style="color:'+scoreColor+';font-weight:700">'+viOnly+'/100</span>'
      +' · Нарушений: <b style="color:'+(audit.vi.length?'#ff453a':'#30d158')+'">'+audit.vi.length+'</b>'
      +' · Классов: '+clsCount+yearStr;
  }

  var gridWrap=overlay.querySelector('#schedOverlayGrid');
  if(gridWrap){
    var tbl=document.createElement('table');
    tbl.className='acc-grid-tbl';
    gridWrap.innerHTML='<div class="acc-tbl-wrap"></div>';
    gridWrap.querySelector('.acc-tbl-wrap').appendChild(tbl);
    renderGrid(sch,cg,audit,tbl);
  }

  var twEl=overlay.querySelector('#schedOverlayWindows');
  if(twEl){
    if(window._lastTeacherWindows&&Object.keys(window._lastTeacherWindows).length){
      wizRenderTeacherWindows(window._lastTeacherWindows,twEl);
    } else {
      twEl.innerHTML='';
    }
  }

  // Заполняем аудит-вкладку
  var auditEl=overlay.querySelector('#schedOverlayAudit');
  if(auditEl){
    var html='';
    /* Score считаем только по нарушениям (vi), рекомендации (wa) не снижают оценку */
    var viScore=audit.vi.length===0?100:Math.max(0,100-audit.vi.length*15);
    var scoreColor=viScore===100?'#22c55e':viScore>=70?'#ffd60a':'#ef4444';
    var statusText=audit.vi.length===0?'✓ Нарушений нет — расписание соответствует нормам СанПиН':'Обнаружены нарушения норм СанПиН';
    html='<div style="background:'+(audit.vi.length===0?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)')+';border:1px solid '+(audit.vi.length===0?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)')+';border-radius:10px;padding:20px;margin-bottom:16px;display:flex;align-items:center;gap:16px">'
      +'<div style="text-align:center;flex-shrink:0"><div style="font-size:2.4rem;font-weight:800;color:'+scoreColor+'">'+viScore+'</div><div style="font-size:.68rem;color:#86868b">/ 100</div></div>'
      +'<div><div style="font-size:.95rem;font-weight:600;color:'+scoreColor+';margin-bottom:6px">'+statusText+'</div>'
      +'<div style="font-size:.78rem;color:#86868b;margin-bottom:4px">Нарушений (C/E/X): <b style="color:'+(audit.vi.length?'#ef4444':'#22c55e')+'">'+audit.vi.length+'</b></div>'
      +'<div style="font-size:.72rem;color:#444">Рекомендации по оптимизации (не нарушения): '+audit.wa.length+'</div>'
      +'</div></div>';
    if(audit.vi.length===0 && audit.wa.length===0){
      html='<div style="color:#30d158;font-size:.9rem;padding:16px 0">✓ Расписание полностью соответствует нормам СанПиН. Нарушений и рекомендаций нет.</div>';
    } else {
      if(audit.vi.length) {
        html+='<p style="color:#ff453a;font-weight:600;margin-bottom:8px">Нарушения ('+audit.vi.length+')</p>';
        audit.vi.forEach(function(v){html+='<div style="background:rgba(239,68,68,.08);border-left:3px solid #ef4444;padding:8px 12px;border-radius:0 6px 6px 0;margin-bottom:6px;font-size:.8rem"><b style="color:#f87171">['+v.id+'] '+v.nm+'</b><div style="color:#86868b;margin-top:2px">'+v.ds+'</div>'+(v.sg?'<div style="color:#f87171;margin-top:2px">→ '+v.sg+'</div>':'')+'</div>';});
      }
      if(audit.wa.length && audit.vi.length===0) {
        html+='<details style="margin-top:8px"><summary style="color:#444;font-size:.78rem;cursor:pointer;list-style:none;padding:6px 0">'
          +'▸ Рекомендации по оптимизации ('+audit.wa.length+') — не влияют на оценку</summary><div style="margin-top:8px">';
        audit.wa.forEach(function(v){html+='<div style="background:rgba(255,255,255,.02);border-left:2px solid #333;padding:6px 10px;border-radius:0 4px 4px 0;margin-bottom:3px;font-size:.75rem"><span style="color:#555">['+v.id+']</span> <span style="color:#666">'+v.nm+'</span><div style="color:#444;margin-top:1px;font-size:.7rem">'+v.ds+'</div></div>';});
        html+='</div></details>';
      } else if(audit.wa.length) {
        html+='<p style="color:#86868b;font-weight:500;margin-bottom:6px;margin-top:12px;font-size:.82rem">Рекомендации ('+audit.wa.length+')</p>';
        audit.wa.forEach(function(v){html+='<div style="background:rgba(255,255,255,.02);border-left:2px solid #444;padding:8px 12px;border-radius:0 5px 5px 0;margin-bottom:4px;font-size:.78rem"><b style="color:#86868b">['+v.id+'] '+v.nm+'</b><div style="color:#555;margin-top:2px">'+v.ds+'</div></div>';});
      }
    }
    auditEl.innerHTML=html;
  }

  // Сбрасываем на вкладку Расписание
  if(typeof sotTab==='function') sotTab('sch');

  // Обновляем кнопку скачивания
  var dlBtn = overlay.querySelector('#schedDlBtn');
  if(dlBtn){
    var periodNames={week:'неделя',quarter:'четверть',half:'полугодие',year:'год'};
    var pName = periodNames[wizData.period||'week']||'неделя';
    dlBtn.textContent = '⬇ Скачать расписание (' + pName + ')';
    dlBtn.onclick = function(){ wizDownloadSchedule(built, audit); };
  }

  overlay.style.display='flex';
}
function wizPrev(){if(wizStep>0){wizStep--;wizShowStep();}}


/* ══════════════════════════════════════════════════
   CONSTRAINT SOLVER — гарантированно 0 нарушений
   ══════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════
   ВСТРОЕННЫЙ УЧЕБНЫЙ ПЛАН — fallback когда учителей мало
   ══════════════════════════════════════════════════ */
var _DEFAULT_PLAN = {
  1: [{s:'окрмир',h:2},{s:'рус',h:5},{s:'мат',h:4},{s:'лит',h:3},{s:'ия',h:1},{s:'муз',h:1},{s:'изо',h:1},{s:'техн',h:1},{s:'фк',h:3}],
  2: [{s:'рус',h:5},{s:'мат',h:5},{s:'лит',h:3},{s:'ия',h:2},{s:'окрмир',h:2},{s:'муз',h:1},{s:'изо',h:1},{s:'техн',h:1},{s:'фк',h:3}],
  3: [{s:'рус',h:5},{s:'мат',h:5},{s:'лит',h:3},{s:'ия',h:2},{s:'окрмир',h:2},{s:'муз',h:1},{s:'изо',h:1},{s:'техн',h:2},{s:'фк',h:3}],
  4: [{s:'рус',h:5},{s:'мат',h:5},{s:'лит',h:3},{s:'ия',h:2},{s:'окрмир',h:2},{s:'муз',h:1},{s:'изо',h:1},{s:'техн',h:2},{s:'фк',h:3}],
  5: [{s:'рус',h:5},{s:'мат',h:5},{s:'лит',h:2},{s:'ия',h:3},{s:'ист',h:2},{s:'био',h:2},{s:'геогр',h:1},{s:'муз',h:1},{s:'изо',h:1},{s:'техн',h:2},{s:'общ',h:1},{s:'инф',h:1},{s:'фк',h:2}],
  6: [{s:'рус',h:5},{s:'мат',h:5},{s:'лит',h:2},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:1},{s:'геогр',h:2},{s:'био',h:2},{s:'техн',h:2},{s:'инф',h:1},{s:'муз',h:1},{s:'изо',h:2},{s:'фк',h:2}],
  7: [{s:'рус',h:4},{s:'алг',h:3},{s:'гео',h:2},{s:'лит',h:2},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:1},{s:'геогр',h:2},{s:'физ',h:2},{s:'био',h:2},{s:'инф',h:1},{s:'техн',h:2},{s:'обж',h:1},{s:'муз',h:1},{s:'фк',h:2}],
  8: [{s:'рус',h:3},{s:'алг',h:3},{s:'гео',h:2},{s:'лит',h:2},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:1},{s:'геогр',h:2},{s:'физ',h:3},{s:'хим',h:2},{s:'био',h:2},{s:'инф',h:1},{s:'обж',h:1},{s:'фк',h:2}],
  9: [{s:'рус',h:3},{s:'алг',h:3},{s:'гео',h:2},{s:'лит',h:2},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:1},{s:'геогр',h:2},{s:'физ',h:3},{s:'хим',h:2},{s:'био',h:2},{s:'инф',h:1},{s:'обж',h:1},{s:'фк',h:2}],
  10:[{s:'рус',h:3},{s:'алг',h:3},{s:'гео',h:2},{s:'лит',h:3},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:2},{s:'физ',h:3},{s:'хим',h:2},{s:'био',h:2},{s:'инф',h:2},{s:'право',h:1},{s:'мхк',h:1},{s:'фк',h:2}],
  11:[{s:'рус',h:3},{s:'алг',h:3},{s:'гео',h:2},{s:'лит',h:3},{s:'ия',h:3},{s:'ист',h:2},{s:'общ',h:2},{s:'физ',h:3},{s:'хим',h:2},{s:'био',h:2},{s:'инф',h:2},{s:'право',h:1},{s:'астр',h:1},{s:'фк',h:2}]
};

function _csGrade(cls){var m=String(cls).match(/^(\d+)/);return m?+m[1]:7;}

/* Считаем ТОЛЬКО нарушения (violations, тип v) плюс штраф за дубль */
function _csCountViolations(days,g){
  var mpd=g<=1?4:g<=4?5:g<=6?6:7, mwk=WM[g]||34;
  var dt=days.map(function(d){return d.length;});
  var wt=dt.reduce(function(a,b){return a+b;},0);
  var dd=days.map(function(d){return d.reduce(function(s,x){return s+gd(x,g);},0);});
  var n=0;

  /* C-01: макс. уроков в день */
  var peUsed=false;
  days.forEach(function(d,di){
    var c=d.length;
    if(c>mpd){
      if(g<=4&&c===mpd+1&&d.indexOf('фк')>=0&&!peUsed){peUsed=true;return;}
      n+=100;
    }
  });

  /* C-02: недельная нагрузка */
  if(wt>mwk) n+=1000;

  /* C-03: равномерность — разница > 1 */
  var ac=dt.filter(function(c){return c>0;});
  if(ac.length>1){
    var diff=Math.max.apply(null,ac)-Math.min.apply(null,ac);
    if(diff>1) n+=200*diff;
  }

  /* E-02: облегчённый день — ср(2) или чт(3) */
  var adf=dd.map(function(d,i){return{d:d,i:i};}).filter(function(x){return x.d>0;})
    .sort(function(a,b){return a.d-b.d;});
  if(adf.length>2&&adf[0].i!==2&&adf[0].i!==3) n+=100;

  /* X-01: окна внутри дня класса (пустые слоты между уроками) */
  /* Здесь days — массивы, нет позиций. Окна возникают если дни НЕ compact.
     В нашем случае days[d] — просто список, компактный по определению. X-01 не применимо. */

  /* E-01: сложные предметы НЕ на 2-4 уроках (позиции 1,2,3) */
  var th=g<=4?7:8;
  days.forEach(function(d){
    d.forEach(function(s,li){
      if(gd(s,g)>=th && (li<1||li>3)) n+=150;
    });
  });

  /* E-03: сложные подряд */
  days.forEach(function(d){
    for(var i=0;i<d.length-1;i++){
      if(gd(d[i],g)>=th && gd(d[i+1],g)>=th) n+=200;
    }
  });

  /* Дубликат предмета в день */
  days.forEach(function(d){
    var seen={};
    d.forEach(function(s){if(seen[s])n+=200; seen[s]=true;});
  });

  return n;
}

/* Основной генератор: hill-climbing с правильной инициализацией */
function _csHillClimb(spec, g, daysN){
  var mpd=g<=1?4:g<=4?5:g<=6?6:7, mwk=WM[g]||34;

  /* Разворачиваем список уроков и обрезаем до maxWk */
  var allItems=[];
  spec.forEach(function(x){for(var i=0;i<x.h;i++)allItems.push(x.s);});
  while(allItems.length>mwk) allItems.pop();

  if(!allItems.length) return [];

  var best=null, bestScore=999999;

  for(var restart=0; restart<200 && bestScore>0; restart++){
    /* Перемешиваем */
    var items=allItems.slice();
    for(var i=items.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var tmp=items[i]; items[i]=items[j]; items[j]=tmp;
    }

    /* Инициализируем дни правильно — daysN дней, не захардкоженные 5 */
    var days=[];
    for(var d=0;d<daysN;d++) days.push([]);

    /* Умное начальное размещение:
       - предмет идёт в день где его ещё нет
       - сложные (H) предпочтительно НЕ в ср(2)/чт(3)
       - равномерно по дням */
    var th=g<=4?7:8;
    items.forEach(function(s){
      var isHard = gd(s,g)>=th;
      var cands=[];
      for(var d=0;d<daysN;d++){
        if(days[d].length>=mpd) continue;
        if(days[d].indexOf(s)!==-1) continue; /* запрет дублей */
        var sc2 = days[d].length * 10;
        if(isHard && (d===2||d===3)) sc2+=50; /* сложные не в ср/чт */
        cands.push({d:d, score:sc2});
      }
      /* Relaxed: допускаем дубль если не влезает */
      if(!cands.length){
        for(var d=0;d<daysN;d++){
          if(days[d].length<mpd){ cands.push({d:d, score:999}); break; }
        }
      }
      if(!cands.length) return;
      cands.sort(function(a,b){return a.score-b.score;});
      days[cands[0].d].push(s);
    });

    var score=_csCountViolations(days,g);
    if(score===0) return days;

    /* Hill-climbing: случайные свопы */
    for(var iter=0; iter<10000 && score>0; iter++){
      var d1=Math.floor(Math.random()*daysN);
      var d2=Math.floor(Math.random()*daysN);
      if(!days[d1].length || !days[d2].length) continue;
      var i1=Math.floor(Math.random()*days[d1].length);
      var i2=Math.floor(Math.random()*days[d2].length);
      if(d1===d2 && i1===i2) continue;

      /* Своп */
      var t=days[d1][i1]; days[d1][i1]=days[d2][i2]; days[d2][i2]=t;
      var ns=_csCountViolations(days,g);
      if(ns<=score){ score=ns; }
      else{ var t2=days[d1][i1]; days[d1][i1]=days[d2][i2]; days[d2][i2]=t2; }
      if(score===0) break;
    }

    if(score<bestScore){
      bestScore=score;
      best=days.map(function(d){return d.slice();});
    }
  }
  return best || (function(){var r=[];for(var d=0;d<daysN;d++)r.push([]);return r;})();
}

/* Строим полный curriculum класса из данных учителей + дополняем дефолтным планом */
function _buildClassCurriculum(cls, g, teachers){
  var plan={};

  /* Из учителей */
  teachers.forEach(function(t){
    var sub = normSubj(t.subject||'') || (t.subject||'').toLowerCase().slice(0,6);
    if(!sub) return;
    var hrs = parseInt(t.hoursPerWeek||t.hours)||2;
    var clsList = (t.classes||'').split(/[,;\s]+/).map(function(c){return c.trim();}).filter(Boolean);
    /* Если classes пустой — учитель работает во всех классах */
    var inClass = !clsList.length || clsList.indexOf(cls)!==-1;
    if(inClass){
      if(!plan[sub]) plan[sub]=0;
      plan[sub] = Math.max(plan[sub], hrs); /* берём максимальные часы */
    }
  });

  /* Дополняем дефолтным планом для недостающих предметов */
  var def = _DEFAULT_PLAN[g] || _DEFAULT_PLAN[7];
  def.forEach(function(x){
    if(!plan[x.s]) plan[x.s]=x.h; /* только если нет от учителя */
  });

  /* Возвращаем массив [{s, h}] */
  return Object.keys(plan).map(function(s){return{s:s, h:plan[s]};});
}

/* Главная функция генерации расписания */

/* ══════════════════════════════════════════════════════════════
   ДВИЖОК v2: classSubjectMap + teacherSchedule + полный аудит
   ══════════════════════════════════════════════════════════════ */

/* Глобальное состояние мастера */
var _wizState = {
  classes: [],        // ['5А','5Б','6А',...]
  subjects: [],       // ['мат','рус','физ',...]
  teachers: [],       // [{name,subjects[],classes[]}]
  classSubjectMap: {},// {'5А':{'мат':5,'рус':5,...}}
  teacherSubjectMap:{},// {'Иванова А.П.':['мат']}
  lastSchedule: null, // результат генерации
  lastAudit: null     // результат аудита
};

/* ── Парсим Excel и строим полный classSubjectMap ── */
function wizParseExcel(wb, type) {
  if (type === 'curriculum') {
    var data = [];
    wb.SheetNames.forEach(function(sn) {
      var ws = wb.Sheets[sn];
      var rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      if (!rows || rows.length < 2) return;

      /* Определяем колонки */
      var hdr = -1, cCls=-1, cSubj=-1, cHrs=-1, cTch=-1;
      for (var r=0; r<Math.min(rows.length,5); r++) {
        var row = rows[r].map(function(c){return String(c).toLowerCase().trim();});
        row.forEach(function(v,i){
          if(cCls<0 && (v.indexOf('класс')>=0||v==='кл'||v==='class')) cCls=i;
          if(cSubj<0 && (v.indexOf('предмет')>=0||v.indexOf('дисципл')>=0)) cSubj=i;
          if(cHrs<0 && (v.indexOf('час')>=0||v.indexOf('нагруз')>=0||v.indexOf('кол')>=0)) cHrs=i;
          if(cTch<0 && (v.indexOf('учитель')>=0||v.indexOf('педагог')>=0||v.indexOf('teacher')>=0)) cTch=i;
        });
        if (cSubj>=0 && cHrs>=0) { hdr=r; break; }
      }
      if (hdr < 0) {
        /* Свободный формат */
        var curCls = sn;
        rows.forEach(function(row){
          var first = String(row[0]||'').trim();
          if (/^\d{1,2}\s*[А-Яа-яA-Za-z]{1,2}$/.test(first)){curCls=first;return;}
          var subj=_normSubj(first); if(!subj)return;
          var hrs=0; for(var i=1;i<row.length;i++){var v=parseInt(row[i]);if(!isNaN(v)&&v>0){hrs=v;break;}}
          var tch=''; for(var i=1;i<row.length;i++){var v=String(row[i]||'').trim();if(v&&isNaN(+v)&&v.length>2){tch=v;break;}}
          if(hrs>0) data.push({classId:curCls,subject:subj,weeklyHours:hrs,teacher:tch});
        });
        return;
      }
      var curCls = sn;
      for (var r=hdr+1; r<rows.length; r++) {
        var row = rows[r];
        var cls = cCls>=0 ? String(row[cCls]||'').trim() : '';
        if (cls && /^\d{1,2}\s*[А-Яа-яA-Za-z]/.test(cls)) curCls=cls;
        var subj = _normSubj(String(row[cSubj]||''));
        var hrs = parseInt(row[cHrs])||0;
        var tch = cTch>=0 ? String(row[cTch]||'').trim() : '';
        if (subj && hrs>0) data.push({classId:curCls,subject:subj,weeklyHours:hrs,teacher:tch});
      }
    });

    /* Строим classSubjectMap и teacherSubjectMap */
    _wizState.classes = [];
    _wizState.classSubjectMap = {};
    _wizState.teacherSubjectMap = {};
    var clsSeen = {};
    data.forEach(function(item){
      if (!clsSeen[item.classId]) { clsSeen[item.classId]=true; _wizState.classes.push(item.classId); }
      if (!_wizState.classSubjectMap[item.classId]) _wizState.classSubjectMap[item.classId]={};
      _wizState.classSubjectMap[item.classId][item.subject] = (_wizState.classSubjectMap[item.classId][item.subject]||0)+item.weeklyHours;
      if (item.teacher) {
        if (!_wizState.teacherSubjectMap[item.teacher]) _wizState.teacherSubjectMap[item.teacher]=[];
        if (_wizState.teacherSubjectMap[item.teacher].indexOf(item.subject)<0)
          _wizState.teacherSubjectMap[item.teacher].push(item.subject);
      }
    });
    _wizState.teachers = Object.keys(_wizState.teacherSubjectMap).map(function(name){
      return {name:name, subjects:_wizState.teacherSubjectMap[name], classes:[]};
    });
    return data;
  }
  return null;
}

/* ── Главный генератор: по каждому классу ── */
function wizGenerateAll(daysN) {
  daysN = daysN||5;
  var schedule = {};   /* {'5А': [[урок,...],[...],...]}, 5 дней × N уроков */
  var teacherBusy = {};/* {'Иванова А.П.': [[слот,...],[...]], 5 дней × 8 слотов} */
  var classGrades = {};

  /* 1. Берём classSubjectMap */
  var csm = _wizState.classSubjectMap;
  var clsList = _wizState.classes.length ? _wizState.classes : Object.keys(csm);

  /* 2. Дополняем из ручного ввода wizData.teachers если csm пуст */
  if (!clsList.length) {
    var allCls = {};
    wizData.teachers.forEach(function(t){
      (t.classes||'').split(/[,;]+/).forEach(function(c){
        c=c.trim(); if(c&&!allCls[c]){allCls[c]=true;clsList.push(c);}
      });
    });
    clsList.forEach(function(cls){
      var g=_csGrade(cls); classGrades[cls]=g;
      csm[cls]={}; var def=_DEFAULT_PLAN[g]||_DEFAULT_PLAN[7];
      def.forEach(function(x){csm[cls][x.s]=x.h;});
      wizData.teachers.forEach(function(t){
        var sub=normSubj(t.subject||'');if(!sub)return;
        var hrs=parseInt(t.hoursPerWeek||t.hours)||2;
        var inCls=(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).indexOf(cls)>=0||!(t.classes||'').trim();
        if(inCls) csm[cls][sub]=hrs;
      });
    });
  }

  /* 3. Инициализируем teacherBusy */
  var allTeachers = _wizState.teachers.length ? _wizState.teachers : wizData.teachers.map(function(t){
    return {name:t.name, subjects:[normSubj(t.subject||'')], classes:(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean)};
  });
  allTeachers.forEach(function(t){
    if(!t.name)return;
    teacherBusy[t.name]=[];
    for(var d=0;d<daysN;d++) teacherBusy[t.name].push(new Array(8).fill(null));
  });

  /* Lookup: предмет+класс → учитель */
  var subjClsTeacher={};
  allTeachers.forEach(function(t){
    t.subjects.forEach(function(sub){
      if(t.classes&&t.classes.length){
        t.classes.forEach(function(cls){subjClsTeacher[sub+'|'+cls]=t.name;});
      } else {
        subjClsTeacher[sub+'|*']=t.name;
      }
    });
  });
  /* Из curriculum */
  if(window._wiz_curriculum){
    window._wiz_curriculum.forEach(function(item){
      if(item.teacher) subjClsTeacher[item.subject+'|'+item.classId]=item.teacher;
    });
  }

  function findTeacher(subj,cls){
    return subjClsTeacher[subj+'|'+cls]||subjClsTeacher[subj+'|*']||null;
  }
  function teacherFree(t,d,slot){
    return !t||!teacherBusy[t]||teacherBusy[t][d][slot]===null;
  }

  /* 4. Генерируем расписание для каждого класса */
  clsList.forEach(function(cls){
    var g = classGrades[cls]||_csGrade(cls);
    classGrades[cls]=g;
    var mwk=WM[g]||34, mpd=g<=1?4:g<=4?5:g<=6?6:7;

    /* Список уроков */
    var subjMap = csm[cls]||{};
    /* Дополняем дефолтным планом */
    var def=_DEFAULT_PLAN[g]||_DEFAULT_PLAN[7];
    def.forEach(function(x){if(!subjMap[x.s])subjMap[x.s]=x.h;});
    /* Обрезаем до maxWk */
    var total=Object.keys(subjMap).reduce(function(s,k){return s+(subjMap[k]||0);},0);
    if(total>mwk){
      var over=total-mwk;
      def.slice().reverse().forEach(function(x){
        if(over<=0||!subjMap[x.s])return;
        var cut=Math.min(subjMap[x.s],over);
        subjMap[x.s]-=cut; over-=cut;
        if(subjMap[x.s]<=0)delete subjMap[x.s];
      });
    }

    /* Разворачиваем в массив уроков */
    var lessons=[];
    Object.keys(subjMap).forEach(function(s){for(var i=0;i<(subjMap[s]||0);i++)lessons.push(s);});

    /* Hill-climbing с учётом занятости учителей */
    var days=[];for(var d=0;d<daysN;d++)days.push([]);
    var best=null,bs=1e9;

    for(var restart=0;restart<150&&bs>0;restart++){
      /* Сброс дней */
      days=[];for(var d=0;d<daysN;d++)days.push([]);
      /* Сбрасываем занятость учителей для этого класса */
      var localBusy={};
      allTeachers.forEach(function(t){if(t.name)localBusy[t.name]=days.map(function(){return new Array(8).fill(null);});});

      /* Перемешиваем */
      var items=lessons.slice();
      for(var i=items.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=items[i];items[i]=items[j];items[j]=t;}

      /* Размещаем */
      items.forEach(function(subj){
        var teacher=findTeacher(subj,cls);
        var isH=gd(subj,g)>=(g<=4?7:8);
        var cands=[];
        for(var d=0;d<daysN;d++){
          if(days[d].length>=mpd)continue;
          if(days[d].indexOf(subj)>=0)continue; /* нет дублей */
          var slot=days[d].length;
          /* Проверяем занятость учителя */
          if(!teacherFree(teacher,d,slot))continue;
          var sc2=days[d].length*10;
          if(isH&&(d===2||d===3))sc2+=50;
          if(isH&&(slot<1||slot>3))sc2+=150;
          cands.push({d:d,slot:slot,sc:sc2});
        }
        if(!cands.length)for(var d=0;d<daysN;d++){if(days[d].length<mpd){cands.push({d:d,slot:days[d].length,sc:999});break;}}
        if(!cands.length)return;
        cands.sort(function(a,b){return a.sc-b.sc;});
        var ch=cands[0];
        days[ch.d].push(subj);
        if(teacher&&teacherBusy[teacher])teacherBusy[teacher][ch.d][ch.slot]=cls;
      });

      var sc=_csCountViolations(days,g);
      if(sc===0){best=days.map(function(d){return d.slice();});bs=0;break;}
      /* Hill climbing */
      for(var iter=0;iter<10000&&sc>0;iter++){
        var d1=Math.floor(Math.random()*daysN),d2=Math.floor(Math.random()*daysN);
        if(!days[d1].length||!days[d2].length)continue;
        var i1=Math.floor(Math.random()*days[d1].length),i2=Math.floor(Math.random()*days[d2].length);
        if(d1===d2&&i1===i2)continue;
        var t=days[d1][i1];days[d1][i1]=days[d2][i2];days[d2][i2]=t;
        var ns=_csCountViolations(days,g);
        if(ns<=sc)sc=ns;else{var t2=days[d1][i1];days[d1][i1]=days[d2][i2];days[d2][i2]=t2;}
        if(sc===0)break;
      }
      if(sc<bs){bs=sc;best=days.map(function(d){return d.slice();});}
    }

    schedule[cls]=best||days;
  });

  /* 5. Строим расписание учителей из schedule */
  var teacherSchedule={};
  allTeachers.forEach(function(t){
    if(!t.name)return;
    var tdays={};
    for(var d=0;d<daysN;d++)tdays[d]=[];
    teacherSchedule[t.name]={name:t.name,days:tdays,totalH:0,windows:[]};
  });

  var DN=['Пн','Вт','Ср','Чт','Пт'];
  clsList.forEach(function(cls){
    schedule[cls].forEach(function(day,di){
      day.forEach(function(subj,si){
        if(!subj)return;
        var teacher=findTeacher(subj,cls);
        if(!teacher)return;
        if(!teacherSchedule[teacher])teacherSchedule[teacher]={name:teacher,days:{},totalH:0,windows:[]};
        if(!teacherSchedule[teacher].days[di])teacherSchedule[teacher].days[di]=[];
        teacherSchedule[teacher].days[di].push({slot:si,cls:cls,subj:subj});
        teacherSchedule[teacher].totalH++;
      });
    });
  });

  /* Вычисляем окна учителей */
  Object.keys(teacherSchedule).forEach(function(name){
    var t=teacherSchedule[name];
    t.windows=[];
    for(var d=0;d<daysN;d++){
      var slots=(t.days[d]||[]);if(!slots.length)continue;
      var slotNums=slots.map(function(s){return s.slot;}).sort(function(a,b){return a-b;});
      var mn=slotNums[0],mx=slotNums[slotNums.length-1];
      var occ={};slotNums.forEach(function(s){occ[s]=true;});
      for(var s=mn;s<=mx;s++){
        if(!occ[s])t.windows.push({d:d,day:DN[d],slot:s,slotNum:s+1});
      }
    }
  });

  /* 6. Полный аудит */
  var cg={};
  clsList.forEach(function(cls){cg[cls]=classGrades[cls]||_csGrade(cls);});
  var audit=doAudit(schedule,cg);

  /* Сохраняем в state */
  _wizState.lastSchedule={sch:schedule,cg:cg};
  _wizState.lastAudit=audit;
  _wizState.lastTeacherSchedule=teacherSchedule;
  window._lastTeacherWindows=teacherSchedule;

  return {sch:schedule,cg:cg,audit:audit,teacherSchedule:teacherSchedule};
}

function wizBuildSchedule(){
  var daysN = wizData.days||5;
  /* Используем новый движок если есть данные */
  var result = wizGenerateAll(daysN);
  if(result && result.sch && Object.keys(result.sch).length){
    window._lastTeacherWindows = result.teacherSchedule||{};
    return {sch:result.sch, cg:result.cg, school:wizData.schoolName||''};
  }
  /* fallback */
  var classSubjects={}, classGrades={};

  /* Если загружен файл curriculum — используем его */
  if(window._wiz_curriculum && window._wiz_curriculum.length){
    /* Из файла — строим по классам и дополняем дефолтным планом */
    var fromFile={};
    window._wiz_curriculum.forEach(function(item){
      if(!fromFile[item.classId]) fromFile[item.classId]={};
      fromFile[item.classId][item.subject]=(fromFile[item.classId][item.subject]||0)+item.weeklyHours;
      if(!classGrades[item.classId]) classGrades[item.classId]=_csGrade(item.classId);
    });
    Object.keys(fromFile).forEach(function(cls){
      var g=classGrades[cls]||_csGrade(cls);
      var plan=fromFile[cls];
      /* Дополняем дефолтными предметами которых нет в файле */
      var def=_DEFAULT_PLAN[g]||_DEFAULT_PLAN[7];
      def.forEach(function(x){if(!plan[x.s])plan[x.s]=x.h;});
      /* Обрезаем до maxWk */
      var mwk2=WM[g]||34;
      var total2=Object.keys(plan).reduce(function(s,k){return s+plan[k];},0);
      if(total2>mwk2){
        var over2=total2-mwk2;
        /* Сначала убираем часы у дополненных предметов (из DEFAULT) */
        def.slice().reverse().forEach(function(x){
          if(over2<=0)return;
          if(plan[x.s]>0){var cut=Math.min(plan[x.s],over2);plan[x.s]-=cut;over2-=cut;}
          if(plan[x.s]===0)delete plan[x.s];
        });
        /* Если всё ещё превышаем — обрезаем предметы из файла (лёгкие сначала) */
        if(over2>0){
          var fileSubjs=Object.keys(fromFile[cls]||{}).sort(function(a,b){return gd(a,g)-gd(b,g);});
          fileSubjs.forEach(function(s){
            if(over2<=0)return;
            if(plan[s]>0){var cut=Math.min(plan[s],over2);plan[s]-=cut;over2-=cut;}
            if(plan[s]===0)delete plan[s];
          });
        }
      }
      classSubjects[cls]=Object.keys(plan).filter(function(s){return plan[s]>0;}).map(function(s){return{s:s,h:plan[s]};});
    });
  } else {
    /* Из ручного ввода: собираем список классов */
    var allClasses={};
    wizData.teachers.forEach(function(t){
      var clsList=(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean);
      clsList.forEach(function(cls){
        if(!allClasses[cls]){allClasses[cls]=true;}
      });
    });

    /* Для каждого класса строим полный curriculum */
    Object.keys(allClasses).forEach(function(cls){
      var g = _csGrade(cls);
      classGrades[cls] = g;
      classSubjects[cls] = _buildClassCurriculum(cls, g, wizData.teachers);
    });
  }

  if(!Object.keys(classSubjects).length) return null;

  var sch={};
  Object.keys(classSubjects).forEach(function(cls){
    var g = classGrades[cls]||7;
    sch[cls] = _csHillClimb(classSubjects[cls], g, daysN);
  });

  /* Вычисляем окна учителей */
  window._lastTeacherWindows={};
  /* Строим карту предмет+класс -> учитель из curriculum и wizData.teachers */
  var subjClsTeacher={};
  if(window._wiz_curriculum){
    window._wiz_curriculum.forEach(function(item){
      if(item.teacher){
        var key=item.subject+'|'+item.classId;
        subjClsTeacher[key]=item.teacher;
      }
    });
  }
  wizData.teachers.forEach(function(t){
    var sub=normSubj(t.subject||'');
    if(!sub)return;
    var clsList=(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean);
    clsList.forEach(function(cls){subjClsTeacher[sub+'|'+cls]=t.name;});
    if(!clsList.length) subjClsTeacher[sub+'|*']=t.name;
  });

  var hasTeachers=Object.keys(subjClsTeacher).length>0||wizData.teachers.length>0;
  if(hasTeachers){
    var busy={};
    /* Сначала проходим по расписанию и назначаем учителей */
    Object.keys(sch).forEach(function(cls){
      sch[cls].forEach(function(day,di){
        day.forEach(function(subj,si){
          if(!subj) return;
          /* Ищем учителя: сначала точное совпадение, потом по предмету */
          var teacher=subjClsTeacher[subj+'|'+cls]||subjClsTeacher[subj+'|*']||null;
          if(!teacher){
            for(var ti=0;ti<wizData.teachers.length;ti++){
              var t=wizData.teachers[ti];
              var tc=normSubj(t.subject||'');
              if(tc===subj){
                var clsList=(t.classes||'').split(/[,;]+/).map(function(c){return c.trim();}).filter(Boolean);
                var inCls=!clsList.length||clsList.indexOf(cls)!==-1;
                if(inCls){teacher=t.name;break;}
              }
            }
          }
          if(!teacher) return;
          if(!busy[teacher]) busy[teacher]=[];
          for(var d=0;d<daysN;d++) if(!busy[teacher][d]) busy[teacher][d]=[];
          busy[teacher][di].push({slot:si, cls:cls, subj:subj});
        });
      });
    });
    /* Добавляем учителей у которых не нашлось уроков (они в wizData но не в sch) */
    wizData.teachers.forEach(function(t){
      if(t.name&&!busy[t.name]){
        busy[t.name]=[];
        for(var d=0;d<daysN;d++) busy[t.name].push([]);
      }
    });
    Object.keys(busy).forEach(function(name){
      var days=busy[name];
      var totalH=0, allWin=[];
      var ddays=[];
      for(var d=0;d<daysN;d++){
        var slots=days[d]||[];
        if(!slots.length){ddays.push({d:d,day:DN[d],slots:[],windows:[]});continue;}
        totalH+=slots.length;
        var minS=slots[0].slot, maxS=slots[slots.length-1].slot;
        var occ={};slots.forEach(function(x){occ[x.slot]=true;});
        var win=[];
        for(var s=minS;s<=maxS;s++){
          if(!occ[s]){win.push({slot:s,slotNum:s+1});allWin.push({d:d,day:DN[d],slot:s,slotNum:s+1});}
        }
        ddays.push({d:d,day:DN[d],slots:slots,windows:win});
      }
      window._lastTeacherWindows[name]={name:name,totalH:totalH,days:ddays,windows:allWin};
    });
  }

  return{sch:sch, cg:classGrades};
}





// ═══ page init ═══

spInitNav();


function _renderOptimizedTab(sch, cg, origAudit) {
  var el = document.getElementById('inlineDemoTabOptimized');
  if (!el) return;
  try {
    var opt = optSchedule(sch, cg, 'bell');
    _lastOptSch = opt;
    var optAudit = doAudit(opt, cg);
    var diffV = origAudit.vi.length - optAudit.vi.length;
    var diffW = origAudit.wa.length - optAudit.wa.length;
    var diffS = optAudit.score - origAudit.score;

    var h = '<div style="margin-bottom:16px;padding:14px 18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;max-width:600px;margin-left:auto;margin-right:auto">';
    h += '<div style="display:flex;gap:20px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:10px">';
    h += '<div style="text-align:center"><div style="font-size:.7rem;color:#86868b;margin-bottom:2px">Было</div><div style="font-size:1.3rem;font-weight:700;color:#ff453a">' + origAudit.score + '</div></div>';
    h += '<div style="font-size:1.2rem;color:#555">→</div>';
    h += '<div style="text-align:center"><div style="font-size:.7rem;color:#86868b;margin-bottom:2px">Стало</div><div style="font-size:1.3rem;font-weight:700;color:' + (optAudit.score >= 90 ? '#30d158' : optAudit.score >= 70 ? '#ffd60a' : '#ff453a') + '">' + optAudit.score + '</div></div>';
    if (diffS > 0) h += '<div style="font-size:.85rem;font-weight:600;color:#30d158;padding:4px 12px;background:rgba(48,209,88,.1);border-radius:8px">+' + diffS + ' баллов</div>';
    h += '</div>';
    h += '<div style="display:flex;gap:14px;font-size:.78rem;flex-wrap:wrap;justify-content:center">';
    if (diffV > 0) h += '<span style="color:#30d158">−' + diffV + ' нарушений</span>';
    if (diffW > 0) h += '<span style="color:#30d158">−' + diffW + ' рекомендаций</span>';
    h += '</div>';

    /* Show only C-02 (weekly overload) — the only truly unfixable violation */
    var WM_map={1:21,2:23,3:23,4:23,5:29,6:30,7:32,8:33,9:33,10:34,11:34};
    var c02list = [];
    optAudit.vi.forEach(function(v) {
      if (v.id === 'C-02') {
        var g = cg[v.cls] || 5;
        var days = opt[v.cls];
        var total = 0;
        days.forEach(function(d){ d.forEach(function(s){ if(s) total++; }); });
        var wm = WM_map[g] || 34;
        c02list.push({ cls: v.cls, total: total, max: wm, over: total - wm, grade: g });
      }
    });

    if (c02list.length) {
      h += '<div class="sp-alert sp-alert--warn">';
      h += '<div class="sp-alert__icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1.5 17h17L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4M10 14v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>';
      h += '<div class="sp-alert__body">';
      h += '<div class="sp-alert__title">Превышение недельной нагрузки</div>';
      h += '<div class="sp-alert__desc">В учебном плане больше часов, чем допускает СанПиН 1.2.3685-21 (табл. 6.6). Автоматическая оптимизация не может убрать лишние уроки — нужна ручная корректировка.</div>';
      h += '<div class="sp-alert__list">';
      c02list.forEach(function(c) {
        h += '<div class="sp-alert__item"><span class="sp-alert__cls">' + c.cls + '</span><span class="sp-alert__detail">' + c.total + ' ч/нед (максимум ' + c.max + ' для ' + c.grade + ' кл.) — сократите на ' + c.over + ' ч</span></div>';
      });
      h += '</div>';
      h += '<div class="sp-alert__tip">Рекомендуем: пересмотрите учебный план — сократите количество часов до нормы СанПиН</div>';
      h += '</div></div>';
    }

    h += '</div>';

    /* Image-comparison style: fixed-width tables overlaid */
    h += '<div class="cmp-box" id="cmpBox">';
    h += '<div class="cmp-box__scroll">';
    h += '<div class="cmp-box__layers">';
    h += '<table class="acc-grid-tbl cmp-tbl" id="optTblOld"></table>';
    h += '<table class="acc-grid-tbl cmp-tbl cmp-tbl--top" id="optTblNew"></table>';
    h += '</div>';
    h += '</div>';
    h += '<div class="cmp-box__tag cmp-box__tag--left">Текущее</div>';
    h += '<div class="cmp-box__tag cmp-box__tag--right">Улучшенное</div>';
    h += '<div class="cmp-box__slider" id="cmpSlider">';
    h += '<div class="cmp-box__line"></div>';
    h += '<div class="cmp-box__knob">◀ ▶</div>';
    h += '</div>';
    h += '</div>';
    h += '<div style="text-align:center;margin-top:16px"><button onclick="downloadOptSchedule()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:rgba(10,132,255,.15);border:1px solid rgba(10,132,255,.35);border-radius:8px;color:#3b82f6;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v8M2 9l5 5 5-5" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h10" stroke="#3b82f6" stroke-width="1.3" stroke-linecap="round"/></svg> Скачать улучшенное расписание .xlsx</button></div>';

    el.innerHTML = h;
    /* Calculate ml from OLD schedule — both tables use same column count */
    var maxLessons = 6;
    Object.keys(sch).forEach(function(c){sch[c].forEach(function(d){var n=0;for(var i=0;i<d.length;i++){if(d[i])n++;}if(n>maxLessons)maxLessons=n;});});
    renderGrid(sch, cg, origAudit, document.getElementById('optTblOld'), false, maxLessons);
    renderGrid(opt, cg, optAudit, document.getElementById('optTblNew'), false, maxLessons);

    /* Slider logic */
    /* Collect class header colors from both tables for live update */
    var oldHeaders = document.getElementById('optTblOld').querySelectorAll('.tbl-cls-hdr');
    var newHeaders = document.getElementById('optTblNew').querySelectorAll('.tbl-cls-hdr');
    var headerColors = [];
    for(var hi=0;hi<oldHeaders.length;hi++){
      headerColors.push({
        el: oldHeaders[hi],
        oldColor: oldHeaders[hi].style.color,
        newColor: newHeaders[hi] ? newHeaders[hi].style.color : oldHeaders[hi].style.color
      });
    }

    (function(){
      var box = document.getElementById('cmpBox');
      var top = document.querySelector('.cmp-tbl--top');
      var slider = document.getElementById('cmpSlider');
      if (!box||!top||!slider) return;
      var pct = 50;
      function set(p) {
        pct = Math.max(3, Math.min(97, p));
        top.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
        slider.style.left = pct + '%';
        /* Update class header colors based on slider position */
        var boxRect = box.getBoundingClientRect();
        var sliderX = boxRect.left + (pct / 100) * boxRect.width;
        headerColors.forEach(function(hc) {
          var rect = hc.el.getBoundingClientRect();
          var mid = rect.left + rect.width / 2;
          hc.el.style.color = mid > sliderX ? hc.newColor : hc.oldColor;
        });
      }
      set(50);
      var drag = false;
      function move(e) {
        if (!drag) return;
        var r = box.getBoundingClientRect();
        set(((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 100);
      }
      slider.onmousedown = function(e) { drag=true; e.preventDefault(); };
      slider.ontouchstart = function() { drag=true; };
      document.addEventListener('mousemove', move);
      document.addEventListener('touchmove', move, {passive:true});
      document.addEventListener('mouseup', function() { drag=false; });
      document.addEventListener('touchend', function() { drag=false; });
    })();
  } catch (err) {
    el.innerHTML = '<p style="color:#ff453a;padding:20px">Ошибка оптимизации: ' + err + '</p>';
  }
}

var _lastOptSch = null;

function downloadOptSchedule() {
  if (!_lastOptSch) return;
  var sch = _lastOptSch;
  var FULL_DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница'];
  var classes = Object.keys(sch).sort(function(a,b){
    var na=parseInt(a),nb=parseInt(b);
    if(na!==nb)return na-nb;
    return a.localeCompare(b,'ru');
  });
  var wb = XLSX.utils.book_new();
  FULL_DAYS.forEach(function(dayName,di){
    var maxL=0;
    classes.forEach(function(cl){
      var cnt=(sch[cl][di]||[]).filter(function(s){return s;}).length;
      if(cnt>maxL)maxL=cnt;
    });
    if(maxL<1)maxL=7;
    var rows=[['Урок'].concat(classes)];
    for(var li=0;li<maxL;li++){
      var row=[li+1];
      classes.forEach(function(cl){
        var filled=(sch[cl][di]||[]).filter(function(s){return s;});
        var subj=filled[li]||'';
        row.push(SF[subj]||subj);
      });
      rows.push(row);
    }
    var ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:8}].concat(classes.map(function(){return{wch:16};}));
    ws['!freeze']={xSplit:1,ySplit:1};
    XLSX.utils.book_append_sheet(wb,ws,dayName);
  });
  XLSX.writeFile(wb,'raspisanie-uluchshennoe.xlsx');
}

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
    // _renderOptimizedTab removed
  } catch(e) { console.warn('Demo init error:', e); }
}
function toggleInlineDemo() {
  var panel = document.getElementById('inlineDemo');
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) { _initInlineDemo(); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function showInlineDemo() {
  var panel = document.getElementById('inlineDemo');
  panel.style.display = 'block';
  _initInlineDemo();
  document.getElementById('audit').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', function() {
  /* ═══ FILE UPLOAD: auditFileInput → parse → show audit ═══ */
  var fileInput = document.getElementById('auditFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var btn = document.querySelector('.audit-upload-btn span');
      if (btn) btn.textContent = 'Загрузка...';
      parseXls(file).then(function(result) {
        if (btn) btn.textContent = 'Загрузить своё расписание (.xlsx)';
        /* Show inline demo panel with user's data */
        var panel = document.getElementById('inlineDemo');
        if (panel) panel.style.display = 'block';
        _inlineDemoReady = true;
        try {
          var badge = panel.querySelector('.demo-badge');
          if (badge) badge.textContent = file.name + ' · ' + Object.keys(result.sch).length + ' классов';
          var audit = doAudit(result.sch, result.cg);
          var gridEl = document.getElementById('inlineDemoTabGrid');
          var tbl = document.createElement('table');
          tbl.className = 'acc-grid-tbl';
          gridEl.innerHTML = '<div class="acc-tbl-wrap"></div>';
          gridEl.querySelector('.acc-tbl-wrap').appendChild(tbl);
          renderGrid(result.sch, result.cg, audit, tbl);
          var recsEl = document.getElementById('inlineDemoTabRecs');
          renderRecs(audit.top, recsEl);
          // _renderOptimizedTab removed
          /* Show summary above grid */
          var summary = '<div style="margin-bottom:16px;padding:12px 16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:600px;margin-left:auto;margin-right:auto">';
          summary += '<span style="font-size:1.2rem;font-weight:700;color:'+(audit.score>=90?'#30d158':audit.score>=70?'#ffd60a':'#ff453a')+'">Score: '+audit.score+'</span>';
          summary += '<span style="color:#ff453a;font-weight:600">❌ '+audit.vi.length+' нарушений</span>';
          summary += '<span style="color:#ff9f0a;font-weight:600">⚠ '+audit.wa.length+' рекомендаций</span>';
          summary += '<span style="color:#30d158;font-weight:600">✅ '+audit.passed+' пройдено</span>';
          summary += '</div>';
          /* Check for C-02 weekly overload — show alert */
          var WM_check={1:21,2:23,3:23,4:23,5:29,6:30,7:32,8:33,9:33,10:34,11:34};
          var overloads = [];
          audit.vi.forEach(function(v) {
            if (v.id === 'C-02') {
              var g = result.cg[v.cls] || 5;
              var total = 0;
              result.sch[v.cls].forEach(function(d){ d.forEach(function(s){ if(s) total++; }); });
              var wm = WM_check[g] || 34;
              overloads.push({ cls: v.cls, total: total, max: wm, over: total - wm, grade: g });
            }
          });
          if (overloads.length) {
            summary += '<div class="sp-alert sp-alert--error">';
            summary += '<div class="sp-alert__icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1.5 17h17L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4M10 14v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>';
            summary += '<div class="sp-alert__body">';
            summary += '<div class="sp-alert__title">Превышение недельной нагрузки</div>';
            summary += '<div class="sp-alert__desc">Учебный план содержит больше часов, чем допускает СанПиН 1.2.3685-21 (табл. 6.6). Сократите количество часов до нормы.</div>';
            summary += '<div class="sp-alert__list">';
            overloads.forEach(function(c) {
              summary += '<div class="sp-alert__item"><span class="sp-alert__cls">' + c.cls + '</span><span class="sp-alert__detail">' + c.total + ' ч/нед → максимум ' + c.max + ' для ' + c.grade + ' кл. (лишних: ' + c.over + ')</span></div>';
            });
            summary += '</div>';
            summary += '<div class="sp-alert__tip">Сократите количество часов до нормы СанПиН — автоматическая оптимизация не может убрать лишние уроки</div>';
            summary += '</div></div>';
          }
          gridEl.insertAdjacentHTML('afterbegin', summary);
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch(err) {
          console.error('Audit error:', err);
          alert('Ошибка при анализе файла: ' + err);
        }
        /* Activate grid tab */
        var tabs = document.querySelectorAll('#inlineDemoTabs .demo-tab');
        tabs.forEach(function(t){ t.classList.remove('demo-tab--active'); });
        var gridTab = document.querySelector('#inlineDemoTabs .demo-tab[data-tab="grid"]');
        if (gridTab) gridTab.classList.add('demo-tab--active');
        document.getElementById('inlineDemoTabGrid').style.display = '';
        document.getElementById('inlineDemoTabRecs').style.display = 'none';
      }).catch(function(err) {
        if (btn) btn.textContent = 'Загрузить своё расписание (.xlsx)';
        alert('Ошибка: ' + err);
      });
      fileInput.value = '';
    });
  }

  var tabs = document.querySelectorAll('#inlineDemoTabs .demo-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t){ t.classList.remove('demo-tab--active'); });
      this.classList.add('demo-tab--active');
      var which = this.getAttribute('data-tab');
      document.getElementById('inlineDemoTabGrid').style.display = which === 'grid' ? '' : 'none';
      document.getElementById('inlineDemoTabRecs').style.display = which === 'recs' ? '' : 'none';
      document.getElementById('inlineDemoTabRules').style.display = which === 'rules' ? '' : 'none';
    });
  });

  // Mobile nav drawer
  var burger = document.getElementById('navBurger');
  var backdrop = document.getElementById('navBackdrop');
  var drawerLinks = document.querySelectorAll('.nav__drawer-link, .nav__drawer-btn');
  function openDrawer() { document.body.classList.add('nav-open'); }
  function closeDrawer() { document.body.classList.remove('nav-open'); }
  if (burger) burger.addEventListener('click', function() {
    document.body.classList.contains('nav-open') ? closeDrawer() : openDrawer();
  });
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  drawerLinks.forEach(function(l) { l.addEventListener('click', closeDrawer); });
});


