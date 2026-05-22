// Модуль: routes
// Задача: предпроверка капчи (для двухфазного флоу регистрации)
// Автор: Claude (ШколаПлан AI)
// Описание:
//   POST /api/captcha/verify — валидирует токен+ответ через middleware
//   verifyCaptcha и возвращает { ok: true } если всё хорошо.
//
//   Используется в spRegister на фронте: сначала убеждаемся что
//   капча пройдена, потом запускаем Supabase signUp. Иначе плодим
//   orphan-аккаунты в Supabase auth.users, для которых нет записи
//   в public.users (если основной POST /register падает на капче).

const express = require('express');
const router = express.Router();

const { verifyCaptcha } = require('../middleware/captcha');

router.post('/', verifyCaptcha, (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
