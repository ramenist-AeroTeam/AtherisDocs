import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Heart, Swords, Flame, ChevronLeft } from "lucide-react";
import type { Template, Warrior } from "./types";
import { RARITY, scaleStat, upgradeCost } from "./types";

export function Roster({
  warriors, templates, equippedId, onEquip, onUpgraded, onBack,
}: {
  warriors: Warrior[];
  templates: Template[];
  equippedId: string | null;
  onEquip: (id: string) => void;
  onUpgraded: () => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(warriors[0]?.id || null);
  const w = warriors.find(x => x.id === selectedId) || warriors[0];
  const t = templates.find(x => x.id === w?.template_id);

  if (!w || !t) {
    return (
      <div className="p-8 text-white/70">No warriors yet.</div>
    );
  }

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 p-4">
      {/* Warrior list */}
      <div className="space-y-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-white/70 hover:text-white mb-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {warriors.map(wr => {
          const tt = templates.find(x => x.id === wr.template_id);
          const isSel = wr.id === selectedId;
          return (
            <button key={wr.id} onClick={() => setSelectedId(wr.id)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition
                ${isSel ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
              {tt?.icon_url ? <img src={tt.icon_url} className="w-12 h-12 object-contain" alt="" />
                : <div className="w-12 h-12 grid place-items-center text-3xl">{tt?.emoji}</div>}
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold truncate">{tt?.name}</div>
                <div className="text-xs flex items-center gap-1 text-amber-300"><Trophy className="h-3 w-3" />{wr.trophies}</div>
              </div>
              {wr.id === equippedId && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">EQUIPPED</span>}
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <WarriorDetail key={w.id} warrior={w} template={t}
        isEquipped={w.id === equippedId}
        onEquip={() => onEquip(w.id)} onUpgraded={onUpgraded} />
    </div>
  );
}

function WarriorDetail({ warrior, template, isEquipped, onEquip, onUpgraded }: {
  warrior: Warrior; template: Template; isEquipped: boolean; onEquip: () => void; onUpgraded: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const hp = scaleStat(template.hp_base, template.hp_max, warrior.hp_level, template.max_level);
  const main = scaleStat(template.main_dmg_base, template.main_dmg_max, warrior.main_level, template.max_level);
  const mega = scaleStat(template.mega_dmg_base, template.mega_dmg_max, warrior.mega_level, template.max_level);

  const rarity = RARITY[template.rarity] || RARITY.common;

  const upgrade = async (stat: "hp" | "main" | "mega") => {
    setBusy(stat); setErr(null);
    const { error } = await supabase.rpc("upgrade_warrior_stat", { _warrior_id: warrior.id, _stat: stat });
    setBusy(null);
    if (error) setErr(error.message);
    else onUpgraded();
  };

  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-white/10 to-white/5 border border-white/15">
      <div className="flex items-start gap-5">
        <div className="shrink-0 w-44 h-44 rounded-2xl grid place-items-center"
          style={{ background: `radial-gradient(circle at 50% 30%, ${rarity.color}55, transparent 70%)`, border: `2px solid ${rarity.color}` }}>
          {template.icon_url ? <img src={template.icon_url} className="w-40 h-40 object-contain" alt="" />
            : <div className="text-7xl">{template.emoji}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: rarity.color }}>{rarity.label}</div>
          <div className="font-display text-3xl font-black">{template.name}</div>
          <div className="text-white/70 text-sm mt-1">{template.tagline}</div>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs font-mono flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {warrior.trophies}
            </span>
            <button onClick={onEquip} disabled={isEquipped}
              className={`px-3 py-1 rounded text-xs font-bold border transition
                ${isEquipped ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-100"
                  : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
              {isEquipped ? "Equipped" : "Equip"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <StatRow icon={<Heart className="h-4 w-4" />} color="hsl(140 80% 55%)"
          label="Health" value={hp} level={warrior.hp_level} max={template.max_level}
          busy={busy === "hp"} onUp={() => upgrade("hp")} />
        <StatRow icon={<Swords className="h-4 w-4" />} color="hsl(0 85% 60%)"
          label={template.main_attack_name} value={main} level={warrior.main_level} max={template.max_level}
          busy={busy === "main"} onUp={() => upgrade("main")} />
        <StatRow icon={<Flame className="h-4 w-4" />} color="hsl(45 100% 60%)"
          label={template.mega_attack_name + " (mega)"} value={mega} level={warrior.mega_level} max={template.max_level}
          busy={busy === "mega"} onUp={() => upgrade("mega")} />
      </div>

      {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}
      <div className="mt-3 text-xs text-white/50">
        Upgrades cost <span className="font-mono">{upgradeCost(Math.min(warrior.hp_level, warrior.main_level, warrior.mega_level))}+</span> 🍜 + 1 Noodle Packet per level.
      </div>
    </div>
  );
}

function StatRow({ icon, color, label, value, level, max, busy, onUp }: {
  icon: React.ReactNode; color: string; label: string; value: number; level: number; max: number; busy: boolean; onUp: () => void;
}) {
  const maxed = level >= max;
  const cost = upgradeCost(level);
  return (
    <div className="rounded-xl p-3 bg-black/30 border border-white/10">
      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color }}>{icon}{label}</div>
      <div className="font-mono font-black text-2xl mt-1">{value.toLocaleString()}</div>
      <div className="text-[11px] text-white/60 mb-2">Lv {level} / {max}</div>
      <button onClick={onUp} disabled={busy || maxed}
        className="w-full text-xs font-bold py-1.5 rounded border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-40">
        {maxed ? "MAX" : busy ? "..." : `Upgrade · ${cost.toLocaleString()} 🍜 + 👝`}
      </button>
    </div>
  );
}
