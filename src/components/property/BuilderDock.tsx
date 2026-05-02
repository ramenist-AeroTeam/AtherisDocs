import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ShoppingCart, MousePointerClick, Code2, Timer as TimerIcon, Type, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { TabBlock, BlockType } from "./types";

type Preset = {
  key: string;
  label: string;
  hint: string;
  icon: typeof ShoppingCart;
  /** color theme */
  cls: string;
  /** what to drop in */
  onDrop: (tabId: string, userId: string, position: number) => Promise<void>;
};

async function addBlock(tabId: string, userId: string, type: BlockType, position: number, data: any) {
  const { error } = await supabase.from("tab_blocks").insert({
    tab_id: tabId, user_id: userId, block_type: type, position, data,
    gradient_mode: "none", gradient_from: "", gradient_to: "",
  });
  if (error) toast.error(error.message);
}

async function addButtonBlockWithButton(
  tabId: string, userId: string, position: number,
  btn: { label: string; color: string; cost_currency: string; cost_amount: number; action_type: string; action_payload: string },
) {
  const { data, error } = await supabase.from("tab_blocks").insert({
    tab_id: tabId, user_id: userId, block_type: "buttons", position, data: {},
    gradient_mode: "none", gradient_from: "", gradient_to: "",
  }).select().single();
  if (error || !data) return toast.error(error?.message || "failed");
  await supabase.from("tab_buttons").insert({
    tab_id: tabId, block_id: (data as any).id, user_id: userId,
    label: btn.label, color: btn.color, action_type: btn.action_type, action_payload: btn.action_payload,
    cost_currency: btn.cost_currency, cost_amount: btn.cost_amount, reward_item: "", position: 0,
  });
}

const PRESETS: Preset[] = [
  {
    key: "purchase",
    label: "Purchase Button",
    hint: "1000 🍜",
    icon: ShoppingCart,
    cls: "from-[hsl(142_70%_55%)] to-[hsl(142_70%_42%)] text-white",
    onDrop: (tabId, userId, position) => addButtonBlockWithButton(tabId, userId, position, {
      label: "Purchase", color: "success", cost_currency: "noodles", cost_amount: 1000,
      action_type: "message", action_payload: "Purchased!",
    }),
  },
  {
    key: "regular",
    label: "Regular Button",
    hint: "Ur button here!",
    icon: MousePointerClick,
    cls: "from-[hsl(142_70%_55%)] to-[hsl(142_70%_42%)] text-white",
    onDrop: (tabId, userId, position) => addButtonBlockWithButton(tabId, userId, position, {
      label: "Click me", color: "success", cost_currency: "none", cost_amount: 0,
      action_type: "message", action_payload: "Hi!",
    }),
  },
  {
    key: "html",
    label: "HTML Window",
    hint: "Sandbox iframe",
    icon: Code2,
    cls: "from-muted to-muted text-foreground border border-dashed",
    onDrop: (tabId, userId, position) => addBlock(tabId, userId, "text", position,
      { text: "<-- paste HTML/text here -->" }),
  },
  {
    key: "timer",
    label: "Timer",
    hint: "Countdown",
    icon: TimerIcon,
    cls: "from-[hsl(195_90%_55%)] to-[hsl(195_90%_42%)] text-white",
    onDrop: (tabId, userId, position) => addBlock(tabId, userId, "timer", position,
      { label: "Event in", target: new Date(Date.now() + 3600_000).toISOString().slice(0, 16) }),
  },
  {
    key: "text",
    label: "Text",
    hint: "Notes",
    icon: Type,
    cls: "from-[hsl(280_80%_60%)] to-[hsl(280_80%_48%)] text-white",
    onDrop: (tabId, userId, position) => addBlock(tabId, userId, "text", position, { text: "" }),
  },
  {
    key: "header",
    label: "Banner Header",
    hint: "Title + sub",
    icon: ImageIcon,
    cls: "from-[hsl(38_92%_55%)] to-[hsl(38_92%_42%)] text-[hsl(30_60%_12%)]",
    onDrop: (tabId, userId, position) => addBlock(tabId, userId, "header", position,
      { title: "New Banner", subtitle: "edit me" }),
  },
];

export function BuilderDock({
  tabId, userId, blocks,
}: { tabId: string; userId: string; blocks: TabBlock[] }) {
  const [open, setOpen] = useState(true);

  const drop = async (p: Preset) => {
    const tabBlocks = blocks.filter((b) => b.tab_id === tabId);
    const maxPos = tabBlocks.reduce((m, b) => Math.max(m, b.position), -1);
    await p.onDrop(tabId, userId, maxPos + 1);
    toast.success(`${p.label} added`);
  };

  return (
    <div className={`fixed right-4 bottom-4 z-40 transition-all ${open ? "w-64" : "w-12"}`}>
      <div className="rounded-xl border bg-card shadow-pop overflow-hidden">
        <div className="flex items-center gap-2 px-3 h-10 border-b bg-muted/40">
          {open && <span className="font-semibold text-sm">Builder</span>}
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-auto h-7 w-7 grid place-items-center rounded hover:bg-background/60 text-muted-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-[11px] text-muted-foreground -mt-1 mb-1">
              Click a piece to drop it onto your property.
            </p>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => drop(p)}
                className="group w-full text-left rounded-lg border p-2 hover:border-primary/40 hover:shadow transition"
              >
                <div className={`h-9 rounded-md grid place-items-center font-semibold text-sm bg-gradient-to-br ${p.cls}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <p.icon className="h-4 w-4" /> {p.hint}
                  </span>
                </div>
                <div className="mt-1.5 text-xs font-medium text-center text-muted-foreground group-hover:text-foreground">
                  {p.label}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
