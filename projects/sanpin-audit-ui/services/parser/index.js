// Модуль: parser
// Задача: US-0401-ST06
// Автор: —
// Описание: Оркестратор парсинга. Определяет стратегию, запускает парсер,
//           обновляет статус записи в БД (uploaded → parsing → parsed | error).

const XLSX = require('xlsx');
const db = require('../../config/database');
const { tryParseRows } = require('./try-parse-rows'); // US-0402
// const { tryParseTransposed } = require('./try-parse-transposed'); // US-0403
// const { normSubj } = require('./norm-subj');                  // US-0404

// ─── Детекция стратегии ─────────────────────────────────────

// Без \\b: в JS граница «слова» не работает с кириллицей.
const DAY_PATTERN =
  /^\s*(понедельник|вторник|среда|четверг|пятница|суббота|пн|вт|ср|чт|пт|сб)(?:$|(?=\s)|(?=[^а-яёa-z0-9])|[.,;:])/i;

/**
 * @param {XLSX.WorkBook} workbook
 * @returns {'rows' | 'transposed'}
 */
function detectStrategy(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');

  // Если ≥ 5 листов — вероятно, лист = день → транспонированный
  if (workbook.SheetNames.length >= 5) return 'transposed';

  let daysInRow = 0;
  let daysInCol = 0;

  for (let c = range.s.c; c <= Math.min(range.e.c, 30); c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && DAY_PATTERN.test(String(cell.v || '').trim())) daysInRow++;
  }

  for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell && DAY_PATTERN.test(String(cell.v || '').trim())) daysInCol++;
  }

  return daysInRow >= daysInCol ? 'rows' : 'transposed';
}

// ─── Базовый парсер-заглушка ────────────────────────────────
// Будет заменён на tryParseRows / tryParseTransposed (US-0402/0403)

function basicParse(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error('Файл пуст или содержит слишком мало данных.');
  }

  const schedule = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const className = String(row[0] || '').trim();
    if (!className || /^(класс|урок|предмет|день|№)/i.test(className)) continue;

    const lessons = row.slice(1).map((c) => String(c || '').trim());
    const perDay = Math.ceil(lessons.length / 5) || 1;
    const days = [];

    for (let d = 0; d < 5; d++) {
      days.push(
        lessons.slice(d * perDay, (d + 1) * perDay).filter((l) => l !== '')
      );
    }

    schedule[className] = days;
  }

  return schedule;
}

// ─── Главная функция парсинга файла ─────────────────────────

/**
 * Парсит Excel-файл расписания.
 *
 * @param {string} filePath  — абсолютный путь к файлу на диске
 * @param {string} originalName — оригинальное имя файла
 * @returns {Promise<{ schedule: object, classesCount: number, strategy: string }>}
 */
async function parseScheduleFile(filePath, originalName) {
  const workbook = XLSX.readFile(filePath);

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Файл не содержит ни одного листа.');
  }

  const strategy = detectStrategy(workbook);
  let schedule;

  switch (strategy) {
    case 'rows':
      schedule = tryParseRows(workbook);
      break;
    // case 'transposed':
    //   schedule = tryParseTransposed(workbook);   // US-0403
    //   break;
    default:
      schedule = basicParse(workbook);
      break;
  }

  // schedule = normSubj(schedule);  // US-0404

  const classNames = Object.keys(schedule);
  if (classNames.length === 0) {
    throw new Error('Не удалось распознать ни одного класса в файле.');
  }

  return { schedule, classesCount: classNames.length, strategy };
}

// ─── Фоновый запуск парсинга с обновлением БД ──────────────

/**
 * Вызывается из routes/schedules.js после INSERT.
 * Работает асинхронно — вызывающий код НЕ ждёт завершения.
 *
 * @param {number} scheduleId  — id записи в таблице schedules
 * @param {string} filePath    — путь к файлу
 * @param {string} originalName
 */
async function runParseInBackground(scheduleId, filePath, originalName) {
  try {
    await db.query(
      `UPDATE schedules SET status = 'parsing', updated_at = NOW() WHERE id = $1`,
      [scheduleId]
    );

    const result = await parseScheduleFile(filePath, originalName);

    await db.query(
      `UPDATE schedules
       SET status = 'parsed',
           data_json = $2,
           classes_count = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [scheduleId, JSON.stringify(result.schedule), result.classesCount]
    );

    console.log(`[Parser] #${scheduleId} OK — ${result.classesCount} классов, стратегия: ${result.strategy}`);
  } catch (err) {
    console.error(`[Parser] #${scheduleId} FAIL:`, err.message);
    await db.query(
      `UPDATE schedules SET status = 'error', error_message = $2, updated_at = NOW() WHERE id = $1`,
      [scheduleId, err.message]
    ).catch(() => {});
  }
}

module.exports = { parseScheduleFile, detectStrategy, runParseInBackground };
