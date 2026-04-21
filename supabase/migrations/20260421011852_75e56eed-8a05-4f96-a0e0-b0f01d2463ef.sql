-- Alter user_tabs: add position
ALTER TABLE public.user_tabs ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Allow tab inserts/deletes with role-based restrictions
CREATE POLICY "tabs insert self limited"
  ON public.user_tabs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_staff(auth.uid())
      OR public.has_role(auth.uid(), 'dev')
      OR (SELECT count(*) FROM public.user_tabs WHERE user_id = auth.uid()) < 1
    )
  );

CREATE POLICY "tabs delete self staff or dev"
  ON public.user_tabs FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'dev'))
  );

-- tab_blocks
CREATE TABLE public.tab_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id uuid NOT NULL REFERENCES public.user_tabs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  block_type text NOT NULL DEFAULT 'text',
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  gradient_mode text NOT NULL DEFAULT 'none',
  gradient_from text NOT NULL DEFAULT '',
  gradient_to text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tab_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks read public or own"
  ON public.tab_blocks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tabs t
      WHERE t.id = tab_blocks.tab_id
        AND (t.is_public = true OR t.user_id = auth.uid())
    )
  );
CREATE POLICY "blocks insert self" ON public.tab_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blocks update self" ON public.tab_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blocks delete self" ON public.tab_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER tab_blocks_touch BEFORE UPDATE ON public.tab_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- inventory_items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.tab_blocks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'other',
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📦',
  quantity integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv read public or own"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tab_blocks b JOIN public.user_tabs t ON t.id=b.tab_id
      WHERE b.id = inventory_items.block_id AND (t.is_public=true OR t.user_id=auth.uid())
    )
  );
CREATE POLICY "inv insert self" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv update self" ON public.inventory_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inv delete self" ON public.inventory_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- garden_plants
CREATE TABLE public.garden_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.tab_blocks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'New Plant',
  emoji text NOT NULL DEFAULT '🌱',
  plant_type text NOT NULL DEFAULT 'Tulip',
  level integer NOT NULL DEFAULT 1,
  food integer NOT NULL DEFAULT 100,
  water integer NOT NULL DEFAULT 100,
  happiness integer NOT NULL DEFAULT 100,
  noodles_per_hour integer NOT NULL DEFAULT 1,
  is_equipped boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garden_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "garden read public or own"
  ON public.garden_plants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tab_blocks b JOIN public.user_tabs t ON t.id=b.tab_id
      WHERE b.id = garden_plants.block_id AND (t.is_public=true OR t.user_id=auth.uid())
    )
  );
CREATE POLICY "garden insert self" ON public.garden_plants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "garden update self" ON public.garden_plants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "garden delete self" ON public.garden_plants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- tab_buttons additions
ALTER TABLE public.tab_buttons
  ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.tab_blocks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS cost_currency text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cost_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_item text NOT NULL DEFAULT '';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tab_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_plants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tab_buttons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_tabs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

ALTER TABLE public.tab_blocks REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.garden_plants REPLICA IDENTITY FULL;
ALTER TABLE public.tab_buttons REPLICA IDENTITY FULL;
ALTER TABLE public.user_tabs REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;