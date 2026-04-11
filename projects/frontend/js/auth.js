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
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg.supabaseUrl || !cfg.supabaseKey) {
        throw new Error('Supabase config missing');
      }
      _supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      return _supabase;
    });

  return _configPromise;
}

function spGetCurrentUser() {
  return _initSupabase().then(function (sb) {
    return sb.auth.getUser().then(function (res) {
      if (res.error || !res.data.user) return null;
      var u = res.data.user;
      var meta = u.user_metadata || {};
      return {
        id: u.id,
        email: u.email,
        name: meta.name || u.email,
        school: meta.school || '',
        plan: meta.plan || 'trial',
      };
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

function spLogin(email, password) {
  return _initSupabase().then(function (sb) {
    return sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) return { ok: false, error: _translateError(res.error.message) };
        var u = res.data.user;
        var meta = u.user_metadata || {};
        return {
          ok: true,
          user: {
            id: u.id,
            email: u.email,
            name: meta.name || u.email,
            school: meta.school || '',
            plan: meta.plan || 'trial',
          },
        };
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

      // 1. Создаём запись в public.schools
      return sb.from('schools')
        .insert({ name: school.trim(), city: (city || '').trim(), mode: '5day' })
        .select()
        .single()
        .then(function (schoolRes) {
          if (schoolRes.error) {
            console.warn('[spRegister] schools insert error:', schoolRes.error.message);
            // Не блокируем — Supabase Auth уже создан
            return { ok: true, confirmRequired: confirmRequired, user: { id: u.id, email: email, name: name, school: school, plan: 'free' } };
          }

          var schoolId = schoolRes.data.id;

          // 2. Создаём запись в public.users
          return sb.from('users')
            .insert({
              id: u.id,
              email: u.email,
              password_hash: 'supabase_auth',
              name: name.trim(),
              school_id: schoolId,
              role: 'admin',
              plan: 'free',
            })
            .then(function (userRes) {
              if (userRes.error) {
                console.warn('[spRegister] users insert error:', userRes.error.message);
              }
              return {
                ok: true,
                confirmRequired: confirmRequired,
                user: {
                  id: u.id,
                  email: email,
                  name: name,
                  school: school,
                  plan: 'free',
                },
              };
            });
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
