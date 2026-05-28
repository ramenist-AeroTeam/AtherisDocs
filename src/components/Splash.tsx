import { useEffect, useState } from "react";
import { playStartupChime } from "@/lib/startupSound";

export function Splash({ ready, soundEnabled }: { ready: boolean; soundEnabled: boolean }) {
  const [show, setShow] = useState(true);
  const [played, setPlayed] = useState(false);
  const mountedAt = useState(() => Date.now())[0];

  useEffect(() => {
    if (played) return;
    if (soundEnabled) playStartupChime();
    setPlayed(true);
  }, [played, soundEnabled]);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const wait = Math.max(0, 700 - elapsed);
    const t = setTimeout(() => setShow(false), wait);
    return () => clearTimeout(t);
  }, [ready, mountedAt]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center splash-fade"
      style={{
        background:
          "radial-gradient(60% 60% at 30% 30%, hsl(var(--primary) / 0.35), transparent 65%), radial-gradient(50% 50% at 75% 70%, hsl(var(--primary-glow) / 0.35), transparent 65%), hsl(var(--background))",
      }}
    >
      <div className="text-center space-y-5">
        <div className="font-display text-6xl md:text-7xl font-bold tracking-tight text-gradient">
          atheris
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary splash-dot" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary splash-dot" style={{ animationDelay: "180ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary splash-dot" style={{ animationDelay: "360ms" }} />
        </div>
        <div className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Developing...</div>
      </div>
    </div>
  );
}
