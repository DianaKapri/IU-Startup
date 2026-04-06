// Модуль: try-parse-rows
// Задача: US-0402 — строки = классы, столбцы = дни и уроки.

const XLSX = require('xlsx');

// Полные названия раньше коротких: иначе «чт» съест «четверг».
const DAY_HEAD =
  /^\s*(понедельник|вторник|среда|четверг|пятница|суббота|пн|вт|ср|чт|пт|сб)(?:$|(?=\s)|(?=[^а-яёa-z0-9])|[.,;:])/i;

/** @returns {number|null} индекс 0..5 для Пн..Сб */
function matchDayIndex(raw) {
  if (raw === '' || raw == null) return null;
  const s = String(raw).toLowerCase().replace(/\s+/g, ' ').trim();
  const m = s.match(DAY_HEAD);
  if (!m) return null;
  const p = m[1].toLowerCase();
  if (p.startsWith('пн') || p.startsWith('пон')) return 0;
  if (p.startsWith('вт') || p.startsWith('вто')) return 1;
  if (p.startsWith('ср') || p.startsWith('сре')) return 2;
  if (p.startsWith('чт') || p.startsWith('чет')) return 3;
  if (p.startsWith('пт') || p.startsWith('пят')) return 4;
  if (p.startsWith('сб') || p.startsWith('суб')) return 5;
  return null;
}

const WEEKDAY_COUNT = 6;

function normalizeMatrix(rows) {
  let maxC = 0;
  for (const row of rows) maxC = Math.max(maxC, row.length);
  for (const row of rows) {
    while (row.length < maxC) row.push('');
  }
  return rows;
}

/**
 * Заполняет пустые ячейки в областях объединения значением master (верхняя левая).
 * @param {import('xlsx').WorkSheet} sheet
 * @param {string[][]} matrix
 */
function expandMergedCells(sheet, matrix) {
  const merges = sheet['!merges'];
  if (!merges || merges.length === 0) return;

  for (const m of merges) {
    const { s, e } = m;
    let master = matrix[s.r] && matrix[s.r][s.c];
    if (master === '' || master == null) continue;
    master = String(master);
    for (let r = s.r; r <= e.r; r++) {
      if (!matrix[r]) continue;
      for (let c = s.c; c <= e.c; c++) {
        const v = matrix[r][c];
        if (v === '' || v == null) matrix[r][c] = master;
      }
    }
  }
}

/**
 * По строке заголовка: после первого столбца (класс) идут блоки «день → столбцы до следующего дня».
 * @returns {{ dayIndex: number, cols: number[] }[] | null}
 */
function dayGroupsFromHeaderRow(row) {
  /** @type {{ dayIndex: number, cols: number[] }[]} */
  const groups = [];
  let current = null;

  for (let c = 1; c < row.length; c++) {
    const di = matchDayIndex(row[c]);
    if (di !== null) {
      if (current && current.dayIndex === di) {
        current.cols.push(c);
      } else {
        if (current) groups.push(current);
        current = { dayIndex: di, cols: [c] };
      }
    } else if (current) {
      current.cols.push(c);
    }
  }
  if (current) groups.push(current);

  return groups.length >= 2 ? groups : null;
}

function isLessonSubheaderRow(row, groups) {
  const cols = groups.flatMap((g) => g.cols);
  if (cols.length < 2) return false;
  let num = 0;
  for (const c of cols) {
    const v = String(row[c] ?? '').trim();
    if (/^\d{1,2}$/.test(v)) num++;
  }
  return num >= Math.ceil(cols.length * 0.4);
}

function findDayGroups(matrix) {
  const maxScan = Math.min(8, matrix.length);
  for (let r = 0; r < maxScan; r++) {
    const groups = dayGroupsFromHeaderRow(matrix[r]);
    if (groups) return { headerRow: r, groups };
  }
  return null;
}

function equalSplitFallback(matrix, headerRows) {
  if (matrix.length <= headerRows) return null;

  let maxC = 0;
  for (const row of matrix) maxC = Math.max(maxC, row.length);
  const lessonCols = Math.max(0, maxC - 1);
  if (lessonCols < 1) return null;

  const perDay = Math.max(1, Math.ceil(lessonCols / WEEKDAY_COUNT));
  /** @type {{ dayIndex: number, cols: number[] }[]} */
  const groups = [];
  for (let d = 0; d < WEEKDAY_COUNT; d++) {
    const start = 1 + d * perDay;
    const cols = [];
    for (let k = 0; k < perDay && start + k < maxC; k++) cols.push(start + k);
    groups.push({ dayIndex: d, cols });
  }
  return { groups, dataRowOffset: headerRows };
}

/** Подряд одинаковые непустые ячейки после expand merge — один урок на объединённую область. */
function collapseMergedDuplicates(cells) {
  const out = [];
  for (const cell of cells) {
    const s = String(cell ?? '').trim();
    if (s !== '' && out.length && out[out.length - 1] === s) continue;
    out.push(s);
  }
  return out;
}

/**
 * Собирает уроки по дням (Пн..Сб).
 * @param {string[]} row
 * @param {{ dayIndex: number, cols: number[] }[]} groups
 * @returns {string[][]}
 */
function lessonsByWeekday(row, groups) {
  /** @type {string[][]} */
  const byDay = Array.from({ length: WEEKDAY_COUNT }, () => []);

  for (const g of groups) {
    if (g.dayIndex >= WEEKDAY_COUNT) continue;
    const raw = g.cols.map((c) => String(row[c] ?? '').trim());
    const lessons = collapseMergedDuplicates(raw).filter((s) => s !== '');
    byDay[g.dayIndex].push(...lessons);
  }

  return byDay;
}

const HEADER_FIRST_COL = /^(класс|class|№|номер|урок|день|п\/п)$/i;

function isDataRow(row, groups) {
  const first = String(row[0] ?? '').trim();
  if (!first) return false;
  if (HEADER_FIRST_COL.test(first)) return false;
  if (matchDayIndex(first) !== null) return false;
  const hasLesson = groups.some((g) =>
    g.cols.some((c) => String(row[c] ?? '').trim() !== '')
  );
  return hasLesson;
}

/**
 * Парсинг листа: строки — классы, столбцы — дни/уроки.
 *
 * @param {import('xlsx').WorkBook} workbook
 * @returns {Record<string, string[][]>}
 */
function tryParseRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = normalizeMatrix(
    XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  );
  expandMergedCells(sheet, matrix);

  if (matrix.length < 2) {
    throw new Error('Файл пуст или содержит слишком мало данных.');
  }

  let groups;
  let dataStart;
  let headerRow = 0;

  const found = findDayGroups(matrix);
  if (found) {
    headerRow = found.headerRow;
    groups = found.groups;
    dataStart = headerRow + 1;
    if (dataStart < matrix.length && isLessonSubheaderRow(matrix[dataStart], groups)) {
      dataStart++;
    }
  } else {
    const fb = equalSplitFallback(matrix, 1);
    if (!fb) {
      throw new Error('Не удалось найти заголовки дней в первых строках.');
    }
    groups = fb.groups;
    dataStart = fb.dataRowOffset;
  }

  /** @type {Record<string, string[][]>} */
  const schedule = {};

  for (let r = dataStart; r < matrix.length; r++) {
    const row = matrix[r];
    if (!isDataRow(row, groups)) continue;

    const className = String(row[0] ?? '').trim();
    const byDay = lessonsByWeekday(row, groups);

    const maxLen = Math.max(1, ...byDay.map((d) => d.length));
    const normalized = byDay.map((lessons) => {
      const copy = lessons.slice();
      while (copy.length < maxLen) copy.push('');
      return copy;
    });

    schedule[className] = normalized;
  }

  return schedule;
}

module.exports = { tryParseRows, matchDayIndex, expandMergedCells, dayGroupsFromHeaderRow };
