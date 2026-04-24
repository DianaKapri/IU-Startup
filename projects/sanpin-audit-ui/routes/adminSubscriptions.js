// Модуль: routes/adminSubscriptions
// Задача: payment-flow
// Описание: Admin-API для управления заявками на подписку.
//   - GET  /     — список всех заявок (опц. фильтр ?status=)
//   - PUT  /:id  — смена статуса:
//       pending → awaiting_payment : создать платёж ЮKassa, выслать email пользователю
//       pending → rejected         : отклонить
//
// Активация пользователя происходит в routes/payments.js при получении
// webhook payment.succeeded от ЮKassa.
//
// Защита: requireAdmin (X-Admin-Token).

'use strict';

const express = require('express');
const { Resend } = require('resend');
const db = require('../config/database');
const requireAdmin = require('../middleware/requireAdmin');
const yokassa = require('../services/payment/yokassa');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@shkolaplan.ru';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_NEW_STATUSES = new Set(['awaiting_payment', 'rejected']);
const ALLOWED_FILTER_STATUSES = new Set(['pending', 'awaiting_payment', 'paid', 'rejected']);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

router.use(requireAdmin);

// ─── GET / ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;

  try {
    let result;
    if (statusFilter && ALLOWED_FILTER_STATUSES.has(statusFilter)) {
      result = await db.query(
        `SELECT id, organization_name, inn, email, plan, price, status,
                user_id, user_name, user_school, payment_id, payment_url,
                created_at, processed_at, paid_at
           FROM subscription_requests
          WHERE status = $1
          ORDER BY created_at DESC`,
        [statusFilter]
      );
    } else {
      result = await db.query(
        `SELECT id, organization_name, inn, email, plan, price, status,
                user_id, user_name, user_school, payment_id, payment_url,
                created_at, processed_at, paid_at
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
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Некорректный идентификатор заявки.' },
    });
  }

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

    const selectResult = await client.query(
      `SELECT id, user_id, email, organization_name, price, status
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

    if (status === 'awaiting_payment') {
      // Создать платёж в ЮKassa
      let paymentId, paymentUrl;
      try {
        const returnUrl = `${process.env.FRONTEND_URL || 'https://shkolaplan.ru'}/account.html`;
        const payment = await yokassa.createPayment({
          amount: row.price / 100,
          description: `Подписка ШколаПлан — ${escapeHtml(row.organization_name)}`,
          returnUrl,
          metadata: { subscription_request_id: id },
        });
        paymentId = payment.id;
        paymentUrl = payment.confirmationUrl;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[adminSubscriptions PUT /:id] yokassa error:', err.message);
        return res.status(502).json({
          success: false,
          error: { code: 'PAYMENT_ERROR', message: 'Не удалось создать платёж. Попробуйте позже.' },
        });
      }

      await client.query(
        `UPDATE subscription_requests
            SET status = 'awaiting_payment',
                processed_at = NOW(),
                payment_id = $1,
                payment_url = $2
          WHERE id = $3`,
        [paymentId, paymentUrl, id]
      );

      await client.query('COMMIT');

      // Отправить email пользователю со ссылкой на оплату (вне транзакции)
      if (row.email) {
        const safeOrg = escapeHtml(row.organization_name || '');
        const safeUrl = escapeHtml(paymentUrl);
        resend.emails.send({
          from: FROM_EMAIL,
          to: row.email,
          subject: 'Счёт на оплату — ШколаПлан',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
              <h2 style="margin-bottom:8px">Ваша заявка одобрена</h2>
              <p>Организация: <strong>${safeOrg}</strong></p>
              <p>Тариф: <strong>Школа</strong> &mdash; <strong>${(row.price / 100).toLocaleString('ru-RU')} ₽/год</strong></p>
              <p style="margin:24px 0">
                <a href="${safeUrl}"
                   style="background:#0071e3;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                  Оплатить →
                </a>
              </p>
              <p style="color:#888;font-size:13px">Ссылка действительна 24 часа. Если возникнут вопросы — ответьте на это письмо.</p>
              <p style="color:#888;font-size:13px">— Команда ШколаПлан</p>
            </div>
          `,
        }).catch(err => {
          console.error('[adminSubscriptions] resend error:', err.message);
        });
      }

      return res.json({
        success: true,
        data: { id, status: 'awaiting_payment', payment_id: paymentId, payment_url: paymentUrl },
      });
    }

    // status === 'rejected'
    await client.query(
      `UPDATE subscription_requests
          SET status = 'rejected', processed_at = NOW()
        WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return res.json({ success: true, data: { id, status: 'rejected' } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[adminSubscriptions PUT /:id] tx error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
    });
  } finally {
    try { client.release(); } catch (_) {}
  }
});

module.exports = router;
