UPDATE public.warrior_templates SET is_active = true, icon_url = '/__l5e/assets-v1/9eee9749-3e0e-4bed-8cfe-1fa1cdfc88a4/max-icon.png', win_gif_url = '/__l5e/assets-v1/' || '' || '', tagline = 'Sparks first, questions later.', emoji = '⚡' WHERE name = 'Max';
UPDATE public.warrior_templates SET win_gif_url = NULL WHERE name = 'Max';
UPDATE public.warrior_templates SET tagline = 'Slow shell, fast bite.' WHERE name = 'Tori' AND (tagline IS NULL OR tagline = '');
UPDATE public.warrior_templates SET is_active = false WHERE name IN ('Void Rogue','Lumina Mage');