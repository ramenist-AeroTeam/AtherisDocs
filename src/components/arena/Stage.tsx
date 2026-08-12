import { useEffect, useRef, useState, type ReactNode } from "react";

export const STAGE_W = 1280;
export const STAGE_H = 720;

/**
 * The concept deck is a fixed 16:9 frame. Everything inside the arena is laid
 * out against a 1280x720 stage and uniformly scaled to fit the viewport, so the
 * composition never stretches or reflows away from the concept.
 */
export function Stage({ children, background }: { children: ReactNode; background?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / STAGE_W, height / STAGE_H));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 grid place-items-center overflow-hidden bg-black"
      style={{ background }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
