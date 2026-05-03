import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gamepad2, Check, X, Clock } from "lucide-react";

type AeroRequest = {
  id: string; user_id: string; aero_username: string; pets_text: string;
  role_request: string; notes: string; status: string;
  created_at: string;
};

export function AeroButton({ userId, isStaff }: { userId: string; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<AeroRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const q = isStaff
        ? supabase.from("aero_requests").select("*").order("created_at", { ascending: false })
        : supabase.from("aero_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const { data } = await q;
      setRequests((data as AeroRequest[]) || []);
      setPendingCount(((data as AeroRequest[]) || []).filter((r) => r.status === "pending").length);
    };
    load();
    const ch = supabase.channel("aero-req")
      .on("postgres_changes", { event: "*", schema: "public", table: "aero_requests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, isStaff]);

  const myReq = requests.find((r) => r.user_id === userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 relative">
          <Gamepad2 className="h-4 w-4" /> Played Aero?
          {isStaff && pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 grid place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            {isStaff ? "Aero Migration Requests" : "Reclaim your Aero stuff"}
          </DialogTitle>
        </DialogHeader>
        {isStaff ? (
          <StaffPanel requests={requests} userId={userId} />
        ) : myReq ? (
          <MyRequestPanel req={myReq} />
        ) : (
          <NewRequestForm userId={userId} onDone={() => {}} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewRequestForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [aero, setAero] = useState("");
  const [pets, setPets] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const submit = async () => {
    if (!aero.trim()) return toast.error("Aero username required");
    const { error } = await supabase.from("aero_requests").insert({
      user_id: userId, aero_username: aero, pets_text: pets, role_request: role, notes,
    });
    if (error) return toast.error(error.message);
    toast.success("Submitted! An owner will review it.");
    onDone();
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Played Aero before? Tell us your old username, the pets you owned, and what role you had — an owner will verify and restore them.
      </p>
      <div>
        <Label className="text-xs">Aero username</Label>
        <Input value={aero} onChange={(e) => setAero(e.target.value)} placeholder="e.g. NoodleKing42" />
      </div>
      <div>
        <Label className="text-xs">Pets you want back (one per line, with details)</Label>
        <Textarea value={pets} onChange={(e) => setPets(e.target.value)} rows={4}
          placeholder={"e.g.\nDragon — level 12, equipped\nKitty — level 5"} />
      </div>
      <div>
        <Label className="text-xs">Role you had (optional)</Label>
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Beta Tester / Mod" />
      </div>
      <div>
        <Label className="text-xs">Notes (proof, screenshots link, etc.)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <DialogFooter><Button onClick={submit}>Submit request</Button></DialogFooter>
    </div>
  );
}

function MyRequestPanel({ req }: { req: AeroRequest }) {
  const cls = req.status === "pending" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : req.status === "approved" ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cls}>
          {req.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
          {req.status === "approved" && <Check className="h-3 w-3 mr-1" />}
          {req.status === "rejected" && <X className="h-3 w-3 mr-1" />}
          {req.status}
        </Badge>
        <span className="text-xs text-muted-foreground">submitted {new Date(req.created_at).toLocaleDateString()}</span>
      </div>
      <Field label="Aero username" value={req.aero_username} />
      <Field label="Pets" value={req.pets_text} multi />
      <Field label="Role" value={req.role_request || "—"} />
      <Field label="Notes" value={req.notes || "—"} multi />
      {req.status === "pending" && (
        <p className="text-xs text-muted-foreground">⏳ Waiting for an owner to review.</p>
      )}
    </div>
  );
}

function Field({ label, value, multi }: { label: string; value: string; multi?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className={`text-sm border rounded-md p-2 bg-muted/30 ${multi ? "whitespace-pre-wrap" : ""}`}>{value}</div>
    </div>
  );
}

function StaffPanel({ requests, userId }: { requests: AeroRequest[]; userId: string }) {
  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("aero_requests").update({
      status, processed_by: userId, processed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(status);
  };
  if (!requests.length) return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{r.aero_username || "(no username)"}</span>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            {r.pets_text && <div className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-2"><b>Pets:</b> {r.pets_text}</div>}
            {r.role_request && <div className="text-xs"><b>Role:</b> {r.role_request}</div>}
            {r.notes && <div className="text-xs text-muted-foreground"><b>Notes:</b> {r.notes}</div>}
            {r.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide(r.id, "approved")}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => decide(r.id, "rejected")}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
