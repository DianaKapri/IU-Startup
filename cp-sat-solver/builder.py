"""Построение CP-SAT модели из GeneratorInput.

Этап 1 (MVP): hard constraints (учебный план, X-01, C-01..C-02, CONF, T-02).
Этап 2: soft constraints (E-01, E-03, E-04, E-05) + objective minimization.
"""
from __future__ import annotations
import time
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
from ortools.sat.python import cp_model

from models import GeneratorInput, GeneratorOutput, GeneratorSummary
from sanpin import get_difficulty, is_hard, is_light

# Веса штрафов для soft-правил (определяют приоритет в objective)
W_E01 = 3   # сложный не на 2-4 уроке
W_E03 = 5   # 2+ сложных подряд
W_E04 = 4   # профильный (фк, муз, изо) на 1-м уроке
W_E05 = 4   # одинаковый предмет подряд
W_D01 = 5   # peak day на пн/пт
W_E02 = 3   # лёгкий день не в середине
W_D02 = 2   # дисбаланс параллели

DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]


def parse_grade(class_name: str) -> int:
    """Извлекает номер параллели из «5А» → 5."""
    digits = ""
    for ch in class_name:
        if ch.isdigit():
            digits += ch
        elif digits:
            break
    return int(digits) if digits else 5


def get_max_lessons_per_day(grade: int) -> int:
    """Лимит уроков в день по СанПиН (упрощённо)."""
    if grade <= 1:
        return 4
    if grade <= 4:
        return 5
    if grade <= 6:
        return 6
    return 7


def get_max_weekly_hours(grade: int, week_days: int) -> int:
    """Недельная норма по СанПиН (упрощённо)."""
    table_5d = {1: 21, 2: 23, 3: 23, 4: 23, 5: 29, 6: 30, 7: 32, 8: 33, 9: 33, 10: 34, 11: 34}
    base = table_5d.get(grade, 34)
    return base + 3 if week_days == 6 else base


def build_and_solve(inp: GeneratorInput) -> GeneratorOutput:
    """Главная точка входа: строит модель, запускает solver, возвращает результат."""

    t_build_start = time.time()
    classes = list(inp.classes)
    if not classes:
        return GeneratorOutput(
            ok=False,
            summary=GeneratorSummary(
                classesCount=0, placedLessons=0, status="invalid",
                solveTimeMs=0, buildTimeMs=0, variablesCount=0,
            ),
            error="Список классов пуст",
        )

    week_days = inp.weekDays
    days_range = list(range(week_days))

    # Уникальные предметы и пары (class, subject) из curriculum
    pairs = set()
    by_class_subj_hours = {}
    by_class_subj_teacher = {}

    for entry in inp.curriculum:
        if entry.classId not in classes:
            continue
        if entry.weeklyHours <= 0:
            continue
        key = (entry.classId, entry.subject)
        pairs.add(key)
        by_class_subj_hours[key] = entry.weeklyHours
        by_class_subj_teacher[key] = entry.teacherId

    if not pairs:
        return GeneratorOutput(
            ok=False,
            summary=GeneratorSummary(
                classesCount=len(classes), placedLessons=0, status="invalid",
                solveTimeMs=0, buildTimeMs=0, variablesCount=0,
            ),
            error="Учебный план пуст",
        )

    # Максимальное число слотов в день
    max_slots = max(get_max_lessons_per_day(parse_grade(c)) for c in classes)
    slots_range = list(range(1, max_slots + 1))

    # ─── CP-SAT модель ─────────────────────────────────────────
    model = cp_model.CpModel()

    # x[c, sub, d, s] = 1 если в этой ячейке стоит этот предмет
    x = {}
    for cls, sub in pairs:
        for d in days_range:
            for s in slots_range:
                x[cls, sub, d, s] = model.NewBoolVar(f"x_{cls}_{sub}_{d}_{s}")

    # y[c, d, s] = 1 если в этой ячейке есть хоть какой-то урок (для X-01)
    y = {}
    for c in classes:
        for d in days_range:
            for s in slots_range:
                y[c, d, s] = model.NewBoolVar(f"y_{c}_{d}_{s}")
                # y = OR(x по всем sub этого класса)
                cls_pairs = [x[c, sub, d, s] for (cls2, sub) in pairs if cls2 == c]
                if cls_pairs:
                    model.AddMaxEquality(y[c, d, s], cls_pairs)
                else:
                    model.Add(y[c, d, s] == 0)

    # ─── Hard constraints ──────────────────────────────────────

    # H1. Учебный план: для каждой пары (c, sub) ровно weekly_hours занятий
    for (cls, sub), hrs in by_class_subj_hours.items():
        model.Add(sum(x[cls, sub, d, s] for d in days_range for s in slots_range) == hrs)

    # H2. В одной ячейке (c, d, s) — не больше одного предмета
    for c in classes:
        for d in days_range:
            for s in slots_range:
                cls_subjects = [x[c, sub, d, s] for (cls2, sub) in pairs if cls2 == c]
                if cls_subjects:
                    model.Add(sum(cls_subjects) <= 1)

    # H3. C-01: лимит уроков в день для класса (по grade)
    for c in classes:
        pd_lim = get_max_lessons_per_day(parse_grade(c))
        for d in days_range:
            model.Add(sum(y[c, d, s] for s in slots_range) <= pd_lim)

    # H4. C-02: недельный лимит уроков для класса
    for c in classes:
        wk_max = get_max_weekly_hours(parse_grade(c), week_days)
        model.Add(sum(y[c, d, s] for d in days_range for s in slots_range) <= wk_max)

    # H5. X-01: нет окон. y[d,s+1]=1 → y[d,s]=1
    for c in classes:
        for d in days_range:
            for s in range(1, max_slots):  # 1..max_slots-1
                # y[c,d,s] >= y[c,d,s+1]
                model.Add(y[c, d, s] >= y[c, d, s + 1])

    # H6. CONF: учитель не в двух местах одновременно
    teacher_lessons = defaultdict(list)
    for (cls, sub) in pairs:
        tid = by_class_subj_teacher.get((cls, sub))
        if tid:
            teacher_lessons[tid].append((cls, sub))
    for tid, lessons in teacher_lessons.items():
        if len(lessons) <= 1:
            continue
        for d in days_range:
            for s in slots_range:
                model.Add(sum(x[c, sub, d, s] for c, sub in lessons) <= 1)

    # H7. Учитель: methodDay / unavailableDays (T-02)
    DAY_IDX = {n: i for i, n in enumerate(DAY_NAMES)}
    for tid, constraint in inp.constraints.items():
        forbidden_days = set()
        if constraint.methodDay:
            md_idx = DAY_IDX.get(constraint.methodDay)
            if md_idx is not None and md_idx < week_days:
                forbidden_days.add(md_idx)
        for day_name in constraint.unavailableDays:
            di = DAY_IDX.get(day_name)
            if di is not None and di < week_days:
                forbidden_days.add(di)
        if not forbidden_days:
            continue
        lessons = teacher_lessons.get(tid, [])
        for d in forbidden_days:
            for s in slots_range:
                for cls, sub in lessons:
                    model.Add(x[cls, sub, d, s] == 0)

    # H8. Учитель: maxLessonsPerDay (T-02)
    for tid, constraint in inp.constraints.items():
        if not constraint.maxLessonsPerDay:
            continue
        lessons = teacher_lessons.get(tid, [])
        if not lessons:
            continue
        for d in days_range:
            model.Add(sum(x[cls, sub, d, s] for cls, sub in lessons for s in slots_range) <= constraint.maxLessonsPerDay)

    # H9. CONF комнат: одна комната не в двух классах одновременно
    room_lessons = defaultdict(list)
    for entry in inp.curriculum:
        if entry.roomId:
            room_lessons[entry.roomId].append((entry.classId, entry.subject))
    for rid, lessons in room_lessons.items():
        # Учитываем смену: если оба урока в разных сменах — конфликта нет
        if len(lessons) <= 1:
            continue
        # Группируем по shift — внутри одной смены нельзя оба
        by_shift = defaultdict(list)
        for cls, sub in lessons:
            sh = inp.shifts.get(cls, 1)
            by_shift[sh].append((cls, sub))
        for shift, group in by_shift.items():
            if len(group) <= 1:
                continue
            for d in days_range:
                for s in slots_range:
                    model.Add(sum(x[cls, sub, d, s] for cls, sub in group) <= 1)

    # ─── Soft constraints + objective (Этап 2) ────────────────
    soft_terms = []

    # E-01: сложный предмет на slot 1 или slot >= 5 → штраф W_E01
    for c in classes:
        grade = parse_grade(c)
        for sub in {sub for (cls2, sub) in pairs if cls2 == c}:
            if not is_hard(sub, grade):
                continue
            for d in days_range:
                for s in slots_range:
                    if s == 1 or s >= 5:
                        soft_terms.append(W_E01 * x[c, sub, d, s])

    # E-04: лёгкий профильный на slot 1 → штраф W_E04
    for c in classes:
        for sub in {sub for (cls2, sub) in pairs if cls2 == c}:
            if not is_light(sub):
                continue
            for d in days_range:
                soft_terms.append(W_E04 * x[c, sub, d, 1])

    # E-05: один и тот же предмет подряд (slot s и s+1 одного и того же subj)
    # Создаём индикатор: e05[c,sub,d,s] >= x[c,sub,d,s] + x[c,sub,d,s+1] - 1
    for c in classes:
        for sub in {sub for (cls2, sub) in pairs if cls2 == c}:
            for d in days_range:
                for s in slots_range[:-1]:
                    ind = model.NewBoolVar(f"e05_{c}_{sub}_{d}_{s}")
                    model.Add(x[c, sub, d, s] + x[c, sub, d, s + 1] - 1 <= ind)
                    soft_terms.append(W_E05 * ind)

    # E-03: 2 сложных предмета подряд (любые hard subjects)
    # Сначала вычислим hard_at[c, d, s] = OR(x[c, sub, d, s] для sub в hard_subjects класса)
    hard_at: Dict[Tuple[str, int, int], cp_model.IntVar] = {}
    for c in classes:
        grade = parse_grade(c)
        hard_subs_for_c = [sub for (cls2, sub) in pairs if cls2 == c and is_hard(sub, grade)]
        for d in days_range:
            for s in slots_range:
                if not hard_subs_for_c:
                    continue
                ha = model.NewBoolVar(f"hard_at_{c}_{d}_{s}")
                model.AddMaxEquality(ha, [x[c, sub, d, s] for sub in hard_subs_for_c])
                hard_at[c, d, s] = ha

    for c in classes:
        for d in days_range:
            for s in slots_range[:-1]:
                if (c, d, s) not in hard_at or (c, d, s + 1) not in hard_at:
                    continue
                ind = model.NewBoolVar(f"e03_{c}_{d}_{s}")
                model.Add(hard_at[c, d, s] + hard_at[c, d, s + 1] - 1 <= ind)
                soft_terms.append(W_E03 * ind)

    # Минимизируем сумму soft-нарушений с весами
    if soft_terms:
        model.Minimize(sum(soft_terms))

    build_time_ms = int((time.time() - t_build_start) * 1000)

    # ─── Solve ─────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = inp.timeLimitSeconds
    if inp.seed > 0:
        solver.parameters.random_seed = inp.seed
    solver.parameters.log_search_progress = False

    t_solve_start = time.time()
    status = solver.Solve(model)
    solve_time_ms = int((time.time() - t_solve_start) * 1000)

    status_name = {
        cp_model.OPTIMAL: "optimal",
        cp_model.FEASIBLE: "feasible",
        cp_model.INFEASIBLE: "infeasible",
        cp_model.MODEL_INVALID: "invalid",
        cp_model.UNKNOWN: "unknown",
    }.get(status, "unknown")

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return GeneratorOutput(
            ok=False,
            summary=GeneratorSummary(
                classesCount=len(classes),
                placedLessons=0,
                status=status_name,
                solveTimeMs=solve_time_ms,
                buildTimeMs=build_time_ms,
                variablesCount=len(x) + len(y),
            ),
            error=f"Solver status: {status_name}. Возможно, ограничения противоречивы.",
        )

    # ─── Извлекаем расписание ─────────────────────────────────
    schedule = {}
    placed = 0
    for c in classes:
        days = []
        for d in days_range:
            day = []
            for s in slots_range:
                if not solver.Value(y[c, d, s]):
                    continue
                # Найти какой предмет здесь
                placed_subj = ""
                for (cls2, sub) in pairs:
                    if cls2 != c:
                        continue
                    if solver.Value(x[c, sub, d, s]):
                        placed_subj = sub
                        break
                day.append(placed_subj)
                if placed_subj:
                    placed += 1
            days.append(day)
        schedule[c] = days

    soft_penalty = int(solver.ObjectiveValue()) if soft_terms else 0

    return GeneratorOutput(
        ok=True,
        schedule=schedule,
        summary=GeneratorSummary(
            classesCount=len(classes),
            placedLessons=placed,
            unplacedLessons=0,
            softPenalty=soft_penalty,
            status=status_name,
            solveTimeMs=solve_time_ms,
            buildTimeMs=build_time_ms,
            variablesCount=len(x) + len(y),
        ),
    )
