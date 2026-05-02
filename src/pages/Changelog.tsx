import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BetaDisclaimer } from "@/components/BetaDisclaimer";
import { CHANGELOG } from "@/data/changelog";

const tagStyles: Record<string, string> = {
  feature: "bg-[hsl(142_70%_92%)] text-[hsl(142_60%_22%)] border-[hsl(142_50%_75%)]",
  fix: "bg-[hsl(0_80%_94%)] text-[hsl(0_60%_30%)] border-[hsl(0_60%_80%)]",
  design: "bg-[hsl(280_80%_94%)] text-[hsl(280_60%_30%)] border-[hsl(280_60%_80%)]",
  backend: "bg-[hsl(195_80%_92%)] text-[hsl(200_60%_25%)] border-[hsl(195_60%_75%)]",
  beta: "bg-[hsl(38_92%_92%)] text-[hsl(30_70%_25%)] border-[hsl(38_80%_75%)]",
};

export default function Changelog() {
  useEffect(() => {
    document.title = "Atheris changelog — what's new";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Every visible change to Atheris, newest first.");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BetaDisclaimer />
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" /> back
          </Link>
          <Link to="/" className="font-display text-xl font-bold tracking-tight ml-2">atheris</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ScrollText className="h-4 w-4" /> changelog
          </div>
          <h1 className="font-display text-4xl font-bold">What's new in Atheris</h1>
          <p className="text-muted-foreground">
            Every visible change, newest first. Hand-written by Max & Shareef.
          </p>
        </div>

        <ol className="relative border-l border-border space-y-10 pl-6">
          {CHANGELOG.map((e) => (
            <li key={`${e.date}-${e.version}`} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                <h2 className="font-semibold text-lg">{e.title}</h2>
                <span className="font-mono-d text-xs text-muted-foreground">v{e.version}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(e.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {e.tags.map((t) => (
                  <Badge key={t} variant="outline" className={tagStyles[t] || ""}>{t}</Badge>
                ))}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {e.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary mt-1.5">•</span>
                    <span className="text-foreground/90">{n}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
