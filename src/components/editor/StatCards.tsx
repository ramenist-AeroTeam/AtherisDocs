import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  user_id: string; display_name: string; avatar_emoji: string;
  level: number; xp: number; noodles: number; lumina: number;
};
type InventoryItem = { id: string; user_id: string; name: string; emoji: string; category: string; quantity: number };
type Plant = { id: string; user_id: string; name: string; emoji: string; level: number; happiness: number; water: number; food: number; noodles_per_hour: number };

export function StatCards({ ownerId }: { ownerId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inv, setInv] = useState<InventoryItem[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [p, i, g] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", ownerId).maybeSingle(),
        supabase.from("inventory_items").select("*").eq("user_id", ownerId).order("position"),
        supabase.from("garden_plants").select("*").eq("user_id", ownerId).order("position"),
      ]);
      if (!mounted) return;
      setProfile((p.data as Profile) || null);
      setInv((i.data as InventoryItem[]) || []);
      setPlants((g.data as Plant[]) || []);
    };
    load();
    const ch = supabase.channel(`stats:${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${ownerId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items", filter: `user_id=eq.${ownerId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_plants", filter: `user_id=eq.${ownerId}` }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [ownerId]);

  if (!profile) return null;

  return (
    <div data-tour="stats" className="max-w-4xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-4">
      <Card title="Profile" emoji={profile.avatar_emoji}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{profile.avatar_emoji}</div>
          <div>
            <div className="font-semibold">{profile.display_name}</div>
            <div className="text-xs text-muted-foreground">Level {profile.level} · {profile.xp} XP</div>
          </div>
        </div>
      </Card>
      <Card title="Currency" emoji="💰">
        <div className="flex gap-2 flex-wrap">
          <Pill bg="hsl(38 92% 95%)" fg="hsl(30 70% 25%)" border="hsl(38 80% 80%)">🍜 {profile.noodles.toLocaleString()} noodles</Pill>
          <Pill bg="hsl(195 80% 95%)" fg="hsl(200 60% 25%)" border="hsl(195 70% 80%)">✦ {profile.lumina.toLocaleString()} lumina</Pill>
        </div>
      </Card>
      <Card title={`Inventory (${inv.length})`} emoji="🎒">
        {inv.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {inv.slice(0, 24).map((it) => (
              <span key={it.id} className="px-2 py-1 rounded-md border bg-muted/30 text-xs flex items-center gap-1">
                <span>{it.emoji}</span>{it.name}{it.quantity > 1 && <span className="text-muted-foreground">×{it.quantity}</span>}
              </span>
            ))}
          </div>
        )}
      </Card>
      <Card title={`Garden (${plants.length})`} emoji="🌱">
        {plants.length === 0 ? (
          <p className="text-xs text-muted-foreground">No plants yet.</p>
        ) : (
          <div className="space-y-1.5">
            {plants.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-base">{p.emoji}</span>
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">Lv {p.level}</span>
                <span className="ml-auto text-muted-foreground">🍜 {p.noodles_per_hour}/h</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <span>{emoji}</span>{title}
      </div>
      {children}
    </div>
  );
}

function Pill({ children, bg, fg, border }: { children: React.ReactNode; bg: string; fg: string; border: string }) {
  return (
    <span className="px-2.5 h-7 inline-flex items-center rounded-md border text-sm font-medium" style={{ background: bg, color: fg, borderColor: border }}>
      {children}
    </span>
  );
}
