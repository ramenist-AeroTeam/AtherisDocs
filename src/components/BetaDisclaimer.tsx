import { useEffect, useState } from "react";
import { X, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";

const KEY = "atheris-beta-dismissed-v1";

export function BetaDisclaimer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(sessionStorage.getItem(KEY) !== "1");
  }, []);
  if (!open) return null;
  return (
    <div className="w-full bg-gradient-to-r from-[hsl(38_95%_92%)] via-[hsl(280_85%_94%)] to-[hsl(195_85%_92%)] border-b border-border/60 text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
        <p className="flex-1">
          <span className="font-semibold">Atheris is in open beta.</span>{" "}
          <span className="text-muted-foreground">
            Things may break, save data may reset, and features will change without warning.
          </span>{" "}
          <Link to="/changelog" className="underline underline-offset-2 hover:text-primary">
            See what's new →
          </Link>
        </p>
        <button
          onClick={() => { sessionStorage.setItem(KEY, "1"); setOpen(false); }}
          className="h-7 w-7 grid place-items-center rounded-md hover:bg-background/60 text-muted-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
