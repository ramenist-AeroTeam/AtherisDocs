import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Cursor = { id: string; name: string; color: string; x: number; y: number; t: number };

function nameColor(name: string) {
  const hues = [10, 40, 80, 140, 200, 250, 290, 320, 0, 180];
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]} 75% 55%)`;
}

export function RealtimeCursors({ userId, displayName, scope }: { userId: string; displayName: string; scope: string }) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!scope) return;
    setCursors({});
    const color = nameColor(displayName || userId);
    const ch = supabase.channel(`atheris-cursors:${scope}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;
    ch.on("broadcast", { event: "cursor" }, (payload) => {
      const c = payload.payload as Cursor;
      if (c.id === userId) return;
      setCursors((prev) => ({ ...prev, [c.id]: c }));
    }).on("broadcast", { event: "leave" }, (payload) => {
      const id = payload.payload?.id as string;
      setCursors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }).subscribe();

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSent.current < 40) return;
      lastSent.current = now;
      ch.send({
        type: "broadcast", event: "cursor",
        payload: { id: userId, name: displayName, color, x: e.clientX, y: e.clientY, t: now } satisfies Cursor,
      });
    };
    const onLeave = () => ch.send({ type: "broadcast", event: "leave", payload: { id: userId } });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("beforeunload", onLeave);

    // prune stale cursors
    const prune = window.setInterval(() => {
      setCursors((prev) => {
        const now = performance.now();
        const n: Record<string, Cursor> = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 5000) n[k] = v;
        return n;
      });
    }, 2000);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("beforeunload", onLeave);
      window.clearInterval(prune);
      onLeave();
      supabase.removeChannel(ch);
    };
  }, [userId, displayName, scope]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {Object.values(cursors).map((c) => (
        <div key={c.id} style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
          className="absolute top-0 left-0 transition-transform duration-75 ease-linear">
          <svg width="20" height="22" viewBox="0 0 20 22" fill={c.color}>
            <path d="M2 2 L2 18 L7 13 L10 20 L13 19 L10 12 L17 12 Z" stroke="white" strokeWidth="1.2" />
          </svg>
          <div className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-white whitespace-nowrap"
            style={{ background: c.color }}>
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
}
