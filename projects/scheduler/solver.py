from ortools.sat.python import cp_model


def generate_schedule(data):
    model = cp_model.CpModel()

    classes = data.classes
    teachers = data.teachers
    rooms = data.rooms
    days = data.time_grid.days
    periods_per_day = data.time_grid.periods_per_day

    # --- slots ---
    slots = []
    for d_idx, day in enumerate(days):
        for p in range(periods_per_day):
            slots.append((d_idx, p, f"{day}-{p}"))

    # --- subject → teachers ---
    subject_to_teachers = {}
    for school_class in classes:
        for subject in school_class.subjects:
            subject_to_teachers.setdefault(subject, [])
            for teacher in teachers:
                if subject in teacher.subjects:
                    subject_to_teachers[subject].append(teacher)

    # --- subject → rooms ---
    subject_to_rooms = {}
    for school_class in classes:
        for subject in school_class.subjects:
            subject_to_rooms.setdefault(subject, [])
            matching = [r for r in rooms if r.specialization == subject]
            fallback = [r for r in rooms if r.specialization is None]
            subject_to_rooms[subject] = matching if matching else fallback

    # --- variables ---
    x = {}

    for c_idx, school_class in enumerate(classes):
        for subject in school_class.subjects:
            for d_idx, p, slot_key in slots:
                for teacher in subject_to_teachers[subject]:
                    if slot_key in teacher.unavailable_slots:
                        continue
                    for room in subject_to_rooms[subject]:
                        key = (c_idx, subject, d_idx, p, teacher.id, room.id)
                        x[key] = model.NewBoolVar(str(key))

    # =========================
    # HARD CONSTRAINTS
    # =========================

    # 1. 1 урок в слот
    for c_idx, school_class in enumerate(classes):
        for d_idx, p, _ in slots:
            vars_ = [
                var for key, var in x.items()
                if key[0] == c_idx and key[2] == d_idx and key[3] == p
            ]
            model.Add(sum(vars_) <= 1)

    # 2. часы по предмету
    for c_idx, school_class in enumerate(classes):
        for subject, hours in school_class.subjects.items():
            vars_ = [
                var for key, var in x.items()
                if key[0] == c_idx and key[1] == subject
            ]
            model.Add(sum(vars_) == hours)

    # 3. учитель не в двух местах
    for teacher in teachers:
        for d_idx, p, _ in slots:
            vars_ = [
                var for key, var in x.items()
                if key[2] == d_idx and key[3] == p and key[4] == teacher.id
            ]
            if vars_:
                model.Add(sum(vars_) <= 1)

    # 4. кабинет не в двух местах
    for room in rooms:
        for d_idx, p, _ in slots:
            vars_ = [
                var for key, var in x.items()
                if key[2] == d_idx and key[3] == p and key[5] == room.id
            ]
            if vars_:
                model.Add(sum(vars_) <= 1)

    # 5. нагрузка учителя
    for teacher in teachers:
        vars_ = [
            var for key, var in x.items()
            if key[4] == teacher.id
        ]
        if vars_:
            model.Add(sum(vars_) <= teacher.max_hours_per_week)

    # =========================
    # НОВЫЕ ОГРАНИЧЕНИЯ
    # =========================

    # ❗ нельзя один и тот же предмет подряд
    for c_idx, school_class in enumerate(classes):
        for subject in school_class.subjects:
            for d_idx, day in enumerate(days):
                for p in range(periods_per_day - 1):
                    vars_p = [
                        var for key, var in x.items()
                        if key[0] == c_idx and key[1] == subject and key[2] == d_idx and key[3] == p
                    ]
                    vars_next = [
                        var for key, var in x.items()
                        if key[0] == c_idx and key[1] == subject and key[2] == d_idx and key[3] == p + 1
                    ]
                    if vars_p and vars_next:
                        model.Add(sum(vars_p) + sum(vars_next) <= 1)

    # ❗ максимум уроков в день
    MAX_LESSONS_PER_DAY = 6
    for c_idx, school_class in enumerate(classes):
        for d_idx, day in enumerate(days):
            vars_ = [
                var for key, var in x.items()
                if key[0] == c_idx and key[2] == d_idx
            ]
            model.Add(sum(vars_) <= MAX_LESSONS_PER_DAY)

    # ❗ минимум уроков в день
    MIN_LESSONS_PER_DAY = 3
    for c_idx, school_class in enumerate(classes):
        for d_idx, day in enumerate(days):
            vars_ = [
                var for key, var in x.items()
                if key[0] == c_idx and key[2] == d_idx
            ]
            model.Add(sum(vars_) >= MIN_LESSONS_PER_DAY)

    # =========================
    # SOLVE
    # =========================

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10

    result = solver.Solve(model)

    if result not in (cp_model.FEASIBLE, cp_model.OPTIMAL):
        return None

    # =========================
    # OUTPUT
    # =========================

    output = []

    for key, var in x.items():
        if solver.Value(var) == 1:
            c_idx, subject, d_idx, p, teacher_id, room_id = key

            school_class = classes[c_idx]
            teacher = next(t for t in teachers if t.id == teacher_id)
            room = next(r for r in rooms if r.id == room_id)

            output.append({
                "class": school_class.name,
                "subject": subject,
                "day": days[d_idx],
                "period": p,
                "teacher": teacher.name,
                "room": room.name
            })

    # ❗ сортировка
    output.sort(key=lambda x: (x["class"], x["day"], x["period"]))

    return output
