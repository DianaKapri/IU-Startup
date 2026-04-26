const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// We need to inject mocks for db and verifySupabaseToken before requiring the
// middleware. Use Module._load override.
function loadRequirePlan({ verifyImpl, dbImpl }) {
  const verifyPath = require.resolve('../services/auth/verifySupabaseToken');
  const dbPath = require.resolve('../config/database');
  const middlewarePath = require.resolve('../middleware/requirePlan');

  // Clear from cache so we can re-require with fresh mocks.
  delete require.cache[middlewarePath];
  delete require.cache[verifyPath];
  delete require.cache[dbPath];

  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (parent && parent.filename === middlewarePath) {
      if (request === '../services/auth/verifySupabaseToken') return verifyImpl;
      if (request === '../config/database') return dbImpl;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(middlewarePath);
  } finally {
    Module._load = originalLoad;
    delete require.cache[middlewarePath];
  }
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function mockReq(auth) {
  return { headers: auth ? { authorization: auth } : {} };
}

describe('requirePlan', () => {
  it('returns 401 when Authorization header missing', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => null,
      dbImpl: { query: async () => ({ rows: [] }) },
    })();
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('returns 401 when Authorization is not Bearer', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => null,
      dbImpl: { query: async () => ({ rows: [] }) },
    })();
    const req = mockReq('Basic abc');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('returns 401 when verifySupabaseToken returns null', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => null,
      dbImpl: { query: async () => ({ rows: [] }) },
    })();
    const req = mockReq('Bearer bad-token');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('returns 404 when user not found in DB', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: { query: async () => ({ rows: [] }) },
    })();
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('returns 403 PLAN_REQUIRED when user.plan not in allowed list', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'free', plan_expires_at: null }] }),
      },
    })(['paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PLAN_REQUIRED');
    assert.deepEqual(res.body.requiredPlans, ['paid']);
    assert.equal(res.body.currentPlan, 'free');
  });

  it('returns 403 PLAN_EXPIRED when paid plan has NULL plan_expires_at', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'paid', plan_expires_at: null }] }),
      },
    })(['paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PLAN_EXPIRED');
  });

  it('returns 403 PLAN_EXPIRED when paid plan_expires_at in the past', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'paid', plan_expires_at: past }] }),
      },
    })(['paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PLAN_EXPIRED');
  });

  it('calls next() and sets req.user when paid plan is active', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'paid', plan_expires_at: future }] }),
      },
    })(['paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 'user-1');
    assert.equal(req.user.plan, 'paid');
    assert.equal(req.user.plan_expires_at, future);
  });

  it('allows free plan when included in allowedPlans (no expiry check)', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-2',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'free', plan_expires_at: null }] }),
      },
    })(['free', 'paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.plan, 'free');
  });

  it('allows trial plan when included in allowedPlans (no expiry check)', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-3',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'trial', plan_expires_at: null }] }),
      },
    })(['trial', 'paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.plan, 'trial');
  });

  it('defaults allowedPlans to ["paid"] when called with no args', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => ({ rows: [{ plan: 'free', plan_expires_at: null }] }),
      },
    })();
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PLAN_REQUIRED');
    assert.deepEqual(res.body.requiredPlans, ['paid']);
  });

  it('returns 500 when db.query throws', async () => {
    const mw = loadRequirePlan({
      verifyImpl: async () => 'user-1',
      dbImpl: {
        query: async () => { throw new Error('db down'); },
      },
    })(['paid']);
    const req = mockReq('Bearer t');
    const res = mockRes();
    await mw(req, res, () => {});
    assert.equal(res.statusCode, 500);
  });
});
