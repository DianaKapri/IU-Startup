const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/auth/register
// Создаёт записи в public.schools и public.users после успешного Supabase signUp.
// Вызывается с фронтенда сразу после supabase.auth.signUp().
router.post('/register', async (req, res) => {
  const { userId, email, name, schoolName, city } = req.body;

  if (!userId || !email || !schoolName) {
    return res.status(400).json({
      ok: false,
      error: 'Обязательные поля: userId, email, schoolName',
    });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Создать запись в schools
    const schoolRes = await client.query(
      `INSERT INTO schools (name, city, mode, shifts)
       VALUES ($1, $2, '5day', 1)
       RETURNING id`,
      [schoolName.trim(), (city || '').trim()]
    );
    const schoolId = schoolRes.rows[0].id;

    // 2. Создать запись в users (id = Supabase Auth UUID)
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, school_id, role, plan)
       VALUES ($1, $2, 'supabase_auth', $3, $4, 'admin', 'free')
       ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email,
             name  = EXCLUDED.name,
             school_id = EXCLUDED.school_id`,
      [userId, email.toLowerCase().trim(), (name || '').trim(), schoolId]
    );

    await client.query('COMMIT');

    return res.status(201).json({ ok: true, schoolId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/auth/register]', err.message);
    return res.status(500).json({ ok: false, error: 'Ошибка при сохранении данных: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
