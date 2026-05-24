
-- ============ ARENA TABLES ============
CREATE TABLE public.arena_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('solo','duo','trio','blitz')),
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','active','done','cancelled')),
  max_players int NOT NULL,
  round_no int NOT NULL DEFAULT 0,
  round_deadline timestamptz,
  winner_team int,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  special_window_end timestamptz
);

CREATE TABLE public.arena_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.arena_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team int NOT NULL,
  slot int NOT NULL,
  hp int NOT NULL DEFAULT 100,
  ready boolean NOT NULL DEFAULT false,
  current_move text,
  locked_move text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

CREATE TABLE public.arena_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.arena_matches(id) ON DELETE CASCADE,
  round_no int NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_rounds  ENABLE ROW LEVEL SECURITY;

-- arena_matches policies: everyone signed-in can read; creator can update; anyone can insert as self
CREATE POLICY "matches read all" ON public.arena_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches insert self" ON public.arena_matches FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "matches update participant" ON public.arena_matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.arena_players p WHERE p.match_id = arena_matches.id AND p.user_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "matches delete creator" ON public.arena_matches FOR DELETE TO authenticated USING (created_by = auth.uid());

-- arena_players policies: everyone signed-in can read; can insert/update self
CREATE POLICY "players read all" ON public.arena_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "players insert self" ON public.arena_players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "players update self" ON public.arena_players FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "players delete self" ON public.arena_players FOR DELETE TO authenticated USING (user_id = auth.uid());

-- arena_rounds: read all, insert by participants
CREATE POLICY "rounds read all" ON public.arena_rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "rounds insert participant" ON public.arena_rounds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.arena_players p WHERE p.match_id = arena_rounds.match_id AND p.user_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_rounds;
ALTER TABLE public.arena_matches REPLICA IDENTITY FULL;
ALTER TABLE public.arena_players REPLICA IDENTITY FULL;
ALTER TABLE public.arena_rounds  REPLICA IDENTITY FULL;

-- ============ REWARD RPCs ============
-- Bypass the protect_profile_columns trigger by running as definer.
CREATE OR REPLACE FUNCTION public.grant_currency(_noodles int DEFAULT 0, _lumina int DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _noodles < 0 OR _lumina < 0 THEN RAISE EXCEPTION 'Negative amounts not allowed'; END IF;
  -- Clamp to a reasonable per-call ceiling to limit abuse from sandboxed HTML
  IF _noodles > 200000000 OR _lumina > 200000 THEN RAISE EXCEPTION 'Amount exceeds per-call ceiling'; END IF;
  UPDATE public.profiles
     SET noodles = COALESCE(noodles,0) + COALESCE(_noodles,0),
         lumina  = COALESCE(lumina,0)  + COALESCE(_lumina,0),
         updated_at = now()
   WHERE user_id = uid;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_inventory_item(_name text, _emoji text DEFAULT '📦', _category text DEFAULT 'gacha', _qty int DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prop_id uuid;
  inv_block uuid;
  existing uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _qty IS NULL OR _qty < 1 OR _qty > 100 THEN _qty := 1; END IF;
  -- Find this user's first property tab
  SELECT id INTO prop_id FROM public.user_tabs
   WHERE user_id = uid AND kind = 'property' ORDER BY created_at ASC LIMIT 1;
  IF prop_id IS NULL THEN RETURN; END IF;
  -- Find or create an inventory block
  SELECT id INTO inv_block FROM public.tab_blocks
   WHERE tab_id = prop_id AND block_type = 'inventory' ORDER BY position ASC LIMIT 1;
  IF inv_block IS NULL THEN
    INSERT INTO public.tab_blocks (tab_id, user_id, block_type, position, data)
    VALUES (prop_id, uid, 'inventory', 99, '{}'::jsonb)
    RETURNING id INTO inv_block;
  END IF;
  -- Stack if same name already exists
  SELECT id INTO existing FROM public.inventory_items
   WHERE block_id = inv_block AND user_id = uid AND name = _name LIMIT 1;
  IF existing IS NOT NULL THEN
    UPDATE public.inventory_items SET quantity = quantity + _qty WHERE id = existing;
  ELSE
    INSERT INTO public.inventory_items (block_id, user_id, name, emoji, category, quantity, position)
    VALUES (inv_block, uid, _name, COALESCE(NULLIF(_emoji,''),'📦'), COALESCE(NULLIF(_category,''),'gacha'), _qty,
            COALESCE((SELECT MAX(position)+1 FROM public.inventory_items WHERE block_id = inv_block), 0));
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.grant_currency(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_inventory_item(text,text,text,int) TO authenticated;

-- Allow "arena" as a tab kind via the natural enum (kind is plain text; no constraint to change)
