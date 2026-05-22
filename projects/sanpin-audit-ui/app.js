// Модуль: config
// Задача: US-0201
// Автор: —
// Описание: Точка входа Express. Подключение middleware, монтирование роутов.

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
const ALLOWED_ORIGINS = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .concat(['http://localhost:3000', 'http://localhost:5000', 'https://shkolaplan.ru'])
    .filter(Boolean)
);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin) || origin.endsWith('.replit.dev') || origin.endsWith('.repl.co')) {
      return callback(null, true);
    }
    callback(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const requestLogger = require('./middleware/request-logger');  // US-0205
// app.use(requestLogger);

// ─── Root ───────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'ШколаПлан API',
    version: '0.1.0',
    endpoints: {
      health: 'GET /health',
      template: 'GET /api/schedules/template',
      upload: 'POST /api/schedules/upload',
      status: 'GET /api/schedules/:id/status',
    },
  });
});

// ─── Healthcheck ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Pricing ────────────────────────────────────────────────
const pricing = require('./config/pricing');
app.get('/pricing', (_req, res) => {
  res.json({
    school: {
      year: pricing.SCHOOL_PRICE_YEAR,
      month: pricing.SCHOOL_PRICE_MONTH,
    },
  });
});

// ─── Routes ─────────────────────────────────────────────────
const schedulesRouter = require('./routes/schedules');     // EP-04
app.use('/schedules', schedulesRouter);

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

// const auditRouter = require('./routes/audit');            // EP-05 (TODO)
// app.use('/api/audit', auditRouter);

// ─── Генератор расписания (EP-06) ─────────────────────────────
const generatorRouter = require('./routes/generator');
app.use('/generate', generatorRouter);

// const teachersRouter = require('./routes/teachers');      // EP-06 (TODO)
// app.use('/api/teachers', teachersRouter);

// const roomsRouter = require('./routes/rooms');            // EP-06 (TODO)
// app.use('/api/rooms', roomsRouter);

const paymentsRouter = require('./routes/payments');
app.use('/payments', paymentsRouter);

const subscriptionsRouter = require('./routes/subscriptions');
app.use('/subscription-request', subscriptionsRouter);

const adminSubscriptionsRouter = require('./routes/adminSubscriptions');
app.use('/subscription-requests', adminSubscriptionsRouter);

// ─── Капча (anti-bot для регистрации и оплаты) ────────────────
// GET  /api/captcha         → { question, token }
// POST /api/captcha/verify  → { ok: true } если капча пройдена (для предпроверки)
// Также проверяется на /api/auth/register и /api/subscription-request (middleware)
const captchaRouter = require('./routes/captcha');
app.use('/captcha', captchaRouter);

const captchaVerifyRouter = require('./routes/captchaVerify');
app.use('/captcha/verify', captchaVerifyRouter);

// ─── Protected scripts (signed URL для generator-v2.js) ───────
// POST /api/generator-token  → выдать HMAC-токен (требует подписку)
// GET  /api/scripts/generator-v2.js?token=...  → отдать защищённый файл
const protectedScriptsRouter = require('./routes/protectedScripts');
app.use('/', protectedScriptsRouter);

// const dashboardRouter = require('./routes/dashboard');    // EP-07 (TODO)
// app.use('/api/dashboard', dashboardRouter);

// ─── Обработка ошибок ───────────────────────────────────────
// const errorHandler = require('./middleware/error-handler'); // US-0203
// app.use(errorHandler);

app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    data: null,
    error: { code: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера.' },
  });
});

// ─── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[ШколаПлан] API запущен на порту ${PORT}`);
});

module.exports = app;
