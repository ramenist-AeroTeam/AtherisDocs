
-- 1) Warrior templates (catalog)
CREATE TABLE public.warrior_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🗡️',
  rarity text NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  weapon_1_name text NOT NULL DEFAULT 'Weapon',
  weapon_1_emoji text NOT NULL DEFAULT '⚔️',
  weapon_2_name text NOT NULL DEFAULT 'Weapon',
  weapon_2_emoji text NOT NULL DEFAULT '🛡️',
  tagline text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.warrior_templates TO anon, authenticated;
GRANT ALL ON public.warrior_templates TO service_role;
ALTER TABLE public.warrior_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates read all" ON public.warrior_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates staff write" ON public.warrior_templates FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- 2) Owned warriors
CREATE TABLE public.user_warriors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.warrior_templates(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '',
  trophies integer NOT NULL DEFAULT 0,
  weapon_1_level integer NOT NULL DEFAULT 1,
  weapon_2_level integer NOT NULL DEFAULT 1,
  is_equipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_warriors_user_idx ON public.user_warriors(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_warriors TO authenticated;
GRANT ALL ON public.user_warriors TO service_role;
ALTER TABLE public.user_warriors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warriors read all" ON public.user_warriors FOR SELECT TO authenticated USING (true);
CREATE POLICY "warriors insert self" ON public.user_warriors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "warriors update self" ON public.user_warriors FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "warriors delete self" ON public.user_warriors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) Maps
CREATE TABLE public.arena_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🗺️',
  theme text NOT NULL DEFAULT 'default', -- spring, summer, autumn, winter, event
  bg_from text NOT NULL DEFAULT 'hsl(230 30% 12%)',
  bg_to text NOT NULL DEFAULT 'hsl(260 40% 18%)',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.arena_maps TO anon, authenticated;
GRANT ALL ON public.arena_maps TO service_role;
ALTER TABLE public.arena_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maps read all" ON public.arena_maps FOR SELECT TO authenticated USING (true);
CREATE POLICY "maps staff write" ON public.arena_maps FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

-- 4) Match chat
CREATE TABLE public.arena_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX arena_chat_match_idx ON public.arena_chat(match_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.arena_chat TO authenticated;
GRANT ALL ON public.arena_chat TO service_role;
ALTER TABLE public.arena_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat read all" ON public.arena_chat FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat insert self" ON public.arena_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat delete self or staff" ON public.arena_chat FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_staff(auth.uid()));

-- 5) Extend arena_matches and arena_players
ALTER TABLE public.arena_matches
  ADD COLUMN IF NOT EXISTS map_id uuid REFERENCES public.arena_maps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bot_match boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS match_deadline timestamptz;

ALTER TABLE public.arena_players
  ADD COLUMN IF NOT EXISTS warrior_id uuid REFERENCES public.user_warriors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_chat;

-- 7) RPC: upgrade weapon
CREATE OR REPLACE FUNCTION public.upgrade_warrior_weapon(_warrior_id uuid, _slot integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  w public.user_warriors;
  curr_level integer;
  noodle_cost integer;
  packet_cost integer := 1;
  packet_row public.inventory_items;
  prop_id uuid;
  inv_block uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _slot NOT IN (1,2) THEN RAISE EXCEPTION 'Bad slot'; END IF;
  SELECT * INTO w FROM public.user_warriors WHERE id = _warrior_id AND user_id = uid;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Warrior not found'; END IF;
  curr_level := CASE _slot WHEN 1 THEN w.weapon_1_level ELSE w.weapon_2_level END;
  IF curr_level >= 10 THEN RAISE EXCEPTION 'Max level'; END IF;
  noodle_cost := 100 * curr_level * curr_level;

  -- Check noodles
  IF (SELECT noodles FROM public.profiles WHERE user_id = uid) < noodle_cost THEN
    RAISE EXCEPTION 'Not enough noodles (need %)', noodle_cost;
  END IF;

  -- Find a noodle packet in any of user's inventory blocks
  SELECT i.* INTO packet_row FROM public.inventory_items i
   WHERE i.user_id = uid AND lower(i.name) LIKE '%noodle packet%' AND i.quantity >= packet_cost
   ORDER BY i.quantity DESC LIMIT 1;
  IF packet_row.id IS NULL THEN
    RAISE EXCEPTION 'You need a Noodle Packet';
  END IF;

  -- Charge resources
  UPDATE public.profiles SET noodles = noodles - noodle_cost, updated_at = now() WHERE user_id = uid;
  IF packet_row.quantity = packet_cost THEN
    DELETE FROM public.inventory_items WHERE id = packet_row.id;
  ELSE
    UPDATE public.inventory_items SET quantity = quantity - packet_cost WHERE id = packet_row.id;
  END IF;

  -- Bump level
  IF _slot = 1 THEN
    UPDATE public.user_warriors SET weapon_1_level = weapon_1_level + 1 WHERE id = _warrior_id;
  ELSE
    UPDATE public.user_warriors SET weapon_2_level = weapon_2_level + 1 WHERE id = _warrior_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'new_level', curr_level + 1, 'noodles_spent', noodle_cost);
END; $$;

-- 8) RPC: grant starter warrior if none owned
CREATE OR REPLACE FUNCTION public.grant_starter_warrior()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  existing uuid;
  starter_template uuid;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO existing FROM public.user_warriors WHERE user_id = uid LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  SELECT id INTO starter_template FROM public.warrior_templates WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  IF starter_template IS NULL THEN RAISE EXCEPTION 'No starter templates available'; END IF;
  INSERT INTO public.user_warriors (user_id, template_id, is_equipped)
  VALUES (uid, starter_template, true) RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- 9) RPC: resolve trophies for a finished match
CREATE OR REPLACE FUNCTION public.award_arena_trophies(_match_id uuid, _winner_team integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT ap.warrior_id, ap.team, ap.is_bot
      FROM public.arena_players ap
     WHERE ap.match_id = _match_id AND ap.warrior_id IS NOT NULL AND ap.is_bot = false
  LOOP
    IF _winner_team = rec.team THEN
      UPDATE public.user_warriors SET trophies = trophies + 10 WHERE id = rec.warrior_id;
    ELSIF _winner_team <> 0 THEN
      UPDATE public.user_warriors SET trophies = GREATEST(0, trophies - 5) WHERE id = rec.warrior_id;
    END IF;
  END LOOP;
END; $$;

-- 10) Seed 3 starter warriors + 4 maps
INSERT INTO public.warrior_templates (name, emoji, rarity, weapon_1_name, weapon_1_emoji, weapon_2_name, weapon_2_emoji, tagline) VALUES
  ('Ramen Knight', '🍜', 'common', 'Broth Blade', '⚔️', 'Chopstick Shield', '🥢', 'A loyal defender forged in steaming broth.'),
  ('Lumina Mage', '✨', 'rare', 'Starlight Staff', '🪄', 'Prism Orb', '🔮', 'Channels the glow of distant stars.'),
  ('Void Rogue', '🌑', 'epic', 'Shadow Dagger', '🗡️', 'Smoke Bombs', '💣', 'Strikes from the dark, never seen twice.');

INSERT INTO public.arena_maps (name, emoji, theme, bg_from, bg_to, description) VALUES
  ('Noodle Plaza', '🍜', 'default', 'hsl(30 40% 14%)', 'hsl(20 60% 22%)', 'The default arena above a steaming ramen shop.'),
  ('Cherry Spring', '🌸', 'spring', 'hsl(340 50% 18%)', 'hsl(320 60% 28%)', 'Petals drift across the cobblestone.'),
  ('Frozen Falls', '❄️', 'winter', 'hsl(200 60% 12%)', 'hsl(220 70% 22%)', 'Icy winds. Slick footing.'),
  ('Festival Lights', '🎆', 'event', 'hsl(280 60% 14%)', 'hsl(320 70% 24%)', 'Limited-time event map.');
