// Модуль: audit/checks
// Задачи: US-0502 (X-01), US-0503 (C-01/C-02), US-0505 (D-01), US-0506 (E-01), US-0507 (E-02), US-0508 (E-03)
// Описание: Функции проверки расписания на соответствие СанПиН.

const { getMaxLessonsPerDay, getMaxWeeklyHours, getDifficulty } = require('../sanpin-norms');

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

// ─── D-01: Распределение трудности по дням ────────────────────

/**
 * Рекомендуемый профиль трудности по дням недели (шкала Сивкова).
 * СанПиН 1.2.3685-21, МР 2.4.0331-23:
 * - Нарастание нагрузки к середине недели (Вт–Ср)
 * - Облегчённый день — Чт или Пт
 * - Пн — вкатывание, не максимальная нагрузка
 *
 * Нормализованный профиль (доля от суммарной недельной трудности):
 * Пн: 0.18, Вт: 0.23, Ср: 0.22, Чт: 0.19, Пт: 0.18
 * При 6-дн: Пн: 0.16, Вт: 0.20, Ср: 0.20, Чт: 0.17, Пт: 0.16, Сб: 0.11
 */
const RECOMMENDED_PROFILE_5 = [0.18, 0.23, 0.22, 0.19, 0.18];
const RECOMMENDED_PROFILE_6 = [0.16, 0.20, 0.20, 0.17, 0.16, 0.11];

/**
 * US-0505: Проверяет равномерность распределения трудности по дням недели.
 *
 * Рассчитывает балл трудности каждого дня (сумма баллов предметов по Сивкову),
 * сравнивает фактический профиль с рекомендуемым.
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @param {5|6} [weekDays=5]
 * @returns {{
 *   dailyScores: number[],
 *   weeklyTotal: number,
 *   actualProfile: number[],
 *   recommendedProfile: number[],
 *   peakDay: { day: number, dayLabel: string, score: number },
 *   lightestDay: { day: number, dayLabel: string, score: number },
 *   deviation: number,
 *   issues: string[]
 * }}
 */
function checkDifficultyDistribution(classSchedule, grade, weekDays = 5) {
  const recommended = weekDays === 6 ? RECOMMENDED_PROFILE_6 : RECOMMENDED_PROFILE_5;

  // Рассчитать балл трудности каждого дня
  const dailyScores = [];
  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const lessons = classSchedule[dayIdx];
    if (!lessons) { dailyScores.push(0); continue; }
    let dayScore = 0;
    for (const subj of lessons) {
      if (subj && subj.trim()) {
        dayScore += getDifficulty(subj, grade);
      }
    }
    dailyScores.push(dayScore);
  }

  const weeklyTotal = dailyScores.reduce((a, b) => a + b, 0);
  if (weeklyTotal === 0) {
    return {
      dailyScores, weeklyTotal, actualProfile: [], recommendedProfile: recommended,
      peakDay: null, lightestDay: null, deviation: 0, issues: [],
    };
  }

  // Фактический профиль (нормализованный)
  const actualProfile = dailyScores.map((s) => +(s / weeklyTotal).toFixed(3));

  // Пиковый и самый лёгкий активный день
  const activeDays = dailyScores
    .map((score, i) => ({ day: i, dayLabel: DAY_LABELS[i], score }))
    .filter((d) => d.score > 0);

  const peakDay = activeDays.reduce((a, b) => (b.score > a.score ? b : a), activeDays[0]);
  const lightestDay = activeDays.reduce((a, b) => (b.score < a.score ? b : a), activeDays[0]);

  // Среднеквадратичное отклонение от рекомендуемого профиля
  let sumSqDiff = 0;
  const len = Math.min(actualProfile.length, recommended.length);
  for (let i = 0; i < len; i++) {
    sumSqDiff += (actualProfile[i] - recommended[i]) ** 2;
  }
  const deviation = +(Math.sqrt(sumSqDiff / len) * 100).toFixed(1);

  // Выявление конкретных проблем
  const issues = [];

  // Пик не на Вт/Ср
  if (peakDay && peakDay.day !== 1 && peakDay.day !== 2) {
    issues.push(`Пик нагрузки в ${peakDay.dayLabel} (${peakDay.score} б.) — рекомендуется Вт или Ср`);
  }

  // Самый лёгкий день не в конце недели (Чт/Пт для 5-дн, Пт/Сб для 6-дн)
  if (weekDays === 5) {
    if (lightestDay && lightestDay.day !== 3 && lightestDay.day !== 4) {
      issues.push(`Самый лёгкий день — ${lightestDay.dayLabel} (${lightestDay.score} б.) — рекомендуется Чт или Пт`);
    }
  } else {
    if (lightestDay && lightestDay.day !== 4 && lightestDay.day !== 5) {
      issues.push(`Самый лёгкий день — ${lightestDay.dayLabel} (${lightestDay.score} б.) — рекомендуется Пт или Сб`);
    }
  }

  // Пн тяжелее Вт (нет нарастания)
  if (dailyScores[0] > 0 && dailyScores[1] > 0 && dailyScores[0] > dailyScores[1]) {
    issues.push(`Пн (${dailyScores[0]} б.) тяжелее Вт (${dailyScores[1]} б.) — нет нарастания к середине недели`);
  }

  // Большой разброс — deviation > 5%
  if (deviation > 5) {
    issues.push(`Отклонение от рекомендуемого профиля: ${deviation}% (норма ≤ 5%)`);
  }

  return {
    dailyScores,
    weeklyTotal,
    actualProfile,
    recommendedProfile: recommended,
    peakDay,
    lightestDay,
    deviation,
    issues,
  };
}

// ─── E-01: Горка трудности внутри дня ─────────────────────────

/**
 * US-0506: Проверяет, что пик трудности внутри каждого дня приходится на 2–3 урок.
 *
 * По СанПиН рекомендуемый профиль внутри дня — «горка»:
 * нарастание на 2–3 уроке, снижение к концу.
 * Пик на 1-м или последнем уроке — нарушение.
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @returns {{ day: number, dayLabel: string, peakLesson: number, peakScore: number, issue: string }[]}
 */
function checkIntradayPeak(classSchedule, grade) {
  const violations = [];

  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const lessons = classSchedule[dayIdx];
    if (!lessons) continue;

    // Собрать баллы только непустых уроков с их позициями
    const scored = [];
    for (let i = 0; i < lessons.length; i++) {
      if (lessons[i] && lessons[i].trim()) {
        scored.push({ idx: i, score: getDifficulty(lessons[i], grade) });
      }
    }

    if (scored.length < 3) continue; // слишком мало уроков для анализа горки

    // Найти позицию максимума (при равных — первый)
    let peakPos = 0;
    for (let i = 1; i < scored.length; i++) {
      if (scored[i].score > scored[peakPos].score) peakPos = i;
    }

    const peakLessonNum = scored[peakPos].idx + 1; // 1-based
    const isFirst = peakPos === 0;
    const isLast = peakPos === scored.length - 1;

    // Пик на 2-м или 3-м уроке (позиции 1–2 в 0-based среди непустых) = ОК
    // Пик на 1-м или последнем = нарушение
    if (isFirst || isLast) {
      const where = isFirst ? 'на 1-м уроке' : 'на последнем уроке';
      violations.push({
        day: dayIdx,
        dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
        peakLesson: peakLessonNum,
        peakScore: scored[peakPos].score,
        issue: `Пик трудности ${where} (урок ${peakLessonNum}, ${scored[peakPos].score} б.) — рекомендуется 2–3 урок`,
      });
    }
  }

  return violations;
}

// ─── E-02: Лёгкий день в середине недели (Ср/Чт) ─────────────

/**
 * US-0507: Проверяет наличие облегчённого дня в середине недели.
 *
 * По СанПиН один из дней Ср/Чт должен быть облегчённым:
 * min(трудность Ср, трудность Чт) ≤ avg(остальные дни).
 * Если оба дня тяжелее среднего — предупреждение.
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @returns {{ wedScore: number, thuScore: number, avgOther: number, issue: string } | null}
 */
function checkLightDay(classSchedule, grade) {
  // Нужно минимум 4 дня (Пн–Чт) для анализа
  if (classSchedule.length < 4) return null;

  // Рассчитать балл трудности каждого дня
  const dailyScores = classSchedule.map((lessons) => {
    if (!lessons) return 0;
    let score = 0;
    for (const subj of lessons) {
      if (subj && subj.trim()) score += getDifficulty(subj, grade);
    }
    return score;
  });

  const wedScore = dailyScores[2] || 0; // Ср — индекс 2
  const thuScore = dailyScores[3] || 0; // Чт — индекс 3

  // Среднее остальных активных дней (кроме Ср и Чт)
  const otherScores = dailyScores.filter((_, i) => i !== 2 && i !== 3 && dailyScores[i] > 0);
  if (otherScores.length === 0) return null;

  const avgOther = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
  const minMidweek = Math.min(wedScore, thuScore);

  if (minMidweek > avgOther) {
    const roundAvg = Math.round(avgOther * 10) / 10;
    return {
      wedScore,
      thuScore,
      avgOther: roundAvg,
      issue: `Нет облегчённого дня: Ср (${wedScore} б.) и Чт (${thuScore} б.) оба тяжелее среднего (${roundAvg} б.)`,
    };
  }

  return null;
}

// ─── E-03: Подряд сложные предметы ────────────────────────────

/**
 * US-0508: Находит серии из 2+ сложных предметов подряд внутри дня.
 *
 * Сложный предмет — балл трудности ≥ порога для данного класса.
 * 2 подряд → level 'yellow', penalty 2
 * 3+ подряд → level 'orange', penalty 5
 *
 * @param {string[][]} classSchedule — массив дней
 * @param {number} grade — номер параллели (1–11)
 * @returns {{ day: number, dayLabel: string, startLesson: number, length: number, subjects: string[], level: string, penalty: number }[]}
 */
function checkConsecutiveHard(classSchedule, grade) {
  const threshold = grade <= 4 ? 7 : 8;
  const violations = [];

  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const lessons = classSchedule[dayIdx];
    if (!lessons) continue;

    // Собрать непустые уроки с их позициями и баллами
    const active = [];
    for (let i = 0; i < lessons.length; i++) {
      if (lessons[i] && lessons[i].trim()) {
        active.push({ idx: i, subj: lessons[i], score: getDifficulty(lessons[i], grade) });
      }
    }

    // Найти серии сложных подряд
    let streak = [];
    for (let i = 0; i < active.length; i++) {
      if (active[i].score >= threshold) {
        streak.push(active[i]);
      } else {
        if (streak.length >= 2) {
          violations.push({
            day: dayIdx,
            dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
            startLesson: streak[0].idx + 1,
            length: streak.length,
            subjects: streak.map((s) => s.subj),
            level: streak.length >= 3 ? 'orange' : 'yellow',
            penalty: streak.length >= 3 ? 5 : 2,
          });
        }
        streak = [];
      }
    }
    // Финальная серия
    if (streak.length >= 2) {
      violations.push({
        day: dayIdx,
        dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
        startLesson: streak[0].idx + 1,
        length: streak.length,
        subjects: streak.map((s) => s.subj),
        level: streak.length >= 3 ? 'orange' : 'yellow',
        penalty: streak.length >= 3 ? 5 : 2,
      });
    }
  }

  return violations;
}

// ─── E-04: Профильные (лёгкие) предметы не в 1-ю позицию ───────

// Лёгкие/профильные предметы, которые традиционно не ставят первым уроком.
// Сопоставление по нормализованному имени (без кавычек, приведение ё→е).
const LIGHT_SUBJECTS = new Set([
  'физическая культура', 'физкультура', 'физ-ра', 'физра',
  'музыка',
  'изо', 'изобразительное искусство', 'рисование',
  'технология', 'труд',
  'обж', 'основы безопасности жизнедеятельности',
  'орксэ', 'однкнр',
]);

function normSubjKey(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
}

function isLightSubject(subject) {
  return LIGHT_SUBJECTS.has(normSubjKey(subject));
}

/**
 * Профильные (физкультура, ИЗО, музыка, ОБЖ, технология) не должны стоять
 * первым уроком — на 1-й позиции ожидается академический предмет средней
 * трудности.
 */
function checkEarlyLight(classSchedule) {
  const violations = [];
  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const day = classSchedule[dayIdx] || [];
    if (day.length === 0) continue;
    const first = day[0];
    if (first && isLightSubject(first)) {
      violations.push({
        day: dayIdx,
        dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
        subject: first,
      });
    }
  }
  return violations;
}

// ─── E-05: Один и тот же предмет не подряд ─────────────────────

/**
 * Один и тот же предмет не должен стоять подряд в одном дне (кроме
 * помеченных как допускающие «двойной урок» — в текущей версии такой
 * метки нет, проверка строгая).
 */
function checkConsecutiveSame(classSchedule) {
  const violations = [];
  for (let dayIdx = 0; dayIdx < classSchedule.length; dayIdx++) {
    const day = classSchedule[dayIdx] || [];
    for (let i = 0; i + 1 < day.length; i++) {
      const a = day[i]; const b = day[i + 1];
      if (!a || !b) continue;
      if (normSubjKey(a) === normSubjKey(b)) {
        violations.push({
          day: dayIdx,
          dayLabel: DAY_LABELS[dayIdx] || `День ${dayIdx + 1}`,
          lessonNum: i + 1,
          subject: a,
        });
      }
    }
  }
  return violations;
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

    // D-01: распределение трудности по дням
    const dist = checkDifficultyDistribution(days, grade, weekDays);
    if (dist.issues.length > 0) {
      results.push({
        ruleId: 'D-01',
        severity: 'soft',
        class: className,
        message: `${className}: ${dist.issues[0]}`,
        details: {
          dailyScores: dist.dailyScores,
          weeklyTotal: dist.weeklyTotal,
          actualProfile: dist.actualProfile,
          recommendedProfile: dist.recommendedProfile,
          deviation: dist.deviation,
          issues: dist.issues,
        },
      });
    }

    // E-01: горка трудности внутри дня
    const peaks = checkIntradayPeak(days, grade);
    for (const p of peaks) {
      results.push({
        ruleId: 'E-01',
        severity: 'soft',
        class: className,
        message: `${className}, ${p.dayLabel}: ${p.issue}`,
        details: { day: p.day, dayLabel: p.dayLabel, peakLesson: p.peakLesson, peakScore: p.peakScore },
      });
    }

    // E-02: лёгкий день в середине недели
    const light = checkLightDay(days, grade);
    if (light) {
      results.push({
        ruleId: 'E-02',
        severity: 'soft',
        class: className,
        message: `${className}: ${light.issue}`,
        details: { wedScore: light.wedScore, thuScore: light.thuScore, avgOther: light.avgOther },
      });
    }

    // E-04: профильные (лёгкие) предметы первым уроком
    const lightFirsts = checkEarlyLight(days);
    for (const lf of lightFirsts) {
      results.push({
        ruleId: 'E-04',
        severity: 'soft',
        class: className,
        message: `${className}, ${lf.dayLabel}: профильный предмет «${lf.subject}» на 1-м уроке — рекомендуется поставить его 2-м и позже`,
        details: lf,
      });
    }

    // E-05: одинаковые предметы подряд
    const sameStreaks = checkConsecutiveSame(days);
    for (const s of sameStreaks) {
      results.push({
        ruleId: 'E-05',
        severity: 'soft',
        class: className,
        message: `${className}, ${s.dayLabel}: «${s.subject}» стоит подряд с урока ${s.lessonNum} (без пометки lab/double)`,
        details: s,
      });
    }

    // E-03: подряд сложные предметы
    const streaks = checkConsecutiveHard(days, grade);
    for (const s of streaks) {
      results.push({
        ruleId: 'E-03',
        severity: 'soft',
        class: className,
        message: `${className}, ${s.dayLabel}: ${s.length} сложных подряд с урока ${s.startLesson} (${s.subjects.join(' → ')})`,
        details: {
          day: s.day, dayLabel: s.dayLabel,
          startLesson: s.startLesson, length: s.length,
          subjects: s.subjects, level: s.level, penalty: s.penalty,
        },
      });
    }
  }

  return results;
}

module.exports = {
  checkGaps,
  checkMaxLessonsPerDay,
  checkMaxWeeklyHours,
  checkDifficultyDistribution,
  checkIntradayPeak,
  checkLightDay,
  checkConsecutiveHard,
  runChecks,
  parseGrade,
};
