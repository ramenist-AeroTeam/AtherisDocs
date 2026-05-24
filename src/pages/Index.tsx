import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CornerChat } from "@/components/CornerChat";
import { RealtimeCursors } from "@/components/RealtimeCursors";
import { BetaDisclaimer } from "@/components/BetaDisclaimer";
import { AeroButton } from "@/components/AeroButton";
import { Tutorial } from "@/components/Tutorial";
import { Splash } from "@/components/Splash";
import { PropertyDoc } from "@/components/editor/PropertyDoc";
import { StatCards } from "@/components/editor/StatCards";
import { PropertyTabBar } from "@/components/PropertyTabBar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { HtmlTab } from "@/components/HtmlTab";
import { LogOut, BookOpen, Volume2, VolumeX } from "lucide-react";

type Profile = {
  user_id: string; email: string | null; display_name: string; avatar_emoji: string;
  avatar_url: string | null;
  level: number; xp: number; noodles: number; lumina: number;
  font_pref: string; dev_build: boolean; tutorial_seen?: boolean;
};

export default function Index() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [myRole, setMyRole] = useState<string>("member");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [propertyOwner, setPropertyOwner] = useState<string>("");
  const [tabKind, setTabKind] = useState<string>("property");
  const [showTutorial, setShowTutorial] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const profilesMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles]);
  const rolesMap = useMemo(() => {
    const m = new Map<string, string>();
    const order = ["owner", "co_owner", "dev", "member", "custom"];
    for (const r of roles) {
      const cur = m.get(r.user_id);
      if (!cur || order.indexOf(r.role) < order.indexOf(cur)) m.set(r.user_id, r.role);
    }
    return m;
  }, [roles]);

  const isStaff = myRole === "owner" || myRole === "co_owner";

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
      const [p, r, t] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_emoji,avatar_url,level,xp,noodles,lumina,font_pref,dev_build,tutorial_seen"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_tabs").select("id,user_id,startup_sound,kind").eq("user_id", userId).order("created_at").limit(1),
      ]);
      let prop = (t.data as any[])?.[0];
      if (!prop) {
        const { data: created } = await supabase.from("user_tabs")
          .insert({ user_id: userId, kind: "property", name: "My Property", emoji: "🏡" })
          .select("id,user_id,startup_sound,kind").maybeSingle();
        if (created) prop = created;
      }
      setProfiles((p.data as Profile[]) || []);
      setRoles((r.data as any) || []);
      const mine = (p.data as Profile[] | null)?.find((x) => x.user_id === userId);
      if (mine) {
        setMe(mine);
        if (!mine.tutorial_seen) setShowTutorial(true);
      }
      const myR = (r.data as any[])?.filter((x) => x.user_id === userId) || [];
      const order = ["owner", "co_owner", "dev", "member", "custom"];
      myR.sort((a: any, b: any) => order.indexOf(a.role) - order.indexOf(b.role));
      if (myR[0]) setMyRole(myR[0].role);
      if (prop && !propertyId) {
        setPropertyId(prop.id);
        setPropertyOwner(prop.user_id);
        setTabKind(prop.kind || "property");
        setSoundOn(prop.startup_sound !== false);
      }
    };
    load();
    // realtime: profiles & roles only (doc + stats handle their own subs)
    const ch = supabase.channel("atheris-shell")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const ready = !!(userId && me && propertyId);

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };

  const toggleSound = async () => {
    if (!propertyId) return;
    const next = !soundOn;
    setSoundOn(next);
    await supabase.from("user_tabs").update({ startup_sound: next }).eq("id", propertyId);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Splash ready={ready} soundEnabled={soundOn} />
      {ready && (
        <>
          <BetaDisclaimer />
          {/* App bar (static, not an overlay) */}
          <header className="border-b bg-card shrink-0 relative z-10">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
              <Link to="/" className="font-display text-2xl font-bold tracking-tight text-gradient shrink-0">atheris</Link>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30 font-mono uppercase tracking-wider">beta</span>
              <div data-tour="currency" className="hidden md:flex items-center gap-1.5 ml-2">
                <CurrencyChip kind="noodles" value={me!.noodles} />
                <CurrencyChip kind="lumina" value={me!.lumina} />
                <Badge variant="outline" className="font-mono-d h-7">Lv {me!.level}</Badge>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span data-tour="aero"><AeroButton userId={userId!} isStaff={isStaff} /></span>
                <Button size="icon" variant="ghost" onClick={toggleSound} title={soundOn ? "Sound on" : "Sound off"}>
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowTutorial(true)} className="gap-1.5">
                  <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Tutorial</span>
                </Button>
                <Link to="/changelog" className="text-xs text-muted-foreground hover:text-foreground px-2 hidden sm:inline">changelog</Link>
                <div className="flex items-center gap-2 pl-2 border-l">
                  <AvatarUpload
                    userId={userId!}
                    displayName={me!.display_name}
                    avatarUrl={me!.avatar_url}
                    onChange={(url) => setMe((m) => m ? { ...m, avatar_url: url } : m)}
                  />
                  <span className="text-sm font-medium hidden md:inline">{me!.display_name}</span>
                  <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="md:hidden border-t px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
              <CurrencyChip kind="noodles" value={me!.noodles} />
              <CurrencyChip kind="lumina" value={me!.lumina} />
              <Badge variant="outline" className="font-mono-d h-7">Lv {me!.level}</Badge>
            </div>
          </header>

          <div className="flex-1 flex min-h-0">
            <PropertyTabBar
              currentId={propertyId}
              myUserId={userId!}
              onSelect={(t) => { setPropertyId(t.id); setPropertyOwner(t.user_id); setTabKind(t.kind); }}
            />
            <div className="flex-1 min-w-0 relative overflow-auto">
              {tabKind === "html" ? (
                <HtmlTab tabId={propertyId} mine={propertyOwner === userId} />
              ) : (
                <main>
                  <PropertyDoc
                    propertyId={propertyId}
                    mine={propertyOwner === userId}
                    ownerName={profilesMap.get(propertyOwner)?.display_name || "Player"}
                    blank={tabKind === "blank"}
                  />
                  {tabKind === "property" && <StatCards ownerId={propertyOwner} />}
                </main>
              )}
            </div>
          </div>

          <CornerChat userId={userId!} profilesMap={profilesMap} rolesMap={rolesMap} />
          <RealtimeCursors userId={userId!} displayName={me!.display_name} scope={`property:${propertyId}`} />
          {showTutorial && <Tutorial userId={userId!} onClose={() => setShowTutorial(false)} />}
        </>
      )}
    </div>
  );
}

function CurrencyChip({ kind, value }: { kind: "noodles" | "lumina"; value: number }) {
  const cfg = kind === "noodles"
    ? { bg: "hsl(38 92% 95%)", fg: "hsl(30 70% 25%)", border: "hsl(38 80% 80%)", icon: "🍜", label: "noodles" }
    : { bg: "hsl(195 80% 95%)", fg: "hsl(200 60% 25%)", border: "hsl(195 70% 80%)", icon: "✦", label: "lumina" };
  return (
    <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-sm font-medium"
      style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}>
      <span>{cfg.icon}</span>
      <span className="tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs opacity-60 hidden sm:inline">{cfg.label}</span>
    </div>
  );
}
