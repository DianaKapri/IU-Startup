// Модуль: config
// Задача: US-0201
// Автор: —
// Описание: Точка входа Express. Подключение middleware, монтирование роутов.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ─── Routes ─────────────────────────────────────────────────
const schedulesRouter = require('./routes/schedules');     // EP-04
app.use('/schedules', schedulesRouter);

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// const auditRouter = require('./routes/audit');            // EP-05
// app.use('/api/audit', auditRouter);

// const teachersRouter = require('./routes/teachers');      // EP-06
// app.use('/api/teachers', teachersRouter);

// const roomsRouter = require('./routes/rooms');            // EP-06
// app.use('/api/rooms', roomsRouter);

// const paymentsRouter = require('./routes/payments');      // EP-09
// app.use('/api/payments', paymentsRouter);

// const dashboardRouter = require('./routes/dashboard');    // EP-07
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
