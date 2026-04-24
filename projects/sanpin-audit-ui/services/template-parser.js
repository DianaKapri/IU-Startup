// Модуль: services/template-parser
// Задача: EP-06/1.4 — парсер Excel-шаблона для генератора расписания
// Описание:
//   Читает .xlsx с листами: Учителя, Распределение, Ограничения,
//   Кабинеты, Классы; возвращает нормализованную структуру для
//   генератора + список ошибок с ссылкой на ячейку.

'use strict';

const XLSX = require('xlsx');

const REQUIRED_SHEETS = ['Учебный план', 'Учителя', 'Распределение', 'Ограничения', 'Кабинеты', 'Классы'];

// Эпик 1.3.4: предметы, для которых нужен специальный тип кабинета.
// Ключ — нормализованный (lowercase) предмет; значение — допустимые типы кабинетов.
const SUBJECT_ROOM_EXPECTATIONS = {
  'химия':               ['химия', 'лаборатория'],
  'физика':              ['физика', 'лаборатория'],
  'биология':            ['биология'],
  'информатика':         ['информатика'],
  'физическая культура': ['спортзал'],
  'физкультура':         ['спортзал'],
  'музыка':              ['музыка'],
  'изо':                 ['изо', 'мастерская'],
  'технология':          ['мастерская', 'технология'],
  'иностранный язык':    ['иностранный язык'],
  'английский язык':     ['иностранный язык'],
};

function expectedRoomTypes(subject) {
  const key = String(subject || '').toLowerCase().replace(/ё/g, 'е').trim();
  return SUBJECT_ROOM_EXPECTATIONS[key] || null;
}

// ─── Утилиты ──────────────────────────────────────────────────

function trimStr(v) {
  return v == null ? '' : String(v).trim();
}

function parseInt0(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseDays(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
}

// ─── Парсер ───────────────────────────────────────────────────

/**
 * Парсит буфер .xlsx и возвращает нормализованные данные.
 * @param {Buffer} buffer
 * @returns {{ classes, curriculum, weekDays, constraints, rooms, studentCounts, errors, warnings }}
 */
function parseTemplate(buffer) {
  const errors = [];
  const warnings = [];

  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    return { errors: [{ message: 'Не удалось прочитать файл как .xlsx: ' + err.message }] };
  }

  // Проверка обязательных листов
  for (const name of REQUIRED_SHEETS) {
    if (!wb.Sheets[name]) {
      errors.push({ message: `Не найден обязательный лист: «${name}»` });
    }
  }
  if (errors.length) return { errors, warnings };

  // ─── 0. Учебный план (source of truth для часов) ──────────
  // hoursPlan[subject][classId] = weeklyHours
  const hoursPlan = {};
  {
    const rows = sheetToRows(wb.Sheets['Учебный план']);
    const header = rows[0] || [];
    const classCols = []; // [colIndex, className]
    for (let c = 1; c < header.length; c++) {
      const cls = trimStr(header[c]);
      if (cls) classCols.push([c, cls]);
    }
    for (let r = 1; r < rows.length; r++) {
      const subject = trimStr(rows[r][0]);
      if (!subject || subject.toLowerCase().startsWith('итого')) continue;
      hoursPlan[subject] = hoursPlan[subject] || {};
      for (const [col, cls] of classCols) {
        const h = parseInt0(rows[r][col]);
        if (h > 0) hoursPlan[subject][cls] = h;
      }
    }
  }

  // ─── 1. Учителя ────────────────────────────────────────────
  const teachersMap = {}; // name → { id, plannedLoad }
  {
    const rows = sheetToRows(wb.Sheets['Учителя']);
    let idx = 0;
    for (let r = 1; r < rows.length; r++) {
      const name = trimStr(rows[r][0]);
      if (!name) continue;
      const load = parseInt0(rows[r][1]);
      idx++;
      teachersMap[name] = { id: 'T' + idx, plannedLoad: load, name };
    }
  }

  // ─── 2. Кабинеты ───────────────────────────────────────────
  const rooms = []; // { id, type, capacity, floor, equipment }
  const roomsMap = {};
  {
    const rows = sheetToRows(wb.Sheets['Кабинеты']);
    for (let r = 1; r < rows.length; r++) {
      const num = trimStr(rows[r][0]);
      if (!num) continue;
      const room = {
        id:         num,
        type:       trimStr(rows[r][1]) || null,
        capacity:   parseInt0(rows[r][2]) || null,
        floor:      parseInt0(rows[r][3]) || null,
        equipment:  trimStr(rows[r][4]) || null,
      };
      rooms.push(room);
      roomsMap[num] = room;
    }
  }

  // ─── 3. Классы ─────────────────────────────────────────────
  const studentCounts = {}; // className → count
  {
    const rows = sheetToRows(wb.Sheets['Классы']);
    for (let r = 1; r < rows.length; r++) {
      const cls = trimStr(rows[r][0]);
      if (!cls) continue;
      const count = parseInt0(rows[r][1]);
      if (count <= 0) {
        warnings.push({ sheet: 'Классы', row: r + 1, message: `Класс «${cls}»: количество учеников не задано, использую 25 по умолчанию` });
        studentCounts[cls] = 25;
      } else {
        studentCounts[cls] = count;
      }
    }
  }

  // ─── 4. Распределение → curriculum ─────────────────────────
  const curriculum = [];
  const classesSet = new Set();
  {
    const rows = sheetToRows(wb.Sheets['Распределение']);
    for (let r = 1; r < rows.length; r++) {
      const teacherName = trimStr(rows[r][0]);
      const subject     = trimStr(rows[r][1]);
      const classId     = trimStr(rows[r][2]);
      let hours         = parseInt0(rows[r][3]);
      const roomId      = trimStr(rows[r][4]) || null;

      // Fallback: если в колонке «Часов/нед» формула без кэша — берём из Учебного плана
      if (hours <= 0 && subject && classId && hoursPlan[subject] && hoursPlan[subject][classId]) {
        hours = hoursPlan[subject][classId];
      }

      if (!teacherName && !subject && !classId) continue;

      if (!teacherName) {
        errors.push({ sheet: 'Распределение', row: r + 1, message: 'Пустое ФИО учителя' });
        continue;
      }
      if (!teachersMap[teacherName]) {
        errors.push({ sheet: 'Распределение', row: r + 1, message: `Учитель «${teacherName}» не найден в листе «Учителя»` });
        continue;
      }
      if (!subject) {
        errors.push({ sheet: 'Распределение', row: r + 1, message: `Пустой предмет` });
        continue;
      }
      if (!classId) {
        errors.push({ sheet: 'Распределение', row: r + 1, message: `Пустой класс` });
        continue;
      }
      if (hours <= 0) {
        errors.push({ sheet: 'Распределение', row: r + 1, message: `Некорректные часы: «${rows[r][3]}»` });
        continue;
      }
      if (roomId && !roomsMap[roomId]) {
        warnings.push({ sheet: 'Распределение', row: r + 1, message: `Кабинет «${roomId}» не найден в листе «Кабинеты» — будет использован любой свободный` });
      }
      if (studentCounts[classId] == null) {
        warnings.push({ sheet: 'Распределение', row: r + 1, message: `Класс «${classId}» не описан в листе «Классы» — использую 25 учеников по умолчанию` });
        studentCounts[classId] = 25;
      }

      // Эпик 1.3.3: R-01 — вместимость кабинета ≥ числу учеников класса
      if (roomId && roomsMap[roomId] && roomsMap[roomId].capacity) {
        const cap = roomsMap[roomId].capacity;
        const need = studentCounts[classId] || 25;
        if (cap < need) {
          warnings.push({
            sheet: 'Распределение', row: r + 1,
            message: `R-01: кабинет «${roomId}» (${cap} мест) не вмещает класс «${classId}» (${need} учеников). Рекомендуется подобрать другой кабинет.`,
          });
        }
      }

      // Эпик 1.3.4: ожидание типа кабинета по предмету
      if (roomId && roomsMap[roomId] && roomsMap[roomId].type) {
        const expected = expectedRoomTypes(subject);
        if (expected) {
          const actualType = String(roomsMap[roomId].type).toLowerCase().replace(/ё/g, 'е').trim();
          if (!expected.some(t => actualType.includes(t))) {
            warnings.push({
              sheet: 'Распределение', row: r + 1,
              message: `R-02: предмет «${subject}» обычно требует кабинет типа «${expected[0]}», а назначен «${roomsMap[roomId].type}». Проверьте.`,
            });
          }
        }
      }

      curriculum.push({
        classId,
        subject,
        weeklyHours: hours,
        teacherId:   teachersMap[teacherName].id,
        teacherName,
        roomId:      roomId || 'к.1',
      });
      classesSet.add(classId);
    }
  }

  // ─── 5. Ограничения учителей ───────────────────────────────
  const constraints = {}; // teacherId → { methodDay, unavailableDays, maxLessonsPerDay }
  {
    const rows = sheetToRows(wb.Sheets['Ограничения']);
    for (let r = 1; r < rows.length; r++) {
      const name = trimStr(rows[r][0]);
      if (!name) continue;
      if (!teachersMap[name]) {
        warnings.push({ sheet: 'Ограничения', row: r + 1, message: `Учитель «${name}» не найден — ограничение игнорируется` });
        continue;
      }
      const methodDay = trimStr(rows[r][1]) || null;
      const unavailableDays = parseDays(rows[r][2]);
      const maxPerDay = parseInt0(rows[r][3]) || null;

      constraints[teachersMap[name].id] = {
        teacherName: name,
        methodDay,
        unavailableDays,
        maxLessonsPerDay: maxPerDay,
      };
    }
  }

  // ─── 6. Итоговая валидация ─────────────────────────────────
  const classes = Array.from(classesSet);
  if (classes.length === 0) {
    errors.push({ message: 'Не найдено ни одного класса в листе «Распределение»' });
  }
  if (curriculum.length === 0) {
    errors.push({ message: 'Не найдено ни одной строки в листе «Распределение»' });
  }

  // R-01 на уровне класса: есть ли вообще в школе кабинет, вмещающий этот класс?
  for (const cls of classes) {
    const need = studentCounts[cls] || 25;
    const anyFits = rooms.length === 0 || rooms.some(r => !r.capacity || r.capacity >= need);
    if (!anyFits) {
      // Это уже error, а не warning — класс в принципе не может быть размещён
      errors.push({
        message: `R-01: для класса «${cls}» (${need} учеников) нет ни одного кабинета с вместимостью ≥ ${need}. Добавьте подходящий кабинет в лист «Кабинеты» или уменьшите число учеников.`,
      });
    }
  }

  return {
    classes,
    curriculum,
    weekDays: 5, // переопределяется в endpoint'е
    constraints,
    rooms,
    studentCounts,
    teachers: Object.values(teachersMap),
    errors,
    warnings,
  };
}

module.exports = { parseTemplate };
