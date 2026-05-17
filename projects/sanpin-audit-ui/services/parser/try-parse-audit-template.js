// Модуль: try-parse-audit-template
// Задача: Парсинг расписания, сохранённого в формате аудит-шаблона
// Автор: Claude (ШколаПлан AI)
// Описание:
//   Формат: 3 листа («Расписание», «Учителя», «Полное») с одинаковой
//   сеткой [День | № | классы...]. Это формат, который пишет v2ExportXlsx
//   в generator-v2.js — чтобы выход генератора без преобразований шёл на
//   вход аудита. Парсер берёт лист «Расписание» (только предметы), для
//   совместимости с остальным конвейером возвращает schedule в форме
//   schedule[className] = [dayArr0, dayArr1, ...].
//   Опционально извлекает учителей из листа «Учителя» в meta.teacherMap.

const XLSX = require('xlsx');

const WEEKDAY_COUNT = 6; // Пн..Сб

const DAY_MAP = {
  'понедельник': 0, 'пн': 0,
  'вторник': 1, 'вт': 1,
  'среда': 2, 'ср': 2,
  'четверг': 3, 'чт': 3,
  'пятница': 4, 'пт': 4,
  'суббота': 5, 'сб': 5,
};

function dayIndex(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/[.,;:].*$/, '').trim();
  if (DAY_MAP[s] !== undefined) return DAY_MAP[s];
  /* Префиксное сопоставление: «Понедельник.», «Пн» и т.п. */
  for (const k of Object.keys(DAY_MAP)) {
    if (s.startsWith(k)) return DAY_MAP[k];
  }
  return null;
}

/* Регулярка класса: «5А», «11Г», «10 а», «9-1». */
const CLASS_RE = /^\s*(\d{1,2})\s*([а-яa-zА-ЯA-Z])?\s*$/;

function isClassName(raw) {
  if (!raw) return false;
  return CLASS_RE.test(String(raw).trim());
}

/**
 * Проверка, что workbook имеет структуру аудит-шаблона.
 *
 * Решающий признак — лист «Расписание» с шапкой [День | №] в первых
 * 5 строках. Это формат как ручного шаблона (1 лист), так и экспорта
 * из генератора (3 листа); парсер обрабатывает оба одинаково.
 * Старая эвристика по составу листов («Расписание» + «Учителя»/«Полное»)
 * не распознавала ручной шаблон с единственным листом.
 *
 * @param {XLSX.WorkBook} workbook
 * @returns {boolean}
 */
function isAuditTemplate(workbook) {
  const scheduleSheetName = (workbook.SheetNames || []).find(n =>
    n.toLowerCase().trim().includes('расписан')
  );
  if (!scheduleSheetName) return false;
  const sheet = workbook.Sheets[scheduleSheetName];
  if (!sheet || !sheet['!ref']) return false;

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
  /* Шапка может быть на row 0..4 (метаданные могут быть выше). */
  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    const row = matrix[r] || [];
    const c0 = String(row[0] || '').toLowerCase().trim();
    const c1 = String(row[1] || '').toLowerCase().trim();
    if (c0.startsWith('день') && (c1 === '№' || c1.startsWith('ур'))) {
      return true;
    }
  }
  return false;
}

function findSheetByName(workbook, needle) {
  const lower = needle.toLowerCase();
  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes(lower)) return workbook.Sheets[sheetName];
  }
  return null;
}

/**
 * Парсит один лист (как «Расписание» или «Учителя» — структура одинакова)
 * в { schedule, classNames }.
 *   schedule[className] = [dayArr0, dayArr1, ..., dayArr5]
 *   dayArr — массив строк, выровненный пустыми строками до длины наибольшего дня.
 *
 * @param {XLSX.WorkSheet} sheet
 * @returns {{ schedule: Record<string,string[][]>, classNames: string[] }}
 */
function parseSheet(sheet) {
  if (!sheet || !sheet['!ref']) {
    return { schedule: {}, classNames: [] };
  }

  /* sheet_to_json даёт массив-массивов с защитой от sparse ячеек. */
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
  if (matrix.length < 2) return { schedule: {}, classNames: [] };

  /* Найти строку заголовка: первая строка, где col 0 = «День», col 1 = «№». */
  let headerRow = -1;
  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    const row = matrix[r];
    const c0 = String(row[0] || '').toLowerCase().trim();
    const c1 = String(row[1] || '').toLowerCase().trim();
    if (c0.startsWith('день') && (c1 === '№' || c1.startsWith('ур'))) {
      headerRow = r;
      break;
    }
  }
  /* Фолбэк: первая строка с классами в столбцах 2+ */
  if (headerRow === -1) {
    for (let r = 0; r < Math.min(matrix.length, 5); r++) {
      const row = matrix[r];
      let classCount = 0;
      for (let c = 2; c < row.length; c++) {
        if (isClassName(row[c])) classCount++;
      }
      if (classCount >= 2) { headerRow = r; break; }
    }
  }
  if (headerRow === -1) return { schedule: {}, classNames: [] };

  /* Шапка → список классов и их колонок. */
  const classCols = []; // {className, col}
  const header = matrix[headerRow];
  for (let c = 2; c < header.length; c++) {
    const raw = String(header[c] || '').trim();
    if (raw && isClassName(raw)) {
      /* Нормализация: «5 а» → «5А». */
      const m = raw.match(CLASS_RE);
      const num = m[1];
      const letter = (m[2] || '').toUpperCase();
      classCols.push({ className: num + letter, col: c });
    }
  }
  if (classCols.length === 0) return { schedule: {}, classNames: [] };

  /* Данные. Идём построчно, день определяется первой непустой ячейкой в col 0
     в текущем блоке. Слот = значение col 1 (число), либо просто инкремент. */
  /** @type {Record<string, Record<number, string[]>>} */
  const byClassDay = {};
  classCols.forEach(cc => { byClassDay[cc.className] = {}; });

  let currentDay = null;
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const dCell = String(row[0] || '').trim();
    if (dCell) {
      const di = dayIndex(dCell);
      if (di !== null) currentDay = di;
    }
    if (currentDay === null) continue;

    /* Если в строке нет ни одного непустого значения в колонках классов — пропуск. */
    let anyContent = false;
    for (const cc of classCols) {
      if (String(row[cc.col] || '').trim()) { anyContent = true; break; }
    }
    if (!anyContent) continue;

    /* Каждый класс получает значение этой ячейки в текущий день. */
    for (const cc of classCols) {
      const raw = String(row[cc.col] || '').trim();
      if (!byClassDay[cc.className][currentDay]) byClassDay[cc.className][currentDay] = [];
      byClassDay[cc.className][currentDay].push(raw);
    }
  }

  /* Преобразование в schedule[className] = [day0, day1, ..., day5] с выравниванием. */
  const schedule = {};
  const classNames = [];
  for (const cc of classCols) {
    const dayMap = byClassDay[cc.className];
    const dayArrs = [];
    /* Сначала собираем все 6 дней; пропущенные дни — пустые. */
    let maxLen = 1;
    for (let d = 0; d < WEEKDAY_COUNT; d++) {
      const arr = (dayMap[d] || []).slice();
      dayArrs.push(arr);
      if (arr.length > maxLen) maxLen = arr.length;
    }
    /* Удаляем пустые «хвосты» внутри каждого дня — пустых ячеек в конце.
       Аудит ожидает, что окно (пустой слот между уроками) сохранится,
       но завершающие пустые слоты — это просто конец дня, не окно. */
    const normalized = dayArrs.map(arr => {
      let end = arr.length;
      while (end > 0 && arr[end - 1] === '') end--;
      const trimmed = arr.slice(0, end);
      while (trimmed.length < maxLen) trimmed.push('');
      return trimmed;
    });

    /* Если все 6 дней пустые — класс не включаем. */
    const hasAny = normalized.some(d => d.some(x => x));
    if (hasAny) {
      schedule[cc.className] = normalized;
      classNames.push(cc.className);
    }
  }

  return { schedule, classNames };
}

/**
 * Главная функция парсинга аудит-шаблона.
 *
 * @param {XLSX.WorkBook} workbook
 * @returns {{
 *   schedule: Record<string, string[][]>,
 *   meta: { teacherMap?: Record<string, string[][]> }
 * }}
 */
function tryParseAuditTemplate(workbook) {
  const scheduleSheet = findSheetByName(workbook, 'расписан');
  if (!scheduleSheet) {
    throw new Error('В файле не найден лист «Расписание».');
  }

  const { schedule } = parseSheet(scheduleSheet);
  if (Object.keys(schedule).length === 0) {
    throw new Error('Лист «Расписание» не содержит распознаваемых данных.');
  }

  const meta = {};
  const teachersSheet = findSheetByName(workbook, 'учител');
  if (teachersSheet) {
    const { schedule: teacherSchedule } = parseSheet(teachersSheet);
    if (Object.keys(teacherSchedule).length > 0) {
      meta.teacherMap = teacherSchedule;
    }
  }

  return { schedule, meta };
}

module.exports = { tryParseAuditTemplate, isAuditTemplate, parseSheet };
