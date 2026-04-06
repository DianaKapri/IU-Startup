/* ШколаПлан — Authentication utilities
   Хранение пользователей в localStorage (MVP).
   Пароли кодируются через btoa — не для реальной безопасности.
*/

var SP_USER_KEY  = 'shkolaplan_current_user';
var SP_USERS_KEY = 'shkolaplan_users';

function spGetUsers() {
  try { return JSON.parse(localStorage.getItem(SP_USERS_KEY)) || []; }
  catch(e) { return []; }
}

function spSaveUsers(users) {
  localStorage.setItem(SP_USERS_KEY, JSON.stringify(users));
}

function spGetCurrentUser() {
  try { return JSON.parse(localStorage.getItem(SP_USER_KEY)) || null; }
  catch(e) { return null; }
}

function spIsLoggedIn() {
  return !!spGetCurrentUser();
}

function spLogin(email, password) {
  var users = spGetUsers();
  var em = (email || '').toLowerCase().trim();
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === em) { user = users[i]; break; }
  }
  if (!user) return { ok: false, error: 'Пользователь с таким email не найден' };
  if (user.password !== btoa(unescape(encodeURIComponent(password)))) {
    return { ok: false, error: 'Неверный пароль' };
  }
  /* BUG FIX: include plan field so plan badge shows correctly */
  var session = { id: user.id, name: user.name, school: user.school, email: user.email, plan: user.plan || 'trial' };
  localStorage.setItem(SP_USER_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

function spRegister(name, school, email, password) {
  var em = (email || '').toLowerCase().trim();
  if (!name || !name.trim()) return { ok: false, error: 'Введите имя' };
  if (!school || !school.trim()) return { ok: false, error: 'Укажите школу' };
  if (!em) return { ok: false, error: 'Введите email' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { ok: false, error: 'Некорректный email' };
  if (!password || password.length < 6) return { ok: false, error: 'Пароль должен быть не менее 6 символов' };

  var users = spGetUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email === em) return { ok: false, error: 'Этот email уже зарегистрирован' };
  }

  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var user = {
    id: id,
    name: name.trim(),
    school: school.trim(),
    email: em,
    password: btoa(unescape(encodeURIComponent(password))),
    plan: 'trial',
    createdAt: new Date().toISOString()
  };
  users.push(user);
  spSaveUsers(users);

  var session = { id: user.id, name: user.name, school: user.school, email: user.email, plan: user.plan };
  localStorage.setItem(SP_USER_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

function spLogout() {
  localStorage.removeItem(SP_USER_KEY);
}

/* Redirect to login if not authenticated. Returns false if redirecting. */
function spRequireAuth() {
  if (!spIsLoggedIn()) {
    window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    return false;
  }
  return true;
}

/* Redirect to account if already authenticated. Returns false if redirecting. */
function spRequireGuest() {
  if (spIsLoggedIn()) {
    window.location.href = '/account.html';
    return false;
  }
  return true;
}
