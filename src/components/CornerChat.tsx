import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";
import { toast } from "sonner";

type ChatMsg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};
type Profile = { user_id: string; display_name: string; avatar_emoji: string };
type RoleRow = { user_id: string; role: string };

const roleColor: Record<string, string> = {
  owner: "bg-primary/15 text-primary border-primary/30",
  co_owner: "bg-accent text-accent-foreground border-accent",
  dev: "bg-success/15 text-success border-success/30 [--success:142_70%_45%]",
  member: "bg-muted text-muted-foreground border-border",
  custom: "bg-secondary text-secondary-foreground border-border",
};
const roleLabel: Record<string, string> = {
  owner: "Owner", co_owner: "Co-Owner", dev: "Dev", member: "Member", custom: "Custom",
};

function avatarColor(name: string) {
  const hues = [10, 40, 80, 140, 200, 250, 290, 320];
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]} 60% 85%)`;
}
function avatarFg(name: string) {
  const hues = [10, 40, 80, 140, 200, 250, 290, 320];
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]} 60% 25%)`;
}
function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function CornerChat({ userId, profilesMap, rolesMap }: {
  userId: string;
  profilesMap: Map<string, Profile>;
  rolesMap: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [presence, setPresence] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(100)
      .then(({ data }) => setMessages((data as ChatMsg[]) || []));

    const ch = supabase
      .channel("global-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => setMessages((m) => [...m, payload.new as ChatMsg]))
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const ids = Object.values(state).flat().map((p: any) => p.user_id);
        setPresence(Array.from(new Set(ids)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ user_id: userId, at: Date.now() });
      });
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    const { error } = await supabase.from("chat_messages").insert({ user_id: userId, content: v });
    if (error) toast.error(error.message);
  };

  const onlineProfiles = presence.map(id => profilesMap.get(id)).filter(Boolean) as Profile[];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <Button onClick={() => setOpen(true)} size="lg" className="h-14 w-14 rounded-full p-0 shadow-pop">
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-[360px] h-[520px] flex flex-col bg-card border shadow-pop">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" style={{ background: "hsl(142 70% 45%)" }} />
              <span className="font-semibold text-sm">global chat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{onlineProfiles.length} online</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1" ref={scrollRef as any}>
            <div className="p-3 space-y-3" ref={scrollRef}>
              {messages.map((m) => {
                const p = profilesMap.get(m.user_id);
                const r = rolesMap.get(m.user_id) || "member";
                const mine = m.user_id === userId;
                const name = p?.display_name || "user";
                const time = new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                if (mine) {
                  return (
                    <div key={m.id} className="flex items-end justify-end gap-2">
                      <div className="max-w-[70%]">
                        <div className="text-[10px] text-muted-foreground text-right mb-0.5">{time}</div>
                        <div className="bg-accent text-accent-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm">
                          {m.content}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0"
                        style={{ background: avatarColor(name), color: avatarFg(name) }}>
                        {initials(name)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0"
                      style={{ background: avatarColor(name), color: avatarFg(name) }}>
                      {initials(name)}
                    </div>
                    <div className="max-w-[75%]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold">{name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${roleColor[r] || roleColor.member}`}>
                          {roleLabel[r] || r}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{time}</span>
                      </div>
                      <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t p-2 flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="say something…" className="flex-1" />
            <Button onClick={send} size="sm" variant="secondary"><Send className="h-4 w-4" /></Button>
          </div>

          {onlineProfiles.length > 0 && (
            <div className="border-t px-3 py-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground mr-1">online now</span>
              {onlineProfiles.slice(0, 4).map((p) => (
                <Badge key={p.user_id} variant="outline" className={`text-[10px] ${roleColor[rolesMap.get(p.user_id) || "member"]}`}>
                  {p.display_name}
                </Badge>
              ))}
              {onlineProfiles.length > 4 && (
                <Badge variant="outline" className="text-[10px]">+{onlineProfiles.length - 4}</Badge>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export { roleColor, roleLabel, avatarColor, avatarFg, initials };
