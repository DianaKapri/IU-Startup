document.addEventListener('DOMContentLoaded', () => {

  /* ===== SCROLL REVEAL ===== */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));


  /* ===== NAV THEME (dark on dark sections) ===== */
  const nav = document.getElementById('nav');
  const darkSections = document.querySelectorAll('.hero, .showcase--dark, .form-section, .ribbon');

  function updateNavTheme() {
    const navBottom = nav.getBoundingClientRect().bottom;
    let onDark = false;

    darkSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top < navBottom && rect.bottom > navBottom) {
        onDark = true;
      }
    });

    nav.classList.toggle('nav--dark', onDark);
  }

  window.addEventListener('scroll', updateNavTheme, { passive: true });
  updateNavTheme();


  /* ===== COUNTER ANIMATION ===== */
  let counterFired = false;

  const counterObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !counterFired) {
      counterFired = true;
      animateCounters();
    }
  }, { threshold: 0.3 });

  const ribbon = document.querySelector('.ribbon');
  if (ribbon) counterObserver.observe(ribbon);

  function animateCounters() {
    document.querySelectorAll('.ribbon__number[data-target]').forEach(el => {
      const target = +el.dataset.target;
      const duration = 1800;
      const start = performance.now();

      (function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }


  /* ===== FORM ===== */
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  function setError(id, msg) {
    const span = document.getElementById(id);
    const input = span && span.previousElementSibling;
    if (span) span.textContent = msg;
    if (input) input.classList.toggle('error', !!msg);
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  form.querySelectorAll('.form__input').forEach(input => {
    input.addEventListener('input', () => {
      const err = input.nextElementSibling;
      if (err && err.classList.contains('form__error')) {
        err.textContent = '';
        input.classList.remove('error');
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;

    const name   = form.name.value.trim();
    const school = form.school.value.trim();
    const email  = form.email.value.trim();

    setError('nameError', '');
    setError('schoolError', '');
    setError('emailError', '');

    if (!name)   { setError('nameError', 'Введите имя');   ok = false; }
    if (!school) { setError('schoolError', 'Укажите школу'); ok = false; }
    if (!email)  { setError('emailError', 'Введите email'); ok = false; }
    else if (!isEmail(email)) { setError('emailError', 'Некорректный email'); ok = false; }

    if (!ok) return;

    const btn = form.querySelector('.form__btn');
    btn.disabled = true;
    btn.textContent = 'Отправка…';

    setTimeout(() => {
      form.style.display = 'none';
      document.querySelector('.form-section__left').style.display = 'none';
      success.classList.add('active');
    }, 900);
  });

});
