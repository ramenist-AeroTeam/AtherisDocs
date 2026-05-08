import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type Cursor = { id: string; name: string; color: string; x: number; y: number; t: number };

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#78716c",
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function RealtimeCursors({ userId, displayName, scope }: { userId: string; displayName: string; avatarUrl?: string | null; scope: string }) {
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [mounted, setMounted] = useState(false);
  const lastSent = useRef(0);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!scope || !userId) return;
    setCursors({});
    const color = colorFor(userId);
    const ch = supabase.channel(`atheris-cursors:${scope}`, { config: { broadcast: { self: false } } });
    const me = (): Cursor => ({ id: userId, name: displayName, color, x: lastPos.current.x, y: lastPos.current.y, t: performance.now() });

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
  }, [userId, displayName, scope]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {Object.values(cursors).map((c) => (
        <div key={c.id}
          style={{ transform: `translate3d(${c.x}px, ${c.y}px, 0)`, willChange: "transform" }}
          className="absolute top-0 left-0 transition-transform duration-75 ease-linear"
        >
          <svg width="22" height="24" viewBox="0 0 22 24" style={{ filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.3))" }}>
            <path d="M3 2 L3 19 L8 14 L11 21 L14 20 L11 13 L18 13 Z"
              fill={c.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <div className="ml-3 -mt-0.5 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold text-white whitespace-nowrap"
            style={{ background: c.color, boxShadow: "0 2px 8px rgb(0 0 0 / 0.18)" }}>
            {c.name}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
