import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Users, Zap, Shield, Sparkles, Trophy, Clock, Plus, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avatarColor, avatarFg, initials } from "@/components/CornerChat";

type Mode = "solo" | "duo" | "trio" | "blitz";
type Match = {
  id: string; mode: Mode; status: "lobby" | "active" | "done" | "cancelled";
  max_players: number; round_no: number; round_deadline: string | null;
  winner_team: number | null; created_by: string; created_at: string;
  special_window_end: string | null;
};
type Player = {
  id: string; match_id: string; user_id: string; team: number; slot: number;
  hp: number; ready: boolean; current_move: string | null; locked_move: string | null;
};
type Profile = { user_id: string; display_name: string; avatar_url: string | null };

const MODE_META: Record<Mode, { label: string; perTeam: number; teams: number; hp: number; roundMs: number; icon: string; color: string }> = {
  solo:  { label: "Solo (1v1)",  perTeam: 1, teams: 2, hp: 100, roundMs: 15000, icon: "⚔️", color: "hsl(220 80% 55%)" },
  duo:   { label: "Duo (2v2)",   perTeam: 2, teams: 2, hp: 120, roundMs: 15000, icon: "👥", color: "hsl(280 70% 55%)" },
  trio:  { label: "Trio (3v3)",  perTeam: 3, teams: 2, hp: 150, roundMs: 15000, icon: "🛡️", color: "hsl(160 65% 45%)" },
  blitz: { label: "BLITZ ⚡",    perTeam: 1, teams: 2, hp: 60,  roundMs: 5000,  icon: "⚡", color: "hsl(0 80% 55%)" },
};

// BLITZ is only joinable during the first 5 minutes of every hour.
function blitzOpenNow() {
  const m = new Date().getMinutes();
  return m < 5;
}
function nextBlitzInfo() {
  const now = new Date();
  if (blitzOpenNow()) {
    const close = new Date(now); close.setMinutes(5, 0, 0);
    return { open: true, until: close };
  }
  const open = new Date(now);
  open.setHours(open.getHours() + 1, 0, 0, 0);
  return { open: false, until: open };
}

const MOVES = [
  { id: "attack",  label: "Attack",  icon: <Swords className="h-4 w-4" />,  hint: "beats Special" },
  { id: "defend",  label: "Defend",  icon: <Shield className="h-4 w-4" />,  hint: "beats Attack" },
  { id: "special", label: "Special", icon: <Sparkles className="h-4 w-4" />,hint: "beats Defend" },
] as const;
type MoveId = (typeof MOVES)[number]["id"];

// Damage table: rows = team A move, cols = team B move => [damage to A, damage to B]
const DMG: Record<MoveId, Record<MoveId, [number, number]>> = {
  attack:  { attack: [10, 10], defend: [15, 0],  special: [0, 25] },
  defend:  { attack: [0, 15],  defend: [5, 5],   special: [20, 0] },
  special: { attack: [25, 0],  defend: [0, 20],  special: [12, 12] },
};

export function ArenaTab({ tabId, myUserId }: { tabId: string; myUserId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const resolvingRef = useRef(false);

  // 1Hz tick for countdowns
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);

  // initial load + realtime
  useEffect(() => {
    const load = async () => {
      const [m, p, pr] = await Promise.all([
        supabase.from("arena_matches").select("*").in("status", ["lobby", "active"]).order("created_at", { ascending: false }),
        supabase.from("arena_players").select("*"),
        supabase.from("profiles").select("user_id,display_name,avatar_url"),
      ]);
      setMatches((m.data as Match[]) || []);
      setPlayers((p.data as Player[]) || []);
      const map: Record<string, Profile> = {};
      ((pr.data as Profile[]) || []).forEach((x) => { map[x.user_id] = x; });
      setProfiles(map);
    };
    load();
    const ch = supabase.channel(`arena:${tabId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_players" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_rounds"  }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tabId]);

  // Pick my current active match if any
  const myActive = useMemo(() => {
    const mine = players.filter((p) => p.user_id === myUserId).map((p) => p.match_id);
    return matches.find((m) => mine.includes(m.id) && (m.status === "lobby" || m.status === "active")) || null;
  }, [players, matches, myUserId]);

  useEffect(() => {
    if (myActive && activeId !== myActive.id) setActiveId(myActive.id);
    if (!myActive && activeId) setActiveId(null);
  }, [myActive, activeId]);

  const active = activeId ? matches.find((m) => m.id === activeId) : null;
  const activePlayers = active ? players.filter((p) => p.match_id === active.id).sort((a, b) => a.team - b.team || a.slot - b.slot) : [];

  // ===== Lobby actions =====
  const createMatch = async (mode: Mode) => {
    setBusy(true);
    try {
      if (mode === "blitz" && !blitzOpenNow()) { setToast("BLITZ is closed. Try at the top of the hour."); return; }
      const meta = MODE_META[mode];
      const swEnd = mode === "blitz" ? nextBlitzInfo().until.toISOString() : null;
      const { data: m, error } = await supabase.from("arena_matches").insert({
        mode, status: "lobby", max_players: meta.perTeam * meta.teams,
        created_by: myUserId, special_window_end: swEnd,
      }).select("*").maybeSingle();
      if (error || !m) { setToast(error?.message || "Failed to create"); return; }
      await supabase.from("arena_players").insert({
        match_id: m.id, user_id: myUserId, team: 1, slot: 1, hp: meta.hp,
      });
    } finally { setBusy(false); }
  };

  const joinMatch = async (m: Match) => {
    setBusy(true);
    try {
      const meta = MODE_META[m.mode];
      const ps = players.filter((p) => p.match_id === m.id);
      if (ps.length >= m.max_players) { setToast("Match is full"); return; }
      // Pick the team that has fewer players
      const t1 = ps.filter((p) => p.team === 1).length;
      const t2 = ps.filter((p) => p.team === 2).length;
      const team = t1 <= t2 ? 1 : 2;
      const slot = (team === 1 ? t1 : t2) + 1;
      const { error } = await supabase.from("arena_players").insert({
        match_id: m.id, user_id: myUserId, team, slot, hp: meta.hp,
      });
      if (error) setToast(error.message);
    } finally { setBusy(false); }
  };

  const leaveMatch = async (m: Match) => {
    setBusy(true);
    try {
      await supabase.from("arena_players").delete().eq("match_id", m.id).eq("user_id", myUserId);
      const remaining = players.filter((p) => p.match_id === m.id && p.user_id !== myUserId);
      if (remaining.length === 0) await supabase.from("arena_matches").delete().eq("id", m.id);
    } finally { setBusy(false); }
  };

  const startMatch = async (m: Match) => {
    const meta = MODE_META[m.mode];
    const ps = players.filter((p) => p.match_id === m.id);
    if (ps.length < m.max_players) { setToast("Need a full lobby to start"); return; }
    const deadline = new Date(Date.now() + meta.roundMs).toISOString();
    await supabase.from("arena_matches").update({
      status: "active", round_no: 1, round_deadline: deadline, started_at: new Date().toISOString(),
    }).eq("id", m.id);
  };

  // ===== In-match actions =====
  const chooseMove = async (m: Match, move: MoveId) => {
    await supabase.from("arena_players").update({ current_move: move }).eq("match_id", m.id).eq("user_id", myUserId);
  };

  // ===== Round resolution =====
  // The lowest-user-id player in the match resolves (deterministic, no double-fire).
  useEffect(() => {
    if (!active || active.status !== "active" || !active.round_deadline) return;
    const deadline = new Date(active.round_deadline).getTime();
    if (now < deadline) return;
    if (resolvingRef.current) return;

    const ps = activePlayers;
    if (!ps.length) return;
    const resolver = [...ps].map((p) => p.user_id).sort()[0];
    if (resolver !== myUserId) return;
    resolvingRef.current = true;
    void resolveRound(active, ps).finally(() => { resolvingRef.current = false; });
  }, [now, active, activePlayers, myUserId]);

  async function resolveRound(m: Match, ps: Player[]) {
    const meta = MODE_META[m.mode];
    // Lock moves: anyone with no move gets a random one (timeout)
    const lockedByTeam: Record<number, MoveId[]> = { 1: [], 2: [] };
    const updatedHp: Record<string, number> = {};
    ps.forEach((p) => { updatedHp[p.id] = p.hp; });

    const locks = ps.map((p) => {
      const mv = (p.current_move as MoveId) || (MOVES[Math.floor(Math.random() * 3)].id as MoveId);
      lockedByTeam[p.team].push(mv);
      return supabase.from("arena_players").update({ locked_move: mv, current_move: null }).eq("id", p.id);
    });
    await Promise.all(locks);

    // Pair each player on team 1 with player on team 2 at same slot (cycle if uneven)
    const t1 = ps.filter((p) => p.team === 1);
    const t2 = ps.filter((p) => p.team === 2);
    const pairs = Math.max(t1.length, t2.length);
    for (let i = 0; i < pairs; i++) {
      const a = t1[i % Math.max(1, t1.length)];
      const b = t2[i % Math.max(1, t2.length)];
      if (!a || !b) continue;
      const aMove = (a.current_move as MoveId) || lockedByTeam[1][i % lockedByTeam[1].length];
      const bMove = (b.current_move as MoveId) || lockedByTeam[2][i % lockedByTeam[2].length];
      const [da, db] = DMG[aMove][bMove];
      updatedHp[a.id] = Math.max(0, updatedHp[a.id] - da);
      updatedHp[b.id] = Math.max(0, updatedHp[b.id] - db);
    }
    await Promise.all(ps.map((p) => supabase.from("arena_players").update({ hp: updatedHp[p.id] }).eq("id", p.id)));

    // Save round payload
    await supabase.from("arena_rounds").insert({
      match_id: m.id, round_no: m.round_no,
      payload: { moves: ps.map((p) => ({ user_id: p.user_id, team: p.team, move: p.current_move, hp_after: updatedHp[p.id] })) },
    });

    // Check victory
    const t1Alive = ps.filter((p) => p.team === 1).some((p) => updatedHp[p.id] > 0);
    const t2Alive = ps.filter((p) => p.team === 2).some((p) => updatedHp[p.id] > 0);
    if (!t1Alive || !t2Alive) {
      const winner = !t1Alive && t2Alive ? 2 : !t2Alive && t1Alive ? 1 : 0;
      await supabase.from("arena_matches").update({
        status: "done", winner_team: winner, round_deadline: null, ended_at: new Date().toISOString(),
      }).eq("id", m.id);
      // Grant rewards to winners
      const winners = ps.filter((p) => p.team === winner && updatedHp[p.id] > 0);
      const reward = m.mode === "blitz" ? { n: 250, l: 5 } : m.mode === "trio" ? { n: 200, l: 3 } : m.mode === "duo" ? { n: 150, l: 2 } : { n: 100, l: 1 };
      if (winners.some((w) => w.user_id === myUserId)) {
        await supabase.rpc("grant_currency", { _noodles: reward.n, _lumina: reward.l });
      }
      return;
    }

    // Next round
    const newDeadline = new Date(Date.now() + meta.roundMs).toISOString();
    await supabase.from("arena_matches").update({ round_no: m.round_no + 1, round_deadline: newDeadline }).eq("id", m.id);
  }

  // ===== UI =====
  if (active) return renderMatch(active);
  return renderLobby();

  function renderLobby() {
    const blitz = nextBlitzInfo();
    const blitzCountdown = Math.max(0, Math.ceil((blitz.until.getTime() - now) / 1000));
    const blitzMins = Math.floor(blitzCountdown / 60);
    const blitzSecs = blitzCountdown % 60;
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="flex items-center gap-3">
          <Swords className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Arena · Showdown</h1>
            <p className="text-xs text-muted-foreground">Pick Attack, Defend or Special each round. Attack&gt;Special&gt;Defend&gt;Attack. First team to 0 HP loses.</p>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(MODE_META) as Mode[]).map((m) => {
            const meta = MODE_META[m];
            const open = m === "blitz" ? blitz.open : true;
            return (
              <button
                key={m}
                disabled={busy || !open}
                onClick={() => createMatch(m)}
                className={`text-left p-4 rounded-xl border bg-card transition hover:shadow-pop ${!open ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
                style={{ borderColor: open ? meta.color : undefined }}
              >
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="font-semibold text-sm">{meta.label}</div>
                <div className="text-[11px] text-muted-foreground">{meta.hp} HP · {Math.round(meta.roundMs / 1000)}s/round</div>
                {m === "blitz" && (
                  <div className="mt-2 text-[10px] font-mono flex items-center gap-1" style={{ color: meta.color }}>
                    <Clock className="h-3 w-3" />
                    {blitz.open ? `Closes in ${blitzMins}:${String(blitzSecs).padStart(2, "0")}` : `Opens in ${blitzMins}:${String(blitzSecs).padStart(2, "0")}`}
                  </div>
                )}
                {open && <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary"><Plus className="h-3 w-3" />Create</div>}
              </button>
            );
          })}
        </section>

        <section>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Open lobbies</div>
          {matches.filter((m) => m.status === "lobby").length === 0 && (
            <div className="text-sm text-muted-foreground p-6 border border-dashed rounded-xl text-center">No open lobbies. Create one above.</div>
          )}
          <div className="space-y-2">
            {matches.filter((m) => m.status === "lobby").map((m) => {
              const ps = players.filter((p) => p.match_id === m.id);
              const meta = MODE_META[m.mode];
              const full = ps.length >= m.max_players;
              const iAmIn = ps.some((p) => p.user_id === myUserId);
              return (
                <div key={m.id} className="p-3 border rounded-lg bg-card flex items-center gap-3">
                  <div className="text-xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="text-[11px] text-muted-foreground">{ps.length}/{m.max_players} players</div>
                  </div>
                  <div className="flex -space-x-1.5">
                    {ps.map((p) => <AvatarBubble key={p.id} profile={profiles[p.user_id]} />)}
                    {Array.from({ length: m.max_players - ps.length }).map((_, i) => (
                      <div key={i} className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30" />
                    ))}
                  </div>
                  {iAmIn ? (
                    <>
                      {m.created_by === myUserId && full && (
                        <Button size="sm" onClick={() => startMatch(m)} disabled={busy}>Start</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => leaveMatch(m)} disabled={busy}><LogOut className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => joinMatch(m)} disabled={busy || full}>Join</Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md bg-foreground text-background text-xs shadow-pop"
            onAnimationEnd={() => setToast(null)}>{toast}</div>
        )}
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

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{meta.icon}</div>
          <div className="flex-1">
            <div className="font-display text-xl font-bold">{meta.label} · {m.status === "lobby" ? "Lobby" : `Round ${m.round_no}`}</div>
            <div className="text-xs text-muted-foreground">Match {m.id.slice(0, 8)}</div>
          </div>
          {m.status === "active" && (
            <div className="font-mono text-2xl px-3 py-1 rounded-lg border tabular-nums" style={{ color: secsLeft <= 3 ? meta.color : undefined }}>
              {secsLeft}s
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => leaveMatch(m)}><LogOut className="h-4 w-4 mr-1" />Leave</Button>
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
              <TeamPanel label="Your team" players={mine} profiles={profiles} hp={meta.hp} accent={meta.color} mine />
              <TeamPanel label="Opponents" players={them} profiles={profiles} hp={meta.hp} accent="hsl(0 0% 50%)" />
            </div>

            <div className="p-5 rounded-xl border bg-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 text-center">Choose your move</div>
              <div className="grid grid-cols-3 gap-3">
                {MOVES.map((mv) => {
                  const selected = me?.current_move === mv.id;
                  return (
                    <button key={mv.id}
                      onClick={() => me && chooseMove(m, mv.id as MoveId)}
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
              {me?.current_move && <div className="mt-3 text-center text-xs text-muted-foreground">Locked: <strong className="text-foreground">{me.current_move}</strong> (you can change until the timer hits 0)</div>}
            </div>
          </>
        )}

        {m.status === "done" && (
          <div className="p-8 rounded-xl border bg-card text-center space-y-3">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
            <div className="text-2xl font-display font-bold">
              {m.winner_team === 0 ? "Draw" : m.winner_team === myTeam ? "Victory!" : "Defeat"}
            </div>
            <div className="text-sm text-muted-foreground">Rewards have been credited to winners.</div>
          </div>
        )}
      </div>
    );
  }
}

function AvatarBubble({ profile }: { profile?: Profile }) {
  const name = profile?.display_name || "?";
  return (
    <div className="h-7 w-7 rounded-full overflow-hidden border-2 border-card grid place-items-center text-[9px] font-bold"
      style={!profile?.avatar_url ? { background: avatarColor(name), color: avatarFg(name) } : undefined}
      title={name}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}

function TeamPanel({ label, players, profiles, hp, accent, mine }: {
  label: string; players: Player[]; profiles: Record<string, Profile>; hp: number; accent: string; mine?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl border bg-card" style={{ borderColor: mine ? accent : undefined }}>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: accent }}>{label}</div>
      <div className="space-y-2">
        {players.map((p) => {
          const prof = profiles[p.user_id];
          const name = prof?.display_name || "Player";
          const pct = Math.max(0, Math.min(100, (p.hp / hp) * 100));
          const dead = p.hp <= 0;
          return (
            <div key={p.id} className={`flex items-center gap-2 ${dead ? "opacity-40" : ""}`}>
              <AvatarBubble profile={prof} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{name}{dead && " 💀"}</div>
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
