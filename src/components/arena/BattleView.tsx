import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import toriMain from "@/assets/arena2/tori-main.png.asset.json";
import toriMega from "@/assets/arena2/tori-mega.png.asset.json";

/**
 * BattleView — scaffold HUD matching concept slides 20-29.
 * Single-player vs a scripted bot, so the concept fits end-to-end.
 * Controls: WASD/arrows move. 1 = Main. 2 = Mega. Hold to aim, release to fire (or click to auto-aim).
 */
type Fighter = { x: number; y: number; hp: number; maxHp: number; facing: 1 | -1; name: string; isMe?: boolean };

const GROUND_Y = 88; // % from top for ground line
const WORLD_W = 1600;
const MAIN_COOLDOWN = 900;
const MEGA_COOLDOWN = 3500;
const MAIN_DMG = 80;
const MEGA_DMG = 260;
const MATCH_MS = 5 * 60 * 1000;

export function BattleView({ onExit, meName }: { onExit: () => void; meName: string }) {
  const [me, setMe] = useState<Fighter>({ x: 300, y: 0, hp: 2000, maxHp: 2000, facing: 1, name: meName, isMe: true });
  const [foe, setFoe] = useState<Fighter>({ x: 1200, y: 0, hp: 2000, maxHp: 2000, facing: -1, name: "Turtle" });
  const [selected, setSelected] = useState<null | 1 | 2>(null);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 800, y: 400 });
  const [cool, setCool] = useState<{ main: number; mega: number }>({ main: 0, mega: 0 });
  const [projectiles, setProjectiles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; kind: 1 | 2; owner: "me" | "foe" }>>([]);
  const [elim, setElim] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(MATCH_MS);
  const [status, setStatus] = useState<"playing" | "win" | "lose" | "draw">("playing");
  const stageRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const projIdRef = useRef(1);

  // Timer
  useEffect(() => {
    if (status !== "playing") return;
    const t = setInterval(() => setTimeLeft(v => Math.max(0, v - 100)), 100);
    return () => clearInterval(t);
  }, [status]);

  // End conditions
  useEffect(() => {
    if (status !== "playing") return;
    if (me.hp <= 0) setStatus("lose");
    else if (foe.hp <= 0) setStatus("win");
    else if (timeLeft === 0) setStatus(me.hp > foe.hp ? "win" : me.hp < foe.hp ? "lose" : "draw");
  }, [me.hp, foe.hp, timeLeft, status]);

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === "1") setSelected(1);
      if (e.key === "2") setSelected(2);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      if (status === "playing") {
        // Move me
        setMe(m => {
          let x = m.x, facing = m.facing;
          const k = keysRef.current;
          if (k.has("a") || k.has("arrowleft"))  { x -= 0.45 * dt; facing = -1; }
          if (k.has("d") || k.has("arrowright")) { x += 0.45 * dt; facing = 1; }
          x = Math.max(60, Math.min(WORLD_W - 60, x));
          return { ...m, x, facing };
        });
        // Cooldowns
        setCool(c => ({ main: Math.max(0, c.main - dt), mega: Math.max(0, c.mega - dt) }));
        // Bot AI
        setFoe(f => {
          if (Math.random() < 0.02) return { ...f, x: f.x + (Math.random() - 0.5) * 60 };
          return f;
        });
        if (Math.random() < 0.008) {
          setFoe(f => {
            setProjectiles(p => [...p, { id: projIdRef.current++, x: f.x, y: 400, vx: (me.x < f.x ? -0.6 : 0.6), vy: -0.1, kind: 1, owner: "foe" }]);
            return f;
          });
        }
        // Projectiles
        setProjectiles(list => list.map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
          .filter(p => p.x > -50 && p.x < WORLD_W + 50 && p.y < 700));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, me.x]);

  // Hit detection
  useEffect(() => {
    if (!projectiles.length) return;
    for (const p of projectiles) {
      if (p.owner === "me" && Math.abs(p.x - foe.x) < 60 && Math.abs(p.y - 380) < 80) {
        setFoe(f => ({ ...f, hp: Math.max(0, f.hp - (p.kind === 2 ? MEGA_DMG : MAIN_DMG)) }));
        setProjectiles(list => list.filter(x => x.id !== p.id));
        if (foe.hp - (p.kind === 2 ? MEGA_DMG : MAIN_DMG) <= 0) { setElim(`${meName} eliminated ${foe.name}`); setTimeout(() => setElim(null), 3000); }
      } else if (p.owner === "foe" && Math.abs(p.x - me.x) < 60 && Math.abs(p.y - 380) < 80) {
        setMe(m => ({ ...m, hp: Math.max(0, m.hp - (p.kind === 2 ? MEGA_DMG : MAIN_DMG)) }));
        setProjectiles(list => list.filter(x => x.id !== p.id));
      }
    }
  }, [projectiles, foe.x, me.x, foe.hp, foe.name, meName]);

  const fire = (kind: 1 | 2, tx: number, ty: number) => {
    const cd = kind === 2 ? cool.mega : cool.main;
    if (cd > 0) return;
    const cy = 380;
    const dx = tx - me.x, dy = ty - cy;
    const len = Math.max(1, Math.hypot(dx, dy));
    const spd = kind === 2 ? 0.9 : 0.7;
    setProjectiles(p => [...p, { id: projIdRef.current++, x: me.x, y: cy, vx: (dx / len) * spd, vy: (dy / len) * spd, kind, owner: "me" }]);
    setCool(c => kind === 2 ? { ...c, mega: MEGA_COOLDOWN } : { ...c, main: MAIN_COOLDOWN });
    setSelected(null);
    setAim(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * WORLD_W;
    const y = ((e.clientY - r.top) / r.height) * 640;
    setCursor({ x, y });
    if (selected) setAim({ x, y });
  };
  const onMouseDown = () => { if (selected) fire(selected, cursor.x, cursor.y); };

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(275_60%_35%)] text-white select-none overflow-hidden"
         onMouseMove={onMouseMove} onMouseDown={onMouseDown}>
      {/* Exit */}
      <button onClick={onExit} className="absolute top-3 left-3 z-30 h-9 w-9 grid place-items-center rounded-lg bg-black/50 hover:bg-black/70">
        <X className="h-4 w-4" />
      </button>

      {/* Purple map w/ platforms */}
      <div ref={stageRef} className="absolute inset-0" style={{ background: "linear-gradient(180deg,#7c3aed 0%,#6d28d9 60%,#5b21b6 100%)" }}>
        {/* Platform (top-left, matches concept) */}
        <div className="absolute" style={{ left: "6%", top: "18%", width: "24%", height: 22 }}>
          <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(180deg,#4c1d95 0%,#3730a3 100%)", boxShadow: "0 4px 0 #2e1065" }} />
        </div>
        {/* Ground bar */}
        <div className="absolute inset-x-0" style={{ top: `${GROUND_Y - 4}%`, height: `${100 - GROUND_Y + 4}%`, background: "linear-gradient(180deg,#16a34a 0%,#15803d 30%,#166534 100%)" }} />

        {/* Enemy HP bar top-left */}
        <div className="absolute top-8 left-8 w-72 h-9 rounded-full bg-black/40 border-2 border-white/20 overflow-hidden shadow">
          <div className="h-full rounded-full transition-[width]" style={{ width: `${(foe.hp / foe.maxHp) * 100}%`, background: "linear-gradient(180deg,#4ade80,#16a34a)" }} />
          <div className="absolute inset-0 grid place-items-center font-black text-white drop-shadow">{foe.hp}</div>
        </div>

        {/* Timer */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-black text-white font-black text-xl tracking-widest border-2 border-white/20 shadow-lg">
          {mins}:{secs}
        </div>

        {/* Off-screen arrows */}
        <OffscreenArrow side="left" label="1" active={foe.x < me.x - 400} />
        <OffscreenArrow side="right" label="2" active={foe.x > me.x + 400} />

        {/* Fighters + name tags — perspective transformed via world coords */}
        <Sprite x={me.x} facing={me.facing} label="you" me />
        <Sprite x={foe.x} facing={foe.facing} label={foe.name} />

        {/* Aim ghost */}
        {aim && selected && (
          <>
            <div className="absolute rounded-full pointer-events-none"
              style={{ left: `${(aim.x / WORLD_W) * 100}%`, top: `${(aim.y / 640) * 100}%`, width: 44, height: 44, transform: "translate(-50%,-50%)",
                       background: selected === 2 ? "rgba(250,204,21,0.35)" : "rgba(239,68,68,0.35)",
                       border: `2px solid ${selected === 2 ? "#facc15" : "#ef4444"}` }} />
            <div className="absolute pointer-events-none" style={{ left: `${(aim.x / WORLD_W) * 100}%`, top: `${(aim.y / 640) * 100}%`, transform: "translate(-50%,-50%)", color: selected === 2 ? "#facc15" : "#ef4444", fontSize: 20, lineHeight: 1 }}>+</div>
          </>
        )}

        {/* Projectiles */}
        {projectiles.map(p => (
          <div key={p.id} className="absolute rounded-full pointer-events-none"
               style={{ left: `${(p.x / WORLD_W) * 100}%`, top: `${(p.y / 640) * 100}%`, width: p.kind === 2 ? 32 : 20, height: p.kind === 2 ? 32 : 20,
                        transform: "translate(-50%,-50%)",
                        background: p.owner === "me"
                          ? (p.kind === 2 ? "radial-gradient(#fef3c7,#f59e0b)" : "radial-gradient(#fecaca,#dc2626)")
                          : "radial-gradient(#c7d2fe,#4f46e5)",
                        boxShadow: `0 0 20px ${p.kind === 2 ? "#facc15" : "#ef4444"}` }} />
        ))}

        {/* Elimination bar bottom */}
        <div className="absolute bottom-0 inset-x-0 h-9 flex items-center text-sm font-black">
          <div className="h-full flex-1 grid place-items-center" style={{ background: "linear-gradient(180deg,#38bdf8,#0284c7)" }}>Imp</div>
          <div className="h-full flex-1 grid place-items-center" style={{ background: "linear-gradient(180deg,#f87171,#dc2626)" }}>pmI</div>
          <div className="h-full flex-1" style={{ background: "linear-gradient(90deg,#fde68a,#fbcfe8,#c7d2fe)" }} />
        </div>

        {/* Elim callout */}
        {elim && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/70 border border-white/20 font-black">
            {elim}
          </div>
        )}

        {/* Attack buttons + selected name */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-end gap-3 z-20 pointer-events-none">
          <AttackBtn kind={1} selected={selected === 1} cooldown={cool.main} max={MAIN_COOLDOWN} />
          <AttackBtn kind={2} selected={selected === 2} cooldown={cool.mega} max={MEGA_COOLDOWN} />
          <div className="ml-2 font-black text-lg drop-shadow" style={{ textShadow: "0 2px 0 #000" }}>
            {selected === 1 ? "Photon Kick." : selected === 2 ? "Mega Blaster!" : "None selected"}
          </div>
        </div>

        {/* End screen */}
        {status !== "playing" && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/70">
            <div className="rounded-3xl border-4 border-white/20 bg-gradient-to-b from-purple-800 to-purple-950 p-8 text-center">
              <div className="text-6xl mb-3">{status === "win" ? "🏆" : status === "lose" ? "💀" : "🤝"}</div>
              <div className="text-4xl font-black">{status === "win" ? "VICTORY" : status === "lose" ? "DEFEAT" : "DRAW"}</div>
              <button onClick={onExit} className="mt-5 px-6 py-2 rounded-xl bg-yellow-300 text-amber-950 font-black">Return to lobby</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Sprite({ x, facing, label, me }: { x: number; facing: 1 | -1; label: string; me?: boolean }) {
  return (
    <>
      <div className="absolute px-2 py-0.5 rounded-full bg-[hsl(150_50%_60%)]/80 text-white font-bold text-xs pointer-events-none"
           style={{ left: `${(x / WORLD_W) * 100}%`, top: "52%", transform: "translate(-50%,0)" }}>
        {label}
      </div>
      <div className="absolute pointer-events-none"
           style={{ left: `${(x / WORLD_W) * 100}%`, top: "58%", transform: `translate(-50%,0) scaleX(${facing})` }}>
        <div className="relative w-32 h-32">
          {/* Little turtle-ish body — swap with sprite later */}
          <div className="absolute inset-x-4 bottom-2 h-16 rounded-[50%]"
               style={{ background: me ? "radial-gradient(#86efac,#22c55e)" : "radial-gradient(#86efac,#16a34a)" }} />
          <div className="absolute right-0 top-6 h-14 w-14 rounded-full"
               style={{ background: "radial-gradient(#86efac,#22c55e)" }} />
          <div className="absolute right-2 top-9 h-2.5 w-2.5 rounded-full bg-black" />
          <div className="absolute right-6 top-9 h-2.5 w-2.5 rounded-full bg-black" />
        </div>
      </div>
    </>
  );
}

function AttackBtn({ kind, selected, cooldown, max }: { kind: 1 | 2; selected: boolean; cooldown: number; max: number }) {
  const color = kind === 2 ? "#facc15" : "#ef4444";
  const label = kind === 2 ? "Mega" : "Main";
  const pct = cooldown > 0 ? cooldown / max : 0;
  return (
    <div className="relative w-20 h-20 rounded-2xl bg-white grid place-items-center font-black text-3xl shadow-lg pointer-events-auto"
         style={{ boxShadow: selected ? `0 0 0 5px ${color}, 0 8px 0 rgba(0,0,0,0.3)` : `0 0 0 3px ${color}, 0 8px 0 rgba(0,0,0,0.3)`, color }}>
      <div className="flex flex-col items-center leading-none">
        <span>{kind}</span>
        <span className="text-[10px] mt-0.5 tracking-wider">{label}</span>
      </div>
      {pct > 0 && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 bg-black/50" style={{ height: `${pct * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function OffscreenArrow({ side, label, active }: { side: "left" | "right"; label: string; active: boolean }) {
  return (
    <div className={`absolute top-1/2 ${side === "left" ? "left-4" : "right-4"} -translate-y-1/2 grid place-items-center font-black text-2xl w-14 h-14 rounded-lg transition ${active ? "bg-yellow-300 text-black shadow-[0_0_20px_#facc15]" : "bg-white text-black opacity-70"}`}
         style={{ clipPath: side === "left" ? "polygon(30% 0,100% 0,100% 100%,30% 100%,0 50%)" : "polygon(0 0,70% 0,100% 50%,70% 100%,0 100%)" }}>
      {label}
    </div>
  );
}
