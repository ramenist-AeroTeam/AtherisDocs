
-- 1. Extend warrior_templates with balance fields
ALTER TABLE public.warrior_templates
  ADD COLUMN IF NOT EXISTS main_attack_name text NOT NULL DEFAULT 'Strike',
  ADD COLUMN IF NOT EXISTS main_dmg_base integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS main_dmg_max integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS mega_attack_name text NOT NULL DEFAULT 'Mega',
  ADD COLUMN IF NOT EXISTS mega_dmg_base integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS mega_dmg_max integer NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS hp_base integer NOT NULL DEFAULT 4000,
  ADD COLUMN IF NOT EXISTS hp_max integer NOT NULL DEFAULT 10500,
  ADD COLUMN IF NOT EXISTS speed integer NOT NULL DEFAULT 220,
  ADD COLUMN IF NOT EXISTS main_cooldown_ms integer NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS mega_cooldown_ms integer NOT NULL DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS main_range integer NOT NULL DEFAULT 140,
  ADD COLUMN IF NOT EXISTS mega_range integer NOT NULL DEFAULT 220,
  ADD COLUMN IF NOT EXISTS max_level integer NOT NULL DEFAULT 12;

-- 2. Extend user_warriors with stat levels
ALTER TABLE public.user_warriors
  ADD COLUMN IF NOT EXISTS hp_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS main_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mega_level integer NOT NULL DEFAULT 1;

-- 3. New upgrade RPC for stat (hp / main / mega)
CREATE OR REPLACE FUNCTION public.upgrade_warrior_stat(_warrior_id uuid, _stat text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  w public.user_warriors;
  tmpl public.warrior_templates;
  curr_level integer;
  noodle_cost integer;
  packet_row public.inventory_items;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _stat NOT IN ('hp','main','mega') THEN RAISE EXCEPTION 'Bad stat'; END IF;
  SELECT * INTO w FROM public.user_warriors WHERE id = _warrior_id AND user_id = uid;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Warrior not found'; END IF;
  SELECT * INTO tmpl FROM public.warrior_templates WHERE id = w.template_id;
  curr_level := CASE _stat WHEN 'hp' THEN w.hp_level WHEN 'main' THEN w.main_level ELSE w.mega_level END;
  IF curr_level >= tmpl.max_level THEN RAISE EXCEPTION 'Max level'; END IF;
  noodle_cost := 100 * curr_level * curr_level;
  IF (SELECT noodles FROM public.profiles WHERE user_id = uid) < noodle_cost THEN
    RAISE EXCEPTION 'Not enough noodles (need %)', noodle_cost;
  END IF;
  SELECT i.* INTO packet_row FROM public.inventory_items i
   WHERE i.user_id = uid AND lower(i.name) LIKE '%noodle packet%' AND i.quantity >= 1
   ORDER BY i.quantity DESC LIMIT 1;
  IF packet_row.id IS NULL THEN RAISE EXCEPTION 'You need a Noodle Packet'; END IF;
  UPDATE public.profiles SET noodles = noodles - noodle_cost, updated_at = now() WHERE user_id = uid;
  IF packet_row.quantity = 1 THEN DELETE FROM public.inventory_items WHERE id = packet_row.id;
  ELSE UPDATE public.inventory_items SET quantity = quantity - 1 WHERE id = packet_row.id; END IF;
  IF _stat = 'hp' THEN UPDATE public.user_warriors SET hp_level = hp_level + 1 WHERE id = _warrior_id;
  ELSIF _stat = 'main' THEN UPDATE public.user_warriors SET main_level = main_level + 1 WHERE id = _warrior_id;
  ELSE UPDATE public.user_warriors SET mega_level = mega_level + 1 WHERE id = _warrior_id; END IF;
  RETURN jsonb_build_object('ok', true, 'new_level', curr_level + 1, 'noodles_spent', noodle_cost);
END; $$;

-- 4. Apply damage to an arena_players row (caller must be in the same match)
CREATE OR REPLACE FUNCTION public.arena_apply_damage(_target_player_id uuid, _amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  target public.arena_players;
  in_match boolean;
  new_hp integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 50000 THEN RAISE EXCEPTION 'Bad amount'; END IF;
  SELECT * INTO target FROM public.arena_players WHERE id = _target_player_id;
  IF target.id IS NULL THEN RAISE EXCEPTION 'Target not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.arena_players WHERE match_id = target.match_id AND user_id = uid)
    INTO in_match;
  IF NOT in_match THEN RAISE EXCEPTION 'Not in match'; END IF;
  new_hp := GREATEST(0, target.hp - _amount);
  UPDATE public.arena_players SET hp = new_hp WHERE id = target.id;
  RETURN jsonb_build_object('ok', true, 'hp', new_hp);
END; $$;

-- 5. Admin upsert RPC for warrior templates (owner / co_owner only)
CREATE OR REPLACE FUNCTION public.admin_upsert_warrior_template(
  _id uuid,
  _name text,
  _emoji text,
  _rarity text,
  _tagline text,
  _icon_url text,
  _battle_sprite_url text,
  _win_gif_url text,
  _lose_gif_url text,
  _draw_gif_url text,
  _main_attack_name text,
  _main_dmg_base integer,
  _main_dmg_max integer,
  _main_cooldown_ms integer,
  _main_range integer,
  _mega_attack_name text,
  _mega_dmg_base integer,
  _mega_dmg_max integer,
  _mega_cooldown_ms integer,
  _mega_range integer,
  _hp_base integer,
  _hp_max integer,
  _speed integer,
  _max_level integer,
  _is_active boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  out_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Staff only'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.warrior_templates(
      name, emoji, rarity, tagline, icon_url, battle_sprite_url,
      win_gif_url, lose_gif_url, draw_gif_url,
      main_attack_name, main_dmg_base, main_dmg_max, main_cooldown_ms, main_range,
      mega_attack_name, mega_dmg_base, mega_dmg_max, mega_cooldown_ms, mega_range,
      hp_base, hp_max, speed, max_level, is_active,
      weapon_1_name, weapon_2_name
    ) VALUES (
      _name, COALESCE(NULLIF(_emoji,''),'🗡️'), COALESCE(NULLIF(_rarity,''),'common'),
      COALESCE(_tagline,''), _icon_url, _battle_sprite_url,
      _win_gif_url, _lose_gif_url, _draw_gif_url,
      _main_attack_name, _main_dmg_base, _main_dmg_max, _main_cooldown_ms, _main_range,
      _mega_attack_name, _mega_dmg_base, _mega_dmg_max, _mega_cooldown_ms, _mega_range,
      _hp_base, _hp_max, _speed, _max_level, COALESCE(_is_active,true),
      _main_attack_name, _mega_attack_name
    ) RETURNING id INTO out_id;
  ELSE
    UPDATE public.warrior_templates SET
      name=_name, emoji=COALESCE(NULLIF(_emoji,''),emoji), rarity=COALESCE(NULLIF(_rarity,''),rarity),
      tagline=COALESCE(_tagline,tagline), icon_url=_icon_url, battle_sprite_url=_battle_sprite_url,
      win_gif_url=_win_gif_url, lose_gif_url=_lose_gif_url, draw_gif_url=_draw_gif_url,
      main_attack_name=_main_attack_name, main_dmg_base=_main_dmg_base, main_dmg_max=_main_dmg_max,
      main_cooldown_ms=_main_cooldown_ms, main_range=_main_range,
      mega_attack_name=_mega_attack_name, mega_dmg_base=_mega_dmg_base, mega_dmg_max=_mega_dmg_max,
      mega_cooldown_ms=_mega_cooldown_ms, mega_range=_mega_range,
      hp_base=_hp_base, hp_max=_hp_max, speed=_speed, max_level=_max_level,
      is_active=COALESCE(_is_active,is_active),
      weapon_1_name=_main_attack_name, weapon_2_name=_mega_attack_name
    WHERE id=_id RETURNING id INTO out_id;
  END IF;
  RETURN out_id;
END; $$;

-- 6. Seed Tori with the given balance numbers
UPDATE public.warrior_templates SET
  main_attack_name = 'Turtle Bite',
  main_dmg_base = 300, main_dmg_max = 5000,
  mega_attack_name = 'Turtle Kick',
  mega_dmg_base = 1000, mega_dmg_max = 10000,
  hp_base = 4000, hp_max = 10500,
  speed = 220, main_cooldown_ms = 900, mega_cooldown_ms = 6000,
  main_range = 140, mega_range = 220, max_level = 12,
  weapon_1_name = 'Turtle Bite', weapon_2_name = 'Turtle Kick'
WHERE lower(name) LIKE '%tori%';
