// Модуль: routes/generator
// Задача: EP-06 — HTTP-эндпоинт генератора расписания
// Автор: —
// Описание:
//   POST /api/generate  — принять учебный план, вернуть расписание + аудит СанПиН
//   GET  /api/generate/health — smoke-test генератора
//
// Формат запроса:
//   { "classes":["5А","7Б"],
//     "curriculum":[{"classId":"5А","subject":"Математика","weeklyHours":5,
//                    "teacherId":"T1","roomId":"к.101"}, ...],
//     "weekDays": 5 }
//
// Формат ответа:
//   { "ok":true, "schedule":{"5А":[["Матем","Физика",...], ...],...},
//     "audit":{"score":85,"grade":"B","hardCount":0,"softCount":3,"violations":[...]},
//     "summary":{"classesCount":2,"placedLessons":57,"btCalls":141},
//     "warnings":[] }

'use strict';

const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const runGenerator       = require('../../services/generator/index.js');
const { calculateScore } = require('../services/audit/scoring.js');
const requirePlan        = require('../middleware/requirePlan');
const { parseTemplate }  = require('../services/template-parser.js');
const { runCpSatSolver, pingCpSat } = require('../services/cp-sat-service.js');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx?$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Принимаются только файлы .xlsx / .xls'));
  },
});

// Строит понятное сообщение для ok:false — используется и фронтом и логами.
// warnings может быть смешанным: строки (генератор, реальная причина) +
// {sheet,row,message} (парсер, обычно info). Сначала показываем строки.
function buildGenErrorMessage(result, warnings) {
  const sum = result && result.summary ? result.summary : {};
  const placed = Number(sum.placedLessons) || 0;
  const unplaced = Number(sum.unplacedLessons) || 0;
  const total = placed + unplaced;
  const head = total
    ? `Удалось разместить ${placed} из ${total} уроков.`
    : `Не удалось построить расписание.`;

  // Жёсткие причины (от генератора) — строки. Парсерные (объекты) — info, в конец.
  const hardReasons = [];
  const parserNotes = [];
  for (const w of warnings || []) {
    if (!w) continue;
    if (typeof w === 'string') {
      hardReasons.push(w);
    } else if (w.message) {
      const where = w.sheet ? `[${w.sheet}${w.row ? ', стр. ' + w.row : ''}] ` : '';
      parserNotes.push(where + w.message);
    }
  }
  const parts = hardReasons.slice(0, 3).concat(parserNotes.slice(0, hardReasons.length ? 0 : 2));
  const tail = parts.length ? ' ' + parts.join(' | ') : '';
  return (head + tail).slice(0, 800);
}

// ── POST /api/generate ──────────────────────────────────────
// Paid-gated: только plan='paid' с неистёкшим plan_expires_at.
// mode: 'fast' (по умолчанию, наш JS-генератор) | 'optimal' (CP-SAT, до 30 мин)
router.post('/generate', requirePlan(['paid', 'free']), async (req, res) => {
  try {
    const { classes, curriculum, weekDays } = req.body;

    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Поле classes обязательно (массив строк).' },
      });
    }
    if (!Array.isArray(curriculum) || curriculum.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Поле curriculum обязательно (массив объектов).' },
      });
    }

    const days = weekDays === 6 ? 6 : 5;
    const seed = Number(req.body.seed) || 0;
    const mode = String(req.body.mode || 'fast').toLowerCase();

    if (mode === 'optimal') {
      const timeLimitSeconds = Math.max(10, Math.min(1800, Number(req.body.timeLimitSeconds) || 600));
      try {
        const cp = await runCpSatSolver({
          classes,
          curriculum,
          weekDays: days,
          constraints: req.body.constraints || {},
          rooms: req.body.rooms || [],
          studentCounts: req.body.studentCounts || {},
          shifts: req.body.shifts || {},
          seed,
        }, { timeLimitSeconds });

        if (!cp.ok) {
          return res.status(207).json({
            ok: false,
            schedule: cp.schedule || {},
            error: { code: 'OPTIMIZER_INFEASIBLE', message: cp.error || 'CP-SAT не нашёл решение в заданное время' },
            summary: { ...(cp.summary || {}), mode: 'optimal' },
            warnings: cp.warnings || [],
          });
        }
        const auditCp = calculateScore(cp.schedule, { weekDays: days });
        return res.status(200).json({
          ok: true,
          schedule: cp.schedule,
          audit: {
            score:      auditCp.score,
            grade:      auditCp.grade,
            hardCount:  auditCp.hardCount,
            softCount:  auditCp.softCount,
            violations: auditCp.violations,
          },
          summary:  { ...(cp.summary || {}), mode: 'optimal' },
          warnings: cp.warnings || [],
        });
      } catch (err) {
        console.error('[POST /api/generate optimal]', err.message);
        return res.status(503).json({
          ok: false,
          error: { code: 'OPTIMIZER_UNAVAILABLE', message: 'Сервер оптимизации недоступен: ' + err.message },
        });
      }
    }

    const attempts = Math.max(1, Math.min(20, Number(req.body.attempts) || 1));
    const result = runGenerator({ classes, curriculum, weekDays: days, seed, attempts });
    const audit  = calculateScore(result.schedule, { weekDays: days });
    const errBody = result.ok ? undefined : {
      code: 'GEN_INCOMPLETE',
      message: buildGenErrorMessage(result, result.warnings || []),
    };

    return res.status(result.ok ? 200 : 207).json({
      ok:       result.ok,
      schedule: result.schedule,
      audit: {
        score:      audit.score,
        grade:      audit.grade,
        hardCount:  audit.hardCount,
        softCount:  audit.softCount,
        violations: audit.violations,
      },
      summary:  { ...result.summary, mode: 'fast' },
      warnings: result.warnings,
      ...(errBody ? { error: errBody } : {}),
    });
  } catch (err) {
    console.error('[POST /api/generate]', err);
    return res.status(500).json({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка генератора.' },
    });
  }
});

// ── POST /api/generate/from-xlsx ─────────────────────────────
// Paid-gated. multipart/form-data: file = .xlsx template
// mode: 'fast' (по умолчанию, JS-генератор) | 'optimal' (CP-SAT)
router.post('/from-xlsx', requirePlan(['paid', 'free']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { code: 'NO_FILE', message: 'Файл не получен (поле "file" в multipart/form-data).' } });
    }

    const parsed = parseTemplate(req.file.buffer);

    if (parsed.errors && parsed.errors.length) {
      return res.status(400).json({
        ok: false,
        error: { code: 'PARSE_ERROR', message: 'Ошибки при чтении шаблона', details: parsed.errors },
        warnings: parsed.warnings || [],
      });
    }

    const weekDays = req.body && req.body.weekDays === '6' ? 6 : 5;
    const seed = Number(req.body && req.body.seed) || 0;
    const mode = String((req.body && req.body.mode) || 'fast').toLowerCase();

    const meta = {
      classes:       parsed.classes,
      teachers:      parsed.teachers,
      teachersCount: parsed.teachers.length,
      rooms:         parsed.rooms,
      roomsCount:    parsed.rooms.length,
      studentCounts: parsed.studentCounts,
      constraints:   parsed.constraints,
      shifts:        parsed.shifts,
      curriculum:    parsed.curriculum,
    };

    if (mode === 'optimal') {
      const timeLimitSeconds = Math.max(10, Math.min(1800, Number(req.body && req.body.timeLimitSeconds) || 600));
      try {
        const cp = await runCpSatSolver({
          classes:     parsed.classes,
          curriculum:  parsed.curriculum,
          weekDays,
          constraints: parsed.constraints,
          rooms:       parsed.rooms,
          studentCounts: parsed.studentCounts,
          shifts:      parsed.shifts,
          seed,
        }, { timeLimitSeconds });

        if (!cp.ok) {
          return res.status(207).json({
            ok: false,
            schedule: cp.schedule || {},
            error: { code: 'OPTIMIZER_INFEASIBLE', message: cp.error || 'CP-SAT не нашёл решение в заданное время' },
            summary: { ...(cp.summary || {}), mode: 'optimal' },
            warnings: [].concat(parsed.warnings || [], cp.warnings || []),
            meta,
          });
        }
        const auditCp = calculateScore(cp.schedule, { weekDays });
        return res.status(200).json({
          ok: true,
          schedule: cp.schedule,
          audit: {
            score:      auditCp.score,
            grade:      auditCp.grade,
            hardCount:  auditCp.hardCount,
            softCount:  auditCp.softCount,
            violations: auditCp.violations,
          },
          summary:  { ...(cp.summary || {}), mode: 'optimal' },
          warnings: [].concat(parsed.warnings || [], cp.warnings || []),
          meta,
        });
      } catch (err) {
        console.error('[POST /api/generate/from-xlsx optimal]', err.message);
        return res.status(503).json({
          ok: false,
          error: { code: 'OPTIMIZER_UNAVAILABLE', message: 'Сервер оптимизации недоступен: ' + err.message },
          meta,
        });
      }
    }

    const attempts = Math.max(1, Math.min(20, Number(req.body && req.body.attempts) || 1));
    const result = runGenerator({
      classes:     parsed.classes,
      curriculum:  parsed.curriculum,
      weekDays,
      constraints: parsed.constraints,
      shifts:      parsed.shifts,
      seed,
      attempts,
    });
    const audit = calculateScore(result.schedule, { weekDays });
    const allWarnings = [].concat(parsed.warnings || [], result.warnings || []);
    const errBody = result.ok ? undefined : {
      code: 'GEN_INCOMPLETE',
      message: buildGenErrorMessage(result, allWarnings),
    };

    return res.status(result.ok ? 200 : 207).json({
      ok:       result.ok,
      schedule: result.schedule,
      audit: {
        score:      audit.score,
        grade:      audit.grade,
        hardCount:  audit.hardCount,
        softCount:  audit.softCount,
        violations: audit.violations,
      },
      summary: { ...result.summary, mode: 'fast' },
      warnings: allWarnings,
      meta,
      ...(errBody ? { error: errBody } : {}),
    });
  } catch (err) {
    console.error('[POST /api/generate/from-xlsx]', err);
    return res.status(500).json({
      ok: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Внутренняя ошибка парсера.' },
    });
  }
});

// ── POST /api/generate/substitute ────────────────────────────
// Эпик 3.3: подбор экстренной замены.
// Body: { schedule, curriculum, shifts?, absentTeacherId, absentDay }
// absentDay — индекс дня (0..5) или название ('Пн', 'Вт', ...).
router.post('/substitute', requirePlan(['paid']), (req, res) => {
  try {
    const { schedule, curriculum, shifts, absentTeacherId, absentDay } = req.body || {};

    if (!schedule || typeof schedule !== 'object') {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Поле schedule обязательно' } });
    }
    if (!Array.isArray(curriculum) || !curriculum.length) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Поле curriculum обязательно' } });
    }
    if (!absentTeacherId) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Укажите absentTeacherId' } });
    }

    const DAY_MAP = { 'пн':0,'вт':1,'ср':2,'чт':3,'пт':4,'сб':5 };
    let dayIdx = typeof absentDay === 'number' ? absentDay : null;
    if (dayIdx == null && absentDay) {
      const k = String(absentDay).toLowerCase().replace(/ё/g,'е').trim();
      if (DAY_MAP[k] != null) dayIdx = DAY_MAP[k];
    }
    if (dayIdx == null || dayIdx < 0 || dayIdx > 5) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Некорректный absentDay (ожидается 0..5 или Пн..Сб)' } });
    }

    const absentTid = String(absentTeacherId);
    const classShift = cls => (shifts && shifts[cls] === 2) ? 2 : 1;

    // Какие (class, subject) пары ведёт отсутствующий учитель
    const absentSubjByClass = {};
    for (const c of curriculum) {
      if (String(c.teacherId) === absentTid) {
        if (!absentSubjByClass[c.classId]) absentSubjByClass[c.classId] = new Set();
        absentSubjByClass[c.classId].add(c.subject);
      }
    }

    // Найти поражённые уроки в расписании
    const affected = [];
    for (const [cls, daysArr] of Object.entries(schedule)) {
      const subjs = absentSubjByClass[cls];
      if (!subjs) continue;
      const day = daysArr[dayIdx];
      if (!day) continue;
      for (let s = 0; s < day.length; s++) {
        const subj = day[s];
        if (subj && subjs.has(subj)) {
          affected.push({ class: cls, dayIdx, slot: s + 1, subject: subj });
        }
      }
    }

    // Кто ещё ведёт нужные предметы (не отсутствующий)
    const subjTeachers = {};
    for (const c of curriculum) {
      if (String(c.teacherId) === absentTid) continue;
      if (!c.subject || !c.teacherId) continue;
      if (!subjTeachers[c.subject]) subjTeachers[c.subject] = new Set();
      subjTeachers[c.subject].add(String(c.teacherId));
    }

    // Кто занят в каких (d, slot, shift)
    const teacherBusy = {};
    for (const [cls, daysArr] of Object.entries(schedule)) {
      const sh = classShift(cls);
      for (let d = 0; d < daysArr.length; d++) {
        for (let s = 0; s < daysArr[d].length; s++) {
          const subj = daysArr[d][s];
          if (!subj) continue;
          const cur = curriculum.find(c => c.classId === cls && c.subject === subj);
          if (cur && cur.teacherId) {
            teacherBusy[`${cur.teacherId}:${d}:${s + 1}:${sh}`] = true;
          }
        }
      }
    }

    // Подобрать замены
    const suggestions = affected.map(a => {
      const sh = classShift(a.class);
      const pool = subjTeachers[a.subject] ? Array.from(subjTeachers[a.subject]) : [];
      const freeTeachers = pool.filter(tid => !teacherBusy[`${tid}:${a.dayIdx}:${a.slot}:${sh}`]);

      if (freeTeachers.length) {
        return {
          ...a,
          action: 'substitute',
          substitutes: freeTeachers,
          message: `Заменить: ${freeTeachers.join(', ')}`,
        };
      }
      return {
        ...a,
        action: 'none',
        message: `Нет свободного учителя предмета «${a.subject}» в ${['Пн','Вт','Ср','Чт','Пт','Сб'][a.dayIdx]} на уроке ${a.slot}. Рекомендуем отменить или перенести.`,
      };
    });

    return res.json({
      ok: true,
      absentTeacherId: absentTid,
      dayIdx,
      affectedCount: affected.length,
      affected,
      suggestions,
    });
  } catch (err) {
    console.error('[POST /api/generate/substitute]', err);
    return res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: err.message || 'Внутренняя ошибка' } });
  }
});

// ── GET /api/generate/cp-sat/health ─────────────────────────
// Проверка, что Python + ortools установлены и solver запускается.
router.get('/cp-sat/health', async (_req, res) => {
  const ping = await pingCpSat();
  if (ping.ok) {
    res.json({ ok: true, summary: ping.summary });
  } else {
    res.status(503).json({ ok: false, error: ping.error });
  }
});

// ── GET /api/generate/health ────────────────────────────────
router.get('/health', (_req, res) => {
  const probe = runGenerator({
    classes: ['1А'],
    curriculum: [
      { classId:'1А', subject:'Математика',         weeklyHours:4, teacherId:'T1', roomId:'к.1' },
      { classId:'1А', subject:'Русский язык',        weeklyHours:5, teacherId:'T2', roomId:'к.2' },
      { classId:'1А', subject:'Физическая культура', weeklyHours:3, teacherId:'T3', roomId:'зал' },
    ],
    weekDays: 5,
  });
  res.json({ ok: probe.ok, btCalls: probe.summary.btCalls, placed: probe.summary.placedLessons });
});

module.exports = router;
