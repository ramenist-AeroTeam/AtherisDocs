
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname TEXT;
  assigned_role app_role := 'member';
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email,''), '@', 1),
    'Player'
  );
  INSERT INTO public.profiles (user_id, email, display_name) VALUES (NEW.id, NEW.email, uname);
  INSERT INTO public.user_tabs (user_id, name, emoji) VALUES (NEW.id, uname || '''s Tab', '📄');
  IF NEW.email = 'sy279322@student.omsd.net' THEN assigned_role := 'owner';
  ELSIF NEW.email = 'mn284807@student.omsd.net' THEN assigned_role := 'co_owner';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;
