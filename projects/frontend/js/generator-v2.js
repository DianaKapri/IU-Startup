// Модуль: generator-v2.js
// Задача: Генерация расписания по шаблону Excel (размещение по учителям)
// Автор: Claude (ШколаПлан AI)
// Описание: Алгоритм teacher-first placement с hard/soft constraints по СанПиН

/* ═══════════════════════════════════════════════════════════════
   ТАБЛИЦЫ ТРУДНОСТИ ПРЕДМЕТОВ ПО САНПИН
   Источник: СанПиН 1.2.3685-21, МР 2.4.0331-23
   ═══════════════════════════════════════════════════════════════ */

var V2_DIFF_14 = {
  'Математика':8,'Русский язык':7,'Родной язык':7,'Иностранный язык':7,
  'Окружающий мир':6,'Окр. мир':6,'Информатика':6,'Информатика и ИКТ':6,
  'Литературное чтение':5,'Литература':5,'ОРКСЭ':6,'ОДНКНР':6,
  'Изобразительное искусство':3,'ИЗО':3,'Музыка':3,
  'Технология':2,'Труд':2,'Физическая культура':1,'Физкультура':1
};

var V2_DIFF_59 = {
  'Физика':13,'Химия':12,'Геометрия':12,'Алгебра':10,
  'Русский язык':11,'Родной язык':11,'Иностранный язык':10,
  'Математика':10,'Биология':7,'Информатика':4,'Информатика и ИКТ':7,
  'Литература':7,'История':8,'Обществознание':9,'МХК':8,
  'География':6,'Вероятность и статистика':8,
  'ИЗО':1,'Изобразительное искусство':1,'Музыка':1,
  'Технология':2,'Труд':2,'Черчение':5,
  'ОБЖ':3,'Физическая культура':2,'Физкультура':2
};

var V2_DIFF_1011 = {
  'Физика':12,'Геометрия':11,'Химия':11,'Алгебра':10,'Математика':10,
  'Русский язык':9,'Родной язык':9,'Литература':8,'Иностранный язык':8,
  'Биология':7,'Информатика':6,'Информатика и ИКТ':6,
  'История':5,'Обществознание':5,'МХК':5,'Астрономия':6,
  'География':3,'Экономика':5,'Право':5,
  'ОБЖ':2,'Физическая культура':1,'Физкультура':1,
  'Индивидуальный проект':4,'Вероятность и статистика':8
};

/* Порог «сложного» предмета: верхняя треть шкалы трудности для класса.
   Формула: ceil(max_difficulty(grade) × 2/3)
   Источник: табл. 6.9–6.11 СанПиН 1.2.3685-21 */
var V2_HARD_THRESHOLD_BY_GRADE = {1:6,2:6,3:6,4:6,5:7,6:9,7:8,8:7,9:9,10:8,11:8};
function v2HardThreshold(grade) { return V2_HARD_THRESHOLD_BY_GRADE[grade] || 8; }
var V2_MAX_PD = {1:4,2:5,3:5,4:5,5:6,6:6,7:7,8:7,9:7,10:7,11:7};
var V2_MAX_WK = {1:21,2:23,3:23,4:23,5:29,6:30,7:32,8:33,9:33,10:34,11:34};

/* ═══════════════════════════════════════════════════════════════
   ПАРСЕР ШАБЛОНА
   ═══════════════════════════════════════════════════════════════ */

function v2ParseTemplate(wb) {
  var result = { classes: [], plan: {}, teachers: [], rooms: [], errors: [] };

  var planSheet = wb.Sheets['Учебный план'];
  if (!planSheet) { result.errors.push('Не найден лист «Учебный план»'); return result; }
  var planData = XLSX.utils.sheet_to_json(planSheet, {header:1, defval:''});

  var headerRow = planData[0] || [];
  var classNames = [];
  var classColMap = {};
  for (var ci = 1; ci < headerRow.length; ci++) {
    var cn = String(headerRow[ci] || '').trim();
    if (cn && cn !== 'ИТОГО часов') { classNames.push(cn); classColMap[cn] = ci; }
  }
  result.classes = classNames;

  for (var ri = 1; ri < planData.length; ri++) {
    var row = planData[ri];
    var subj = String(row[0] || '').trim();
    if (!subj || subj === 'ИТОГО часов') continue;
    for (var ci2 = 0; ci2 < classNames.length; ci2++) {
      var cls = classNames[ci2];
      var hrs = parseInt(row[classColMap[cls]]) || 0;
      if (hrs > 0) {
        if (!result.plan[cls]) result.plan[cls] = [];
        result.plan[cls].push({ subject: subj, hours: hrs });
      }
    }
  }

  var loadSheet = wb.Sheets['Нагрузка учителей'];
  if (!loadSheet) { result.errors.push('Не найден лист «Нагрузка учителей»'); return result; }
  var loadData = XLSX.utils.sheet_to_json(loadSheet, {header:1, defval:''});

  var parallelRow = loadData[1] || [];
  var letterRow = loadData[2] || [];
  var loadColMap = {};
  var currentParallel = '';
  var lastCols = {};
  var dataEndCol = 0;

  for (var lc = 3; lc < parallelRow.length; lc++) {
    var pv = String(parallelRow[lc] || '').trim();
    if (pv && /^\d+$/.test(pv)) currentParallel = pv;
    if (/Итого|кабинет|Кабинет|Недоступн/i.test(pv)) { lastCols[pv] = lc; if (!dataEndCol) dataEndCol = lc; continue; }
    var letter = String(letterRow[lc] || '').trim().toUpperCase();
    if (currentParallel && letter && /^[А-ЯЁA-Z]$/.test(letter)) {
      var clsName = currentParallel + letter;
      var mapped = classNames.find(function(c) { return c === clsName || c.toLowerCase() === clsName.toLowerCase(); });
      if (mapped) loadColMap[lc] = mapped;
    }
  }

  var cabinetCol = 0, unavailCol = 0;
  Object.keys(lastCols).forEach(function(k) {
    if (/кабинет|Кабинет/i.test(k)) cabinetCol = lastCols[k];
    if (/Недоступн/i.test(k)) unavailCol = lastCols[k];
  });

  var currentTeacher = null;
  for (var tr = 3; tr < loadData.length; tr++) {
    var trow = loadData[tr];
    var num = String(trow[0] || '').trim();
    var name = String(trow[1] || '').trim();
    var subj2 = String(trow[2] || '').trim();

    if (/^\d+$/.test(num) && name && name !== 'ФИО учителя' && name !== 'ФИО') {
      currentTeacher = {
        id: 'T' + num, name: name, subjects: [],
        cabinet: cabinetCol ? String(trow[cabinetCol] || '').trim() || null : null,
        unavailableDays: unavailCol ? String(trow[unavailCol] || '').trim() || null : null,
        totalHours: 0
      };
      result.teachers.push(currentTeacher);
    }

    if (currentTeacher && subj2 && subj2 !== 'предмет') {
      // Find classes where this teacher has hours
      var teacherClasses = [];
      for (var dc = 3; dc < (dataEndCol || parallelRow.length); dc++) {
        if (loadColMap[dc]) {
          var h2 = parseInt(trow[dc]) || 0;
          if (h2 > 0) teacherClasses.push(loadColMap[dc]);
        }
      }

      if (teacherClasses.length > 0) {
        // Handle combined subjects: "Русский язык / Литература" → split
        var subjectParts = subj2.indexOf('/') >= 0
          ? subj2.split('/').map(function(s) { return s.trim(); }).filter(function(s) { return s; })
          : [subj2];

        subjectParts.forEach(function(sp) {
          var lessons = [];
          teacherClasses.forEach(function(cls) {
            // Look up hours from учебный план
            var planEntry = (result.plan[cls] || []).find(function(p) { return p.subject === sp; });
            var hrs = planEntry ? planEntry.hours : 0;
            // Fallback: if not found in plan, try partial match
            if (!hrs) {
              planEntry = (result.plan[cls] || []).find(function(p) { return p.subject.indexOf(sp) >= 0 || sp.indexOf(p.subject) >= 0; });
              hrs = planEntry ? planEntry.hours : 0;
            }
            // "нач. классы" → expand into specific subjects from plan
            if (!hrs && /нач|начальн/i.test(sp)) {
              var NACH_SUBJECTS = ['Русский язык','Литературное чтение','Литература','Математика','Окружающий мир','Окр. мир','Технология','Труд','Изобразительное искусство','ИЗО'];
              (result.plan[cls] || []).forEach(function(p) {
                var isNach = NACH_SUBJECTS.some(function(ns) { return p.subject === ns || p.subject.indexOf(ns) >= 0 || ns.indexOf(p.subject) >= 0; });
                if (isNach && p.hours > 0) {
                  var nachLessons = [{ className: cls, subject: p.subject, hours: p.hours }];
                  currentTeacher.subjects.push({ subject: p.subject, lessons: nachLessons });
                  currentTeacher.totalHours += p.hours;
                }
              });
              return;
            }
            if (hrs > 0) { lessons.push({ className: cls, subject: sp, hours: hrs }); currentTeacher.totalHours += hrs; }
          });
          if (lessons.length > 0) currentTeacher.subjects.push({ subject: lessons[0].subject, lessons: lessons });
        });
      }
    }
  }

  var roomSheet = wb.Sheets['Кабинеты'];
  if (roomSheet) {
    var roomData = XLSX.utils.sheet_to_json(roomSheet, {header:1, defval:''});
    for (var rr = 1; rr < roomData.length; rr++) {
      var rrow = roomData[rr];
      var rnum = String(rrow[0] || '').trim();
      if (rnum) result.rooms.push({ id: rnum, type: String(rrow[1]||'').trim(), capacity: parseInt(rrow[2])||30, floor: parseInt(rrow[3])||1 });
    }
  }

  /* ─── Потоки (параллельные элективы) ─── */
  result.streams = []; // [{name, subjects: ['Мат_Профиль1','Мат_База1',...]}]
  var streamSheet = wb.Sheets['Потоки'];
  if (streamSheet) {
    var streamData = XLSX.utils.sheet_to_json(streamSheet, {header:1, defval:''});
    for (var sr = 1; sr < streamData.length; sr++) {
      var srow = streamData[sr];
      var sname = String(srow[0] || '').trim();
      if (!sname) continue;
      var subjects = [];
      for (var sc = 1; sc < srow.length; sc++) {
        var sv = String(srow[sc] || '').trim();
        if (sv) subjects.push(sv);
      }
      if (subjects.length > 1) result.streams.push({ name: sname, subjects: subjects });
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════
   УТИЛИТЫ
   ═══════════════════════════════════════════════════════════════ */

function v2GetGrade(className) { var m = String(className).match(/^(\d+)/); return m ? parseInt(m[1]) : 5; }
function v2GetDifficulty(subject, grade) { var tbl = grade <= 4 ? V2_DIFF_14 : grade <= 9 ? V2_DIFF_59 : V2_DIFF_1011; return tbl[subject] || 5; }
function v2IsHard(subject, grade) { return v2GetDifficulty(subject, grade) >= v2HardThreshold(grade); }

/* ═══════════════════════════════════════════════════════════════
   ГЕНЕРАТОР v2: TEACHER-FIRST PLACEMENT
   ═══════════════════════════════════════════════════════════════ */

function v2Generate(data, weekDays, onProgress) {
  weekDays = weekDays || 5;
  var DAYS = weekDays, MAX_SLOTS = 8;

  var schedule = {};
  data.classes.forEach(function(cls) {
    schedule[cls] = [];
    for (var d = 0; d < DAYS; d++) schedule[cls][d] = new Array(MAX_SLOTS).fill(null);
  });

  var teacherSlots = {};
  var roomSlots = {};
  data.rooms.forEach(function(r) { roomSlots[r.id] = []; for (var d = 0; d < DAYS; d++) roomSlots[r.id][d] = new Array(MAX_SLOTS).fill(false); });

  var DAY_MAP = {'Пн':0,'Вт':1,'Ср':2,'Чт':3,'Пт':4,'Сб':5,'Понедельник':0,'Вторник':1,'Среда':2,'Четверг':3,'Пятница':4,'Суббота':5};

  data.teachers.forEach(function(t) {
    teacherSlots[t.id] = [];
    for (var d = 0; d < DAYS; d++) teacherSlots[t.id][d] = new Array(MAX_SLOTS).fill(false);
    if (t.unavailableDays) {
      t.unavailableDays.split(/[,;\/\s]+/).forEach(function(p) {
        var di = DAY_MAP[p.trim()];
        if (di !== undefined && di < DAYS) for (var s = 0; s < MAX_SLOTS; s++) teacherSlots[t.id][di][s] = true;
      });
    }
  });

  var tasks = [];

  /* ─── Build stream lookup: subject → streamName ─── */
  var subjectToStream = {}; // "subjectName" → streamName
  var streamDef = {};       // streamName → [subject1, subject2, ...]
  (data.streams || []).forEach(function(st) {
    streamDef[st.name] = st.subjects;
    st.subjects.forEach(function(subj) { subjectToStream[subj] = st.name; });
  });

  /* ─── Build teacher-subject-class lookup ─── */
  // teacherForSubjClass["subject|class"] = [{teacherId, teacherName, cabinet, hours}]
  var teacherForSubjClass = {};
  data.teachers.forEach(function(t) {
    t.subjects.forEach(function(sg) {
      sg.lessons.forEach(function(les) {
        var key = les.subject + '|' + les.className;
        if (!teacherForSubjClass[key]) teacherForSubjClass[key] = [];
        teacherForSubjClass[key].push({ teacherId: t.id, teacherName: t.name, cabinet: t.cabinet, hours: les.hours });
      });
    });
  });

  /* ─── Detect group splits: same (class, subject) by multiple teachers ─── */
  var groupSplitMap = {};
  data.teachers.forEach(function(t) {
    t.subjects.forEach(function(sg) {
      sg.lessons.forEach(function(les) {
        var key = les.className + '|' + les.subject;
        if (!groupSplitMap[key]) groupSplitMap[key] = [];
        groupSplitMap[key].push({ teacherId: t.id, teacherName: t.name, cabinet: t.cabinet });
      });
    });
  });

  /* ─── Build stream tasks: subjects in same stream+class share slots ─── */
  var streamProcessed = {}; // "streamName|class" → true
  var subjectProcessedByStream = {}; // "subject|class" → true (skip in normal task creation)

  (data.streams || []).forEach(function(st) {
    // For each class, find which stream subjects have hours
    data.classes.forEach(function(cls) {
      var streamEntries = []; // [{subject, teachers:[{id,name,cabinet}], hours}]
      st.subjects.forEach(function(subj) {
        var key = subj + '|' + cls;
        var teachers = teacherForSubjClass[key];
        if (teachers && teachers.length > 0) {
          streamEntries.push({ subject: subj, teachers: teachers, hours: teachers[0].hours });
          subjectProcessedByStream[subj + '|' + cls] = true;
        }
      });

      if (streamEntries.length < 2) {
        // Only 1 or 0 subjects in this stream for this class — not a real stream here
        streamEntries.forEach(function(e) { delete subjectProcessedByStream[e.subject + '|' + cls]; });
        return;
      }

      var sKey = st.name + '|' + cls;
      if (streamProcessed[sKey]) return;
      streamProcessed[sKey] = true;

      // Number of slots = max hours among stream subjects
      var maxHours = 0;
      streamEntries.forEach(function(e) { if (e.hours > maxHours) maxHours = e.hours; });

      // Collect ALL teachers across all subjects in this stream
      var allTeachers = [];
      var allNames = [];
      streamEntries.forEach(function(e) {
        e.teachers.forEach(function(t) {
          if (!allTeachers.some(function(at) { return at.id === t.teacherId; })) {
            allTeachers.push({ id: t.teacherId, name: t.teacherName, cabinet: t.cabinet });
            allNames.push(t.teacherName);
          }
        });
      });

      var grade = v2GetGrade(cls);
      // Check if any subject in stream is hard
      var anyHard = streamEntries.some(function(e) { return v2GetDifficulty(e.subject, grade) >= v2HardThreshold(grade); });

      for (var sh = 0; sh < maxHours; sh++) {
        tasks.push({
          teacherId: allTeachers[0].id,
          teacherName: allNames.join(' / '),
          subject: st.name,
          className: cls,
          cabinet: null,
          difficulty: anyHard ? v2HardThreshold(grade) : 5,
          isHard: anyHard,
          grade: grade,
          isGroupSplit: true,
          groupTeachers: allTeachers,
          isStream: true,
          streamName: st.name
        });
      }
    });
  });

  /* ─── Build normal tasks (non-stream, non-duplicate) ─── */
  var groupSplitProcessed = {};
  data.teachers.forEach(function(t) {
    t.subjects.forEach(function(sg) {
      sg.lessons.forEach(function(les) {
        // Skip if already handled by stream
        if (subjectProcessedByStream[les.subject + '|' + les.className]) return;

        var grade = v2GetGrade(les.className);
        var key = les.className + '|' + les.subject;
        var splitGroup = groupSplitMap[key];

        if (splitGroup && splitGroup.length > 1) {
          if (groupSplitProcessed[key]) return;
          groupSplitProcessed[key] = true;
          var allTeachers = splitGroup.map(function(g) { return { id: g.teacherId, name: g.teacherName, cabinet: g.cabinet }; });
          for (var h = 0; h < les.hours; h++) {
            tasks.push({ teacherId: allTeachers[0].id, teacherName: allTeachers.map(function(t){return t.name;}).join(' / '),
              subject: les.subject, className: les.className,
              cabinet: allTeachers[0].cabinet, difficulty: v2GetDifficulty(les.subject, grade),
              isHard: v2IsHard(les.subject, grade), grade: grade,
              isGroupSplit: true, groupTeachers: allTeachers, isStream: false });
          }
        } else {
          for (var h2 = 0; h2 < les.hours; h2++) {
            tasks.push({ teacherId: t.id, teacherName: t.name, subject: les.subject, className: les.className,
              cabinet: t.cabinet, difficulty: v2GetDifficulty(les.subject, grade),
              isHard: v2IsHard(les.subject, grade), grade: grade,
              isGroupSplit: false, groupTeachers: null, isStream: false });
          }
        }
      });
    });
  });

  var teacherOrder = data.teachers.slice().sort(function(a, b) {
    var ac = a.unavailableDays ? 1 : 0, bc = b.unavailableDays ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return b.totalHours - a.totalHours;
  });

  var tasksByTeacher = {};
  tasks.forEach(function(task) { if (!tasksByTeacher[task.teacherId]) tasksByTeacher[task.teacherId] = []; tasksByTeacher[task.teacherId].push(task); });

  var totalPlaced = 0, totalTasks = tasks.length, errors = [];

  for (var ti = 0; ti < teacherOrder.length; ti++) {
    var teacher = teacherOrder[ti];
    var tTasks = tasksByTeacher[teacher.id];
    if (!tTasks || !tTasks.length) continue;

    if (onProgress) onProgress({ phase: 'placing', teacher: teacher.name, progress: Math.round(ti / teacherOrder.length * 80), placed: totalPlaced, total: totalTasks });

    var byClass = {};
    tTasks.forEach(function(task) {
      var key = task.className + '|' + task.subject;
      if (!byClass[key]) byClass[key] = { tasks: [], className: task.className, subject: task.subject, isHard: task.isHard, grade: task.grade, cabinet: task.cabinet };
      byClass[key].tasks.push(task);
    });

    var groups = Object.keys(byClass).map(function(k) { return byClass[k]; });
    groups.sort(function(a, b) { return (b.isHard ? 1 : 0) - (a.isHard ? 1 : 0); });

    for (var gi = 0; gi < groups.length; gi++) {
      var group = groups[gi];
      var cls = group.className, grade = group.grade, maxPd = V2_MAX_PD[grade] || 7;
      var daysUsed = {};

      for (var li = 0; li < group.tasks.length; li++) {
        var task = group.tasks[li];
        var placed = false, candidates = [];

        for (var d = 0; d < DAYS; d++) {
          if (_v2AllBlocked(teacherSlots[teacher.id], d)) continue;
          if (daysUsed[d] && group.tasks.length <= DAYS) continue;

          var slotStart = 0, slotEnd = maxPd;
          if (task.isHard) { slotStart = 1; slotEnd = Math.min(4, maxPd); }

          for (var s = slotStart; s < slotEnd; s++) {
            if (schedule[cls][d][s]) continue;
            if (teacherSlots[teacher.id][d][s]) continue;
            // For group splits, check ALL teachers are free
            var groupBlocked = false;
            if (task.isGroupSplit && task.groupTeachers) {
              for (var gti = 0; gti < task.groupTeachers.length; gti++) {
                var gtId = task.groupTeachers[gti].id;
                if (teacherSlots[gtId] && teacherSlots[gtId][d][s]) { groupBlocked = true; break; }
              }
            }
            if (groupBlocked) continue;
            if (task.cabinet && roomSlots[task.cabinet] && roomSlots[task.cabinet][d][s]) continue;
            var dayCount = 0;
            for (var cs = 0; cs < MAX_SLOTS; cs++) if (schedule[cls][d][cs]) dayCount++;
            if (dayCount >= maxPd) continue;

            var score = 0;
            if (task.isHard) score += Math.abs(s - 2) * 2;
            else score += (s >= 1 && s <= 3) ? 5 : 0;
            if (daysUsed[d]) score += 3;
            if ((d === 2 || d === 3) && task.isHard) score += 2;
            if (task.isHard && s > 0 && schedule[cls][d][s-1] && v2IsHard(schedule[cls][d][s-1].subject, grade)) {
              // Only penalize if outside optimal range (slots 1-3)
              if (s < 1 || s > 3 || (s-1) < 1 || (s-1) > 3) {
                score += 3;
                if (s > 1 && schedule[cls][d][s-2] && v2IsHard(schedule[cls][d][s-2].subject, grade)) score += 10;
              }
            }
            candidates.push({ day: d, slot: s, score: score + Math.random() * 2 });
          }
        }

        candidates.sort(function(a, b) { return a.score - b.score; });

        if (candidates.length > 0) {
          var best = candidates[0];
          var teacherLabel = task.teacherName;
          if (task.isGroupSplit && task.groupTeachers) {
            teacherLabel = task.groupTeachers.map(function(g) { return g.name; }).join(' / ');
          }
          schedule[cls][best.day][best.slot] = { subject: task.subject, teacherId: teacher.id, teacherName: teacherLabel, cabinet: task.cabinet, isStream: task.isStream || false };
          teacherSlots[teacher.id][best.day][best.slot] = true;
          // Block ALL teachers in group split
          if (task.isGroupSplit && task.groupTeachers) {
            task.groupTeachers.forEach(function(gt) {
              if (gt.id !== teacher.id && teacherSlots[gt.id]) {
                teacherSlots[gt.id][best.day][best.slot] = true;
              }
            });
          }
          if (task.cabinet && roomSlots[task.cabinet]) roomSlots[task.cabinet][best.day][best.slot] = true;
          daysUsed[best.day] = true;
          totalPlaced++; placed = true;
        }

        if (!placed) {
          for (var fd = 0; fd < DAYS && !placed; fd++) {
            for (var fs = 0; fs < maxPd && !placed; fs++) {
              if (schedule[cls][fd][fs]) continue;
              if (teacherSlots[teacher.id][fd][fs]) continue;
              var fbBlocked = false;
              if (task.isGroupSplit && task.groupTeachers) {
                for (var fgi = 0; fgi < task.groupTeachers.length; fgi++) {
                  var fgtId = task.groupTeachers[fgi].id;
                  if (teacherSlots[fgtId] && teacherSlots[fgtId][fd][fs]) { fbBlocked = true; break; }
                }
              }
              if (fbBlocked) continue;
              if (task.cabinet && roomSlots[task.cabinet] && roomSlots[task.cabinet][fd][fs]) continue;
              var fdc = 0; for (var fcs = 0; fcs < MAX_SLOTS; fcs++) if (schedule[cls][fd][fcs]) fdc++;
              if (fdc >= maxPd) continue;
              var fbLabel = task.teacherName;
              if (task.isGroupSplit && task.groupTeachers) fbLabel = task.groupTeachers.map(function(g){return g.name;}).join(' / ');
              schedule[cls][fd][fs] = { subject: task.subject, teacherId: teacher.id, teacherName: fbLabel, cabinet: task.cabinet, isStream: task.isStream || false };
              teacherSlots[teacher.id][fd][fs] = true;
              if (task.isGroupSplit && task.groupTeachers) {
                task.groupTeachers.forEach(function(gt) { if (gt.id !== teacher.id && teacherSlots[gt.id]) teacherSlots[gt.id][fd][fs] = true; });
              }
              if (task.cabinet && roomSlots[task.cabinet]) roomSlots[task.cabinet][fd][fs] = true;
              totalPlaced++; placed = true;
            }
          }

          /* ─── BACKTRACKING: displace existing lesson to free a slot ─── */
          if (!placed) {
            // Build list of candidate displacements, scored
            var bCandidates = [];

            for (var bd = 0; bd < DAYS && !placed; bd++) {
              if (_v2AllBlocked(teacherSlots[teacher.id], bd)) continue;
              for (var bs = 0; bs < maxPd; bs++) {
                // New teacher must be free here
                if (teacherSlots[teacher.id][bd][bs]) continue;
                if (task.isGroupSplit && task.groupTeachers) {
                  var bgb = false;
                  for (var bgi = 0; bgi < task.groupTeachers.length; bgi++) {
                    if (teacherSlots[task.groupTeachers[bgi].id] && teacherSlots[task.groupTeachers[bgi].id][bd][bs]) { bgb = true; break; }
                  }
                  if (bgb) continue;
                }
                // Must have an existing lesson to displace
                var victim = schedule[cls][bd][bs];
                if (!victim || !victim.teacherId) continue;
                // Don't displace streams — too complex
                if (victim.isStream) continue;
                // Cabinet check for new lesson
                if (task.cabinet && roomSlots[task.cabinet] && roomSlots[task.cabinet][bd][bs]) continue;

                // Find where victim can go in the SAME class, different slot
                for (var td = 0; td < DAYS; td++) {
                  for (var ts = 0; ts < maxPd; ts++) {
                    if (td === bd && ts === bs) continue;
                    if (schedule[cls][td][ts]) continue;
                    // Victim's teacher must be free at target
                    if (teacherSlots[victim.teacherId][td][ts]) continue;
                    // Victim's cabinet must be free at target
                    if (victim.cabinet && roomSlots[victim.cabinet] && roomSlots[victim.cabinet][td][ts]) continue;
                    // Class day must not be over limit
                    var tdc = 0;
                    for (var tcs = 0; tcs < MAX_SLOTS; tcs++) if (schedule[cls][td][tcs]) tdc++;
                    if (td !== bd && tdc >= maxPd) continue; // moving to another day that's full

                    // Score: prioritize moving hard subjects to better positions
                    var bScore = 0;
                    var victimIsHard = v2IsHard(victim.subject, grade);
                    // If victim is hard and moving from bad slot to good slot — big bonus
                    if (victimIsHard && (bs < 1 || bs > 3) && ts >= 1 && ts <= 3) bScore -= 10; // great: hard moves to optimal
                    if (victimIsHard && bs >= 1 && bs <= 3 && (ts < 1 || ts > 3)) bScore += 20; // bad: hard leaves optimal
                    if (victimIsHard && ts >= 1 && ts <= 3) bScore -= 5; // good: hard ends up in optimal
                    // Prefer same day (less disruption)
                    if (td === bd) bScore -= 2;

                    bCandidates.push({ victimDay: bd, victimSlot: bs, targetDay: td, targetSlot: ts, score: bScore, victim: victim });
                  }
                }
              }
            }

            // Sort: best displacements first (lowest score)
            bCandidates.sort(function(a, b) { return a.score - b.score; });

            // Try first valid candidate
            for (var bci = 0; bci < bCandidates.length && !placed; bci++) {
              var bc = bCandidates[bci];
              var v = bc.victim;

              // Move victim from (victimDay, victimSlot) to (targetDay, targetSlot)
              schedule[cls][bc.targetDay][bc.targetSlot] = v;
              schedule[cls][bc.victimDay][bc.victimSlot] = null;

              // Update victim teacher slots
              teacherSlots[v.teacherId][bc.victimDay][bc.victimSlot] = false;
              teacherSlots[v.teacherId][bc.targetDay][bc.targetSlot] = true;
              // Update victim room slots
              if (v.cabinet && roomSlots[v.cabinet]) {
                roomSlots[v.cabinet][bc.victimDay][bc.victimSlot] = false;
                roomSlots[v.cabinet][bc.targetDay][bc.targetSlot] = true;
              }

              // Place new lesson at freed slot
              var btLabel = task.teacherName;
              if (task.isGroupSplit && task.groupTeachers) btLabel = task.groupTeachers.map(function(g){return g.name;}).join(' / ');
              schedule[cls][bc.victimDay][bc.victimSlot] = { subject: task.subject, teacherId: teacher.id, teacherName: btLabel, cabinet: task.cabinet, isStream: task.isStream || false };
              teacherSlots[teacher.id][bc.victimDay][bc.victimSlot] = true;
              if (task.isGroupSplit && task.groupTeachers) {
                task.groupTeachers.forEach(function(gt) { if (gt.id !== teacher.id && teacherSlots[gt.id]) teacherSlots[gt.id][bc.victimDay][bc.victimSlot] = true; });
              }
              if (task.cabinet && roomSlots[task.cabinet]) roomSlots[task.cabinet][bc.victimDay][bc.victimSlot] = true;
              totalPlaced++; placed = true;
            }
          }

          if (!placed) {
            // Diagnose WHY: check every slot and count reasons
            var diag = { teacherBusy: 0, classFull: 0, classSlotTaken: 0, cabinetBusy: 0, groupBlocked: 0, noSlots: 0 };
            var teacherFreeDays = 0;
            for (var dd = 0; dd < DAYS; dd++) {
              if (_v2AllBlocked(teacherSlots[teacher.id], dd)) continue;
              teacherFreeDays++;
              for (var ds = 0; ds < maxPd; ds++) {
                if (teacherSlots[teacher.id][dd][ds]) { diag.teacherBusy++; continue; }
                if (schedule[cls][dd][ds]) { diag.classSlotTaken++; continue; }
                var gb = false;
                if (task.isGroupSplit && task.groupTeachers) {
                  for (var ggi = 0; ggi < task.groupTeachers.length; ggi++) {
                    if (teacherSlots[task.groupTeachers[ggi].id] && teacherSlots[task.groupTeachers[ggi].id][dd][ds]) { gb = true; break; }
                  }
                }
                if (gb) { diag.groupBlocked++; continue; }
                if (task.cabinet && roomSlots[task.cabinet] && roomSlots[task.cabinet][dd][ds]) { diag.cabinetBusy++; continue; }
                var ddc = 0; for (var dcs = 0; dcs < MAX_SLOTS; dcs++) if (schedule[cls][dd][dcs]) ddc++;
                if (ddc >= maxPd) { diag.classFull++; continue; }
              }
            }
            var reasons = [];
            if (teacherFreeDays === 0) reasons.push('учитель занят все дни');
            if (diag.classFull > 0) reasons.push('класс ' + cls + ' переполнен (' + diag.classFull + ' дн. по ' + maxPd + ' ур.)');
            if (diag.teacherBusy > 0) reasons.push('учитель занят ' + diag.teacherBusy + ' слотов');
            if (diag.classSlotTaken > 0) reasons.push('слоты класса заняты: ' + diag.classSlotTaken);
            if (diag.cabinetBusy > 0) reasons.push('каб. ' + task.cabinet + ' занят ' + diag.cabinetBusy + ' слотов');
            if (diag.groupBlocked > 0) reasons.push('другой учитель группы занят ' + diag.groupBlocked + ' слотов');
            if (reasons.length === 0) reasons.push('нет свободных слотов');
            errors.push(teacher.name + ' / ' + task.subject + ' / ' + cls + ': ' + reasons.join('; '));
          }
        }
      }
    }
  }

  /* Компактность */
  if (onProgress) onProgress({ phase: 'compacting', progress: 85, placed: totalPlaced, total: totalTasks });
  data.classes.forEach(function(cls) {
    for (var d = 0; d < DAYS; d++) {
      var filled = schedule[cls][d].filter(function(s) { return s !== null; });
      schedule[cls][d] = filled.concat(new Array(MAX_SLOTS - filled.length).fill(null));
    }
  });

  /* Targeted fix: move hard subjects to slots 1-3, swap with easy subjects */
  if (onProgress) onProgress({ phase: 'optimizing', progress: 87, placed: totalPlaced, total: totalTasks });
  for (var fixPass = 0; fixPass < 3; fixPass++) {
    data.classes.forEach(function(cls) {
      var grade3 = v2GetGrade(cls);
      for (var d3 = 0; d3 < DAYS; d3++) {
        var day3 = schedule[cls][d3];
        // Find hard subjects outside slots 1-3
        for (var badSlot = 0; badSlot < day3.length; badSlot++) {
          if (badSlot >= 1 && badSlot <= 3) continue; // already optimal
          var badLesson = day3[badSlot];
          if (!badLesson) continue;
          if (!v2IsHard(badLesson.subject, grade3)) continue;
          // Find easy subject at slots 1-3 to swap with
          for (var goodSlot = 1; goodSlot <= 3; goodSlot++) {
            var goodLesson = day3[goodSlot];
            if (!goodLesson) continue;
            if (v2IsHard(goodLesson.subject, grade3)) continue; // don't swap hard with hard
            // Check teacher conflicts for the swap
            var canFix = true;
            // badLesson teacher must be free at goodSlot (in other classes)
            if (badLesson.teacherId && teacherSlots[badLesson.teacherId][d3][goodSlot] && day3[goodSlot].teacherId !== badLesson.teacherId) canFix = false;
            // goodLesson teacher must be free at badSlot (in other classes)
            if (goodLesson.teacherId && teacherSlots[goodLesson.teacherId][d3][badSlot] && day3[badSlot].teacherId !== goodLesson.teacherId) canFix = false;
            // Check cabinets
            if (badLesson.cabinet && roomSlots[badLesson.cabinet] && roomSlots[badLesson.cabinet][d3][goodSlot] && !(goodLesson.cabinet === badLesson.cabinet)) canFix = false;
            if (goodLesson.cabinet && roomSlots[goodLesson.cabinet] && roomSlots[goodLesson.cabinet][d3][badSlot] && !(badLesson.cabinet === goodLesson.cabinet)) canFix = false;
            if (!canFix) continue;
            // Do the swap
            day3[badSlot] = goodLesson;
            day3[goodSlot] = badLesson;
            // Update teacher slots
            if (badLesson.teacherId) { teacherSlots[badLesson.teacherId][d3][badSlot] = false; teacherSlots[badLesson.teacherId][d3][goodSlot] = true; }
            if (goodLesson.teacherId) { teacherSlots[goodLesson.teacherId][d3][goodSlot] = false; teacherSlots[goodLesson.teacherId][d3][badSlot] = true; }
            // Update room slots
            if (badLesson.cabinet && roomSlots[badLesson.cabinet]) { roomSlots[badLesson.cabinet][d3][badSlot] = false; roomSlots[badLesson.cabinet][d3][goodSlot] = true; }
            if (goodLesson.cabinet && roomSlots[goodLesson.cabinet]) { roomSlots[goodLesson.cabinet][d3][goodSlot] = false; roomSlots[goodLesson.cabinet][d3][badSlot] = true; }
            break; // fixed this one, move to next
          }
        }
      }
    });
  }

  /* Random optimization */
  if (onProgress) onProgress({ phase: 'optimizing', progress: 90, placed: totalPlaced, total: totalTasks });
  for (var pass = 0; pass < 2000; pass++) {
    var rCls = data.classes[Math.floor(Math.random() * data.classes.length)];
    var rDay = Math.floor(Math.random() * DAYS);
    var grade2 = v2GetGrade(rCls), maxPd2 = V2_MAX_PD[grade2] || 7;
    var s1 = Math.floor(Math.random() * maxPd2), s2 = Math.floor(Math.random() * maxPd2);
    if (s1 === s2) continue;
    var a = schedule[rCls][rDay][s1], b = schedule[rCls][rDay][s2];
    if (!a && !b) continue;
    var canSwap = true;
    if (a && b && a.teacherId !== b.teacherId) {
      if (a.teacherId && teacherSlots[a.teacherId][rDay][s2] && (!b || b.teacherId !== a.teacherId)) canSwap = false;
      if (b.teacherId && teacherSlots[b.teacherId][rDay][s1] && (!a || a.teacherId !== b.teacherId)) canSwap = false;
    }
    if (!canSwap) continue;
    var penBefore = _v2DayPenalty(schedule[rCls][rDay], grade2);
    schedule[rCls][rDay][s1] = b; schedule[rCls][rDay][s2] = a;
    var penAfter = _v2DayPenalty(schedule[rCls][rDay], grade2);
    if (penAfter < penBefore) {
      if (a && a.teacherId) { teacherSlots[a.teacherId][rDay][s1] = false; teacherSlots[a.teacherId][rDay][s2] = true; }
      if (b && b.teacherId) { teacherSlots[b.teacherId][rDay][s2] = false; teacherSlots[b.teacherId][rDay][s1] = true; }
    } else { schedule[rCls][rDay][s1] = a; schedule[rCls][rDay][s2] = b; }
  }

  if (onProgress) onProgress({ phase: 'done', progress: 100, placed: totalPlaced, total: totalTasks });
  return { schedule: schedule, classes: data.classes, placed: totalPlaced, total: totalTasks, errors: errors };
}

function _v2AllBlocked(daySlots, d) {
  if (!daySlots || !daySlots[d]) return false;
  for (var i = 0; i < daySlots[d].length; i++) if (!daySlots[d][i]) return false;
  return true;
}

function _v2DayPenalty(daySchedule, grade) {
  var pen = 0;
  for (var i = 0; i < daySchedule.length; i++) {
    var s = daySchedule[i];
    if (!s) continue;
    var isH = v2GetDifficulty(s.subject, grade) >= v2HardThreshold(grade);
    if (isH && (i < 1 || i > 3)) pen += 3;
    if (!isH && i >= 1 && i <= 3) pen += 1;
    if (i === 0 && isH) pen += 5;
    if (isH && i > 0 && daySchedule[i-1]) {
      if (v2GetDifficulty(daySchedule[i-1].subject, grade) >= v2HardThreshold(grade)) {
        // Only penalize if at least one is outside optimal range (slots 1-3 = lessons 2-4)
        if (i < 1 || i > 3 || (i-1) < 1 || (i-1) > 3) {
          pen += 2;
          if (i > 1 && daySchedule[i-2] && v2GetDifficulty(daySchedule[i-2].subject, grade) >= v2HardThreshold(grade)) pen += 5;
        }
      }
    }
  }
  var lastFilled = -1;
  for (var j = 0; j < daySchedule.length; j++) {
    if (daySchedule[j]) { if (lastFilled >= 0 && j - lastFilled > 1) pen += 20; lastFilled = j; }
  }
  return pen;
}

/* ═══════════════════════════════════════════════════════════════
   АУДИТ
   ═══════════════════════════════════════════════════════════════ */

function v2Audit(result) {
  var violations = [], warnings = [], DN = ['Пн','Вт','Ср','Чт','Пт','Сб'];
  result.classes.forEach(function(cls) {
    var grade = v2GetGrade(cls), maxPd = V2_MAX_PD[grade] || 7, maxWk = V2_MAX_WK[grade] || 34, weekTotal = 0;
    for (var d = 0; d < result.schedule[cls].length; d++) {
      var dayCount = 0, day = result.schedule[cls][d];
      for (var s = 0; s < day.length; s++) {
        if (day[s]) {
          dayCount++;
          if (v2IsHard(day[s].subject, grade) && (s < 1 || s > 3))
            warnings.push({ cls: cls, id: 'E-01', desc: cls + ' ' + DN[d] + ': ' + day[s].subject + ' на ' + (s+1) + '-м уроке' });
        }
      }
      weekTotal += dayCount;
      if (dayCount > maxPd) violations.push({ cls: cls, id: 'C-01', desc: cls + ' ' + DN[d] + ': ' + dayCount + ' ур. (макс. ' + maxPd + ')' });
    }
    if (weekTotal > maxWk) violations.push({ cls: cls, id: 'C-02', desc: cls + ': ' + weekTotal + ' ч/нед (макс. ' + maxWk + ')' });
  });
  return { score: Math.max(0, 100 - violations.length * 10 - warnings.length), violations: violations, warnings: warnings, placed: result.placed, total: result.total, unplaced: result.errors };
}

/* ═══════════════════════════════════════════════════════════════
   ЭКСПОРТ
   ═══════════════════════════════════════════════════════════════ */

function v2ExportXlsx(result) {
  var sch = result.schedule;
  var DN = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

  // Filter only classes with lessons, sort
  var classes = result.classes.filter(function(cls) {
    for (var d = 0; d < 5; d++) {
      if ((sch[cls][d] || []).some(function(s) { return s; })) return true;
    }
    return false;
  }).sort(function(a, b) {
    var na = parseInt(a), nb = parseInt(b);
    return na !== nb ? na - nb : a.localeCompare(b, 'ru');
  });

  // Find max lessons per day
  var maxPerDay = [];
  for (var md = 0; md < 5; md++) {
    var mx = 0;
    classes.forEach(function(cls) {
      var c = (sch[cls][md] || []).filter(function(s) { return s; }).length;
      if (c > mx) mx = c;
    });
    maxPerDay.push(mx || 1);
  }

  var wb = XLSX.utils.book_new();

  // === Лист 1: Предметы ===
  var rows1 = [['День', '№'].concat(classes)];
  for (var di = 0; di < 5; di++) {
    for (var li = 0; li < maxPerDay[di]; li++) {
      var row = [li === 0 ? DN[di] : '', li + 1];
      classes.forEach(function(cls) {
        var filled = (sch[cls][di] || []).filter(function(s) { return s; });
        row.push(filled[li] ? filled[li].subject : '');
      });
      rows1.push(row);
    }
  }
  var ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [{ wch: 14 }, { wch: 4 }].concat(classes.map(function() { return { wch: 22 }; }));
  // Merge day cells
  ws1['!merges'] = [];
  var rowIdx = 1;
  for (var mi = 0; mi < 5; mi++) {
    if (maxPerDay[mi] > 1) {
      ws1['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx + maxPerDay[mi] - 1, c: 0 } });
    }
    rowIdx += maxPerDay[mi];
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Расписание');

  // === Лист 2: Учителя ===
  var rows2 = [['День', '№'].concat(classes)];
  for (var di2 = 0; di2 < 5; di2++) {
    for (var li2 = 0; li2 < maxPerDay[di2]; li2++) {
      var row2 = [li2 === 0 ? DN[di2] : '', li2 + 1];
      classes.forEach(function(cls) {
        var filled = (sch[cls][di2] || []).filter(function(s) { return s; });
        row2.push(filled[li2] ? filled[li2].teacherName : '');
      });
      rows2.push(row2);
    }
  }
  var ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{ wch: 14 }, { wch: 4 }].concat(classes.map(function() { return { wch: 28 }; }));
  ws2['!merges'] = ws1['!merges'];
  XLSX.utils.book_append_sheet(wb, ws2, 'Учителя');

  // === Лист 3: Предмет + Учитель ===
  var rows3 = [['День', '№'].concat(classes)];
  for (var di3 = 0; di3 < 5; di3++) {
    for (var li3 = 0; li3 < maxPerDay[di3]; li3++) {
      var row3 = [li3 === 0 ? DN[di3] : '', li3 + 1];
      classes.forEach(function(cls) {
        var filled = (sch[cls][di3] || []).filter(function(s) { return s; });
        var les = filled[li3];
        row3.push(les ? les.subject + ' (' + les.teacherName + ')' : '');
      });
      rows3.push(row3);
    }
  }
  var ws3 = XLSX.utils.aoa_to_sheet(rows3);
  ws3['!cols'] = [{ wch: 14 }, { wch: 4 }].concat(classes.map(function() { return { wch: 36 }; }));
  ws3['!merges'] = ws1['!merges'];
  XLSX.utils.book_append_sheet(wb, ws3, 'Полное');

  XLSX.writeFile(wb, 'raspisanie-v2.xlsx');
}
