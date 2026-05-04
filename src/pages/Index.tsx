import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { ScrollArea } from "@/components/ui/scroll-area";

import { CornerChat, roleColor, roleLabel, avatarColor, avatarFg, initials } from "@/components/CornerChat";
import { RealtimeCursors } from "@/components/RealtimeCursors";
import { BetaDisclaimer } from "@/components/BetaDisclaimer";
import { AeroButton } from "@/components/AeroButton";
import { Tutorial } from "@/components/Tutorial";
import { PropertyView } from "@/components/property/PropertyView";
import { BuilderDock } from "@/components/property/BuilderDock";
import { TabBlock, InventoryItem, GardenPlant, TabButton } from "@/components/property/types";
import { Link } from "react-router-dom";
import {
  LogOut, Plus, Trash2, Lock, EyeOff, BookOpen,
} from "lucide-react";
import { toast } from "sonner";

type Profile = {
  user_id: string; email: string | null; display_name: string; avatar_emoji: string;
  level: number; xp: number; noodles: number; lumina: number;
  font_pref: string; dev_build: boolean; tutorial_seen?: boolean;
};
type UserTab = {
  id: string; user_id: string; name: string; emoji: string; content: string;
  is_public: boolean; level_lock: number; position: number;
  kind: "property" | "blank";
};

const FONT_OPTIONS = [
  { value: "inter", label: "Inter", cls: "" },
  { value: "display", label: "Space Grotesk", cls: "font-display" },
  { value: "serif", label: "Playfair", cls: "font-serif-d" },
  { value: "mono", label: "JetBrains Mono", cls: "font-mono-d" },
  { value: "hand", label: "Caveat", cls: "font-hand" },
];
const fontCls = (v: string) => FONT_OPTIONS.find((f) => f.value === v)?.cls || "";

export default function Index() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [myRole, setMyRole] = useState<string>("member");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [tabs, setTabs] = useState<UserTab[]>([]);
  const [blocks, setBlocks] = useState<TabBlock[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [buttons, setButtons] = useState<TabButton[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(false);

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
  const isDev = isStaff || myRole === "dev";
  const activeTab = tabs.find((t) => t.id === activeTabId);

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
      const [p, r, t, bl, inv, pl, btn] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_tabs").select("*").order("position").order("created_at"),
        supabase.from("tab_blocks").select("*").order("position"),
        supabase.from("inventory_items").select("*").order("position"),
        supabase.from("garden_plants").select("*").order("position"),
        supabase.from("tab_buttons").select("*").order("position"),
      ]);
      setProfiles((p.data as Profile[]) || []);
      setRoles((r.data as any) || []);
      setTabs((t.data as UserTab[]) || []);
      setBlocks((bl.data as TabBlock[]) || []);
      setInventory((inv.data as InventoryItem[]) || []);
      setPlants((pl.data as GardenPlant[]) || []);
      setButtons((btn.data as TabButton[]) || []);
      const mine = (p.data as Profile[] | null)?.find((x) => x.user_id === userId);
      if (mine) { setMe(mine); if (!(mine as any).tutorial_seen) setShowTutorial(true); }
      const myR = (r.data as any[])?.filter((x) => x.user_id === userId) || [];
      const order = ["owner", "co_owner", "dev", "member", "custom"];
      myR.sort((a: any, b: any) => order.indexOf(a.role) - order.indexOf(b.role));
      if (myR[0]) setMyRole(myR[0].role);
      setActiveTabId((cur) => {
        if (cur && (t.data as UserTab[])?.some((x) => x.id === cur)) return cur;
        const own = (t.data as UserTab[])?.find((x) => x.user_id === userId);
        return own?.id || (t.data as UserTab[])?.[0]?.id || "";
      });
    };
    load();
    const ch = supabase.channel("atheris-sync");
    ["profiles", "user_roles", "user_tabs", "tab_blocks", "inventory_items", "garden_plants", "tab_buttons", "achievements", "achievement_grants"]
      .forEach((tbl) => ch.on("postgres_changes", { event: "*", schema: "public", table: tbl }, load));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (!userId || !me) return <div className="min-h-screen grid place-items-center text-muted-foreground">loading…</div>;

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };
  const updateMe = async (patch: Partial<Profile>) => {
    setMe({ ...me, ...patch } as Profile);
    await supabase.from("profiles").update(patch).eq("user_id", userId);
  };

  const onTabClick = (t: UserTab) => {
    if (t.user_id !== userId && !t.is_public) {
      toast.error(`${profilesMap.get(t.user_id)?.display_name || "Owner"}'s tab is private`);
      return;
    }
    if (t.level_lock > me.level) {
      toast.error(`Locked — requires level ${t.level_lock}`);
      return;
    }
    setActiveTabId(t.id);
  };

  const createTab = async () => {
    if (!isDev) return toast.error("Only Devs+ can create extra tabs");
    const maxPos = tabs.reduce((m, t) => Math.max(m, t.position), -1);
    const { data, error } = await supabase.from("user_tabs").insert({
      user_id: userId,
      name: "New Tab",
      emoji: "📄",
      position: maxPos + 1,
      kind: "blank",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setActiveTabId((data as any).id);
  };

  const deleteTab = async (id: string) => {
    if (!confirm("Delete this tab?")) return;
    const { error } = await supabase.from("user_tabs").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${fontCls(me.font_pref)}`}>
      <BetaDisclaimer />
      {/* Top Bar (concept-style) */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-gradient shrink-0">atheris</Link>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30 font-mono uppercase tracking-wider">beta</span>
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <CurrencyChip kind="noodles" value={me.noodles} />
            <CurrencyChip kind="lumina" value={me.lumina} />
            <Badge variant="outline" className="font-mono-d h-7">Lv {me.level}</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AeroButton userId={userId} isStaff={isStaff} />
            <Button size="sm" variant="ghost" onClick={() => setShowTutorial(true)} className="gap-1.5">
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Tutorial</span>
            </Button>
            <Link to="/changelog" className="text-xs text-muted-foreground hover:text-foreground px-2">changelog</Link>
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold"
                style={{ background: avatarColor(me.display_name), color: avatarFg(me.display_name) }}>
                {initials(me.display_name)}
              </div>
              <span className="text-sm font-medium hidden md:inline">{me.display_name}</span>
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        {/* Mobile currency strip */}
        <div className="md:hidden border-t px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          <CurrencyChip kind="noodles" value={me.noodles} />
          <CurrencyChip kind="lumina" value={me.lumina} />
          <Badge variant="outline" className="font-mono-d h-7">Lv {me.level}</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <aside className="h-fit md:sticky md:top-[72px]">
            <div className="px-1 py-1 text-xs font-semibold text-muted-foreground tracking-wide">Tabs</div>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-2 pr-1">
                {tabs.map((t) => {
                  const isMine = t.user_id === userId;
                  const owner = profilesMap.get(t.user_id);
                  const locked = t.level_lock > me.level;
                  const isPrivate = !t.is_public && !isMine;
                  const active = t.id === activeTabId;
                  const isNew = (Date.now() - new Date((t as any).created_at || 0).getTime()) < 1000 * 60 * 60 * 48;
                  return (
                    <div key={t.id} className="relative group">
                      {isNew && !active && (
                        <span className="absolute -top-1.5 -right-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground shadow-soft">NEW</span>
                      )}
                      <button onClick={() => onTabClick(t)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm border transition-all shadow-soft ${
                          active
                            ? "bg-primary/10 border-primary/40 text-foreground ring-1 ring-primary/30"
                            : "bg-card hover:bg-muted/60 border-border"
                        } ${(locked || isPrivate) ? "opacity-60" : ""}`}
                        title={owner?.display_name}
                      >
                        <span className="text-base shrink-0">{t.emoji}</span>
                        <span className="flex-1 min-w-0 font-medium truncate">{t.name}</span>
                        {isPrivate && <EyeOff className="h-3 w-3 shrink-0" />}
                        {locked && <Lock className="h-3 w-3 shrink-0" />}
                      </button>
                      {isMine && isDev && t.kind !== "property" && (
                        <button onClick={() => deleteTab(t.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {isDev && (
              <Button size="sm" variant="outline" className="w-full mt-3 rounded-lg" onClick={() => createTab()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> new tab
              </Button>
            )}
          </aside>

          <section>
            {activeTab ? (
              <PropertyView
                tab={activeTab}
                mine={activeTab.user_id === userId}
                userId={userId}
                ownerProfile={profilesMap.get(activeTab.user_id) as any}
                meProfile={me as any}
                blocks={blocks}
                inventory={inventory}
                plants={plants}
                buttons={buttons}
                onRename={(n) => supabase.from("user_tabs").update({ name: n }).eq("id", activeTab.id)}
                onEmoji={(e) => supabase.from("user_tabs").update({ emoji: e }).eq("id", activeTab.id)}
                onTogglePublic={(v) => supabase.from("user_tabs").update({ is_public: v }).eq("id", activeTab.id)}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">Select a tab</div>
            )}
          </section>
        </div>
      </main>

      <CornerChat userId={userId} profilesMap={profilesMap} rolesMap={rolesMap} />
      <RealtimeCursors userId={userId} displayName={me.display_name} scope={activeTabId || "lobby"} />
      {activeTab && activeTab.user_id === userId && (
        <BuilderDock tabId={activeTab.id} userId={userId} blocks={blocks} />
      )}
      {showTutorial && <Tutorial userId={userId} onClose={() => setShowTutorial(false)} />}
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

