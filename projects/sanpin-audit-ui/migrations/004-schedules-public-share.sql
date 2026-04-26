-- Модуль: migrations
-- Задача: Публичная ссылка на расписание (share URL)
-- Описание:
--   Добавляет флаг is_public и RLS-политику «public SELECT where is_public=true».
--   Позволяет владельцу расшарить расписание без требования логина у получателя.
-- Применяется: Supabase Dashboard → SQL Editor → New query → Run

ALTER TABLE schedules_generated
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Любой пользователь (включая анонимного) может SELECT'ить расшаренные записи
CREATE POLICY "Public can view shared runs" ON schedules_generated
  FOR SELECT USING (is_public = true);

-- Владелец может UPDATE'нуть флаг (is_public) — в рамках существующей политики
-- нужно добавить UPDATE-policy, т.к. исходно была только SELECT/INSERT/DELETE.
CREATE POLICY "Users update own runs" ON schedules_generated
  FOR UPDATE USING (auth.uid() = user_id);
