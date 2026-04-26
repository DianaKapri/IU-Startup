// Модуль: services/auth
// Задача: subscription-activation 1.2
// Описание: Верифицирует access-token Supabase и возвращает userId (uuid) либо null.
// Используется в routes/users.js и middleware/requirePlan.js.

/**
 * Verify a Supabase access token by calling `${SUPABASE_URL}/auth/v1/user`.
 *
 * @param {string} token - bare access token (without "Bearer " prefix)
 * @returns {Promise<string|null>} user id on success, null on any failure
 */
async function verifySupabaseToken(token) {
  if (!token) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? data.id : null;
  } catch {
    return null;
  }
}

module.exports = verifySupabaseToken;
