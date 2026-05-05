# Atheris v0.8 — Google Docs–style Property

Full UI rebuild. Stop treating the app as "tabs of blocks." Each player has **one** auto-built Property document. Everything is live. The top bar is a Docs-style formatting toolbar that **only activates when text is selected**.

---

## 1. What gets removed

- The entire **left sidebar of tabs**.
- The **block / brick system** (`tab_blocks`, `BuilderDock`, `PropertyView`, `PropertyBlock`) — no more drag-drop bricks.
- Tab create / delete / rename / emoji / public toggle UI.
- Font picker in header (already gone) + the old "add block" dropdown.
- The corner chat stays but gets restyled to match the new shell.
- Old changelog mock on Home that mentions "block-based tabs" — updated copy.

Database tables stay (so existing data isn't lost), they're just no longer surfaced in the UI. The migration we already ran auto-promotes one tab per user to be **the** Property.

---

## 2. New app shell

```text
┌──────────────────────────────────────────────────────────────┐
│  atheris  beta   🍜 1,240   ✦ 87   Lv 12      Aero  ?  👤 ▾  │  ← App bar (always)
├──────────────────────────────────────────────────────────────┤
│  B  I  U  S   A▾  🖍▾   H1 H2  •  1.  ⌘  ↶ ↷   100%  ▾font  │  ← Format bar
│                                          (greyed unless text selected)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│            <Player>'s Property                               │
│            ─────────────────────                             │
│            Live editable document…                           │
│                                                              │
│            [stats card]   [currency card]                    │
│            [inventory]    [garden]                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                                     ● max  ● shareef   ← presence avatars (top right)
```

- **App bar**: brand, beta chip, currencies, level, Aero button, tutorial, avatar menu (sign out, changelog).
- **Format bar**: full Docs-style controls. Buttons read `document.queryCommandState` on the current selection; when no text is selected, the whole bar dims to 40 % and is non-interactive (no formatting can be applied to nothing).
- **Document**: a single `contentEditable` surface saved to `user_tabs.document` (TipTap-style HTML stored as string in the new `document` jsonb as `{html:"..."}`).
- **Stat cards** (auto-built, non-removable, locked at the bottom of the doc): Profile, Currency, Inventory, Garden — these are read-only React widgets rendered after the editable surface, not part of the editable HTML.

---

## 3. Format bar capabilities

Order, left → right:

1. Undo / Redo
2. Font family picker (Inter, Space Grotesk, Playfair, JetBrains Mono, Caveat)
3. Font size (12 / 14 / 16 / 18 / 24 / 32)
4. **B** Bold, *I* Italic, U Underline, S Strikethrough
5. Text color swatch
6. Highlight color swatch
7. H1 / H2 / Paragraph dropdown
8. Bullet list, Numbered list
9. Align L / C / R
10. Link insert
11. Clear formatting

All implemented with `document.execCommand` (good enough for a contentEditable, no extra deps). Selection is tracked via a `selectionchange` listener; if `selection.isCollapsed`, the bar is disabled.

---

## 4. Live everything

- **Live save**: debounced 400 ms `update user_tabs set document=… where id=mine`.
- **Live receive**: realtime `postgres_changes` on `user_tabs` already enabled in the migration. When a remote update arrives for the open property and the local editor isn't focused, replace innerHTML; if focused, store the incoming HTML and merge on blur (last-writer-wins is fine for solo properties).
- **Live currencies / stats**: realtime on `profiles`, `inventory_items`, `garden_plants` (all enabled).
- **No more refresh ever**: removes the existing reload-on-any-change pattern.

---

## 5. Visible mouse cursors

Existing `RealtimeCursors` component already renders SVG arrows + name tags. We will:

- Keep the per-property scope (`atheris-cursors:<property_id>`).
- **Make them actually show** — current bug is the parent `pointer-events:none` overlay swallows transforms when route loads before the channel subscribes. Fix by mounting the overlay on `<body>` via portal and only after `userId` is set, plus broadcasting an immediate hello frame so each peer sees you within 100 ms. Lets make the cursors in the style of the concept attached, with a profile icon and a cursor.

---

## 6. Cool loading screen

A full-screen splash on `/app`:

- Animated gradient background using existing `--primary` / `--primary-glow` tokens.
- "atheris" wordmark with shimmer.
- Three pulsing dots underneath.
- Stays mounted until `userId && me && propertyId` are all loaded (min 600 ms so it doesn't flash).
- Plays the **startup sound** once on mount (a short generated chime via the WebAudio API — no asset file needed; three notes C5 → E5 → G5 with a soft envelope).
- Respects `profiles.tutorial_seen` for whether to launch the tour after fade-out.
- Mute toggle (persisted on `profiles.startup_sound`, already added in the migration).

---

## 7. Tutorial

Update the existing spotlight tour for the new layout:

1. Welcome
2. Highlight format bar — "Select text to format it, just like Docs."
3. Highlight currency chips
4. Highlight Aero button
5. Highlight stat cards — "These auto-update from your gameplay."
6. Done.

---

## 8. Files

**New**

- `src/components/editor/DocToolbar.tsx` — format bar (selection-aware).
- `src/components/editor/PropertyDoc.tsx` — contentEditable + live save/load.
- `src/components/editor/StatCards.tsx` — Profile / Currency / Inventory / Garden read-only widgets.
- `src/components/Splash.tsx` — loading screen + startup sound.
- `src/lib/startupSound.ts` — WebAudio chime.

**Rewritten**

- `src/pages/Index.tsx` — new shell, no sidebar, one document.
- `src/components/RealtimeCursors.tsx` — portal mount + hello frame.
- `src/components/Tutorial.tsx` — updated steps.
- `src/data/changelog.ts` — add `0.8.0-beta` entry.
- `src/pages/Home.tsx` — copy refresh ("your live property" instead of "tabs of blocks") and updated mock.

**Deleted**

- `src/components/property/BuilderDock.tsx`
- `src/components/property/PropertyView.tsx`
- `src/components/property/PropertyBlock.tsx`
- `src/components/property/types.ts`
- `src/components/AeroButton.tsx` stays.

---

## 9. Non-goals (call out before approval)

- We are **not** doing real OT/CRDT collab on the document text yet. Last-writer-wins per 400 ms debounce. Visible cursors give the multiplayer feel. If two people type in the same property at the exact same time, last save wins.
- We are **not** persisting per-character authorship colors.
- We are **not** porting the old block data into the new doc — old `tab_blocks` rows are kept in the DB but hidden from UI.

---

## 10. Tech notes

- Use `document.execCommand` (deprecated but universally supported) for formatting; it's the only no-dep path that works inside `contentEditable` without pulling TipTap/ProseMirror.
- Selection tracking: `document.addEventListener('selectionchange', …)` with a `useState` of `{ hasRange: boolean, marks: {bold, italic, …} }`.
- Save: `useEffect` watching `html` with a 400 ms debounce → `supabase.from('user_tabs').update({ document: { html }, last_saved_at: new Date() }).eq('id', propertyId)`.
- Receive: subscribe to `postgres_changes` on `user_tabs` filtered by `id=eq.<propertyId>`; if `payload.new.document.html !== currentHtml` and editor not focused, set innerHTML.
- Startup sound: `new (window.AudioContext||webkitAudioContext)()`; three `OscillatorNode`s with `GainNode` envelope (~250 ms each). Skip if `profiles.startup_sound === false` or if the AudioContext can't autoplay (browser policy) — in that case the splash still shows.
- Loading screen lives inside `<Index>`, not at the router level, so route navigation feels instant.

---

## 11. Acceptance check

Add an actual '/app' and remove all tabs currently in Atheris.  Properties and Tabs are **different.** Properties show your stats, so people can know what you have (do note that we should probably make a private feature in the future) and regular tabs are tabs with *anything*.

- No tabs anywhere in `/app`.
- No "add block" buttons. No bricks.
- Format bar is greyed when nothing is selected; lights up when text is selected; clicking Bold bolds the selection.
- Edits made in one window appear in another within ~1 s with no refresh.
- Other users' colored cursors are visibly moving on the page.
- First load shows a splash with shimmer wordmark and a soft 3-note chime.
- Currencies, inventory, and garden update live without refresh.
- Changelog has a `0.8.0-beta` entry describing all of the above.