import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, GripVertical, Settings2, Sparkles, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import {
  TabBlock, InventoryItem, GardenPlant, TabButton,
  INVENTORY_CATEGORIES, BUTTON_COLORS, buttonColorCls, gradientStyle, GradientMode,
} from "./types";

type Profile = {
  user_id: string; display_name: string; noodles: number; lumina: number; level: number;
};

export function PropertyBlock(props: {
  block: TabBlock;
  mine: boolean;
  userId: string;
  ownerProfile?: Profile;
  inventory: InventoryItem[];
  plants: GardenPlant[];
  buttons: TabButton[];
  meProfile: Profile;
}) {
  const { block, mine } = props;
  const sortable = useSortable({ id: block.id, disabled: !mine });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    ...gradientStyle(block),
  };
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div ref={sortable.setNodeRef} style={style}
      className="rounded-lg border bg-card p-4 group relative">
      {mine && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Popover open={styleOpen} onOpenChange={setStyleOpen}>
            <PopoverTrigger asChild>
              <button className="h-7 w-7 grid place-items-center rounded hover:bg-muted text-muted-foreground" title="Style">
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <BlockStyleEditor block={block} onClose={() => setStyleOpen(false)} />
            </PopoverContent>
          </Popover>
          <button onClick={async () => {
            if (!confirm("Delete this block?")) return;
            await supabase.from("tab_blocks").delete().eq("id", block.id);
          }} className="h-7 w-7 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button {...sortable.attributes} {...sortable.listeners}
            className="h-7 w-7 grid place-items-center rounded hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      )}
      <BlockBody {...props} />
    </div>
  );
}

function BlockBody(props: React.ComponentProps<typeof PropertyBlock>) {
  const { block } = props;
  switch (block.block_type) {
    case "header": return <HeaderBlock {...props} />;
    case "stats": return <StatsBlock {...props} />;
    case "currency": return <CurrencyBlock {...props} />;
    case "inventory": return <InventoryBlock {...props} />;
    case "garden": return <GardenBlock {...props} />;
    case "buttons": return <ButtonsBlock {...props} />;
    case "timer": return <TimerBlock {...props} />;
    case "text": default: return <TextBlock {...props} />;
  }
}

function BlockStyleEditor({ block, onClose }: { block: TabBlock; onClose: () => void }) {
  const [mode, setMode] = useState<GradientMode>(block.gradient_mode);
  const [from, setFrom] = useState(block.gradient_from || "#a78bfa");
  const [to, setTo] = useState(block.gradient_to || "#f0abfc");
  const save = async () => {
    await supabase.from("tab_blocks").update({
      gradient_mode: mode, gradient_from: mode === "custom" ? from : "", gradient_to: mode === "custom" ? to : "",
    }).eq("id", block.id);
    onClose();
  };
  return (
    <div className="space-y-3">
      <Label className="text-xs">Background</Label>
      <Select value={mode} onValueChange={(v) => setMode(v as GradientMode)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="auto">Auto shimmer</SelectItem>
          <SelectItem value="custom">Custom gradient</SelectItem>
        </SelectContent>
      </Select>
      {mode === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">From</Label><Input type="color" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 p-1" /></div>
          <div><Label className="text-xs">To</Label><Input type="color" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 p-1" /></div>
        </div>
      )}
      <Button size="sm" onClick={save} className="w-full">Apply</Button>
    </div>
  );
}

function saveData(blockId: string, data: any) {
  return supabase.from("tab_blocks").update({ data }).eq("id", blockId);
}

function HeaderBlock({ block, mine }: { block: TabBlock; mine: boolean }) {
  const [title, setTitle] = useState<string>(block.data?.title || "Welcome to your property!");
  const [subtitle, setSubtitle] = useState<string>(block.data?.subtitle || "This is your own mini world! Have fun editing.");
  useEffect(() => { setTitle(block.data?.title || "Welcome to your property!"); setSubtitle(block.data?.subtitle || ""); }, [block.id]);
  const save = () => saveData(block.id, { ...block.data, title, subtitle });
  return (
    <div className="space-y-1">
      {mine ? (
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save}
          className="text-2xl font-bold h-auto py-1 border-0 bg-transparent px-0 focus-visible:ring-0" />
      ) : (
        <h2 className="text-2xl font-bold">{title}</h2>
      )}
      {mine ? (
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} onBlur={save}
          className="text-sm text-muted-foreground border-0 bg-transparent px-0 focus-visible:ring-0" />
      ) : (
        subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function TextBlock({ block, mine }: { block: TabBlock; mine: boolean }) {
  const [text, setText] = useState<string>(block.data?.text || "");
  useEffect(() => { setText(block.data?.text || ""); }, [block.id]);
  return mine ? (
    <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => saveData(block.id, { ...block.data, text })}
      placeholder="Write something…"
      className="w-full min-h-[80px] bg-transparent outline-none resize-y text-sm" />
  ) : (
    <p className="whitespace-pre-wrap text-sm">{text || <span className="text-muted-foreground italic">empty</span>}</p>
  );
}

function StatsBlock({ block, mine, ownerProfile }: { block: TabBlock; mine: boolean; ownerProfile?: Profile }) {
  const [titleLabel, setTitleLabel] = useState<string>(block.data?.title || "");
  const [job, setJob] = useState<string>(block.data?.job || "");
  useEffect(() => { setTitleLabel(block.data?.title || ""); setJob(block.data?.job || ""); }, [block.id]);
  const save = () => saveData(block.id, { ...block.data, title: titleLabel, job });
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-1.5">📛 Profile</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <Label className="text-xs text-muted-foreground">🏷️ Title</Label>
          {mine ? <Input value={titleLabel} onChange={(e) => setTitleLabel(e.target.value)} onBlur={save} placeholder="Apprentice" className="h-8" />
            : <div className="px-2 py-1 rounded bg-muted/40">{titleLabel || "—"}</div>}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">💼 Job</Label>
          {mine ? <Input value={job} onChange={(e) => setJob(e.target.value)} onBlur={save} placeholder="Farmer" className="h-8" />
            : <div className="px-2 py-1 rounded bg-muted/40">{job || "—"}</div>}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">⭐ Level</Label>
          <div className="px-2 py-1 rounded bg-muted/40 font-mono-d">{ownerProfile?.level ?? "—"}</div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">👤 Name</Label>
          <div className="px-2 py-1 rounded bg-muted/40">{ownerProfile?.display_name ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

function CurrencyBlock({ ownerProfile }: { ownerProfile?: Profile }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-1.5">🪙 Currency</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border p-3 bg-[hsl(195_80%_95%)] text-[hsl(200_60%_25%)]">
          <div className="text-xs opacity-70">❇️ Lumina</div>
          <div className="text-2xl font-bold tabular-nums">{(ownerProfile?.lumina ?? 0).toLocaleString()}</div>
        </div>
        <div className="rounded-md border p-3 bg-[hsl(38_92%_95%)] text-[hsl(30_70%_25%)]">
          <div className="text-xs opacity-70">🍜 Noodles</div>
          <div className="text-2xl font-bold tabular-nums">{(ownerProfile?.noodles ?? 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function InventoryBlock({ block, mine, userId, inventory }: {
  block: TabBlock; mine: boolean; userId: string; inventory: InventoryItem[];
}) {
  const items = inventory.filter((i) => i.block_id === block.id);
  const [addCat, setAddCat] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-1.5">🛒 Inventory</h3>
      <div className="space-y-2">
        {INVENTORY_CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat.key);
          return (
            <div key={cat.key} className="border rounded-md p-2 bg-background/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{cat.emoji} {cat.label}</span>
                {mine && (
                  <button onClick={() => setAddCat(cat.key)} className="text-xs text-primary hover:underline">
                    + add
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {catItems.length === 0 && <span className="text-xs text-muted-foreground italic">(empty)</span>}
                {catItems.map((it) => (
                  <div key={it.id} className="flex items-center gap-1 px-2 py-0.5 rounded border bg-card text-xs">
                    <span>{it.emoji}</span>
                    <span>{it.name}</span>
                    <span className="text-muted-foreground">×{it.quantity}</span>
                    {mine && (
                      <button onClick={() => supabase.from("inventory_items").delete().eq("id", it.id)}
                        className="text-muted-foreground hover:text-destructive ml-0.5"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={!!addCat} onOpenChange={(o) => !o && setAddCat(null)}>
        <DialogContent>
          {addCat && <AddItemDialog blockId={block.id} userId={userId} category={addCat} onDone={() => setAddCat(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddItemDialog({ blockId, userId, category, onDone }: {
  blockId: string; userId: string; category: string; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [qty, setQty] = useState(1);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const cat = INVENTORY_CATEGORIES.find((c) => c.key === category);
  const save = async () => {
    if (!name.trim()) return toast.error("name required");
    const { error } = await supabase.from("inventory_items").insert({
      block_id: blockId, user_id: userId, category, name, emoji, quantity: qty, position: 0,
    });
    if (error) toast.error(error.message); else onDone();
  };
  return (
    <>
      <DialogHeader><DialogTitle>Add to {cat?.label}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button className="text-2xl h-10 w-10 rounded-md border hover:bg-muted">{emoji}</button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <EmojiPicker onEmojiClick={(e) => { setEmoji(e.emoji); setEmojiOpen(false); }} width={300} height={340} />
            </PopoverContent>
          </Popover>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="flex-1" />
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="w-20" />
        </div>
      </div>
      <DialogFooter><Button onClick={save}>Add</Button></DialogFooter>
    </>
  );
}

function GardenBlock({ block, mine, userId, plants }: {
  block: TabBlock; mine: boolean; userId: string; plants: GardenPlant[];
}) {
  const myPlants = plants.filter((p) => p.block_id === block.id);
  const equipped = myPlants.find((p) => p.is_equipped) || myPlants[0];
  const addPlant = async () => {
    await supabase.from("garden_plants").insert({ block_id: block.id, user_id: userId, name: "New Plant", emoji: "🌱" });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">🌼 My Garden!</h3>
        {mine && <Button size="sm" variant="outline" onClick={addPlant}><Plus className="h-3 w-3 mr-1" /> plant</Button>}
      </div>
      {equipped && (
        <div className="rounded-md border p-3 bg-background/50">
          <div className="text-xs text-muted-foreground">Plant Equipped</div>
          <div className="text-3xl">{equipped.emoji}</div>
          <div className="font-medium">{equipped.plant_type}</div>
        </div>
      )}
      <div className="space-y-2">
        <div className="text-xs uppercase text-muted-foreground">All Plants</div>
        {myPlants.length === 0 && <div className="text-xs text-muted-foreground italic">no plants yet</div>}
        {myPlants.map((p) => <PlantRow key={p.id} plant={p} mine={mine} />)}
      </div>
    </div>
  );
}

function PlantRow({ plant, mine }: { plant: GardenPlant; mine: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plant);
  useEffect(() => setDraft(plant), [plant]);
  const save = async () => {
    await supabase.from("garden_plants").update({
      name: draft.name, emoji: draft.emoji, plant_type: draft.plant_type,
      level: draft.level, food: draft.food, water: draft.water,
      happiness: draft.happiness, noodles_per_hour: draft.noodles_per_hour,
      is_equipped: draft.is_equipped,
    }).eq("id", plant.id);
    setEditing(false);
  };
  return (
    <div className="rounded border p-2 bg-background/30">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{plant.emoji}</span>
        <div className="flex-1 text-sm">
          <div className="font-medium">{plant.name}</div>
          <div className="text-xs text-muted-foreground">{plant.plant_type} · Lvl {plant.level}</div>
        </div>
        {mine && (
          <>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => supabase.from("garden_plants").delete().eq("id", plant.id)}
              className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1 mt-1.5 text-[11px]">
        <div className="px-1.5 py-0.5 rounded bg-[hsl(38_80%_92%)] text-[hsl(30_60%_25%)]">🍎 {plant.food}</div>
        <div className="px-1.5 py-0.5 rounded bg-[hsl(195_80%_92%)] text-[hsl(200_60%_25%)]">💧 {plant.water}</div>
        <div className="px-1.5 py-0.5 rounded bg-[hsl(330_80%_94%)] text-[hsl(330_60%_30%)]">😊 {plant.happiness}</div>
        <div className="px-1.5 py-0.5 rounded bg-[hsl(38_92%_92%)] text-[hsl(30_60%_25%)]">🍜/h {plant.noodles_per_hour}</div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Plant</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-4 gap-2">
              <Input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🌱" />
              <Input className="col-span-3" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
            </div>
            <Input value={draft.plant_type} onChange={(e) => setDraft({ ...draft, plant_type: e.target.value })} placeholder="Type" />
            <div className="grid grid-cols-2 gap-2">
              {(["level", "food", "water", "happiness", "noodles_per_hour"] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs">{k}</Label>
                  <Input type="number" value={draft[k] as number}
                    onChange={(e) => setDraft({ ...draft, [k]: parseInt(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={draft.is_equipped}
                onChange={(e) => setDraft({ ...draft, is_equipped: e.target.checked })} />
              Equipped
            </label>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ButtonsBlock({ block, mine, userId, buttons, meProfile }: {
  block: TabBlock; mine: boolean; userId: string; buttons: TabButton[]; meProfile: Profile;
}) {
  const blockButtons = buttons.filter((b) => b.block_id === block.id);
  const [open, setOpen] = useState(false);

  const run = async (b: TabButton) => {
    if (b.cost_currency === "noodles" && b.cost_amount > 0) {
      if (meProfile.noodles < b.cost_amount) return toast.error(`need ${b.cost_amount} 🍜`);
      await supabase.from("profiles").update({ noodles: meProfile.noodles - b.cost_amount }).eq("user_id", userId);
    } else if (b.cost_currency === "lumina" && b.cost_amount > 0) {
      if (meProfile.lumina < b.cost_amount) return toast.error(`need ${b.cost_amount} ✦`);
      await supabase.from("profiles").update({ lumina: meProfile.lumina - b.cost_amount }).eq("user_id", userId);
    }
    if (b.action_type === "message") toast(b.action_payload || b.label);
    else if (b.action_type === "reward") {
      const n = parseInt(b.action_payload, 10) || 1;
      await supabase.from("profiles").update({ noodles: meProfile.noodles + n - (b.cost_currency === "noodles" ? b.cost_amount : 0) }).eq("user_id", userId);
      toast.success(`+${n} 🍜`);
    } else if (b.action_type === "js" && mine) {
      try { new Function(b.action_payload)(); } catch (e: any) { toast.error(e.message); }
    }
    if (b.reward_item) toast.success(`got ${b.reward_item}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">🎛️ Buttons</h3>
        {mine && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" /> button</Button>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {blockButtons.length === 0 && <span className="text-xs text-muted-foreground">no buttons</span>}
        {blockButtons.map((b) => (
          <div key={b.id} className="flex items-center gap-0.5">
            <button onClick={() => run(b)}
              className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${buttonColorCls(b.color)}`}>
              {b.label}
              {b.cost_amount > 0 && <span className="ml-1 opacity-80 text-xs">({b.cost_amount}{b.cost_currency === "noodles" ? "🍜" : "✦"})</span>}
            </button>
            {mine && (
              <button onClick={() => supabase.from("tab_buttons").delete().eq("id", b.id)}
                className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
            )}
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <AddButton blockId={block.id} tabId={block.tab_id} userId={userId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddButton({ blockId, tabId, userId, onDone }: {
  blockId: string; tabId: string; userId: string; onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("primary");
  const [actionType, setActionType] = useState("message");
  const [payload, setPayload] = useState("");
  const [costCurrency, setCostCurrency] = useState("none");
  const [costAmount, setCostAmount] = useState(0);
  const [rewardItem, setRewardItem] = useState("");
  const save = async () => {
    if (!label.trim()) return toast.error("label required");
    const { error } = await supabase.from("tab_buttons").insert({
      tab_id: tabId, block_id: blockId, user_id: userId, label, color,
      action_type: actionType, action_payload: payload,
      cost_currency: costCurrency, cost_amount: costAmount, reward_item: rewardItem, position: 0,
    });
    if (error) toast.error(error.message); else onDone();
  };
  return (
    <>
      <DialogHeader><DialogTitle>New Button</DialogTitle></DialogHeader>
      <div className="space-y-2 text-sm">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
        <div>
          <Label className="text-xs">Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUTTON_COLORS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Action</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="message">Show toast</SelectItem>
              <SelectItem value="reward">Give noodles to clicker</SelectItem>
              <SelectItem value="js">Run JS (yours only)</SelectItem>
              <SelectItem value="none">No action</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {actionType !== "none" && (
          <Input value={payload} onChange={(e) => setPayload(e.target.value)}
            placeholder={actionType === "reward" ? "Amount" : actionType === "js" ? "JS code" : "Message"} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Cost</Label>
            <Select value={costCurrency} onValueChange={setCostCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Free</SelectItem>
                <SelectItem value="noodles">Noodles 🍜</SelectItem>
                <SelectItem value="lumina">Lumina ✦</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {costCurrency !== "none" && (
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={costAmount} onChange={(e) => setCostAmount(parseInt(e.target.value) || 0)} />
            </div>
          )}
        </div>
        <Input value={rewardItem} onChange={(e) => setRewardItem(e.target.value)} placeholder="Reward item label (optional)" />
      </div>
      <DialogFooter><Button onClick={save}>Add</Button></DialogFooter>
    </>
  );
}

function TimerBlock({ block, mine }: { block: TabBlock; mine: boolean }) {
  const [label, setLabel] = useState<string>(block.data?.label || "Timer");
  const [target, setTarget] = useState<string>(block.data?.target || new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setLabel(block.data?.label || "Timer"); setTarget(block.data?.target || target); }, [block.id]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const remaining = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60), s = remaining % 60;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">⏱️ {label}</span>
        {mine && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-6 w-6 grid place-items-center rounded hover:bg-muted text-muted-foreground"><Settings2 className="h-3.5 w-3.5" /></button>
            </PopoverTrigger>
            <PopoverContent className="space-y-2">
              <Input value={label} onChange={(e) => setLabel(e.target.value)}
                onBlur={() => saveData(block.id, { ...block.data, label, target })} />
              <Input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)}
                onBlur={() => saveData(block.id, { ...block.data, label, target })} />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="text-3xl font-mono-d tabular-nums text-center py-2">
        {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </div>
    </div>
  );
}
