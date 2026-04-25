// Модуль: services/cp-sat-service
// Задача: спавн Python-процесса с CP-SAT solver и обмен через stdin/stdout JSON.
// Используется в routes/generator.js при mode='optimal'.
//
// Контракт:
//   runCpSatSolver(input, { timeLimitSeconds }) → Promise<GeneratorOutput>
//   где GeneratorOutput = { ok, schedule, summary, warnings, violations, error }

'use strict';

const { spawn } = require('child_process');
const path = require('path');

const SOLVER_DIR = path.join(__dirname, '..', '..', '..', 'cp-sat-solver');
const SOLVER_SCRIPT = path.join(SOLVER_DIR, 'solver.py');
const PYTHON_BIN = process.env.CP_SAT_PYTHON || 'python3';

function runCpSatSolver(input, options) {
  options = options || {};
  const timeoutSec = Math.max(10, Math.min(1800, Number(options.timeLimitSeconds) || 60));
  const graceMs = 30 * 1000;
  const killAfterMs = timeoutSec * 1000 + graceMs;

  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(PYTHON_BIN, [SOLVER_SCRIPT], {
        cwd: SOLVER_DIR,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      return reject(new Error(`Не удалось запустить Python (${PYTHON_BIN}): ${err.message}`));
    }

    let stdout = '';
    let stderr = '';
    let finished = false;

    const killTimer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try { proc.kill('SIGKILL'); } catch (_) {}
      reject(new Error(`CP-SAT solver не уложился в таймаут ${timeoutSec}s + 30s grace`));
    }, killAfterMs);

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(killTimer);
      reject(new Error(`CP-SAT процесс упал: ${err.message}`));
    });

    proc.on('exit', (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(killTimer);
      if (signal) {
        return reject(new Error(`CP-SAT убит сигналом ${signal}`));
      }
      const stderrTrim = stderr.slice(0, 1000);
      if (stderrTrim) console.warn('[cp-sat stderr]', stderrTrim);
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`CP-SAT вернул некорректный JSON (code=${code}): ${e.message}. stderr: ${stderrTrim}`));
      }
    });

    const payload = {
      classes: input.classes,
      curriculum: input.curriculum,
      weekDays: input.weekDays === 6 ? 6 : 5,
      constraints: input.constraints || {},
      rooms: input.rooms || [],
      studentCounts: input.studentCounts || {},
      shifts: input.shifts || {},
      timeLimitSeconds: timeoutSec,
      seed: Number(input.seed) || 0,
    };
    try {
      proc.stdin.write(JSON.stringify(payload));
      proc.stdin.end();
    } catch (e) {
      finished = true;
      clearTimeout(killTimer);
      try { proc.kill('SIGKILL'); } catch (_) {}
      reject(new Error(`Не удалось передать вход в CP-SAT: ${e.message}`));
    }
  });
}

async function pingCpSat() {
  try {
    const result = await runCpSatSolver({
      classes: ['1А'],
      curriculum: [
        { classId: '1А', subject: 'Математика', weeklyHours: 4, teacherId: 'T1' },
        { classId: '1А', subject: 'Русский язык', weeklyHours: 5, teacherId: 'T2' },
        { classId: '1А', subject: 'Физическая культура', weeklyHours: 3, teacherId: 'T3' },
      ],
      weekDays: 5,
    }, { timeLimitSeconds: 10 });
    return { ok: !!result.ok, summary: result.summary || null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { runCpSatSolver, pingCpSat };
