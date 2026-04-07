const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getMaxLessonsPerDay,
  getMaxWeeklyHours,
  getDifficulty,
  getHardThreshold,
  isHardSubject,
  HARD_SUBJECTS,
  rules,
} = require('../services/sanpin-norms');

// ─── getMaxLessonsPerDay ──────────────────────────────────────

describe('getMaxLessonsPerDay', () => {
  it('returns 4 for grade 1, 5-day week', () => {
    assert.equal(getMaxLessonsPerDay(1, 5), 4);
  });

  it('returns 5 for grade 2–4, 5-day week', () => {
    assert.equal(getMaxLessonsPerDay(2, 5), 5);
    assert.equal(getMaxLessonsPerDay(3, 5), 5);
    assert.equal(getMaxLessonsPerDay(4, 5), 5);
  });

  it('returns 6 for grades 5–6', () => {
    assert.equal(getMaxLessonsPerDay(5, 5), 6);
    assert.equal(getMaxLessonsPerDay(6, 5), 6);
  });

  it('returns 7 for grades 7–11', () => {
    for (let g = 7; g <= 11; g++) {
      assert.equal(getMaxLessonsPerDay(g, 5), 7, `grade ${g}`);
    }
  });

  it('returns null for grade 1 on 6-day week (not allowed)', () => {
    assert.equal(getMaxLessonsPerDay(1, 6), null);
  });

  it('returns values for all grades 1–11 on 5-day week', () => {
    for (let g = 1; g <= 11; g++) {
      const val = getMaxLessonsPerDay(g, 5);
      assert.ok(val !== null && val >= 4 && val <= 7, `grade ${g}: ${val}`);
    }
  });
});

// ─── getMaxWeeklyHours ────────────────────────────────────────

describe('getMaxWeeklyHours', () => {
  it('returns 21 for grade 1', () => {
    assert.equal(getMaxWeeklyHours(1, 5), 21);
  });

  it('returns 34 for grades 10–11, 5-day week', () => {
    assert.equal(getMaxWeeklyHours(10, 5), 34);
    assert.equal(getMaxWeeklyHours(11, 5), 34);
  });

  it('6-day week is always higher than 5-day for same grade', () => {
    for (let g = 2; g <= 11; g++) {
      const five = getMaxWeeklyHours(g, 5);
      const six = getMaxWeeklyHours(g, 6);
      assert.ok(six > five, `grade ${g}: 6d(${six}) should be > 5d(${five})`);
    }
  });

  it('increases monotonically with grade (5-day)', () => {
    let prev = 0;
    for (let g = 1; g <= 11; g++) {
      const val = getMaxWeeklyHours(g, 5);
      assert.ok(val >= prev, `grade ${g}: ${val} should be >= ${prev}`);
      prev = val;
    }
  });
});

// ─── getDifficulty ────────────────────────────────────────────

describe('getDifficulty', () => {
  it('returns correct values for grades 1–4 (table 6.9)', () => {
    assert.equal(getDifficulty('Математика', 3), 8);
    assert.equal(getDifficulty('Русский язык', 2), 7);
    assert.equal(getDifficulty('Физическая культура', 4), 1);
  });

  it('returns correct values for grades 5–9 (table 6.10)', () => {
    assert.equal(getDifficulty('Математика', 5), 10);
    assert.equal(getDifficulty('Математика', 6), 13);
    assert.equal(getDifficulty('Физика', 9), 13);
    assert.equal(getDifficulty('Русский язык', 6), 12);
    assert.equal(getDifficulty('Химия', 8), 10);
  });

  it('returns correct values for grades 10–11 (table 6.11)', () => {
    assert.equal(getDifficulty('Физика', 10), 12);
    assert.equal(getDifficulty('Астрономия', 11), 12);
    assert.equal(getDifficulty('Физическая культура', 10), 1);
  });

  it('returns fallback for unknown subject', () => {
    assert.equal(getDifficulty('НеизвестныйПредмет', 5), 5);
    assert.equal(getDifficulty('НеизвестныйПредмет', 5, 3), 3);
  });

  it('uses nearest grade for missing grade in 5–9 table', () => {
    // Физика null at grade 5, nearest is grade 7 = 8
    assert.equal(getDifficulty('Физика', 5), 8);
  });
});

// ─── getHardThreshold ─────────────────────────────────────────

describe('getHardThreshold', () => {
  it('returns 7 for grades 1–4', () => {
    for (let g = 1; g <= 4; g++) {
      assert.equal(getHardThreshold(g), 7, `grade ${g}`);
    }
  });

  it('returns 8 for grades 5–11', () => {
    for (let g = 5; g <= 11; g++) {
      assert.equal(getHardThreshold(g), 8, `grade ${g}`);
    }
  });
});

// ─── isHardSubject ────────────────────────────────────────────

describe('isHardSubject', () => {
  it('Физкультура is never hard', () => {
    for (let g = 1; g <= 11; g++) {
      assert.equal(isHardSubject('Физическая культура', g), false, `grade ${g}`);
    }
  });

  it('Математика is hard in grades 1–6', () => {
    assert.equal(isHardSubject('Математика', 2), true);
    assert.equal(isHardSubject('Математика', 5), true);
    assert.equal(isHardSubject('Математика', 6), true);
  });

  it('Физика is hard in grade 9 (score 13)', () => {
    assert.equal(isHardSubject('Физика', 9), true);
  });
});

// ─── HARD_SUBJECTS list ───────────────────────────────────────

describe('HARD_SUBJECTS', () => {
  it('contains at least 10 subjects', () => {
    assert.ok(HARD_SUBJECTS.length >= 10);
  });

  it('includes key hard subjects', () => {
    const expected = ['Математика', 'Физика', 'Химия', 'Русский язык', 'Иностранный язык'];
    for (const s of expected) {
      assert.ok(HARD_SUBJECTS.includes(s), `missing: ${s}`);
    }
  });

  it('does not include Физическая культура', () => {
    assert.ok(!HARD_SUBJECTS.includes('Физическая культура'));
  });
});

// ─── JSON structure ───────────────────────────────────────────

describe('sanpin-rules.json structure', () => {
  it('has difficultyScale with 3 grade groups', () => {
    assert.ok(rules.difficultyScale.grades_1_4);
    assert.ok(rules.difficultyScale.grades_5_9);
    assert.ok(rules.difficultyScale.grades_10_11);
  });

  it('difficultyScale covers >= 25 subjects total', () => {
    const all = new Set([
      ...Object.keys(rules.difficultyScale.grades_1_4),
      ...Object.keys(rules.difficultyScale.grades_5_9),
      ...Object.keys(rules.difficultyScale.grades_10_11),
    ].filter((k) => !k.startsWith('_')));
    assert.ok(all.size >= 25, `only ${all.size} subjects`);
  });

  it('has _ref fields for traceability', () => {
    assert.ok(rules.maxLessonsPerDay._ref);
    assert.ok(rules.maxWeeklyHours._ref);
    assert.ok(rules.difficultyScale._ref);
  });
});
