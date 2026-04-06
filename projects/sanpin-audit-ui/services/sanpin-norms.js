// Модуль: sanpin-norms
// Задача: US-0501 — Нормативная база в JSON
// Описание: Загрузка и доступ к нормам СанПиН 1.2.3685-21 и МР 2.4.0331-23.

const rules = require('./sanpin-rules.json');

const { maxLessonsPerDay, maxWeeklyHours, difficultyScale, hardSubjects, hardSubjectThreshold } = rules;

/**
 * Максимальное количество уроков в день для класса.
 * @param {number} grade — класс (1–11)
 * @param {5|6} weekDays — 5-дневная или 6-дневная неделя (по умолчанию 5)
 * @returns {number|null}
 */
function getMaxLessonsPerDay(grade, weekDays = 5) {
  const key = weekDays === 6 ? 'sixDayWeek' : 'fiveDayWeek';
  return maxLessonsPerDay[key][String(grade)] ?? null;
}

/**
 * Максимальная недельная нагрузка (часов) для класса.
 * @param {number} grade — класс (1–11)
 * @param {5|6} weekDays — 5-дневная или 6-дневная неделя (по умолчанию 5)
 * @returns {number|null}
 */
function getMaxWeeklyHours(grade, weekDays = 5) {
  const key = weekDays === 6 ? 'sixDayWeek' : 'fiveDayWeek';
  return maxWeeklyHours[key][String(grade)] ?? null;
}

/**
 * Балл трудности предмета для конкретного класса.
 * @param {string} subject — каноническое название предмета
 * @param {number} grade — класс (1–11)
 * @param {number} fallback — значение по умолчанию, если предмет не найден (по умолчанию 5)
 * @returns {number}
 */
function getDifficulty(subject, grade, fallback = 5) {
  if (grade <= 4) {
    return difficultyScale.grades_1_4[subject] ?? fallback;
  }
  if (grade <= 9) {
    const entry = difficultyScale.grades_5_9[subject];
    if (!entry) return fallback;
    const val = entry[String(grade)];
    if (val != null) return val;
    // Ближайший доступный класс
    for (let d = 1; d <= 4; d++) {
      if (entry[String(grade - d)] != null) return entry[String(grade - d)];
      if (entry[String(grade + d)] != null) return entry[String(grade + d)];
    }
    return fallback;
  }
  // 10–11
  return difficultyScale.grades_10_11[subject] ?? fallback;
}

/**
 * Порог балла, при котором предмет считается «сложным».
 * @param {number} grade
 * @returns {number}
 */
function getHardThreshold(grade) {
  if (grade <= 4) return hardSubjectThreshold.grades_1_4;
  if (grade <= 9) return hardSubjectThreshold.grades_5_9;
  return hardSubjectThreshold.grades_10_11;
}

/**
 * Проверяет, является ли предмет «сложным» для данного класса.
 * @param {string} subject
 * @param {number} grade
 * @returns {boolean}
 */
function isHardSubject(subject, grade) {
  return getDifficulty(subject, grade, 0) >= getHardThreshold(grade);
}

module.exports = {
  rules,
  getMaxLessonsPerDay,
  getMaxWeeklyHours,
  getDifficulty,
  getHardThreshold,
  isHardSubject,
  HARD_SUBJECTS: hardSubjects.list,
};
