# Feature: Payment Flow (ЮKassa)

## Overview

Полный цикл оплаты тарифов через ЮKassa. Пользователь запрашивает счёт →
администратор одобряет → пользователь получает ссылку на оплату → оплачивает
в ЮKassa → подписка активируется. Тестирование через sandbox ЮKassa без реальных денег.

---

## Статусы заявки (subscription_requests)

```
pending → awaiting_payment → paid
        ↘ rejected
```

| Статус             | Смысл                                      | Кто меняет          |
|--------------------|--------------------------------------------|---------------------|
| `pending`          | Заявка подана, ждёт решения админа         | (создаётся сервером) |
| `awaiting_payment` | Одобрено, ссылка на оплату выслана         | Администратор       |
| `paid`             | Деньги получены, подписка активна          | Webhook ЮKassa      |
| `rejected`         | Отклонено                                  | Администратор       |

> Старый статус `processed` выводится из употребления. Существующие записи с
> `processed` обрабатываются через миграцию (переименовываются в `paid`).

---

## Tasks

### Phase 1 — БД и ЮKassa-сервис (параллельно)

| Task | Agent | Files / Scope | Depends on | Status |
|------|-------|---------------|------------|--------|
| 1.1 Миграция БД | backend-developer | `migrations/003-payment-flow.sql` | — | not started |
| 1.2 ЮKassa-сервис | backend-developer | `services/payment/yokassa.js` | — | not started |

**Детали 1.1 — Миграция:**
```sql
-- Добавить новые статусы
ALTER TABLE subscription_requests
  DROP CONSTRAINT IF EXISTS subscription_requests_status_check;
ALTER TABLE subscription_requests
  ADD CONSTRAINT subscription_requests_status_check
  CHECK (status IN ('pending','awaiting_payment','paid','rejected'));

-- Переименовать старый processed → paid
UPDATE subscription_requests SET status = 'paid' WHERE status = 'processed';

-- Добавить поля ЮKassa
ALTER TABLE subscription_requests
  ADD COLUMN IF NOT EXISTS payment_id   TEXT,
  ADD COLUMN IF NOT EXISTS payment_url  TEXT,
  ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sub_req_payment_id
  ON subscription_requests(payment_id)
  WHERE payment_id IS NOT NULL;
```

**Детали 1.2 — ЮKassa-сервис:**
- Тонкая обёртка над REST API ЮKassa (не SDK — нет нормального для Node.js)
- Функции: `createPayment({ amount, description, returnUrl, metadata })` → `{ id, confirmationUrl }`
- Env: `YOKASSA_SHOP_ID`, `YOKASSA_SECRET_KEY`
- Sandbox: те же переменные, но значения из тестового магазина (раздел ниже)
- Верификация подписи webhook: заголовок `X-Yoomoney-Signature` (HMAC-SHA1)

---

### Phase 2 — Backend: обновление роутов (параллельно)

| Task | Agent | Files / Scope | Depends on | Status |
|------|-------|---------------|------------|--------|
| 2.1 Обновить adminSubscriptions.js | backend-developer | `routes/adminSubscriptions.js` | 1.1, 1.2 | not started |
| 2.2 Создать payments.js (webhook) | backend-developer | `routes/payments.js` | 1.1, 1.2 | not started |
| 2.3 Подключить роут webhook в app.js | backend-developer | `app.js` | 2.2 | not started |

**Детали 2.1 — adminSubscriptions.js:**

Изменить PUT /:id:
- Допустимые новые статусы: `awaiting_payment` | `rejected` (убрать `processed`)
- При `awaiting_payment`:
  1. Создать платёж в ЮKassa через `yokassa.createPayment()`
  2. Сохранить `payment_id` и `payment_url` в строку заявки
  3. Отправить email пользователю (Resend): «Заявка одобрена. Перейдите по ссылке для оплаты.»
  4. НЕ активировать пользователя — это делает webhook
- При `rejected`:
  1. Обновить статус
  2. (опц.) Отправить email «Заявка отклонена»

**Детали 2.2 — payments.js (webhook):**

```
POST /api/payments/webhook
Auth: проверить X-Yoomoney-Signature (HMAC-SHA1 от тела запроса + secret)
```

При `event = payment.succeeded`:
1. Найти заявку по `payment_id`
2. Обновить статус → `paid`, `paid_at = NOW()`
3. Активировать пользователя: `plan = 'paid'`, `plan_expires_at = NOW() + 1 year`
4. Отправить email: «Оплата получена. Подписка активирована до [дата].»

При `event != payment.succeeded` — вернуть 200 (ЮKassa ожидает 200 на любое уведомление).

---

### Phase 3 — Frontend: обновление admin.html (один агент)

| Task | Agent | Files / Scope | Depends on | Status |
|------|-------|---------------|------------|--------|
| 3.1 Обновить admin.html | frontend-developer | `projects/frontend/admin.html` | 2.1 | not started |

**Детали 3.1:**
- Добавить CSS-классы для новых статусов:
  - `.status-badge--awaiting_payment` — синий (цвет #0a84ff / rgba(10,132,255,0.2))
  - `.status-badge--paid` — зелёный (уже есть `.status-badge--processed` — переиспользовать)
- Обновить `getStatusText()`:
  - `awaiting_payment` → «Ожидает оплаты»
  - `paid` → «Оплачено»
  - `rejected` → «Отклонено»
  - `pending` → «На рассмотрении»
- Кнопки действий:
  - `pending` → «Одобрить» (шлёт `awaiting_payment`) + «Отклонить» (`rejected`)
  - `awaiting_payment` → показать ссылку «Скопировать ссылку» (из `payment_url` заявки)
  - `paid` / `rejected` → нет действий
- Статистика: заменить «Обработано» на «Ожидают оплаты» (pending awaiting_payment), добавить «Оплачено»
- Передавать `payment_url` с сервера в GET /api/subscription-requests

---

### Phase 4 — Тесты (параллельно с Phase 3)

| Task | Agent | Files / Scope | Depends on | Status |
|------|-------|---------------|------------|--------|
| 4.1 Тесты adminSubscriptions | backend-developer | `tests/adminSubscriptions.test.js` | 2.1 | not started |
| 4.2 Тесты payments webhook | backend-developer | `tests/payments.test.js` | 2.2 | not started |

---

## Переменные окружения

```env
# ЮKassa (добавить в .env)
YOKASSA_SHOP_ID=<ваш shopId из ЛК тестового магазина>
YOKASSA_SECRET_KEY=<ваш secretKey из ЛК тестового магазина>
YOKASSA_RETURN_URL=https://shkolaplan.ru/account.html
```

---

## Тестирование ЮKassa (без реальных денег)

### Как получить sandbox-доступ

1. Зайти в личный кабинет ЮKassa → «Интеграция» → «Тестовый магазин»
2. Скопировать `shopId` и `secretKey` тестового магазина
3. Прописать в `.env` как `YOKASSA_SHOP_ID` и `YOKASSA_SECRET_KEY`

### Тестовые карты (списки на сайте ЮKassa)

| Карта | Результат |
|-------|-----------|
| `5555 5555 5555 4477` | Успешная оплата |
| `5555 5555 5555 4444` | Оплата отклонена (insufficient funds) |
| `4111 1111 1111 1111` | Успешная оплата (Visa) |

CVC: любые 3 цифры. Дата: любая в будущем.

### Тестирование webhook локально

Для локальной разработки использовать [ngrok](https://ngrok.com/) или
[smee.io](https://smee.io/) — проксировать внешние запросы на localhost:

```bash
npx smee-client --url https://smee.io/<channel> --path /api/payments/webhook --port 3000
```

В тестовом магазине ЮKassa указать URL webhook → `https://smee.io/<channel>`.

---

## Email-шаблоны

### 1. Заявка одобрена (admin → awaiting_payment)

```
Тема: Счёт на оплату — ШколаПлан

Ваша заявка на тариф «Школа» одобрена.
Сумма: 12 000 ₽/год

Перейдите по ссылке для оплаты:
[Оплатить →] <payment_url>

Ссылка действительна 24 часа.
```

### 2. Оплата получена (webhook → paid)

```
Тема: Подписка активирована — ШколаПлан

Оплата 12 000 ₽ успешно получена.
Ваша подписка на тариф «Школа» активирована до <plan_expires_at>.

Перейти в личный кабинет →
```

---

## Testing Strategy

- Unit: `yokassa.js` — mock fetch, проверить формирование запроса и верификацию подписи
- Integration: `adminSubscriptions.test.js` — тест потока `pending → awaiting_payment` с mock ЮKassa и mock Resend
- Integration: `payments.test.js` — тест webhook `payment.succeeded` → `paid` + активация пользователя
- Покрытие: ≥ 80% по каждому роуту

---

## Зависимости npm

```bash
# Уже есть: resend, express, pg
# Добавить ничего не нужно — ЮKassa API через нативный fetch (Node 18+)
```
