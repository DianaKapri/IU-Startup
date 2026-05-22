/* ШколаПлан — простая встроенная капча (honeypot + minTime + арифметика)
 *
 * Использование:
 *
 *   <!-- В HTML внутри формы: -->
 *   <div data-captcha></div>
 *
 *   <!-- При загрузке страницы: -->
 *   <script src="/js/captcha.js"></script>
 *
 *   // При сабмите формы:
 *   const captchaFields = window.spCaptcha.getFields(formEl);
 *   if (!captchaFields) { /* пользователь не ответил *\/ }
 *   else {
 *     fetch('/api/whatever', {
 *       method: 'POST',
 *       body: JSON.stringify({ ...formData, ...captchaFields }),
 *     });
 *   }
 *
 * Поля, которые spCaptcha.getFields() кладёт в payload:
 *   _hp            — honeypot (всегда пустой; боты заполняют → их режут)
 *   _captchaToken  — HMAC-токен, полученный с /api/captcha
 *   _captchaAnswer — что пользователь ввёл
 *
 * Замечание про honeypot: чтобы боты-парсеры тоже видели поле как
 * привлекательное, имя должно быть «обычным» (website, phone). А чтобы
 * человек его не заполнил — прячем через CSS (не display:none, который
 * боты умеют распознавать, а вынос за viewport).
 */
(function () {
  if (window.spCaptcha) return;  // уже инициализированы

  function ensureWidget(host) {
    if (host.dataset.captchaInitialized === '1') return;
    host.dataset.captchaInitialized = '1';

    host.innerHTML = `
      <div class="sp-captcha">
        <input type="text" class="sp-captcha__hp" name="website" tabindex="-1"
               autocomplete="off" aria-hidden="true"
               style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"/>
        <label class="sp-captcha__row" style="display:flex;align-items:center;gap:10px;margin:14px 0">
          <span class="sp-captcha__q" style="font-size:.9rem;color:#86868b">Проверка: <strong class="sp-captcha__question" style="color:#f5f5f7">…</strong> =</span>
          <input class="sp-captcha__answer" type="text" inputmode="numeric" autocomplete="off"
                 style="width:64px;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#f5f5f7;font-size:.9rem"/>
          <button type="button" class="sp-captcha__refresh" title="Обновить" aria-label="Обновить"
                  style="background:none;border:none;color:#86868b;cursor:pointer;font-size:1.1rem;padding:4px">↻</button>
        </label>
        <input type="hidden" class="sp-captcha__token"/>
        <p class="sp-captcha__err" style="font-size:.78rem;color:#ff6b6b;margin:0;display:none"></p>
      </div>
    `;

    const q = host.querySelector('.sp-captcha__question');
    const tokenInput = host.querySelector('.sp-captcha__token');
    const refresh = host.querySelector('.sp-captcha__refresh');

    function load() {
      q.textContent = '…';
      tokenInput.value = '';
      fetch('/api/captcha', { headers: { 'Cache-Control': 'no-cache' } })
        .then((r) => r.json())
        .then((data) => {
          q.textContent = data.question;
          tokenInput.value = data.token;
        })
        .catch(() => {
          q.textContent = '—';
          showErr('Не удалось загрузить проверку. Попробуйте обновить.');
        });
    }

    refresh.addEventListener('click', () => { clearErr(); load(); });
    load();
  }

  function showErr(msg) {
    document.querySelectorAll('.sp-captcha__err').forEach((el) => {
      el.textContent = msg;
      el.style.display = 'block';
    });
  }
  function clearErr() {
    document.querySelectorAll('.sp-captcha__err').forEach((el) => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }

  /**
   * Достать captcha-поля из формы для отправки на сервер.
   * Если ответ пустой — вернёт null и покажет ошибку.
   *
   * @param {HTMLElement|Document} root — форма или document
   * @returns {object|null} { _hp, _captchaToken, _captchaAnswer }
   */
  function getFields(root) {
    root = root || document;
    const host = root.querySelector('[data-captcha]');
    if (!host) {
      console.warn('[spCaptcha] [data-captcha] не найден в форме');
      return { _hp: '', _captchaToken: '', _captchaAnswer: '' };
    }
    const hp = host.querySelector('.sp-captcha__hp');
    const ans = host.querySelector('.sp-captcha__answer');
    const tok = host.querySelector('.sp-captcha__token');

    if (!ans.value.trim()) {
      ans.focus();
      showErr('Введите ответ на проверку.');
      return null;
    }
    clearErr();
    return {
      _hp: hp ? hp.value : '',
      _captchaToken: tok ? tok.value : '',
      _captchaAnswer: ans.value.trim(),
    };
  }

  /** Обработать ошибку с сервера (показать сообщение, перезагрузить challenge). */
  function handleServerError(err) {
    const code = err && err.code;
    const msg  = (err && err.message) || 'Проверка не пройдена. Попробуйте ещё раз.';
    showErr(msg);

    /* Перезагружаем challenge при истёкших/ошибочных токенах */
    if (code === 'CAPTCHA_EXPIRED' || code === 'CAPTCHA_FAILED' || code === 'CAPTCHA_WRONG') {
      document.querySelectorAll('[data-captcha]').forEach((host) => {
        host.dataset.captchaInitialized = '';
        ensureWidget(host);
      });
    }
  }

  /** Автоинициализация всех виджетов на странице. */
  function initAll() {
    document.querySelectorAll('[data-captcha]').forEach(ensureWidget);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.spCaptcha = { getFields, handleServerError, initAll };
})();
