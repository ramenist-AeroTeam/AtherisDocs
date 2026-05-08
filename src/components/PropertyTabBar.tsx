import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Home as HomeIcon, Plus, Trash2, FileText, Zap, X } from "lucide-react";
import { avatarColor, avatarFg, initials } from "@/components/CornerChat";

type TabRow = { id: string; user_id: string; name: string; emoji: string; kind: string };
type Profile = { user_id: string; display_name: string; avatar_url: string | null };

const KIND_ICON: Record<string, React.ReactNode> = {
  property: <HomeIcon className="h-3 w-3" />,
  blank: <FileText className="h-3 w-3" />,
  html: <Zap className="h-3 w-3" />,
};

export function PropertyTabBar({
  currentId, myUserId, onSelect,
}: {
  currentId: string; myUserId: string;
  onSelect: (tab: { id: string; user_id: string; kind: string }) => void;
}) {
  const [tabs, setTabs] = useState<TabRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [open, setOpen] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"blank" | "html" | "property">("blank");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [t, p] = await Promise.all([
        supabase.from("user_tabs").select("id,user_id,name,emoji,kind").order("created_at"),
        supabase.from("profiles").select("user_id,display_name,avatar_url"),
      ]);
      setTabs((t.data as TabRow[]) || []);
      const map: Record<string, Profile> = {};
      ((p.data as Profile[]) || []).forEach((x) => { map[x.user_id] = x; });
      setProfiles(map);
    };
    load();
    const ch = supabase.channel("tabbar")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_tabs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const emoji = newKind === "html" ? "⚡" : newKind === "property" ? "🏡" : "📄";
    const { data, error } = await supabase.from("user_tabs")
      .insert({ user_id: myUserId, name: newName.trim(), emoji, kind: newKind, is_public: true })
      .select("id,user_id,kind").maybeSingle();
    setBusy(false);
    if (!error && data) {
      onSelect({ id: data.id, user_id: data.user_id, kind: data.kind });
      setShowCreate(false);
      setNewName("");
    }
  };

  const remove = async (t: TabRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (t.user_id !== myUserId) return;
    if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    const others = tabs.filter((x) => x.id !== t.id);
    await supabase.from("user_tabs").delete().eq("id", t.id);
    if (currentId === t.id && others[0]) onSelect({ id: others[0].id, user_id: others[0].user_id, kind: others[0].kind });
  };

  return (
    <aside className={`fixed left-0 top-14 bottom-0 z-20 transition-all ${open ? "w-56" : "w-10"} bg-card/95 backdrop-blur-md border-r flex flex-col`}>
      <div className="flex items-center justify-between px-2 h-9 border-b">
        {open && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tabs</span>}
        {open && (
          <button onClick={() => setShowCreate(true)} title="New tab"
            className="h-6 w-6 grid place-items-center rounded hover:bg-muted text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={() => setOpen((o) => !o)}
          className={`h-7 w-7 grid place-items-center rounded hover:bg-muted text-muted-foreground ${open ? "" : "ml-auto"}`}
          title={open ? "Collapse" : "Expand"}>
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5 px-1">
        {tabs.map((t) => {
          const prof = profiles[t.user_id];
          const name = prof?.display_name || "Player";
          const isMe = t.user_id === myUserId;
          const active = t.id === currentId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect({ id: t.id, user_id: t.user_id, kind: t.kind })}
              title={`${t.name} · ${name}${isMe ? " (you)" : ""}`}
              className={`group w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md text-left text-sm transition-colors ${
                active ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"
              }`}
            >
              <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden grid place-items-center text-[10px] font-bold relative"
                style={!prof?.avatar_url ? { background: avatarColor(name), color: avatarFg(name) } : undefined}>
                {prof?.avatar_url
                  ? <img src={prof.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials(name)}
              </div>
              {open && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium flex items-center gap-1">
                    <span>{t.emoji}</span>
                    <span className="truncate">{t.name}</span>
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground flex items-center gap-1">
                    {KIND_ICON[t.kind] || <FileText className="h-3 w-3" />}
                    <span className="truncate">{name}{isMe && " · you"}</span>
                  </div>
                </div>
              )}
              {open && isMe && (
                <span onClick={(e) => remove(t, e)}
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded hover:bg-destructive/15 hover:text-destructive transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showCreate && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-lg shadow-pop p-5 w-[360px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">New tab</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <input
              autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Tab name…"
              className="w-full h-9 px-3 rounded-md border bg-background text-sm mb-3"
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["blank", "property", "html"] as const).map((k) => (
                <button key={k} onClick={() => setNewKind(k)}
                  className={`p-2.5 rounded-md border text-xs font-medium flex flex-col items-center gap-1 transition ${
                    newKind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}>
                  <span className="text-lg">{k === "html" ? "⚡" : k === "property" ? "🏡" : "📄"}</span>
                  <span className="capitalize">{k}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">
                    {k === "html" ? "Upload HTML" : k === "property" ? "Doc + stats" : "Just a doc"}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="h-8 px-3 rounded-md text-sm hover:bg-muted">Cancel</button>
              <button onClick={create} disabled={busy || !newName.trim()}
                className="h-8 px-4 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
