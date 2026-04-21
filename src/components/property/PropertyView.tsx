import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Eye, EyeOff } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { TabBlock, BlockType, InventoryItem, GardenPlant, TabButton } from "./types";
import { PropertyBlock } from "./PropertyBlock";

type Profile = { user_id: string; display_name: string; noodles: number; lumina: number; level: number };
type UserTab = { id: string; user_id: string; name: string; emoji: string; is_public: boolean };

const BLOCK_OPTIONS: { type: BlockType; label: string; emoji: string; defaultData: any }[] = [
  { type: "header", label: "Header", emoji: "🏷️", defaultData: { title: "My Property", subtitle: "" } },
  { type: "stats", label: "Profile/Stats", emoji: "📛", defaultData: { title: "", job: "" } },
  { type: "currency", label: "Currency", emoji: "🪙", defaultData: {} },
  { type: "inventory", label: "Inventory", emoji: "🛒", defaultData: {} },
  { type: "garden", label: "Garden", emoji: "🌼", defaultData: {} },
  { type: "buttons", label: "Buttons", emoji: "🎛️", defaultData: {} },
  { type: "timer", label: "Timer", emoji: "⏱️", defaultData: { label: "Timer", target: new Date(Date.now() + 3600_000).toISOString().slice(0, 16) } },
  { type: "text", label: "Text", emoji: "📝", defaultData: { text: "" } },
];

export function PropertyView({
  tab, mine, userId, ownerProfile, meProfile, blocks, inventory, plants, buttons,
  onRename, onEmoji, onTogglePublic,
}: {
  tab: UserTab;
  mine: boolean;
  userId: string;
  ownerProfile?: Profile;
  meProfile: Profile;
  blocks: TabBlock[];
  inventory: InventoryItem[];
  plants: GardenPlant[];
  buttons: TabButton[];
  onRename: (n: string) => void;
  onEmoji: (e: string) => void;
  onTogglePublic: (v: boolean) => void;
}) {
  const myBlocks = blocks.filter((b) => b.tab_id === tab.id).sort((a, b) => a.position - b.position);
  const [name, setName] = useState(tab.name);
  const [emojiOpen, setEmojiOpen] = useState(false);
  useEffect(() => setName(tab.name), [tab.id, tab.name]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addBlock = async (opt: typeof BLOCK_OPTIONS[number]) => {
    const maxPos = myBlocks.reduce((m, b) => Math.max(m, b.position), -1);
    const { error } = await supabase.from("tab_blocks").insert({
      tab_id: tab.id, user_id: userId, block_type: opt.type, position: maxPos + 1, data: opt.defaultData,
    });
    if (error) toast.error(error.message);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = myBlocks.findIndex((b) => b.id === e.active.id);
    const newIdx = myBlocks.findIndex((b) => b.id === e.over!.id);
    const reordered = arrayMove(myBlocks, oldIdx, newIdx);
    await Promise.all(reordered.map((b, i) =>
      b.position === i ? null : supabase.from("tab_blocks").update({ position: i }).eq("id", b.id)
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {mine ? (
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button className="text-3xl h-12 w-12 rounded-md border hover:bg-muted">{tab.emoji}</button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto">
              <EmojiPicker onEmojiClick={(e) => { onEmoji(e.emoji); setEmojiOpen(false); }} width={320} height={360} />
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-3xl">{tab.emoji}</span>
        )}
        {mine ? (
          <Input value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== tab.name && onRename(name)}
            className="text-xl font-semibold h-12 max-w-md" />
        ) : (
          <h1 className="text-xl font-semibold">{tab.name}</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          {mine && (
            <label className="flex items-center gap-2 text-sm border rounded-md px-2.5 h-9">
              {tab.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="text-muted-foreground">{tab.is_public ? "public" : "private"}</span>
              <Switch checked={tab.is_public} onCheckedChange={onTogglePublic} />
            </label>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={myBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {myBlocks.map((b) => (
              <PropertyBlock key={b.id} block={b} mine={mine} userId={userId}
                ownerProfile={ownerProfile} meProfile={meProfile}
                inventory={inventory} plants={plants} buttons={buttons} />
            ))}
            {myBlocks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">{mine ? "Add your first block ↓" : "This property is empty"}</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {mine && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" /> add block</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {BLOCK_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.type} onClick={() => addBlock(opt)}>
                <span className="mr-2">{opt.emoji}</span> {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
