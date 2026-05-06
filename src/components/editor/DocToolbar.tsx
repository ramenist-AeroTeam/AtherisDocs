import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Undo2, Redo2, RemoveFormatting,
  Heading1, Heading2, Pilcrow, Highlighter, Type,
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
    <div data-tour="format" className="sticky top-14 z-20 border-b bg-card/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-3 py-1.5 flex flex-wrap items-center gap-0.5">
        <Btn onClick={() => cmd("undo")} title="Undo"><Undo2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => cmd("redo")} title="Redo"><Redo2 className="h-4 w-4" /></Btn>
        <Sep />

        <Select
          disabled={disabled}
          ariaLabel="Font"
          value=""
          onChange={(v) => cmd("fontName", v)}
          options={FONTS.map((f) => ({ value: f.v, label: f.l, style: { fontFamily: f.v } }))}
          placeholder={<><Type className="h-3.5 w-3.5" /> Font</>}
          width={130}
        />
        <Select
          disabled={disabled}
          ariaLabel="Size"
          value=""
          onChange={(v) => cmd("fontSize", v)}
          options={SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
          placeholder={<>{SIZE_LABELS["3"]}</>}
          width={64}
        />
        <Sep />

        <Btn active={sel.bold} disabled={disabled} onClick={() => cmd("bold")} title="Bold (⌘B)"><Bold className="h-4 w-4" /></Btn>
        <Btn active={sel.italic} disabled={disabled} onClick={() => cmd("italic")} title="Italic (⌘I)"><Italic className="h-4 w-4" /></Btn>
        <Btn active={sel.underline} disabled={disabled} onClick={() => cmd("underline")} title="Underline (⌘U)"><Underline className="h-4 w-4" /></Btn>
        <Btn active={sel.strike} disabled={disabled} onClick={() => cmd("strikeThrough")} title="Strike"><Strikethrough className="h-4 w-4" /></Btn>
        <Sep />

        <Swatch disabled={disabled} colors={TEXT_COLORS} onPick={(c) => cmd("foreColor", c)} title="Text color"
          icon={<span className="font-bold text-sm leading-none">A</span>} />
        <Swatch disabled={disabled} colors={HIGHLIGHT_COLORS} onPick={(c) => cmd("hiliteColor", c)} title="Highlight"
          icon={<Highlighter className="h-4 w-4" />} />
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

        <div className="ml-auto text-[11px] text-muted-foreground pr-1">
          {disabled ? "select text to format" : "ready"}
        </div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, active, disabled, title }: { children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 grid place-items-center rounded-md text-sm transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
      } ${active ? "bg-primary/15 text-primary" : "text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="h-5 w-px bg-border mx-1" />;
}

function Select({
  options, onChange, disabled, placeholder, width = 110, ariaLabel,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
  options: { value: string; label: string; style?: React.CSSProperties }[];
  placeholder: React.ReactNode; width?: number; ariaLabel?: string;
}) {
  return (
    <div className="relative" style={{ width }}>
      <div
        className={`h-8 w-full inline-flex items-center gap-1 rounded-md px-2 text-xs border bg-card pointer-events-none ${
          disabled ? "opacity-40" : ""
        }`}
      >
        {placeholder}
      </div>
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { onChange(e.target.value); e.currentTarget.value = ""; }}
        className={`absolute inset-0 opacity-0 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <option value="" disabled hidden></option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={o.style}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Swatch({ colors, onPick, disabled, title, icon }: { colors: string[]; onPick: (c: string) => void; disabled?: boolean; title?: string; icon: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={`h-8 w-8 grid place-items-center rounded-md transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
        }`}
      >
        {icon}
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-9 left-0 z-40 grid grid-cols-4 gap-1 p-2 rounded-md border bg-popover shadow-pop">
            {colors.map((c) => (
              <button key={c} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(c); setOpen(false); }}
                className="h-6 w-6 rounded border"
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
