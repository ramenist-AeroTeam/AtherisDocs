import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Shield, Sparkles, Trophy, Clock, Plus, LogOut, Send, ArrowUp, Bot, Star, Crown, Gem, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avatarColor, avatarFg, initials } from "@/components/CornerChat";

// ============ Types ============
type Mode = "solo" | "duo" | "trio" | "blitz";
type Match = {
  id: string; mode: Mode; status: "lobby" | "active" | "done" | "cancelled";
  max_players: number; round_no: number; round_deadline: string | null;
  winner_team: number | null; created_by: string; created_at: string;
  started_at: string | null;
  special_window_end: string | null;
  map_id: string | null; is_bot_match: boolean; match_deadline: string | null;
};
type Player = {
  id: string; match_id: string; user_id: string; team: number; slot: number;
  hp: number; ready: boolean; current_move: string | null; locked_move: string | null;
  warrior_id: string | null; is_bot: boolean;
};
type Profile = { user_id: string; display_name: string; avatar_url: string | null };
type Template = {
  id: string; name: string; emoji: string; rarity: string; tagline: string;
  weapon_1_name: string; weapon_1_emoji: string; weapon_2_name: string; weapon_2_emoji: string;
  icon_url: string | null; battle_sprite_url: string | null;
  draw_gif_url: string | null; lose_gif_url: string | null; win_gif_url: string | null;
};
type Warrior = {
  id: string; user_id: string; template_id: string; nickname: string;
  trophies: number; weapon_1_level: number; weapon_2_level: number; is_equipped: boolean;
};
type ArenaMap = { id: string; name: string; emoji: string; theme: string; bg_from: string; bg_to: string; description: string; is_active: boolean };
type ChatMsg = { id: string; match_id: string; user_id: string; content: string; created_at: string };

const MODE_META: Record<Mode, { label: string; perTeam: number; teams: number; hp: number; roundMs: number; icon: string; color: string }> = {
  solo:  { label: "Solo (1v1)",  perTeam: 1, teams: 2, hp: 100, roundMs: 15000, icon: "⚔️", color: "hsl(220 80% 55%)" },
  duo:   { label: "Duo (2v2)",   perTeam: 2, teams: 2, hp: 120, roundMs: 15000, icon: "👥", color: "hsl(280 70% 55%)" },
  trio:  { label: "Trio (3v3)",  perTeam: 3, teams: 2, hp: 150, roundMs: 15000, icon: "🛡️", color: "hsl(160 65% 45%)" },
  blitz: { label: "BLITZ ⚡",    perTeam: 1, teams: 2, hp: 60,  roundMs: 5000,  icon: "⚡", color: "hsl(0 80% 55%)" },
};

const RARITY: Record<string, { color: string; ring: string; label: string; Icon: any }> = {
  common:    { color: "hsl(220 12% 60%)", ring: "ring-slate-400/40",  label: "Common",    Icon: Star },
  rare:      { color: "hsl(200 90% 55%)", ring: "ring-sky-400/50",    label: "Rare",      Icon: Gem },
  epic:      { color: "hsl(280 80% 60%)", ring: "ring-purple-400/60", label: "Epic",      Icon: Sparkles },
  legendary: { color: "hsl(38 95% 55%)",  ring: "ring-amber-400/70",  label: "Legendary", Icon: Crown },
};

const MAX_MATCH_MS = 5 * 60 * 1000; // 5 minute hard cap
const BOT_THRESHOLD = 20;
const BOT_USER_ID = "00000000-0000-0000-0000-000000000bb1";
const BOT_NAME = "Training Bot";

function blitzOpenNow() { return new Date().getMinutes() < 5; }
function nextBlitzInfo() {
  const now = new Date();
  if (blitzOpenNow()) { const c = new Date(now); c.setMinutes(5, 0, 0); return { open: true, until: c }; }
  const o = new Date(now); o.setHours(o.getHours() + 1, 0, 0, 0); return { open: false, until: o };
}

const MOVES = [
  { id: "attack",  label: "Attack",  icon: <Swords className="h-4 w-4" />,  hint: "beats Special" },
  { id: "defend",  label: "Defend",  icon: <Shield className="h-4 w-4" />,  hint: "beats Attack" },
  { id: "special", label: "Special", icon: <Sparkles className="h-4 w-4" />,hint: "beats Defend" },
] as const;
type MoveId = (typeof MOVES)[number]["id"];

const DMG: Record<MoveId, Record<MoveId, [number, number]>> = {
  attack:  { attack: [10, 10], defend: [15, 0],  special: [0, 25] },
  defend:  { attack: [0, 15],  defend: [5, 5],   special: [20, 0] },
  special: { attack: [25, 0],  defend: [0, 20],  special: [12, 12] },
};

function upgradeCost(level: number) { return 100 * level * level; }

// ============ Component ============
export function ArenaTab({ tabId, myUserId }: { tabId: string; myUserId: string }) {
  const [view, setView] = useState<"lobby" | "picker" | "roster">("lobby");
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [maps, setMaps] = useState<ArenaMap[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [chosenMap, setChosenMap] = useState<string | null>(null);
  const resolvingRef = useRef(false);
  const trophyAwardedRef = useRef<Set<string>>(new Set());

  // 4Hz tick
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  // Initial load + grant starter + realtime
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [m, p, pr, t, w, mp] = await Promise.all([
        supabase.from("arena_matches").select("*").in("status", ["lobby", "active", "done"]).order("created_at", { ascending: false }).limit(40),
        supabase.from("arena_players").select("*"),
        supabase.from("profiles").select("user_id,display_name,avatar_url"),
        supabase.from("warrior_templates").select("*").eq("is_active", true),
        supabase.from("user_warriors").select("*").eq("user_id", myUserId),
        supabase.from("arena_maps").select("*").eq("is_active", true),
      ]);
      if (cancelled) return;
      setMatches((m.data as Match[]) || []);
      setPlayers((p.data as Player[]) || []);
      const map: Record<string, Profile> = {};
      ((pr.data as Profile[]) || []).forEach((x) => { map[x.user_id] = x; });
      // Inject bot profile for nicer rendering
      map[BOT_USER_ID] = { user_id: BOT_USER_ID, display_name: BOT_NAME, avatar_url: null };
      setProfiles(map);
      setTemplates((t.data as Template[]) || []);
      setWarriors((w.data as Warrior[]) || []);
      setMaps((mp.data as ArenaMap[]) || []);
      if (!chosenMap && mp.data && mp.data[0]) setChosenMap((mp.data[0] as ArenaMap).id);

      // Grant starter if none owned
      if ((w.data || []).length === 0) {
        await supabase.rpc("grant_starter_warrior");
        const w2 = await supabase.from("user_warriors").select("*").eq("user_id", myUserId);
        if (!cancelled) setWarriors((w2.data as Warrior[]) || []);
      }
    };
    load();
    const ch = supabase.channel(`arena:${tabId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_players" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_warriors" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [tabId, myUserId]);

  // Pick my current active match
  const myActive = useMemo(() => {
    const mine = players.filter((p) => p.user_id === myUserId).map((p) => p.match_id);
    return matches.find((m) => mine.includes(m.id) && (m.status === "lobby" || m.status === "active")) || null;
  }, [players, matches, myUserId]);

  useEffect(() => {
    if (myActive && activeId !== myActive.id) setActiveId(myActive.id);
    if (!myActive && activeId) {
      const cur = matches.find((m) => m.id === activeId);
      if (!cur || cur.status === "done" || cur.status === "cancelled") {
        // keep showing for a moment if done, else clear
      } else { setActiveId(null); }
    }
  }, [myActive, activeId, matches]);

  const active = activeId ? matches.find((m) => m.id === activeId) : null;
  const activePlayers = active ? players.filter((p) => p.match_id === active.id).sort((a, b) => a.team - b.team || a.slot - b.slot) : [];

  // Chat subscription (per active match)
  useEffect(() => {
    if (!active) { setChat([]); return; }
    let cancelled = false;
    supabase.from("arena_chat").select("*").eq("match_id", active.id).order("created_at").then(({ data }) => {
      if (!cancelled) setChat((data as ChatMsg[]) || []);
    });
    const ch = supabase.channel(`arena_chat:${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "arena_chat", filter: `match_id=eq.${active.id}` },
        (payload) => setChat((c) => [...c, payload.new as ChatMsg]))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [active?.id]);

  const sendChat = async () => {
    if (!active || !chatInput.trim()) return;
    const content = chatInput.trim().slice(0, 240);
    setChatInput("");
    await supabase.from("arena_chat").insert({ match_id: active.id, user_id: myUserId, content });
  };

  // ============ Lobby actions ============
  const equippedWarrior = warriors.find((w) => w.is_equipped) || warriors[0];

  const createMatch = async (mode: Mode) => {
    if (!equippedWarrior) { showToast("Equip a warrior first"); setView("roster"); return; }
    setBusy(true);
    try {
      if (mode === "blitz" && !blitzOpenNow()) { showToast("BLITZ is closed. Try the top of the hour."); return; }
      const meta = MODE_META[mode];
      const swEnd = mode === "blitz" ? nextBlitzInfo().until.toISOString() : null;
      const isBot = equippedWarrior.trophies < BOT_THRESHOLD;
      const matchDeadline = new Date(Date.now() + MAX_MATCH_MS).toISOString();
      const { data: m, error } = await supabase.from("arena_matches").insert({
        mode, status: "lobby", max_players: meta.perTeam * meta.teams,
        created_by: myUserId, special_window_end: swEnd,
        map_id: chosenMap, is_bot_match: isBot, match_deadline: matchDeadline,
      }).select("*").maybeSingle();
      if (error || !m) { showToast(error?.message || "Failed to create"); return; }
      await supabase.from("arena_players").insert({
        match_id: m.id, user_id: myUserId, team: 1, slot: 1, hp: meta.hp, warrior_id: equippedWarrior.id, is_bot: false,
      });
      if (isBot) {
        // auto-start bot match
        await autoStartBotMatch(m as Match);
      }
    } finally { setBusy(false); }
  };

  // Bot match: insert bot via local logic (we'll resolve rounds client-side; the bot row is virtual, not in DB)
  // We piggy-back: just flip status to active so the existing round loop runs with one human + virtual bot opponent.
  const autoStartBotMatch = async (m: Match) => {
    const meta = MODE_META[m.mode];
    const deadline = new Date(Date.now() + meta.roundMs).toISOString();
    await supabase.from("arena_matches").update({
      status: "active", round_no: 1, round_deadline: deadline, started_at: new Date().toISOString(),
    }).eq("id", m.id);
  };

  const joinMatch = async (m: Match) => {
    if (!equippedWarrior) { showToast("Equip a warrior first"); setView("roster"); return; }
    setBusy(true);
    try {
      const meta = MODE_META[m.mode];
      const ps = players.filter((p) => p.match_id === m.id);
      if (ps.length >= m.max_players) { showToast("Match is full"); return; }
      const t1 = ps.filter((p) => p.team === 1).length;
      const t2 = ps.filter((p) => p.team === 2).length;
      const team = t1 <= t2 ? 1 : 2;
      const slot = (team === 1 ? t1 : t2) + 1;
      const { error } = await supabase.from("arena_players").insert({
        match_id: m.id, user_id: myUserId, team, slot, hp: meta.hp, warrior_id: equippedWarrior.id, is_bot: false,
      });
      if (error) showToast(error.message);
    } finally { setBusy(false); }
  };

  const leaveMatch = async (m: Match) => {
    setBusy(true);
    try {
      await supabase.from("arena_players").delete().eq("match_id", m.id).eq("user_id", myUserId);
      const remaining = players.filter((p) => p.match_id === m.id && p.user_id !== myUserId);
      if (remaining.length === 0) await supabase.from("arena_matches").delete().eq("id", m.id);
      setActiveId(null);
    } finally { setBusy(false); }
  };

  const startMatch = async (m: Match) => {
    const meta = MODE_META[m.mode];
    const ps = players.filter((p) => p.match_id === m.id);
    if (ps.length < m.max_players) { showToast("Need a full lobby to start"); return; }
    const deadline = new Date(Date.now() + meta.roundMs).toISOString();
    await supabase.from("arena_matches").update({
      status: "active", round_no: 1, round_deadline: deadline, started_at: new Date().toISOString(),
    }).eq("id", m.id);
  };

  const chooseMove = async (m: Match, move: MoveId) => {
    await supabase.from("arena_players").update({ current_move: move }).eq("match_id", m.id).eq("user_id", myUserId);
  };

  // ============ Round resolution + match-timeout ============
  useEffect(() => {
    if (!active || active.status !== "active") return;
    // Hard 5-minute cap
    const matchEnd = active.match_deadline ? new Date(active.match_deadline).getTime() : 0;
    if (matchEnd && now >= matchEnd && !resolvingRef.current) {
      const ps = activePlayers.length ? activePlayers : [{ user_id: myUserId } as any];
      const resolver = active.is_bot_match ? myUserId : [...ps].map((p) => p.user_id).sort()[0];
      if (resolver === myUserId) {
        resolvingRef.current = true;
        endByTimeout(active, activePlayers).finally(() => { resolvingRef.current = false; });
      }
      return;
    }
    if (!active.round_deadline) return;
    const deadline = new Date(active.round_deadline).getTime();
    if (now < deadline) return;
    if (resolvingRef.current) return;
    const ps = activePlayers;
    if (!ps.length) return;
    const resolver = active.is_bot_match ? myUserId : [...ps].map((p) => p.user_id).sort()[0];
    if (resolver !== myUserId) return;
    resolvingRef.current = true;
    void resolveRound(active, ps).finally(() => { resolvingRef.current = false; });
  }, [now, active, activePlayers, myUserId]);

  async function endByTimeout(m: Match, ps: Player[]) {
    // Sum HP per team — higher HP wins; tie = 0
    const sum: Record<number, number> = { 1: 0, 2: 0 };
    ps.forEach((p) => { sum[p.team] = (sum[p.team] || 0) + p.hp; });
    if (m.is_bot_match) {
      // human is team 1, bot is virtual team 2 at full HP — pretend bot has half
      sum[2] = sum[2] || Math.floor(MODE_META[m.mode].hp * 0.5);
    }
    const winner = sum[1] > sum[2] ? 1 : sum[2] > sum[1] ? 2 : 0;
    await supabase.from("arena_matches").update({
      status: "done", winner_team: winner, round_deadline: null, ended_at: new Date().toISOString(),
    }).eq("id", m.id);
    await finalize(m, winner);
  }

  async function finalize(m: Match, winner: number) {
    if (trophyAwardedRef.current.has(m.id)) return;
    trophyAwardedRef.current.add(m.id);
    await supabase.rpc("award_arena_trophies", { _match_id: m.id, _winner_team: winner });
    // Currency rewards (winners only)
    const reward = m.mode === "blitz" ? { n: 250, l: 5 } : m.mode === "trio" ? { n: 200, l: 3 } : m.mode === "duo" ? { n: 150, l: 2 } : { n: 100, l: 1 };
    const ps = players.filter((p) => p.match_id === m.id);
    const me = ps.find((p) => p.user_id === myUserId);
    if (me && me.team === winner) {
      await supabase.rpc("grant_currency", { _noodles: reward.n, _lumina: reward.l });
    }
  }

  async function resolveRound(m: Match, ps: Player[]) {
    const meta = MODE_META[m.mode];
    const updatedHp: Record<string, number> = {};
    ps.forEach((p) => { updatedHp[p.id] = p.hp; });

    // Lock & flush real player moves
    await Promise.all(ps.map((p) => {
      const mv = (p.current_move as MoveId) || (MOVES[Math.floor(Math.random() * 3)].id as MoveId);
      return supabase.from("arena_players").update({ locked_move: mv, current_move: null }).eq("id", p.id);
    }));

    if (m.is_bot_match) {
      // Single human vs virtual bot
      const me = ps[0];
      const myMove = (me.current_move as MoveId) || (MOVES[Math.floor(Math.random() * 3)].id as MoveId);
      const botMove = MOVES[Math.floor(Math.random() * 3)].id as MoveId;
      // bot virtual HP tracked in component state via a side store? Simpler: encode "remaining bot HP" in match.round_no? Bad.
      // Use sessionStorage keyed by match.id
      const key = `botHp:${m.id}`;
      let botHp = parseInt(sessionStorage.getItem(key) || `${meta.hp}`, 10);
      const [da, db] = DMG[myMove][botMove];
      updatedHp[me.id] = Math.max(0, updatedHp[me.id] - da);
      botHp = Math.max(0, botHp - db);
      sessionStorage.setItem(key, String(botHp));
      await supabase.from("arena_players").update({ hp: updatedHp[me.id] }).eq("id", me.id);
      if (updatedHp[me.id] <= 0 || botHp <= 0) {
        const winner = botHp <= 0 ? 1 : 2;
        sessionStorage.removeItem(key);
        await supabase.from("arena_matches").update({
          status: "done", winner_team: winner, round_deadline: null, ended_at: new Date().toISOString(),
        }).eq("id", m.id);
        await finalize(m, winner);
        return;
      }
      const newDeadline = new Date(Date.now() + meta.roundMs).toISOString();
      await supabase.from("arena_matches").update({ round_no: m.round_no + 1, round_deadline: newDeadline }).eq("id", m.id);
      return;
    }

    // Normal multi-player resolution (same as before)
    const t1 = ps.filter((p) => p.team === 1);
    const t2 = ps.filter((p) => p.team === 2);
    const pairs = Math.max(t1.length, t2.length);
    for (let i = 0; i < pairs; i++) {
      const a = t1[i % Math.max(1, t1.length)];
      const b = t2[i % Math.max(1, t2.length)];
      if (!a || !b) continue;
      const aMove = (a.current_move as MoveId) || (MOVES[Math.floor(Math.random() * 3)].id as MoveId);
      const bMove = (b.current_move as MoveId) || (MOVES[Math.floor(Math.random() * 3)].id as MoveId);
      const [da, db] = DMG[aMove][bMove];
      updatedHp[a.id] = Math.max(0, updatedHp[a.id] - da);
      updatedHp[b.id] = Math.max(0, updatedHp[b.id] - db);
    }
    await Promise.all(ps.map((p) => supabase.from("arena_players").update({ hp: updatedHp[p.id] }).eq("id", p.id)));
    await supabase.from("arena_rounds").insert({
      match_id: m.id, round_no: m.round_no,
      payload: { moves: ps.map((p) => ({ user_id: p.user_id, team: p.team, move: p.current_move, hp_after: updatedHp[p.id] })) },
    });
    const t1Alive = ps.filter((p) => p.team === 1).some((p) => updatedHp[p.id] > 0);
    const t2Alive = ps.filter((p) => p.team === 2).some((p) => updatedHp[p.id] > 0);
    if (!t1Alive || !t2Alive) {
      const winner = !t1Alive && t2Alive ? 2 : !t2Alive && t1Alive ? 1 : 0;
      await supabase.from("arena_matches").update({
        status: "done", winner_team: winner, round_deadline: null, ended_at: new Date().toISOString(),
      }).eq("id", m.id);
      await finalize(m, winner);
      return;
    }
    const newDeadline = new Date(Date.now() + meta.roundMs).toISOString();
    await supabase.from("arena_matches").update({ round_no: m.round_no + 1, round_deadline: newDeadline }).eq("id", m.id);
  }

  // ============ Roster actions ============
  const equipWarrior = async (w: Warrior) => {
    await supabase.from("user_warriors").update({ is_equipped: false }).eq("user_id", myUserId);
    await supabase.from("user_warriors").update({ is_equipped: true }).eq("id", w.id);
  };

  const upgradeWeapon = async (w: Warrior, slot: 1 | 2) => {
    const { error } = await supabase.rpc("upgrade_warrior_weapon", { _warrior_id: w.id, _slot: slot });
    if (error) showToast(error.message);
    else showToast("Weapon upgraded! +1 level");
  };

  // ============ Render ============
  if (active) return renderMatch(active);

  return (
    <div className="relative min-h-full">
      {view === "lobby" && renderLobby()}
      {view === "picker" && renderPicker()}
      {view === "roster" && (
        <div className="max-w-6xl mx-auto p-6 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("lobby")} className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white">
              <ArrowUp className="h-4 w-4 -rotate-90" />
            </button>
            <h2 className="text-3xl font-display font-bold text-white">Select a warrior!</h2>
          </div>
          {renderRoster()}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md bg-white text-black text-xs shadow-pop z-50 font-semibold">{toast}</div>
      )}
    </div>
  );

  function renderLobby() {
    const currentMap = maps.find((m) => m.id === chosenMap) || maps[0];
    const willPlayBots = equippedWarrior ? equippedWarrior.trophies < BOT_THRESHOLD : true;
    const tpl = equippedWarrior ? templates.find((t) => t.id === equippedWarrior.template_id) : null;
    const r = tpl ? (RARITY[tpl.rarity] || RARITY.common) : RARITY.common;

    return (
      <div className="relative h-full min-h-[calc(100vh-3.5rem)] grid grid-cols-[auto_1fr_auto] gap-4 p-4 sm:p-6">
        {/* Left rail */}
        <aside className="flex flex-col gap-3 self-start w-[120px] sm:w-[140px]">
          <RailButton emoji="🏅" label="Trophy Road" sublabel={equippedWarrior ? `${equippedWarrior.trophies} 🏆` : "—"} />
          <RailButton emoji="📈" label="EXP Road" sublabel="Lv up" />
          <RailButton emoji="🛡️" label="Warriors" sublabel={`${warriors.length} owned`} onClick={() => setView("roster")} highlight />
        </aside>

        {/* Center: featured warrior */}
        <div className="relative flex flex-col items-center justify-center min-h-[55vh]">
          {tpl ? (
            <>
              <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">Featured</div>
              <div className="font-display text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]">{tpl.name}</div>
              <div className="text-xs mt-1 px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ background: `${r.color}33`, color: r.color, border: `1px solid ${r.color}66` }}>{r.label}</div>
              <div className="relative mt-2 flex-1 grid place-items-center">
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="w-[420px] h-[420px] rounded-full blur-3xl opacity-40" style={{ background: `radial-gradient(circle, ${r.color}, transparent 60%)` }} />
                </div>
                {tpl.battle_sprite_url ? (
                  <img src={tpl.battle_sprite_url} alt={tpl.name} className="relative h-[44vh] max-h-[440px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]" />
                ) : (
                  <div className="relative text-[14rem] leading-none">{tpl.emoji}</div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/80">
                <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15 flex items-center gap-1.5">
                  <span>{tpl.weapon_1_emoji}</span> Lv{equippedWarrior!.weapon_1_level}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15 flex items-center gap-1.5">
                  <span>{tpl.weapon_2_emoji}</span> Lv{equippedWarrior!.weapon_2_level}
                </span>
              </div>
            </>
          ) : (
            <div className="text-white/60">Loading warriors…</div>
          )}
        </div>

        {/* Right gutter — keeps featured warrior centered */}
        <div className="w-[120px] sm:w-[140px]" />

        {/* Bottom mode card + PLAY */}
        <div className="col-span-3 mt-auto">
          <div className="flex items-stretch gap-3 max-w-3xl mx-auto">
            <div className="flex-1 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 px-5 py-3 flex items-center gap-3 text-white shadow-2xl">
              <div className="text-3xl">⚔️</div>
              <div className="min-w-0">
                <div className="font-display font-bold text-lg leading-tight">Showdown 1v1</div>
                <div className="text-xs text-white/60 truncate">
                  {currentMap ? `${currentMap.emoji} ${currentMap.name}` : "Pick a map"}
                  {willPlayBots && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30"><Bot className="h-3 w-3 inline mr-0.5" />vs Bots</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => setView("picker")}
              className="px-8 sm:px-12 rounded-2xl font-display font-black text-2xl tracking-wider text-black shadow-2xl transition-transform hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(180deg, #f5ff4d, #c9d92a)", boxShadow: "0 10px 0 0 #8a9620, 0 14px 30px rgba(0,0,0,0.5)" }}>
              PLAY
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPicker() {
    const blitz = nextBlitzInfo();
    const blitzCountdown = Math.max(0, Math.ceil((blitz.until.getTime() - now) / 1000));
    const blitzMins = Math.floor(blitzCountdown / 60);
    const blitzSecs = blitzCountdown % 60;

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("lobby")} className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/15">
            <ArrowUp className="h-4 w-4 -rotate-90" />
          </button>
          <h2 className="text-3xl font-display font-bold">Select a gamemode!</h2>
        </div>

        {/* Core modes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(MODE_META) as Mode[]).filter((m) => m === "solo" || m === "blitz").map((m) => {
            const meta = MODE_META[m];
            const open = m === "blitz" ? blitz.open : true;
            const tint = m === "blitz" ? "linear-gradient(180deg, #f5ff4d, #c9d92a)" : "linear-gradient(180deg, #8b6df2, #6647d4)";
            return (
              <button key={m} disabled={busy || !open} onClick={() => createMatch(m)}
                className={`group text-left rounded-2xl overflow-hidden border-2 border-white/15 bg-white/95 text-black transition ${!open ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-1 hover:shadow-2xl"}`}>
                <div className="px-4 py-3 font-display font-bold text-xl text-white flex items-center gap-2" style={{ background: tint, textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
                  <span className="text-2xl">{meta.icon}</span>
                  <span>{m === "blitz" ? "Blitz" : "Showdown 1v1"}</span>
                </div>
                <div className="aspect-[4/3] grid place-items-center bg-gradient-to-br from-slate-100 to-slate-300 text-slate-400 text-xs font-mono">
                  {maps[0] ? `${maps[0].emoji} ${maps[0].name}` : "Map preview"}
                </div>
                {m === "blitz" && (
                  <div className="px-3 py-1.5 text-[11px] font-mono bg-slate-900 text-slate-200 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {blitz.open ? `Closes ${blitzMins}:${String(blitzSecs).padStart(2, "0")}` : `Opens ${blitzMins}:${String(blitzSecs).padStart(2, "0")}`}
                  </div>
                )}
              </button>
            );
          })}
          {/* Duo / Trio as smaller picks */}
          {(["duo", "trio"] as Mode[]).map((m) => {
            const meta = MODE_META[m];
            return (
              <button key={m} disabled={busy} onClick={() => createMatch(m)}
                className="text-left rounded-2xl overflow-hidden border-2 border-white/15 bg-white/95 text-black transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="px-4 py-3 font-display font-bold text-xl text-white flex items-center gap-2" style={{ background: "linear-gradient(180deg, #4fc3f7, #1976d2)", textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
                  <span className="text-2xl">{meta.icon}</span>
                  <span>{meta.label}</span>
                </div>
                <div className="aspect-[4/3] grid place-items-center bg-gradient-to-br from-slate-100 to-slate-300 text-slate-400 text-xs font-mono">
                  Open lobby
                </div>
              </button>
            );
          })}
        </div>

        {/* Special gamemodes */}
        <div>
          <div className="text-center font-display text-2xl font-bold mb-2">Special Gamemodes</div>
          <div className="h-px bg-white/20 mb-2" />
          <div className="text-center text-sm text-white/60">Refreshes in: 2d 4hr 3min</div>
          <div className="mt-3 p-6 rounded-xl border border-dashed border-white/20 text-center text-white/70 text-sm">
            No special gamemodes yet! Check back later!
          </div>
        </div>

        {/* Open lobbies inline */}
        {matches.filter((m) => m.status === "lobby" && !m.is_bot_match).length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Open lobbies</div>
            <div className="space-y-2">
              {matches.filter((m) => m.status === "lobby" && !m.is_bot_match).map((m) => {
                const ps = players.filter((p) => p.match_id === m.id);
                const meta = MODE_META[m.mode];
                const full = ps.length >= m.max_players;
                const iAmIn = ps.some((p) => p.user_id === myUserId);
                return (
                  <div key={m.id} className="p-3 border border-white/15 rounded-lg bg-white/5 flex items-center gap-3 text-white">
                    <div className="text-xl">{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{meta.label}</div>
                      <div className="text-[11px] text-white/60">{ps.length}/{m.max_players} players</div>
                    </div>
                    <div className="flex -space-x-1.5">
                      {ps.map((p) => <AvatarBubble key={p.id} profile={profiles[p.user_id]} />)}
                      {Array.from({ length: m.max_players - ps.length }).map((_, i) => (
                        <div key={i} className="h-7 w-7 rounded-full border-2 border-dashed border-white/30" />
                      ))}
                    </div>
                    {iAmIn ? (
                      <>
                        {m.created_by === myUserId && full && (<Button size="sm" onClick={() => startMatch(m)} disabled={busy}>Start</Button>)}
                        <Button size="sm" variant="ghost" onClick={() => leaveMatch(m)} disabled={busy}><LogOut className="h-3.5 w-3.5" /></Button>
                      </>
                    ) : (<Button size="sm" onClick={() => joinMatch(m)} disabled={busy || full}>Join</Button>)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }


  function renderRoster() {
    if (!warriors.length) return <div className="p-8 text-center text-muted-foreground text-sm">Loading your warriors…</div>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {warriors.map((w) => {
          const tpl = templates.find((t) => t.id === w.template_id);
          if (!tpl) return null;
          const r = RARITY[tpl.rarity] || RARITY.common;
          return (
            <div key={w.id} className={`p-4 rounded-xl border-2 bg-card flex flex-col gap-3 ring-2 ${r.ring}`} style={{ borderColor: r.color }}>
              <div className="flex items-start gap-3">
                {tpl.icon_url ? (
                  <img src={tpl.icon_url} alt={tpl.name} className="h-20 w-20 rounded-lg object-cover bg-muted shrink-0" />
                ) : (
                  <div className="text-5xl">{tpl.emoji}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg">{tpl.name}</span>
                    {w.is_equipped && <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Equipped</span>}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1" style={{ color: r.color }}>
                    <r.Icon className="h-3 w-3" /> {r.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tpl.tagline}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Trophies</span>
                <span className="font-bold flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-yellow-500" />{w.trophies}</span>
              </div>
              {[
                { name: tpl.weapon_1_name, emoji: tpl.weapon_1_emoji, level: w.weapon_1_level, slot: 1 as const },
                { name: tpl.weapon_2_name, emoji: tpl.weapon_2_emoji, level: w.weapon_2_level, slot: 2 as const },
              ].map((wp) => (
                <div key={wp.slot} className="flex items-center gap-2 p-2 rounded-lg border">
                  <div className="text-2xl">{wp.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{wp.name}</div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className={`h-1.5 w-2 rounded-sm ${i < wp.level ? "bg-primary" : "bg-muted"}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">Lv {wp.level}</span>
                    </div>
                  </div>
                  {wp.level >= 10 ? (
                    <Button size="sm" variant="ghost" disabled><Lock className="h-3 w-3" /> Max</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => upgradeWeapon(w, wp.slot)} title={`Costs ${upgradeCost(wp.level)} 🍜 + 1 Noodle Packet`}>
                      <ArrowUp className="h-3 w-3" /> {upgradeCost(wp.level)} 🍜
                    </Button>
                  )}
                </div>
              ))}
              {!w.is_equipped && (
                <Button size="sm" variant="secondary" onClick={() => equipWarrior(w)}>Equip</Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMatch(m: Match) {
    const meta = MODE_META[m.mode];
    const ps = activePlayers;
    const me = ps.find((p) => p.user_id === myUserId);
    const myTeam = me?.team || 1;
    const otherTeam = myTeam === 1 ? 2 : 1;
    const mine = ps.filter((p) => p.team === myTeam);
    const them = ps.filter((p) => p.team === otherTeam);
    const deadline = m.round_deadline ? new Date(m.round_deadline).getTime() : 0;
    const secsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
    const allReady = ps.length === m.max_players;
    const mapInfo = maps.find((mp) => mp.id === m.map_id);
    const bg = mapInfo ? `linear-gradient(135deg, ${mapInfo.bg_from}, ${mapInfo.bg_to})` : undefined;
    const matchSecsLeft = m.match_deadline ? Math.max(0, Math.ceil((new Date(m.match_deadline).getTime() - now) / 1000)) : 0;
    const mm = Math.floor(matchSecsLeft / 60);
    const ss = matchSecsLeft % 60;

    // Bot HP from sessionStorage
    let botHp = meta.hp;
    if (m.is_bot_match) botHp = parseInt(sessionStorage.getItem(`botHp:${m.id}`) || `${meta.hp}`, 10);

    return (
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          <div className="rounded-xl p-5 text-white shadow-pop" style={{ background: bg || "hsl(230 30% 18%)" }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{mapInfo?.emoji || meta.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl font-bold drop-shadow">{mapInfo?.name || meta.label}</div>
                <div className="text-xs opacity-80">{meta.label} · {m.status === "lobby" ? "Lobby" : `Round ${m.round_no}`} · {m.is_bot_match ? "vs Bot" : "PvP"}</div>
              </div>
              {m.status === "active" && (
                <div className="text-right">
                  <div className="font-mono text-2xl tabular-nums">{secsLeft}s</div>
                  <div className="text-[10px] opacity-80 flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> Match {mm}:{String(ss).padStart(2, "0")}</div>
                </div>
              )}
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => leaveMatch(m)}><LogOut className="h-4 w-4 mr-1" />Leave</Button>
            </div>
          </div>

          {m.status === "lobby" && (
            <div className="p-6 border-2 border-dashed rounded-xl text-center space-y-3">
              <div className="text-sm">Waiting for players… {ps.length}/{m.max_players}</div>
              {m.created_by === myUserId && allReady && <Button onClick={() => startMatch(m)}>Start Showdown</Button>}
              {m.created_by !== myUserId && allReady && <div className="text-xs text-muted-foreground">Waiting for host to start.</div>}
            </div>
          )}

          {m.status === "active" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <TeamPanel label="Your team" players={mine} profiles={profiles} warriors={warriors} templates={templates} hp={meta.hp} accent={meta.color} mine />
                {m.is_bot_match ? (() => {
                  const botTpl = templates.find((t) => t.rarity === "common") || templates[0];
                  return (
                  <div className="p-4 rounded-xl border bg-card">
                    <div className="text-[10px] uppercase tracking-wider mb-2 text-muted-foreground">Opponent</div>
                    <div className="flex items-center gap-3">
                      {botTpl?.battle_sprite_url ? (
                        <img src={botTpl.battle_sprite_url} alt="" className="h-16 w-16 object-contain -scale-x-100 shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-amber-500/20 grid place-items-center"><Bot className="h-4 w-4 text-amber-600" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate flex items-center gap-1"><Bot className="h-3 w-3" /> {BOT_NAME}</div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-0.5">
                          <div className="h-full transition-all bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, (botHp / meta.hp) * 100))}%` }} />
                        </div>
                      </div>
                      <div className="text-[10px] font-mono w-12 text-right">{botHp}/{meta.hp}</div>
                    </div>
                  </div>
                  );
                })() : (
                  <TeamPanel label="Opponents" players={them} profiles={profiles} warriors={warriors} templates={templates} hp={meta.hp} accent="hsl(0 0% 50%)" />
                )}
              </div>

              <div className="p-5 rounded-xl border bg-card">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 text-center">Choose your move</div>
                <div className="grid grid-cols-3 gap-3">
                  {MOVES.map((mv) => {
                    const selected = me?.current_move === mv.id;
                    return (
                      <button key={mv.id} onClick={() => me && chooseMove(m, mv.id as MoveId)}
                        className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-1.5 ${
                          selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted"
                        }`}>
                        <div className="text-primary">{mv.icon}</div>
                        <div className="font-semibold text-sm">{mv.label}</div>
                        <div className="text-[10px] text-muted-foreground">{mv.hint}</div>
                      </button>
                    );
                  })}
                </div>
                {me?.current_move && <div className="mt-3 text-center text-xs text-muted-foreground">Locked: <strong className="text-foreground">{me.current_move}</strong></div>}
              </div>
            </>
          )}

          {m.status === "done" && (() => {
            const myWarrior = warriors.find((w) => w.id === me?.warrior_id);
            const myTpl = myWarrior ? templates.find((t) => t.id === myWarrior.template_id) : null;
            const outcome = m.winner_team === 0 ? "draw" : m.winner_team === myTeam ? "win" : "lose";
            const gif = outcome === "win" ? myTpl?.win_gif_url : outcome === "lose" ? myTpl?.lose_gif_url : myTpl?.draw_gif_url;
            const poster = myTpl?.battle_sprite_url || myTpl?.icon_url || null;
            const theme = outcome === "win"
              ? { bg: "linear-gradient(160deg, #cfe0ff 0%, #b6cdff 100%)", bolt: "#4d7ef5", title: "Victory!", text: "#0c1e44" }
              : outcome === "lose"
              ? { bg: "linear-gradient(160deg, #ffd6dc 0%, #ffb6c2 100%)", bolt: "#ee3d54", title: "Defeat!", text: "#3a0c14" }
              : { bg: "linear-gradient(160deg, #ffe8d6 0%, #ffd1a8 100%)", bolt: "#f08a2a", title: "Draw.", text: "#3a200a" };
            return (
              <div className="relative rounded-xl overflow-hidden" style={{ background: theme.bg, color: theme.text, minHeight: 360 }}>
                <svg viewBox="0 0 800 360" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <polygon points="0,0 380,0 240,120 360,80 200,240 60,140" fill={theme.bolt} opacity="0.9" />
                  <polygon points="20,30 320,20 220,140 300,110 130,260" fill={theme.bolt} opacity="0.5" />
                </svg>
                <div className="relative p-8 flex flex-col items-center text-center gap-3">
                  <div className="self-start font-display text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]">{theme.title}</div>
                  <div className="self-start text-xl font-bold tabular-nums mt-1">
                    {outcome === "draw" ? "0 🏆" : outcome === "win" ? "+10 🏆  🍜+2  👝+3  ✦+1" : "−5 🏆"}
                  </div>
                  <div className="mt-2">
                    {gif ? (
                      <PlayOnceGif gif={gif} poster={poster} className="h-48 object-contain" durationMs={2400} />
                    ) : (
                      <Trophy className="h-20 w-20" />
                    )}
                  </div>
                  <Button onClick={() => { setActiveId(null); trophyAwardedRef.current.delete(m.id); }}
                    className="self-end mt-2 px-8 h-10 rounded-full bg-white/80 text-black hover:bg-white border border-white/40 font-display font-bold tracking-wider">
                    EXIT
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Chat */}
        <div className="rounded-xl border bg-card flex flex-col h-[500px] lg:h-auto">
          <div className="px-3 h-9 border-b flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match Chat</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {chat.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Say hi 👋</div>}
            {chat.map((c) => {
              const p = profiles[c.user_id];
              const name = p?.display_name || "Player";
              return (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="h-5 w-5 shrink-0 rounded-full grid place-items-center text-[8px] font-bold overflow-hidden"
                    style={!p?.avatar_url ? { background: avatarColor(name), color: avatarFg(name) } : undefined}>
                    {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground">{name}</div>
                    <div className="text-xs break-words">{c.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t p-2 flex gap-1.5">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Message…" maxLength={240}
              className="flex-1 h-8 px-2 rounded-md border bg-background text-xs" />
            <Button size="sm" onClick={sendChat} disabled={!chatInput.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    );
  }
}

// ============ Helpers ============
function AvatarBubble({ profile }: { profile?: Profile }) {
  const name = profile?.display_name || "?";
  return (
    <div className="h-7 w-7 rounded-full overflow-hidden border-2 border-card grid place-items-center text-[9px] font-bold"
      style={!profile?.avatar_url ? { background: avatarColor(name), color: avatarFg(name) } : undefined} title={name}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}

function TeamPanel({ label, players, profiles, warriors, templates, hp, accent, mine }: {
  label: string; players: Player[]; profiles: Record<string, Profile>;
  warriors: Warrior[]; templates: Template[]; hp: number; accent: string; mine?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card" style={{ borderColor: mine ? accent : undefined }}>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: accent }}>{label}</div>
      <div className="space-y-2">
        {players.map((p) => {
          const prof = profiles[p.user_id];
          const name = prof?.display_name || "Player";
          const w = warriors.find((x) => x.id === p.warrior_id);
          const tpl = w ? templates.find((t) => t.id === w.template_id) : null;
          const pct = Math.max(0, Math.min(100, (p.hp / hp) * 100));
          const dead = p.hp <= 0;
          return (
            <div key={p.id} className={`flex items-center gap-3 ${dead ? "opacity-40" : ""}`}>
              {tpl?.battle_sprite_url ? (
                <img src={tpl.battle_sprite_url} alt="" className={`h-14 w-14 object-contain shrink-0 ${mine ? "" : "-scale-x-100"}`} />
              ) : (
                <AvatarBubble profile={prof} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate flex items-center gap-1">
                  {tpl && <span>{tpl.emoji}</span>}
                  <span className="truncate">{name}{dead && " 💀"}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mt-0.5">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                </div>
              </div>
              <div className="text-[10px] font-mono tabular-nums w-12 text-right">{p.hp}/{hp}</div>
              {p.current_move && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                  {p.current_move === "attack" ? <Swords className="h-3 w-3" /> : p.current_move === "defend" ? <Shield className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Renders a GIF for `durationMs`, then swaps to a static poster so the animation only plays ONCE.
function PlayOnceGif({ gif, poster, durationMs = 2000, className }: {
  gif: string; poster: string | null; durationMs?: number; className?: string;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    const t = setTimeout(() => setDone(true), durationMs);
    return () => clearTimeout(t);
  }, [gif, durationMs]);
  // Cache-bust GIF on each mount so it always restarts from frame 0 instead of resuming a cached loop.
  const src = done && poster ? poster : `${gif}${gif.includes("?") ? "&" : "?"}_t=${Math.floor(Date.now() / 1000)}`;
  return <img src={src} alt="" className={className} />;
}

function RailButton({ emoji, label, sublabel, onClick, highlight }: {
  emoji: string; label: string; sublabel?: string; onClick?: () => void; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-white transition shadow-lg
        ${highlight
          ? "bg-gradient-to-b from-amber-400/40 to-amber-600/20 border-amber-300/40 hover:from-amber-400/60"
          : "bg-white/5 border-white/15 hover:bg-white/10"}`}
    >
      <div className="text-3xl drop-shadow">{emoji}</div>
      <div className="text-[11px] font-display font-bold uppercase tracking-wide text-center leading-tight">{label}</div>
      {sublabel && <div className="text-[10px] text-white/60 font-mono">{sublabel}</div>}
    </button>
  );
}
