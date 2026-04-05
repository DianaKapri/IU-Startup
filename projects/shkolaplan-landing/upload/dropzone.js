// Модуль: frontend
// Задача: US-0401-ST01, US-0401-ST02, US-0401-ST03
// Автор: —
// Описание: Drag-drop зона загрузки расписания. Рендерит HTML, обрабатывает
//           drag/drop/click, валидирует тип (.xlsx/.xls) и размер (≤ 5 МБ).
//           При успешной валидации вызывает onFileAccepted(file).

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/**
 * Инициализирует зону загрузки внутри контейнера.
 *
 * @param {HTMLElement} container — куда рендерить
 * @param {object} callbacks
 * @param {(file: File) => void} callbacks.onFileAccepted — файл прошёл валидацию
 * @param {(msg: string) => void} callbacks.onError — ошибка валидации
 * @returns {{ setUploading, setSuccess, setError, reset }}
 */
function initDropzone(container, { onFileAccepted, onError }) {
  // ─── Render HTML ────────────────────────────────────────
  container.innerHTML = `
    <div class="drop-zone" id="dropZone">
      <div class="drop-icon">
        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <div class="drop-label">Перетащите файл сюда</div>
      <div class="drop-hint">или нажмите для выбора</div>
      <div class="drop-formats">
        <span class="format-badge">.xlsx</span>
        <span class="format-badge">.xls</span>
        <span class="format-badge">≤ 5 МБ</span>
      </div>
    </div>
    <input type="file" class="file-input" id="fileInput"
           accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" />
    <div class="error-msg" id="errorMsg">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <span id="errorText"></span>
    </div>
  `;

  const dropZone = container.querySelector('#dropZone');
  const fileInput = container.querySelector('#fileInput');
  const errorMsg = container.querySelector('#errorMsg');
  const errorText = container.querySelector('#errorText');

  let errorTimer = null;

  // ─── ST03: Валидация ──────────────────────────────────
  function validate(file) {
    const name = file.name.toLowerCase();
    const ext = name.substring(name.lastIndexOf('.'));

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Неподдерживаемый формат «${ext}». Загрузите .xlsx или .xls.`;
    }

    if (file.type && file.type !== '' && !ALLOWED_MIMES.includes(file.type)) {
      return 'Файл не является таблицей Excel.';
    }

    if (file.size > MAX_SIZE) {
      return `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум — 5 МБ.`;
    }

    if (file.size === 0) {
      return 'Файл пуст. Выберите другой.';
    }

    return null;
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorMsg.classList.add('visible');
    dropZone.classList.add('has-error');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(clearError, 5000);
    if (onError) onError(msg);
  }

  function clearError() {
    errorMsg.classList.remove('visible');
    dropZone.classList.remove('has-error');
  }

  function handleFile(file) {
    clearError();
    const err = validate(file);
    if (err) {
      showError(err);
      return;
    }
    onFileAccepted(file);
  }

  // ─── ST02: Click ──────────────────────────────────────
  dropZone.addEventListener('click', () => {
    if (dropZone.classList.contains('uploading')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  // ─── ST02: Drag & Drop ────────────────────────────────
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  // Предотвратить дефолтный drop на всей странице
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // ─── API для управления состоянием ────────────────────
  return {
    setUploading() {
      clearError();
      dropZone.classList.add('uploading');
    },
    setSuccess() {
      dropZone.classList.remove('uploading');
      dropZone.classList.add('success');
    },
    setError(msg) {
      dropZone.classList.remove('uploading');
      showError(msg);
    },
    reset() {
      clearError();
      dropZone.classList.remove('uploading', 'success', 'drag-over', 'has-error');
      fileInput.value = '';
    },
  };
}

// Для SPA: export; для <script>: глобальный
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initDropzone };
} else {
  window.initDropzone = initDropzone;
}
