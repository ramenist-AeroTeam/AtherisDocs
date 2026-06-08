export type Template = {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  tagline: string;
  icon_url: string | null;
  battle_sprite_url: string | null;
  win_gif_url: string | null;
  lose_gif_url: string | null;
  draw_gif_url: string | null;
  main_attack_name: string;
  main_dmg_base: number;
  main_dmg_max: number;
  main_cooldown_ms: number;
  main_range: number;
  mega_attack_name: string;
  mega_dmg_base: number;
  mega_dmg_max: number;
  mega_cooldown_ms: number;
  mega_range: number;
  hp_base: number;
  hp_max: number;
  speed: number;
  max_level: number;
  is_active: boolean;
};

export type Warrior = {
  id: string;
  user_id: string;
  template_id: string;
  nickname: string;
  trophies: number;
  hp_level: number;
  main_level: number;
  mega_level: number;
  weapon_1_level: number;
  weapon_2_level: number;
  is_equipped: boolean;
};

// Linear interpolation between base (level 1) and max (level max_level)
export function scaleStat(base: number, max: number, level: number, maxLevel: number) {
  if (maxLevel <= 1) return base;
  const t = Math.max(0, Math.min(1, (level - 1) / (maxLevel - 1)));
  return Math.round(base + (max - base) * t);
}

export function upgradeCost(level: number) {
  return 100 * level * level;
}

export const RARITY: Record<string, { color: string; label: string }> = {
  common:    { color: "hsl(220 12% 60%)", label: "Common" },
  rare:      { color: "hsl(200 90% 55%)", label: "Rare" },
  epic:      { color: "hsl(280 80% 60%)", label: "Epic" },
  legendary: { color: "hsl(38 95% 55%)",  label: "Legendary" },
};
