// Модуль: audit/scoring
// Задача: US-0509 — Сводный балл и оценка A–F
// Описание: Рассчитывает итоговый балл расписания и буквенную оценку.

const { runChecks } = require('./checks');

/**
 * Штрафы по умолчанию для мягких правил.
 * Жёсткие нарушения автоматически дают F / score=0.
 */
const DEFAULT_PENALTIES = {
  'D-01': 3,
  'E-01': 2,
  'E-02': 3,
  'E-03': null, // берётся из details.penalty (2 или 5)
  'E-04': 2,    // профильный предмет на 1-м уроке
  'E-05': 3,   // одинаковые предметы подряд (без пометки lab/double)
};

/**
 * Шкала оценок.
 * A: 80–100, B: 65–79, C: 50–64, D: 40–49, F: <40
 */
function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Рассчитывает сводный балл и оценку для расписания.
 *
 * Алгоритм:
 * 1. Если есть хотя бы одно жёсткое нарушение (severity: hard) → score=0, grade=F
 * 2. Иначе: score = 100 − Σ(штрафы мягких нарушений), min 0
 *
 * @param {Object} schedule — { "5А": [["Математика", ...], ...], ... }
 * @param {Object} [opts]
 * @param {5|6}    [opts.weekDays=5]
 * @returns {{
 *   score: number,
 *   grade: string,
 *   hasHardViolations: boolean,
 *   hardCount: number,
 *   softCount: number,
 *   totalPenalty: number,
 *   violations: object[]
 * }}
 */
function calculateScore(schedule, opts = {}) {
  const violations = runChecks(schedule, opts);

  const hard = violations.filter((v) => v.severity === 'hard');
  const soft = violations.filter((v) => v.severity === 'soft');

  if (hard.length > 0) {
    return {
      score: 0,
      grade: 'F',
      hasHardViolations: true,
      hardCount: hard.length,
      softCount: soft.length,
      totalPenalty: 100,
      violations,
    };
  }

  let totalPenalty = 0;
  for (const v of soft) {
    if (v.ruleId === 'E-03' && v.details && v.details.penalty != null) {
      totalPenalty += v.details.penalty;
    } else {
      totalPenalty += DEFAULT_PENALTIES[v.ruleId] ?? 2;
    }
  }

  const score = Math.max(0, 100 - totalPenalty);

  return {
    score,
    grade: scoreToGrade(score),
    hasHardViolations: false,
    hardCount: 0,
    softCount: soft.length,
    totalPenalty,
    violations,
  };
}

/**
 * Сохраняет результат аудита в БД (таблица audit_results).
 *
 * @param {object} db — модуль базы данных (config/database)
 * @param {number} scheduleId — id записи в schedules
 * @param {{ score: number, grade: string, violations: object[] }} result
 * @returns {Promise<{ id: number }>}
 */
async function saveAuditResult(db, scheduleId, result) {
  const { rows } = await db.query(
    `INSERT INTO audit_results (schedule_id, score, grade, violations_json, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [scheduleId, result.score, result.grade, JSON.stringify(result.violations)]
  );
  return rows[0];
}

module.exports = {
  calculateScore,
  scoreToGrade,
  saveAuditResult,
  DEFAULT_PENALTIES,
};
