# Структура проекта ШколаПлан в Git

Шпаргалка к защите. Где что лежит, по какому принципу разложено, какие
ключевые файлы стоит назвать при вопросах.

Репозиторий: **`github.com/DianaKapri/IU-Startup`**, основная ветка `main`.

---

## Корень репозитория

```
IU-Startup/
├── server.js              ← главный сервер (port 5000)
├── package.json           ← зависимости главного сервера
├── docker-compose.yml     ← оркестрация (frontend + backend + CP-SAT)
├── Dockerfile             ← Docker-образ для деплоя
├── Caddyfile              ← reverse-proxy + HTTPS (на проде)
├── replit.md / CLAUDE.md  ← инструкции для AI-инструментов разработки
├── README.md / CHANGELOG  ← общая документация
│
├── projects/              ← основной код приложения
├── cp-sat-solver/         ← Python-сервис генерации расписаний (OR-Tools)
├── assets/                ← статические ассеты репо (логотипы, иконки)
├── docs/                  ← техническая документация
├── notes/                 ← внутренние заметки команды
├── prompts/               ← наработки промптов для AI-задач
└── attached_assets/       ← вложения, скриншоты для документации
```

`server.js` в корне — точка входа. Он слушает порт 5000, отдаёт фронтенд
статикой через `express.static('projects/frontend')` и проксирует все
запросы `/api/*` на бэкенд (порт 4000). То есть когда браузер делает
запрос `/api/captcha`, реально его обрабатывает бэкенд, но клиент об
этом не знает — для него всё с одного домена.

---

## projects/ — основной код

Три подсистемы:

```
projects/
├── frontend/              ← клиентская часть (HTML/CSS/JS, без билда)
├── sanpin-audit-ui/       ← бэкенд на Node.js/Express (port 4000)
└── services/              ← общие вспомогательные сервисы
```

Принципиальное разделение фронта и бэка — фронт работает в браузере
пользователя, бэк работает на сервере. Они общаются только через HTTP
по `/api/*`. Никакого SSR/Next.js — простой статический сайт + REST API.

---

## projects/frontend/ — клиент

```
frontend/
├── index.html             ← главная страница (лендинг)
├── login.html             ← вход и регистрация
├── account.html           ← личный кабинет (главная страница после входа)
├── subscription.html      ← страница оплаты подписки
├── audit-view.html        ← страница просмотра одного аудита из истории
├── demo.html              ← демонстрационный аудит (без регистрации)
├── compare.html           ← сравнение двух расписаний
├── wizard.html            ← старый wizard составления расписания
├── generator.html         ← старый генератор расписаний
├── reset-password.html    ← восстановление пароля
├── onboarding.html        ← первый вход после регистрации
├── contacts.html          ← контактная страница
├── admin.html / admin-login.html ← админ-панель управления заявками
├── schedule.html          ← рендер расписания
│
├── js/                    ← JavaScript-модули
│   ├── auth.js            ← вход/регистрация через Supabase, профиль
│   ├── account.js         ← логика личного кабинета
│   ├── engine.js          ← движок аудита СанПиН (23 проверки, scoring)
│   ├── scripts.js         ← общие утилиты + старый wizard
│   ├── pricing.js         ← загрузка цен с /api/pricing
│   ├── paywall.js         ← модалка «купите подписку»
│   └── captcha.js         ← виджет встроенной капчи
│
├── css/                   ← стили (без препроцессора)
│   ├── styles.css         ← глобальные стили + компоненты лендинга
│   ├── account.css        ← стили ЛК
│   ├── account-cards.css  ← карточки на старт-экране ЛК
│   ├── demo.css           ← стили демо-страницы
│   ├── paywall.css        ← модалка paywall
│   └── subscription.css   ← страница оплаты
│
└── assets/                ← картинки, шрифты, шаблоны xlsx
    ├── shablon-raspisaniya.xlsx   ← шаблон для аудита (3 листа)
    └── generator-template.xlsx     ← шаблон для составления расписания
```

**Принципы организации фронта:**

- HTML-страниц много, потому что архитектура многостраничная (MPA),
  а не SPA. Каждая страница — отдельный entry-point.
- JS подключается тегами `<script src=...>` напрямую, без сборки.
- `engine.js` — самый большой файл во фронте, в нём вся логика аудита
  СанПиН: правила C-01..C-03, E-01..E-03, X-01, scoring 0–100,
  рендеринг тепловой карты.
- `auth.js` — обёртка над Supabase JS SDK с локализацией ошибок.

---

## projects/sanpin-audit-ui/ — бэкенд

```
sanpin-audit-ui/
├── app.js                 ← точка входа Express (port 4000)
├── package.json           ← зависимости бэкенда
│
├── routes/                ← обработчики HTTP-эндпоинтов
│   ├── auth.js            ← POST /api/auth/register (+ admin login)
│   ├── users.js           ← GET /api/users/me (профиль с планом)
│   ├── schedules.js       ← CRUD расписаний в БД
│   ├── generator.js       ← POST /api/generate (старый CP-SAT генератор)
│   ├── subscriptions.js   ← POST /api/subscription-request (оплата)
│   ├── payments.js        ← webhook YooKassa
│   ├── adminSubscriptions.js ← админка заявок
│   ├── captcha.js         ← GET /api/captcha (выдача challenge)
│   ├── captchaVerify.js   ← POST /api/captcha/verify (предпроверка)
│   └── protectedScripts.js   ← signed-URL для generator-v2.js
│
├── services/              ← бизнес-логика (вне HTTP)
│   ├── audit/             ← аудит СанПиН (зеркало engine.js, для генератора)
│   │   ├── checks.js      ← правила C-01..X-01
│   │   └── scoring.js     ← формула 0–100
│   ├── parser/            ← парсеры Excel
│   │   ├── index.js       ← роутер форматов (5 стратегий)
│   │   ├── try-parse-audit-template.js  ← основной формат
│   │   ├── try-parse-rows.js / try-parse-transposed.js
│   │   └── norm-subj.js   ← нормализация названий предметов
│   ├── template/          ← генерация xlsx-шаблонов
│   ├── payment/yokassa.js ← интеграция YooKassa
│   ├── sanpin-norms.js    ← НСИ из СанПиН 1.2.3685-21
│   └── sanpin-rules.json  ← данные шкал трудности предметов
│
├── middleware/            ← Express middleware
│   ├── requirePlan.js     ← проверка plan='paid' (Supabase JWT + БД)
│   ├── requireAdmin.js    ← проверка X-Admin-Token
│   ├── captcha.js         ← verifyCaptcha (honeypot + minTime + HMAC)
│   └── upload.js          ← multer для загрузки файлов
│
├── protected/             ← файлы, отдаваемые только по signed URL
│   └── generator-v2.js    ← фронтовый генератор (1218 строк)
│                            доступен через /api/scripts/generator-v2.js?token=...
│
├── config/                ← конфигурация
│   ├── database.js        ← подключение к PostgreSQL (Supabase)
│   └── pricing.js         ← цены тарифа Школа
│
├── migrations/            ← SQL-миграции БД
│   ├── 001-init.sql       ← schools, users, schedules
│   ├── 002-schedules-audit.sql
│   ├── 003-payment-flow.sql
│   └── 004-schedules-public-share.sql
│
└── tests/                 ← unit-тесты (node --test)
    ├── checks.test.js     ← правила СанПиН
    ├── scoring.test.js    ← формула баллов
    ├── adminSubscriptions.test.js
    ├── requirePlan.test.js
    └── verifySupabaseToken.test.js
```

**Принципы организации бэка:**

- **`routes/` хранит только HTTP-обвязку** (парсинг параметров, ответы).
  Логика — в `services/`. Это упрощает тестирование: тесты дёргают
  функции из `services/` напрямую, минуя Express.
- **Нет папки `controllers/`** — это сознательное решение, чтобы не
  размазывать логику по трём слоям. `routes/` — это и есть тонкая
  «контроллер»-обвязка.
- **Миграции — числовые, по порядку применения**. Не используем
  миграционные библиотеки (Knex/Sequelize) — простые SQL-файлы
  применяются вручную через Supabase Dashboard.

---

## cp-sat-solver/ — Python-сервис генерации

```
cp-sat-solver/
├── solver.py           ← основная функция, обёртка CP-SAT
├── builder.py          ← сборка модели OR-Tools из входных данных
├── sanpin.py           ← наложение ограничений СанПиН на модель
├── models.py           ← Pydantic-схемы входа/выхода
├── fixtures/           ← тестовые JSON-входы для отладки
└── requirements.txt    ← Python-зависимости (ortools, fastapi)
```

Отдельный процесс на Python, потому что CP-SAT solver (Google OR-Tools)
— это C++/Python библиотека, в Node.js её нет. Запускается на порту 8000,
бэкенд `/api/generate` дёргает его через HTTP.

Сейчас этот старый flow устарел: новая генерация (`generator-v2.js`)
работает прямо в браузере, без CP-SAT. Но Python-сервис оставлен в
репо как fallback и для возможного возврата к серверной генерации.

---

## Где какой README

- **`README.md`** — общее описание для GitHub
- **`replit.md`** — инструкция для AI-инструментов (Cursor/Claude)
  по архитектуре. Самый актуальный документ для понимания дизайн-решений.
- **`CLAUDE.md`** — то же, специфично для Claude Code
- **`CHANGELOG`** — лог релизов
- **`docs/deployment.md`** — как разворачивать на проде
- **`docs/plans/`** — планы продукта, roadmap
- **`notes/`** — внутренние заметки команды (CustDev, UX-итерации)

---

## Что куда добавлять

| Задача | Куда |
|---|---|
| Новый эндпоинт API | `projects/sanpin-audit-ui/routes/` + регистрация в `app.js` |
| Новое правило аудита | `projects/sanpin-audit-ui/services/audit/checks.js` **И** `projects/frontend/js/engine.js` (два места — frontend дублирует логику) |
| Новая страница лендинга | `projects/frontend/*.html` |
| Изменение модели БД | новый файл в `projects/sanpin-audit-ui/migrations/00X-...sql` |
| Защита нового роута подпиской | `middleware/requirePlan(['paid'])` |
| Новая ENV-переменная | задокументировать в `replit.md` и `docs/deployment.md` |

---

## Workflow Git

- Все коммиты идут в `main` через feature-ветки.
- Названия веток с префиксами: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.
- Каждый коммит — production-ready: всегда есть рабочее состояние.
- Сторонние правки коллегой (Дианой) часто параллельные, делаем
  `git pull --rebase` перед слиянием.

Стек на проде:

- **Node.js + Express** (бэк), статика отдаётся express.static
- **PostgreSQL** через Supabase (хранилище + auth)
- **Python + OR-Tools** для CP-SAT генерации (опционально)
- **YooKassa** для приёма платежей
- **Resend** для отправки email
- **Replit** для хостинга (dev/staging), Docker-стек для прода
