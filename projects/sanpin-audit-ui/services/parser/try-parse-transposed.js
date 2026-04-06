// Модуль: try-parse-transposed
// Задача: US-0403 — транспонированный формат (строки = уроки, столбцы = классы).

const XLSX = require('xlsx');
const { matchDayIndex, expandMergedCells } = require('./try-parse-rows');

const WEEKDAY_COUNT = 5;
const HEADER_HINT = /^(класс|class|урок|lesson|№|номер)$/i;
const CLASS_NAME_PATTERN = /^\s*\d{1,2}\s*([а-яa-z]|[-/]\s*\d{1,2}\s*[а-яa-z]?)?\s*$/i;

function normalizeMatrix(rows) {
  let maxC = 0;
  for (const row of rows) maxC = Math.max(maxC, row.length);
  for (const row of rows) {
    while (row.length < maxC) row.push('');
  }
  return rows;
}

function isClassLike(raw) {
  const s = String(raw ?? '').trim();
  if (!s || HEADER_HINT.test(s)) return false;
  return CLASS_NAME_PATTERN.test(s);
}

function detectHeader(matrix) {
  const maxScan = Math.min(8, matrix.length);
  let best = null;

  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    const cols = [];
    for (let c = 1; c < row.length; c++) {
      if (isClassLike(row[c])) cols.push({ c, className: String(row[c]).trim() });
    }
    if (!cols.length) continue;
    if (!best || cols.length > best.classCols.length) {
      best = { headerRow: r, classCols: cols };
    }
  }

  return best;
}

function emptyWeek() {
  return Array.from({ length: WEEKDAY_COUNT }, () => []);
}

function ensureClass(schedule, className) {
  if (!schedule[className]) schedule[className] = emptyWeek();
}

function hasAnyLesson(row, classCols) {
  return classCols.some(({ c }) => String(row[c] ?? '').trim() !== '');
}

function rowLooksLikeLessonNumber(v) {
  return /^\s*\d{1,2}\s*$/.test(String(v ?? '').trim());
}

function parseSheetIntoSchedule(sheet, sheetName, schedule) {
  const matrix = normalizeMatrix(
    XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  );
  if (matrix.length < 2) return;

  expandMergedCells(sheet, matrix);

  const header = detectHeader(matrix);
  if (!header) return;

  let dayFromSheet = matchDayIndex(sheetName);
  let currentDay = dayFromSheet !== null ? dayFromSheet : null;
  let dataStart = header.headerRow + 1;

  for (let r = dataStart; r < matrix.length; r++) {
    const row = matrix[r];
    const first = String(row[0] ?? '').trim();

    const dayInFirstCol = matchDayIndex(first);
    if (dayInFirstCol !== null) {
      currentDay = dayInFirstCol;
      continue;
    }

    if (!hasAnyLesson(row, header.classCols)) continue;

    // При отсутствии явного дня в листе/колонке начинаем с Пн.
    if (currentDay === null) currentDay = 0;
    if (currentDay >= WEEKDAY_COUNT) continue;

    // Пропускаем служебные строки вида "Урок" / "1" только в первом столбце.
    if (HEADER_HINT.test(first) || (first && currentDay === null && rowLooksLikeLessonNumber(first))) {
      continue;
    }

    for (const { c, className } of header.classCols) {
      ensureClass(schedule, className);
      const subject = String(row[c] ?? '').trim();
      if (subject !== '') schedule[className][currentDay].push(subject);
    }
  }
}

/**
 * Транспонированный парсер:
 * - поддержка нескольких листов (часто лист = день),
 * - поддержка дня в первой колонке внутри листа,
 * - единый JSON-выход: { "5А": [Пн[], Вт[], Ср[], Чт[], Пт[]], ... }.
 *
 * @param {import('xlsx').WorkBook} workbook
 * @returns {Record<string, string[][]>}
 */
function tryParseTransposed(workbook) {
  /** @type {Record<string, string[][]>} */
  const schedule = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    parseSheetIntoSchedule(sheet, sheetName, schedule);
  }

  const classNames = Object.keys(schedule);
  if (!classNames.length) {
    throw new Error('Не удалось распознать транспонированный формат.');
  }

  for (const className of classNames) {
    const days = schedule[className];
    const maxLen = Math.max(1, ...days.map((d) => d.length));
    for (let i = 0; i < WEEKDAY_COUNT; i++) {
      while (days[i].length < maxLen) days[i].push('');
    }
  }

  return schedule;
}

module.exports = { tryParseTransposed };
