"""
Proof-of-concept: школьное расписание через CP-SAT (ortools).

Проверяем 4 базовых hard constraint'а и 1 soft (E-01).
Маленькая школа: 3 класса × 3 учителя × 5 дней × 7 слотов.

Цель — оценить сложность переноса нашего CSP в CP-SAT API.
"""
from ortools.sat.python import cp_model
import time

# ─── Входные данные ─────────────────────────────────────────────

# 3 класса, 5 дней, до 7 слотов в день
CLASSES = ["5А", "6А", "7А"]
DAYS    = ["Пн", "Вт", "Ср", "Чт", "Пт"]
SLOTS   = list(range(1, 8))   # 1..7

# Учебный план: (class, subject, weekly_hours, teacher_id, is_hard)
CURRICULUM = [
    # 5А (32 часа)
    ("5А", "Математика",  5, "T1", True),
    ("5А", "Русский",     5, "T2", True),
    ("5А", "Литература",  3, "T2", True),
    ("5А", "Физкультура", 3, "T3", False),
    ("5А", "ИЗО",         1, "T4", False),
    ("5А", "История",     2, "T5", True),
    ("5А", "Биология",    2, "T6", True),
    ("5А", "Английский",  3, "T7", True),
    # 6А (32 часа)
    ("6А", "Математика",  5, "T1", True),
    ("6А", "Русский",     6, "T2", True),
    ("6А", "Литература",  3, "T2", True),
    ("6А", "Физкультура", 3, "T3", False),
    ("6А", "Музыка",      1, "T4", False),
    ("6А", "История",     2, "T5", True),
    ("6А", "География",   1, "T6", True),
    ("6А", "Английский",  3, "T7", True),
    # 7А (33 часа)
    ("7А", "Алгебра",     3, "T1", True),
    ("7А", "Геометрия",   2, "T1", True),
    ("7А", "Русский",     4, "T2", True),
    ("7А", "Литература",  2, "T2", True),
    ("7А", "Физкультура", 3, "T3", False),
    ("7А", "Физика",      2, "T8", True),
    ("7А", "История",     2, "T5", True),
    ("7А", "Биология",    2, "T6", True),
    ("7А", "Английский",  3, "T7", True),
]

# Лимит уроков в день для класса (СанПиН, упрощённо grade>=5 → 7)
PD_LIMIT = 7

# ─── Модель ─────────────────────────────────────────────────────

t0 = time.time()
model = cp_model.CpModel()

# Все уникальные предметы
subjects = list({c[1] for c in CURRICULUM})
sub_idx = {s: i for i, s in enumerate(subjects)}
cls_idx = {c: i for i, c in enumerate(CLASSES)}

# Переменная: x[c, sub, d, s] = 1 если в этой ячейке стоит этот предмет
x = {}
for c in CLASSES:
    for sub in subjects:
        for di in range(len(DAYS)):
            for s in SLOTS:
                x[c, sub, di, s] = model.NewBoolVar(f"x_{c}_{sub}_{di}_{s}")

# y[c, d, s] = 1 если в этой ячейке есть ХОТЬ КАКОЙ-ТО урок (для X-01)
y = {}
for c in CLASSES:
    for di in range(len(DAYS)):
        for s in SLOTS:
            y[c, di, s] = model.NewBoolVar(f"y_{c}_{di}_{s}")
            # y = OR(x по всем subjects)
            model.AddMaxEquality(y[c, di, s], [x[c, sub, di, s] for sub in subjects])

# ─── Hard constraints ────────────────────────────────────────────

# H1. Учебный план: для каждой пары (c, sub) ровно weekly_hours занятий
for cls, sub, hrs, tid, _ in CURRICULUM:
    model.Add(sum(x[cls, sub, di, s] for di in range(len(DAYS)) for s in SLOTS) == hrs)

# Для пар (c, sub) которые не в curriculum → 0 уроков
curriculum_pairs = {(c, sub) for c, sub, _, _, _ in CURRICULUM}
for c in CLASSES:
    for sub in subjects:
        if (c, sub) not in curriculum_pairs:
            for di in range(len(DAYS)):
                for s in SLOTS:
                    model.Add(x[c, sub, di, s] == 0)

# H2. В одной ячейке (c, d, s) — не больше одного предмета
for c in CLASSES:
    for di in range(len(DAYS)):
        for s in SLOTS:
            model.Add(sum(x[c, sub, di, s] for sub in subjects) <= 1)

# H3. C-01: лимит уроков в день для класса
for c in CLASSES:
    for di in range(len(DAYS)):
        model.Add(sum(y[c, di, s] for s in SLOTS) <= PD_LIMIT)

# H4. X-01: нет окон. Если y[d,s+1]=1 то y[d,s]=1 (для s>=1)
for c in CLASSES:
    for di in range(len(DAYS)):
        for s in SLOTS[:-1]:
            # y[c,d,s+1] → y[c,d,s]
            model.Add(y[c, di, s] >= y[c, di, s + 1])

# H5. Конфликты учителей: один tid не в двух классах одновременно
teacher_subjects = {}
for cls, sub, _, tid, _ in CURRICULUM:
    teacher_subjects.setdefault(tid, []).append((cls, sub))

for tid, lessons in teacher_subjects.items():
    for di in range(len(DAYS)):
        for s in SLOTS:
            # сумма всех ячеек этого учителя в (d,s) ≤ 1
            terms = [x[cls, sub, di, s] for cls, sub in lessons]
            if len(terms) > 1:
                model.Add(sum(terms) <= 1)

# ─── Soft constraint: E-01 (сложный не на 1-м/5+ уроке) ──────────

# bad[c, sub, d, s] = 1 если хард-предмет на «плохой» позиции (s == 1 or s >= 5)
hard_subjects = {sub for _, sub, _, _, h in CURRICULUM if h}
bad_position = []
for c in CLASSES:
    for sub in hard_subjects:
        for di in range(len(DAYS)):
            for s in SLOTS:
                if s == 1 or s >= 5:
                    bad_position.append(x[c, sub, di, s])

# Минимизируем число «плохих позиций»
model.Minimize(sum(bad_position))

# ─── Solve ──────────────────────────────────────────────────────

build_time = time.time() - t0
print(f"⏱  Model built in {build_time*1000:.0f} ms")
print(f"   Variables: {len(x) + len(y)}")
print(f"   Curriculum entries: {len(CURRICULUM)}")
print(f"   Hard subjects: {sorted(hard_subjects)}")

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 60.0  # 1 минута лимит
solver.parameters.log_search_progress = False

t1 = time.time()
status = solver.Solve(model)
solve_time = time.time() - t1

status_name = {
    cp_model.OPTIMAL: "OPTIMAL",
    cp_model.FEASIBLE: "FEASIBLE",
    cp_model.INFEASIBLE: "INFEASIBLE",
    cp_model.MODEL_INVALID: "MODEL_INVALID",
    cp_model.UNKNOWN: "UNKNOWN",
}.get(status, "?")

print(f"\n🧮 Solve: {status_name} in {solve_time*1000:.0f} ms")
print(f"   Objective (E-01 violations): {solver.ObjectiveValue() if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 'N/A'}")

if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
    print("❌  Решение не найдено — проверьте ограничения")
    exit(1)

# ─── Печать расписания ────────────────────────────────────────────

print("\n" + "=" * 60)
print("РАСПИСАНИЕ:")
print("=" * 60)

for c in CLASSES:
    print(f"\n  {c}:")
    for di, day in enumerate(DAYS):
        lessons = []
        for s in SLOTS:
            for sub in subjects:
                if solver.Value(x[c, sub, di, s]):
                    lessons.append(f"{s}:{sub[:8]}")
                    break
            else:
                if solver.Value(y[c, di, s]):
                    lessons.append(f"{s}:?")
        print(f"    {day}:  {' · '.join(lessons) if lessons else '(пусто)'}")

# ─── Подсчёт нарушений в финальном расписании ────────────────────

print("\n" + "=" * 60)
print("АУДИТ:")
print("=" * 60)
violations = {"E-01": 0}
for c in CLASSES:
    for di in range(len(DAYS)):
        for s in SLOTS:
            for sub in hard_subjects:
                if solver.Value(x[c, sub, di, s]) and (s == 1 or s >= 5):
                    violations["E-01"] += 1

print(f"  E-01 (сложный не на 2-4 уроке): {violations['E-01']}")
print(f"\n⏱  Total time: {(build_time + solve_time)*1000:.0f} ms")
