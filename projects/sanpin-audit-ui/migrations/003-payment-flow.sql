-- Модуль: migrations
-- Задача: payment-flow
-- Описание: Расширение subscription_requests для полного цикла оплаты через ЮKassa.
--   - Новые статусы: awaiting_payment, paid
--   - Старый processed → paid (обратно совместимая миграция)
--   - Новые колонки: payment_id, payment_url, paid_at

-- ═══════════════════════════════════════════════════════════════
-- UP
-- ═══════════════════════════════════════════════════════════════

-- 1. Снять старое CHECK-ограничение на статус
ALTER TABLE subscription_requests
  DROP CONSTRAINT IF EXISTS subscription_requests_status_check;

-- 2. Перевести существующие processed → paid
UPDATE subscription_requests
  SET status = 'paid'
  WHERE status = 'processed';

-- 3. Установить новое ограничение
ALTER TABLE subscription_requests
  ADD CONSTRAINT subscription_requests_status_check
  CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'rejected'));

-- 4. Добавить поля ЮKassa
ALTER TABLE subscription_requests
  ADD COLUMN IF NOT EXISTS payment_id   TEXT,
  ADD COLUMN IF NOT EXISTS payment_url  TEXT,
  ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sub_req_payment_id
  ON subscription_requests(payment_id)
  WHERE payment_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- DOWN
-- ═══════════════════════════════════════════════════════════════

-- DROP INDEX IF EXISTS idx_sub_req_payment_id;
-- ALTER TABLE subscription_requests DROP COLUMN IF EXISTS paid_at;
-- ALTER TABLE subscription_requests DROP COLUMN IF EXISTS payment_url;
-- ALTER TABLE subscription_requests DROP COLUMN IF EXISTS payment_id;
-- ALTER TABLE subscription_requests DROP CONSTRAINT IF EXISTS subscription_requests_status_check;
-- UPDATE subscription_requests SET status = 'processed' WHERE status = 'paid';
-- ALTER TABLE subscription_requests
--   ADD CONSTRAINT subscription_requests_status_check
--   CHECK (status IN ('pending', 'processed', 'rejected'));
