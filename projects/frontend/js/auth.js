/* ШколаПлан — Authentication via Supabase */

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
        if (res.error) return { ok: false, error: res.error.message };
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

function spRegister(name, school, email, password) {
  if (!name || !name.trim()) return Promise.resolve({ ok: false, error: 'Введите имя' });
  if (!school || !school.trim()) return Promise.resolve({ ok: false, error: 'Укажите школу' });
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
        data: { name: name.trim(), school: school.trim(), plan: 'trial' },
      },
    }).then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      var u = res.data.user;
      var session = res.data.session;
      var meta = (u && u.user_metadata) || {};
      // Email confirmation is required when session is null after signup
      var confirmRequired = !session;
      return {
        ok: true,
        confirmRequired: confirmRequired,
        user: {
          id: u ? u.id : null,
          email: email,
          name: meta.name || name,
          school: meta.school || school,
          plan: 'trial',
        },
      };
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
