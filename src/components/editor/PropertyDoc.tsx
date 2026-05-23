import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DocToolbar } from "./DocToolbar";

const DEFAULT_HTML = `<h1>Welcome to your Property</h1><p>This is your space. Type, format, paste images — anything. It saves live, and your stats stay attached below.</p>`;

export function PropertyDoc({ propertyId, mine, ownerName, blank }: { propertyId: string; mine: boolean; ownerName: string; blank?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const focusedRef = useRef(false);
  const pendingRemote = useRef<string | null>(null);
  const lastSavedHtml = useRef<string>("");

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("user_tabs").select("document").eq("id", propertyId).maybeSingle();
      if (cancelled) return;
      const doc = (data?.document as any) || {};
      const initial = typeof doc.html === "string" && doc.html ? doc.html : DEFAULT_HTML;
      setHtml(initial);
      lastSavedHtml.current = initial;
      if (editorRef.current) editorRef.current.innerHTML = initial;
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  // realtime receive
  useEffect(() => {
    const ch = supabase.channel(`doc:${propertyId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_tabs", filter: `id=eq.${propertyId}` }, (payload) => {
        const remote = (payload.new?.document as any)?.html;
        if (typeof remote !== "string") return;
        if (remote === lastSavedHtml.current) return;
        if (focusedRef.current) {
          pendingRemote.current = remote;
        } else {
          if (editorRef.current && editorRef.current.innerHTML !== remote) {
            editorRef.current.innerHTML = remote;
          }
          lastSavedHtml.current = remote;
          setHtml(remote);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [propertyId]);

  // debounced save
  useEffect(() => {
    if (!loaded || !mine) return;
    if (html === lastSavedHtml.current) return;
    setSaving(true);
    const id = setTimeout(async () => {
      const { error } = await supabase.from("user_tabs")
        .update({ document: { html }, last_saved_at: new Date().toISOString() })
        .eq("id", propertyId);
      setSaving(false);
      if (!error) {
        lastSavedHtml.current = html;
        setSavedAt(Date.now());
      }
    }, 400);
    return () => clearTimeout(id);
  }, [html, loaded, mine, propertyId]);

  return (
    <div>
      {mine && <DocToolbar editorRef={editorRef} />}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            {mine ? <>by you · {savedAt ? <>saved {timeAgo(savedAt)}</> : "auto-saves as you type"}{saving && " · saving…"}</>
                  : <>viewing <b>{ownerName}</b>'s property · live</>}
          </div>
        </div>
        <div
          ref={editorRef}
          contentEditable={mine}
          suppressContentEditableWarning
          data-tour="doc"
          onInput={(e) => setHtml((e.currentTarget as HTMLDivElement).innerHTML)}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => {
            focusedRef.current = false;
            if (pendingRemote.current && editorRef.current) {
              editorRef.current.innerHTML = pendingRemote.current;
              lastSavedHtml.current = pendingRemote.current;
              setHtml(pendingRemote.current);
              pendingRemote.current = null;
            }
          }}
          className={blank
            ? "prose-doc min-h-[60vh] outline-none px-2 py-4"
            : "prose-doc min-h-[40vh] outline-none rounded-lg border bg-card px-8 py-10 shadow-soft focus:ring-2 focus:ring-primary/30 transition-shadow"}
        />
      </div>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(ts).toLocaleTimeString();
}
