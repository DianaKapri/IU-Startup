// Модуль: parser
// Задача: US-0401-ST04, US-0401-ST05
// Автор: —
// Описание: HTTP-эндпоинты расписаний. POST /upload (multipart), GET /:id/status (polling).

const express = require('express');
const router = express.Router();

const db = require('../config/database');
const { uploadSingle, handleUploadErrors } = require('../middleware/upload');
const { runParseInBackground } = require('../services/parser');
// const { authenticate } = require('../middleware/auth');  // EP-03

// ─── POST /api/schedules/upload ─────────────────────────────
// Принимает Excel-файл, сохраняет на диск (multer),
// создаёт запись в БД, запускает парсинг в фоне.

router.post(
  '/upload',
  // authenticate,  // TODO: включить после EP-03
  uploadSingle,
  handleUploadErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'NO_FILE', message: 'Файл не был загружен. Выберите .xlsx или .xls.' },
        });
      }

      const { filename, originalname, size, path: filePath } = req.file;
      const schoolId = req.user?.schoolId || null;
      const userId = req.user?.id || null;

      // ST05: Запись в БД
      const result = await db.query(
        `INSERT INTO schedules
           (school_id, user_id, file_name, original_name, file_path, file_size, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'uploaded', NOW(), NOW())
         RETURNING id, status, created_at`,
        [schoolId, userId, filename, originalname, filePath, size]
      );

      const schedule = result.rows[0];

      // ST06: Фоновый парсинг (не блокирует ответ)
      setImmediate(() => {
        runParseInBackground(schedule.id, filePath, originalname);
      });

      return res.status(201).json({
        success: true,
        data: {
          id: schedule.id,
          fileName: originalname,
          fileSize: size,
          status: 'uploaded',
          createdAt: schedule.created_at,
        },
        error: null,
      });
    } catch (err) {
      console.error('[POST /upload]', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
      });
    }
  }
);

// ─── GET /api/schedules/:id/status ──────────────────────────
// Polling-эндпоинт: фронтенд дёргает каждые 1–2 с после загрузки.

router.get(
  '/:id/status',
  // authenticate,  // TODO: включить после EP-03
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;

      const result = await db.query(
        `SELECT id, status, original_name, classes_count, error_message, created_at, updated_at
         FROM schedules
         WHERE id = $1 AND (user_id = $2 OR $2 IS NULL)`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Расписание не найдено.' },
        });
      }

      const s = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: s.id,
          status: s.status,
          fileName: s.original_name,
          classesCount: s.classes_count,
          errorMessage: s.error_message,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        },
        error: null,
      });
    } catch (err) {
      console.error('[GET /:id/status]', err);
      return res.status(500).json({
        success: false,
        data: null,
        error: { code: 'SERVER_ERROR', message: 'Ошибка сервера.' },
      });
    }
  }
);

module.exports = router;
