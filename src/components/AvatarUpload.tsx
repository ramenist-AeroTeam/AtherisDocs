import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, X, Loader2 } from "lucide-react";
import { avatarColor, avatarFg, initials } from "@/components/CornerChat";

export function AvatarUpload({
  userId, displayName, avatarUrl, onChange,
}: {
  userId: string; displayName: string; avatarUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
      onChange(url);
      setOpen(false);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
      onChange(null);
      setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 w-8 rounded-full overflow-hidden grid place-items-center text-xs font-bold ring-2 ring-transparent hover:ring-primary/40 transition"
          style={!avatarUrl ? { background: avatarColor(displayName), color: avatarFg(displayName) } : undefined}
          title="Change profile picture">
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            : initials(displayName)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="text-xs font-medium mb-2">Profile picture</div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-14 w-14 rounded-full overflow-hidden grid place-items-center text-base font-bold"
            style={!avatarUrl ? { background: avatarColor(displayName), color: avatarFg(displayName) } : undefined}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              : initials(displayName)}
          </div>
          <div className="text-xs text-muted-foreground flex-1">
            PNG/JPG up to a few MB. Visible to everyone.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
          </Button>
          {avatarUrl && (
            <Button size="sm" variant="outline" onClick={remove} disabled={busy}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
