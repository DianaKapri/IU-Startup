-- Модуль: config
-- Задача: US-0202, US-0401-ST05
-- Описание: Таблица schedules — загруженные расписания с файлами, статусом парсинга
--           и результатом в JSONB. Таблица audit_results — результаты аудита (EP-05).

-- ═══════════════════════════════════════════════════════════════
-- UP
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedules (
  id              SERIAL PRIMARY KEY,
  school_id       INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Файл (US-0401)
  file_name       VARCHAR(255) NOT NULL,       -- UUID-имя на диске
  original_name   VARCHAR(255) NOT NULL,       -- оригинальное имя от пользователя
  file_path       TEXT NOT NULL,               -- абсолютный путь к файлу
  file_size       INTEGER NOT NULL DEFAULT 0,  -- размер в байтах

  -- Статус обработки (US-0401-ST06)
  status          VARCHAR(20) NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded', 'parsing', 'parsed', 'error')),
  error_message   TEXT,

  -- Результат парсинга
  data_json       JSONB,                       -- распарсенное расписание
  classes_count   INTEGER,                     -- кол-во классов

  -- Метки времени
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_school_id  ON schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id    ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status     ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON schedules(created_at DESC);

-- ─── audit_results (EP-05, заготовка) ───────────────────────

CREATE TABLE IF NOT EXISTS audit_results (
  id              SERIAL PRIMARY KEY,
  schedule_id     INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  score           INTEGER,                     -- 0–100
  grade           VARCHAR(2),                  -- A / B / C / D / F
  violations_json JSONB,                       -- массив нарушений
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_schedule_id ON audit_results(schedule_id);

-- ═══════════════════════════════════════════════════════════════
-- DOWN
-- ═══════════════════════════════════════════════════════════════

-- DROP TABLE IF EXISTS audit_results;
-- DROP TABLE IF EXISTS schedules;
