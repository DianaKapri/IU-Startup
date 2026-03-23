/* ============================================
   SYNAPSE AI — Landing Page Scripts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ——————————— Навигация — фон при скролле ———————————
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ——————————— Анимации появления (IntersectionObserver) ———————————
  const animatedEls = document.querySelectorAll('[data-animate]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Каскадная задержка для элементов, видимых одновременно
          const siblings = [...entry.target.parentElement.querySelectorAll('[data-animate]')];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 100}ms`;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  animatedEls.forEach((el) => observer.observe(el));

  // ——————————— Анимированный счётчик чисел ———————————
  const counters = document.querySelectorAll('[data-count]');
  let countersDone = false;

  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !countersDone) {
          countersDone = true;
          animateCounters();
          statsObserver.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );

  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) statsObserver.observe(statsSection);

  function animateCounters() {
    counters.forEach((el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const duration = 1800;
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutExpo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        el.textContent = Math.round(ease * target);
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }

  // ——————————— Обработка формы ———————————
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Собираем данные
      const data = Object.fromEntries(new FormData(form));
      console.log('📩 Данные формы:', data);

      // Показываем сообщение об успехе
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Отправляем…</span>';

      // Имитация отправки
      setTimeout(() => {
        submitBtn.style.display = 'none';
        success.classList.add('show');
        form.reset();
      }, 1200);
    });
  }

  // ——————————— Плавный скролл для ссылок ———————————
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      e.preventDefault();
      const target = document.querySelector(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
