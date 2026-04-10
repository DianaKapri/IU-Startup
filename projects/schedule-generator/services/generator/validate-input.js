function validateInput(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      errors: ['Данные не переданы'],
    };
  }

  if (!Array.isArray(data.classes) || data.classes.length === 0) {
    errors.push('Не заполнены классы');
  }

  if (!Array.isArray(data.teachers) || data.teachers.length === 0) {
    errors.push('Не заполнены учителя');
  }

  if (!Array.isArray(data.rooms) || data.rooms.length === 0) {
    errors.push('Не заполнены кабинеты');
  }

  if (!Array.isArray(data.curriculum) || data.curriculum.length === 0) {
    errors.push('Не заполнен учебный план');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

module.exports = validateInput;
