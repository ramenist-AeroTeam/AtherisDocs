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
const TEXT_COLORS = ["#111827", "#6b7280", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
const HIGHLIGHT_COLORS = ["transparent", "#fde68a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#ddd6fe", "#fecaca"];

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
