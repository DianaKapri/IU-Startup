// Модуль: routes
// Задача: эндпоинт выдачи captcha-challenge
// Автор: Claude (ШколаПлан AI)
// Описание:
//   GET /api/captcha → { question: "5 + 3", token: "...hmac..." }
//   Фронт показывает question, прячет token в hidden input,
//   при сабмите отправляет вместе с _captchaAnswer.
//   Сервер проверяет всё через middleware verifyCaptcha.

const express = require('express');
const router = express.Router();

const { generateChallenge } = require('../middleware/captcha');

router.get('/', (_req, res) => {
  /* Cache-Control: no-store, чтобы боты не могли переиспользовать один
     challenge между запросами через CDN/прокси. */
  res.set('Cache-Control', 'no-store');
  res.json(generateChallenge());
});

module.exports = router;
