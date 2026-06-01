import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Undo2, Redo2, RemoveFormatting,
  Heading1, Heading2, Pilcrow, Highlighter, Type, Sparkles, AlignJustify, Eraser,
} from "lucide-react";

type SelState = {
  hasRange: boolean;
  bold: boolean; italic: boolean; underline: boolean; strike: boolean;
};

const FONTS = [
  { v: "Inter, sans-serif", l: "Inter" },
  { v: "'Space Grotesk', sans-serif", l: "Space Grotesk" },
  { v: "'Playfair Display', serif", l: "Playfair" },
  { v: "'JetBrains Mono', monospace", l: "JetBrains Mono" },
  { v: "'Caveat', cursive", l: "Caveat" },
];
const SIZES = ["1", "2", "3", "4", "5", "6", "7"];
const SIZE_LABELS: Record<string, string> = { "1": "10", "2": "13", "3": "16", "4": "18", "5": "24", "6": "32", "7": "48" };
const TEXT_COLORS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc","#f9cb9c",
  "#dd7e6b","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd","#f6b26b",
  "#cc4125","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0","#e69138",
  "#a61c00","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79","#b45f06",
  "#85200c","#990000","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47","#783f04",
];
const HIGHLIGHT_COLORS = [
  "transparent",
  "#ffffff","#000000","#fff2cc","#fce5cd","#f4cccc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc",
  "#fff475","#ffe599","#fdcfa1","#f6b26b","#e06666","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0",
  "#ffeb3b","#ffc107","#ff9800","#ff5722","#f44336","#4caf50","#009688","#03a9f4","#3f51b5","#9c27b0",
];
const GRADIENTS = [
  { l: "Sunset", v: "linear-gradient(90deg,#ff6b6b,#ffa94d,#ffd43b)" },
  { l: "Ocean", v: "linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6)" },
  { l: "Candy", v: "linear-gradient(90deg,#ec4899,#a855f7,#3b82f6)" },
  { l: "Forest", v: "linear-gradient(90deg,#10b981,#84cc16,#eab308)" },
  { l: "Fire", v: "linear-gradient(90deg,#f43f5e,#f97316,#facc15)" },
  { l: "Aurora", v: "linear-gradient(90deg,#14b8a6,#22d3ee,#a78bfa,#f472b6)" },
  { l: "Mono", v: "linear-gradient(90deg,#111827,#6b7280,#9ca3af)" },
  { l: "Gold", v: "linear-gradient(90deg,#fde047,#f59e0b,#b45309)" },
];
const LINE_HEIGHTS = [
  { l: "1.0", v: "1" }, { l: "1.15", v: "1.15" }, { l: "1.5", v: "1.5" },
  { l: "1.75", v: "1.75" }, { l: "2.0", v: "2" }, { l: "2.5", v: "2.5" },
];
const LETTER_SPACINGS = [
  { l: "Tight", v: "-0.04em" }, { l: "Normal", v: "0" }, { l: "Wide", v: "0.04em" },
  { l: "Wider", v: "0.1em" }, { l: "Widest", v: "0.2em" },
];

function wrapSelection(style: Partial<CSSStyleDeclaration>, dataAttr?: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  Object.assign(span.style, style);
  if (dataAttr) span.setAttribute("data-style", dataAttr);
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(span);
    sel.addRange(r);
    return span;
  } catch { return null; }
}

function wrapSelectedTextNodes(decorate: (span: HTMLSpanElement) => void) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const root = range.commonAncestorContainer;
  const rootEl: Node = root.nodeType === 1 ? root : (root.parentNode as Node);
  if (!rootEl) return;
  const targets: Text[] = [];
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!n.nodeValue || n.nodeValue.length === 0) return NodeFilter.FILTER_REJECT;
      const r = document.createRange();
      r.selectNode(n);
      const intersects =
        range.compareBoundaryPoints(Range.END_TO_START, r) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, r) > 0;
      return intersects ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let n: Node | null = walker.nextNode();
  while (n) { targets.push(n as Text); n = walker.nextNode(); }
  if (targets.length === 0) return;
  const newSpans: HTMLSpanElement[] = [];
  for (const tn of targets) {
    let node = tn;
    if (node === range.startContainer && range.startOffset > 0) {
      node = (node as Text).splitText(range.startOffset);
    }
    if (node === range.endContainer) {
      const endOffset = range.endOffset - (tn === range.startContainer ? range.startOffset : 0);
      if (endOffset < (node as Text).length) (node as Text).splitText(endOffset);
    }
    const span = document.createElement("span");
    decorate(span);
    node.parentNode?.insertBefore(span, node);
    span.appendChild(node);
    newSpans.push(span);
  }
  if (newSpans.length > 0) {
    const r2 = document.createRange();
    r2.setStartBefore(newSpans[0]);
    r2.setEndAfter(newSpans[newSpans.length - 1]);
    sel.removeAllRanges();
    sel.addRange(r2);
  }
}

function applyGradientText(g: string) {
  wrapSelectedTextNodes((span) => {
    span.setAttribute("data-style", "gradient-text");
    span.style.backgroundImage = g;
    span.style.backgroundRepeat = "no-repeat";
    span.style.backgroundClip = "text";
    (span.style as any).webkitBackgroundClip = "text";
    (span.style as any).webkitTextFillColor = "transparent";
    span.style.color = "transparent";
  });
}

function applyGradientHighlight(g: string) {
  wrapSelectedTextNodes((span) => {
    span.setAttribute("data-style", "gradient-bg");
    span.style.backgroundImage = g;
    span.style.backgroundRepeat = "no-repeat";
    span.style.padding = "0 3px";
    span.style.borderRadius = "3px";
    (span.style as any).boxDecorationBreak = "clone";
    (span.style as any).webkitBoxDecorationBreak = "clone";
  });
}

function clearGradients() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const root = range.commonAncestorContainer;
  const rootEl: Element = (root.nodeType === 1 ? root : root.parentNode) as Element;
  if (!rootEl) return;
  const candidates: HTMLSpanElement[] = [];
  rootEl.querySelectorAll<HTMLSpanElement>('span[data-style="gradient-text"], span[data-style="gradient-bg"]').forEach((el) => {
    if (range.intersectsNode(el)) candidates.push(el);
  });
  let p: Node | null = root;
  while (p && p !== rootEl) {
    if (p.nodeType === 1) {
      const el = p as HTMLElement;
      const d = el.getAttribute("data-style");
      if (d === "gradient-text" || d === "gradient-bg") candidates.push(el as HTMLSpanElement);
    }
    p = p.parentNode;
  }
  for (const span of candidates) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  }
}

function applyToBlocks(setter: (el: HTMLElement) => void) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const blocks = new Set<HTMLElement>();
  const walk = (n: Node) => {
    if (n.nodeType === 1) {
      const el = n as HTMLElement;
      const tag = el.tagName;
      if (["P","H1","H2","H3","H4","LI","DIV","BLOCKQUOTE"].includes(tag)) blocks.add(el);
    }
    if (n.parentElement) {
      let p: HTMLElement | null = n.parentElement;
      while (p) {
        if (["P","H1","H2","H3","H4","LI","DIV","BLOCKQUOTE"].includes(p.tagName)) { blocks.add(p); break; }
        p = p.parentElement;
      }
    }
  };
  walk(range.startContainer);
  walk(range.endContainer);
  const it = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT);
  let cur = it.currentNode;
  while (cur) {
    if (range.intersectsNode(cur)) walk(cur);
    cur = it.nextNode() as Node;
    if (!cur) break;
  }
  blocks.forEach(setter);
}

// ─── Toolbar styles ────────────────────────────────────────────────────────

const toolbarWrapStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #4a90d9 0%, #1a73e8 50%, #6c5ce7 100%)",
  padding: "3px",
  borderRadius: "12px",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const toolbarInnerStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.25)",
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  gap: "1px",
  height: "40px",
  overflowX: "auto",
  overflowY: "hidden",
  whiteSpace: "nowrap",
  scrollbarWidth: "none" as any,
};

export function DocToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) {
  const [sel, setSel] = useState<SelState>({ hasRange: false, bold: false, italic: false, underline: false, strike: false });
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const update = () => {
      const s = window.getSelection();
      if (!s || s.rangeCount === 0) { setSel((p) => ({ ...p, hasRange: false })); return; }
      const r = s.getRangeAt(0);
      const ed = editorRef.current;
      if (!ed || !ed.contains(r.commonAncestorContainer)) { setSel((p) => ({ ...p, hasRange: false })); return; }
      const has = !r.collapsed;
      if (has) savedRange.current = r.cloneRange();
      setSel({
        hasRange: has,
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [editorRef]);

  const restore = () => {
    if (!savedRange.current) return false;
    const s = window.getSelection();
    if (!s) return false;
    s.removeAllRanges();
    s.addRange(savedRange.current);
    return true;
  };

  const cmd = (command: string, value?: string) => {
    if (!sel.hasRange && !["undo", "redo"].includes(command)) {
      if (!restore()) return;
    }
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const disabled = !sel.hasRange;

  return (
    <div data-tour="format" style={toolbarWrapStyle}>
      <div style={toolbarInnerStyle}>
        <Btn onClick={() => cmd("undo")} title="Undo"><Undo2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => cmd("redo")} title="Redo"><Redo2 className="h-4 w-4" /></Btn>
        <Sep />

        <GlassSelect
          disabled={disabled}
          ariaLabel="Font"
          value=""
          onChange={(v) => cmd("fontName", v)}
          options={FONTS.map((f) => ({ value: f.v, label: f.l, style: { fontFamily: f.v } }))}
          placeholder={<><Type className="h-3 w-3 opacity-80" /> <span>Font</span></>}
          width={110}
        />
        <GlassSelect
          disabled={disabled}
          ariaLabel="Size"
          value=""
          onChange={(v) => cmd("fontSize", v)}
          options={SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
          placeholder={<span>{SIZE_LABELS["3"]}</span>}
          width={52}
        />
        <Sep />

        <Btn active={sel.bold} disabled={disabled} onClick={() => cmd("bold")} title="Bold (⌘B)">
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn active={sel.italic} disabled={disabled} onClick={() => cmd("italic")} title="Italic (⌘I)">
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn active={sel.underline} disabled={disabled} onClick={() => cmd("underline")} title="Underline (⌘U)">
          <Underline className="h-4 w-4" />
        </Btn>
        <Btn active={sel.strike} disabled={disabled} onClick={() => cmd("strikeThrough")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <Sep />

        <Swatch disabled={disabled} colors={TEXT_COLORS} onPick={(c) => cmd("foreColor", c)} title="Text color"
          icon={
            <span className="flex flex-col items-center gap-[2px]">
              <span className="font-bold text-sm leading-none text-white">A</span>
              <span className="w-3 h-[3px] rounded-full bg-red-400 block" />
            </span>
          }
        />
        <Swatch disabled={disabled} colors={HIGHLIGHT_COLORS} onPick={(c) => cmd("hiliteColor", c)} title="Highlight"
          icon={<Highlighter className="h-4 w-4" />}
        />
        <GradientPicker disabled={disabled} title="Gradient text"
          icon={
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-[9px] font-semibold px-1 py-px rounded bg-white/30 text-white leading-tight">new</span>
            </span>
          }
          onPick={(g) => {
            if (!sel.hasRange) restore();
            editorRef.current?.focus();
            applyGradientText(g);
          }}
        />
        <GradientPicker disabled={disabled} title="Gradient highlight"
          icon={<span className="text-xs font-bold text-white">▮</span>}
          onPick={(g) => {
            if (!sel.hasRange) restore();
            editorRef.current?.focus();
            applyGradientHighlight(g);
          }}
        />
        <Btn disabled={disabled} title="Clear gradient"
          onClick={() => { if (!sel.hasRange) restore(); editorRef.current?.focus(); clearGradients(); }}>
          <Eraser className="h-4 w-4" />
        </Btn>
        <Sep />

        <GlassSelect disabled={disabled} ariaLabel="Line height" value=""
          onChange={(v) => { if (!sel.hasRange) restore(); applyToBlocks((el) => { el.style.lineHeight = v; }); }}
          options={LINE_HEIGHTS.map((x) => ({ value: x.v, label: x.l }))}
          placeholder={<><AlignJustify className="h-3 w-3 opacity-80" /></>}
          width={52}
        />
        <GlassSelect disabled={disabled} ariaLabel="Letter spacing" value=""
          onChange={(v) => { if (!sel.hasRange) restore(); wrapSelection({ letterSpacing: v }, "tracking"); }}
          options={LETTER_SPACINGS.map((x) => ({ value: x.v, label: x.l }))}
          placeholder={<span className="font-mono text-[10px]">A→A</span>}
          width={60}
        />
        <Sep />

        <Btn disabled={disabled} onClick={() => cmd("formatBlock", "H1")} title="Heading 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("formatBlock", "H2")} title="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("formatBlock", "P")} title="Paragraph"><Pilcrow className="h-4 w-4" /></Btn>
        <Sep />

        <Btn disabled={disabled} onClick={() => cmd("insertUnorderedList")} title="Bullet list"><List className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("insertOrderedList")} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
        <Sep />

        <Btn disabled={disabled} onClick={() => cmd("justifyLeft")} title="Align left"><AlignLeft className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("justifyCenter")} title="Align center"><AlignCenter className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("justifyRight")} title="Align right"><AlignRight className="h-4 w-4" /></Btn>
        <Sep />

        <Btn disabled={disabled} onClick={() => {
          const url = window.prompt("Link URL");
          if (url) cmd("createLink", url);
        }} title="Insert link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn disabled={disabled} onClick={() => cmd("removeFormat")} title="Clear formatting"><RemoveFormatting className="h-4 w-4" /></Btn>

        <div className="ml-auto flex items-center gap-1.5 pl-2 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 block" />
          <span className="text-[11px] text-white/60 pr-1 whitespace-nowrap">
            {disabled ? "select text" : "ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Btn({
  children, onClick, active, disabled, title,
}: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: 30,
        minWidth: 30,
        padding: "0 7px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: "none",
        background: active ? "rgba(255,255,255,0.28)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "rgba(255,255,255,0.9)",
        fontSize: 13,
        gap: 3,
        flexShrink: 0,
        opacity: disabled ? 0.35 : 1,
        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = active ? "rgba(255,255,255,0.28)" : "transparent"; }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.25)", margin: "0 3px", flexShrink: 0 }} />
  );
}

function GlassSelect({
  options, onChange, disabled, placeholder, width = 90, ariaLabel,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
  options: { value: string; label: string; style?: React.CSSProperties }[];
  placeholder: React.ReactNode; width?: number; ariaLabel?: string;
}) {
  return (
    <div className="relative" style={{ width, flexShrink: 0 }}>
      <div
        style={{
          height: 30,
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          borderRadius: 6,
          padding: "0 8px",
          fontSize: 12,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.95)",
          pointerEvents: "none",
          opacity: disabled ? 0.35 : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {placeholder}
      </div>
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { onChange(e.target.value); e.currentTarget.value = ""; }}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        <option value="" disabled hidden></option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={o.style}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Swatch({
  colors, onPick, disabled, title, icon,
}: {
  colors: string[]; onPick: (c: string) => void; disabled?: boolean; title?: string; icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" style={{ flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 30, minWidth: 30, padding: "0 7px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, border: "none", background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          color: "rgba(255,255,255,0.9)", opacity: disabled ? 0.35 : 1,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {icon}
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-40 p-2 rounded-lg border border-border bg-popover shadow-pop"
            style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 4, width: 240 }}>
            {colors.map((c, i) => (
              <button key={`${c}-${i}`} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(c); setOpen(false); }}
                className="h-5 w-5 rounded-sm border border-border/60 hover:scale-110 transition"
                style={{ background: c === "transparent" ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0/8px 8px" : c }}
                title={c}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GradientPicker({
  onPick, disabled, title, icon,
}: {
  onPick: (g: string) => void; disabled?: boolean; title?: string; icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" style={{ flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        style={{
          height: 30, minWidth: 30, padding: "0 7px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, border: "none", background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          color: "rgba(255,255,255,0.9)", opacity: disabled ? 0.35 : 1,
          transition: "background 0.12s",
        }}
        onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {icon}
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-40 p-2 rounded-lg border border-border bg-popover shadow-pop w-56 space-y-1">
            {GRADIENTS.map((g) => (
              <button key={g.l} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(g.v); setOpen(false); }}
                className="w-full flex items-center gap-2 p-1 rounded hover:bg-muted text-left">
                <span className="h-5 w-12 rounded border border-border/40" style={{ backgroundImage: g.v }} />
                <span className="text-xs font-medium">{g.l}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
