DROP POLICY IF EXISTS "tabs insert self limited" ON public.user_tabs;
CREATE POLICY "tabs insert self" ON public.user_tabs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tabs delete self staff or dev" ON public.user_tabs;
CREATE POLICY "tabs delete self" ON public.user_tabs
  FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('tab-html', 'tab-html', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "tab-html public read" ON storage.objects FOR SELECT USING (bucket_id = 'tab-html');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tab-html user upload" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'tab-html' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tab-html user update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'tab-html' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "tab-html user delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'tab-html' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;