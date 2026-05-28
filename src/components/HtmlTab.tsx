import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, RefreshCw, ExternalLink } from "lucide-react";

// Script injected into every HTML tab. It exposes window.atheris.{grantNoodles,
// grantLumina, grantItem} and also auto-watches the gacha tab's `.item-value`
// element so existing gacha pages credit rewards to the player automatically.
const BRIDGE_SCRIPT = `<script>(function(){
  if (window.__atheris_bridge_installed) return;
  window.__atheris_bridge_installed = true;
  function post(payload){ try { parent.postMessage({ source: 'atheris', ...payload }, '*'); } catch(e){} }
  window.atheris = {
    grantNoodles: function(n){ post({ type: 'grant', noodles: Math.max(0, Math.floor(Number(n)||0)) }); },
    grantLumina:  function(n){ post({ type: 'grant', lumina:  Math.max(0, Math.floor(Number(n)||0)) }); },
    grantItem: function(opts){ if(!opts||!opts.name) return; post({ type: 'item', name: String(opts.name), emoji: String(opts.emoji||'📦'), category: String(opts.category||'gacha'), qty: Math.max(1, Math.floor(Number(opts.qty)||1)) }); }
  };
  // ---- Auto-bridge for AERO GATCHA style pages ----
  function parseValue(str){
    if(!str) return null;
    var m = String(str).replace(/,/g,'').match(/([0-9.]+)\\s*([MK]?)\\s*(Noodles|Lumina)/i);
    if(!m) return null;
    var n = parseFloat(m[1]);
    var mult = m[2] === 'M' ? 1e6 : m[2] === 'K' ? 1e3 : 1;
    var amt = Math.floor(n * mult);
    return { kind: m[3].toLowerCase(), amount: amt };
  }
  function currencyKind(name, cat, parsed){
    var s = ((name||'') + ' ' + (cat||'')).toLowerCase().trim();
    // Category-based: "currency", "noodles", "lumina", "bundle", "bundles"
    if (/\b(currency|noodles?|lumina|bundles?)\b/.test((cat||'').toLowerCase())) {
      if (/lumina/.test(s)) return 'lumina';
      return 'noodles';
    }
    // Name-based: contains noodle/lumina and a quantity word, OR name IS just the currency word
    if (/^(noodles?|lumina)$/.test(s)) return /lumina/.test(s) ? 'lumina' : 'noodles';
    if (/\b(bundle|pack|stack|sack|pouch|chest|bag|pile|crate|hoard|sack|jar|pile|heap)\b/.test((name||'').toLowerCase()) && parsed) {
      return parsed.kind;
    }
    return null;
  }
  function bind(){
    var value = document.querySelector('.item-value');
    var nameEl = document.querySelector('.item-name');
    var catEl  = document.querySelector('.item-category');
    if(!value) return false;
    var lastSig = '';
    var obs = new MutationObserver(function(){
      var v = value.textContent || '';
      var name = nameEl ? (nameEl.textContent || '').trim() : '';
      var sig = name + '|' + v;
      if (sig === lastSig || !name) return;
      lastSig = sig;
      var parsed = parseValue(v);
      var cat = catEl ? (catEl.textContent || 'gacha').split('·')[0].trim().toLowerCase() : 'gacha';
      var kind = currencyKind(name, cat, parsed);
      if (kind && parsed) {
        if (kind === 'noodles') window.atheris.grantNoodles(parsed.amount);
        else if (kind === 'lumina') window.atheris.grantLumina(parsed.amount);
        post({ type: 'gacha-log', item: name, value: v, currency: kind, amount: parsed.amount });
      } else {
        window.atheris.grantItem({ name: name, emoji: '🎁', category: cat || 'gacha', qty: 1 });
        post({ type: 'gacha-log', item: name, value: v });
      }
    });
    obs.observe(value, { childList: true, characterData: true, subtree: true });
    if (nameEl) obs.observe(nameEl, { childList: true, characterData: true, subtree: true });
    return true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(bind, 100); });
  } else {
    setTimeout(bind, 100);
  }
})();</script>`;

function inject(html: string): string {
  if (!html) return html;
  if (html.includes("__atheris_bridge_installed")) return html;
  if (html.toLowerCase().includes("</body>")) {
    return html.replace(/<\/body>/i, BRIDGE_SCRIPT + "</body>");
  }
  return html + BRIDGE_SCRIPT;
}

export function HtmlTab({ tabId, mine }: { tabId: string; mine: boolean }) {
  const [content, setContent] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // postMessage bridge from iframe
  useEffect(() => {
    if (!mine) return; // only credit the tab owner
    const onMsg = async (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "atheris") return;
      if (d.type === "grant") {
        const noodles = Number(d.noodles) || 0;
        const lumina  = Number(d.lumina)  || 0;
        if (noodles <= 0 && lumina <= 0) return;
        await supabase.rpc("grant_currency", { _noodles: noodles, _lumina: lumina });
        setFlash(`+${noodles ? noodles.toLocaleString() + " 🍜" : ""}${noodles && lumina ? "  " : ""}${lumina ? lumina.toLocaleString() + " ✦" : ""}`);
        setTimeout(() => setFlash(null), 1800);
      } else if (d.type === "item") {
        await supabase.rpc("grant_inventory_item", { _name: d.name, _emoji: d.emoji, _category: d.category, _qty: d.qty });
        setFlash(`+${d.qty}× ${d.name}`);
        setTimeout(() => setFlash(null), 1800);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [mine]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("user_tabs").select("document").eq("id", tabId).maybeSingle();
      if (cancel) return;
      const doc = (data?.document as any) || {};
      setContent(typeof doc.html_content === "string" ? doc.html_content : null);
      setUrl(typeof doc.html_url === "string" ? doc.html_url : null);
      setLoaded(true);
    })();
    const ch = supabase.channel(`htmltab:${tabId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_tabs", filter: `id=eq.${tabId}` }, (p) => {
        const doc = (p.new?.document as any) || {};
        setContent(typeof doc.html_content === "string" ? doc.html_content : null);
        setUrl(typeof doc.html_url === "string" ? doc.html_url : null);
        setReloadKey((k) => k + 1);
      })
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [tabId]);

  const upload = async (f: File) => {
    setBusy(true);
    try {
      const text = await f.text();
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const path = `${uid}/${tabId}-${Date.now()}.html`;
      let publicUrl: string | null = null;
      const { error: upErr } = await supabase.storage.from("tab-html").upload(path, f, { upsert: true, cacheControl: "60", contentType: "text/html" });
      if (!upErr) {
        const { data } = supabase.storage.from("tab-html").getPublicUrl(path);
        publicUrl = data.publicUrl;
      }
      await supabase.from("user_tabs").update({
        document: { html_content: text, html_url: publicUrl },
        last_saved_at: new Date().toISOString(),
      }).eq("id", tabId);
      setContent(text);
      setUrl(publicUrl);
      setReloadKey((k) => k + 1);
    } finally { setBusy(false); }
  };

  if (!loaded) return null;

  const hasHtml = !!content;
  const renderedSrc = hasHtml ? inject(content!) : null;

  return (
    <div className="absolute inset-0 bg-background">
      {hasHtml ? (
        <iframe
          key={reloadKey}
          srcDoc={renderedSrc!}
          title="Special tab"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
          className="w-full h-full border-0 block"
        />
      ) : (
        <div className="h-full grid place-items-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-xl font-semibold mb-1">Special HTML tab</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {mine ? "Upload an .html file and it'll run here, full-bleed, no bezel. Use window.atheris.grantNoodles(n) / grantLumina(n) / grantItem({name,emoji,category}) to credit rewards." : "The owner hasn't uploaded an HTML file yet."}
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
      {mine && hasHtml && (
        <div className="absolute top-2 right-2 flex gap-1.5 z-10">
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)} title="Reload"><RefreshCw className="h-3.5 w-3.5" /></Button>
          {url && (
            <Button size="sm" variant="secondary" asChild title="Open in new tab">
              <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Replace
          </Button>
        </div>
      )}
      {flash && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold shadow-pop animate-in fade-in slide-in-from-top-2">
          {flash}
        </div>
      )}
      <input ref={inputRef} type="file" accept=".html,text/html" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
    </div>
  );
}
