import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy } from "lucide-react";
import type { Template, Warrior } from "./types";
import { scaleStat } from "./types";

type Outcome = "win" | "lose" | null;

type Fighter = {
  side: "left" | "right";
  isBot: boolean;
  name: string;
  template: Template;
  warrior: Warrior; // for player, real; for bot, synthesized
  hp: number;
  maxHp: number;
  x: number;
  vy: number;
  y: number;
  facing: 1 | -1;
  mainDmg: number;
  megaDmg: number;
  mainCdReady: number; // ms timestamp
  megaCdReady: number;
  flashUntil: number;
  attackUntil: number;
  attackKind: "main" | "mega" | null;
  speed: number;
};

const FIELD_W = 1200;
const FIELD_H = 520;
const GROUND_Y = 440;        // top edge of ground stripe
const SPRITE_W = 130;
const SPRITE_H = 130;
const GRAVITY = 2400;        // px/s^2
const JUMP_V = -900;         // px/s
const TICK_MS = 500;         // game tick (server-style)
const FRAME_MS = 1000 / 30;  // client animation tick

export function SideViewMatch({
  me, myWarrior, myTemplate, opponentTemplate, mode, onExit,
}: {
  me: { user_id: string; display_name: string };
  myWarrior: Warrior;
  myTemplate: Template;
  opponentTemplate: Template;
  mode: "solo" | "blitz";
  onExit: (outcome: Outcome, trophyDelta: number) => void;
}) {
  // ---- Build fighters ----
  const buildPlayer = (): Fighter => {
    const maxHp = scaleStat(myTemplate.hp_base, myTemplate.hp_max, myWarrior.hp_level, myTemplate.max_level);
    return {
      side: "left", isBot: false, name: me.display_name, template: myTemplate, warrior: myWarrior,
      hp: maxHp, maxHp, x: 160, y: GROUND_Y - SPRITE_H, vy: 0, facing: 1,
      mainDmg: scaleStat(myTemplate.main_dmg_base, myTemplate.main_dmg_max, myWarrior.main_level, myTemplate.max_level),
      megaDmg: scaleStat(myTemplate.mega_dmg_base, myTemplate.mega_dmg_max, myWarrior.mega_level, myTemplate.max_level),
      mainCdReady: 0, megaCdReady: 0, flashUntil: 0, attackUntil: 0, attackKind: null,
      speed: myTemplate.speed,
    };
  };
  const buildBot = (): Fighter => {
    // Bots scale roughly with player level so it's a fair fight
    const lvl = Math.max(1, Math.round((myWarrior.hp_level + myWarrior.main_level + myWarrior.mega_level) / 3));
    const fakeWarrior: Warrior = {
      ...myWarrior, id: "bot", user_id: "bot", template_id: opponentTemplate.id,
      hp_level: lvl, main_level: lvl, mega_level: lvl,
    };
    const maxHp = scaleStat(opponentTemplate.hp_base, opponentTemplate.hp_max, lvl, opponentTemplate.max_level);
    return {
      side: "right", isBot: true, name: "Training Bot", template: opponentTemplate, warrior: fakeWarrior,
      hp: maxHp, maxHp, x: FIELD_W - 160 - SPRITE_W, y: GROUND_Y - SPRITE_H, vy: 0, facing: -1,
      mainDmg: scaleStat(opponentTemplate.main_dmg_base, opponentTemplate.main_dmg_max, lvl, opponentTemplate.max_level),
      megaDmg: scaleStat(opponentTemplate.mega_dmg_base, opponentTemplate.mega_dmg_max, lvl, opponentTemplate.max_level),
      mainCdReady: 0, megaCdReady: 0, flashUntil: 0, attackUntil: 0, attackKind: null,
      speed: Math.round(opponentTemplate.speed * 0.85),
    };
  };

  const playerRef = useRef<Fighter>(buildPlayer());
  const botRef = useRef<Fighter>(buildBot());
  const keysRef = useRef<Record<string, boolean>>({});
  const startedAt = useRef(Date.now());
  const matchMs = mode === "blitz" ? 90_000 : 5 * 60_000;
  const [, force] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [now, setNow] = useState(Date.now());
  const [hitMarks, setHitMarks] = useState<{ id: number; x: number; y: number; n: number; kind: "main" | "mega" }[]>([]);
  const hitIdRef = useRef(0);

  // ---- Input ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["a","A","d","D","w","W"," ","1","2"].includes(e.key)) e.preventDefault();
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "1") tryAttack(playerRef.current, botRef.current, "main");
      if (e.key === "2") tryAttack(playerRef.current, botRef.current, "mega");
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ---- Game loop (30fps render + 500ms tick logic) ----
  const lastFrame = useRef(performance.now());
  const lastTick = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - lastFrame.current) / 1000);
      lastFrame.current = t;
      stepPlayer(playerRef.current, dt);
      stepBot(botRef.current, playerRef.current, dt, t);
      // Tick: clamp positions, decay flash, check end (every TICK_MS)
      if (t - lastTick.current >= TICK_MS) {
        lastTick.current = t;
        // end conditions
        if (playerRef.current.hp <= 0 || botRef.current.hp <= 0 || Date.now() - startedAt.current >= matchMs) {
          finish();
        }
      }
      setNow(Date.now());
      force(x => (x + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stepPlayer(p: Fighter, dt: number) {
    if (outcome) return;
    const k = keysRef.current;
    let vx = 0;
    if (k["a"] || k["arrowleft"]) { vx -= p.speed; p.facing = -1; }
    if (k["d"] || k["arrowright"]) { vx += p.speed; p.facing = 1; }
    p.x = Math.max(0, Math.min(FIELD_W - SPRITE_W, p.x + vx * dt));
    // Jump
    const onGround = p.y >= GROUND_Y - SPRITE_H - 0.5;
    if ((k["w"] || k[" "] || k["arrowup"]) && onGround) p.vy = JUMP_V;
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y > GROUND_Y - SPRITE_H) { p.y = GROUND_Y - SPRITE_H; p.vy = 0; }
  }

  function stepBot(b: Fighter, target: Fighter, dt: number, t: number) {
    if (outcome) return;
    const dist = (target.x + SPRITE_W / 2) - (b.x + SPRITE_W / 2);
    b.facing = dist < 0 ? -1 : 1;
    const absDist = Math.abs(dist);
    const wantRange = b.template.main_range - 20;
    let vx = 0;
    if (absDist > wantRange + 10) vx = Math.sign(dist) * b.speed;
    else if (absDist < wantRange - 30) vx = -Math.sign(dist) * b.speed;
    b.x = Math.max(0, Math.min(FIELD_W - SPRITE_W, b.x + vx * dt));
    // Gravity (bots don't jump much; occasional)
    const onGround = b.y >= GROUND_Y - SPRITE_H - 0.5;
    if (onGround && Math.random() < 0.005) b.vy = JUMP_V * 0.7;
    b.vy += GRAVITY * dt;
    b.y += b.vy * dt;
    if (b.y > GROUND_Y - SPRITE_H) { b.y = GROUND_Y - SPRITE_H; b.vy = 0; }
    // Attack
    if (t >= b.megaCdReady && absDist < b.template.mega_range) tryAttack(b, target, "mega");
    else if (t >= b.mainCdReady && absDist < b.template.main_range) tryAttack(b, target, "main");
  }

  function tryAttack(attacker: Fighter, target: Fighter, kind: "main" | "mega") {
    if (outcome) return;
    const now = performance.now();
    if (kind === "main" && now < attacker.mainCdReady) return;
    if (kind === "mega" && now < attacker.megaCdReady) return;
    const range = kind === "main" ? attacker.template.main_range : attacker.template.mega_range;
    const dmg = kind === "main" ? attacker.mainDmg : attacker.megaDmg;
    const dx = (target.x + SPRITE_W / 2) - (attacker.x + SPRITE_W / 2);
    const facingOk = (dx >= 0 && attacker.facing === 1) || (dx <= 0 && attacker.facing === -1);
    const inRange = Math.abs(dx) <= range && facingOk;
    if (kind === "main") attacker.mainCdReady = now + attacker.template.main_cooldown_ms;
    else attacker.megaCdReady = now + attacker.template.mega_cooldown_ms;
    attacker.attackKind = kind; attacker.attackUntil = now + 250;
    if (!inRange) return;
    target.hp = Math.max(0, target.hp - dmg);
    target.flashUntil = now + 220;
    const id = ++hitIdRef.current;
    setHitMarks(prev => [...prev.slice(-12), { id, x: target.x + SPRITE_W / 2, y: target.y - 12, n: dmg, kind }]);
    setTimeout(() => setHitMarks(prev => prev.filter(h => h.id !== id)), 700);
  }

  const finished = useRef(false);
  async function finish() {
    if (finished.current) return; finished.current = true;
    const p = playerRef.current, b = botRef.current;
    const result: Outcome = p.hp > b.hp ? "win" : p.hp < b.hp ? "lose" : null;
    setOutcome(result || "lose");
    // Trophy update directly on warrior
    const delta = result === "win" ? 10 : result === "lose" ? -5 : 0;
    if (delta) {
      await supabase.from("user_warriors")
        .update({ trophies: Math.max(0, myWarrior.trophies + delta) })
        .eq("id", myWarrior.id);
    }
    setTimeout(() => onExit(result, delta), 2200);
  }

  const elapsed = Math.min(matchMs, now - startedAt.current);
  const timeLeft = Math.max(0, matchMs - elapsed);
  const mm = Math.floor(timeLeft / 60000), ss = Math.floor((timeLeft % 60000) / 1000);

  // ---- Render ----
  return (
    <div className="absolute inset-0 flex flex-col text-white" style={{
      background: "radial-gradient(ellipse at 50% 0%, hsl(240 50% 20%), hsl(230 35% 8%))",
    }}>
      {/* Top HUD */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => onExit(null, 0)} className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/15">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <HpBar f={playerRef.current} align="left" />
        <div className="font-mono text-xl tabular-nums px-3 py-1 rounded-lg bg-black/40 border border-white/15">
          {mm}:{ss.toString().padStart(2, "0")}
        </div>
        <HpBar f={botRef.current} align="right" />
      </div>

      {/* Field */}
      <div className="flex-1 grid place-items-center p-4">
        <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
          style={{
            width: "min(100%, 1200px)", aspectRatio: `${FIELD_W} / ${FIELD_H}`,
            background: "linear-gradient(to bottom, hsl(220 70% 25%) 0%, hsl(220 60% 35%) 55%, hsl(35 60% 35%) 56%, hsl(28 55% 28%) 100%)",
          }}>
          <div className="absolute inset-0" style={{ position: "relative" }}>
            <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* Sky decor */}
              <circle cx={FIELD_W - 180} cy={90} r={50} fill="hsl(50 90% 75%)" opacity="0.85" />
              <line x1={0} y1={GROUND_Y} x2={FIELD_W} y2={GROUND_Y} stroke="hsl(28 60% 22%)" strokeWidth={4} />
              {/* Fighters */}
              <FighterSvg f={playerRef.current} now={performance.now()} />
              <FighterSvg f={botRef.current} now={performance.now()} />
              {/* Damage popups */}
              {hitMarks.map(h => (
                <text key={h.id} x={h.x} y={h.y} textAnchor="middle"
                  fontFamily="ui-monospace, monospace" fontWeight="900"
                  fontSize={h.kind === "mega" ? 42 : 28}
                  fill={h.kind === "mega" ? "hsl(45 100% 60%)" : "hsl(0 100% 65%)"}
                  stroke="black" strokeWidth={2} paintOrder="stroke"
                  style={{ animation: "floatUp 0.7s ease-out forwards" }}>
                  -{h.n}{h.kind === "mega" ? "!" : ""}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 p-3 flex items-center justify-center gap-3">
        <Hint label="A / D" sub="move" />
        <Hint label="W / Space" sub="jump" />
        <AttackBtn n={1} label={myTemplate.main_attack_name} dmg={playerRef.current.mainDmg}
          ready={performance.now() >= playerRef.current.mainCdReady}
          cdMs={myTemplate.main_cooldown_ms} readyAt={playerRef.current.mainCdReady}
          onClick={() => tryAttack(playerRef.current, botRef.current, "main")} kind="main" />
        <AttackBtn n={2} label={myTemplate.mega_attack_name} dmg={playerRef.current.megaDmg}
          ready={performance.now() >= playerRef.current.megaCdReady}
          cdMs={myTemplate.mega_cooldown_ms} readyAt={playerRef.current.megaCdReady}
          onClick={() => tryAttack(playerRef.current, botRef.current, "mega")} kind="mega" />
      </div>

      {/* Outcome overlay */}
      {outcome !== null && <OutcomeOverlay outcome={outcome} template={myTemplate} />}

      <style>{`
        @keyframes floatUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-40px); opacity: 0; } }
      `}</style>
    </div>
  );
}

function HpBar({ f, align }: { f: Fighter; align: "left" | "right" }) {
  const pct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
  return (
    <div className={`flex-1 min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="flex items-center gap-2 mb-1 text-xs font-semibold" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        <span className="truncate">{f.name}</span>
        <span className="opacity-70 font-mono">{f.hp} / {f.maxHp}</span>
      </div>
      <div className="h-3 rounded-full bg-black/50 border border-white/15 overflow-hidden">
        <div className="h-full transition-[width] duration-200"
          style={{
            width: `${pct}%`,
            marginLeft: align === "right" ? `${100 - pct}%` : 0,
            background: align === "left"
              ? "linear-gradient(90deg, hsl(140 80% 50%), hsl(110 80% 55%))"
              : "linear-gradient(90deg, hsl(0 85% 60%), hsl(15 90% 55%))",
          }} />
      </div>
    </div>
  );
}

function FighterSvg({ f, now }: { f: Fighter; now: number }) {
  const flashing = now < f.flashUntil;
  const attacking = now < f.attackUntil;
  const lean = attacking ? (f.facing === 1 ? 8 : -8) : 0;
  return (
    <g transform={`translate(${f.x}, ${f.y})`}>
      {/* Shadow */}
      <ellipse cx={SPRITE_W / 2} cy={SPRITE_H + (GROUND_Y - f.y - SPRITE_H) + 8}
        rx={SPRITE_W * 0.35} ry={6} fill="black" opacity="0.35" />
      <g transform={`translate(${lean}, 0) scale(${f.facing}, 1) translate(${f.facing === -1 ? -SPRITE_W : 0}, 0)`}>
        {f.template.battle_sprite_url ? (
          <image href={f.template.battle_sprite_url} x={0} y={0} width={SPRITE_W} height={SPRITE_H}
            style={{ filter: flashing ? "brightness(2.5) drop-shadow(0 0 10px white)" : "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}
            preserveAspectRatio="xMidYMid meet" />
        ) : (
          <g>
            <rect x={0} y={0} width={SPRITE_W} height={SPRITE_H} rx={16}
              fill={flashing ? "white" : "hsl(160 60% 50%)"} stroke="black" strokeWidth={3} />
            <text x={SPRITE_W / 2} y={SPRITE_H / 2 + 24} textAnchor="middle" fontSize={70}>{f.template.emoji}</text>
          </g>
        )}
      </g>
      {/* Attack arc */}
      {attacking && (
        <path
          d={`M ${f.facing === 1 ? SPRITE_W : 0} ${SPRITE_H / 2}
              a ${f.attackKind === "mega" ? f.template.mega_range : f.template.main_range} 60
                0 0 ${f.facing === 1 ? 1 : 0}
                ${f.facing === 1 ? (f.attackKind === "mega" ? f.template.mega_range : f.template.main_range) : -(f.attackKind === "mega" ? f.template.mega_range : f.template.main_range)} 0`}
          stroke={f.attackKind === "mega" ? "hsl(45 100% 60%)" : "hsl(0 100% 65%)"}
          strokeWidth={f.attackKind === "mega" ? 10 : 6} fill="none" opacity={0.75} strokeLinecap="round" />
      )}
    </g>
  );
}

function Hint({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
      <div className="font-mono font-bold text-white text-sm">{label}</div>
      <div>{sub}</div>
    </div>
  );
}

function AttackBtn({ n, label, dmg, ready, cdMs, readyAt, onClick, kind }: {
  n: number; label: string; dmg: number; ready: boolean; cdMs: number; readyAt: number;
  onClick: () => void; kind: "main" | "mega";
}) {
  const remain = Math.max(0, readyAt - performance.now());
  const pct = ready ? 100 : Math.max(0, 100 - (remain / cdMs) * 100);
  return (
    <button onClick={onClick} disabled={!ready}
      className={`relative overflow-hidden px-4 py-2 rounded-xl border-2 font-display font-bold text-left transition
        ${kind === "mega"
          ? "border-amber-300 bg-gradient-to-b from-amber-400/30 to-amber-600/20 text-amber-50"
          : "border-rose-300 bg-gradient-to-b from-rose-400/30 to-rose-600/20 text-rose-50"}
        ${ready ? "hover:scale-[1.03] active:scale-95" : "opacity-50 cursor-not-allowed"}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/20">{n}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-xs opacity-80 font-mono">-{dmg}{kind === "mega" ? "!" : ""}</div>
      <div className="absolute bottom-0 left-0 h-1 bg-white/80" style={{ width: `${pct}%`, transition: "width 100ms linear" }} />
    </button>
  );
}

function OutcomeOverlay({ outcome, template }: { outcome: Outcome; template: Template }) {
  const win = outcome === "win";
  const draw = outcome === null;
  const title = draw ? "Draw" : win ? "Victory!" : "Defeat";
  const color = draw ? "hsl(35 90% 55%)" : win ? "hsl(220 90% 60%)" : "hsl(0 85% 60%)";
  const gif = draw ? template.draw_gif_url : win ? template.win_gif_url : template.lose_gif_url;
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="text-center">
        {gif && <img src={gif} alt="" className="w-48 h-48 mx-auto object-contain" />}
        <div className="font-display text-6xl font-black mb-2" style={{ color, textShadow: `0 0 30px ${color}` }}>{title}</div>
        <div className="text-white/70 font-mono">
          {win ? "+10 trophies" : outcome === "lose" ? "−5 trophies" : "no change"}
        </div>
      </div>
    </div>
  );
}
