import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Code2, FlipVertical2, Palette, Plus, Lock, Sparkles,
  Play, Square, Settings, Share2, Trophy, Briefcase, Egg, Timer, Wand2,
  Eye, EyeOff, ChevronDown, FileText, Minus, Undo2, Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */
type Role = "owner" | "dev" | "member" | "custom";
type Player = { id: string; name: string; email?: string; role: Role; customLabel?: string; level: number; online: boolean; color: string };
type DocTab = { id: string; emoji: string; title: string; content: string; levelLock?: number; devOnly?: boolean };
type Currency = "noodles" | "lumina";
type JobDef = { id: string; title: string; emoji: string; pay: number; currency: Currency; cooldownSec: number; minLevel: number; desc: string };
type Property = { id: string; name: string; tier: number; rooms: number; location: string; isPublic: boolean; levelLock?: number; ownerId: string };
type Pet = { id: string; name: string; emoji: string; stage: number; level: number; xp: number };
type Achievement = { id: string; title: string; desc: string; emoji: string; unlocked: boolean };
type EventTimer = { id: string; name: string; endsAt: number };

/* ---------- Seed ---------- */
const OWNER_EMAIL = "sy279322@student.omsd.net";

const initialPlayers: Player[] = [
  { id: "p1", name: "sy", email: OWNER_EMAIL, role: "owner", level: 99, online: true, color: "hsl(250 84% 58%)" },
  { id: "p2", name: "max", role: "dev", level: 42, online: true, color: "hsl(195 90% 55%)" },
  { id: "p3", name: "andrea", role: "member", level: 18, online: true, color: "hsl(142 70% 45%)" },
  { id: "p4", name: "darcy", role: "member", level: 7, online: false, color: "hsl(38 95% 55%)" },
  { id: "p5", name: "sophia", role: "custom", customLabel: "mod", level: 25, online: true, color: "hsl(320 80% 60%)" },
];

const initialTabs: DocTab[] = [
  { id: "t1", emoji: "🏠", title: "Overview", content: "# Welcome to Atheris\nA gamified document world. Earn **Noodles** 🍜 and **Lumina** ✨, level up, unlock tabs, code in-doc, and own properties." },
  { id: "t2", emoji: "🎁", title: "Daily Freebie", content: "Claim 50 🍜 every day from the Jobs panel." },
  { id: "t3", emoji: "📚", title: "Knowledge Base", content: "Roles, currencies, evolutions, achievements, and more." },
  { id: "t4", emoji: "💬", title: "Wink Chat", content: "Public chat thread (demo)." },
  { id: "t5", emoji: "📣", title: "Announcements", content: "v5.0 — Atheris Aero is live." },
  { id: "t6", emoji: "👀", title: "Sneak Peeks", content: "Pets evolution chain coming soon.", devOnly: true },
  { id: "t7", emoji: "💡", title: "Suggestions", content: "Drop your ideas here." },
  { id: "t8", emoji: "🛒", title: "Gear Shop", content: "**Watering Can** — Speeds plant growth, 10x uses, costs 25 🍜\n\n**Basic Sprinkler** — Auto watering, 5:00m, 50 🍜\n\n**Advanced Sprinkler** — Better growth, 75 🍜\n\n**Godly Sprinkler** — Amazing growth, 100 🍜\n\n**Trellis** — Helps vine plants stand upward." },
  { id: "t9", emoji: "🎉", title: "Events", content: "Lumina Rush — 2x Lumina for 24h." },
  { id: "t10", emoji: "🃏", title: "Random Joke", content: "Why did the noodle blush? It saw the sauce." },
  { id: "t11", emoji: "🧠", title: "Random Fact", content: "Octopuses have three hearts." },
  { id: "t12", emoji: "🏆", title: "Achievements", content: "Track your progress in the Trophy panel." },
  { id: "t13", emoji: "🏘️", title: "Properties", content: "Public + private real estate." },
  { id: "t14", emoji: "💼", title: "Jobs & Roles", content: "See the Jobs panel to clock in." },
  { id: "t15", emoji: "🧬", title: "Evolutions", content: "Reach Lv. 25 to unlock the Evolution lab.", levelLock: 25 },
  { id: "t16", emoji: "🐾", title: "Pets", content: "Hatch eggs. Evolve at Lv. 30.", levelLock: 30 },
];

const jobsCatalog: JobDef[] = [
  { id: "j1", title: "Noodle Forager", emoji: "🍜", pay: 25, currency: "noodles", cooldownSec: 8, minLevel: 1, desc: "Harvest a quick noodle bundle." },
  { id: "j2", title: "Lumina Miner", emoji: "✨", pay: 6, currency: "lumina", cooldownSec: 15, minLevel: 3, desc: "Mine raw Lumina shards." },
  { id: "j3", title: "Gear Courier", emoji: "📦", pay: 60, currency: "noodles", cooldownSec: 25, minLevel: 5, desc: "Deliver gear across the doc." },
  { id: "j4", title: "Arc Engineer", emoji: "⚙️", pay: 18, currency: "lumina", cooldownSec: 45, minLevel: 10, desc: "Maintain Atheris machinery." },
  { id: "j5", title: "Aether Scribe", emoji: "🪶", pay: 200, currency: "noodles", cooldownSec: 90, minLevel: 18, desc: "Pen documents that pay handsomely." },
];

const initialProperties: Property[] = [
  { id: "pr1", name: "Neon Loft", tier: 3, rooms: 3, location: "Downtown", isPublic: true, ownerId: "p1" },
  { id: "pr2", name: "Hidden Bunker", tier: 1, rooms: 1, location: "Underworld", isPublic: false, ownerId: "p1" },
  { id: "pr3", name: "Sky Villa", tier: 5, rooms: 6, location: "Skyline", isPublic: true, levelLock: 50, ownerId: "p1" },
];

const initialPets: Pet[] = [
  { id: "pt1", name: "Lumi", emoji: "🐣", stage: 0, level: 1, xp: 0 },
];

const initialAchievements: Achievement[] = [
  { id: "a1", title: "First Bite", desc: "Earn your first 🍜", emoji: "🍜", unlocked: false },
  { id: "a2", title: "Spark", desc: "Earn 10 ✨ Lumina", emoji: "✨", unlocked: false },
  { id: "a3", title: "Tab Hopper", desc: "Visit 5 tabs", emoji: "📑", unlocked: false },
  { id: "a4", title: "Coder", desc: "Run your first script", emoji: "💻", unlocked: false },
  { id: "a5", title: "Architect", desc: "Create a property", emoji: "🏗️", unlocked: false },
  { id: "a6", title: "Evolver", desc: "Reach Lv. 25", emoji: "🧬", unlocked: false },
];

const FONTS = [
  { id: "inter", label: "Inter", cls: "font-sans" },
  { id: "display", label: "Space Grotesk", cls: "font-display" },
  { id: "serif", label: "Playfair", cls: "font-serif-d" },
  { id: "mono", label: "JetBrains Mono", cls: "font-mono-d" },
  { id: "hand", label: "Caveat", cls: "font-hand" },
];

const ROLE_PERMS: Record<Role, { canEditAny: boolean; canManageRoles: boolean; canSeeDev: boolean; canDeleteTabs: boolean; label: string; tone: string }> = {
  owner:  { canEditAny: true,  canManageRoles: true,  canSeeDev: true,  canDeleteTabs: true,  label: "owner",  tone: "bg-gradient-primary text-primary-foreground" },
  dev:    { canEditAny: true,  canManageRoles: false, canSeeDev: true,  canDeleteTabs: false, label: "dev",    tone: "bg-accent text-accent-foreground" },
  member: { canEditAny: false, canManageRoles: false, canSeeDev: false, canDeleteTabs: false, label: "member", tone: "bg-muted text-muted-foreground" },
  custom: { canEditAny: false, canManageRoles: false, canSeeDev: false, canDeleteTabs: false, label: "custom", tone: "bg-secondary text-secondary-foreground" },
};

/* ---------- Helpers ---------- */
const fmt = (n: number) => n.toLocaleString();
const todayKey = () => new Date().toISOString().slice(0, 10);

function useCountdown(target: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: ms === 0 };
}

/* ---------- App ---------- */
const Atheris = () => {
  // Identity
  const [meId, setMeId] = useState("p1");
  const me = initialPlayers.find(p => p.id === meId)!;

  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const meLive = players.find(p => p.id === meId)!;
  const perms = ROLE_PERMS[meLive.role];

  // Currencies + level
  const [noodles, setNoodles] = useState(120);
  const [lumina, setLumina] = useState(8);
  const [xp, setXp] = useState(140);
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 10)) + 1);
  const xpToNext = (level) ** 2 * 10;

  // Build channel
  const [devBuild, setDevBuild] = useState(false);

  // Tabs
  const [tabs, setTabs] = useState<DocTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState("t1");
  const [visited, setVisited] = useState<Set<string>>(new Set(["t1"]));
  const visibleTabs = tabs.filter(t => (devBuild || perms.canSeeDev) || !t.devOnly);
  const activeTab = visibleTabs.find(t => t.id === activeTabId) ?? visibleTabs[0];
  const tabLocked = !!(activeTab.levelLock && level < activeTab.levelLock);

  // Editor styling
  const [font, setFont] = useState("inter");
  const [fontSize, setFontSize] = useState(15);
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(true);
  const [underline, setUnderline] = useState(false);
  const [gradient, setGradient] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // Code runner
  const [code, setCode] = useState(`// Welcome to Atheris code runner\nconst player = "rameni";\ndocument.body.innerText = \`Hello, \${player}!\`;\nconsole.log("timer set: 3d 14h remaining");`);
  const [alwaysRun, setAlwaysRun] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runCode = () => {
    const html = `<!doctype html><html><head><style>body{font:13px ui-monospace,monospace;color:#e6e6e6;background:#0b0b12;padding:10px;margin:0}</style></head><body><script>try{${code}}catch(e){document.body.innerText='Error: '+e.message}</script></body></html>`;
    if (iframeRef.current) iframeRef.current.srcdoc = html;
    if (!achievements.find(a => a.id === "a4")?.unlocked) unlock("a4");
  };
  useEffect(() => { if (alwaysRun) { runCode(); const i = setInterval(runCode, 2000); return () => clearInterval(i); } }, [alwaysRun, code]);

  // Properties
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [showAddProp, setShowAddProp] = useState(false);
  const [newProp, setNewProp] = useState<Partial<Property>>({ name: "", tier: 1, rooms: 1, location: "", isPublic: true });

  // Pets
  const [pets, setPets] = useState<Pet[]>(initialPets);

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const unlock = (id: string) => setAchievements(prev => prev.map(a => a.id === id && !a.unlocked ? (toast.success(`🏆 Achievement: ${a.title}`), { ...a, unlocked: true }) : a));

  // Jobs
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  useEffect(() => {
    const i = setInterval(() => setCooldowns(c => {
      const n: Record<string, number> = {};
      for (const k in c) { const v = c[k] - 1; if (v > 0) n[k] = v; }
      return n;
    }), 1000);
    return () => clearInterval(i);
  }, []);
  const doJob = (j: JobDef) => {
    if (level < j.minLevel) return toast.error(`Need Lv. ${j.minLevel}`);
    if (cooldowns[j.id]) return;
    if (j.currency === "noodles") { setNoodles(n => n + j.pay); if (!achievements.find(a => a.id === "a1")?.unlocked) unlock("a1"); }
    else { setLumina(n => { const next = n + j.pay; if (next >= 10) unlock("a2"); return next; }); }
    setXp(x => x + Math.ceil(j.pay / 3));
    setCooldowns(c => ({ ...c, [j.id]: j.cooldownSec }));
    toast.success(`+${j.pay} ${j.currency === "noodles" ? "🍜" : "✨"} ${j.title}`);
  };

  // Daily reset countdown
  const tomorrow = useMemo(() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); }, [todayKey()]);
  const daily = useCountdown(tomorrow);
  const [dailyClaimed, setDailyClaimed] = useState<string | null>(null);
  const claimDaily = () => { if (dailyClaimed === todayKey()) return; setNoodles(n => n + 50); setLumina(l => l + 1); setDailyClaimed(todayKey()); toast.success("Daily claimed: +50 🍜 +1 ✨"); };

  // Event timers
  const [events, setEvents] = useState<EventTimer[]>([
    { id: "e1", name: "Lumina Rush ✨2x", endsAt: Date.now() + 1000 * 60 * 60 * 26 },
    { id: "e2", name: "Noodle Festival", endsAt: Date.now() + 1000 * 60 * 47 },
  ]);

  // AI feature builder
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOut, setAiOut] = useState<string>("");
  const generateFeature = () => {
    if (!aiPrompt.trim()) return;
    const stub = `// ✨ Feature: ${aiPrompt}\n// Generated scaffold (demo)\nfunction ${aiPrompt.replace(/[^a-z0-9]/gi, "_").slice(0, 24) || "feature"}() {\n  // TODO: implement: ${aiPrompt}\n  console.log(${JSON.stringify(aiPrompt)});\n  return { ok: true };\n}\n`;
    setAiOut(stub);
    toast.success("Feature scaffold generated");
  };

  // Tab activation tracking
  useEffect(() => {
    setVisited(prev => { const n = new Set(prev); n.add(activeTabId); if (n.size >= 5) unlock("a3"); return n; });
  }, [activeTabId]);
  useEffect(() => { if (level >= 25) unlock("a6"); }, [level]);

  // Tab create
  const addTab = () => {
    const id = "t" + Date.now();
    setTabs(t => [...t, { id, emoji: "📄", title: "Untitled", content: "" }]);
    setActiveTabId(id);
  };

  const updateTabContent = (v: string) => {
    if (tabLocked) return;
    setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, content: v } : t));
  };

  const fontCls = FONTS.find(f => f.id === font)?.cls ?? "font-sans";

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-pop">
            <span className="text-primary-foreground font-display font-bold">A</span>
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="font-display font-bold text-base">
              Atheris · <span className="text-gradient-primary">Aero V</span>
            </h1>
            <span className="text-[10px] text-muted-foreground">File · Edit · View · Insert · Format · Tools · Extensions · Help</span>
          </div>

          <div className="flex-1" />

          {/* currencies */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Badge className="bg-gradient-noodle text-white border-0 shadow-soft">🍜 {fmt(noodles)}</Badge>
            <Badge className="bg-gradient-lumina text-white border-0 shadow-soft">✨ {fmt(lumina)}</Badge>
            <div className="flex items-center gap-2 bg-muted rounded-md px-2 py-1">
              <span className="text-xs font-semibold">Lv.{level}</span>
              <div className="w-20"><Progress value={(xp / xpToNext) * 100} className="h-1.5" /></div>
            </div>
          </div>

          {/* online players avatars */}
          <div className="hidden lg:flex -space-x-2 mr-2">
            {players.filter(p => p.online).slice(0, 4).map(p => (
              <div key={p.id} className="h-7 w-7 rounded-full ring-2 ring-card grid place-items-center text-[11px] font-bold text-white" style={{ background: p.color }}>
                {p.name[0].toUpperCase()}
              </div>
            ))}
          </div>

          <Button variant={devBuild ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setDevBuild(v => !v)}>
            <Code2 className="h-3.5 w-3.5" /> {devBuild ? "Dev Build" : "Dev Build"}
          </Button>

          <Dialog>
            <DialogTrigger asChild><Button size="sm" className="bg-gradient-primary border-0 gap-1"><Share2 className="h-3.5 w-3.5" /> Share</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Share Atheris</DialogTitle><DialogDescription>Invite players to your doc world.</DialogDescription></DialogHeader>
              <Input placeholder="email@school.net" />
              <DialogFooter><Button>Send invite</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* formatting toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-t bg-background/40 overflow-x-auto">
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger className="h-8 w-44 bg-foreground text-background border-0"><SelectValue /></SelectTrigger>
            <SelectContent>{FONTS.map(f => <SelectItem key={f.id} value={f.id}><span className={f.cls}>{f.label}</span></SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center bg-foreground text-background rounded-md h-8">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-background hover:bg-background/10" onClick={() => setFontSize(s => Math.max(8, s - 1))}><Minus className="h-3.5 w-3.5" /></Button>
            <span className="px-2 text-xs font-semibold w-8 text-center">{fontSize}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-background hover:bg-background/10" onClick={() => setFontSize(s => Math.min(72, s + 1))}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button size="icon" variant={bold ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setBold(v => !v)}><Bold className="h-4 w-4" /></Button>
          <Button size="icon" variant={italic ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setItalic(v => !v)}><Italic className="h-4 w-4" /></Button>
          <Button size="icon" variant={underline ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setUnderline(v => !v)}><Underline className="h-4 w-4" /></Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button size="sm" variant={gradient ? "secondary" : "ghost"} className="h-8 gap-1 text-xs" onClick={() => setGradient(v => !v)}>
            <Palette className="h-3.5 w-3.5 text-primary" /> <span className="text-gradient">gradient</span>
          </Button>
          <Button size="sm" variant={flipped ? "secondary" : "ghost"} className="h-8 gap-1 text-xs" onClick={() => setFlipped(v => !v)}>
            <FlipVertical2 className="h-3.5 w-3.5" /> <span className={cn(flipped && "text-upside")}>flip</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs"><Code2 className="h-3.5 w-3.5" /> &lt;/&gt;</Button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
        {/* Left: tabs */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r bg-sidebar">
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-sidebar-foreground/80">Document tabs</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addTab}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <ul className="px-2 pb-4 space-y-0.5">
              {visibleTabs.map(t => {
                const locked = !!(t.levelLock && level < t.levelLock);
                const active = t.id === activeTabId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveTabId(t.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                        active ? "bg-sidebar-accent text-primary font-semibold" : "hover:bg-sidebar-accent/60",
                        locked && "opacity-60"
                      )}
                    >
                      <span className="text-base leading-none">{locked ? "🔒" : t.emoji}</span>
                      <span className="truncate flex-1">{t.title}</span>
                      {t.levelLock && <span className="text-[10px] text-muted-foreground">Lv.{t.levelLock}</span>}
                      {t.devOnly && <Badge className="h-4 px-1 text-[9px] bg-accent text-accent-foreground border-0">dev</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </aside>

        {/* Center: editor */}
        <main className="col-span-12 md:col-span-6 lg:col-span-7 bg-muted/30 overflow-auto">
          <div className="max-w-[820px] mx-auto my-6 bg-card shadow-soft rounded-md border min-h-[80vh] p-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{activeTab.emoji}</span>
              <input
                value={activeTab.title}
                onChange={(e) => setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, title: e.target.value } : t))}
                disabled={tabLocked || !perms.canEditAny && meLive.role !== "owner"}
                className="bg-transparent outline-none font-display font-bold text-xl flex-1"
              />
              {activeTab.levelLock && <Badge variant="outline">Lv.{activeTab.levelLock}</Badge>}
            </div>
            <Separator className="mb-4" />
            {tabLocked ? (
              <div className="text-center py-20 space-y-3">
                <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Locked — reach <b>Lv. {activeTab.levelLock}</b> to read.</p>
                <p className="text-xs text-muted-foreground">You're Lv.{level}.</p>
              </div>
            ) : (
              <textarea
                value={activeTab.content}
                onChange={(e) => updateTabContent(e.target.value)}
                style={{ fontSize: `${fontSize}px` }}
                className={cn(
                  "w-full min-h-[60vh] bg-transparent outline-none resize-none leading-relaxed",
                  fontCls,
                  bold && "font-bold",
                  italic && "italic",
                  underline && "underline",
                  gradient && "text-gradient",
                  flipped && "text-upside"
                )}
              />
            )}

            {/* Code runner block embedded in doc */}
            <div className="mt-8 border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary border-b">
                <Code2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold tracking-wider uppercase">Code Runner</span>
                <Badge variant="outline" className="h-5 text-[10px]">script.js</Badge>
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={alwaysRun} onCheckedChange={setAlwaysRun} /> always-on
                  </label>
                  <Button size="sm" className="h-7 gap-1 bg-success text-white hover:opacity-90" style={{ background: "hsl(var(--success))" }} onClick={runCode}>
                    {alwaysRun ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} Run
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="font-mono-d text-xs bg-[hsl(230_25%_8%)] text-[hsl(40_95%_75%)] p-3 outline-none min-h-[180px]"
                />
                <iframe ref={iframeRef} title="runner" sandbox="allow-scripts" className="bg-[hsl(230_15%_12%)] min-h-[180px] border-l" />
              </div>
            </div>
          </div>
        </main>

        {/* Right: panels */}
        <aside className="col-span-12 md:col-span-3 border-l bg-card">
          <Tabs defaultValue="players" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-10 px-2">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="props">Properties</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="more">More</TabsTrigger>
            </TabsList>

            {/* Players */}
            <TabsContent value="players" className="flex-1 overflow-auto p-3 space-y-3 m-0">
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground">ONLINE NOW</div>
              <ul className="space-y-1.5">
                {players.map(p => {
                  const r = ROLE_PERMS[p.role];
                  return (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span className={cn("h-2 w-2 rounded-full", p.online ? "bg-success pulse-dot" : "bg-muted-foreground/40")} style={p.online ? { background: "hsl(var(--success))" } : undefined} />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">Lv.{p.level}</span>
                      <span className="ml-auto">
                        <Badge className={cn("h-5 text-[10px] border-0", r.tone)}>{p.role === "custom" ? p.customLabel : r.label}</Badge>
                      </span>
                      {perms.canManageRoles && p.id !== meId && (
                        <Select value={p.role} onValueChange={(v: Role) => setPlayers(ps => ps.map(x => x.id === p.id ? { ...x, role: v } : x))}>
                          <SelectTrigger className="h-6 w-6 p-0 border-0 [&>svg]:hidden bg-transparent"><Settings className="h-3 w-3 text-muted-foreground" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">owner</SelectItem>
                            <SelectItem value="dev">dev</SelectItem>
                            <SelectItem value="member">member</SelectItem>
                            <SelectItem value="custom">custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </li>
                  );
                })}
              </ul>

              <Separator />
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground">VIEW AS</div>
              <Select value={meId} onValueChange={setMeId}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.role}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Owner: <b>{OWNER_EMAIL}</b></p>
            </TabsContent>

            {/* Properties */}
            <TabsContent value="props" className="flex-1 overflow-auto p-3 space-y-2 m-0">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground">MY PROPERTIES</div>
                <Dialog open={showAddProp} onOpenChange={setShowAddProp}>
                  <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3 w-3" /> New</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New property</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      <Input placeholder="Name" value={newProp.name} onChange={e => setNewProp({ ...newProp, name: e.target.value })} />
                      <Input placeholder="Location" value={newProp.location} onChange={e => setNewProp({ ...newProp, location: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Tier" value={newProp.tier} onChange={e => setNewProp({ ...newProp, tier: +e.target.value })} />
                        <Input type="number" placeholder="Rooms" value={newProp.rooms} onChange={e => setNewProp({ ...newProp, rooms: +e.target.value })} />
                      </div>
                      <label className="flex items-center gap-2 text-sm"><Switch checked={!!newProp.isPublic} onCheckedChange={v => setNewProp({ ...newProp, isPublic: v })} /> Public</label>
                    </div>
                    <DialogFooter><Button onClick={() => {
                      if (!newProp.name) return;
                      setProperties(ps => [...ps, { id: "pr" + Date.now(), name: newProp.name!, location: newProp.location || "—", tier: newProp.tier || 1, rooms: newProp.rooms || 1, isPublic: !!newProp.isPublic, ownerId: meId }]);
                      setShowAddProp(false); setNewProp({ name: "", tier: 1, rooms: 1, location: "", isPublic: true });
                      unlock("a5");
                    }}>Create</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {properties.map(p => {
                const locked = !!(p.levelLock && level < p.levelLock);
                return (
                  <div key={p.id} className={cn("rounded-lg border p-3 bg-background", locked && "opacity-60")}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="h-5 text-[10px]">Tier {p.tier}</Badge>
                        {locked ? (
                          <Badge className="h-5 text-[10px] bg-muted text-muted-foreground border-0 gap-1"><Lock className="h-3 w-3" /> Lv.{p.levelLock}</Badge>
                        ) : p.isPublic ? (
                          <Badge className="h-5 text-[10px] bg-accent text-accent-foreground border-0 gap-1"><Eye className="h-3 w-3" /> Public</Badge>
                        ) : (
                          <Badge className="h-5 text-[10px] bg-destructive/15 text-destructive border-0 gap-1"><EyeOff className="h-3 w-3" /> Private</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.location} · {p.rooms} room{p.rooms > 1 ? "s" : ""}</p>
                  </div>
                );
              })}
            </TabsContent>

            {/* Jobs */}
            <TabsContent value="jobs" className="flex-1 overflow-auto p-3 space-y-3 m-0">
              <div className="rounded-lg border p-3 bg-gradient-primary text-primary-foreground">
                <div className="flex items-center gap-2 text-xs font-semibold"><Timer className="h-4 w-4" /> Daily reset in</div>
                <div className="font-mono-d text-2xl mt-1">{String(daily.h).padStart(2, "0")}:{String(daily.m).padStart(2, "0")}:{String(daily.s).padStart(2, "0")}</div>
                <Button size="sm" variant="secondary" className="mt-2 h-7" onClick={claimDaily} disabled={dailyClaimed === todayKey()}>
                  <Egg className="h-3 w-3 mr-1" /> {dailyClaimed === todayKey() ? "Claimed" : "Claim 50 🍜 +1 ✨"}
                </Button>
              </div>

              <div className="text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" /> CLOCK IN</div>
              {jobsCatalog.map(j => {
                const cd = cooldowns[j.id] ?? 0;
                const need = level < j.minLevel;
                return (
                  <div key={j.id} className="rounded-lg border p-3 bg-background">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{j.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{j.title}</span>
                          {need && <Badge variant="outline" className="h-4 text-[9px]">Lv.{j.minLevel}</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{j.desc}</p>
                      </div>
                      <Button size="sm" className="h-7" disabled={cd > 0 || need} onClick={() => doJob(j)}>
                        {cd > 0 ? `${cd}s` : `+${j.pay}${j.currency === "noodles" ? "🍜" : "✨"}`}
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="text-[10px] font-bold tracking-wider text-muted-foreground mt-2">EVENT TIMERS</div>
              {events.map(e => <EventRow key={e.id} ev={e} />)}
            </TabsContent>

            {/* More: AI, Achievements, Pets, Evolutions */}
            <TabsContent value="more" className="flex-1 overflow-auto p-3 space-y-4 m-0">
              <section>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Wand2 className="h-3 w-3" /> AI FEATURE BUILDER</div>
                <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe a feature… e.g. ‘leaderboard for top noodle earners this week’" className="h-20 text-xs" />
                <Button size="sm" className="mt-2 w-full bg-gradient-primary" onClick={generateFeature}><Sparkles className="h-3 w-3 mr-1" /> Generate</Button>
                {aiOut && <pre className="mt-2 text-[10px] bg-secondary p-2 rounded font-mono-d overflow-auto max-h-40">{aiOut}</pre>}
              </section>

              <section>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Trophy className="h-3 w-3" /> ACHIEVEMENTS</div>
                <ul className="grid grid-cols-2 gap-1.5">
                  {achievements.map(a => (
                    <li key={a.id} className={cn("rounded-md border p-2 text-xs", a.unlocked ? "bg-gradient-primary text-primary-foreground border-0" : "bg-muted text-muted-foreground")}>
                      <div className="text-base">{a.emoji}</div>
                      <div className="font-semibold leading-tight">{a.title}</div>
                      <div className="text-[10px] opacity-80">{a.desc}</div>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-2">PETS</div>
                {level < 30 ? (
                  <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="h-3 w-3" /> Unlocks at Lv. 30 — you're Lv.{level}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {pets.map(p => (
                      <div key={p.id} className="rounded-md border p-2 bg-background text-center">
                        <div className="text-3xl">{p.emoji}</div>
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">Stage {p.stage} · Lv.{p.level}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-2">EVOLUTIONS</div>
                {level < 25 ? (
                  <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground flex items-center gap-2"><Lock className="h-3 w-3" /> Unlocks at Lv. 25</div>
                ) : (
                  <div className="rounded-md border p-3 bg-background text-xs space-y-1">
                    <div>🐣 Hatchling → 🐥 Chick → 🦅 Aero</div>
                    <Button size="sm" className="h-7 mt-1">Evolve next</Button>
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {/* Status bar */}
      <footer className="h-8 border-t bg-card flex items-center px-3 gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" style={{ background: "hsl(var(--success))" }} /> {players.filter(p => p.online).length} online</span>
        <span>·</span>
        <span>Atheris v5.0{devBuild ? "-dev" : ""}</span>
        <span>·</span>
        <span>Season 1 <span className="text-gradient">Luminal</span></span>
        <span>·</span>
        <span>Code runner: {alwaysRun ? "always on" : "manual"}</span>
        <span className="ml-auto">XP {xp}/{xpToNext}</span>
      </footer>
    </div>
  );
};

const EventRow = ({ ev }: { ev: EventTimer }) => {
  const c = useCountdown(ev.endsAt);
  return (
    <div className="rounded-lg border p-2 bg-background flex items-center gap-2">
      <Timer className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium flex-1">{ev.name}</span>
      <span className="text-[11px] font-mono-d">{c.d ? `${c.d}d ` : ""}{String(c.h).padStart(2, "0")}:{String(c.m).padStart(2, "0")}:{String(c.s).padStart(2, "0")}</span>
    </div>
  );
};

export default Atheris;
