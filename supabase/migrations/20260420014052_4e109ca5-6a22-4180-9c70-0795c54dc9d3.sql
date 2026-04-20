
-- ============ ENUM for roles ============
CREATE TYPE public.app_role AS ENUM ('owner', 'co_owner', 'dev', 'member', 'custom');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'New Player',
  avatar_emoji TEXT NOT NULL DEFAULT '🙂',
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  noodles INT NOT NULL DEFAULT 0,
  lumina INT NOT NULL DEFAULT 0,
  font_pref TEXT NOT NULL DEFAULT 'inter',
  dev_build BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  custom_label TEXT,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','co_owner')
  )
$$;

-- ============ USER TABS (one per user — their "property") ============
CREATE TABLE public.user_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Tab',
  emoji TEXT NOT NULL DEFAULT '📄',
  content TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT true,
  level_lock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_tabs ENABLE ROW LEVEL SECURITY;

-- ============ TAB BUTTONS (custom buttons users add to their tab) ============
CREATE TABLE public.tab_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES public.user_tabs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'message', -- 'message' | 'reward' | 'js'
  action_payload TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tab_buttons ENABLE ROW LEVEL SECURITY;

-- ============ CHAT MESSAGES (one global room) ============
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============ ACHIEVEMENTS (created by staff) ============
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🏆',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.achievement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (achievement_id, user_id)
);
ALTER TABLE public.achievement_grants ENABLE ROW LEVEL SECURITY;

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tabs_updated BEFORE UPDATE ON public.user_tabs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Auto-create profile + tab + role on signup ============
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

  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, uname);

  INSERT INTO public.user_tabs (user_id, name, emoji)
  VALUES (NEW.id, uname || '''s Tab', '📄');

  IF NEW.email = 'sy279322@student.omsd.net' THEN
    assigned_role := 'owner';
  ELSIF NEW.email = 'mn284807@student.omsd.net' THEN
    assigned_role := 'co_owner';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles: anyone signed in can read; only self can update; insert handled by trigger
CREATE POLICY "profiles read all signed in"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_roles: anyone signed in can read (to display badges); only staff can modify
CREATE POLICY "roles read all"
  ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles staff insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "roles staff update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "roles staff delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- user_tabs: read public ones (and own); write only own
CREATE POLICY "tabs read public or own"
  ON public.user_tabs FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "tabs update self"
  ON public.user_tabs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tab_buttons: read all (public tabs visible to all), write only own
CREATE POLICY "buttons read all"
  ON public.tab_buttons FOR SELECT TO authenticated USING (true);
CREATE POLICY "buttons insert self"
  ON public.tab_buttons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buttons update self"
  ON public.tab_buttons FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "buttons delete self"
  ON public.tab_buttons FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- chat_messages: read all; insert as self; delete self or staff
CREATE POLICY "chat read all"
  ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat insert self"
  ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat delete self or staff"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- achievements: read all; only staff create/edit/delete
CREATE POLICY "ach read all"
  ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ach staff insert"
  ON public.achievements FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "ach staff update"
  ON public.achievements FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "ach staff delete"
  ON public.achievements FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- achievement_grants: read all; only staff grant; users can see their own
CREATE POLICY "grants read all"
  ON public.achievement_grants FOR SELECT TO authenticated USING (true);
CREATE POLICY "grants staff insert"
  ON public.achievement_grants FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND granted_by = auth.uid());
CREATE POLICY "grants staff delete"
  ON public.achievement_grants FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
