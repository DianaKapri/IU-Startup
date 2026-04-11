const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');

// ─── Global crash guards ─────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

const app = express();
const PORT = 5000;
const BACKEND_PORT = 4000;

// ─── Start backend subprocess ────────────────────────────────
let backendProc = null;
let shuttingDown = false;

function startBackend() {
  if (shuttingDown) return;

  backendProc = spawn('node', ['projects/sanpin-audit-ui/app.js'], {
    env: { ...process.env, PORT: String(BACKEND_PORT) },
    stdio: 'inherit',
  });

  backendProc.on('error', (err) => {
    console.error('[Backend] Failed to start:', err.message);
  });

  backendProc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.warn(`[Backend] Exited (code=${code} signal=${signal}). Restarting in 2s…`);
    setTimeout(startBackend, 2000);
  });
}
startBackend();

// ─── Graceful shutdown ────────────────────────────────────────
function shutdown() {
  shuttingDown = true;
  if (backendProc) {
    backendProc.kill('SIGTERM');
  }
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── Expose Supabase public config ───────────────────────────
app.get('/api/client-config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
  });
});

// ─── Proxy /api/* → backend ──────────────────────────────────
app.use(
  '/api',
  createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Backend unavailable', detail: err.message });
        }
      },
    },
  })
);

// ─── Static frontend ─────────────────────────────────────────
app.use(
  express.static(path.join(__dirname, 'projects', 'frontend'), {
    extensions: ['html'],
  })
);

// ─── SPA fallback ────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'projects', 'frontend', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ШколаПлан] Frontend running on http://0.0.0.0:${PORT}`);
});
