import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type Cursor = { id: string; name: string; color: string; avatar?: string | null; x: number; y: number; t: number };

function nameColor(name: string) {
  const hues = [10, 40, 80, 140, 200, 250, 290, 320, 0, 180];
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]} 75% 55%)`;
}
function initials(n: string) {
  return (n || "?").trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function RealtimeCursors({ userId, displayName, avatarUrl, scope }: { userId: string; displayName: string; avatarUrl?: string | null; scope: string }) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [mounted, setMounted] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!scope || !userId) return;
    setCursors({});
    const color = nameColor(displayName || userId);
    const ch = supabase.channel(`atheris-cursors:${scope}`, { config: { broadcast: { self: false } } });
    channelRef.current = ch;
    const me = (): Cursor => ({ id: userId, name: displayName, color, avatar: avatarUrl || null, x: lastPos.current.x, y: lastPos.current.y, t: performance.now() });
    ch.on("broadcast", { event: "cursor" }, (payload) => {
      const c = payload.payload as Cursor;
      if (c.id === userId) return;
      setCursors((prev) => ({ ...prev, [c.id]: c }));
    }).on("broadcast", { event: "leave" }, (payload) => {
      const id = payload.payload?.id as string;
      setCursors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }).on("broadcast", { event: "hello" }, (payload) => {
      const c = payload.payload as Cursor;
      if (c.id === userId) return;
      ch.send({ type: "broadcast", event: "cursor", payload: me() });
      setCursors((prev) => ({ ...prev, [c.id]: c }));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "hello", payload: me() });
      }
    });

    const onMove = (e: MouseEvent) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
      const now = performance.now();
      if (now - lastSent.current < 40) return;
      lastSent.current = now;
      ch.send({ type: "broadcast", event: "cursor", payload: me() });
    };
    const onLeave = () => ch.send({ type: "broadcast", event: "leave", payload: { id: userId } });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("beforeunload", onLeave);

    const prune = window.setInterval(() => {
      setCursors((prev) => {
        const now = performance.now();
        const n: Record<string, Cursor> = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 8000) n[k] = v;
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
  }, [userId, displayName, avatarUrl, scope]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {Object.values(cursors).map((c) => (
        <div key={c.id}
          style={{ transform: `translate3d(${c.x}px, ${c.y}px, 0)`, willChange: "transform" }}
          className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
        >
          {/* Teardrop avatar cursor */}
          <div className="relative" style={{ filter: "drop-shadow(0 4px 8px rgb(0 0 0 / 0.25))" }}>
            <svg width="40" height="46" viewBox="0 0 40 46" className="absolute top-0 left-0">
              <path d="M4 4 C4 22 14 36 20 44 C26 36 36 22 36 4 Z"
                fill={c.color} stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <div className="absolute" style={{ top: 4, left: 8, width: 24, height: 24 }}>
              <div className="h-6 w-6 rounded-full overflow-hidden grid place-items-center text-[9px] font-bold text-white bg-white/30 border-2 border-white">
                {c.avatar
                  ? <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                  : initials(c.name)}
              </div>
            </div>
          </div>
          <div className="ml-1 mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
            style={{ background: c.color, boxShadow: "0 4px 12px rgb(0 0 0 / 0.18)" }}>
            {c.name}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
