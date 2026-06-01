-- Meeting Hub table for InvoiceQu monolith.
-- Run this in the Neon database used by TASK_DB_URL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID,
    client_name TEXT NOT NULL DEFAULT '',
    project_id UUID,
    project_name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    meeting_url TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'other',
    scheduled_at TIMESTAMPTZ,
    duration_minutes INT NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'scheduled',
    agenda TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_url TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'other';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS agenda TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS decisions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS next_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.meetings
SET
    client_name = COALESCE(client_name, ''),
    project_name = COALESCE(project_name, ''),
    title = COALESCE(title, ''),
    meeting_url = COALESCE(meeting_url, ''),
    provider = COALESCE(provider, 'other'),
    duration_minutes = COALESCE(duration_minutes, 30),
    status = COALESCE(status, 'scheduled'),
    agenda = COALESCE(agenda, ''),
    notes = COALESCE(notes, ''),
    summary = COALESCE(summary, ''),
    decisions = COALESCE(decisions, '[]'::jsonb),
    next_steps = COALESCE(next_steps, '[]'::jsonb),
    action_items = COALESCE(action_items, '[]'::jsonb),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

ALTER TABLE public.meetings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN client_name SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN project_name SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN meeting_url SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN provider SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN agenda SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN notes SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN summary SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN decisions SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN next_steps SET NOT NULL;
ALTER TABLE public.meetings ALTER COLUMN action_items SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_user_scheduled
    ON public.meetings(user_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_user_client
    ON public.meetings(user_id, client_id);

CREATE INDEX IF NOT EXISTS idx_meetings_user_project
    ON public.meetings(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_meetings_user_status
    ON public.meetings(user_id, status);

COMMIT;
