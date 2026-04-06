// Модуль: norm-subj
// Задача: US-0404 — нормализация названий предметов.

const SUBJECT_ALIASES = {
  'Русский язык': ['русский язык', 'русский', 'рус яз', 'рус.яз'],
  Литература: ['литература', 'лит-ра', 'литерат'],
  Математика: ['математика', 'матем', 'мат.'],
  Алгебра: ['алгебра', 'алгеб.', 'алг'],
  Геометрия: ['геометрия', 'геом.', 'геом'],
  'Иностранный язык': ['иностранный язык', 'ин яз', 'ин.яз'],
  'Английский язык': ['английский язык', 'англ яз', 'англ.яз'],
  'Немецкий язык': ['немецкий язык', 'нем яз', 'нем.яз'],
  История: ['история', 'ист.', 'истор'],
  Обществознание: ['обществознание', 'общество', 'обществозн.'],
  География: ['география', 'геогр.', 'геогр'],
  Биология: ['биология', 'биол.', 'биол'],
  Физика: ['физика', 'физ.', 'физ'],
  Химия: ['химия', 'хим.', 'хим'],
  Информатика: ['информатика', 'инф.', 'инф'],
  'Физическая культура': ['физическая культура', 'физкультура', 'физ-ра'],
  ОБЖ: ['обж', 'основы безопасности жизнедеятельности', 'о.б.ж'],
  Технология: ['технология', 'техн.', 'труд'],
  Музыка: ['музыка', 'муз.', 'муз'],
  ИЗО: ['изо', 'изобразительное искусство', 'рисование'],
  Астрономия: ['астрономия', 'астрон.', 'астр'],
  'Родной язык': ['родной язык', 'родн яз', 'родной'],
  'Родная литература': ['родная литература', 'родн лит', 'родлит'],
  'Всеобщая история': ['всеобщая история', 'всемирная история', 'всеобщ ист'],
  Право: ['право', 'правоведение', 'основы права'],
  Экономика: ['экономика', 'экон.', 'экон'],
  Черчение: ['черчение', 'черч.', 'черч'],
  'Естествознание': ['естествознание', 'естествозн.', 'естество'],
  ОДНКНР: ['однкнр', 'однк', 'основы духовно-нравственной культуры'],
  МХК: ['мхк', 'мировая художественная культура', 'художественная культура'],
  'Проектная деятельность': ['проектная деятельность', 'проект', 'индивидуальный проект'],
  'Разговоры о важном': ['разговоры о важном', 'ров', 'разг. о важном'],
  'Внеурочная деятельность': ['внеурочная деятельность', 'внеурочка', 'внеур'],
  'Основы программирования': ['основы программирования', 'программирование', 'прогр.'],
  'Финансовая грамотность': ['финансовая грамотность', 'фин. грамотность', 'финграм'],
};

function normalizeToken(raw, removeDots) {
  let s = String(raw ?? '').toLowerCase().trim();
  if (!s) return '';
  s = s.replace(/ё/g, 'е');
  s = s.replace(/[«»"']/g, '');
  if (removeDots) s = s.replace(/\./g, '');
  s = s.replace(/[,:;!?()[\]{}]/g, ' ');
  s = s.replace(/[–—-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

const LOOKUP_WITH_DOTS = new Map();
const LOOKUP_NO_DOTS = new Map();

for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
  const all = [canonical, ...aliases];
  for (const name of all) {
    const keyWithDots = normalizeToken(name, false);
    const keyNoDots = normalizeToken(name, true);
    if (keyWithDots) LOOKUP_WITH_DOTS.set(keyWithDots, canonical);
    if (keyNoDots) LOOKUP_NO_DOTS.set(keyNoDots, canonical);
  }
}

function normalizeSubject(raw) {
  const original = String(raw ?? '').trim();
  if (!original) return { value: '', recognized: true };

  const pass1 = normalizeToken(original, false);
  if (LOOKUP_WITH_DOTS.has(pass1)) {
    return { value: LOOKUP_WITH_DOTS.get(pass1), recognized: true };
  }

  // Двойной проход: второй проход удаляет точки.
  const pass2 = normalizeToken(original, true);
  if (LOOKUP_NO_DOTS.has(pass2)) {
    return { value: LOOKUP_NO_DOTS.get(pass2), recognized: true };
  }

  return { value: original, recognized: false };
}

/**
 * Приводит предметы к каноническому виду.
 * Формат входа/выхода: { [className]: [day1[], day2[], ...] }.
 */
function normSubj(schedule) {
  const out = {};
  const unknown = new Map();

  for (const [className, days] of Object.entries(schedule || {})) {
    out[className] = (days || []).map((lessons) =>
      (lessons || []).map((subject) => {
        const { value, recognized } = normalizeSubject(subject);
        if (!recognized) {
          const key = String(subject).trim();
          if (key) unknown.set(key, (unknown.get(key) || 0) + 1);
        }
        return value;
      })
    );
  }

  if (unknown.size > 0) {
    const list = Array.from(unknown.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
    console.warn(`[Parser] Не распознаны предметы: ${list}`);
  }

  return out;
}

module.exports = { normSubj, normalizeSubject, SUBJECT_ALIASES };
