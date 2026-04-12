const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/users/me?id=<supabase_uuid>
router.get('/me', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });

  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.plan, u.role,
              s.name AS school, s.city
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/users/me]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
