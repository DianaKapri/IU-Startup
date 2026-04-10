function runGenerator(data) {
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum : [];

  const placements = [];
  const unplaced = [];

  let day = 0;
  let lesson = 0;

  for (const item of curriculum) {
    const weeklyHours = Number(item.weeklyHours) || 0;

    for (let i = 0; i < weeklyHours; i += 1) {
      if (day > 4) {
        unplaced.push({
          classId: item.classId,
          subject: item.subject,
          reason: 'Недостаточно слотов в MVP-генераторе',
        });
        continue;
      }

      placements.push({
        classId: item.classId,
        subject: item.subject,
        day,
        lesson,
      });

      lesson += 1;

      if (lesson > 6) {
        lesson = 0;
        day += 1;
      }
    }
  }

  return {
    ok: true,
    summary: {
      classesCount: classes.length,
      curriculumCount: curriculum.length,
      placedLessons: placements.length,
      unplacedLessons: unplaced.length,
    },
    placements,
    unplaced,
  };
}

module.exports = runGenerator;
