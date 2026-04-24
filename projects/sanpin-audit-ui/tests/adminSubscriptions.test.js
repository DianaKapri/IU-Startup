// Модуль: tests
// Задача: subscription-activation 2.1 + 2.2
// Описание: Unit-тесты для admin-роутов /subscription-requests.
//   - GET /  (list + status filter, admin-gated)
//   - PUT /:id (transactional activation, admin-gated)
//
// Стратегия: мокаем `../config/database` и `../middleware/requireAdmin` через
// Module._load override, чтобы не трогать реальную БД и не зависеть от env.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');

const ROUTER_PATH = require.resolve('../routes/adminSubscriptions');
const DB_PATH = require.resolve('../config/database');
const REQUIRE_ADMIN_PATH = require.resolve('../middleware/requireAdmin');

/**
 * Инжектит моки в модуль adminSubscriptions перед его require().
 * @param {{ dbImpl: object, requireAdminImpl?: Function }} opts
 * @returns {import('express').Router}
 */
function loadRouter({ dbImpl, requireAdminImpl }) {
  delete require.cache[ROUTER_PATH];
  delete require.cache[DB_PATH];
  delete require.cache[REQUIRE_ADMIN_PATH];

  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (parent && parent.filename === ROUTER_PATH) {
      if (request === '../config/database') return dbImpl;
      if (request === '../middleware/requireAdmin') {
        return requireAdminImpl || ((_req, _res, next) => next());
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(ROUTER_PATH);
  } finally {
    Module._load = originalLoad;
    delete require.cache[ROUTER_PATH];
  }
}

/**
 * Создаёт мини-Express app с подмонтированным роутером и возвращает http-agent-like
 * функцию для запросов в памяти (без прослушивания порта).
 */
function makeApp(router) {
  const app = express();
  app.use(express.json());
  app.use('/subscription-requests', router);
  return app;
}

/** Минимальный helper для запроса: возвращает { status, body }. */
function request(app, { method, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const http = require('node:http');
      const payload = body ? Buffer.from(JSON.stringify(body)) : null;
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          method,
          path,
          headers: {
            'content-type': 'application/json',
            ...(payload ? { 'content-length': payload.length } : {}),
            ...(headers || {}),
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            server.close();
            const raw = Buffer.concat(chunks).toString('utf8');
            let parsed = null;
            try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

/** Мини-мок pg-клиента для транзакции. Пишет последовательность вызовов в log. */
function makeClient(queryHandlers) {
  const log = [];
  let idx = 0;
  return {
    log,
    client: {
      query: async (text, params) => {
        log.push({ text, params });
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
          return { rows: [] };
        }
        const handler = queryHandlers[idx++];
        if (!handler) throw new Error(`unexpected query #${idx}: ${text}`);
        return handler(text, params);
      },
      release: () => { log.push({ text: 'RELEASE' }); },
    },
  };
}

// ─── GET /subscription-requests ───────────────────────────────────────

describe('GET /subscription-requests', () => {
  it('returns all rows ordered by created_at DESC', async () => {
    const rows = [
      { id: 'r1', status: 'pending' },
      { id: 'r2', status: 'processed' },
    ];
    const calls = [];
    const router = loadRouter({
      dbImpl: {
        query: async (text, params) => {
          calls.push({ text, params });
          return { rows };
        },
      },
    });
    const app = makeApp(router);

    const res = await request(app, { method: 'GET', path: '/subscription-requests' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, rows);
    assert.match(calls[0].text, /ORDER BY created_at DESC/i);
    assert.equal(calls[0].params, undefined);
  });

  it('filters by status when ?status=pending', async () => {
    const calls = [];
    const router = loadRouter({
      dbImpl: {
        query: async (text, params) => {
          calls.push({ text, params });
          return { rows: [{ id: 'r1', status: 'pending' }] };
        },
      },
    });
    const app = makeApp(router);

    const res = await request(app, {
      method: 'GET',
      path: '/subscription-requests?status=pending',
    });

    assert.equal(res.status, 200);
    assert.match(calls[0].text, /WHERE status = \$1/i);
    assert.deepEqual(calls[0].params, ['pending']);
  });

  it('ignores ?status with invalid value (no WHERE clause)', async () => {
    const calls = [];
    const router = loadRouter({
      dbImpl: {
        query: async (text, params) => {
          calls.push({ text, params });
          return { rows: [] };
        },
      },
    });
    const app = makeApp(router);

    const res = await request(app, {
      method: 'GET',
      path: '/subscription-requests?status=hacker',
    });

    assert.equal(res.status, 200);
    assert.ok(!/WHERE status/i.test(calls[0].text));
  });

  it('returns 500 when db.query throws', async () => {
    const router = loadRouter({
      dbImpl: {
        query: async () => { throw new Error('db down'); },
      },
    });
    const app = makeApp(router);

    const res = await request(app, { method: 'GET', path: '/subscription-requests' });
    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SERVER_ERROR');
  });

  it('is protected by requireAdmin middleware', async () => {
    const router = loadRouter({
      dbImpl: { query: async () => ({ rows: [] }) },
      requireAdminImpl: (_req, res, _next) => res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'x' },
      }),
    });
    const app = makeApp(router);
    const res = await request(app, { method: 'GET', path: '/subscription-requests' });
    assert.equal(res.status, 401);
  });
});

// ─── PUT /subscription-requests/:id ───────────────────────────────────

describe('PUT /subscription-requests/:id', () => {
  const VALID_UUID = '11111111-2222-3333-4444-555555555555';

  it('returns 400 INVALID_STATUS when body.status is not allowed', async () => {
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => ({ query: async () => ({ rows: [] }), release() {} }),
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'banana' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_STATUS');
  });

  it('returns 400 when :id is not a UUID', async () => {
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => ({ query: async () => ({ rows: [] }), release() {} }),
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: '/subscription-requests/not-a-uuid',
      body: { status: 'processed' },
    });
    assert.equal(res.status, 400);
  });

  it('returns 404 NOT_FOUND when row does not exist', async () => {
    const { client } = makeClient([
      // SELECT ... FOR UPDATE
      async () => ({ rows: [] }),
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('returns 400 INVALID_STATUS when current status !== pending', async () => {
    const { client } = makeClient([
      async () => ({ rows: [{ id: VALID_UUID, user_id: 'u1', status: 'processed' }] }),
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_STATUS');
  });

  it('activates linked user when status=processed and user_id present', async () => {
    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    const { client, log } = makeClient([
      // SELECT ... FOR UPDATE
      async () => ({ rows: [{ id: VALID_UUID, user_id: 'u1', status: 'pending' }] }),
      // UPDATE subscription_requests
      async () => ({ rowCount: 1 }),
      // UPDATE users (returning plan_expires_at)
      async () => ({ rows: [{ plan_expires_at: future }], rowCount: 1 }),
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);

    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, VALID_UUID);
    assert.equal(res.body.data.status, 'processed');
    assert.equal(res.body.data.user_activated, true);
    assert.equal(res.body.data.plan_expires_at, future);

    const texts = log.map((e) => e.text);
    assert.ok(texts.includes('BEGIN'));
    assert.ok(texts.includes('COMMIT'));
    assert.ok(texts.some((t) => /FOR UPDATE/i.test(t)));
    assert.ok(texts.some((t) => /UPDATE subscription_requests/i.test(t)));
    assert.ok(texts.some((t) => /UPDATE users/i.test(t)));
  });

  it('does not touch users table when status=rejected', async () => {
    const { client, log } = makeClient([
      async () => ({ rows: [{ id: VALID_UUID, user_id: 'u1', status: 'pending' }] }),
      async () => ({ rowCount: 1 }),
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'rejected' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user_activated, false);
    const texts = log.map((e) => e.text);
    assert.ok(!texts.some((t) => /UPDATE users/i.test(t)));
  });

  it('skips user update when user_id IS NULL (returns user_activated=false)', async () => {
    const { client, log } = makeClient([
      async () => ({ rows: [{ id: VALID_UUID, user_id: null, status: 'pending' }] }),
      async () => ({ rowCount: 1 }),
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user_activated, false);
    assert.equal(res.body.data.plan_expires_at, null);
    const texts = log.map((e) => e.text);
    assert.ok(!texts.some((t) => /UPDATE users/i.test(t)));
  });

  it('rolls back on failure and returns 500', async () => {
    const { client, log } = makeClient([
      async () => ({ rows: [{ id: VALID_UUID, user_id: 'u1', status: 'pending' }] }),
      async () => ({ rowCount: 1 }),
      async () => { throw new Error('boom'); },
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    const res = await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'SERVER_ERROR');
    const texts = log.map((e) => e.text);
    assert.ok(texts.includes('ROLLBACK'));
    assert.ok(!texts.includes('COMMIT'));
  });

  it('releases client even when something throws', async () => {
    const { client, log } = makeClient([
      async () => { throw new Error('select failed'); },
    ]);
    const router = loadRouter({
      dbImpl: {
        query: async () => ({ rows: [] }),
        getClient: async () => client,
      },
    });
    const app = makeApp(router);
    await request(app, {
      method: 'PUT',
      path: `/subscription-requests/${VALID_UUID}`,
      body: { status: 'processed' },
    });
    assert.ok(log.some((e) => e.text === 'RELEASE'));
  });
});
