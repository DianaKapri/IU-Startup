-- Модуль: migrations
-- Задача: 2.2.1 — Сохранение сгенерированных расписаний и аудитов
-- Описание:
--   Таблица schedules_generated хранит список расписаний и аудитов,
--   созданных пользователем через визард/Excel-шаблон. Доступ по RLS —
--   каждый юзер видит и редактирует только свои записи.
-- Применяется: Supabase Dashboard → SQL Editor → New query → Run

-- ═══════════════════════════════════════════════════════════════
-- UP
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedules_generated (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('schedule', 'audit')),
  title       TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_generated_user_created
  ON schedules_generated (user_id, created_at DESC);

ALTER TABLE schedules_generated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own runs" ON schedules_generated
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own runs" ON schedules_generated
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own runs" ON schedules_generated
  FOR DELETE USING (auth.uid() = user_id);
