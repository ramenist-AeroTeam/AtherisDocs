import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Zap, Swords, BookOpen, Shield } from "lucide-react";
import { SideViewMatch } from "./arena/SideViewMatch";
import { Roster } from "./arena/Roster";
import type { Template, Warrior } from "./arena/types";
import { scaleStat } from "./arena/types";

type View = "lobby" | "picker" | "roster" | "match";
type Mode = "solo" | "blitz";

const MODES: { id: Mode; label: string; icon: string; tag: string; color: string }[] = [
  { id: "solo",  label: "Showdown", icon: "⚔️", tag: "1v1", color: "hsl(220 80% 55%)" },
  { id: "blitz", label: "Blitz",    icon: "⚡", tag: "Fast", color: "hsl(0 80% 55%)" },
];

export function ArenaTab({ tabId: _tabId, myUserId }: { tabId: string; myUserId: string }) {
  const [view, setView] = useState<View>("lobby");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [mode, setMode] = useState<Mode>("solo");

  const load = async () => {
    const [t, w] = await Promise.all([
      supabase.from("warrior_templates").select("*").eq("is_active", true).order("created_at"),
      supabase.from("user_warriors").select("*").eq("user_id", myUserId),
    ]);
    setTemplates((t.data as Template[]) || []);
    let list = (w.data as Warrior[]) || [];
    if (list.length === 0) {
      await supabase.rpc("grant_starter_warrior");
      const re = await supabase.from("user_warriors").select("*").eq("user_id", myUserId);
      list = (re.data as Warrior[]) || [];
    }
    if (list.length > 0 && !list.some(x => x.is_equipped)) {
      await supabase.from("user_warriors").update({ is_equipped: true }).eq("id", list[0].id);
      list[0].is_equipped = true;
    }
    setWarriors(list);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [myUserId]);

  const equipped = warriors.find(w => w.is_equipped) || warriors[0];
  const equippedTemplate = templates.find(t => t.id === equipped?.template_id);

  const equip = async (id: string) => {
    await supabase.from("user_warriors").update({ is_equipped: false }).eq("user_id", myUserId);
    await supabase.from("user_warriors").update({ is_equipped: true }).eq("id", id);
    load();
  };

  if (view === "match" && equipped && equippedTemplate) {
    // Pick an opponent template (just the equipped one for now; bots mirror)
    const oppTemplate = templates[Math.floor(Math.random() * templates.length)] || equippedTemplate;
    return (
      <div className="fixed inset-0 z-50">
        <SideViewMatch
          me={{ user_id: myUserId, display_name: "You" }}
          myWarrior={equipped} myTemplate={equippedTemplate}
          opponentTemplate={oppTemplate} mode={mode}
          onExit={() => { load(); setView("lobby"); }}
        />
      </div>
    );
  }

  if (view === "roster") {
    return (
      <Roster warriors={warriors} templates={templates}
        equippedId={equipped?.id || null}
        onEquip={equip} onUpgraded={load} onBack={() => setView("lobby")} />
    );
  }

  if (view === "picker") {
    return (
      <ModePicker mode={mode} onPick={(m) => { setMode(m); setView("lobby"); }} onBack={() => setView("lobby")} />
    );
  }

  return (
    <Lobby
      equipped={equipped} equippedTemplate={equippedTemplate}
      mode={mode}
      onPlay={() => setView("match")}
      onPickMode={() => setView("picker")}
      onRoster={() => setView("roster")}
    />
  );
}

function Lobby({ equipped, equippedTemplate, mode, onPlay, onPickMode, onRoster }: {
  equipped: Warrior | undefined; equippedTemplate: Template | undefined;
  mode: Mode; onPlay: () => void; onPickMode: () => void; onRoster: () => void;
}) {
  const modeMeta = MODES.find(m => m.id === mode)!;
  return (
    <div className="grid md:grid-cols-[80px_1fr_380px] gap-4 p-4 min-h-full">
      {/* Left rail */}
      <div className="flex md:flex-col gap-2">
        <RailBtn icon={<Trophy className="h-5 w-5" />} label="Trophies" />
        <RailBtn icon={<BookOpen className="h-5 w-5" />} label="EXP" />
        <RailBtn icon={<Users className="h-5 w-5" />} label="Warriors" onClick={onRoster} highlight />
      </div>

      {/* Center stage */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(circle at 50% 80%, hsl(220 90% 50%), transparent 60%)" }} />
        {equippedTemplate ? (
          <div className="relative text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1 flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3" /> {equipped?.trophies ?? 0}
            </div>
            <div className="font-display text-5xl font-black tracking-tight">{equippedTemplate.name.toUpperCase()}</div>
            <div className="text-white/60 text-sm mt-1">{equippedTemplate.tagline}</div>
            {equippedTemplate.icon_url ? (
              <img src={equippedTemplate.icon_url} alt="" className="w-72 h-72 object-contain mx-auto mt-2 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" />
            ) : (
              <div className="text-9xl mt-2">{equippedTemplate.emoji}</div>
            )}
            {equipped && equippedTemplate && (
              <div className="flex items-center justify-center gap-2 mt-2 text-xs font-mono">
                <span className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-400/40">
                  HP {scaleStat(equippedTemplate.hp_base, equippedTemplate.hp_max, equipped.hp_level, equippedTemplate.max_level).toLocaleString()}
                </span>
                <span className="px-2 py-1 rounded bg-rose-500/20 border border-rose-400/40">
                  {equippedTemplate.main_attack_name} {scaleStat(equippedTemplate.main_dmg_base, equippedTemplate.main_dmg_max, equipped.main_level, equippedTemplate.max_level)}
                </span>
                <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400/40">
                  {equippedTemplate.mega_attack_name} {scaleStat(equippedTemplate.mega_dmg_base, equippedTemplate.mega_dmg_max, equipped.mega_level, equippedTemplate.max_level)}!
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/60">Loading roster…</div>
        )}
      </div>

      {/* Right column: mode picker + PLAY */}
      <div className="flex flex-col gap-3">
        <button onClick={onPickMode}
          className="rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 p-5 text-left transition">
          <div className="text-xs uppercase tracking-widest text-white/60">Game Mode</div>
          <div className="font-display text-3xl font-black mt-1">{modeMeta.icon} {modeMeta.label}</div>
          <div className="text-sm text-white/60">{modeMeta.tag} · click to change</div>
        </button>

        <button onClick={onPlay} disabled={!equipped}
          className="flex-1 min-h-[200px] rounded-3xl font-display text-6xl font-black tracking-wider
            bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950 border-4 border-yellow-200
            shadow-[0_10px_40px_-8px_rgba(255,200,0,0.7)] hover:scale-[1.02] active:scale-95 transition disabled:opacity-40">
          PLAY
        </button>

        <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/70">
          <div className="font-bold text-white mb-1">Controls</div>
          <div className="grid grid-cols-2 gap-1 font-mono">
            <span>A / D</span><span>Move</span>
            <span>W / Space</span><span>Jump</span>
            <span>1</span><span>Main attack</span>
            <span>2</span><span>Mega attack</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModePicker({ mode, onPick, onBack }: { mode: Mode; onPick: (m: Mode) => void; onBack: () => void }) {
  return (
    <div className="p-6">
      <button onClick={onBack} className="text-sm text-white/70 hover:text-white mb-4">← Back</button>
      <div className="grid sm:grid-cols-2 gap-4">
        {MODES.map(m => (
          <button key={m.id} onClick={() => onPick(m.id)}
            className={`p-6 rounded-2xl border-2 text-left transition
              ${m.id === mode ? "border-white bg-white/15" : "border-white/15 bg-white/5 hover:bg-white/10"}`}>
            <div className="text-5xl">{m.icon}</div>
            <div className="font-display text-2xl font-black mt-2">{m.label}</div>
            <div className="text-white/60 text-sm">{m.tag}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RailBtn({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex md:flex-col items-center justify-center gap-1 p-3 rounded-2xl border transition w-full
        ${highlight ? "bg-amber-400/20 border-amber-300/50 text-amber-100 hover:bg-amber-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
