import { useEffect, useState, useRef } from "react";
import { playStartupChime } from "@/lib/startupSound";

export function Splash({ ready, soundEnabled }: { ready: boolean; soundEnabled: boolean }) {
  const [show, setShow] = useState(true);
  const [played, setPlayed] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const mountedAt = useState(() => Date.now())[0];
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 2200;

  // — existing sound logic —
  useEffect(() => {
    if (played) return;
    if (soundEnabled) playStartupChime();
    setPlayed(true);
  }, [played, soundEnabled]);

  // — existing ready/dismiss logic —
  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
   const wait = Math.max(0, 3500 - elapsed);
    const t = setTimeout(() => setShow(false), wait);
    return () => clearTimeout(t);
  }, [ready, mountedAt]);

  // — bar animation —
  function easeInOut(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function runAnim(ts: number) {
    if (!startRef.current) startRef.current = ts;
    const raw = Math.min((ts - startRef.current) / DURATION, 1);
    setFillPct(easeInOut(raw) * 100);
    if (raw < 1) {
      rafRef.current = requestAnimationFrame(runAnim);
    }
  }

  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 120);
    const t2 = setTimeout(() => {
      setBarVisible(true);
      setTimeout(() => { rafRef.current = requestAnimationFrame(runAnim); }, 350);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-10 splash-fade"
      style={{
        background:
          "radial-gradient(ellipse at 78% 28%, #2952d9 0%, #1a30b5 28%, #1428a0 52%, #0e1a70 78%, #080e3d 100%)",
      }}
    >
      {/* Title */}
      <div
        className="font-display font-bold tracking-tight text-white select-none"
        style={{
          fontSize: "clamp(48px, 8vw, 96px)",
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.65s ease, transform 0.65s ease",
        }}
      >
        Atheris
      </div>

      {/* Loading bar */}
      <div
        style={{
          width: "min(500px, 75vw)",
          opacity: barVisible ? 1 : 0,
          transform: barVisible ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "34px",
            background: "rgba(255,255,255,0.92)",
            borderRadius: "999px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${fillPct}%`,
              background: "linear-gradient(90deg, #4a8fe8 0%, #6aaff5 100%)",
              borderRadius: "999px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
