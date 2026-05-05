import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BetaDisclaimer } from "@/components/BetaDisclaimer";
import { Sparkles, Boxes, Users, Wand2, MousePointer2, ArrowRight, Rocket, ScrollText } from "lucide-react";

export default function Home() {
  const nav = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    document.title = "Atheris — your mini world, in tabs";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Atheris is a collaborative tab-based mini world. Build properties, plant gardens, run live HTML, and play with friends. Open beta.");
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <BetaDisclaimer />

      {/* Nav */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-gradient">atheris</Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link to="/changelog" className="px-3 h-9 rounded-md inline-flex items-center hover:bg-muted text-muted-foreground hover:text-foreground">Changelog</Link>
            {signedIn ? (
              <Button size="sm" onClick={() => nav("/app")}>Open app <ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button size="sm" onClick={() => nav("/auth")}>Sign in</Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60"
          style={{ background: "radial-gradient(60% 60% at 30% 20%, hsl(280 90% 70% / 0.18), transparent 60%), radial-gradient(50% 50% at 80% 30%, hsl(38 95% 60% / 0.18), transparent 60%), radial-gradient(60% 60% at 50% 90%, hsl(195 90% 60% / 0.16), transparent 60%)" }} />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border bg-card/60 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(142_70%_45%)] pulse-dot" />
              v0.8 — open beta
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Your <span className="text-gradient">mini world</span>,<br /> in tabs.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Atheris is a tiny collaborative universe. Build a property, raise a garden,
              wire up buttons, and hang out with friends — all live, all yours.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => nav(signedIn ? "/app" : "/auth")} className="shadow-pop">
                <Rocket className="h-4 w-4 mr-1.5" />
                {signedIn ? "Open your tabs" : "Start playing"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => nav("/changelog")}>
                <ScrollText className="h-4 w-4 mr-1.5" /> What's new
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">free · sign in with Google · no card needed</div>
          </div>

          {/* Mock */}
          <div className="relative">
            <div className="rounded-xl border bg-card shadow-pop overflow-hidden">
              <div className="px-3 h-9 border-b flex items-center gap-1.5 bg-muted/40">
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_70%_60%)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(38_92%_55%)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(142_60%_50%)]" />
                <span className="ml-3 text-xs text-muted-foreground font-mono-d">atheris/property/shareef</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] min-h-[320px]">
                <div className="border-r p-2 space-y-1 bg-muted/20 text-xs">
                  <div className="px-2 py-1.5 rounded bg-card border">🛒 The Shop!</div>
                  <div className="px-2 py-1.5 rounded hover:bg-card">⚔️ Arena</div>
                  <div className="px-2 py-1.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">✨ Property</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[hsl(38_95%_55%)]" />
                    <h3 className="font-display font-bold text-lg">Welcome to your Property!</h3>
                  </div>
                  <div className="rounded p-2 text-xs leading-snug" style={{ background: "hsl(142 80% 88%)", color: "hsl(142 60% 18%)" }}>
                    This is your own mini world! Have fun editing to your heart's desire. — Max & Shareef
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="px-2 py-1 rounded border bg-[hsl(38_92%_95%)] text-[hsl(30_70%_25%)]">🍜 1,240</div>
                    <div className="px-2 py-1 rounded border bg-[hsl(195_80%_95%)] text-[hsl(200_60%_25%)]">✦ 87</div>
                    <div className="px-2 py-1 rounded border">Lv 12</div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="px-2.5 h-7 rounded-md text-xs grid place-items-center bg-[hsl(142_70%_45%)] text-white">1000 🍜 Purchase</span>
                    <span className="px-2.5 h-7 rounded-md text-xs grid place-items-center bg-primary text-primary-foreground">Click me</span>
                  </div>
                </div>
              </div>
            </div>
            {/* floating cursors */}
            <div className="absolute -left-3 top-16 flex items-center gap-1 text-[10px] font-medium text-white">
              <span className="h-3 w-3 rounded-sm rotate-45" style={{ background: "hsl(280 80% 60%)" }} />
              <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(280 80% 60%)" }}>max</span>
            </div>
            <div className="absolute right-6 bottom-10 flex items-center gap-1 text-[10px] font-medium text-white">
              <span className="h-3 w-3 rounded-sm rotate-45" style={{ background: "hsl(38 92% 50%)" }} />
              <span className="px-1.5 py-0.5 rounded" style={{ background: "hsl(38 92% 50%)" }}>shareef</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Boxes, title: "Live Property doc", body: "Your property is a Docs-style document — bold, color, fonts, headings, lists. It saves as you type." },
            { icon: Users, title: "Live multiplayer", body: "See everyone's avatar cursors and edits in realtime, no refresh ever." },
            { icon: MousePointer2, title: "Stats attached", body: "Profile, currency, inventory and garden cards live on every property and update automatically." },
            { icon: Wand2, title: "Aero migration", body: "Played Aero before? Reclaim your old pets and roles — owners review each request." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5 space-y-2">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="font-display text-3xl font-bold">Build your corner of Atheris.</h2>
          <p className="text-muted-foreground">Sign in, claim a tab, plant a thing. Stay as long as you want.</p>
          <Button size="lg" onClick={() => nav(signedIn ? "/app" : "/auth")}>
            {signedIn ? "Open your tabs" : "Sign in with Google"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </section>

      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4 text-xs text-muted-foreground">
          <span>© Atheris</span>
          <Link to="/changelog" className="hover:text-foreground">changelog</Link>
          <span className="ml-auto">made with ❤ by Max & Shareef</span>
        </div>
      </footer>
    </div>
  );
}
