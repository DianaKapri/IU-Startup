'use strict';

// Тонкая обёртка над REST API ЮKassa (v3).
// Не использует сторонний SDK — только встроенный fetch (Node 18+).
//
// Env:
//   YOKASSA_SHOP_ID    — shopId из личного кабинета (тестового) магазина
//   YOKASSA_SECRET_KEY — секретный ключ магазина

const YOKASSA_BASE = 'https://api.yookassa.ru/v3';

function getCredentials() {
  const shopId = process.env.YOKASSA_SHOP_ID;
  const secretKey = process.env.YOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error('YOKASSA_SHOP_ID и YOKASSA_SECRET_KEY должны быть заданы в окружении');
  }
  return { shopId, secretKey };
}

function basicAuth(shopId, secretKey) {
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

function randomIdempotenceKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Создать платёж в ЮKassa.
 *
 * @param {object} opts
 * @param {number}  opts.amount      — сумма в рублях (целое)
 * @param {string}  opts.description — описание платежа (отображается плательщику)
 * @param {string}  opts.returnUrl   — URL для редиректа после оплаты
 * @param {object}  [opts.metadata]  — произвольные поля (сохраняются на стороне ЮKassa)
 *
 * @returns {{ id: string, confirmationUrl: string }}
 */
async function createPayment({ amount, description, returnUrl, metadata = {} }) {
  const { shopId, secretKey } = getCredentials();

  const body = {
    amount: {
      value: String(Number(amount).toFixed(2)),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    capture: true,
    description,
    metadata,
  };

  const response = await fetch(`${YOKASSA_BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(shopId, secretKey),
      'Idempotence-Key': randomIdempotenceKey(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ЮKassa createPayment failed ${response.status}: ${text}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    confirmationUrl: data.confirmation.confirmation_url,
  };
}

/**
 * Получить платёж по id.
 *
 * @param {string} paymentId
 * @returns {object} — сырой объект платежа от ЮKassa
 */
async function getPayment(paymentId) {
  const { shopId, secretKey } = getCredentials();

  const response = await fetch(`${YOKASSA_BASE}/payments/${paymentId}`, {
    headers: { Authorization: basicAuth(shopId, secretKey) },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ЮKassa getPayment failed ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Проверить подпись webhook-уведомления от ЮKassa.
 * ЮKassa подписывает тело запроса HMAC-SHA1 секретным ключом магазина.
 *
 * @param {string} rawBody    — сырое тело запроса (Buffer → string)
 * @param {string} signature  — значение заголовка X-Yoomoney-Signature
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!signature) return false;
  const { secretKey } = getCredentials();

  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha1', secretKey)
    .update(rawBody)
    .digest('hex');

  // timingSafeEqual защищает от timing-атак
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { createPayment, getPayment, verifyWebhookSignature };
