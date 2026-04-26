const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const verifySupabaseToken = require('../services/auth/verifySupabaseToken');

// Helpers to mock global fetch and env.
function withEnv(env, fn) {
  const originals = {};
  const keys = Object.keys(env);
  for (const k of keys) {
    originals[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) {
      if (originals[k] === undefined) delete process.env[k];
      else process.env[k] = originals[k];
    }
  });
}

function mockFetch(impl) {
  const original = global.fetch;
  global.fetch = impl;
  return () => {
    global.fetch = original;
  };
}

describe('verifySupabaseToken', () => {
  it('returns null when SUPABASE_URL missing', async () => {
    await withEnv({ SUPABASE_URL: undefined, SUPABASE_KEY: 'k' }, async () => {
      const id = await verifySupabaseToken('any-token');
      assert.equal(id, null);
    });
  });

  it('returns null when SUPABASE_KEY missing', async () => {
    await withEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_KEY: undefined }, async () => {
      const id = await verifySupabaseToken('any-token');
      assert.equal(id, null);
    });
  });

  it('returns null when response is not ok', async () => {
    const restore = mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    try {
      await withEnv({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }, async () => {
        const id = await verifySupabaseToken('t');
        assert.equal(id, null);
      });
    } finally {
      restore();
    }
  });

  it('returns null when response body has no id', async () => {
    const restore = mockFetch(async () => ({ ok: true, json: async () => ({}) }));
    try {
      await withEnv({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }, async () => {
        const id = await verifySupabaseToken('t');
        assert.equal(id, null);
      });
    } finally {
      restore();
    }
  });

  it('returns id on success', async () => {
    const restore = mockFetch(async (url, opts) => {
      assert.equal(url, 'https://x/auth/v1/user');
      assert.equal(opts.headers.apikey, 'k');
      assert.equal(opts.headers.Authorization, 'Bearer my-token');
      return { ok: true, json: async () => ({ id: 'user-uuid-123' }) };
    });
    try {
      await withEnv({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }, async () => {
        const id = await verifySupabaseToken('my-token');
        assert.equal(id, 'user-uuid-123');
      });
    } finally {
      restore();
    }
  });

  it('returns null when fetch throws', async () => {
    const restore = mockFetch(async () => {
      throw new Error('network');
    });
    try {
      await withEnv({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }, async () => {
        const id = await verifySupabaseToken('t');
        assert.equal(id, null);
      });
    } finally {
      restore();
    }
  });

  it('returns null when token is empty', async () => {
    await withEnv({ SUPABASE_URL: 'https://x', SUPABASE_KEY: 'k' }, async () => {
      const id = await verifySupabaseToken('');
      assert.equal(id, null);
    });
  });
});
