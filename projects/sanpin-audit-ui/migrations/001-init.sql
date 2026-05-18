-- Базовая схема: schools + users

CREATE TABLE IF NOT EXISTS schools (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  city      VARCHAR(255) NOT NULL DEFAULT '',
  mode      VARCHAR(10)  NOT NULL DEFAULT '5day',
  shifts    INTEGER      NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT        PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL DEFAULT 'supabase_auth',
  name          VARCHAR(255) NOT NULL DEFAULT '',
  school_id     INTEGER     REFERENCES schools(id) ON DELETE SET NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'admin',
  plan          VARCHAR(20) NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
