import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArenaTab } from "@/components/ArenaTab";
import { ArrowLeft, Trophy } from "lucide-react";

type Profile = {
  user_id: string; display_name: string; avatar_url: string | null;
  level: number; noodles: number; lumina: number;
};

export default function Arena() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [packets, setPackets] = useState<number>(0);
  const [arenaTabId, setArenaTabId] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav("/auth", { replace: true });
      else setUserId(session.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav("/auth", { replace: true });
      else setUserId(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [p, t] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url,level,noodles,lumina").eq("user_id", userId).maybeSingle(),
        supabase.from("user_tabs").select("id,kind").eq("user_id", userId).eq("kind", "arena").limit(1),
      ]);
      setMe((p.data as Profile) || null);
      setPackets(0);
      let tab = (t.data as any[])?.[0];
      if (!tab) {
        const { data: created } = await supabase.from("user_tabs")
          .insert({ user_id: userId, name: "Arena", emoji: "⚔️", kind: "arena", is_public: false })
          .select("id").maybeSingle();
        if (created) tab = created;
      }
      if (tab) setArenaTabId(tab.id);
    };
    load();
    const ch = supabase.channel("arena-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (!userId || !me || !arenaTabId) {
    return (
      <div className="h-screen grid place-items-center bg-[hsl(230_20%_10%)] text-white/80 font-display">
        Loading the arena…
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden text-white"
      style={{ background: "radial-gradient(circle at 20% 0%, hsl(260 60% 18%), hsl(230 30% 8%) 60%)" }}>
      {/* Top bar — mirrors concept slide 2 */}
      <header className="shrink-0 h-14 px-3 sm:px-5 flex items-center gap-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <Link to="/app" className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition" title="Back to app">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 grid place-items-center text-xs font-bold border border-white/15 shrink-0">
            {me.avatar_url ? <img src={me.avatar_url} alt="" className="h-full w-full object-cover" /> : (me.display_name?.[0] || "P").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate max-w-[140px]">{me.display_name}</div>
            <div className="text-[10px] text-white/60 leading-none">Lv {me.level}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <CurrencyPill icon="🍜" value={me.noodles} tint="amber" />
          <CurrencyPill icon="👝" value={packets} tint="rose" />
          <CurrencyPill icon="✦" value={me.lumina} tint="sky" />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <ArenaTab tabId={arenaTabId} myUserId={userId} />
      </main>
    </div>
  );
}

function CurrencyPill({ icon, value, tint }: { icon: string; value: number; tint: "amber" | "sky" | "rose" }) {
  const colors = {
    amber: "from-amber-500/30 to-amber-600/10 border-amber-400/30 text-amber-100",
    sky: "from-sky-500/30 to-sky-600/10 border-sky-400/30 text-sky-100",
    rose: "from-rose-500/30 to-rose-600/10 border-rose-400/30 text-rose-100",
  }[tint];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border bg-gradient-to-b ${colors} font-mono font-semibold text-xs`}>
      <span className="text-sm">{icon}</span>
      <span className="tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}
