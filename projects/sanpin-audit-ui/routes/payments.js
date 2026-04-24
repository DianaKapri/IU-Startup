// Модуль: routes/payments
// Задача: payment-flow
// Описание: Webhook-обработчик от ЮKassa.
//
// POST /api/payments/webhook
//   - Принимает уведомление payment.succeeded
//   - Верифицирует подпись (HMAC-SHA1)
//   - Помечает заявку как paid, активирует пользователя, шлёт email

'use strict';

const express = require('express');
const { Resend } = require('resend');
const db = require('../config/database');
const yokassa = require('../services/payment/yokassa');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@shkolaplan.ru';

// Webhook требует сырое тело для проверки подписи.
// express.json() уже примонтирован глобально — нам нужно поймать rawBody.
// Мы используем express.raw + пересобираем тело вручную.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-yoomoney-signature'];
    const rawBody = req.body; // Buffer при express.raw

    // ЮKassa ожидает 200 даже на невалидные запросы, иначе будет повторять.
    // Мы всё равно отвечаем 200, но логируем причину отказа.
    if (!yokassa.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[payments webhook] invalid signature, ignoring');
      return res.status(200).json({ ok: true });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      console.warn('[payments webhook] invalid JSON body');
      return res.status(200).json({ ok: true });
    }

    if (event.event !== 'payment.succeeded') {
      return res.status(200).json({ ok: true });
    }

    const paymentId = event.object?.id;
    if (!paymentId) {
      console.warn('[payments webhook] missing payment id');
      return res.status(200).json({ ok: true });
    }

    let client;
    try {
      client = await db.getClient();
    } catch (err) {
      console.error('[payments webhook] getClient error:', err.message);
      return res.status(200).json({ ok: true });
    }

    try {
      await client.query('BEGIN');

      const selectResult = await client.query(
        `SELECT id, user_id, email, organization_name, price, status, paid_at
           FROM subscription_requests
          WHERE payment_id = $1
          FOR UPDATE`,
        [paymentId]
      );

      if (selectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn('[payments webhook] no request for payment_id:', paymentId);
        return res.status(200).json({ ok: true });
      }

      const row = selectResult.rows[0];

      // Идемпотентность — если уже paid, ничего не делаем.
      if (row.status === 'paid') {
        await client.query('ROLLBACK');
        return res.status(200).json({ ok: true });
      }

      // 1. Пометить заявку как paid.
      await client.query(
        `UPDATE subscription_requests
            SET status = 'paid', paid_at = NOW()
          WHERE id = $1`,
        [row.id]
      );

      // 2. Активировать пользователя (если привязан).
      let planExpiresAt = null;
      if (row.user_id) {
        const userResult = await client.query(
          `UPDATE users
              SET plan = 'paid',
                  plan_expires_at = NOW() + INTERVAL '1 year'
            WHERE id = $1
            RETURNING plan_expires_at`,
          [row.user_id]
        );
        if (userResult.rows.length > 0) {
          planExpiresAt = userResult.rows[0].plan_expires_at;
        }
      }

      await client.query('COMMIT');

      // 3. Отправить email об успешной оплате (вне транзакции).
      if (row.email) {
        const expiresLabel = planExpiresAt
          ? new Date(planExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'на 1 год';
        const accountUrl = `${process.env.FRONTEND_URL || 'https://shkolaplan.ru'}/account.html`;

        resend.emails.send({
          from: FROM_EMAIL,
          to: row.email,
          subject: 'Подписка активирована — ШколаПлан',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
              <h2 style="margin-bottom:8px">Оплата получена</h2>
              <p>Оплата <strong>${(row.price / 100).toLocaleString('ru-RU')} ₽</strong> успешно зачислена.</p>
              <p>Ваша подписка на тариф <strong>«Школа»</strong> активирована до <strong>${expiresLabel}</strong>.</p>
              <p style="margin:24px 0">
                <a href="${accountUrl}"
                   style="background:#0071e3;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                  Перейти в личный кабинет →
                </a>
              </p>
              <p style="color:#888;font-size:13px">Спасибо, что выбрали ШколаПлан!</p>
              <p style="color:#888;font-size:13px">— Команда ШколаПлан</p>
            </div>
          `,
        }).catch(err => {
          console.error('[payments webhook] resend error:', err.message);
        });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[payments webhook] tx error:', err.message);
      return res.status(200).json({ ok: true });
    } finally {
      try { client.release(); } catch (_) {}
    }
  }
);

module.exports = router;
