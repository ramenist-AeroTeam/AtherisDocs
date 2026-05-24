
-- 1. Profiles: hide email column from authenticated reads
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, display_name, avatar_emoji, avatar_url,
  level, xp, noodles, lumina, font_pref, dev_build,
  tutorial_seen, created_at, updated_at
) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_emoji, avatar_url, font_pref, tutorial_seen) ON public.profiles TO authenticated;

-- 2. Block self-update of privileged columns via trigger
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / postgres to update anything
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.noodles IS DISTINCT FROM OLD.noodles
     OR NEW.lumina IS DISTINCT FROM OLD.lumina
     OR NEW.dev_build IS DISTINCT FROM OLD.dev_build
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Privileged profile columns cannot be modified by the user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- 3. user_roles: prevent self-escalation even by staff
DROP POLICY IF EXISTS "roles staff insert" ON public.user_roles;
CREATE POLICY "roles staff insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "roles staff update" ON public.user_roles;
CREATE POLICY "roles staff update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (is_staff(auth.uid()) AND user_id <> auth.uid());

-- 4. Storage: restrict bucket listing to owner-folder for authenticated API.
-- Public CDN serving of public buckets is unaffected.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "tab-html public read" ON storage.objects;

CREATE POLICY "avatars owner list"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "tab-html owner list"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tab-html' AND (auth.uid())::text = (storage.foldername(name))[1]);
