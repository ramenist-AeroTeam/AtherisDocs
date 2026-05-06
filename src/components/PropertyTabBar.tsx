import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Home as HomeIcon } from "lucide-react";
import { avatarColor, avatarFg, initials } from "@/components/CornerChat";

type TabRow = { id: string; user_id: string; name: string; emoji: string };
type Profile = { user_id: string; display_name: string; avatar_url: string | null };

export function PropertyTabBar({
  currentId, myUserId, onSelect,
}: {
  currentId: string; myUserId: string;
  onSelect: (tab: { id: string; user_id: string }) => void;
}) {
  const [tabs, setTabs] = useState<TabRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [t, p] = await Promise.all([
        supabase.from("user_tabs").select("id,user_id,name,emoji").order("created_at"),
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

  return (
    <aside className={`fixed left-0 top-14 bottom-0 z-20 transition-all ${open ? "w-56" : "w-10"} bg-card/95 backdrop-blur-md border-r flex flex-col`}>
      <div className="flex items-center justify-between px-2 h-9 border-b">
        {open && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</span>}
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto h-7 w-7 grid place-items-center rounded hover:bg-muted text-muted-foreground"
          title={open ? "Collapse" : "Expand"}
        >
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
              onClick={() => onSelect({ id: t.id, user_id: t.user_id })}
              title={`${name}${isMe ? " (you)" : ""}`}
              className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md text-left text-sm transition-colors ${
                active ? "bg-primary/15 text-primary" : "hover:bg-muted text-foreground"
              }`}
            >
              <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden grid place-items-center text-[10px] font-bold"
                style={!prof?.avatar_url ? { background: avatarColor(name), color: avatarFg(name) } : undefined}>
                {prof?.avatar_url
                  ? <img src={prof.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials(name)}
              </div>
              {open && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium flex items-center gap-1">
                    <span>{t.emoji}</span>
                    <span className="truncate">{name}{isMe && <span className="text-muted-foreground"> · you</span>}</span>
                  </div>
                </div>
              )}
              {open && isMe && <HomeIcon className="h-3 w-3 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
