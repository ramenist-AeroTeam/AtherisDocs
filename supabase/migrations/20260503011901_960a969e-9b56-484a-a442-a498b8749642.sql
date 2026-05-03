-- Aero migration requests
CREATE TABLE public.aero_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aero_username TEXT NOT NULL DEFAULT '',
  pets_text TEXT NOT NULL DEFAULT '',
  role_request TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.aero_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aero insert self" ON public.aero_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aero read self or staff" ON public.aero_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));
CREATE POLICY "aero update staff" ON public.aero_requests FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()));
CREATE POLICY "aero delete self or staff" ON public.aero_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- Tutorial flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_seen BOOLEAN NOT NULL DEFAULT false;

-- Update handle_new_user: seed a property tab + blocks
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
  INSERT INTO public.user_tabs (user_id, name, emoji, kind)
    VALUES (NEW.id, uname || '''s Property', '🏡', 'property')
    RETURNING id INTO new_tab_id;
  INSERT INTO public.tab_blocks (tab_id, user_id, block_type, position, data) VALUES
    (new_tab_id, NEW.id, 'header',    0, jsonb_build_object('title', uname || '''s Property', 'subtitle', 'This is your home — your stats live here.')),
    (new_tab_id, NEW.id, 'stats',     1, '{"title":"","job":""}'::jsonb),
    (new_tab_id, NEW.id, 'currency',  2, '{}'::jsonb),
    (new_tab_id, NEW.id, 'inventory', 3, '{}'::jsonb),
    (new_tab_id, NEW.id, 'garden',    4, '{}'::jsonb);
  IF NEW.email = 'sy279322@student.omsd.net' THEN assigned_role := 'owner';
  ELSIF NEW.email = 'mn284807@student.omsd.net' THEN assigned_role := 'co_owner';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $function$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();