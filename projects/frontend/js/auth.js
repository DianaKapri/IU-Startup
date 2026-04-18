/* ШколаПлан — Authentication via Supabase */

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
          var db = (data && data.ok && data.user) ? data.user : null;
          return {
            id: u.id,
            email: u.email,
            name:   (db && db.name)   || meta.name   || u.email,
            school: (db && db.school) || meta.school || '',
            city:   (db && db.city)   || meta.city   || '',
            plan:   (db && db.plan)   || meta.plan   || 'trial',
          };
        })
        .catch(function () {
          return {
            id: u.id,
            email: u.email,
            name:   meta.name   || u.email,
            school: meta.school || '',
            city:   meta.city   || '',
            plan:   meta.plan   || 'trial',
          };
        });
    });
  });
}

// Возвращает текущий профиль из public.profiles (создаёт, если нет).
// null — если юзер не залогинен или профиль не удалось получить.
function spGetCurrentProfile() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (res.error || !res.data.user) return null;
      return spEnsureProfile(sb, res.data.user);
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
  spGetCurrentUser().then(function (user) {
    var guestLinks = document.getElementById('navGuestLinks');
    var userLink   = document.getElementById('navUserLink');
    var navAvatar  = document.getElementById('navAvatar');
    var navName    = document.getElementById('navUserName');
    if (user) {
      if (guestLinks) guestLinks.style.display = 'none';
      if (userLink)   userLink.style.display   = '';
      if (navAvatar)  navAvatar.textContent     = (user.name || 'У').charAt(0).toUpperCase();
      if (navName)    navName.textContent       = user.name;
    } else {
      if (guestLinks) guestLinks.style.display = '';
      if (userLink)   userLink.style.display   = 'none';
    }
  });
}
