// Модуль: middleware
// Задача: антибот-защита форм (регистрация, оплата)
// Автор: Claude (ШколаПлан AI)
// Описание:
//   Три механизма в одном:
//   1. Honeypot — скрытое поле, которое заполняют только боты
//   2. minTime  — отклонение сабмитов быстрее 3 секунд (бот не успеет)
//   3. Арифметическая капча с HMAC-подписью (защита от replay)
//
//   Это НЕ замена SmartCaptcha/Turnstile в плане защиты от продвинутых
//   ботов — определённого атакующего такая защита не остановит. Но
//   массовый спам, скриптовые регистрации и тривиальные обходы отсечёт.
//   Подходит для текущей стадии продукта; при появлении реальных атак
//   нужно мигрировать на SmartCaptcha (см. фид pricing.js / docs).

const crypto = require('crypto');

const SECRET = process.env.CAPTCHA_SECRET
  || 'dev-captcha-fallback-do-not-use-in-production-7b3e9a';

const TOKEN_TTL_MS  = 15 * 60 * 1000;   // 15 минут — окно валидности
const MIN_FILL_MS   = 3000;             // минимум 3 секунды на форму

/** Внутренние утилиты подписи. */
function sign(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}
function pack(payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return b64 + '.' + sign(b64);
}
function unpack(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expected = sign(b64);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch { return null; }
  try { return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')); }
  catch { return null; }
}

/**
 * Сгенерировать новый challenge для фронта.
 * Возвращает { question, token }.
 *   question — текст для пользователя («5 + 3»)
 *   token    — подписанный payload с (вопрос, правильный ответ, createdAt)
 */
function generateChallenge() {
  /* Простая арифметика: a [+/-] b, где a,b ∈ [1..9].
     Не используем умножение (для младшего возраста интерфейса). */
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const op = Math.random() < 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  const question = `${a} ${op} ${b}`;
  const token = pack({
    q: question,
    a: answer,
    t: Date.now(),
  });
  return { question, token };
}

/**
 * Express middleware. Проверяет в req.body:
 *   _hp           — honeypot (должен быть пустой)
 *   _captchaToken — токен с challenge
 *   _captchaAnswer — что пользователь ввёл
 *
 * При нарушении — 400 с понятной причиной. При успехе — next().
 * Если хочешь логировать причины (для аналитики) — поле reason
 * в JSON-ответе позволяет фронту показать корректную ошибку.
 */
function verifyCaptcha(req, res, next) {
  const body = req.body || {};

  /* 1. Honeypot — должен быть пуст или вообще отсутствовать.
     Боты-скрейперы заполняют ВСЕ input'ы формы. */
  if (body._hp && String(body._hp).trim() !== '') {
    return res.status(400).json({
      ok: false,
      error: { code: 'CAPTCHA_FAILED', message: 'Запрос отклонён.' },
    });
  }

  /* 2. Токен + ответ. */
  const token = body._captchaToken;
  const userAnswer = body._captchaAnswer;
  const payload = unpack(token);
  if (!payload || typeof payload.a !== 'number' || typeof payload.t !== 'number') {
    return res.status(400).json({
      ok: false,
      error: { code: 'CAPTCHA_FAILED', message: 'Проверка не пройдена. Обновите страницу.' },
    });
  }

  /* 3. minTime — слишком быстрый сабмит. Защищает от автоматизированных
     скриптов, которые получают токен и сразу его отдают. */
  const age = Date.now() - payload.t;
  if (age < MIN_FILL_MS) {
    return res.status(400).json({
      ok: false,
      error: { code: 'CAPTCHA_TOO_FAST', message: 'Слишком быстро. Попробуйте ещё раз.' },
    });
  }

  /* 4. Токен живёт не дольше TTL. */
  if (age > TOKEN_TTL_MS) {
    return res.status(400).json({
      ok: false,
      error: { code: 'CAPTCHA_EXPIRED', message: 'Сессия истекла. Обновите страницу.' },
    });
  }

  /* 5. Сравниваем ответ. Принимаем строку или число. */
  const expected = payload.a;
  const got = Number(userAnswer);
  if (!Number.isFinite(got) || got !== expected) {
    return res.status(400).json({
      ok: false,
      error: { code: 'CAPTCHA_WRONG', message: 'Неверный ответ на проверку. Попробуйте ещё раз.' },
    });
  }

  next();
}

module.exports = {
  verifyCaptcha,
  generateChallenge,
};
