/* Paywall modal — reusable CTA for paid-only features.
 *
 * Exposes a single global function: window.openPaywall([{ reason }]).
 * Lazily renders its DOM on first call, then reuses the same nodes.
 *
 * Depends on: projects/frontend/css/paywall.css
 */
(function () {
  'use strict';

  var SUBSCRIPTION_URL = '/subscription.html';
  var PLAN_PRICE_LABEL = '12 000 ₽/год';
  var TITLE = 'Функция доступна на тарифе «Школа»';
  var DEFAULT_TEXT = 'Оформите подписку, чтобы получить доступ к составлению расписания и другим премиум-возможностям.';

  var overlayEl = null;
  var modalEl = null;
  var previouslyFocused = null;

  function ensureMounted() {
    if (overlayEl && modalEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'paywall-overlay';
    overlayEl.id = 'paywallOverlay';

    modalEl = document.createElement('div');
    modalEl.className = 'paywall-modal';
    modalEl.id = 'paywallModal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'paywallTitle');
    modalEl.setAttribute('aria-hidden', 'true');

    modalEl.innerHTML =
      '<div class="paywall-modal__header">' +
        '<h2 class="paywall-modal__title" id="paywallTitle"></h2>' +
        '<button type="button" class="paywall-modal__close" aria-label="Закрыть">✕</button>' +
      '</div>' +
      '<div class="paywall-modal__body">' +
        '<p class="paywall-modal__text" id="paywallText"></p>' +
        '<div class="paywall-modal__price">' +
          '<span class="paywall-modal__price-value">12 000 ₽</span>' +
          '<span class="paywall-modal__price-period">/год</span>' +
        '</div>' +
      '</div>' +
      '<div class="paywall-modal__actions">' +
        '<a class="paywall-modal__btn paywall-modal__btn--primary" href="' + SUBSCRIPTION_URL + '" id="paywallCta">Оформить подписку</a>' +
        '<button type="button" class="paywall-modal__btn paywall-modal__btn--ghost" id="paywallCancel">Закрыть</button>' +
      '</div>';

    document.body.appendChild(overlayEl);
    document.body.appendChild(modalEl);

    // Set the title (kept out of innerHTML to avoid quoting pain if it changes).
    var titleEl = modalEl.querySelector('#paywallTitle');
    if (titleEl) titleEl.textContent = TITLE;

    // Wire close interactions.
    overlayEl.addEventListener('click', closePaywall);
    modalEl.querySelector('.paywall-modal__close').addEventListener('click', closePaywall);
    modalEl.querySelector('#paywallCancel').addEventListener('click', closePaywall);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && modalEl.classList.contains('paywall-modal--open')) {
        closePaywall();
      }
    });
  }

  function openPaywall(opts) {
    ensureMounted();

    var reason = (opts && typeof opts.reason === 'string') ? opts.reason : '';
    var textEl = modalEl.querySelector('#paywallText');
    if (textEl) {
      textEl.textContent = reason || DEFAULT_TEXT;
    }

    previouslyFocused = document.activeElement;

    overlayEl.classList.add('paywall-overlay--open');
    modalEl.classList.add('paywall-modal--open');
    modalEl.setAttribute('aria-hidden', 'false');

    // Move focus to primary CTA for keyboard users.
    var cta = modalEl.querySelector('#paywallCta');
    if (cta && typeof cta.focus === 'function') {
      try { cta.focus({ preventScroll: true }); } catch (_) { cta.focus(); }
    }

    // Expose price label for debugging / tests.
    modalEl.dataset.priceLabel = PLAN_PRICE_LABEL;
  }

  function closePaywall() {
    if (!modalEl || !overlayEl) return;
    overlayEl.classList.remove('paywall-overlay--open');
    modalEl.classList.remove('paywall-modal--open');
    modalEl.setAttribute('aria-hidden', 'true');

    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try { previouslyFocused.focus(); } catch (_) { /* ignore */ }
    }
    previouslyFocused = null;
  }

  // Public API.
  window.openPaywall = openPaywall;
  window.closePaywall = closePaywall;
})();
