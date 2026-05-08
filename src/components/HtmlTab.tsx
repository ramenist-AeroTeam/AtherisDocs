import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, RefreshCw } from "lucide-react";

export function HtmlTab({ tabId, mine }: { tabId: string; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("user_tabs").select("document").eq("id", tabId).maybeSingle();
      if (cancel) return;
      const u = (data?.document as any)?.html_url;
      setUrl(typeof u === "string" ? u : null);
      setLoaded(true);
    })();
    const ch = supabase.channel(`htmltab:${tabId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_tabs", filter: `id=eq.${tabId}` }, (p) => {
        const u = (p.new?.document as any)?.html_url;
        setUrl(typeof u === "string" ? u : null);
        setReloadKey((k) => k + 1);
      })
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [tabId]);

  const upload = async (f: File) => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const path = `${uid}/${tabId}-${Date.now()}.html`;
      const { error } = await supabase.storage.from("tab-html").upload(path, f, { upsert: true, cacheControl: "60", contentType: "text/html" });
      if (error) throw error;
      const { data } = supabase.storage.from("tab-html").getPublicUrl(path);
      await supabase.from("user_tabs").update({ document: { html_url: data.publicUrl }, last_saved_at: new Date().toISOString() }).eq("id", tabId);
      setUrl(data.publicUrl);
      setReloadKey((k) => k + 1);
    } finally { setBusy(false); }
  };

  if (!loaded) return null;

  return (
    <div className="fixed inset-0 top-14 left-10 md:left-56 bg-background">
      {url ? (
        <iframe
          key={reloadKey}
          src={url}
          title="Special tab"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          className="w-full h-full border-0 block"
        />
      ) : (
        <div className="h-full grid place-items-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-xl font-semibold mb-1">Special HTML tab</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {mine ? "Upload an .html file and it'll run here, full-bleed, no bezel." : "The owner hasn't uploaded an HTML file yet."}
            </p>
            {mine && (
              <Button onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Upload HTML
              </Button>
            )}
          </div>
        </div>
      )}
      {mine && url && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Replace
          </Button>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".html,text/html" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
    </div>
  );
}
