// Модуль: middleware
// Задача: subscription-activation 1.2
// Описание: Gate-middleware по тарифному плану пользователя.
//   - Верифицирует Supabase Bearer-токен.
//   - Загружает plan + plan_expires_at из таблицы users.
//   - Для plan='paid' требует plan_expires_at > NOW() (NULL трактуется как истёкший).
//   - Прикрепляет req.user = { id, plan, plan_expires_at } при успехе.

const verifySupabaseToken = require('../services/auth/verifySupabaseToken');
const db = require('../config/database');

/**
 * @param {string[]} allowedPlans - plans that are allowed through this gate.
 *   Defaults to ['paid'].
 * @returns {import('express').RequestHandler}
 */
function requirePlan(allowedPlans = ['paid']) {
  const allowed = Array.isArray(allowedPlans) && allowedPlans.length
    ? allowedPlans
    : ['paid'];

  return async function requirePlanMiddleware(req, res, next) {
    const authHeader = req.headers && req.headers.authorization ? req.headers.authorization : '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        code: 'UNAUTHORIZED',
        error: 'Missing or invalid Authorization header',
      });
    }
    const token = authHeader.slice(7).trim();
    const userId = await verifySupabaseToken(token);
    if (!userId) {
      return res.status(401).json({
        ok: false,
        code: 'UNAUTHORIZED',
        error: 'Invalid or expired token',
      });
    }

    let row;
    try {
      const result = await db.query(
        'SELECT plan, plan_expires_at FROM users WHERE id = $1',
        [userId]
      );
      row = result.rows[0];
    } catch (err) {
      console.error('[requirePlan] db error:', err.message);
      return res.status(500).json({
        ok: false,
        code: 'SERVER_ERROR',
        error: 'Internal server error',
      });
    }

    if (!row) {
      // Token verified against Supabase but user row is missing in our DB.
      // Treat as unauthorized — user is not fully provisioned.
      return res.status(401).json({
        ok: false,
        code: 'UNAUTHORIZED',
        error: 'User not found',
      });
    }

    const { plan: rawPlan, plan_expires_at: planExpiresAt } = row;
    const plan = rawPlan || 'free';

    if (!allowed.includes(plan)) {
      return res.status(403).json({
        ok: false,
        code: 'PLAN_REQUIRED',
        requiredPlans: allowed,
        currentPlan: plan,
      });
    }

    // For paid users always require a non-expired plan_expires_at.
    // NULL is treated as expired (fail-closed).
    if (plan === 'paid') {
      const expiresAtMs = planExpiresAt ? new Date(planExpiresAt).getTime() : NaN;
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        return res.status(403).json({
          ok: false,
          code: 'PLAN_EXPIRED',
          currentPlan: plan,
        });
      }
    }

    req.user = { id: userId, plan, plan_expires_at: planExpiresAt };
    return next();
  };
}

module.exports = requirePlan;
