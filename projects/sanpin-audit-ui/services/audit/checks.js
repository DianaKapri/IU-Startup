// Модуль: audit/checks
// Задачи: US-0502 (X-01 окна), US-0503 (C-01 макс. уроков/день, C-02 недельная нагрузка)
// Описание: Функции проверки расписания на соответствие СанПиН.

const { getMaxLessonsPerDay, getMaxWeeklyHours } = require('../sanpin-norms');

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Извлекает номер параллели (grade) из названия класса.
 * "5А" → 5, "10Б" → 10, "11" → 11
 */
function parseGrade(className) {
  const m = String(className).match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── X-01: Окна в расписании ──────────────────────────────────

/**
 * US-0502: Находит окна (пустые слоты между уроками) в расписании класса.
 *
 * Окно — пустой слот между первым и последним непустым уроком дня.
 * Пустоты до первого и после последнего урока — НЕ окна.
 *
 * @param {string[][]} classSchedule — массив дней, каждый день — массив предметов
 * @returns {{ class?: string, day: number, dayLabel: string, lessonNum: number }[]}
 */
function checkGaps(classSchedule) {
  const violations = [];

  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const lessons = classSchedule[dayIdx];
    if (!lessons || lessons.length === 0) continue;

    // Найти индексы первого и последнего непустого урока
    let first = -1;
    let last = -1;
    for (let i = 0; i < lessons.length; i++) {
      if (lessons[i] && lessons[i].trim()) {
        if (first === -1) first = i;
        last = i;
      }
    }

    if (first === -1 || first === last) continue;

    // Всё между first и last, что пусто — окно
    for (let i = first + 1; i < last; i++) {
      if (!lessons[i] || !lessons[i].trim()) {
        violations.push({
          day: dayIdx,
          dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
          lessonNum: i + 1,
        });
      }
    }
  }

  return violations;
}

// ─── C-01: Макс. уроков в день ────────────────────────────────

/**
 * US-0503: Проверяет, что количество уроков в каждом дне не превышает норму.
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @param {5|6} [weekDays=5] — продолжительность учебной недели
 * @returns {{ day: number, dayLabel: string, actual: number, max: number }[]}
 */
function checkMaxLessonsPerDay(classSchedule, grade, weekDays = 5) {
  const violations = [];
  const max = getMaxLessonsPerDay(grade, weekDays);
  if (max == null) return violations;

  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const lessons = classSchedule[dayIdx];
    if (!lessons) continue;

    const actual = lessons.filter((s) => s && s.trim()).length;
    if (actual > max) {
      violations.push({
        day: dayIdx,
        dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
        actual,
        max,
      });
    }
  }

  return violations;
}

// ─── C-02: Недельная нагрузка ─────────────────────────────────

/**
 * US-0503: Проверяет, что суммарная недельная нагрузка не превышает норму.
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @param {5|6} [weekDays=5] — продолжительность учебной недели
 * @returns {{ actual: number, max: number } | null} — null если нарушений нет
 */
function checkMaxWeeklyHours(classSchedule, grade, weekDays = 5) {
  const max = getMaxWeeklyHours(grade, weekDays);
  if (max == null) return null;

  let actual = 0;
  for (const lessons of classSchedule) {
    if (!lessons) continue;
    actual += lessons.filter((s) => s && s.trim()).length;
  }

  if (actual > max) {
    return { actual, max };
  }

  return null;
}

// ─── Агрегатор: запуск всех проверок для расписания ───────────

/**
 * Запускает все проверки для полного расписания школы.
 *
 * @param {Object} schedule — { "5А": [["Математика", ...], ...], ... }
 * @param {Object} [opts]
 * @param {5|6}    [opts.weekDays=5] — продолжительность учебной недели
 * @returns {{ ruleId: string, severity: string, class: string, message: string, details: object }[]}
 */
function runChecks(schedule, opts = {}) {
  const { weekDays = 5 } = opts;
  const results = [];

  for (const [className, days] of Object.entries(schedule)) {
    const grade = parseGrade(className);
    if (!grade) continue;

    // X-01: окна
    const gaps = checkGaps(days);
    for (const gap of gaps) {
      results.push({
        ruleId: 'X-01',
        severity: 'hard',
        class: className,
        message: `Окно в расписании: ${className}, ${gap.dayLabel}, урок ${gap.lessonNum}`,
        details: { day: gap.day, dayLabel: gap.dayLabel, lessonNum: gap.lessonNum },
      });
    }

    // C-01: макс. уроков в день
    const dayViolations = checkMaxLessonsPerDay(days, grade, weekDays);
    for (const v of dayViolations) {
      results.push({
        ruleId: 'C-01',
        severity: 'hard',
        class: className,
        message: `${className}, ${v.dayLabel}: ${v.actual} уроков (макс. ${v.max})`,
        details: { day: v.day, dayLabel: v.dayLabel, actual: v.actual, max: v.max },
      });
    }

    // C-02: недельная нагрузка
    const weeklyViolation = checkMaxWeeklyHours(days, grade, weekDays);
    if (weeklyViolation) {
      results.push({
        ruleId: 'C-02',
        severity: 'hard',
        class: className,
        message: `${className}: ${weeklyViolation.actual} ч/нед (макс. ${weeklyViolation.max})`,
        details: { actual: weeklyViolation.actual, max: weeklyViolation.max },
      });
    }
  }

  return results;
}

module.exports = {
  checkGaps,
  checkMaxLessonsPerDay,
  checkMaxWeeklyHours,
  runChecks,
  parseGrade,
};
