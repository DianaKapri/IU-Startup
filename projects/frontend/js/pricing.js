(function () {
  'use strict';

  var FALLBACK = { school: { year: 29000, month: 2400 } };

  function fmt(n) {
    return n.toLocaleString('ru-RU');
  }

  function apply(data) {
    var s = data.school;

    document.querySelectorAll('[data-price="school-year"]').forEach(function (el) {
      el.textContent = fmt(s.year);
    });
    document.querySelectorAll('[data-price="school-year-label"]').forEach(function (el) {
      el.textContent = fmt(s.year) + ' ₽/год';
    });
    document.querySelectorAll('[data-price="school-month-note"]').forEach(function (el) {
      el.textContent = 'в год · ' + fmt(s.month) + ' ₽/месяц';
    });
    document.querySelectorAll('[data-price="school-modal"]').forEach(function (el) {
      el.textContent = 'Тариф «Школа» — ' + fmt(s.year) + ' ₽/год';
    });

    window.__spPricing = s;
  }

  apply(FALLBACK);

  fetch('/api/pricing')
    .then(function (r) { return r.json(); })
    .then(apply)
    .catch(function () {});
})();
