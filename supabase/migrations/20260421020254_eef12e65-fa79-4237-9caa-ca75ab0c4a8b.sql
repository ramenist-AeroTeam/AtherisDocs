ALTER TABLE public.user_tabs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'blank';
UPDATE public.user_tabs SET kind = 'blank';