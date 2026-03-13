-- Adds per-project notes support stored directly on the projects row.
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill legacy rows where notes could be null.
UPDATE public.projects
SET notes = '[]'::jsonb
WHERE notes IS NULL;
