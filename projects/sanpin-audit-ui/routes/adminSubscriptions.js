// Модуль: routes/adminSubscriptions
// Задача: subscription-activation 2.1 + 2.2
// Автор: —
// Описание: Admin-API для управления заявками на подписку.
//   - GET  /            — список всех заявок (опц. фильтр по ?status=)
//   - PUT  /:id         — смена статуса pending → processed|rejected;
//                         при processed + user_id != NULL активирует пользователя
//                         в рамках одной транзакции (FOR UPDATE + UPDATE users).
//
// Всё защищено `requireAdmin` (shared secret через X-Admin-Token).

'use strict';

const express = require('express');
const db = require('../config/database');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// ─── Константы ──────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_NEW_STATUSES = new Set(['processed', 'rejected']);
const ALLOWED_FILTER_STATUSES = new Set(['pending', 'processed', 'rejected']);

// Все роуты этого роутера требуют admin-токен.
router.use(requireAdmin);

// ─── GET / ─────────────────────────────────────────────────
// Список заявок. Опциональный фильтр по статусу.
router.get('/', async (req, res) => {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;

  try {
    let result;
    if (statusFilter && ALLOWED_FILTER_STATUSES.has(statusFilter)) {
      result = await db.query(
        `SELECT id, organization_name, inn, email, plan, price, status,
                user_id, user_name, user_school, created_at, processed_at
           FROM subscription_requests
          WHERE status = $1
          ORDER BY created_at DESC`,
        [statusFilter]
      );
    } else {
      result = await db.query(
        `SELECT id, organization_name, inn, email, plan, price, status,
                user_id, user_name, user_school, created_at, processed_at
           FROM subscription_requests
          ORDER BY created_at DESC`
      );
    }
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[adminSubscriptions GET /] db error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
    });
  }
});

// ─── PUT /:id ──────────────────────────────────────────────
// Обновление статуса заявки. Транзакционно активирует пользователя при processed.
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  // Валидация id.
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Некорректный идентификатор заявки.' },
    });
  }

  // Валидация нового статуса.
  if (!ALLOWED_NEW_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Недопустимый статус.' },
    });
  }

  let client;
  try {
    client = await db.getClient();
  } catch (err) {
    console.error('[adminSubscriptions PUT /:id] getClient error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
    });
  }

  try {
    await client.query('BEGIN');

    // 1) Блокируем строку.
    const selectResult = await client.query(
      `SELECT id, user_id, status
         FROM subscription_requests
        WHERE id = $1
        FOR UPDATE`,
      [id]
    );

    if (selectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Заявка не найдена.' },
      });
    }

    const row = selectResult.rows[0];
    if (row.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Заявка уже обработана.' },
      });
    }

    // 2) Обновляем заявку.
    await client.query(
      `UPDATE subscription_requests
          SET status = $1, processed_at = NOW()
        WHERE id = $2`,
      [status, id]
    );

    // 3) При processed + user_id — активируем пользователя.
    let userActivated = false;
    let planExpiresAt = null;

    if (status === 'processed' && row.user_id) {
      const userUpdate = await client.query(
        `UPDATE users
            SET plan = 'paid',
                plan_expires_at = NOW() + INTERVAL '1 year'
          WHERE id = $1
          RETURNING plan_expires_at`,
        [row.user_id]
      );
      if (userUpdate.rows.length > 0) {
        userActivated = true;
        planExpiresAt = userUpdate.rows[0].plan_expires_at;
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        id,
        status,
        user_activated: userActivated,
        plan_expires_at: planExpiresAt,
      },
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[adminSubscriptions PUT /:id] rollback failed:', rollbackErr.message);
    }
    console.error('[adminSubscriptions PUT /:id] tx error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
    });
  } finally {
    try { client.release(); } catch (_) { /* noop */ }
  }
});

module.exports = router;
