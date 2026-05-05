import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type Cursor = { id: string; name: string; color: string; x: number; y: number; t: number };

function nameColor(name: string) {
  const hues = [10, 40, 80, 140, 200, 250, 290, 320, 0, 180];
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % hues.length;
  return `hsl(${hues[h]} 75% 55%)`;
}
function initials(n: string) {
  return (n || "?").trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function RealtimeCursors({ userId, displayName, scope }: { userId: string; displayName: string; scope: string }) {
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
      // respond so newcomer sees us
      ch.send({
        type: "broadcast", event: "cursor",
        payload: { id: userId, name: displayName, color, x: lastPos.current.x, y: lastPos.current.y, t: performance.now() } satisfies Cursor,
      });
      setCursors((prev) => ({ ...prev, [c.id]: c }));
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast", event: "hello",
          payload: { id: userId, name: displayName, color, x: lastPos.current.x, y: lastPos.current.y, t: performance.now() } satisfies Cursor,
        });
      }
    });

    const onMove = (e: MouseEvent) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
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
  }, [userId, displayName, scope]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {Object.values(cursors).map((c) => (
        <div key={c.id}
          style={{ transform: `translate3d(${c.x}px, ${c.y}px, 0)`, willChange: "transform" }}
          className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
        >
          {/* Cursor arrow */}
          <svg width="22" height="24" viewBox="0 0 22 24" style={{ filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.25))" }}>
            <path d="M3 2 L3 19 L8 14 L11 21 L14 20 L11 13 L18 13 Z" fill={c.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          {/* Avatar + name pill */}
          <div className="ml-3 -mt-1 inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
            style={{ background: c.color, boxShadow: "0 4px 12px rgb(0 0 0 / 0.18)" }}>
            <span className="h-5 w-5 rounded-full bg-white/30 grid place-items-center text-[9px] font-bold">
              {initials(c.name)}
            </span>
            <span>{c.name}</span>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
