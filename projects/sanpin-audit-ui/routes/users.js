const express = require('express');
const router = express.Router();
const db = require('../config/database');
const verifySupabaseToken = require('../services/auth/verifySupabaseToken');

// GET /api/users/me
// Requires: Authorization: Bearer <supabase_access_token>
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const userId = await verifySupabaseToken(token);
  if (!userId) return res.status(401).json({ ok: false, error: 'Invalid or expired token' });

  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.plan, u.plan_expires_at, u.role,
              s.name AS school, s.city
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1`,
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/users/me]', err.message);
    return res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
