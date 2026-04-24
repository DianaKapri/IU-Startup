/* ШколаПлан — Authentication via Supabase */

/* ═══ Cooldown utility — prevents rapid repeated actions ═══ */
var _cooldowns = {};
function cooldown(key, ms) {
  if (!ms) ms = 3000;
  var now = Date.now();
  if (_cooldowns[key] && now - _cooldowns[key] < ms) {
    _showCooldownMsg();
    return false;
  }
  _cooldowns[key] = now;
  return true;
}
function _showCooldownMsg() {
  var existing = document.getElementById('cooldownToast');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'cooldownToast';
  el.textContent = 'Подождите немного';
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:10px;font-size:.85rem;font-weight:500;z-index:99999;opacity:0;transition:opacity .3s;font-family:inherit;pointer-events:none;';
  document.body.appendChild(el);
  requestAnimationFrame(function() { el.style.opacity = '1'; });
  setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 300); }, 2000);
}

/* ═══ «Я не робот» — confirmation before heavy actions ═══ */
var _humanVerified = false;
try { _humanVerified = sessionStorage.getItem('_humanOk') === '1'; } catch(e) {}

function requireHuman(callback) {
  if (_humanVerified) { callback(); return; }
  var overlay = document.getElementById('humanCheckOverlay');
  if (overlay) { overlay.style.display = 'flex'; return; }

  overlay = document.createElement('div');
  overlay.id = 'humanCheckOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';

  var box = document.createElement('div');
  box.style.cssText = 'background:#1d1d1f;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px 32px;max-width:340px;width:90%;text-align:center;';

  var title = document.createElement('p');
  title.textContent = 'Подтвердите действие';
  title.style.cssText = 'color:#f5f5f7;font-size:1rem;font-weight:600;margin:0 0 16px;';

  var label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;margin-bottom:16px;transition:border-color .2s;';

  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'humanCheckbox';
  cb.style.cssText = 'width:20px;height:20px;accent-color:#3b82f6;cursor:pointer;flex-shrink:0;';

  var txt = document.createElement('span');
  txt.textContent = 'Я не робот';
  txt.style.cssText = 'color:#f5f5f7;font-size:.9rem;font-weight:500;';

  label.appendChild(cb);
  label.appendChild(txt);

  var btn = document.createElement('button');
  btn.textContent = 'Продолжить';
  btn.style.cssText = 'width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:.88rem;font-weight:600;cursor:pointer;opacity:.4;pointer-events:none;transition:opacity .2s;font-family:inherit;';

  cb.addEventListener('change', function() {
    btn.style.opacity = cb.checked ? '1' : '.4';
    btn.style.pointerEvents = cb.checked ? 'auto' : 'none';
    label.style.borderColor = cb.checked ? '#3b82f6' : 'rgba(255,255,255,.1)';
  });

  btn.addEventListener('click', function() {
    if (!cb.checked) return;
    _humanVerified = true;
    try { sessionStorage.setItem('_humanOk', '1'); } catch(e) {}
    overlay.style.display = 'none';
    callback();
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  box.appendChild(title);
  box.appendChild(label);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  window._humanCallback = callback;
}

function _translateError(msg) {
  if (!msg) return 'Неизвестная ошибка. Попробуйте ещё раз.';
  var m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit') || m.includes('security purposes'))
    return 'Слишком много попыток. Supabase ограничивает отправку писем — подождите несколько минут и попробуйте снова.';
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed'))
    return 'Email не подтверждён. Проверьте почту и перейдите по ссылке в письме.';
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials'))
    return 'Неверный email или пароль.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Этот email уже зарегистрирован. Войдите или восстановите пароль.';
  if (m.includes('password should be at least'))
    return 'Пароль должен содержать не менее 6 символов.';
  if (m.includes('unable to validate email address') || m.includes('email address') || m.includes('email_address_invalid'))
    return 'Некорректный email-адрес.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Ошибка сети. Проверьте подключение к интернету.';
  return msg;
}

var _supabase = null;
var _configPromise = null;

function _initSupabase() {
  if (_supabase) return Promise.resolve(_supabase);
  if (_configPromise) return _configPromise;

  _configPromise = fetch('/api/client-config')
    .then(function (r) {
      if (!r.ok) throw new Error('Сервер вернул ошибку ' + r.status);
      return r.json();
    })
    .then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabaseKey) {
        throw new Error('Supabase не настроен. Обратитесь к администратору.');
      }
      _supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      return _supabase;
    })
    .catch(function(err) {
      _configPromise = null; // allow retry
      throw err;
    });

  return _configPromise;
}

function spGetCurrentUser() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (res.error || !res.data.user) return null;
      var u = res.data.user;
      var meta = u.user_metadata || {};

      return sb.auth.getSession().then(function (sessRes) {
        var token = sessRes.data && sessRes.data.session && sessRes.data.session.access_token;
        var headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        return fetch('/api/users/me', { headers: headers });
      }).then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.ok || !data.user) return null;
          var db = data.user;
          return {
            id: u.id,
            email: u.email,
            name:   db.name,
            school: db.school || '',
            city:   db.city   || '',
            plan:   db.plan   || 'free',
            plan_expires_at: db.plan_expires_at || null,
          };
        })
        .catch(function () { return null; });
    });
  });
}

function spIsLoggedIn() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getSession().then(function (res) {
      return !!(res.data && res.data.session);
    });
  });
}

// Гарантирует наличие записи в public.profiles. Возвращает профиль (новый или существующий).
// Требует, чтобы у sb-клиента была активная сессия — иначе RLS отклонит insert.
function spEnsureProfile(sb, user) {
  return sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
    .then(function (res) {
      if (res.error) {
        console.warn('[spEnsureProfile] select error:', res.error.message);
        return null;
      }
      if (res.data) return res.data;
      return sb.from('profiles').insert({
        id: user.id,
        email: user.email,
        paid: false,
      }).select().maybeSingle().then(function (ins) {
        if (ins.error) {
          console.warn('[spEnsureProfile] insert error:', ins.error.message);
          return null;
        }
        return ins.data;
      });
    });
}

function spLogin(email, password) {
  return _initSupabase().then(function (sb) {
    return sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) return { ok: false, error: _translateError(res.error.message) };
        var u = res.data.user;
        var meta = u.user_metadata || {};
        return spEnsureProfile(sb, u).then(function (profile) {
          return {
            ok: true,
            user: {
              id: u.id,
              email: u.email,
              name: meta.name || u.email,
              school: meta.school || '',
              plan: meta.plan || 'trial',
              paid: profile ? !!profile.paid : false,
            },
          };
        });
      });
  });
}

function spRegister(name, school, city, email, password) {
  if (!name || !name.trim()) return Promise.resolve({ ok: false, error: 'Введите имя' });
  if (!school || !school.trim()) return Promise.resolve({ ok: false, error: 'Укажите название школы' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Promise.resolve({ ok: false, error: 'Некорректный email' });
  }
  if (!password || password.length < 6) {
    return Promise.resolve({ ok: false, error: 'Пароль должен быть не менее 6 символов' });
  }

  return _initSupabase().then(function (sb) {
    return sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: { name: name.trim(), school: school.trim(), city: (city || '').trim(), plan: 'free' },
      },
    }).then(function (res) {
      if (res.error) return { ok: false, error: _translateError(res.error.message) };
      var u = res.data.user;
      var session = res.data.session;
      if (!u) return { ok: false, error: 'Не удалось создать пользователя. Попробуйте ещё раз.' };

      var confirmRequired = !session;
      var resultUser = { id: u.id, email: email, name: name, school: school, plan: 'free' };

      var profilePromise = session
        ? spEnsureProfile(sb, u).catch(function (e) {
            console.warn('[spRegister] ensureProfile error:', e && e.message);
            return null;
          })
        : Promise.resolve(null);

      var backendPromise = fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: u.id,
          email: u.email,
          name: name.trim(),
          schoolName: school.trim(),
          city: (city || '').trim(),
        }),
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.ok) console.warn('[spRegister] backend register error:', data.error);
        })
        .catch(function (err) {
          console.warn('[spRegister] backend register fetch error:', err.message);
        });

      return Promise.all([profilePromise, backendPromise]).then(function () {
        return { ok: true, confirmRequired: confirmRequired, user: resultUser };
      });
    });
  });
}

function spUpdateProfile(name, school, email, password) {
  return _initSupabase().then(function (sb) {
    var updates = { data: { name: name, school: school } };
    if (email) updates.email = email;
    if (password) updates.password = password;
    return sb.auth.updateUser(updates).then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    });
  });
}

function spLogout() {
  return _initSupabase().then(function (sb) {
    return sb.auth.signOut();
  });
}

function spRequireAuth(callback) {
  spIsLoggedIn().then(function (loggedIn) {
    if (!loggedIn) {
      window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    } else if (callback) {
      callback();
    }
  });
}

function spRequireGuest(callback) {
  spIsLoggedIn().then(function (loggedIn) {
    if (loggedIn) {
      window.location.href = '/account.html';
    } else if (callback) {
      callback();
    }
  });
}

function spInitNav() {
  var guestLinks = document.getElementById('navGuestLinks');
  var userLink   = document.getElementById('navUserLink');

  if (guestLinks) guestLinks.style.display = 'none';
  if (userLink)   userLink.style.display   = 'none';

  var loader = document.createElement('div');
  loader.id = 'navLoader';
  loader.style.cssText = 'width:18px;height:18px;border:2px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.55);border-radius:50%;animation:_navSpin .7s linear infinite;flex-shrink:0;';
  var ks = document.createElement('style');
  ks.textContent = '@keyframes _navSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(ks);
  var navRight = guestLinks && guestLinks.parentNode;
  if (navRight) navRight.appendChild(loader);

  spGetCurrentUser().then(function (user) {
    loader.remove();
    var navAvatar = document.getElementById('navAvatar');
    var navName   = document.getElementById('navUserName');
    if (user) {
      if (userLink)   userLink.style.display   = '';
      if (navAvatar)  navAvatar.textContent     = (user.name || 'У').charAt(0).toUpperCase();
      if (navName)    navName.textContent       = user.name;
    } else {
      if (guestLinks) guestLinks.style.display = '';
    }
  });
}
