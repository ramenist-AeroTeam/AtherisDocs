export type BlockType =
  | "header"
  | "stats"
  | "currency"
  | "inventory"
  | "garden"
  | "buttons"
  | "text"
  | "timer";

export type GradientMode = "none" | "auto" | "custom";

export type TabBlock = {
  id: string;
  tab_id: string;
  user_id: string;
  block_type: BlockType;
  position: number;
  data: any;
  gradient_mode: GradientMode;
  gradient_from: string;
  gradient_to: string;
};

export type InventoryItem = {
  id: string;
  block_id: string;
  user_id: string;
  category: string;
  name: string;
  emoji: string;
  quantity: number;
  position: number;
};

export type GardenPlant = {
  id: string;
  block_id: string;
  user_id: string;
  name: string;
  emoji: string;
  plant_type: string;
  level: number;
  food: number;
  water: number;
  happiness: number;
  noodles_per_hour: number;
  is_equipped: boolean;
  position: number;
};

export type TabButton = {
  id: string;
  tab_id: string;
  user_id: string;
  label: string;
  action_type: string;
  action_payload: string;
  position: number;
  block_id: string | null;
  color: string;
  cost_currency: string;
  cost_amount: number;
  reward_item: string;
};

export const INVENTORY_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "seeds", label: "Seeds", emoji: "🌱" },
  { key: "gear", label: "Gear", emoji: "⚙️" },
  { key: "pets", label: "Pets", emoji: "🐾" },
  { key: "fruits", label: "Fruits/Crops", emoji: "🍎" },
  { key: "cooking", label: "Cooking", emoji: "🍳" },
  { key: "cosmetics", label: "Cosmetics", emoji: "🎨" },
  { key: "titles", label: "Titles", emoji: "📛" },
  { key: "other", label: "Other", emoji: "❓" },
];

export const BUTTON_COLORS = [
  { key: "primary", label: "Primary", cls: "bg-primary text-primary-foreground hover:bg-primary/90" },
  { key: "secondary", label: "Secondary", cls: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
  { key: "success", label: "Success", cls: "bg-[hsl(142_70%_45%)] text-white hover:bg-[hsl(142_70%_40%)]" },
  { key: "warning", label: "Warning", cls: "bg-[hsl(38_92%_50%)] text-[hsl(30_60%_12%)] hover:bg-[hsl(38_92%_45%)]" },
  { key: "danger", label: "Danger", cls: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  { key: "info", label: "Info", cls: "bg-[hsl(195_90%_50%)] text-white hover:bg-[hsl(195_90%_45%)]" },
  { key: "purple", label: "Purple", cls: "bg-[hsl(280_80%_60%)] text-white hover:bg-[hsl(280_80%_55%)]" },
  { key: "outline", label: "Outline", cls: "border bg-background hover:bg-muted" },
];

export function buttonColorCls(key: string) {
  return BUTTON_COLORS.find((c) => c.key === key)?.cls || BUTTON_COLORS[0].cls;
}

export function gradientStyle(b: Pick<TabBlock, "gradient_mode" | "gradient_from" | "gradient_to">): React.CSSProperties {
  if (b.gradient_mode === "auto") {
    return {
      background: "linear-gradient(135deg, hsl(250 84% 58% / 0.08), hsl(280 90% 70% / 0.08), hsl(38 95% 55% / 0.08))",
    };
  }
  if (b.gradient_mode === "custom" && b.gradient_from && b.gradient_to) {
    return { background: `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})` };
  }
  return {};
}
