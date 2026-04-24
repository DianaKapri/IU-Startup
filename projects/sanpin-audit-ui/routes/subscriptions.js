const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const db = require('../config/database');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@shkolaplan.ru';

// Basic RFC-5322 email format check (does not allow arbitrary strings through).
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

// Escape special HTML characters to prevent injection into email bodies.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// POST /api/subscription-request
router.post('/', async (req, res) => {
  const { organization_name, inn, email, user_id, user_name, user_school } = req.body;

  if (!organization_name || !inn || !email) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Необходимо заполнить все поля.' },
    });
  }

  if (!/^\d{10}(\d{2})?$/.test(inn)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INN', message: 'ИНН должен содержать 10 или 12 цифр.' },
    });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'Некорректный формат email.' },
    });
  }

  // Sanitise user-supplied strings before embedding in HTML email.
  const safeOrgName = escapeHtml(organization_name);
  const safeInn = escapeHtml(inn);
  const safeEmail = escapeHtml(email);

  try {
    const result = await db.query(
      `INSERT INTO subscription_requests
         (organization_name, inn, email, plan, price, status, user_id, user_name, user_school, created_at)
       VALUES ($1, $2, $3, 'school', 14400, 'pending', $4, $5, $6, NOW())
       RETURNING id`,
      [organization_name, inn, email, user_id || null, user_name || null, user_school || null]
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Заявка на подписку ШколаПлан принята',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
          <h2 style="margin-bottom:8px">Заявка принята</h2>
          <p>Ваша заявка на тариф <strong>«Школа»</strong> зарегистрирована.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px 0;color:#555">Организация</td><td style="padding:8px 0"><strong>${safeOrgName}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#555">ИНН</td><td style="padding:8px 0"><strong>${safeInn}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#555">Сумма</td><td style="padding:8px 0"><strong>14 400 ₽/год</strong></td></tr>
          </table>
          <p>Счёт будет выставлен в течение <strong>1 рабочего дня</strong> на адрес <strong>${safeEmail}</strong>.</p>
          <p style="color:#888;font-size:13px">Если у вас есть вопросы — ответьте на это письмо.</p>
          <p style="color:#888;font-size:13px">— Команда ШколаПлан</p>
        </div>
      `,
    });

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error('[Subscriptions] Error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Произошла ошибка. Попробуйте позже.' },
    });
  }
});

module.exports = router;
