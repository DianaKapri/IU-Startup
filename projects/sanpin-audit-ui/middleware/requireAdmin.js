// Модуль: auth
// Задача: subscription-activation 1.1
// Автор: —
// Описание: Express middleware для защиты admin-роутов shared secret'ом.
// Токен читается из заголовка X-Admin-Token (fallback: Authorization: Bearer <token>)
// и сравнивается с process.env.ADMIN_API_TOKEN через crypto.timingSafeEqual
// (длины паддятся до равных, чтобы не утекал размер токена по таймингу).

const crypto = require('crypto');

// ─── Константы ──────────────────────────────────────────────
const UNAUTHORIZED_RESPONSE = {
  success: false,
  error: { code: 'UNAUTHORIZED', message: 'Доступ запрещён' },
};

// ─── Утилиты ────────────────────────────────────────────────
/**
 * Извлекает admin-токен из запроса.
 * Приоритет: X-Admin-Token, затем Authorization: Bearer <token>.
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractToken(req) {
  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.length > 0) {
    return headerToken;
  }

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice('Bearer '.length).trim();
    if (bearer.length > 0) return bearer;
  }

  return null;
}

/**
 * Константное по времени сравнение двух строк.
 * Буферы паддятся до одинаковой длины, чтобы timingSafeEqual не бросал исключение
 * и чтобы разница длин не утекала по таймингу.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  const len = Math.max(bufA.length, bufB.length);

  const paddedA = Buffer.alloc(len, 0);
  const paddedB = Buffer.alloc(len, 0);
  bufA.copy(paddedA);
  bufB.copy(paddedB);

  const equal = crypto.timingSafeEqual(paddedA, paddedB);
  return equal && bufA.length === bufB.length;
}

// ─── Middleware ─────────────────────────────────────────────
/**
 * Express middleware: пропускает запрос только при валидном admin-токене.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected || typeof expected !== 'string' || expected.length === 0) {
    return res.status(401).json(UNAUTHORIZED_RESPONSE);
  }

  const provided = extractToken(req);
  if (!provided) {
    return res.status(401).json(UNAUTHORIZED_RESPONSE);
  }

  if (!safeCompare(provided, expected)) {
    return res.status(401).json(UNAUTHORIZED_RESPONSE);
  }

  return next();
}

module.exports = requireAdmin;
module.exports.requireAdmin = requireAdmin;
