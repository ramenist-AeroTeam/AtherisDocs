ALTER TABLE public.user_tabs
  ADD COLUMN IF NOT EXISTS document jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph","children":[{"text":"Welcome to my property!"}]}]}'::jsonb,
  ADD COLUMN IF NOT EXISTS editor_theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS startup_sound boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_tabs_user_kind ON public.user_tabs(user_id, kind);

CREATE OR REPLACE FUNCTION public.ensure_auto_property(_user_id uuid, _display_name text DEFAULT 'Player')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  property_id uuid;
  property_count integer;
BEGIN
  SELECT id INTO property_id
  FROM public.user_tabs
  WHERE user_id = _user_id AND kind = 'property'
  ORDER BY created_at ASC
  LIMIT 1;

  IF property_id IS NULL THEN
    INSERT INTO public.user_tabs (user_id, name, emoji, kind, position, is_public, content, document)
    VALUES (
      _user_id,
      COALESCE(NULLIF(_display_name, ''), 'Player') || '''s Property',
      '🏡',
      'property',
      0,
      true,
      '',
      jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'heading', 'level', 1, 'children', jsonb_build_array(jsonb_build_object('text', COALESCE(NULLIF(_display_name, ''), 'Player') || '''s Property'))),
          jsonb_build_object('type', 'paragraph', 'children', jsonb_build_array(jsonb_build_object('text', 'Write anything here. Your stats stay attached automatically.')))
        )
      )
    )
    RETURNING id INTO property_id;
  END IF;

  UPDATE public.user_tabs
  SET kind = 'archive', position = position + 1000
  WHERE user_id = _user_id AND id <> property_id;

  UPDATE public.user_tabs
  SET kind = 'property', position = 0, last_saved_at = now()
  WHERE id = property_id;

  SELECT count(*) INTO property_count FROM public.tab_blocks WHERE tab_id = property_id;
  IF property_count = 0 THEN
    INSERT INTO public.tab_blocks (tab_id, user_id, block_type, position, data) VALUES
      (property_id, _user_id, 'stats', 0, '{}'::jsonb),
      (property_id, _user_id, 'currency', 1, '{}'::jsonb),
      (property_id, _user_id, 'inventory', 2, '{}'::jsonb),
      (property_id, _user_id, 'garden', 3, '{}'::jsonb);
  END IF;

  RETURN property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uname TEXT;
  assigned_role app_role := 'member';
  new_tab_id UUID;
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email,''), '@', 1),
    'Player'
  );
  INSERT INTO public.profiles (user_id, email, display_name) VALUES (NEW.id, NEW.email, uname);
  new_tab_id := public.ensure_auto_property(NEW.id, uname);
  IF NEW.email = 'sy279322@student.omsd.net' THEN assigned_role := 'owner';
  ELSIF NEW.email = 'mn284807@student.omsd.net' THEN assigned_role := 'co_owner';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $function$;