const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateScore, scoreToGrade } = require('../services/audit/scoring');

// ─── scoreToGrade ─────────────────────────────────────────────

describe('scoreToGrade', () => {
  it('100 → A', () => assert.equal(scoreToGrade(100), 'A'));
  it('80 → A', () => assert.equal(scoreToGrade(80), 'A'));
  it('79 → B', () => assert.equal(scoreToGrade(79), 'B'));
  it('65 → B', () => assert.equal(scoreToGrade(65), 'B'));
  it('64 → C', () => assert.equal(scoreToGrade(64), 'C'));
  it('50 → C', () => assert.equal(scoreToGrade(50), 'C'));
  it('49 → D', () => assert.equal(scoreToGrade(49), 'D'));
  it('40 → D', () => assert.equal(scoreToGrade(40), 'D'));
  it('39 → F', () => assert.equal(scoreToGrade(39), 'F'));
  it('0 → F', () => assert.equal(scoreToGrade(0), 'F'));
});

// ─── calculateScore ───────────────────────────────────────────

describe('calculateScore', () => {
  it('hard violation → score 0, grade F', () => {
    // Gap = hard violation
    const schedule = { '5А': [['Мат', '', 'Рус'], ['Мат'], ['Мат'], ['Мат'], ['Мат']] };
    const res = calculateScore(schedule);
    assert.equal(res.score, 0);
    assert.equal(res.grade, 'F');
    assert.equal(res.hasHardViolations, true);
    assert.ok(res.hardCount > 0);
  });

  it('no violations → score near 100', () => {
    // Minimal clean schedule — 3 easy lessons per day, grade 10
    const schedule = {
      '10А': [
        ['ОБЖ', 'Физическая культура', 'Технология'],
        ['ОБЖ', 'География', 'Физическая культура'],
        ['Технология', 'ОБЖ', 'Физическая культура'],
        ['ОБЖ', 'Физическая культура', 'Технология'],
        ['География', 'ОБЖ', 'Физическая культура'],
      ],
    };
    const res = calculateScore(schedule);
    assert.ok(res.score >= 80, `score ${res.score} should be >= 80`);
    assert.equal(res.hasHardViolations, false);
    assert.equal(res.hardCount, 0);
  });

  it('soft violations reduce score from 100', () => {
    // Schedule with consecutive hard subjects but no hard violations
    const schedule = {
      '8А': [
        ['Физика', 'Химия', 'Алгебра', 'Музыка', 'ОБЖ', 'Технология'],
        ['Музыка', 'ОБЖ', 'Технология', 'Литература', 'Физическая культура', 'ОБЖ'],
        ['Музыка', 'Русский язык', 'Физика', 'ОБЖ', 'Технология', 'Литература'],
        ['ОБЖ', 'Литература', 'Музыка', 'Технология', 'Физическая культура', 'ОБЖ'],
        ['Литература', 'Музыка', 'ОБЖ', 'Технология', 'Физическая культура', 'ОБЖ'],
      ],
    };
    const res = calculateScore(schedule);
    assert.ok(res.score < 100, `score ${res.score} should be < 100`);
    assert.ok(res.score > 0, `score ${res.score} should be > 0`);
    assert.equal(res.hasHardViolations, false);
    assert.ok(res.softCount > 0);
    assert.ok(res.totalPenalty > 0);
  });

  it('score never goes below 0', () => {
    // Many soft violations
    const days = [];
    for (let d = 0; d < 5; d++) {
      days.push(['Физика', 'Химия', 'Алгебра', 'Русский язык', 'Биология', 'История']);
    }
    const schedule = { '8А': days };
    const res = calculateScore(schedule);
    assert.ok(res.score >= 0);
  });

  it('returns violations array', () => {
    const schedule = { '5А': [['Мат', 'Рус'], ['Мат'], ['Мат'], ['Мат'], ['Мат']] };
    const res = calculateScore(schedule);
    assert.ok(Array.isArray(res.violations));
  });

  it('handles empty schedule', () => {
    const res = calculateScore({});
    assert.equal(res.score, 100);
    assert.equal(res.grade, 'A');
    assert.equal(res.hardCount, 0);
    assert.equal(res.softCount, 0);
  });
});
