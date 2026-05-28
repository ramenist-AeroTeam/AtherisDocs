import { useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles, X } from "lucide-react";

type Step = { selector?: string; title: string; body: string; placement?: "bottom" | "top" | "left" | "right" };

const STEPS: Step[] = [
  {
    title: "Welcome to Atheris.",
    body: "Your Property is a live document — like Google Docs, but it also holds your stats, currency, inventory and garden. Let's take a 30-second tour.",
  },
  { selector: "[data-tour='format']", title: "Format like Docs", body: "Select any text in your property and the toolbar lights up. Bold, italic, color, fonts, headings, lists — all the usual stuff.", placement: "bottom" },
  { selector: "[data-tour='currency']", title: "Currencies", body: "🍜 Noodles for purchases, ✦ Lumina for premium upgrades. Earn them by playing.", placement: "bottom" },
  { selector: "[data-tour='aero']", title: "Played Aero before?", body: "Click here to request your old pets and roles back. An owner reviews each request.", placement: "bottom" },
  { selector: "[data-tour='stats']", title: "Your stats, attached", body: "These cards live on every property and update in realtime as you play. You can't accidentally delete them.", placement: "top" },
  { title: "You're all set", body: "Have fun!"},
];

function useRect(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    const update = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const id = window.setInterval(update, 200);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearInterval(id); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [selector]);
  return rect;
}

export function Tutorial({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const cur = STEPS[step];
  const rect = useRect(cur.selector);

  const finish = async () => {
    await supabase.from("profiles").update({ tutorial_seen: true }).eq("user_id", userId);
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pad = 12;
  const tipW = 320;
  const tipH = 200;
  let tipStyle: React.CSSProperties = {
    position: "fixed",
    left: typeof window !== "undefined" ? Math.max(16, window.innerWidth / 2 - tipW / 2) : 16,
    top: typeof window !== "undefined" ? Math.max(16, window.innerHeight / 2 - tipH / 2) : 16,
    width: tipW,
  };
  if (rect) {
    const place = cur.placement || "bottom";
    let left = rect.left;
    let top = rect.bottom + pad;
    if (place === "top") top = rect.top - tipH - pad;
    if (place === "left") { left = rect.left - tipW - pad; top = rect.top; }
    if (place === "right") { left = rect.right + pad; top = rect.top; }
    left = Math.max(16, Math.min(left, window.innerWidth - tipW - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tipH - 16));
    tipStyle = { position: "fixed", left, top, width: tipW };
  }

  const ring: React.CSSProperties | null = rect
    ? {
        position: "fixed",
        left: rect.left - 8,
        top: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        borderRadius: 14,
        boxShadow: "0 0 0 9999px hsl(230 30% 6% / 0.55), 0 0 0 3px hsl(var(--primary)), 0 0 32px hsl(var(--primary) / 0.6)",
        pointerEvents: "none",
        transition: "all 220ms cubic-bezier(.4,0,.2,1)",
        zIndex: 70,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[70]">
      {!ring && <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />}
      {ring && <div style={ring} />}
      <div style={tipStyle} className="z-[71] rounded-xl border bg-card shadow-pop p-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{cur.title}</div>
            <div className="text-[10px] text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
          </div>
          <button onClick={finish} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{cur.body}</p>
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>Back</Button>}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
            ) : (
              <Button size="sm" onClick={finish}>Let's go!</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
