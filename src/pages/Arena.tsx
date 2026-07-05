import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, Globe } from "lucide-react";
import { ComingSoon } from "@/components/arena/ComingSoon";
import { BattleView } from "@/components/arena/BattleView";
import { Roster } from "@/components/arena/Roster";
import type { Template, Warrior } from "@/components/arena/types";

import bgAsset from "@/assets/arena2/lobby-bg.png.asset.json";
import warriorsIcon from "@/assets/arena2/warriors-icon.png.asset.json";
import trophyRoad from "@/assets/arena2/trophy-road.png.asset.json";
import trophyIcon from "@/assets/arena2/trophy-icon.png.asset.json";
import expRoad from "@/assets/arena2/exp-road.png.asset.json";
import noodlesIcon from "@/assets/arena2/noodles-icon.png.asset.json";
import noodlePacket from "@/assets/arena2/noodle-packet.png.asset.json";
import newsIcon from "@/assets/arena2/news-icon.png.asset.json";
import shopIcon from "@/assets/arena2/shop-icon.png.asset.json";
import truaeroIcon from "@/assets/arena2/truaero-icon.png.asset.json";
import passIcon from "@/assets/arena2/pass-icon.png.asset.json";

type Profile = {
  user_id: string; display_name: string; avatar_url: string | null;
  level: number; noodles: number; lumina: number;
};
type Modal = null | "warriors" | "gardens" | "news" | "shop" | "friends" | "pass" | "truaero" | "settings" | "world" | "playericon" | "gamemode" | "trophyRoad" | "expRoad";

export default function Arena() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [playing, setPlaying] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [warriors, setWarriors] = useState<Warrior[]>([]);

  // Auth
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) nav("/auth", { replace: true }); else setUserId(s.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth", { replace: true }); else setUserId(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  // Data
  const load = async () => {
    if (!userId) return;
    const [p, t, w] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,avatar_url,level,noodles,lumina").eq("user_id", userId).maybeSingle(),
      supabase.from("warrior_templates").select("*").eq("is_active", true),
      supabase.from("user_warriors").select("*").eq("user_id", userId),
    ]);
    setMe((p.data as Profile) || null);
    setTemplates((t.data as Template[]) || []);
    let list = (w.data as Warrior[]) || [];
    if (list.length === 0) {
      await supabase.rpc("grant_starter_warrior");
      const re = await supabase.from("user_warriors").select("*").eq("user_id", userId);
      list = (re.data as Warrior[]) || [];
    }
    setWarriors(list);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const equipped = warriors.find(w => w.is_equipped) || warriors[0];
  const trophies = equipped?.trophies ?? 0;
  const trophyPct = Math.min(100, ((trophies % 100) / 100) * 100);

  if (!userId || !me) {
    return <div className="h-screen grid place-items-center bg-[hsl(240_50%_8%)] text-white/80">Loading the arena…</div>;
  }

  if (playing) return <BattleView onExit={() => setPlaying(false)} meName={me.display_name} />;

  const initial = (me.display_name?.[0] || "P").toUpperCase();

  return (
    <div className="h-screen w-screen overflow-hidden relative text-white"
         style={{ fontFamily: '"Fredoka","Nunito",system-ui,sans-serif' }}>
      {/* Background */}
      <img src={bgAsset.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Back */}
      <button onClick={() => nav("/app")}
        className="absolute top-3 left-3 z-30 h-9 w-9 grid place-items-center rounded-lg bg-black/40 hover:bg-black/60 border border-white/15">
        <ArrowLeft className="h-4 w-4" />
      </button>

      {/* ============ TOP BAR (currency + world + settings + truaero) ============ */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <CurrencyBar noodles={me.noodles} lumina={me.lumina} packets={0} />
      </div>
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <IconBtn onClick={() => setModal("world")} title="World">
          <Globe className="h-5 w-5 text-sky-300" />
        </IconBtn>
        <IconBtn onClick={() => setModal("settings")} title="Settings">
          <div className="flex gap-0.5">
            {[0,1,2].map(i => <div key={i} className="w-[3px] h-4 bg-white rounded-sm" />)}
          </div>
        </IconBtn>
        <button onClick={() => setModal("truaero")}
          className="h-11 px-3 rounded-xl border-2 border-emerald-300/70 grid place-items-center font-black text-xs
                     bg-gradient-to-b from-teal-400 to-emerald-500 shadow-lg hover:brightness-110">
          TruAero
        </button>
      </div>

      {/* ============ LEFT COLUMN ============ */}
      <div className="absolute top-16 left-3 z-20 flex flex-col items-start gap-4 w-24">
        {/* Player icon + name (slide 15) */}
        <button onClick={() => setModal("playericon")} className="flex flex-col items-start gap-1 group">
          <div className="h-14 w-14 rounded-lg grid place-items-center font-black text-white text-lg
                          bg-gradient-to-b from-teal-400 to-emerald-500 border-2 border-emerald-300/70 shadow-lg group-hover:brightness-110">
            {me.avatar_url ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover rounded-md" /> : initial}
          </div>
          <div className="text-white font-black text-sm drop-shadow" style={{ textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}>{me.display_name}</div>
        </button>

        {/* Warriors card (slide 14) */}
        <button onClick={() => setModal("warriors")} className="group active:scale-95 transition">
          <div className="relative w-20 h-16">
            <StackCard color="#22c55e" x={-8} rot={-8} />
            <StackCard color="#f97316" x={0}  rot={0} />
            <StackCard color="#a855f7" x={8}  rot={8} />
          </div>
          <div className="mt-1 w-24 py-1 rounded-full bg-black/70 border border-white/15 grid place-items-center font-black text-xs">
            Warriors
          </div>
        </button>

        {/* Level hex (slide 12/13) */}
        <button onClick={() => setModal("expRoad")}
          className="relative w-20 h-[92px] grid place-items-center active:scale-95 transition"
          style={{ background: "linear-gradient(180deg,#a855f7,#7e22ce)",
                   clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)",
                   filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.35))" }}>
          <div className="absolute inset-1"
               style={{ background: "hsl(258 60% 22%)",
                        clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)" }} />
          <div className="relative text-center font-black leading-tight" style={{ color: "#facc15" }}>
            <div className="text-[10px]">Lv.</div>
            <div className="text-2xl">{me.level}</div>
          </div>
        </button>

        {/* Trophy road (slide 12) */}
        <button onClick={() => setModal("trophyRoad")} className="flex flex-col items-start gap-1 active:scale-95 transition">
          <div className="flex items-center gap-1">
            <img src={trophyIcon.url} alt="" className="w-11 h-11 drop-shadow" />
            <div className="font-black text-lg" style={{ textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}>{trophies}</div>
          </div>
          <div className="relative w-24 h-2.5 rounded-full bg-black/60 border border-white/20 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${trophyPct}%`, background: "linear-gradient(180deg,#bbf7d0,#22c55e)" }} />
          </div>
        </button>
      </div>

      {/* ============ RIGHT COLUMN ============ */}
      <div className="absolute top-16 right-3 z-20 flex flex-col items-end gap-3 w-40">
        {/* Celestial Gardens (slide 11) */}
        <button onClick={() => setModal("gardens")}
          className="w-full h-20 rounded-3xl grid place-items-center font-black text-white text-lg leading-tight border-2 border-purple-300/60
                     bg-gradient-to-b from-purple-500 to-purple-800 shadow-[0_6px_0_#4c1d95,0_10px_30px_rgba(76,29,149,0.5)] hover:brightness-110 active:translate-y-1">
            Celestial<br/>Gardens
        </button>

        {/* Rail icons (news/shop/friends/pass) */}
        <RailIcon onClick={() => setModal("news")}   label="News"   img={newsIcon.url} />
        <RailIcon onClick={() => setModal("shop")}   label="Shop"   img={shopIcon.url} />
        <RailIcon onClick={() => setModal("friends")} label="Friends" emoji=":3" />
        <RailIcon onClick={() => setModal("pass")}   label="Season Pass" img={passIcon.url} small />
      </div>

      {/* ============ BOTTOM BAR (mode + PLAY) ============ */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end gap-3">
        <button onClick={() => setModal("gamemode")}
          className="flex-1 h-14 rounded-xl bg-black/75 border-2 border-white/20 grid place-items-center hover:bg-black/85 transition">
          <div className="text-center leading-tight">
            <div className="font-black text-lg flex items-center gap-2 justify-center">⚔️ Showdown 1v1</div>
            <div className="text-xs text-white/70 font-bold">Map Name here!</div>
          </div>
        </button>
        <button onClick={() => setPlaying(true)}
          className="h-14 px-10 rounded-xl font-black text-3xl tracking-widest
                     bg-gradient-to-b from-yellow-300 to-amber-400 text-black
                     border-2 border-yellow-200 shadow-[0_6px_0_#b45309,0_12px_30px_rgba(250,204,21,0.5)]
                     hover:brightness-110 active:translate-y-1">
          PLAY
        </button>
      </div>

      {/* ============ MODALS ============ */}
      <ComingSoon open={modal === "news"}     title="News"          blurb="Sneak peeks, patch notes, and updates will live here." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "shop"}     title="Shop"          blurb="Spend noodles, lumina, and packets on cosmetics and upgrades." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "friends"}  title="Friends"       blurb="Add friends by user ID or QR code and challenge them." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "pass"}     title="Season Pass"   blurb="Free, Plus, and Pro tracks are being finalized." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "truaero"}  title="TruAero"       blurb="Legacy Aero player rewards and gifts are on the way." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "settings"} title="Settings"      blurb="Volume, FOV, and control preferences." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "world"}    title="World"         blurb="Explore player-made tabs and worlds." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "playericon"} title="Player Profile" blurb="Change your icon, banner, and display name." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "trophyRoad"} title="Trophy Road" blurb="Earn rewards as your warriors climb the ladder." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "expRoad"}  title="Level Road"    blurb="Level up to unlock warriors, cosmetics, and more." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "gardens"}  title="Celestial Gardens" blurb="This season's rotating event map. Full arena launching soon." onClose={() => setModal(null)} />
      <ComingSoon open={modal === "gamemode"} title="More Gamemodes" blurb="Showdown 1v1 is live. Blitz, 2v2, and Duo Showdown are queued up." onClose={() => setModal(null)} />

      {/* Warriors modal — full roster */}
      {modal === "warriors" && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="max-w-5xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <Roster
              warriors={warriors} templates={templates}
              equippedId={equipped?.id || null}
              onEquip={async (id) => {
                await supabase.from("user_warriors").update({ is_equipped: false }).eq("user_id", userId);
                await supabase.from("user_warriors").update({ is_equipped: true }).eq("id", id);
                load();
              }}
              onUpgraded={load}
              onBack={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ————— pieces ————— */

function CurrencyBar({ noodles, lumina, packets }: { noodles: number; lumina: number; packets: number }) {
  return (
    <div className="h-9 flex items-center gap-2 px-3 rounded-full bg-black/80 border border-white/15 font-black text-sm">
      <span className="tabular-nums">{noodles}</span>
      <img src={noodlesIcon.url} alt="" className="h-5 w-5" />
      <span className="text-white/40">|</span>
      <span className="tabular-nums">{lumina}</span>
      <span className="text-sky-300">✦</span>
      <span className="text-white/40">|</span>
      <span className="tabular-nums">{packets}</span>
      <img src={noodlePacket.url} alt="" className="h-5 w-5" />
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      className="h-11 w-11 rounded-xl grid place-items-center bg-black/80 border border-white/15 hover:bg-black/90 transition">
      {children}
    </button>
  );
}

function StackCard({ color, x, rot }: { color: string; x: number; rot: number }) {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-14 rounded-md border border-black/40"
         style={{ background: color, transform: `translate(calc(-50% + ${x}px),0) rotate(${rot}deg)`,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 -6px 0 rgba(0,0,0,0.15)" }} />
  );
}

function RailIcon({ label, img, emoji, onClick, small }: { label: string; img?: string; emoji?: string; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-14 h-14 rounded-xl bg-black/80 border border-white/15 grid place-items-center relative hover:bg-black/90 active:scale-95 transition">
      {img
        ? <img src={img} alt="" className={small ? "w-9 h-9 object-contain" : "w-10 h-10 object-contain"} />
        : <span className="text-lg font-black">{emoji}</span>}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-black px-1.5 py-0.5 rounded whitespace-nowrap border border-white/15">
        {label}
      </div>
    </button>
  );
}
