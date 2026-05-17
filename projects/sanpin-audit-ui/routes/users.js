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

// PATCH /api/users/me — update name, school, city
router.patch('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const userId = await verifySupabaseToken(token);
  if (!userId) return res.status(401).json({ ok: false, error: 'Invalid or expired token' });

  const { name, school, city } = req.body || {};

  try {
    await db.query(`UPDATE users SET name = $1 WHERE id = $2`, [name || '', userId]);

    const userRow = await db.query(`SELECT school_id FROM users WHERE id = $1`, [userId]);
    const existingSchoolId = userRow.rows[0] && userRow.rows[0].school_id;

    if (school) {
      if (existingSchoolId) {
        await db.query(
          `UPDATE schools SET name = $1, city = $2 WHERE id = $3`,
          [school, city || '', existingSchoolId]
        );
      } else {
        const ins = await db.query(
          `INSERT INTO schools (name, city) VALUES ($1, $2) RETURNING id`,
          [school, city || '']
        );
        await db.query(`UPDATE users SET school_id = $1 WHERE id = $2`, [ins.rows[0].id, userId]);
      }
    } else if (existingSchoolId && city !== undefined) {
      await db.query(`UPDATE schools SET city = $1 WHERE id = $2`, [city || '', existingSchoolId]);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/users/me]', err.message);
    return res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
