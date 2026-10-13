-- tablet.ai PostgreSQL 16 Database Schema
-- Reference: application_technical_specification_tablet_ai.md #3.1

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Definitions
DO $$ BEGIN
    CREATE TYPE meal_relation_enum AS ENUM ('BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status_enum AS ENUM ('PENDING', 'DUE', 'COMPLETED', 'SKIPPED', 'MISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_source_enum AS ENUM ('APP_UI', 'TELEGRAM', 'SYSTEM_TIMEOUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) DEFAULT 'User',
    telegram_chat_id BIGINT UNIQUE NULL,
    telegram_auth_token VARCHAR(64) UNIQUE NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    lead_time_minutes SMALLINT NOT NULL DEFAULT 10,
    meal_slot_preferences JSONB NOT NULL DEFAULT '{
        "morning": "08:30",
        "afternoon": "13:30",
        "evening": "20:30",
        "bedtime": "22:30"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scans History (Ephemeral receipt metadata)
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    confidence_score NUMERIC(3, 2),
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Medication Schedules
CREATE TABLE IF NOT EXISTS medication_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    strength VARCHAR(64),
    dosage_instruction VARCHAR(128) NOT NULL,
    meal_relation meal_relation_enum NOT NULL DEFAULT 'NONE',
    daily_times TIME[] NOT NULL,
    suggested_slots TEXT[] DEFAULT ARRAY['MORNING']::TEXT[],
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Adherence Tasks (Materialized Doses)
CREATE TABLE IF NOT EXISTS adherence_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES medication_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status task_status_enum NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMPTZ NULL,
    channel_source channel_source_enum NULL,
    bullmq_job_id VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Query Optimization
CREATE INDEX IF NOT EXISTS idx_adherence_user_date ON adherence_tasks(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_adherence_status ON adherence_tasks(status);
CREATE INDEX IF NOT EXISTS idx_adherence_schedule_id ON adherence_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_token ON users(telegram_auth_token);

-- Demo / Default user seed for testing
INSERT INTO users (id, email, name, timezone, lead_time_minutes)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@tablet.ai',
    'Alex Morgan',
    'Asia/Kolkata',
    10
)
ON CONFLICT (id) DO NOTHING;
