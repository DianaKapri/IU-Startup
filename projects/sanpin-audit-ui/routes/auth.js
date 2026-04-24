const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/database');

// TODO: вернуться к аутентификации через ADMIN_API_TOKEN (X-Admin-Token header),
// когда токен будет корректно прописан в GitHub Secrets и .env на продовом сервере.

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  const len = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(len, 0);
  const paddedB = Buffer.alloc(len, 0);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
}

// POST /api/auth/admin/login
// Проверяет email и пароль администратора из env-переменных.
// Возвращает ADMIN_API_TOKEN для дальнейших запросов к /api/subscription-requests и т.д.
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const token = process.env.ADMIN_API_TOKEN;

  if (!expectedEmail || !expectedPassword || !token) {
    console.error('[POST /api/auth/admin/login] ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_API_TOKEN не заданы в env');
    return res.status(500).json({ success: false, error: 'Сервер не настроен' });
  }

  if (
    !email || !password ||
    !safeCompare(email.toLowerCase().trim(), expectedEmail.toLowerCase().trim()) ||
    !safeCompare(password, expectedPassword)
  ) {
    return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
  }

  return res.json({ success: true, token });
});

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
