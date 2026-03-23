/* ===================================
   CSS VARIABLES & RESET
   =================================== */
:root {
  --bg:        #08090d;
  --bg-card:   #0f1117;
  --bg-card-hover: #161822;
  --surface:   #1a1d2b;
  --border:    #22263a;
  --text:      #e4e6f0;
  --text-dim:  #7a7f9a;
  --accent:    #6c5ce7;
  --accent-2:  #00cec9;
  --accent-glow: rgba(108, 92, 231, .35);
  --gradient:  linear-gradient(135deg, #6c5ce7, #00cec9);
  --font-display: 'Outfit', sans-serif;
  --font-mono:   'Space Mono', monospace;
  --radius:    14px;
  --radius-sm: 8px;
  --max-w:     1140px;
  --ease:      cubic-bezier(.22, 1, .36, 1);
}

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--font-display);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
}

a { color: inherit; text-decoration: none; }
ul { list-style: none; }
img { max-width: 100%; display: block; }

.container {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 0 24px;
}

/* ===================================
   НАВИГАЦИЯ
   =================================== */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  padding: 18px 0;
  transition: background .4s var(--ease), box-shadow .4s var(--ease), padding .4s var(--ease);
}
.navbar.scrolled {
  background: rgba(8, 9, 13, .85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 var(--border);
  padding: 12px 0;
}
.nav-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -.02em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.logo-icon {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.1rem;
}
.logo-ai {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nav-links {
  display: flex;
  gap: 32px;
}
.nav-links a {
  font-size: .9rem;
  color: var(--text-dim);
  transition: color .3s;
  font-weight: 500;
}
.nav-links a:hover { color: var(--text); }

/* ===================================
   HERO
   =================================== */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 80px;
  overflow: hidden;
}

/* Фон — orbs + сетка */
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: .5;
  animation: float 12s ease-in-out infinite;
}
.orb-1 {
  width: 500px; height: 500px;
  background: var(--accent);
  top: -10%; left: -5%;
  animation-delay: 0s;
}
.orb-2 {
  width: 400px; height: 400px;
  background: var(--accent-2);
  bottom: -8%; right: -8%;
  animation-delay: -4s;
}
.orb-3 {
  width: 300px; height: 300px;
  background: #e84393;
  top: 40%; left: 55%;
  opacity: .25;
  animation-delay: -8s;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(30px, -20px) scale(1.05); }
  66%      { transform: translate(-20px, 15px) scale(.97); }
}
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: .25;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 70%);
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 780px;
}

.hero-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: .78rem;
  color: var(--accent-2);
  background: rgba(0, 206, 201, .1);
  border: 1px solid rgba(0, 206, 201, .25);
  padding: 6px 16px;
  border-radius: 100px;
  margin-bottom: 28px;
  letter-spacing: .03em;
}

.hero-title {
  font-size: clamp(2.4rem, 5.5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.03em;
  margin-bottom: 24px;
}
.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.15rem;
  color: var(--text-dim);
  max-width: 560px;
  margin: 0 auto 36px;
  line-height: 1.7;
  font-weight: 400;
}

.hero-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 56px;
}

/* Кнопки */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .95rem;
  padding: 14px 28px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  transition: all .35s var(--ease);
}
.btn-primary {
  background: var(--gradient);
  color: #fff;
  box-shadow: 0 4px 24px var(--accent-glow);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--accent-glow);
}
.btn-arrow {
  transition: transform .3s var(--ease);
}
.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}
.btn-ghost {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
}
.btn-ghost:hover {
  border-color: var(--text-dim);
  color: var(--text);
}
.btn-full {
  width: 100%;
  justify-content: center;
  padding: 16px;
  font-size: 1rem;
  border-radius: var(--radius-sm);
}

/* Статистика */
.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  flex-wrap: wrap;
}
.stat { text-align: center; }
.stat-number {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-suffix {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-label {
  display: block;
  font-size: .78rem;
  color: var(--text-dim);
  margin-top: 2px;
  letter-spacing: .03em;
  text-transform: uppercase;
}
.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border);
}

/* ===================================
   СЕКЦИЯ «КАК ЭТО РАБОТАЕТ»
   =================================== */
.how-section {
  padding: 120px 0;
  position: relative;
}

.section-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: .75rem;
  text-transform: uppercase;
  letter-spacing: .15em;
  color: var(--accent);
  background: rgba(108, 92, 231, .1);
  border: 1px solid rgba(108, 92, 231, .2);
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 20px;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -.03em;
  line-height: 1.15;
  margin-bottom: 14px;
}

.section-subtitle {
  font-size: 1.05rem;
  color: var(--text-dim);
  max-width: 500px;
  margin-bottom: 64px;
}

.steps-grid {
  display: flex;
  align-items: stretch;
  gap: 0;
  justify-content: center;
}

.step-card {
  flex: 1;
  max-width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 36px 30px;
  transition: transform .4s var(--ease), border-color .4s var(--ease), box-shadow .4s var(--ease);
  position: relative;
}
.step-card:hover {
  transform: translateY(-6px);
  border-color: rgba(108, 92, 231, .35);
  box-shadow: 0 16px 48px rgba(108, 92, 231, .1);
}

.step-number {
  font-family: var(--font-mono);
  font-size: .75rem;
  color: var(--accent);
  letter-spacing: .1em;
  margin-bottom: 20px;
}

.step-icon {
  width: 52px;
  height: 52px;
  background: rgba(108, 92, 231, .08);
  border: 1px solid rgba(108, 92, 231, .18);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
  color: var(--accent);
}
.step-icon svg {
  width: 28px;
  height: 28px;
}

.step-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: -.02em;
}

.step-text {
  font-size: .92rem;
  color: var(--text-dim);
  line-height: 1.65;
}

.step-connector {
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: var(--border);
}
.step-connector svg {
  width: 56px;
  height: 24px;
}

/* ===================================
   ФОРМА
   =================================== */
.form-section {
  padding: 100px 0 120px;
}

.form-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: start;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 56px;
  position: relative;
  overflow: hidden;
}
.form-wrapper::before {
  content: '';
  position: absolute;
  width: 350px; height: 350px;
  background: var(--accent);
  border-radius: 50%;
  filter: blur(140px);
  opacity: .12;
  top: -100px; left: -80px;
  pointer-events: none;
}

.form-info { position: relative; }

.form-description {
  font-size: 1.05rem;
  color: var(--text-dim);
  margin-bottom: 32px;
  line-height: 1.7;
}

.form-features {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .95rem;
  color: var(--text-dim);
}
.check-icon {
  width: 22px;
  height: 22px;
  background: rgba(0, 206, 201, .1);
  color: var(--accent-2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .7rem;
  flex-shrink: 0;
}

/* Форма */
.signup-form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
  font-size: .82rem;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: .04em;
  text-transform: uppercase;
}
.form-group input,
.form-group select {
  font-family: var(--font-display);
  font-size: .95rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 13px 16px;
  outline: none;
  transition: border-color .3s, box-shadow .3s;
  -webkit-appearance: none;
}
.form-group input::placeholder { color: var(--text-dim); opacity: .5; }
.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.form-group input.error { border-color: #e74c3c; }
.field-error {
  font-size: .78rem;
  color: #e74c3c;
  min-height: 0;
  transition: min-height .3s;
}
.field-error:not(:empty) { min-height: 18px; }

.form-disclaimer {
  font-size: .78rem;
  color: var(--text-dim);
  text-align: center;
  opacity: .6;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Success state */
.form-success {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
}
.success-icon {
  width: 72px; height: 72px;
  background: var(--gradient);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #fff;
  margin-bottom: 20px;
  animation: scaleIn .5s var(--ease);
}
@keyframes scaleIn {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
.form-success h3 {
  font-size: 1.6rem;
  margin-bottom: 8px;
}
.form-success p {
  color: var(--text-dim);
  font-size: 1rem;
}

/* ===================================
   FOOTER
   =================================== */
.footer {
  border-top: 1px solid var(--border);
  padding: 28px 0;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-copy {
  font-size: .82rem;
  color: var(--text-dim);
}

/* ===================================
   АНИМАЦИИ ВХОДА
   =================================== */
[data-animate] {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .7s var(--ease), transform .7s var(--ease);
}
[data-animate].visible {
  opacity: 1;
  transform: translateY(0);
}
[data-delay="1"] { transition-delay: .1s; }
[data-delay="2"] { transition-delay: .2s; }
[data-delay="3"] { transition-delay: .3s; }
[data-delay="4"] { transition-delay: .4s; }

/* ===================================
   RESPONSIVE
   =================================== */
@media (max-width: 900px) {
  .steps-grid {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .step-connector {
    transform: rotate(90deg);
    padding: 4px 0;
  }
  .step-card { max-width: 100%; }

  .form-wrapper {
    grid-template-columns: 1fr;
    padding: 36px 28px;
    gap: 40px;
  }
}

@media (max-width: 600px) {
  .hero { padding: 100px 20px 60px; }
  .hero-stats { gap: 20px; }
  .stat-divider { display: none; }
  .nav-links { display: none; }
  .form-wrapper { padding: 28px 20px; }
}
