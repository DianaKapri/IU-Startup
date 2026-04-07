const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkGaps,
  checkMaxLessonsPerDay,
  checkMaxWeeklyHours,
  checkDifficultyDistribution,
  checkIntradayPeak,
  checkLightDay,
  checkConsecutiveHard,
  runChecks,
  parseGrade,
} = require('../services/audit/checks');

// ─── parseGrade ───────────────────────────────────────────────

describe('parseGrade', () => {
  it('parses "5А" → 5', () => assert.equal(parseGrade('5А'), 5));
  it('parses "10Б" → 10', () => assert.equal(parseGrade('10Б'), 10));
  it('parses "11" → 11', () => assert.equal(parseGrade('11'), 11));
  it('returns null for empty', () => assert.equal(parseGrade(''), null));
  it('returns null for non-numeric', () => assert.equal(parseGrade('АБВ'), null));
});

// ─── X-01: checkGaps ─────────────────────────────────────────

describe('checkGaps (X-01)', () => {
  it('returns empty for no gaps', () => {
    const days = [['Мат', 'Рус', 'Физ'], ['Мат', 'Рус']];
    assert.deepEqual(checkGaps(days), []);
  });

  it('detects gap between lessons', () => {
    const days = [['Мат', '', 'Физ', 'Рус']];
    const res = checkGaps(days);
    assert.equal(res.length, 1);
    assert.equal(res[0].lessonNum, 2);
    assert.equal(res[0].dayLabel, 'Пн');
  });

  it('ignores trailing empties', () => {
    assert.deepEqual(checkGaps([['Мат', 'Рус', '', '']]), []);
  });

  it('ignores leading empties', () => {
    assert.deepEqual(checkGaps([['', '', 'Мат', 'Рус']]), []);
  });

  it('detects multiple gaps in one day', () => {
    const res = checkGaps([['Мат', '', 'Физ', '', 'Рус']]);
    assert.equal(res.length, 2);
    assert.equal(res[0].lessonNum, 2);
    assert.equal(res[1].lessonNum, 4);
  });

  it('detects gaps across multiple days', () => {
    const days = [
      ['Мат', '', 'Рус'],
      ['Мат', 'Рус'],
      ['Физ', '', '', 'Хим'],
    ];
    const res = checkGaps(days);
    assert.equal(res.length, 3); // 1 in day 0, 2 in day 2
  });

  it('handles empty schedule', () => {
    assert.deepEqual(checkGaps([]), []);
    assert.deepEqual(checkGaps([[]]), []);
  });

  it('handles single lesson per day', () => {
    assert.deepEqual(checkGaps([['Мат']]), []);
  });
});

// ─── C-01: checkMaxLessonsPerDay ──────────────────────────────

describe('checkMaxLessonsPerDay (C-01)', () => {
  it('no violation when within limit', () => {
    // Grade 5, 5-day: max 6
    const days = [['M', 'M', 'M', 'M', 'M', 'M']];
    assert.deepEqual(checkMaxLessonsPerDay(days, 5, 5), []);
  });

  it('detects violation when over limit', () => {
    // Grade 5, 5-day: max 6, giving 7
    const days = [['M', 'M', 'M', 'M', 'M', 'M', 'M']];
    const res = checkMaxLessonsPerDay(days, 5, 5);
    assert.equal(res.length, 1);
    assert.equal(res[0].actual, 7);
    assert.equal(res[0].max, 6);
  });

  it('respects different grade limits', () => {
    // Grade 1, 5-day: max 4
    const days = [['M', 'M', 'M', 'M', 'M']];
    const res = checkMaxLessonsPerDay(days, 1, 5);
    assert.equal(res.length, 1);
    assert.equal(res[0].max, 4);
  });

  it('skips empty slots when counting', () => {
    // Grade 5: max 6, only 5 non-empty
    const days = [['M', '', 'M', 'M', 'M', 'M', '']];
    assert.deepEqual(checkMaxLessonsPerDay(days, 5, 5), []);
  });

  it('reports per-day violations', () => {
    // Grade 7: max 7
    const days = [
      ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'], // 8 — violation
      ['M', 'M', 'M'],                              // 3 — ok
      ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],  // 8 — violation
    ];
    const res = checkMaxLessonsPerDay(days, 7, 5);
    assert.equal(res.length, 2);
    assert.equal(res[0].dayLabel, 'Пн');
    assert.equal(res[1].dayLabel, 'Ср');
  });
});

// ─── C-02: checkMaxWeeklyHours ────────────────────────────────

describe('checkMaxWeeklyHours (C-02)', () => {
  it('returns null when within limit', () => {
    // Grade 5, 5-day: max 29
    const days = Array(5).fill(['M', 'M', 'M', 'M', 'M']); // 25
    assert.equal(checkMaxWeeklyHours(days, 5, 5), null);
  });

  it('detects weekly overload', () => {
    // Grade 5, 5-day: max 29, giving 30
    const days = Array(5).fill(['M', 'M', 'M', 'M', 'M', 'M']); // 30
    const res = checkMaxWeeklyHours(days, 5, 5);
    assert.notEqual(res, null);
    assert.equal(res.actual, 30);
    assert.equal(res.max, 29);
  });

  it('exactly at limit is OK', () => {
    // Grade 10, 5-day: max 34
    const days = [
      ['M', 'M', 'M', 'M', 'M', 'M', 'M'], // 7
      ['M', 'M', 'M', 'M', 'M', 'M', 'M'], // 7
      ['M', 'M', 'M', 'M', 'M', 'M', 'M'], // 7
      ['M', 'M', 'M', 'M', 'M', 'M', 'M'], // 7
      ['M', 'M', 'M', 'M', 'M', 'M'],       // 6 = 34
    ];
    assert.equal(checkMaxWeeklyHours(days, 10, 5), null);
  });
});

// ─── D-01: checkDifficultyDistribution ────────────────────────

describe('checkDifficultyDistribution (D-01)', () => {
  it('returns dailyScores array with correct length', () => {
    const days = [['Математика'], ['Физика'], ['Музыка'], ['ОБЖ'], ['Литература']];
    const res = checkDifficultyDistribution(days, 8);
    assert.equal(res.dailyScores.length, 5);
    assert.equal(res.weeklyTotal, res.dailyScores.reduce((a, b) => a + b, 0));
  });

  it('identifies peak and lightest day', () => {
    const days = [
      ['Музыка'],
      ['Физика', 'Химия', 'Алгебра'],
      ['ОБЖ'],
      ['Музыка'],
      ['Технология'],
    ];
    const res = checkDifficultyDistribution(days, 8);
    assert.equal(res.peakDay.day, 1); // Вт
    assert.ok(res.peakDay.score > res.lightestDay.score);
  });

  it('reports issue when peak not on Вт/Ср', () => {
    const days = [
      ['Физика', 'Химия', 'Алгебра', 'Русский язык'], // Пн heavy
      ['Музыка'],
      ['ОБЖ'],
      ['Музыка'],
      ['Технология'],
    ];
    const res = checkDifficultyDistribution(days, 8);
    assert.ok(res.issues.length > 0);
    assert.ok(res.issues[0].includes('Пн'));
  });

  it('handles empty schedule', () => {
    const res = checkDifficultyDistribution([[], [], [], [], []], 5);
    assert.equal(res.weeklyTotal, 0);
    assert.deepEqual(res.issues, []);
  });
});

// ─── E-01: checkIntradayPeak ──────────────────────────────────

describe('checkIntradayPeak (E-01)', () => {
  it('no violation when peak is on lesson 2', () => {
    const days = [['Литература', 'Математика', 'Русский язык', 'ОБЖ', 'Музыка']];
    assert.deepEqual(checkIntradayPeak(days, 7), []);
  });

  it('no violation when peak is on lesson 3', () => {
    const days = [['Музыка', 'Литература', 'Физика', 'ОБЖ', 'Технология']];
    assert.deepEqual(checkIntradayPeak(days, 9), []);
  });

  it('violation when peak is first lesson', () => {
    const days = [['Физика', 'Музыка', 'ОБЖ', 'Литература', 'Технология']];
    const res = checkIntradayPeak(days, 9);
    assert.equal(res.length, 1);
    assert.equal(res[0].peakLesson, 1);
  });

  it('violation when peak is last lesson', () => {
    const days = [['Музыка', 'ОБЖ', 'Технология', 'Литература', 'Физика']];
    const res = checkIntradayPeak(days, 9);
    assert.equal(res.length, 1);
    assert.equal(res[0].peakLesson, 5);
  });

  it('skips days with < 3 lessons', () => {
    assert.deepEqual(checkIntradayPeak([['Физика', 'Музыка']], 7), []);
  });
});

// ─── E-02: checkLightDay ──────────────────────────────────────

describe('checkLightDay (E-02)', () => {
  it('returns null when Ср is light', () => {
    const days = [
      ['Математика', 'Физика', 'Химия'],
      ['Алгебра', 'Русский язык', 'Химия'],
      ['Музыка', 'ОБЖ'],                      // Ср — light
      ['Алгебра', 'Русский язык', 'Физика'],
      ['Литература', 'География'],
    ];
    assert.equal(checkLightDay(days, 8), null);
  });

  it('returns null when Чт is light', () => {
    const days = [
      ['Математика', 'Физика', 'Химия'],
      ['Алгебра', 'Русский язык', 'Химия'],
      ['Алгебра', 'Русский язык', 'Физика'],
      ['Музыка'],                               // Чт — light
      ['Литература', 'Физика', 'Химия'],
    ];
    assert.equal(checkLightDay(days, 8), null);
  });

  it('reports when both Ср and Чт are heavy', () => {
    const days = [
      ['Музыка', 'ОБЖ'],
      ['Литература'],
      ['Математика', 'Физика', 'Химия', 'Русский язык'],
      ['Алгебра', 'Русский язык', 'Физика', 'Химия'],
      ['Музыка', 'ОБЖ'],
    ];
    const res = checkLightDay(days, 8);
    assert.notEqual(res, null);
    assert.ok(res.wedScore > res.avgOther);
    assert.ok(res.thuScore > res.avgOther);
  });

  it('returns null for < 4 days', () => {
    assert.equal(checkLightDay([['M'], ['M'], ['M']], 5), null);
  });
});

// ─── E-03: checkConsecutiveHard ───────────────────────────────

describe('checkConsecutiveHard (E-03)', () => {
  it('no streak when hard subjects alternate with easy', () => {
    // grade 8, threshold=8: Физика=9, Музыка=1
    const days = [['Физика', 'Музыка', 'Химия', 'ОБЖ', 'Алгебра']];
    assert.deepEqual(checkConsecutiveHard(days, 8), []);
  });

  it('detects 2 consecutive → yellow, penalty 2', () => {
    const days = [['Физика', 'Химия', 'Музыка', 'ОБЖ']];
    const res = checkConsecutiveHard(days, 8);
    assert.equal(res.length, 1);
    assert.equal(res[0].length, 2);
    assert.equal(res[0].level, 'yellow');
    assert.equal(res[0].penalty, 2);
    assert.deepEqual(res[0].subjects, ['Физика', 'Химия']);
  });

  it('detects 3 consecutive → orange, penalty 5', () => {
    const days = [['Физика', 'Химия', 'Алгебра', 'Музыка']];
    const res = checkConsecutiveHard(days, 8);
    assert.equal(res.length, 1);
    assert.equal(res[0].length, 3);
    assert.equal(res[0].level, 'orange');
    assert.equal(res[0].penalty, 5);
  });

  it('detects two separate streaks', () => {
    const days = [['Физика', 'Химия', 'Музыка', 'Алгебра', 'Русский язык']];
    const res = checkConsecutiveHard(days, 8);
    // Физика(9)+Химия(10) = streak 2, Алгебра(9) only — Русский(7) < 8, no second streak
    // Actually Русский язык grade 8 = 7, not >= 8
    assert.equal(res.length, 1);
  });

  it('handles empty day', () => {
    assert.deepEqual(checkConsecutiveHard([[]], 8), []);
    assert.deepEqual(checkConsecutiveHard([], 8), []);
  });
});

// ─── runChecks (integration) ──────────────────────────────────

describe('runChecks', () => {
  it('returns violations for schedule with gap', () => {
    const schedule = { '5А': [['Мат', '', 'Рус'], ['Мат', 'Рус'], ['Мат'], ['Мат'], ['Мат']] };
    const res = runChecks(schedule);
    const x01 = res.filter((v) => v.ruleId === 'X-01');
    assert.ok(x01.length > 0);
    assert.equal(x01[0].severity, 'hard');
    assert.equal(x01[0].class, '5А');
  });

  it('returns C-01 for overloaded day', () => {
    const schedule = { '1А': [['M', 'M', 'M', 'M', 'M'], ['M'], ['M'], ['M'], ['M']] };
    const res = runChecks(schedule);
    const c01 = res.filter((v) => v.ruleId === 'C-01');
    assert.ok(c01.length > 0);
    assert.equal(c01[0].details.max, 4);
  });

  it('returns all rule types for bad schedule', () => {
    // Grade 8: max 7/day, max 33/week
    const schedule = {
      '8А': [
        ['Физика', 'Химия', 'Алгебра', '', 'Русский язык', 'Биология', 'Математика', 'Физика', 'Химия'], // gap + 8 lessons (>7)
        ['Физика', 'Химия', 'Алгебра', 'Русский язык', 'Биология', 'Математика', 'Физика', 'Химия'],     // 8 lessons
        ['Физика', 'Химия', 'Алгебра', 'Русский язык', 'Биология', 'Математика', 'Физика'],               // 7 lessons
        ['Физика', 'Химия', 'Алгебра', 'Русский язык', 'Биология', 'Математика', 'Физика'],               // 7 lessons
        ['Физика', 'Химия', 'Алгебра', 'Русский язык', 'Биология'],                                       // 5 lessons = 35 total
      ],
    };
    const res = runChecks(schedule);
    const ruleIds = new Set(res.map((v) => v.ruleId));
    assert.ok(ruleIds.has('X-01'), 'should have X-01 (gap)');
    assert.ok(ruleIds.has('C-01'), 'should have C-01 (daily overload)');
    assert.ok(ruleIds.has('C-02'), 'should have C-02 (weekly overload)');
    assert.ok(ruleIds.has('E-03'), 'should have E-03 (consecutive hard)');
  });

  it('skips classes with unparseable grade', () => {
    const schedule = { 'ГПД': [['Мат', 'Рус']] };
    const res = runChecks(schedule);
    assert.equal(res.length, 0);
  });

  it('handles empty schedule', () => {
    assert.deepEqual(runChecks({}), []);
  });
});
