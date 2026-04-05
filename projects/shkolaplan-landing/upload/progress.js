// Модуль: frontend
// Задача: US-0401-ST02 (прогресс-бар, загрузка, polling)
// Автор: —
// Описание: Компонент прогресса загрузки. Отправляет файл через XHR (для отслеживания
//           upload progress), показывает прогресс-бар, поллит GET /:id/status до
//           'parsed' или 'error', показывает кнопку перехода к результатам.

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '';

/**
 * Инициализирует блок прогресса + кнопку результатов внутри контейнера.
 *
 * @param {HTMLElement} container — куда рендерить
 * @param {object} callbacks
 * @param {(scheduleId: number) => void} callbacks.onParsed — парсинг завершён
 * @param {(msg: string) => void} callbacks.onError — ошибка загрузки или парсинга
 * @returns {{ uploadFile: (file: File) => void, reset: () => void }}
 */
function initProgress(container, { onParsed, onError }) {
  // ─── Render HTML ────────────────────────────────────────
  container.innerHTML = `
    <div class="progress-wrapper" id="progressWrapper">
      <div class="progress-info">
        <span class="progress-filename" id="progressFilename"></span>
        <span class="progress-percent" id="progressPercent">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-status" id="progressStatus">Загрузка...</div>
    </div>

    <div class="success-msg" id="successMsg">
      <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div>
        <div class="success-text" id="successText">Расписание загружено</div>
        <div class="success-detail" id="successDetail"></div>
      </div>
    </div>

    <button class="btn-results" id="btnResults">Перейти к результатам аудита</button>
  `;

  const wrapper     = container.querySelector('#progressWrapper');
  const filename    = container.querySelector('#progressFilename');
  const percent     = container.querySelector('#progressPercent');
  const fill        = container.querySelector('#progressFill');
  const status      = container.querySelector('#progressStatus');
  const successMsg  = container.querySelector('#successMsg');
  const successText = container.querySelector('#successText');
  const successDet  = container.querySelector('#successDetail');
  const btnResults  = container.querySelector('#btnResults');

  let scheduleId = null;

  // ─── Утилиты ──────────────────────────────────────────
  function formatBytes(b) {
    if (b < 1024) return b + ' Б';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' КБ';
    return (b / 1024 / 1024).toFixed(1) + ' МБ';
  }

  // ─── Загрузка файла через XHR ─────────────────────────
  function uploadFile(file) {
    wrapper.classList.add('visible');
    filename.textContent = file.name;
    percent.textContent = '0%';
    fill.style.width = '0%';
    fill.classList.remove('complete');
    status.textContent = 'Загрузка...';
    successMsg.classList.remove('visible');
    btnResults.classList.remove('visible');

    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      fill.style.width = pct + '%';
      percent.textContent = pct + '%';
      status.textContent = pct < 100
        ? `Загружено ${formatBytes(e.loaded)} из ${formatBytes(e.total)}`
        : 'Обработка файла...';
    });

    xhr.addEventListener('load', () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          scheduleId = res.data.id;
          fill.style.width = '100%';
          fill.classList.add('complete');
          percent.textContent = '100%';
          status.textContent = 'Анализ расписания...';
          pollStatus(scheduleId);
        } else {
          handleError(res.error?.message || 'Ошибка загрузки.');
        }
      } catch {
        handleError('Неожиданный ответ сервера.');
      }
    });

    xhr.addEventListener('error', () => handleError('Ошибка сети. Проверьте подключение.'));
    xhr.addEventListener('abort', () => handleError('Загрузка отменена.'));

    xhr.open('POST', `${API_BASE}/api/schedules/upload`);
    xhr.send(fd);
  }

  // ─── Polling статуса парсинга ─────────────────────────
  function pollStatus(id) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/schedules/${id}/status`);
        const json = await res.json();

        if (!json.success) {
          clearInterval(interval);
          handleError(json.error?.message || 'Ошибка обработки.');
          return;
        }

        const d = json.data;

        if (d.status === 'parsed') {
          clearInterval(interval);
          showSuccess(d.classesCount);
          if (onParsed) onParsed(id);
        } else if (d.status === 'error') {
          clearInterval(interval);
          handleError(d.errorMessage || 'Не удалось распознать расписание.');
        }
        // parsing / uploaded → ждём
      } catch {
        clearInterval(interval);
        handleError('Потеряно соединение с сервером.');
      }
    }, 1500);
  }

  // ─── Успех ────────────────────────────────────────────
  function showSuccess(classesCount) {
    status.textContent = 'Готово!';
    successText.textContent = 'Расписание загружено и распознано';
    successDet.textContent = classesCount ? `Найдено классов: ${classesCount}` : '';
    successMsg.classList.add('visible');
    btnResults.classList.add('visible');
  }

  // ─── Ошибка ───────────────────────────────────────────
  function handleError(msg) {
    wrapper.classList.remove('visible');
    if (onError) onError(msg);
  }

  // ─── Переход к результатам ────────────────────────────
  btnResults.addEventListener('click', () => {
    if (scheduleId) {
      window.location.href = `/audit/${scheduleId}`;
    }
  });

  // ─── Public API ───────────────────────────────────────
  return {
    uploadFile,
    reset() {
      wrapper.classList.remove('visible');
      successMsg.classList.remove('visible');
      btnResults.classList.remove('visible');
      fill.style.width = '0%';
      fill.classList.remove('complete');
      scheduleId = null;
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initProgress };
} else {
  window.initProgress = initProgress;
}
