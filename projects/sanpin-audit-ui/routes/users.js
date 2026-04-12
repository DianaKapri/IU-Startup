const express = require('express');
const router = express.Router();
const db = require('../config/database');

async function verifySupabaseToken(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? data.id : null;
  } catch {
    return null;
  }
}

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
      `SELECT u.id, u.email, u.name, u.plan, u.role,
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
