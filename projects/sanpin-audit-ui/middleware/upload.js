// Модуль: parser
// Задача: US-0401-ST04
// Автор: —
// Описание: Middleware загрузки файла расписания. Multer: .xlsx/.xls, ≤ 5 МБ, UUID-имя.

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ─── Константы ──────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'schedules');
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Storage ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// ─── File filter ────────────────────────────────────────────
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error('INVALID_FILE_TYPE');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  if (file.mimetype && !ALLOWED_MIMES.includes(file.mimetype)) {
    const err = new Error('INVALID_FILE_TYPE');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  cb(null, true);
}

// ─── Экземпляр multer ───────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// ─── Обработка ошибок multer → JSON ────────────────────────
function handleUploadErrors(err, _req, res, next) {
  if (!err) return next();

  const map = {
    LIMIT_FILE_SIZE: {
      status: 400,
      code: 'FILE_TOO_LARGE',
      message: `Файл слишком большой. Максимум — ${MAX_FILE_SIZE / 1024 / 1024} МБ.`,
    },
    INVALID_FILE_TYPE: {
      status: 400,
      code: 'INVALID_FILE_TYPE',
      message: 'Неподдерживаемый формат. Допустимы только .xlsx и .xls.',
    },
    LIMIT_FILE_COUNT: {
      status: 400,
      code: 'TOO_MANY_FILES',
      message: 'Можно загрузить только один файл.',
    },
    LIMIT_UNEXPECTED_FILE: {
      status: 400,
      code: 'INVALID_FIELD_NAME',
      message: 'Файл должен быть отправлен в поле "file".',
    },
  };

  const mapped = map[err.code];
  if (mapped) {
    return res.status(mapped.status).json({
      success: false,
      data: null,
      error: { code: mapped.code, message: mapped.message },
    });
  }

  console.error('[Upload Error]', err);
  return res.status(500).json({
    success: false,
    data: null,
    error: { code: 'UPLOAD_ERROR', message: 'Ошибка загрузки. Попробуйте ещё раз.' },
  });
}

module.exports = {
  uploadSingle: upload.single('file'),
  handleUploadErrors,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
};
