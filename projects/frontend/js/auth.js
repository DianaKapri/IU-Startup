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

/* ═══ «Я не робот» — упразднено в пользу настоящей капчи ═══
   Раньше здесь была самописная модалка с чекбоксом, которая никакой
   защиты не давала (обходилась `sessionStorage.setItem('_humanOk','1')`).
   Теперь защита перенесена на серверный verifyCaptcha с honeypot+timer+
   арифметикой (см. /js/captcha.js и /api/captcha). Сам requireHuman
   оставлен как no-op для обратной совместимости с местами, где он ещё
   вызывается (account.js, scripts.js, index.html). Эти места можно
   подчищать постепенно — функция просто немедленно вызывает callback. */
function requireHuman(callback) {
  if (typeof callback === 'function') callback();
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
      if (cfg.siteUrl) window._spSiteUrl = cfg.siteUrl;
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

/* Быстрое чтение из кэша localStorage — без сетевых запросов (мгновенно) */
function spGetCachedUser() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session || !session.user) return null;
      var u    = session.user;
      var meta = u.user_metadata || {};
      return {
        id:     u.id,
        email:  u.email,
        name:   meta.name   || u.email || '',
        school: meta.school || '',
        city:   meta.city   || '',
        plan:   meta.plan   || 'free',
        plan_expires_at: null,
        _cached: true,
      };
    });
  });
}

/* Полные данные с бэкенда (план, школа из БД) — используется там, где нужна актуальность */
function spGetCurrentUser() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session || !session.user) return null;
      var u     = session.user;
      var meta  = u.user_metadata || {};
      var token = session.access_token;
      var headers = token ? { 'Authorization': 'Bearer ' + token } : {};
      return fetch('/api/users/me', { headers: headers })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.ok || !data.user) {
            return {
              id:     u.id,
              email:  u.email,
              name:   meta.name   || u.email || '',
              school: meta.school || '',
              city:   meta.city   || '',
              plan:   meta.plan   || 'free',
              plan_expires_at: null,
            };
          }
          var db = data.user;
          return {
            id:     u.id,
            email:  u.email,
            name:   db.name   || meta.name   || u.email || '',
            school: db.school || meta.school || '',
            city:   db.city   || meta.city   || '',
            plan:   db.plan   || meta.plan   || 'free',
            plan_expires_at: db.plan_expires_at || null,
          };
        })
        .catch(function () {
          return {
            id:     u.id,
            email:  u.email,
            name:   meta.name   || u.email || '',
            school: meta.school || '',
            city:   meta.city   || '',
            plan:   meta.plan   || 'free',
            plan_expires_at: null,
          };
        });
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

function spRegister(email, password, captchaFields) {
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
        data: { plan: 'free' },
      },
    }).then(function (res) {
      if (res.error) return { ok: false, error: _translateError(res.error.message) };
      var u = res.data.user;
      var session = res.data.session;
      if (!u) return { ok: false, error: 'Не удалось создать пользователя. Попробуйте ещё раз.' };

      var confirmRequired = !session;
      var resultUser = { id: u.id, email: email, plan: 'free' };

      var profilePromise = session
        ? spEnsureProfile(sb, u).catch(function (e) {
            console.warn('[spRegister] ensureProfile error:', e && e.message);
            return null;
          })
        : Promise.resolve(null);

      /* Тело запроса включает captchaFields, если они переданы.
         Это нужно для проверки middleware verifyCaptcha на /api/auth/register. */
      var backendBody = {
        userId: u.id,
        email: u.email,
        name: '',
        schoolName: '',
        city: '',
      };
      if (captchaFields) {
        backendBody._hp = captchaFields._hp;
        backendBody._captchaToken = captchaFields._captchaToken;
        backendBody._captchaAnswer = captchaFields._captchaAnswer;
      }

      var backendPromise = fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendBody),
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

function spUpdateProfile(name, school, city, email, password) {
  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (userRes) {
      var currentEmail = userRes.data && userRes.data.user && userRes.data.user.email;
      var updates = { data: { name: name, school: school, city: city || '' } };
      if (email && email !== currentEmail) updates.email = email;
      if (password) updates.password = password;
      return sb.auth.updateUser(updates).then(function (res) {
        if (res.error) return { ok: false, error: _translateError(res.error.message) };

        return sb.auth.getSession().then(function (sessRes) {
          var token = sessRes.data && sessRes.data.session && sessRes.data.session.access_token;
          var headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          return fetch('/api/users/me', {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ name: name, school: school, city: city || '' }),
          });
        }).then(function () { return { ok: true }; })
          .catch(function () { return { ok: true }; });
      });
    });
  });
}

function spLogout() {
  return _initSupabase().then(function (sb) {
    return sb.auth.signOut();
  });
}

function spRequestPasswordReset(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Promise.resolve({ ok: false, error: 'Введите корректный email' });
  }
  return _initSupabase().then(function (sb) {
    var base = (window._spSiteUrl && window._spSiteUrl !== '')
      ? window._spSiteUrl.replace(/\/$/, '')
      : location.origin;
    var redirectTo = base + '/reset-password.html';
    return sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirectTo })
      .then(function (res) {
        if (res.error) return { ok: false, error: _translateError(res.error.message) };
        return { ok: true };
      });
  });
}

function spSetNewPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return Promise.resolve({ ok: false, error: 'Пароль должен содержать не менее 6 символов' });
  }
  return _initSupabase().then(function (sb) {
    return sb.auth.updateUser({ password: newPassword }).then(function (res) {
      if (res.error) return { ok: false, error: _translateError(res.error.message) };
      return { ok: true };
    });
  });
}

// Меняет пароль текущего пользователя в Supabase Auth.
// Сначала повторно проверяем текущий пароль (re-auth) — если он неверный,
// возвращаем понятную ошибку и НЕ обновляем пароль.
// После успеха новый пароль сразу действует для последующих входов.
function spChangePassword(currentPassword, newPassword) {
  if (!currentPassword) {
    return Promise.resolve({ ok: false, error: 'Введите текущий пароль' });
  }
  if (!newPassword || newPassword.length < 6) {
    return Promise.resolve({ ok: false, error: 'Новый пароль должен быть не менее 6 символов' });
  }
  if (currentPassword === newPassword) {
    return Promise.resolve({ ok: false, error: 'Новый пароль должен отличаться от текущего' });
  }

  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (res.error || !res.data.user || !res.data.user.email) {
        return { ok: false, error: 'Сессия истекла. Войдите заново.' };
      }
      var email = res.data.user.email;

      return sb.auth.signInWithPassword({ email: email, password: currentPassword })
        .then(function (loginRes) {
          if (loginRes.error) {
            return { ok: false, error: 'Текущий пароль введён неверно' };
          }
          return sb.auth.updateUser({ password: newPassword }).then(function (upd) {
            if (upd.error) return { ok: false, error: _translateError(upd.error.message) };
            return { ok: true };
          });
        });
    });
  });
}

function spRequireAuth(callback) {
  spIsLoggedIn().then(function (loggedIn) {
    if (!loggedIn) {
      window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    } else if (callback) {
      callback();
    }
  }).catch(function (err) {
    console.warn('[spRequireAuth] Auth service unavailable:', err && err.message);
    if (callback) callback();
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

  spGetCachedUser().then(function (user) {
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
