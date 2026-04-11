const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 5000;

// Start the backend API server in a subprocess
const backendProcess = spawn('node', ['projects/sanpin-audit-ui/app.js'], {
  env: { ...process.env, PORT: '4000' },
  stdio: 'inherit',
});

backendProcess.on('error', (err) => {
  console.error('[Backend] Failed to start:', err.message);
});

backendProcess.on('exit', (code) => {
  console.log(`[Backend] Process exited with code ${code}`);
});

// Proxy /api/* to backend at port 4000
app.use('/api', (req, res) => {
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: `/api${req.url}`,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Backend unavailable' });
  });

  req.pipe(proxyReq, { end: true });
});

// Serve static frontend files from projects/frontend/
app.use(express.static(path.join(__dirname, 'projects', 'frontend'), {
  extensions: ['html'],
}));

// Fallback: serve index.html for unmatched routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'projects', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ШколаПлан] Frontend running on http://0.0.0.0:${PORT}`);
});
