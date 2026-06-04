
ALTER TABLE public.warrior_templates
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS battle_sprite_url text,
  ADD COLUMN IF NOT EXISTS draw_gif_url text,
  ADD COLUMN IF NOT EXISTS lose_gif_url text,
  ADD COLUMN IF NOT EXISTS win_gif_url text;

UPDATE public.warrior_templates
SET name = 'Tori',
    emoji = '🐢',
    tagline = 'A brave little turtle. Slow and steady.',
    icon_url = '/__l5e/assets-v1/3ecc92e9-3f10-4bbf-917c-a47568d88847/Tori_Icon.png',
    battle_sprite_url = '/__l5e/assets-v1/8506c662-ee08-4801-a93c-ab22a9c1d186/Tori_Battle_Sprite.png',
    draw_gif_url = '/__l5e/assets-v1/5e556a25-cf48-4297-a3db-cff4d3851c5b/Tori_Draw.gif',
    lose_gif_url = '/__l5e/assets-v1/18763553-8b10-463d-a388-063bd446fedd/Tori_Lose.gif',
    win_gif_url = '/__l5e/assets-v1/edd53735-66f2-4d1c-a9ce-f8a405b18c1c/Tori_winselect.gif'
WHERE rarity = 'common'
  AND id = (SELECT id FROM public.warrior_templates WHERE rarity = 'common' ORDER BY created_at LIMIT 1);
