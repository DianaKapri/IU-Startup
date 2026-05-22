const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const db = require('../config/database');
const yokassa = require('../services/payment/yokassa');
const { verifyCaptcha } = require('../middleware/captcha');

const { SCHOOL_PRICE_YEAR, formatPrice } = require('../config/pricing');

let _resend = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@shkolaplan.ru';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

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
// Защищена капчей (honeypot + minTime + арифметика).
router.post('/', verifyCaptcha, async (req, res) => {
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
       VALUES ($1, $2, $3, 'school', ${SCHOOL_PRICE_YEAR}, 'pending', $4, $5, $6, NOW())
       RETURNING id`,
      [organization_name, inn, email, user_id || null, user_name || null, user_school || null]
    );

    const requestId = result.rows[0].id;

    // Автоматически создаём платёж в ЮKassa
    let paymentId, paymentUrl;
    try {
      const returnUrl = `${process.env.FRONTEND_URL || 'https://shkolaplan.ru'}/account.html`;
      const payment = await yokassa.createPayment({
        amount: SCHOOL_PRICE_YEAR,
        description: `Подписка ШколаПлан — ${organization_name}`,
        returnUrl,
        metadata: { subscription_request_id: requestId },
      });
      paymentId = payment.id;
      paymentUrl = payment.confirmationUrl;
    } catch (err) {
      console.error('[Subscriptions] yokassa error:', err.message);
      // Платёж не создался — заявка остаётся в pending, но пользователю сообщаем об ошибке
      return res.status(502).json({
        success: false,
        error: { code: 'PAYMENT_ERROR', message: 'Не удалось создать платёж. Попробуйте позже.' },
      });
    }

    await db.query(
      `UPDATE subscription_requests
          SET status = 'awaiting_payment',
              processed_at = NOW(),
              payment_id = $1,
              payment_url = $2
        WHERE id = $3`,
      [paymentId, paymentUrl, requestId]
    );

    // Уведомление админу о новой заявке
    if (ADMIN_EMAIL) {
      getResend().emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `Новая заявка — ${organization_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
            <h2 style="margin-bottom:8px">Новая заявка на подписку</h2>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <tr><td style="padding:8px 0;color:#555">Организация</td><td style="padding:8px 0"><strong>${safeOrgName}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#555">ИНН</td><td style="padding:8px 0"><strong>${safeInn}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#555">Email</td><td style="padding:8px 0"><strong>${safeEmail}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#555">Сумма</td><td style="padding:8px 0"><strong>${formatPrice(SCHOOL_PRICE_YEAR)} ₽/год</strong></td></tr>
              <tr><td style="padding:8px 0;color:#555">Статус</td><td style="padding:8px 0"><strong>Ожидает оплаты</strong></td></tr>
            </table>
            <p style="color:#888;font-size:13px">Платёж создан автоматически. Ссылка на оплату отправлена пользователю.</p>
          </div>
        `,
      }).catch(err => console.error('[Subscriptions] resend admin email error:', err.message));
    }

    res.json({ success: true, data: { id: requestId, payment_url: paymentUrl } });
  } catch (err) {
    console.error('[Subscriptions] Error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Произошла ошибка. Попробуйте позже.' },
    });
  }
});

module.exports = router;

