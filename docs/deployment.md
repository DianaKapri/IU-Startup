# Развёртывание проекта ШколаПлан на удалённом сервере

Документ описывает, как настроен автоматический деплой Node.js-приложения «ШколаПлан» на VPS с использованием Docker Compose и GitHub Actions.

---

## 1. Цель

Сделать так, чтобы:

1. Приложение запускалось на арендованном VPS и было доступно из интернета по IP.
2. После любого `git push` в ветку `main` новая версия автоматически появлялась на сервере **без ручных действий**.
3. Все зависимости (Node.js, npm-пакеты) устанавливались внутри контейнера, а не на хосте — это делает сервер «одноразовым»: его можно пересоздать в любой момент, имея только репозиторий и `.env`.

---

## 2. Архитектура

```
┌──────────────────────────────────────────────────────────┐
│                  Локальная машина                        │
│   git push origin main                                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                       GitHub                             │
│   Репозиторий DianaKapri/IU-Startup                      │
│   .github/workflows/deploy.yml — Action «Deploy»         │
└────────────────────────┬─────────────────────────────────┘
                         │ SSH (ключ из GitHub Secrets)
                         ▼
┌──────────────────────────────────────────────────────────┐
│             VPS  144.31.188.143  (Ubuntu 24.04)          │
│                                                          │
│   /opt/shkolaplan/                                       │
│   ├── исходники (git pull)                               │
│   ├── .env       (секреты, НЕ в git)                     │
│   └── docker-compose.yml                                 │
│                                                          │
│   docker compose up -d --build                           │
│   ┌────────────────────────────────────────────────┐     │
│   │  Контейнер shkolaplan  (Node 20-alpine)        │     │
│   │  ├── server.js          порт 5000              │     │
│   │  │   ├── статика projects/frontend/            │     │
│   │  │   └── proxy /api/* → localhost:4000         │     │
│   │  └── projects/sanpin-audit-ui/app.js  порт 4000│     │
│   └────────────────────────────────────────────────┘     │
│   Порт 80 на хосте → 5000 в контейнере                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase (внешний SaaS)                 │
│   • Authentication — регистрация, JWT-токены             │
│   • Postgres БД    — таблицы users, schools, schedules   │
│   Подключение через connection pooler (eu-west-1)        │
└──────────────────────────────────────────────────────────┘
```

Особенность: фронтенд (статичные `.html`, `.css`, `.js`) и бэкенд лежат в **одном контейнере**. Бэкенд (`projects/sanpin-audit-ui/app.js`) запускается как дочерний процесс из `server.js`. Запросы из браузера идут на один и тот же origin (`http://144.31.188.143`), поэтому CORS не срабатывает в принципе.

---

## 3. Файлы в репозитории, относящиеся к деплою

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Инструкция, как собрать образ контейнера: какая базовая ОС, какие зависимости, какая команда запуска |
| `docker-compose.yml` | Описание сервиса: какой образ, какие порты, какие переменные окружения, политика рестарта |
| `.dockerignore` | Что НЕ копировать в образ (`node_modules`, `.git`, `.env`, и т. п.) — уменьшает размер и ускоряет сборку |
| `.gitignore` | Что НЕ коммитить в git (`.env` с секретами, `node_modules`, `*.log`) |
| `.github/workflows/deploy.yml` | GitHub Action: на каждый push в `main` автоматически выполняет деплой через SSH |

### 3.1 `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY projects/sanpin-audit-ui/package.json projects/sanpin-audit-ui/package-lock.json ./projects/sanpin-audit-ui/
RUN cd projects/sanpin-audit-ui && npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

**Как читается:**
- `FROM node:20-alpine` — базовый образ Node.js 20 на Alpine Linux (~50 МБ против ~900 МБ у обычного `node:20`).
- `WORKDIR /app` — все последующие команды выполняются в `/app` внутри контейнера.
- Копируем `package.json` **до** остального кода и сразу ставим зависимости — Docker кеширует этот слой, и пока `package.json` не меняется, при пересборке зависимости качаются из кеша мгновенно.
- Делаем то же самое для бэкенда (`projects/sanpin-audit-ui/`), потому что у него собственный `package.json`.
- Только после этого `COPY . .` — копируем весь код. Если поменялся только код, переустановки `npm` не будет.
- `CMD ["node", "server.js"]` — команда, с которой стартует контейнер.

### 3.2 `docker-compose.yml`

```yaml
services:
  app:
    build: .
    container_name: shkolaplan
    restart: unless-stopped
    ports:
      - "80:5000"
    env_file: .env
    volumes:
      - uploads:/app/projects/sanpin-audit-ui/uploads

volumes:
  uploads:
```

**Как читается:**
- `build: .` — собирать образ из `Dockerfile` в текущей папке.
- `restart: unless-stopped` — если контейнер упадёт или сервер ребутнётся, контейнер автоматически поднимется снова. Не поднимется только если его явно остановили (`docker compose down/stop`).
- `ports: "80:5000"` — пробросить 80-й порт хоста на 5000-й внутри контейнера. Пользователи открывают `http://144.31.188.143` (порт 80 — стандартный HTTP).
- `env_file: .env` — переменные окружения берутся из файла `.env` рядом. Этот файл **не лежит в git** (см. `.gitignore`), он создаётся вручную на сервере. Так секреты не попадают в публичный репозиторий.
- `volumes: uploads` — папка `uploads` (куда `multer` сохраняет загруженные расписания) хранится в Docker volume. Если контейнер пересоберётся, файлы не пропадут.

### 3.3 `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH and redeploy
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            set -e
            cd /opt/shkolaplan
            git pull origin main
            docker compose up -d --build
            docker image prune -f
```

**Как читается:**
- `on: push: branches: [main]` — триггер: запускать workflow при каждом push в ветку main. `workflow_dispatch` добавляет кнопку «Run workflow» в интерфейсе GitHub для ручного запуска.
- `runs-on: ubuntu-latest` — workflow выполняется на временной виртуалке, которую GitHub предоставляет бесплатно.
- `appleboy/ssh-action@v1.2.0` — готовый Action, умеющий заходить на удалённый сервер по SSH и выполнять там команды.
- `secrets.SSH_HOST`, `SSH_USER`, `SSH_KEY` — берутся из настроек репозитория (`Settings → Secrets and variables → Actions`). Это IP сервера, имя юзера (`root`) и приватный SSH-ключ. Они не видны в коде workflow и не появляются в логах.
- `script:` — три команды, которые выполняются на сервере:
    1. `git pull origin main` — забрать новый код из репозитория
    2. `docker compose up -d --build` — пересобрать образ (если изменился `Dockerfile` или код) и запустить контейнер; `-d` означает «в фоне», `--build` принудительно пересобрать
    3. `docker image prune -f` — почистить старые образы, чтобы диск не забивался

**Важно:** Action **только доставляет код и перезапускает контейнер**. Никакой бизнес-логики (ставить Node.js, конфигурить nginx, и т. п.) в workflow нет — всё это делает сам Docker. Это сознательное упрощение: workflow можно прочитать и понять за минуту.

---

## 4. Первичная настройка сервера (один раз)

Эти шаги выполняются **вручную** один раз при создании сервера. После этого деплой работает автоматически.

### 4.1 Установка Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Скрипт от Docker сам определяет дистрибутив (Ubuntu 24.04) и ставит `docker-ce` + `docker-compose-plugin`.

### 4.2 Клонирование репозитория

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/DianaKapri/IU-Startup.git shkolaplan
cd shkolaplan
```

Папка `/opt` — стандартное место для серверных приложений в Linux.

### 4.3 Создание `.env` с секретами

```bash
nano .env
```

Содержимое:
```
SUPABASE_URL=https://urjxqrqaabzbcuytzxfq.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiI...   # anon (public) ключ из Supabase
DATABASE_URL=postgresql://postgres.urjxqrqaabzbcuytzxfq:<пароль>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
NODE_ENV=production
```

Защищаем файл от чужих глаз:
```bash
chmod 600 .env
```

Откуда брать значения:
- `SUPABASE_URL` и `SUPABASE_KEY` — Supabase Dashboard → Project Settings → API. Берётся **anon public** ключ (он попадает в браузер; service role — НЕЛЬЗЯ).
- `DATABASE_URL` — Supabase Dashboard → Project Settings → Database → Connection String → Transaction pooler.

### 4.4 Открытие портов в фаерволе

```bash
ufw allow 22       # SSH
ufw allow 80       # HTTP
ufw --force enable
```

### 4.5 Первый запуск

```bash
docker compose up -d --build
```

Проверка: открыть в браузере `http://144.31.188.143` — должна открыться главная страница.

### 4.6 SSH-ключ для GitHub Actions

Чтобы Action мог зайти на сервер, нужен отдельный SSH-ключ (личный ключ разработчика для этого использовать нельзя — секрет в GitHub Secrets лежит расшифрованным в момент выполнения workflow):

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy   # скопировать ВЕСЬ вывод (приватный ключ)
```

### 4.7 Регистрация секретов в GitHub

В репозитории: **Settings → Secrets and variables → Actions → New repository secret**.

| Имя | Значение |
|-----|----------|
| `SSH_HOST` | `144.31.188.143` |
| `SSH_USER` | `root` |
| `SSH_KEY`  | приватный ключ из шага 4.6 (включая строки `-----BEGIN…` и `-----END…`) |

После этого любой push в `main` запускает workflow.

---

## 5. Как происходит автоматический деплой

```
1. Разработчик локально:  git push origin main
                          │
                          ▼
2. GitHub получает push, видит .github/workflows/deploy.yml
                          │
                          ▼
3. GitHub поднимает временный Ubuntu-runner для workflow «Deploy»
                          │
                          ▼
4. Runner подключается по SSH к 144.31.188.143 (используя SSH_KEY из Secrets)
                          │
                          ▼
5. На сервере выполняется:
       cd /opt/shkolaplan
       git pull origin main          ← код обновился
       docker compose up -d --build  ← образ пересобрался
                                       старый контейнер остановлен
                                       новый контейнер поднят
       docker image prune -f         ← удалены устаревшие образы
                          │
                          ▼
6. Через ~30 сек новая версия живёт на http://144.31.188.143
```

Время полного цикла — около 1–2 минуты, в зависимости от объёма изменений и скорости пересборки `npm ci`.

---

## 6. Защита секретов

Принцип: **секреты никогда не попадают в git**.

| Где живёт секрет | Что защищает |
|------------------|--------------|
| `.gitignore` (в репо) | строка `.env` — git не даст случайно закоммитить файл с секретами |
| `.dockerignore` | строка `**/.env` — секреты не попадут в Docker-образ при сборке |
| `.env` на сервере (`chmod 600`) | физически на сервере, читается только владельцем |
| GitHub Secrets | приватный SSH-ключ зашифрован в настройках репозитория, не виден ни в логах, ни в коде |

Если репозиторий уйдёт в публичный доступ — никаких секретов в нём не будет.

---

## 7. Какие проблемы возникли и как их решали

Раздел полезен как иллюстрация процесса отладки.

### 7.1 Бэкенд не мог подключиться к Postgres

**Симптом:** при регистрации нового пользователя он появлялся в Supabase Authentication, но НЕ появлялся в Table Editor (таблица `users`).

**Диагностика (через `docker compose logs app`):**
```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Причина:** в `.env` не был указан `DATABASE_URL`. Библиотека `pg` по умолчанию пытается стучаться в `localhost:5432` — а в контейнере никакого Postgres нет.

**Решение:** добавили `DATABASE_URL` со строкой подключения из Supabase.

### 7.2 Tenant or user not found

**Симптом:** после добавления `DATABASE_URL` ошибка изменилась:
```
error: Tenant or user not found  (severity: FATAL, code: XX000)
```

**Причина 1:** в username connection string скопировали шаблон `postgres.xxx`, не заменив `xxx` на реальный project ref проекта (`urjxqrqaabzbcuytzxfq`).

**Причина 2:** угадали неправильный регион пулера (`eu-central-1` вместо `eu-west-1`). Supabase pooler routes по username, и если проект в другом регионе — пулер просто не знает такого tenant.

**Решение:** написали небольшой скрипт, перебирающий все 15 регионов AWS, и нашли правильный (`eu-west-1`).

### 7.3 Frontend silently swallowed backend errors

**Побочное наблюдение:** даже когда бэкенд `/api/auth/register` падал с 500-й ошибкой, фронтенд показывал пользователю «успешная регистрация». Это связано с тем, что в `auth.js` блок `.catch` возвращает `{ ok: true }` при ошибке. Это маскировало баг с DB и затрудняло диагностику.

**Что сделать:** в будущем переработать обработку ошибок — фронтенд должен показывать пользователю, если бэкенд не сохранил его в свою БД.

---

## 8. Что можно улучшить

Текущая схема работает, но есть очевидные направления для развития:

1. **HTTPS.** Сейчас сайт по HTTP. Когда появится домен — добавить в `docker-compose.yml` сервис `nginx` + `certbot` для бесплатных SSL-сертификатов от Let's Encrypt.
2. **Отдельная нагрузка для статики.** Фронтенд раздаётся через Express. Для high-load уместнее nginx или CDN.
3. **Health checks.** В `docker-compose.yml` добавить `healthcheck:` — Docker сам перезапустит контейнер, если приложение зависло, но порт открыт.
4. **Откат при неудачном деплое.** Сейчас если новая версия сломана — контейнер с ней просто упадёт. Можно добавить `docker compose --rollback` или хранить предыдущий образ.
5. **Логирование.** Сейчас логи живут только внутри контейнера и теряются при `docker compose down`. Подключить, например, `journald` driver или внешний сервис (Logtail, Grafana Loki).
6. **CI/CD: тесты до деплоя.** Сейчас Action только катит код. Стоит добавить шаг с прогоном тестов и блокировать деплой при падении.
7. **Миграции БД.** В репо есть только `002-schedules-audit.sql`, миграции для `users`/`schools` отсутствуют. Применить их через `node-pg-migrate` или подобное и запускать автоматически в Action перед стартом контейнера.

---

## 9. Команды для работы с сервером

Шпаргалка для будущего обслуживания:

```bash
# Подключиться к серверу
ssh root@144.31.188.143

# Перейти в папку приложения
cd /opt/shkolaplan

# Посмотреть статус контейнеров
docker compose ps

# Посмотреть логи (живые, прокручиваются)
docker compose logs -f app

# Посмотреть последние 50 строк логов
docker compose logs --tail=50 app

# Перезапустить контейнер (без пересборки)
docker compose restart

# Полная пересборка и перезапуск (читает .env заново)
docker compose down
docker compose up -d --build

# Посмотреть переменные окружения внутри контейнера
docker compose exec app env

# Зайти внутрь контейнера в shell
docker compose exec app sh
```

---

## 10. Итог

Реализована полностью автоматизированная схема развёртывания:

- **Один раз** настроили сервер: установили Docker, склонировали репо, создали `.env`, добавили SSH-ключ в GitHub Secrets.
- **С тех пор** любое изменение кода доходит до production через `git push` — без ручных команд на сервере.
- **Секреты** разделены и защищены: `.env` не в git, SSH-ключ только в GitHub Secrets, фаервол открывает только нужные порты.
- **Архитектура простая:** один контейнер, один сервис, никаких лишних абстракций. Можно показать любому разработчику, и он поймёт за 5 минут.
