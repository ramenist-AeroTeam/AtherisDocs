import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CornerChat, roleColor, roleLabel, avatarColor, avatarFg, initials } from "@/components/CornerChat";
import EmojiPicker from "emoji-picker-react";
import {
  LogOut, Sparkles, Play, Square, Plus, Trash2, Lock, Eye, EyeOff,
  Trophy, Wand2, Code2, Type as TypeIcon, RotateCcw, Award,
} from "lucide-react";
import { toast } from "sonner";

type Profile = {
  user_id: string; email: string | null; display_name: string; avatar_emoji: string;
  level: number; xp: number; noodles: number; lumina: number;
  font_pref: string; dev_build: boolean;
};
type UserTab = {
  id: string; user_id: string; name: string; emoji: string; content: string;
  is_public: boolean; level_lock: number;
};
type TabButton = {
  id: string; tab_id: string; user_id: string; label: string;
  action_type: string; action_payload: string; position: number;
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
  const [buttons, setButtons] = useState<TabButton[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [topTab, setTopTab] = useState<"tabs" | "achievements" | "ai" | "code">("tabs");

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
  const myTab = tabs.find((t) => t.user_id === userId);
  const activeTab = tabs.find((t) => t.id === activeTabId) || myTab;

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
      const [p, r, t, b, a, g] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_tabs").select("*").order("created_at"),
        supabase.from("tab_buttons").select("*").order("position"),
        supabase.from("achievements").select("*").order("created_at", { ascending: false }),
        supabase.from("achievement_grants").select("achievement_id, user_id"),
      ]);
      setProfiles((p.data as Profile[]) || []);
      setRoles((r.data as any) || []);
      setTabs((t.data as UserTab[]) || []);
      setButtons((b.data as TabButton[]) || []);
      setAchievements((a.data as Achievement[]) || []);
      setGrants((g.data as Grant[]) || []);
      const mine = (p.data as Profile[] | null)?.find((x) => x.user_id === userId);
      if (mine) setMe(mine);
      const myR = (r.data as any[])?.filter((x) => x.user_id === userId) || [];
      const order = ["owner", "co_owner", "dev", "member", "custom"];
      myR.sort((a: any, b: any) => order.indexOf(a.role) - order.indexOf(b.role));
      if (myR[0]) setMyRole(myR[0].role);
      const ownTab = (t.data as UserTab[])?.find((x) => x.user_id === userId);
      if (ownTab && !activeTabId) setActiveTabId(ownTab.id);
    };
    load();
    const ch = supabase
      .channel("atheris-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_tabs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tab_buttons" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievement_grants" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (!userId || !me) return <div className="min-h-screen grid place-items-center text-muted-foreground">loading…</div>;

  const signOut = async () => { await supabase.auth.signOut(); nav("/auth"); };
  const updateMe = async (patch: Partial<Profile>) => {
    setMe({ ...me, ...patch } as Profile);
    await supabase.from("profiles").update(patch).eq("user_id", userId);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${fontCls(me.font_pref)}`}>
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
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

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)}>
          <TabsList>
            <TabsTrigger value="tabs">Tabs</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="ai">AI Builder</TabsTrigger>
            <TabsTrigger value="code">Code Runner</TabsTrigger>
          </TabsList>

          <TabsContent value="tabs" className="mt-4">
            <TabsView
              tabs={tabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId}
              activeTab={activeTab} userId={userId} me={me}
              profilesMap={profilesMap} rolesMap={rolesMap}
              buttons={buttons} fontCls={fontCls(me.font_pref)}
            />
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

function TabsView(props: {
  tabs: UserTab[]; activeTabId: string; setActiveTabId: (s: string) => void;
  activeTab: UserTab | undefined; userId: string; me: Profile;
  profilesMap: Map<string, Profile>; rolesMap: Map<string, string>;
  buttons: TabButton[]; fontCls: string;
}) {
  const { tabs, activeTabId, setActiveTabId, activeTab, userId, me, profilesMap, rolesMap, buttons } = props;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap border-b pb-2">
        {tabs.map((t) => {
          const locked = t.level_lock > me.level;
          const isMine = t.user_id === userId;
          return (
            <button key={t.id} onClick={() => !locked && setActiveTabId(t.id)} disabled={locked}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm transition-colors ${
                t.id === activeTabId ? "bg-accent text-accent-foreground border-accent" : "bg-card hover:bg-muted"
              } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span>{t.emoji}</span>
              <span className="font-medium">{t.name}</span>
              {isMine && <Badge variant="outline" className="text-[10px] h-4 px-1">you</Badge>}
              {locked && <Lock className="h-3 w-3" />}
              {!t.is_public && <EyeOff className="h-3 w-3 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <TabEditor tab={activeTab} mine={activeTab.user_id === userId} userId={userId}
          owner={profilesMap.get(activeTab.user_id)}
          ownerRole={rolesMap.get(activeTab.user_id) || "member"}
          buttons={buttons.filter((b) => b.tab_id === activeTab.id)}
          fontCls={props.fontCls} />
      )}
    </div>
  );
}

function TabEditor({ tab, mine, userId, owner, ownerRole, buttons, fontCls }: {
  tab: UserTab; mine: boolean; userId: string;
  owner?: Profile; ownerRole: string; buttons: TabButton[]; fontCls: string;
}) {
  const [name, setName] = useState(tab.name);
  const [emoji, setEmoji] = useState(tab.emoji);
  const [content, setContent] = useState(tab.content);
  const [isPublic, setIsPublic] = useState(tab.is_public);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [styleMode, setStyleMode] = useState<"normal" | "gradient" | "upside">("normal");
  const [addBtnOpen, setAddBtnOpen] = useState(false);

  useEffect(() => {
    setName(tab.name); setEmoji(tab.emoji); setContent(tab.content); setIsPublic(tab.is_public);
  }, [tab.id]);

  const saveMeta = async (patch: Partial<UserTab>) => {
    await supabase.from("user_tabs").update(patch).eq("id", tab.id);
  };
  const saveContent = useDebouncedSave(async (v: string) => {
    if (!mine) return;
    await supabase.from("user_tabs").update({ content: v }).eq("id", tab.id);
  });

  const runButton = async (b: TabButton) => {
    if (b.action_type === "message") toast(b.action_payload || b.label);
    else if (b.action_type === "reward") {
      const n = parseInt(b.action_payload, 10) || 1;
      const { data: prof } = await supabase.from("profiles").select("noodles").eq("user_id", userId).single();
      await supabase.from("profiles").update({ noodles: (prof?.noodles || 0) + n }).eq("user_id", userId);
      toast.success(`+${n} 🍜`);
    } else if (b.action_type === "js" && mine) {
      try { new Function(b.action_payload)(); } catch (e: any) { toast.error(e.message); }
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {mine ? (
          <>
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button className="text-3xl h-12 w-12 rounded-md border hover:bg-muted">{emoji}</button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto">
                <EmojiPicker onEmojiClick={(e) => { setEmoji(e.emoji); saveMeta({ emoji: e.emoji }); setEmojiOpen(false); }}
                  width={320} height={360} />
              </PopoverContent>
            </Popover>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== tab.name && saveMeta({ name })}
              className="text-xl font-semibold h-12 max-w-md" />
          </>
        ) : (
          <>
            <span className="text-3xl">{emoji}</span>
            <h2 className="text-xl font-semibold">{name}</h2>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {owner && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by</span>
              <div className="h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold"
                style={{ background: avatarColor(owner.display_name), color: avatarFg(owner.display_name) }}>
                {initials(owner.display_name)}
              </div>
              <span className="font-medium text-foreground">{owner.display_name}</span>
              <Badge variant="outline" className={roleColor[ownerRole]}>{roleLabel[ownerRole]}</Badge>
            </div>
          )}
          {mine && (
            <Button variant="outline" size="sm"
              onClick={() => { setIsPublic(!isPublic); saveMeta({ is_public: !isPublic }); }}>
              {isPublic ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {isPublic ? "public" : "private"}
            </Button>
          )}
        </div>
      </div>

      {mine && (
        <div className="flex items-center gap-2 border rounded-md p-1.5 bg-muted/30 flex-wrap">
          <Button variant={styleMode === "normal" ? "secondary" : "ghost"} size="sm" onClick={() => setStyleMode("normal")}>
            <TypeIcon className="h-4 w-4 mr-1" /> normal
          </Button>
          <Button variant={styleMode === "gradient" ? "secondary" : "ghost"} size="sm" onClick={() => setStyleMode("gradient")}>
            <Sparkles className="h-4 w-4 mr-1" /> gradient
          </Button>
          <Button variant={styleMode === "upside" ? "secondary" : "ghost"} size="sm" onClick={() => setStyleMode("upside")}>
            <RotateCcw className="h-4 w-4 mr-1" /> upside-down
          </Button>
        </div>
      )}

      {mine ? (
        <Textarea value={content}
          onChange={(e) => { setContent(e.target.value); saveContent(e.target.value); }}
          placeholder="write whatever you want here…"
          className={`min-h-[280px] text-base leading-relaxed ${fontCls}`} />
      ) : (
        <div className={`min-h-[200px] whitespace-pre-wrap text-base leading-relaxed p-3 rounded-md border bg-muted/20 ${fontCls}`}>
          {content || <span className="text-muted-foreground italic">empty tab</span>}
        </div>
      )}

      {mine && content && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">preview</div>
          <div className={`p-3 rounded-md border bg-muted/20 ${fontCls} ${
            styleMode === "gradient" ? "text-gradient" : ""
          } ${styleMode === "upside" ? "text-upside" : ""} whitespace-pre-wrap`}>
            {content}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Buttons</Label>
          {mine && (
            <Dialog open={addBtnOpen} onOpenChange={setAddBtnOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> add button</Button>
              </DialogTrigger>
              <DialogContent>
                <AddButtonDialog tabId={tab.id} userId={userId} onDone={() => setAddBtnOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {buttons.length === 0 && <span className="text-sm text-muted-foreground">no buttons yet</span>}
          {buttons.map((b) => (
            <div key={b.id} className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => runButton(b)}>{b.label}</Button>
              {mine && (
                <button onClick={async () => { await supabase.from("tab_buttons").delete().eq("id", b.id); }}
                  className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AddButtonDialog({ tabId, userId, onDone }: { tabId: string; userId: string; onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("message");
  const [payload, setPayload] = useState("");
  const save = async () => {
    if (!label.trim()) return toast.error("label required");
    const { error } = await supabase.from("tab_buttons").insert({
      tab_id: tabId, user_id: userId, label, action_type: type, action_payload: payload, position: 0,
    });
    if (error) toast.error(error.message); else { toast.success("button added"); onDone(); }
  };
  return (
    <>
      <DialogHeader><DialogTitle>Add button</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Click me" /></div>
        <div>
          <Label>Action</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="message">show message (toast)</SelectItem>
              <SelectItem value="reward">give noodles to clicker</SelectItem>
              <SelectItem value="js">run JS (yours only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{type === "reward" ? "Amount of noodles" : type === "js" ? "JS code" : "Message"}</Label>
          {type === "js"
            ? <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="font-mono-d text-sm min-h-[120px]" />
            : <Input value={payload} onChange={(e) => setPayload(e.target.value)} />}
        </div>
      </div>
      <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
    </>
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
          <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
          no achievements yet
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
    const { error } = await supabase.from("achievements").insert({
      title, description: desc, emoji, created_by: userId,
    });
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
      const { error } = await supabase.from("achievement_grants").insert({
        achievement_id: ach.id, user_id: uid, granted_by: userId,
      });
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
                className={`w-full flex items-center gap-2 p-2 rounded-md border text-left hover:bg-muted ${
                  has ? "bg-accent border-accent" : ""
                }`}>
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

  useEffect(() => {
    if (alwaysOn) { setSrc(code); setRunning(true); }
  }, [code, alwaysOn]);

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
        <Textarea value={code} onChange={(e) => setCode(e.target.value)}
          className="font-mono-d text-sm min-h-[400px]" spellCheck={false} />
      </Card>
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">output</h3>
        {running ? (
          <iframe key={src} sandbox="allow-scripts" srcDoc={src}
            className="w-full h-[420px] rounded-md border bg-white" />
        ) : (
          <div className="h-[420px] rounded-md border bg-muted/30 grid place-items-center text-muted-foreground text-sm">
            press run
          </div>
        )}
      </Card>
    </div>
  );
}

function useDebouncedSave<T>(fn: (v: T) => void, delay = 600) {
  const ref = useRef<number | null>(null);
  return (v: T) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(() => fn(v), delay);
  };
}
