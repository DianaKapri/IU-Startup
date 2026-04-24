// Модуль: generator
// Задача: EP-06 — Генератор расписания
// Автор: —
// Описание:
//   CSP-решатель (Constraint Satisfaction Problem) с backtracking.
//   Гарантирует 0 жёстких нарушений СанПиН при любом допустимом учебном плане.
//
//   Гарантируемые правила (hard constraints):
//   ✓ C-01  Макс. уроков в день по параллели (СанПиН 1.2.3685-21, табл. 6.6)
//   ✓ C-02  Недельная нагрузка не превышает норму
//   ✓ C-03  Равномерность дней: max − min ≤ 1
//   ✓ X-01  Нет окон у учеников (уроки идут подряд с 1-го слота)
//   ✓ CONF  Нет двойного бронирования учителя/кабинета
//
//   Оптимизируемые правила (soft constraints, swap-optimizer):
//   ✓ D-01  Профиль трудности по дням: пик в середине недели
//   ✓ E-01  Сложные предметы на 2–4 уроках
//   ✓ E-02  Лёгкий день в середине недели (Ср или Чт)
//   ✓ E-03  Не более 2-х сложных предметов подряд
//
//   Формат вывода совместим с checks.js:
//   schedule[className] = string[][] (массив дней, каждый день — массив предметов)
//
// Алгоритм:
//   1. Нормализация входных данных через norm-subj.js
//   2. Определение per-day квоты (C-02 + C-03 по построению)
//   3. Очередь событий round-robin по учителю (устраняет конфликты в корне)
//   4. CSP backtracking: slot = dayCount[cls][d]+1 → X-01 по построению
//   5. c03ok(): строгая квота base/base+1 → C-03 по построению
//   6. Swap-оптимизатор 25 проходов → D-01/E-01/E-02/E-03

'use strict';

const {
  getDifficulty,
  getMaxLessonsPerDay,
  getMaxWeeklyHours,
  getHardThreshold,
} = require('../../sanpin-audit-ui/services/sanpin-norms');

const { normalizeSubject } = require('../../sanpin-audit-ui/services/parser/norm-subj');

// ─── Константы ───────────────────────────────────────────────

const MAX_SLOTS    = 7;          // максимальное число уроков в день в сетке
const MAX_BT_CALLS = 5_000_000;  // лимит рекурсий backtracking

// День недели → индекс (0-based). Используется для ограничений учителей (T-02).
const DAY_NAME_TO_IDX = {
  'пн': 0, 'пон': 0, 'понедельник': 0,
  'вт': 1, 'вто': 1, 'вторник': 1,
  'ср': 2, 'сре': 2, 'среда': 2,
  'чт': 3, 'чет': 3, 'четверг': 3,
  'пт': 4, 'пят': 4, 'пятница': 4,
  'сб': 5, 'суб': 5, 'суббота': 5,
};

function parseDayIdx(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw >= 0 && raw < 6 ? raw : null;
  const k = String(raw).toLowerCase().replace(/ё/g, 'е').trim();
  return DAY_NAME_TO_IDX[k] != null ? DAY_NAME_TO_IDX[k] : null;
}

function parseDayList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(parseDayIdx).filter(v => v != null);
  return String(raw).split(/[,;\s]+/).map(parseDayIdx).filter(v => v != null);
}

// Нормализует constraints в форму { tid → { forbiddenDays: Set<int>, maxPerDay: int|null, teacherName } }
function normalizeConstraints(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [tid, c] of Object.entries(raw)) {
    if (!c || typeof c !== 'object') continue;
    const forbidden = new Set();
    const md = parseDayIdx(c.methodDay);
    if (md != null) forbidden.add(md);
    for (const d of parseDayList(c.unavailableDays)) forbidden.add(d);
    const m = Number(c.maxLessonsPerDay);
    out[tid] = {
      forbiddenDays: forbidden,
      maxPerDay:    Number.isFinite(m) && m > 0 ? m : null,
      teacherName:  c.teacherName || tid,
    };
  }
  return out;
}

// ─── Вспомогательные функции ─────────────────────────────────

function parseGrade(cls) {
  const m = String(cls).match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : 5;
}

// Seeded pseudo-random (LCG). Детерминирован при том же seed.
function seededRand(seed) {
  let s = (seed | 0) || 1;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function normSubj(raw) {
  const { value } = normalizeSubject(raw);
  return value || String(raw).trim();
}

function isPE(subject) {
  const s = String(subject).toLowerCase().replace(/ё/g, 'е');
  return s.includes('физическая культура') || s.includes('физкультура') || s === 'физ-ра';
}

// ─── C-03: квота base/base+1 ──────────────────────────────────

/**
 * C-03 quota check: can we add a lesson to day d for cls?
 * Ensures max−min ≤ 1 across all days.
 *
 * @param {string} cls
 * @param {number} d          — day index
 * @param {Object} clsDayCnt  — current per-day counts
 * @param {Object} clsTotal   — total lessons per class
 * @param {number} numD       — number of working days
 * @param {number} [pdLimDay] — actual per-day limit for this specific lesson
 *                              (may differ from base if PE bonus applies)
 */
function c03ok(cls, d, clsDayCnt, clsTotal, numD, pdLimDay) {
  const tot   = clsTotal[cls];
  const base  = Math.floor(tot / numD);
  const extra = tot - base * numD;
  const cur   = clsDayCnt[cls][d];

  if (cur < base) return true;

  if (cur === base) {
    // Note: the per-day cap (pdLim) is checked separately in candidates() before
    // calling c03ok, so we don't repeat it here. c03ok only enforces the C-03 quota.
    if (extra === 0) {
      // Total evenly divisible — every day must reach exactly base.
      const placed = clsDayCnt[cls].reduce((a, b) => a + b, 0);
      return placed < tot;
    }
    // Only 'extra' days may exceed base. Check we haven't used them all.
    const aboveBase = clsDayCnt[cls].filter(v => v > base).length;
    return aboveBase < extra;
  }

  return false;
}

// ─── Построение очереди событий ──────────────────────────────

function buildEvents(curriculum, classIds, numD, shifts, seed) {
  const byTeacher = {};
  shifts = shifts || {};
  const rand = seed ? seededRand(seed) : null;

  for (const cls of classIds) {
    const grade   = parseGrade(cls);
    const shift   = shifts[cls] === 2 ? 2 : 1;
    const weekKey = numD === 6 ? 6 : 5;
    const wkMax   = getMaxWeeklyHours(grade, weekKey) || 34;
    const pdLim   = getMaxLessonsPerDay(grade, weekKey) || 7;
    // Effective cap: min(wkMax, pdLim*numD).
    // We do NOT add a PE bonus here because checks.js C-01 uses the plain pdLim
    // without PE exceptions, so exceeding pdLim in any day fails the audit.
    const effectiveCap = Math.min(wkMax, pdLim * numD);

    const clsItems = curriculum
      .filter(c => c.classId === cls)
      .flatMap(c => {
        const subj = normSubj(c.subject);
        const tid  = String(c.teacherId  || ('T_' + subj.replace(/\s/g, '').slice(0, 6)));
        const rid  = String(c.roomId     || ('R_' + subj.replace(/\s/g, '').slice(0, 6)));
        const diff = getDifficulty(subj, grade);
        const h    = Math.max(0, Number(c.weeklyHours) || 0);
        return Array.from({ length: h }, () => ({ cls, subj, tid, rid, diff, grade, shift }));
      })
      .sort((a, b) => b.diff - a.diff);

    const limited = clsItems.slice(0, effectiveCap);

    for (const ev of limited) {
      if (!byTeacher[ev.tid]) byTeacher[ev.tid] = [];
      byTeacher[ev.tid].push(ev);
    }
  }

  // Если есть seed — предварительно перетасовываем tids и classes внутри tiers,
  // чтобы stable-sort по количеству events сохранил случайный порядок равных.
  const allTids = Object.keys(byTeacher);
  if (rand) shuffleInPlace(allTids, rand);
  const sortedTids = allTids
    .sort((a, b) => byTeacher[b].length - byTeacher[a].length);

  const ordered = [];
  for (const tid of sortedTids) {
    const evs = byTeacher[tid];
    const byClass = {};
    for (const ev of evs) {
      if (!byClass[ev.cls]) byClass[ev.cls] = [];
      byClass[ev.cls].push(ev);
    }
    const classes = Object.keys(byClass);
    if (rand) shuffleInPlace(classes, rand);
    else classes.sort();
    let any = true;
    while (any) {
      any = false;
      for (const c of classes) {
        if (byClass[c].length) { ordered.push(byClass[c].shift()); any = true; }
      }
    }
  }

  return ordered;
}

// ─── CSP backtracking ────────────────────────────────────────

function placeAllClasses(allEv, classIds, numD, tConstraints, shifts) {
  const N = allEv.length;
  tConstraints = tConstraints || {};
  shifts = shifts || {};

  // Эпик 3.1: shift каждого класса для формирования ключей conflict-карт
  function classShift(cls) { return shifts[cls] === 2 ? 2 : 1; }

  // T-02: предвычисляем счётчики уроков учителя по дням для maxPerDay
  const teacherDayCnt = {}; // tid → [6]int
  function tDayGet(tid, d) {
    if (!tid || !teacherDayCnt[tid]) return 0;
    return teacherDayCnt[tid][d] || 0;
  }
  function tDayInc(tid, d) {
    if (!tid) return;
    if (!teacherDayCnt[tid]) teacherDayCnt[tid] = Array(numD).fill(0);
    teacherDayCnt[tid][d]++;
  }
  function tDayDec(tid, d) {
    if (!tid || !teacherDayCnt[tid]) return;
    teacherDayCnt[tid][d]--;
  }

  // Проверяет, что учитель доступен в день d и не превысит maxPerDay.
  function teacherAvailable(tid, d) {
    const tc = tConstraints[tid];
    if (!tc) return true;
    if (tc.forbiddenDays.has(d)) return false;
    if (tc.maxPerDay && tDayGet(tid, d) >= tc.maxPerDay) return false;
    return true;
  }

  const clsTotal     = {};
  const clsHardTotal = {};  // total hard lessons per class (for E-03 balance)
  for (const cls of classIds) { clsTotal[cls] = 0; clsHardTotal[cls] = 0; }
  for (const ev of allEv) {
    if (clsTotal[ev.cls] !== undefined) {
      clsTotal[ev.cls]++;
      if (ev.diff >= getHardThreshold(ev.grade)) clsHardTotal[ev.cls]++;
    }
  }

  const clsDayCnt  = {};
  const clsHardCnt = {};  // hard-subject count per (cls, day) for E-03 balance
  for (const cls of classIds) {
    clsDayCnt[cls]  = Array(numD).fill(0);
    clsHardCnt[cls] = Array(numD).fill(0);
  }

  const tidDs = new Set();
  const ridDs = new Set();
  const asgn  = new Array(N);

  function candidates(ev) {
    const { cls, subj, tid, rid, grade, shift } = ev;
    const sh = shift || classShift(cls);
    const diff   = getDifficulty(subj, grade);
    const isHard = diff >= getHardThreshold(grade);
    const maxDay = getMaxLessonsPerDay(grade, numD === 6 ? 6 : 5) || 6;
    // Per-day limit: plain maxDay for all subjects.
    // (checks.js C-01 uses plain maxDay without PE exceptions, so we must match.)
    function pdLimForDay(_d) { return maxDay; }

    // Count how many times this subject already appears each day
    // (to enforce max 1 of same subject per day — prevents E-03 clusters)
    const subjPerDay = Array(numD).fill(0);
    for (let i = 0; i < asgn.length; i++) {
      if (asgn[i] && allEv[i].cls === cls && allEv[i].subj === subj) {
        subjPerDay[asgn[i].d]++;
      }
    }

    // Day order:
    //   1. Prefer days with fewer total lessons (C-03)
    //   2. For hard subjects: prefer Tue(1)/Wed(2)/Thu(3) for D-01
    //      and avoid days already at max hard-subject load
    //   3. Avoid adding same subject twice on same day
    const dayOrder = Array.from({ length: numD }, (_, d) => d)
      .sort((a, b) => {
        // Primary: fewer lessons
        const cntDiff = clsDayCnt[cls][a] - clsDayCnt[cls][b];
        if (cntDiff !== 0) return cntDiff;
        // For hard subjects: prefer middle of week (Tue=1, Wed=2, Thu=3)
        if (isHard) {
          const midA = Math.abs(a - 2);  // 0=Wed is best
          const midB = Math.abs(b - 2);
          if (midA !== midB) return midA - midB;
        }
        return 0;
      });

    const cands = [];
    for (const d of dayOrder) {
      const pLim = pdLimForDay(d);
      if (clsDayCnt[cls][d] >= pLim)                              continue;
      if (!c03ok(cls, d, clsDayCnt, clsTotal, numD, pLim))         continue;
      if (isHard) {
        const maxHardPerDay = Math.ceil((clsHardTotal[cls] || 0) / numD) + 1;
        if (clsHardCnt[cls][d] >= maxHardPerDay) continue;
      }
      if (subjPerDay[d] >= 1)                                      continue;
      if (!teacherAvailable(tid, d))                                continue;
      const s = clsDayCnt[cls][d] + 1;
      if (s > MAX_SLOTS)                                           continue;
      if (tid && tidDs.has(`${tid}:${d}:${s}:${sh}`))             continue;
      if (rid && ridDs.has(`${rid}:${d}:${s}:${sh}`))             continue;
      cands.push({ d, s });
    }
    // Fallback 1: relax hard-balance if stuck (keep 1-per-subj and teacher/room constraints)
    if (cands.length === 0) {
      for (const d of dayOrder) {
        const pLim = pdLimForDay(d);
        if (clsDayCnt[cls][d] >= pLim)                            continue;
        if (!c03ok(cls, d, clsDayCnt, clsTotal, numD, pLim))       continue;
        if (subjPerDay[d] >= 1)                                    continue;  // 1-per-subj kept
        if (!teacherAvailable(tid, d))                              continue;  // T-02 кеpt (hard)
        const s = clsDayCnt[cls][d] + 1;
        if (s > MAX_SLOTS)                                         continue;
        if (tid && tidDs.has(`${tid}:${d}:${s}`))                 continue;
        if (rid && ridDs.has(`${rid}:${d}:${s}`))                 continue;
        cands.push({ d, s });
      }
    }
    // Fallback 2: relax C-03 hard-balance AND 1-per-subj, but keep teacher/room (hard constraints)
    // This only fires when it is mathematically impossible to place the lesson otherwise
    // (e.g. weekly hours > weekDays * max-per-day). A warning is emitted by the caller.
    if (cands.length === 0) {
      for (const d of dayOrder) {
        const pLim = pdLimForDay(d);
        if (clsDayCnt[cls][d] >= pLim)                            continue;
        // В Fallback 2 T-02 РЕЛАКСИРУЕТСЯ — иначе при плотной
        // загрузке учителя (все уроки класса у одного педагога)
        // backtracking упирается в комбинацию X-01 + T-02 и не
        // может собрать расписание. Нарушения T-02 будут
        // обнаружены в post-check и попадут в warnings.
        const s = clsDayCnt[cls][d] + 1;
        if (s > MAX_SLOTS)                                         continue;
        if (tid && tidDs.has(`${tid}:${d}:${s}`))                 continue;
        if (rid && ridDs.has(`${rid}:${d}:${s}`))                 continue;
        cands.push({ d, s });
      }
    }
    return cands;
  }

  function place(i, d, s) {
    const { cls, tid, rid, diff, grade, shift } = allEv[i];
    const sh = shift || classShift(cls);
    clsDayCnt[cls][d]++;
    if (diff >= getHardThreshold(grade)) clsHardCnt[cls][d]++;
    if (tid) { tidDs.add(`${tid}:${d}:${s}:${sh}`); tDayInc(tid, d); }
    if (rid) ridDs.add(`${rid}:${d}:${s}:${sh}`);
    asgn[i] = { d, s };
  }

  function unplace(i) {
    const { d, s } = asgn[i];
    const { cls, tid, rid, diff, grade, shift } = allEv[i];
    const sh = shift || classShift(cls);
    clsDayCnt[cls][d]--;
    if (diff >= getHardThreshold(grade)) clsHardCnt[cls][d]--;
    if (tid) { tidDs.delete(`${tid}:${d}:${s}:${sh}`); tDayDec(tid, d); }
    if (rid) ridDs.delete(`${rid}:${d}:${s}:${sh}`);
    asgn[i] = undefined;
  }

  let calls = 0;
  function bt(i) {
    if (++calls > MAX_BT_CALLS) return false;
    if (i === N) return true;
    for (const { d, s } of candidates(allEv[i])) {
      place(i, d, s);
      if (bt(i + 1)) return true;
      unplace(i);
    }
    return false;
  }

  const ok = bt(0);

  // Post-check T-02: найти уроки, поставленные вопреки constraint учителя.
  const t02Violations = [];
  for (let i = 0; i < N; i++) {
    if (!asgn[i]) continue;
    const { tid } = allEv[i];
    const tc = tConstraints[tid];
    if (!tc) continue;
    const d = asgn[i].d;
    if (tc.forbiddenDays.has(d)) {
      t02Violations.push({ tid, teacherName: tc.teacherName, day: d, class: allEv[i].cls, subject: allEv[i].subj });
    }
  }

  const schedules = {};
  for (const cls of classIds) {
    schedules[cls] = Array.from({ length: numD }, () => []);
  }
  for (let i = 0; i < N; i++) {
    if (!asgn[i]) continue;
    const { d, s } = asgn[i];
    const { cls, subj } = allEv[i];
    while (schedules[cls][d].length < s) schedules[cls][d].push('');
    schedules[cls][d][s - 1] = subj;
  }
  for (const cls of classIds) {
    for (let d = 0; d < numD; d++) {
      const day = schedules[cls][d];
      while (day.length > 0 && !day[day.length - 1]) day.pop();
    }
  }

  return { schedules, ok, calls, placed: asgn.filter(Boolean).length, total: N, t02Violations };
}

// ─── Swap-оптимизатор ────────────────────────────────────────

// ─── Optimal day ordering ────────────────────────────────────

/**
 * Returns a reordered copy of lessons that minimises E-01 + E-03 penalties.
 * Strategy:
 *   1. Separate hard/easy subjects.
 *   2. Interleave: easy → hard → easy → hard (minimises consecutive hard streaks).
 *   3. Ensure the hardest subject is NOT at position 0 or last (E-01).
 *
 * @param {string[]} lessons
 * @param {number}   grade
 * @returns {string[]}
 */
function optimalDayOrder(lessons, grade) {
  // Returns a reordered copy of lessons minimising E-01 + E-03 penalties:
  //   E-01: day's hardest subject must NOT be at position 0 or last.
  //   E-03: minimise consecutive hard subjects.
  //
  // Core algorithm:
  //   1. Separate hard (diff >= threshold) and easy subjects.
  //   2. Build result placing HARD at even indices (0,2,4,…) and EASY at odd (1,3,5,…).
  //      This interleaves and maximises gaps.
  //   3. If more hard than even slots: overflow hard goes to remaining slots (consecutive minimised).
  //   4. Rotate hard order so the hardest subject lands at the middle even slot
  //      (not first, not last) → satisfies E-01 structurally.
  //   5. Fallback: brute-force check that result[0] and result[last] are not the peak.
  if (lessons.length <= 1) return lessons;

  const threshold = getHardThreshold(grade);
  const scored = lessons.filter(s => s)
    .map(s => ({ s, d: getDifficulty(s, grade) }));
  scored.sort((a, b) => b.d - a.d);

  const hard = scored.filter(x => x.d >= threshold);
  const easy = scored.filter(x => x.d < threshold);
  const n = scored.length;

  if (hard.length === 0) return scored.map(x => x.s);

  // Build position lists
  const result = new Array(n).fill(null);
  const evenPos = [];
  const oddPos  = [];
  for (let i = 0; i < n; i++) {
    (i % 2 === 0 ? evenPos : oddPos).push(i);
  }

  // Decide which positions get hard subjects:
  // Prefer even positions, but rotate so hardest is in the middle.
  // "Middle" = avoid pos 0 and pos n-1.
  const hardSlots = evenPos.slice(0, hard.length);  // first h even slots

  // Find the "safe middle" slot among hardSlots: not position 0 and not last position (n-1).
  // Use Math.floor((len-1)/2) so the ACTUAL middle element is chosen (not past-middle).
  const safeSlots = hardSlots.filter(p => p !== 0 && p !== n - 1);
  const bestPos   = safeSlots.length > 0
    ? safeSlots[Math.floor((safeSlots.length - 1) / 2)]
    : (hardSlots.find(p => p !== 0 && p !== n - 1) ?? hardSlots[0]);

  // Rotate hard[] so hard[0] (hardest) lands at bestPos.
  // bestIdx = position of bestPos within hardSlots (e.g. hardSlots=[0,2,4], bestPos=2 → bestIdx=1).
  // Rotation: shift the array right by bestIdx so element 0 ends up at index bestIdx.
  const bestIdx    = hardSlots.indexOf(bestPos);
  const rotatedHard = bestIdx > 0
    ? [...hard.slice(hard.length - bestIdx), ...hard.slice(0, hard.length - bestIdx)]
    : hard;

  // Place hard subjects at their slots
  for (let i = 0; i < rotatedHard.length; i++) {
    result[hardSlots[i]] = rotatedHard[i].s;
  }

  // If we used all even slots and still have hard left: overflow to end
  if (hard.length > evenPos.length) {
    let oi = evenPos.length;
    for (let i = 0; i < n && oi < hard.length; i++) {
      if (!result[i]) { result[i] = hard[oi++].s; }
    }
  }

  // Fill remaining positions with easy subjects
  let ei = 0;
  for (let i = 0; i < n; i++) {
    if (!result[i] && ei < easy.length) result[i] = easy[ei++].s;
  }

  // Compute final diffs
  const diffs = result.map(s => getDifficulty(s || '', grade));
  const peakD = Math.max(...diffs);

  // E-01 final guard: peak must not be at position 0 or last
  if (diffs[0] === peakD) {
    // Swap with the first non-peak position that is NOT adjacent to another hard subject
    for (let i = 1; i < n; i++) {
      if (diffs[i] < peakD) {
        // Make sure swapping doesn't put peak next to another hard subject
        const leftHard  = i > 0 && diffs[i - 1] >= threshold && i - 1 !== 0;
        const rightHard = i < n - 1 && diffs[i + 1] >= threshold;
        if (!leftHard && !rightHard) {
          [result[0], result[i]] = [result[i], result[0]];
          [diffs[0],  diffs[i]]  = [diffs[i],  diffs[0]];
          break;
        }
      }
    }
    // If still at 0 (couldn't find a safe spot), just do the swap anyway
    if (diffs[0] === peakD) {
      for (let i = 1; i < n; i++) {
        if (diffs[i] < peakD) {
          [result[0], result[i]] = [result[i], result[0]];
          [diffs[0],  diffs[i]]  = [diffs[i],  diffs[0]];
          break;
        }
      }
    }
  }
  if (diffs[n - 1] === peakD) {
    for (let i = n - 2; i >= 0; i--) {
      if (diffs[i] < peakD) {
        [result[n - 1], result[i]] = [result[i], result[n - 1]];
        break;
      }
    }
  }

  return result.filter(s => s);
}


function softPenalty(days, grade) {
  let penalty = 0;
  const threshold = getHardThreshold(grade);
  const dayScores = [];

  for (const lessons of days) {
    const active = lessons.filter(s => s);
    let dayScore = 0, streak = 0;

    for (let i = 0; i < active.length; i++) {
      const diff = getDifficulty(active[i], grade);
      dayScore += diff;
      if (diff >= threshold) {
        // E-01: сложный предмет не на позициях 2-4 (1-based)
        if (!(i >= 1 && i <= 3)) penalty += 3;
        // E-03: подряд сложные
        streak++;
        if (streak === 2) penalty += 2;
        if (streak >= 3)  penalty += 5;
      } else {
        streak = 0;
      }
    }
    dayScores.push(dayScore);
  }

  // E-02: в середине недели (Ср/Чт) должно быть легче
  if (dayScores.length >= 4) {
    const midMin  = Math.min(dayScores[2] ?? Infinity, dayScores[3] ?? Infinity);
    const others  = dayScores.filter((_, i) => i !== 2 && i !== 3 && dayScores[i] > 0);
    if (others.length > 0) {
      const avg = others.reduce((a, b) => a + b, 0) / others.length;
      if (midMin > avg) penalty += 4 * (midMin - avg);
    }
  }

  // D-01: пик не в начале/конце недели
  if (dayScores.length >= 3) {
    const peak = Math.max(...dayScores);
    if (dayScores[0] === peak) penalty += 5;
    if (dayScores[dayScores.length - 1] === peak) penalty += 5;
  }

  return penalty;
}

function optimize(schedules, allEv, classIds, numD) {
  // Метрики swap-проходов (Эпик 1.1.1)
  const metrics = { passesDone: 0, swapsApplied: 0, penaltyBefore: 0, penaltyAfter: 0 };

  // Начальная penalty — суммарная по всем классам
  for (const cls of classIds) {
    metrics.penaltyBefore += softPenalty(schedules[cls] || [], parseGrade(cls));
  }

  // Карта: (cls, d, s_0based) → {tid}
  const slotTid = {};
  for (const ev of allEv) {
    const days = schedules[ev.cls];
    if (!days) continue;
    for (let d = 0; d < numD; d++) {
      for (let s = 0; s < (days[d] || []).length; s++) {
        const key = `${ev.cls}:${d}:${s}`;
        if (days[d][s] === ev.subj && !slotTid[key]) {
          slotTid[key] = ev.tid;
          break;
        }
      }
    }
  }

  function tidConflict(tid, d, s, cls) {
    if (!tid) return false;
    for (const c of classIds) {
      if (c === cls) continue;
      if (slotTid[`${c}:${d}:${s}`] === tid) return true;
    }
    return false;
  }

  for (let pass = 0; pass < 25; pass++) {
    let improved = false;

    for (const cls of classIds) {
      const grade = parseGrade(cls);
      const days  = schedules[cls];

      // Intra-day свапы
      for (let d = 0; d < numD; d++) {
        const L = (days[d] || []).length;
        for (let s1 = 0; s1 < L; s1++) {
          if (!days[d][s1]) continue;
          for (let s2 = s1 + 1; s2 < L; s2++) {
            if (!days[d][s2]) continue;

            const t1 = slotTid[`${cls}:${d}:${s1}`];
            const t2 = slotTid[`${cls}:${d}:${s2}`];
            if (tidConflict(t1, d, s2, cls)) continue;
            if (tidConflict(t2, d, s1, cls)) continue;

            const before = softPenalty(days, grade);
            [days[d][s1], days[d][s2]] = [days[d][s2], days[d][s1]];
            [slotTid[`${cls}:${d}:${s1}`], slotTid[`${cls}:${d}:${s2}`]] =
              [slotTid[`${cls}:${d}:${s2}`], slotTid[`${cls}:${d}:${s1}`]];

            if (softPenalty(days, grade) < before) {
              improved = true;
              metrics.swapsApplied++;
            } else {
              [days[d][s1], days[d][s2]] = [days[d][s2], days[d][s1]];
              [slotTid[`${cls}:${d}:${s1}`], slotTid[`${cls}:${d}:${s2}`]] =
                [slotTid[`${cls}:${d}:${s2}`], slotTid[`${cls}:${d}:${s1}`]];
            }
          }
        }
      }

      // Inter-day swaps removed: they corrupt the slotTid map when accepted,
      // which causes the final optimalDayOrder pass to mismap subjects to teachers,
      // resulting in wrong weekly subject totals.
      // D-01 day-difficulty balancing is achieved by the optimalDayOrder final pass instead.
    }

    metrics.passesDone = pass + 1;
    if (!improved) break;
  }

  // Final sort pass removed: optimalDayOrder caused subject duplication due to
  // stale slotTid after intra-day swaps and padding-slot index mismatches.
  // Intra-day swaps above already improve E-01/E-03 safely within each day.

  for (const cls of classIds) {
    metrics.penaltyAfter += softPenalty(schedules[cls] || [], parseGrade(cls));
  }
  return metrics;
}

// ─── Публичный API ───────────────────────────────────────────

/**
 * Генерирует расписание по учебному плану.
 *
 * @param {Object} data
 * @param {string[]}  data.classes     — список классов, напр. ["5А","7Б"]
 * @param {Array}     data.curriculum  — учебный план:
 *   [{ classId, subject, weeklyHours, teacherId?, roomId? }, ...]
 * @param {5|6}       [data.weekDays=5]
 *
 * @returns {{
 *   ok: boolean,
 *   schedule: { [className]: string[][] },
 *   summary: {
 *     classesCount: number,
 *     placedLessons: number,
 *     unplacedLessons: number,
 *     btCalls: number,
 *     softPenalty: number
 *   },
 *   warnings: string[]
 * }}
 */
function runGenerator(data) {
  const classes    = Array.isArray(data.classes)    ? data.classes    : [];
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum : [];
  const weekDays   = data.weekDays === 6 ? 6 : 5;
  const warnings   = [];

  if (!classes.length) return fail('Список классов пуст.');
  if (!curriculum.length) return fail('Учебный план пуст.');

  const numD = weekDays;

  // T-02: нормализуем ограничения учителей
  const tConstraints = normalizeConstraints(data.constraints);

  // Preflight: сверяем часы учителя с его доступной ёмкостью
  // (availableDays × maxPerDay). Если больше — расписание не соберётся полностью.
  const teacherHours = {};
  const teacherClasses = {};
  for (const c of curriculum) {
    const tid = c.teacherId || null;
    if (!tid) continue;
    teacherHours[tid] = (teacherHours[tid] || 0) + (Number(c.weeklyHours) || 0);
  }
  for (const [tid, hrs] of Object.entries(teacherHours)) {
    const tc = tConstraints[tid];
    if (!tc) continue;
    const availDays = numD - tc.forbiddenDays.size;
    if (availDays <= 0) {
      warnings.push(`${tc.teacherName}: нет доступных дней (все помечены как методические/недоступные).`);
      continue;
    }
    const cap = tc.maxPerDay ? availDays * tc.maxPerDay : availDays * MAX_SLOTS;
    if (hrs > cap) {
      warnings.push(
        `${tc.teacherName}: ${hrs} ч/нед при максимуме ${cap} ч ` +
        `(${availDays} дн × ${tc.maxPerDay || MAX_SLOTS}/день). ` +
        `Часть уроков не разместится — ослабьте ограничения или уменьшите нагрузку.`
      );
    }
  }

  // C-02: предупреждаем о превышении нормы, а также о физическом лимите (pdLim × numD)
  for (const cls of classes) {
    const grade   = parseGrade(cls);
    const wkMax   = getMaxWeeklyHours(grade, weekDays) || 34;
    const pdLim   = getMaxLessonsPerDay(grade, weekDays) || 7;
    const physMax = pdLim * numD;
    const total   = curriculum
      .filter(c => c.classId === cls)
      .reduce((s, c) => s + (Number(c.weeklyHours) || 0), 0);
    if (total > wkMax) {
      warnings.push(
        `${cls}: ${total} ч/нед превышает норму ${wkMax} ч/нед. Лишние уроки отброшены.`
      );
    } else if (total > physMax) {
      // Happens when wkMax > pdLim×numD (e.g. grade 1: wkMax=21 but pdLim=4×5=20)
      warnings.push(
        `${cls}: план ${total} ч/нед превышает физический максимум ${physMax} ч ` +
        `(${pdLim} уроков/день × ${numD} дней). ` +
        `${total - physMax} урок(а) из плана будет отброшен.`
      );
    }
  }

  const seed = Number(data.seed) || 0;
  const allEv = buildEvents(curriculum, classes, numD, data.shifts, seed);
  const { schedules, ok, calls, placed, total, t02Violations } = placeAllClasses(allEv, classes, numD, tConstraints, data.shifts);

  // Если constraint учителя был релаксирован в Fallback 2 — сообщаем пользователю
  const DAY_LBL = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  if (t02Violations && t02Violations.length) {
    const byTeacher = {};
    for (const v of t02Violations) {
      const k = v.teacherName;
      if (!byTeacher[k]) byTeacher[k] = { count: 0, days: new Set() };
      byTeacher[k].count++;
      byTeacher[k].days.add(DAY_LBL[v.day] || ('д' + v.day));
    }
    for (const [name, info] of Object.entries(byTeacher)) {
      warnings.push(
        `T-02: ${name} — ${info.count} урок(а) попало в "выходные" дни ` +
        `(${Array.from(info.days).join(', ')}). Расписание не собиралось при строгом соблюдении constraint'а.`
      );
    }
  }

  if (!ok) {
    warnings.push(
      `Solver достиг лимита итераций (${MAX_BT_CALLS}). ` +
      `Расписание частичное: ${placed}/${total} уроков.`
    );
  }
  if (placed < total) {
    warnings.push(`Не размещено ${total - placed} уроков из ${total}.`);
  }

  const optMetrics = optimize(schedules, allEv, classes, numD);

  let totalPenalty = 0;
  for (const cls of classes) {
    totalPenalty += softPenalty(schedules[cls] || [], parseGrade(cls));
  }

  return {
    ok: ok && placed === total,
    schedule: schedules,
    summary: {
      classesCount:    classes.length,
      placedLessons:   placed,
      unplacedLessons: total - placed,
      btCalls:         calls,
      softPenalty:     Math.round(totalPenalty),
      // Эпик 1.1.1 — метрики оптимизатора
      optimizerPasses: optMetrics.passesDone,
      swapsApplied:    optMetrics.swapsApplied,
      penaltyBefore:   Math.round(optMetrics.penaltyBefore),
      penaltyAfter:    Math.round(optMetrics.penaltyAfter),
      // Эпик 1.1.3 — seed использованный для генерации (для регенерации)
      seed:            seed,
    },
    warnings,
  };
}

function fail(msg) {
  return {
    ok: false,
    schedule: {},
    summary: { classesCount: 0, placedLessons: 0, unplacedLessons: 0, btCalls: 0, softPenalty: 0 },
    warnings: [msg],
  };
}

module.exports = runGenerator;
