import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Home, Wrench, Users, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Home,
    title: "Welcome to Atheris! 🌟",
    body: "Atheris is a tiny social world. Every player gets a Property — your home, where your stats, currency, inventory and garden live.",
  },
  {
    icon: Wrench,
    title: "Build with the Builder",
    body: "On the bottom-right there's a Builder dock. Click any piece (Purchase Button, Timer, HTML, Header…) to instantly drop it into your property.",
  },
  {
    icon: Sparkles,
    title: "Earn 🍜 noodles & ✦ lumina",
    body: "Currencies show in the top bar. Spend them on purchase buttons that other players (or you) build. Level up to unlock more.",
  },
  {
    icon: Users,
    title: "Played Aero before?",
    body: "Click the “Played Aero?” button in the header to request your old pets and roles back. An owner has to approve it.",
  },
];

export function Tutorial({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const Icon = STEPS[step].icon;
  const finish = async () => {
    await supabase.from("profiles").update({ tutorial_seen: true }).eq("user_id", userId);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle>{STEPS[step].title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">{STEPS[step].body}</p>
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={finish}>Skip</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={finish}>Let's go!</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
