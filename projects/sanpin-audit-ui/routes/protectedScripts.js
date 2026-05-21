// Модуль: routes/protectedScripts
// Задача: signed-URL gate для generator-v2.js
// Автор: Claude (ШколаПлан AI)
// Описание:
//   Файл projects/sanpin-audit-ui/protected/generator-v2.js не отдаётся
//   статикой (он не в /frontend/). Этот роут даёт доступ только пользователям
//   с активной подпиской (plan='paid').
//
//   Поток:
//     1. Клиент: POST /generator-token  (Authorization: Bearer <supabase-jwt>)
//        Middleware requirePlan(['paid']) проверяет подписку.
//        Сервер возвращает HMAC-токен: base64(payload).hmac
//        payload = { userId, exp } (exp = now + 5 минут)
//     2. Клиент: <script src="/scripts/generator-v2.js?token=...">
//        Сервер: проверяет HMAC + exp; читает файл и отдаёт как JS.
//
//   Ограничение: после получения файла он остаётся в кэше браузера, и если
//   подписка позже истечёт, клиент всё ещё сможет использовать v2Generate
//   до перезагрузки страницы. Для security-критичных доменов нужен
//   серверный генератор. Здесь — UX-gate с серверной частью, существенно
//   сильнее текущего "просто положил файл в публичной папке".

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const requirePlan = require('../middleware/requirePlan');

const router = express.Router();

/* HMAC-секрет. В production — из ENV. В dev — фолбэк, чтобы локальная
   разработка не требовала настройки. ENV-ключ генерируется один раз
   командой: openssl rand -hex 32. */
const SECRET = process.env.GENERATOR_TOKEN_SECRET
  || 'dev-fallback-secret-do-not-use-in-production-9f3e2a1b';

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 минут

/** Подписать payload HMAC-SHA256. */
function sign(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

/** Создать токен для userId. */
function issueToken(userId) {
  const payload = { uid: userId, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(payloadB64);
  return payloadB64 + '.' + sig;
}

/** Валидировать токен. Возвращает userId или null. */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  /* Сравнение подписи через timingSafeEqual — защита от timing-attack. */
  const expectedSig = sign(payloadB64);
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
    return null;
  }
  return payload.uid || null;
}

// ─── POST /generator-token ─────────────────────────────────────
// Требует подписку (plan='paid'). Возвращает короткоживущий HMAC-токен.
router.post('/generator-token', requirePlan(['paid']), (req, res) => {
  /* requirePlan гарантирует, что req.user.plan === 'paid' и токен Supabase
     валиден, иначе он бы уже вернул 401/403. */
  const token = issueToken(req.user.id);
  res.json({
    ok: true,
    token: token,
    expires_in: TOKEN_TTL_MS / 1000,
  });
});

// ─── GET /scripts/generator-v2.js ──────────────────────────────
// Отдаёт защищённый файл если токен валиден. Иначе 401.
// Cache-Control: no-store, чтобы браузер не показывал старую версию,
// если подписка изменилась.
router.get('/scripts/generator-v2.js', (req, res) => {
  const token = req.query.token;
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).type('text/plain').send('// Token invalid or expired');
    return;
  }
  const filePath = path.join(__dirname, '..', 'protected', 'generator-v2.js');
  /* fs.createReadStream + правильный Content-Type, чтобы <script> мог
     его выполнить. */
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  fs.createReadStream(filePath)
    .on('error', (err) => {
      console.error('[protectedScripts] file read error:', err.message);
      if (!res.headersSent) {
        res.status(500).type('text/plain').send('// Internal error');
      }
    })
    .pipe(res);
});

module.exports = router;
