import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CornerChat, roleColor, roleLabel, avatarColor, avatarFg, initials } from "@/components/CornerChat";
import { RealtimeCursors } from "@/components/RealtimeCursors";
import { PropertyView } from "@/components/property/PropertyView";
import { TabBlock, InventoryItem, GardenPlant, TabButton } from "@/components/property/types";
import EmojiPicker from "emoji-picker-react";
import {
  LogOut, Sparkles, Play, Square, Plus, Trash2, Lock, EyeOff, Trophy, Wand2, Code2, Award,
} from "lucide-react";
import { toast } from "sonner";

type Profile = {
  user_id: string; email: string | null; display_name: string; avatar_emoji: string;
  level: number; xp: number; noodles: number; lumina: number;
  font_pref: string; dev_build: boolean;
};
type UserTab = {
  id: string; user_id: string; name: string; emoji: string; content: string;
  is_public: boolean; level_lock: number; position: number;
  kind: "property" | "blank";
};
type Achievement = { id: string; title: string; description: string; emoji: string; created_by: string };
type Grant = { achievement_id: string; user_id: string };

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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [topTab, setTopTab] = useState<"tabs" | "achievements" | "ai" | "code">("tabs");
  const [newTabOpen, setNewTabOpen] = useState(false);

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
      const [p, r, t, bl, inv, pl, btn, a, g] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_tabs").select("*").order("position").order("created_at"),
        supabase.from("tab_blocks").select("*").order("position"),
        supabase.from("inventory_items").select("*").order("position"),
        supabase.from("garden_plants").select("*").order("position"),
        supabase.from("tab_buttons").select("*").order("position"),
        supabase.from("achievements").select("*").order("created_at", { ascending: false }),
        supabase.from("achievement_grants").select("achievement_id, user_id"),
      ]);
      setProfiles((p.data as Profile[]) || []);
      setRoles((r.data as any) || []);
      setTabs((t.data as UserTab[]) || []);
      setBlocks((bl.data as TabBlock[]) || []);
      setInventory((inv.data as InventoryItem[]) || []);
      setPlants((pl.data as GardenPlant[]) || []);
      setButtons((btn.data as TabButton[]) || []);
      setAchievements((a.data as Achievement[]) || []);
      setGrants((g.data as Grant[]) || []);
      const mine = (p.data as Profile[] | null)?.find((x) => x.user_id === userId);
      if (mine) setMe(mine);
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

  const createTab = async (kind: "property" | "blank") => {
    if (!isDev) return toast.error("Only Devs+ can create extra tabs");
    const maxPos = tabs.reduce((m, t) => Math.max(m, t.position), -1);
    const isProp = kind === "property";
    const { data, error } = await supabase.from("user_tabs").insert({
      user_id: userId,
      name: isProp ? "New Property" : "New Tab",
      emoji: isProp ? "🏡" : "📄",
      position: maxPos + 1,
      kind,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      setActiveTabId((data as any).id);
      if (isProp) {
        const tabId = (data as any).id;
        const seed = [
          { block_type: "header", position: 0, data: { title: "Welcome to your property!", subtitle: "This is your own mini world! Have fun editing." } },
          { block_type: "stats", position: 1, data: { title: "", job: "" } },
          { block_type: "currency", position: 2, data: {} },
          { block_type: "inventory", position: 3, data: {} },
          { block_type: "garden", position: 4, data: {} },
        ];
        await supabase.from("tab_blocks").insert(
          seed.map((s) => ({ ...s, tab_id: tabId, user_id: userId, gradient_mode: "none", gradient_from: "", gradient_to: "" }))
        );
      }
    }
    setNewTabOpen(false);
  };

  const deleteTab = async (id: string) => {
    if (!confirm("Delete this tab?")) return;
    const { error } = await supabase.from("user_tabs").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${fontCls(me.font_pref)}`}>
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-2xl font-bold tracking-tight">atheris</h1>
          <div className="flex items-center gap-2">
            <CurrencyChip kind="noodles" value={me.noodles} />
            <CurrencyChip kind="lumina" value={me.lumina} />
            <Badge variant="outline" className="font-mono-d">Lv {me.level}</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Select value={me.font_pref} onValueChange={(v) => updateMe({ font_pref: v })}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}><span className={f.cls}>{f.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border">
              <span className="text-xs text-muted-foreground">dev build</span>
              <Switch checked={me.dev_build} onCheckedChange={(v) => updateMe({ dev_build: v })} />
            </div>
            <Badge variant="outline" className={roleColor[myRole]}>{roleLabel[myRole]}</Badge>
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold"
                style={{ background: avatarColor(me.display_name), color: avatarFg(me.display_name) }}>
                {initials(me.display_name)}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{me.display_name}</span>
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)}>
          <TabsList>
            <TabsTrigger value="tabs">Properties</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="ai">AI Builder</TabsTrigger>
            <TabsTrigger value="code">Code Runner</TabsTrigger>
          </TabsList>

          <TabsContent value="tabs" className="mt-4">
            <div className="grid grid-cols-[240px_1fr] gap-4">
              <aside className="border rounded-lg bg-card p-2 space-y-1 h-fit sticky top-4">
                <div className="px-2 py-1 text-xs uppercase text-muted-foreground tracking-wide">Properties</div>
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-1">
                    {tabs.map((t) => {
                      const isMine = t.user_id === userId;
                      const owner = profilesMap.get(t.user_id);
                      const ownerRole = rolesMap.get(t.user_id) || "member";
                      const locked = t.level_lock > me.level;
                      const isPrivate = !t.is_public && !isMine;
                      const active = t.id === activeTabId;
                      return (
                        <button key={t.id} onClick={() => onTabClick(t)}
                          className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors ${
                            active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                          } ${(locked || isPrivate) ? "opacity-60" : ""}`}>
                          <span className="text-base shrink-0">{t.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              {owner?.display_name}
                              <Badge variant="outline" className={`${roleColor[ownerRole]} text-[9px] h-3.5 px-1`}>{roleLabel[ownerRole]}</Badge>
                            </div>
                          </div>
                          {isPrivate && <EyeOff className="h-3 w-3 shrink-0" />}
                          {locked && <Lock className="h-3 w-3 shrink-0" />}
                          {isMine && isDev && tabs.filter((x) => x.user_id === userId).length > 1 && (
                            <span onClick={(e) => { e.stopPropagation(); deleteTab(t.id); }}
                              className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                {isDev && (
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={createTab}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> new property
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
                  <div className="text-center py-12 text-muted-foreground">Select a property</div>
                )}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <AchievementsView isStaff={isStaff} userId={userId} achievements={achievements}
              grants={grants} profiles={profiles} rolesMap={rolesMap} />
          </TabsContent>
          <TabsContent value="ai" className="mt-4"><AiBuilder /></TabsContent>
          <TabsContent value="code" className="mt-4"><CodeRunner /></TabsContent>
        </Tabs>
      </main>

      <CornerChat userId={userId} profilesMap={profilesMap} rolesMap={rolesMap} />
      <RealtimeCursors userId={userId} displayName={me.display_name} />
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

function AchievementsView({ isStaff, userId, achievements, grants, profiles, rolesMap }: {
  isStaff: boolean; userId: string;
  achievements: Achievement[]; grants: Grant[];
  profiles: Profile[]; rolesMap: Map<string, string>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState<string | null>(null);
  const myAch = new Set(grants.filter((g) => g.user_id === userId).map((g) => g.achievement_id));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Achievements</h2>
          <p className="text-sm text-muted-foreground">
            {isStaff ? "Create achievements and grant them to players." : "Achievements you've been granted."}
          </p>
        </div>
        {isStaff && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> new achievement</Button></DialogTrigger>
            <DialogContent>
              <CreateAchievementDialog userId={userId} onDone={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {achievements.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" /> no achievements yet
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => {
          const unlocked = myAch.has(a.id);
          const grantedTo = grants.filter((g) => g.achievement_id === a.id);
          return (
            <Card key={a.id} className={`p-4 ${unlocked ? "border-primary/50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{a.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.title}</h3>
                    {unlocked && <Badge className="text-[10px]"><Award className="h-3 w-3 mr-0.5" />unlocked</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  <div className="text-xs text-muted-foreground mt-2">{grantedTo.length} player(s)</div>
                </div>
              </div>
              {isStaff && (
                <div className="mt-3 flex gap-1.5">
                  <Dialog open={grantOpen === a.id} onOpenChange={(o) => setGrantOpen(o ? a.id : null)}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="flex-1">grant</Button></DialogTrigger>
                    <DialogContent>
                      <GrantDialog ach={a} userId={userId} profiles={profiles} rolesMap={rolesMap}
                        grants={grants} onDone={() => setGrantOpen(null)} />
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost"
                    onClick={async () => {
                      if (!confirm("Delete this achievement?")) return;
                      await supabase.from("achievements").delete().eq("id", a.id);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CreateAchievementDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("🏆");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const save = async () => {
    if (!title.trim()) return toast.error("title required");
    const { error } = await supabase.from("achievements").insert({ title, description: desc, emoji, created_by: userId });
    if (error) toast.error(error.message); else { toast.success("created"); onDone(); }
  };
  return (
    <>
      <DialogHeader><DialogTitle>New achievement</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button className="text-3xl h-12 w-12 rounded-md border hover:bg-muted">{emoji}</button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <EmojiPicker onEmojiClick={(e) => { setEmoji(e.emoji); setEmojiOpen(false); }} width={320} height={360} />
            </PopoverContent>
          </Popover>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1 h-12" />
        </div>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
      </div>
      <DialogFooter><Button onClick={save}>Create</Button></DialogFooter>
    </>
  );
}

function GrantDialog({ ach, userId, profiles, rolesMap, grants, onDone }: {
  ach: Achievement; userId: string; profiles: Profile[];
  rolesMap: Map<string, string>; grants: Grant[]; onDone: () => void;
}) {
  const granted = new Set(grants.filter((g) => g.achievement_id === ach.id).map((g) => g.user_id));
  const toggle = async (uid: string) => {
    if (granted.has(uid)) {
      await supabase.from("achievement_grants").delete().eq("achievement_id", ach.id).eq("user_id", uid);
    } else {
      const { error } = await supabase.from("achievement_grants").insert({ achievement_id: ach.id, user_id: uid, granted_by: userId });
      if (error) toast.error(error.message);
    }
  };
  return (
    <>
      <DialogHeader><DialogTitle>Grant: {ach.title}</DialogTitle></DialogHeader>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1.5">
          {profiles.map((p) => {
            const has = granted.has(p.user_id);
            return (
              <button key={p.user_id} onClick={() => toggle(p.user_id)}
                className={`w-full flex items-center gap-2 p-2 rounded-md border text-left hover:bg-muted ${has ? "bg-accent border-accent" : ""}`}>
                <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold"
                  style={{ background: avatarColor(p.display_name), color: avatarFg(p.display_name) }}>
                  {initials(p.display_name)}
                </div>
                <span className="font-medium flex-1">{p.display_name}</span>
                <Badge variant="outline" className={roleColor[rolesMap.get(p.user_id) || "member"]}>
                  {roleLabel[rolesMap.get(p.user_id) || "member"]}
                </Badge>
                {has && <Award className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <DialogFooter><Button variant="secondary" onClick={onDone}>Done</Button></DialogFooter>
    </>
  );
}

function AiBuilder() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; summary: string; html: string; tips: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null); setRunning(false);
    const { data, error } = await supabase.functions.invoke("ai-feature", { body: { description: prompt } });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "failed");
      return;
    }
    setResult(data); setRunning(true);
  };
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /><h2 className="font-semibold">AI Feature Builder</h2></div>
        <p className="text-sm text-muted-foreground">Describe a feature — the AI scaffolds it as runnable HTML/JS.</p>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. a clicker mini-game where each click gives 1 noodle, with a combo multiplier"
          className="min-h-[100px]" />
        <Button onClick={generate} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-1" /> {loading ? "generating…" : "Generate"}
        </Button>
      </Card>
      {result && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-lg">{result.title}</h3>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>
            <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning((r) => !r)}>
              {running ? <><Square className="h-4 w-4 mr-1" /> stop</> : <><Play className="h-4 w-4 mr-1" /> run</>}
            </Button>
          </div>
          {result.tips?.length > 0 && (
            <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
              {result.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
          {running && (
            <iframe key={result.html} sandbox="allow-scripts" srcDoc={result.html}
              className="w-full h-[400px] rounded-md border bg-white" />
          )}
          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer">view source</summary>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px] mt-2 font-mono-d">{result.html}</pre>
          </details>
        </Card>
      )}
    </div>
  );
}

function CodeRunner() {
  const [code, setCode] = useState(`<h2 style="font-family:sans-serif">hello atheris</h2>
<button onclick="alert('clicked!')">click me</button>`);
  const [running, setRunning] = useState(false);
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [src, setSrc] = useState("");
  useEffect(() => { if (alwaysOn) { setSrc(code); setRunning(true); } }, [code, alwaysOn]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2"><Code2 className="h-5 w-5" /><h2 className="font-semibold">HTML / JS</h2></div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <span className="text-muted-foreground">always on</span>
              <Switch checked={alwaysOn} onCheckedChange={setAlwaysOn} />
            </label>
            {!running ? (
              <Button size="sm" onClick={() => { setSrc(code); setRunning(true); }}><Play className="h-4 w-4 mr-1" /> run</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setRunning(false); setSrc(""); }}>
                <Square className="h-4 w-4 mr-1" /> stop
              </Button>
            )}
          </div>
        </div>
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="font-mono-d text-sm min-h-[400px]" spellCheck={false} />
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">output</h3>
        {running ? (
          <iframe key={src} sandbox="allow-scripts" srcDoc={src} className="w-full h-[420px] rounded-md border bg-white" />
        ) : (
          <div className="h-[420px] rounded-md border bg-muted/30 grid place-items-center text-muted-foreground text-sm">press run</div>
        )}
      </Card>
    </div>
  );
}
