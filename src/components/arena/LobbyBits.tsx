import type { ReactNode } from "react";
import noodlesIcon from "@/assets/arena2/noodles-icon.png.asset.json";
import noodlePacket from "@/assets/arena2/noodle-packet.png.asset.json";
import trophyIcon from "@/assets/arena2/trophy-icon.png.asset.json";

export const DISPLAY_FONT = '"Lilita One","Fredoka","Nunito",system-ui,sans-serif';
export const TEXT_SHADOW = "0 2px 0 rgba(0,0,0,0.55)";

/* ── top center currency bar ───────────────────────────────── */
export function CurrencyBar({
  noodles, lumina, packets, highlight,
}: { noodles: number; lumina: number; packets: number; highlight?: boolean }) {
  return (
    <div
      className="h-11 flex items-center justify-center gap-2 rounded-lg bg-black px-4 text-[19px] text-white"
      style={{
        fontFamily: DISPLAY_FONT,
        boxShadow: highlight ? "0 0 0 3px #facc15" : "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      <span className="tabular-nums">{noodles.toLocaleString()}</span>
      <img src={noodlesIcon.url} alt="Noodles" className="h-6 w-6 object-contain" />
      <span className="text-white/45">|</span>
      <span className="tabular-nums">{lumina.toLocaleString()}</span>
      <span className="text-sky-300">✦</span>
      <span className="text-white/45">|</span>
      <span className="tabular-nums">{packets.toLocaleString()}</span>
      <img src={noodlePacket.url} alt="Noodle packets" className="h-6 w-6 object-contain" />
    </div>
  );
}

/* ── square black button used in the top-right group ───────── */
export function TopButton({
  children, onClick, label, highlight, width = 90,
}: { children: ReactNode; onClick: () => void; label: string; highlight?: boolean; width?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="h-11 rounded-lg bg-black grid place-items-center transition hover:brightness-125 active:scale-95"
      style={{ width, boxShadow: highlight ? "0 0 0 3px #facc15" : "0 2px 8px rgba(0,0,0,0.5)" }}
    >
      {children}
    </button>
  );
}

/* ── player icon + username (top left) ─────────────────────── */
export function PlayerIcon({
  name, avatarUrl, onClick,
}: { name: string; avatarUrl: string | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-1 group text-left">
      <div
        className="h-[74px] w-[70px] rounded-md grid place-items-center overflow-hidden text-3xl text-white group-hover:brightness-110 group-active:scale-95 transition"
        style={{
          fontFamily: DISPLAY_FONT,
          background: "linear-gradient(180deg,#4fd6c0,#3aa89a)",
          boxShadow: "0 3px 0 rgba(0,0,0,0.35)",
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          : (name[0] || "P").toUpperCase()}
      </div>
      <div className="text-white text-[21px]" style={{ fontFamily: DISPLAY_FONT, textShadow: TEXT_SHADOW }}>
        {name}
      </div>
    </button>
  );
}

/* ── fanned warrior cards + label (left rail) ──────────────── */
export function WarriorsCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative block w-[150px] active:scale-95 transition group">
      <div className="relative h-[72px] w-full">
        <FanCard color="#f2703a" x={-30} rot={-14} />
        <FanCard color="#4fc46a" x={0} rot={0} />
        <FanCard color="#9b6ff0" x={30} rot={14} />
      </div>
      <div
        className="relative -mt-3 mx-auto w-[130px] rounded-full bg-black py-1 text-center text-[17px] text-white group-hover:brightness-125"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        Warriors
      </div>
    </button>
  );
}

function FanCard({ color, x, rot }: { color: string; x: number; rot: number }) {
  return (
    <div
      className="absolute left-1/2 top-0 h-[70px] w-[44px] rounded-md"
      style={{
        background: color,
        transform: `translateX(calc(-50% + ${x}px)) rotate(${rot}deg)`,
        boxShadow: "inset 0 -8px 0 rgba(0,0,0,0.14), 0 3px 8px rgba(0,0,0,0.45)",
        border: "2px solid rgba(0,0,0,0.25)",
      }}
    >
      <div className="mx-auto mt-3 h-3 w-3 rounded-sm bg-white/70" />
      <div className="mx-auto mt-2 h-6 w-5 rounded-sm bg-white/25" />
    </div>
  );
}

/* ── level hexagon (EXP road) ──────────────────────────────── */
export function LevelHex({ level, onClick }: { level: number; onClick: () => void }) {
  const clip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  return (
    <button onClick={onClick} className="relative h-[104px] w-[112px] active:scale-95 transition hover:brightness-110">
      <div className="absolute inset-0" style={{ clipPath: clip, background: "#f5b731" }} />
      <div
        className="absolute inset-[4px]"
        style={{ clipPath: clip, background: "linear-gradient(180deg,#9b5cf0,#6d28d9)" }}
      />
      <div
        className="absolute inset-0 grid place-items-center leading-none text-white"
        style={{ fontFamily: DISPLAY_FONT, textShadow: TEXT_SHADOW }}
      >
        <div className="text-center">
          <div className="text-[19px]">Lv.</div>
          <div className="text-[34px]">{level}</div>
        </div>
      </div>
    </button>
  );
}

/* ── trophy count + road progress ──────────────────────────── */
export function TrophyMeter({ trophies, onClick }: { trophies: number; onClick: () => void }) {
  const pct = Math.min(100, ((trophies % 100) / 100) * 100);
  return (
    <button onClick={onClick} className="flex flex-col items-start active:scale-95 transition">
      <div className="flex items-center gap-2">
        <img src={trophyIcon.url} alt="Trophies" className="h-14 w-14 object-contain drop-shadow-lg" />
        <span className="text-[26px] text-white" style={{ fontFamily: DISPLAY_FONT, textShadow: TEXT_SHADOW }}>
          {trophies}
        </span>
      </div>
      <div
        className="-mt-1 ml-2 h-[14px] w-[140px] overflow-hidden rounded-full"
        style={{ background: "#8a7a2e", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(180deg,#a7f3a0,#22c55e)" }} />
      </div>
    </button>
  );
}

/* ── right rail icon tile ──────────────────────────────────── */
export function RailTile({
  label, img, text, onClick, highlight,
}: { label: string; img?: string; text?: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-[92px] rounded-xl bg-black px-1 pb-1 pt-1.5 transition hover:brightness-125 active:scale-95"
      style={{ boxShadow: highlight ? "0 0 0 3px #facc15" : "0 3px 10px rgba(0,0,0,0.55)" }}
    >
      <div className="grid h-[42px] place-items-center">
        {img
          ? <img src={img} alt="" className="max-h-[42px] max-w-[64px] object-contain" />
          : <span className="text-[24px] text-white" style={{ fontFamily: DISPLAY_FONT }}>{text}</span>}
      </div>
      <div
        className="mt-0.5 text-center text-[13px] leading-[1.05] text-white"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {label}
      </div>
    </button>
  );
}
