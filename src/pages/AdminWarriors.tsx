import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import type { Template } from "@/components/arena/types";

type Draft = Partial<Template> & { id?: string };

const BLANK: Draft = {
  name: "New Warrior", emoji: "🗡️", rarity: "common", tagline: "",
  icon_url: "", battle_sprite_url: "", win_gif_url: "", lose_gif_url: "", draw_gif_url: "",
  main_attack_name: "Strike", main_dmg_base: 300, main_dmg_max: 5000, main_cooldown_ms: 900, main_range: 140,
  mega_attack_name: "Mega", mega_dmg_base: 1000, mega_dmg_max: 10000, mega_cooldown_ms: 6000, mega_range: 220,
  hp_base: 4000, hp_max: 10500, speed: 220, max_level: 12, is_active: true,
};

export default function AdminWarriors() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav("/auth", { replace: true }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", s.session.user.id);
      const isStaff = (roles || []).some((r: any) => r.role === "owner" || r.role === "co_owner");
      setAllowed(isStaff);
      if (isStaff) reload();
    })();
  }, [nav]);

  const reload = async () => {
    const { data } = await supabase.from("warrior_templates").select("*").order("created_at");
    setTemplates((data as Template[]) || []);
  };

  const edit = (t: Template) => setDraft({ ...t });
  const newOne = () => setDraft({ ...BLANK });

  const save = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("admin_upsert_warrior_template", {
      _id: draft.id ?? null,
      _name: draft.name || "Warrior",
      _emoji: draft.emoji || "🗡️",
      _rarity: draft.rarity || "common",
      _tagline: draft.tagline || "",
      _icon_url: draft.icon_url || null,
      _battle_sprite_url: draft.battle_sprite_url || null,
      _win_gif_url: draft.win_gif_url || null,
      _lose_gif_url: draft.lose_gif_url || null,
      _draw_gif_url: draft.draw_gif_url || null,
      _main_attack_name: draft.main_attack_name || "Strike",
      _main_dmg_base: Number(draft.main_dmg_base) || 0,
      _main_dmg_max: Number(draft.main_dmg_max) || 0,
      _main_cooldown_ms: Number(draft.main_cooldown_ms) || 900,
      _main_range: Number(draft.main_range) || 140,
      _mega_attack_name: draft.mega_attack_name || "Mega",
      _mega_dmg_base: Number(draft.mega_dmg_base) || 0,
      _mega_dmg_max: Number(draft.mega_dmg_max) || 0,
      _mega_cooldown_ms: Number(draft.mega_cooldown_ms) || 6000,
      _mega_range: Number(draft.mega_range) || 220,
      _hp_base: Number(draft.hp_base) || 100,
      _hp_max: Number(draft.hp_max) || 1000,
      _speed: Number(draft.speed) || 200,
      _max_level: Number(draft.max_level) || 12,
      _is_active: draft.is_active ?? true,
    });
    setBusy(false);
    if (error) { setMsg(`❌ ${error.message}`); return; }
    setMsg("✅ Saved");
    await reload();
    if (data && !draft.id) setDraft(d => ({ ...d, id: data as string }));
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!confirm(`Delete "${draft.name}"?`)) return;
    const { error } = await supabase.from("warrior_templates").delete().eq("id", draft.id);
    if (error) setMsg(`❌ ${error.message}`);
    else { setDraft(BLANK); reload(); }
  };

  if (allowed === null) return <div className="h-screen grid place-items-center bg-slate-950 text-white">Checking…</div>;
  if (!allowed) return (
    <div className="h-screen grid place-items-center bg-slate-950 text-white text-center p-6">
      <div>
        <div className="text-2xl font-bold mb-2">Staff only</div>
        <Link to="/app" className="text-sky-400 underline">Back to app</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(circle at 20% 0%, hsl(260 60% 18%), hsl(230 30% 8%) 60%)" }}>
      <header className="h-14 px-4 flex items-center gap-3 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
        <Link to="/arena" className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/15"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="font-display text-lg font-bold">Warrior Admin</div>
        <div className="ml-auto text-xs text-white/60">{templates.length} templates</div>
      </header>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 p-4">
        {/* List */}
        <div className="space-y-2">
          <button onClick={newOne} className="w-full p-3 rounded-xl border border-dashed border-white/30 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-bold">
            <Plus className="h-4 w-4" /> New warrior
          </button>
          {templates.map(t => (
            <button key={t.id} onClick={() => edit(t)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition
                ${draft.id === t.id ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
              {t.icon_url ? <img src={t.icon_url} className="w-10 h-10 object-contain" alt="" /> : <div className="w-10 h-10 grid place-items-center text-2xl">{t.emoji}</div>}
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{t.name}</div>
                <div className="text-[11px] text-white/50 capitalize">{t.rarity} · HP {t.hp_base}-{t.hp_max}</div>
              </div>
              {!t.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 border border-rose-400/40">OFF</span>}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-4">
          {msg && <div className={`px-3 py-2 rounded text-sm ${msg.startsWith("✅") ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-100"}`}>{msg}</div>}

          <Section title="Identity">
            <Grid>
              <Field label="Name"><Input value={draft.name || ""} onChange={v => setDraft(d => ({ ...d, name: v }))} /></Field>
              <Field label="Emoji"><Input value={draft.emoji || ""} onChange={v => setDraft(d => ({ ...d, emoji: v }))} /></Field>
              <Field label="Rarity">
                <select value={draft.rarity || "common"} onChange={e => setDraft(d => ({ ...d, rarity: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-black/40 border border-white/15">
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </Field>
              <Field label="Active">
                <label className="flex items-center gap-2 h-10">
                  <input type="checkbox" checked={!!draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
                  <span className="text-sm">Show in roster / matchmaking</span>
                </label>
              </Field>
            </Grid>
            <Field label="Tagline"><Input value={draft.tagline || ""} onChange={v => setDraft(d => ({ ...d, tagline: v }))} /></Field>
            <Grid>
              <Field label="Icon URL"><Input value={draft.icon_url || ""} onChange={v => setDraft(d => ({ ...d, icon_url: v }))} /></Field>
              <Field label="Battle Sprite URL"><Input value={draft.battle_sprite_url || ""} onChange={v => setDraft(d => ({ ...d, battle_sprite_url: v }))} /></Field>
              <Field label="Win GIF URL"><Input value={draft.win_gif_url || ""} onChange={v => setDraft(d => ({ ...d, win_gif_url: v }))} /></Field>
              <Field label="Lose GIF URL"><Input value={draft.lose_gif_url || ""} onChange={v => setDraft(d => ({ ...d, lose_gif_url: v }))} /></Field>
              <Field label="Draw GIF URL"><Input value={draft.draw_gif_url || ""} onChange={v => setDraft(d => ({ ...d, draw_gif_url: v }))} /></Field>
            </Grid>
          </Section>

          <Section title="Health (Lv 1 → max)">
            <Grid>
              <Field label="HP base (Lv 1)"><Num value={draft.hp_base} onChange={v => setDraft(d => ({ ...d, hp_base: v }))} /></Field>
              <Field label="HP max (Lv max)"><Num value={draft.hp_max} onChange={v => setDraft(d => ({ ...d, hp_max: v }))} /></Field>
              <Field label="Speed (px/s)"><Num value={draft.speed} onChange={v => setDraft(d => ({ ...d, speed: v }))} /></Field>
              <Field label="Max level"><Num value={draft.max_level} onChange={v => setDraft(d => ({ ...d, max_level: v }))} /></Field>
            </Grid>
          </Section>

          <Section title="Main attack">
            <Grid>
              <Field label="Name"><Input value={draft.main_attack_name || ""} onChange={v => setDraft(d => ({ ...d, main_attack_name: v }))} /></Field>
              <Field label="Damage Lv 1"><Num value={draft.main_dmg_base} onChange={v => setDraft(d => ({ ...d, main_dmg_base: v }))} /></Field>
              <Field label="Damage Lv max"><Num value={draft.main_dmg_max} onChange={v => setDraft(d => ({ ...d, main_dmg_max: v }))} /></Field>
              <Field label="Cooldown ms"><Num value={draft.main_cooldown_ms} onChange={v => setDraft(d => ({ ...d, main_cooldown_ms: v }))} /></Field>
              <Field label="Range px"><Num value={draft.main_range} onChange={v => setDraft(d => ({ ...d, main_range: v }))} /></Field>
            </Grid>
          </Section>

          <Section title="Mega attack">
            <Grid>
              <Field label="Name"><Input value={draft.mega_attack_name || ""} onChange={v => setDraft(d => ({ ...d, mega_attack_name: v }))} /></Field>
              <Field label="Damage Lv 1"><Num value={draft.mega_dmg_base} onChange={v => setDraft(d => ({ ...d, mega_dmg_base: v }))} /></Field>
              <Field label="Damage Lv max"><Num value={draft.mega_dmg_max} onChange={v => setDraft(d => ({ ...d, mega_dmg_max: v }))} /></Field>
              <Field label="Cooldown ms"><Num value={draft.mega_cooldown_ms} onChange={v => setDraft(d => ({ ...d, mega_cooldown_ms: v }))} /></Field>
              <Field label="Range px"><Num value={draft.mega_range} onChange={v => setDraft(d => ({ ...d, mega_range: v }))} /></Field>
            </Grid>
          </Section>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button onClick={save} disabled={busy}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold flex items-center gap-2 disabled:opacity-50">
              <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
            </button>
            {draft.id && (
              <button onClick={remove}
                className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            <span className="ml-auto text-xs text-white/50">{draft.id ? `id: ${draft.id.slice(0,8)}…` : "new draft"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-widest text-white/50 font-bold">{title}</div>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-white/60 mb-1">{label}</div>
      {children}
    </label>
  );
}
function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2 rounded bg-black/40 border border-white/15 text-sm" />;
}
function Num({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return <input type="number" value={value ?? 0} onChange={e => onChange(Number(e.target.value))}
    className="w-full px-3 py-2 rounded bg-black/40 border border-white/15 text-sm font-mono" />;
}
