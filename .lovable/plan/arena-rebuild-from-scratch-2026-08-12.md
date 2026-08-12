# Arena Rebuild — From Scratch

I read all 30 concept slides and every asset in the 2.0 pack. Here's exactly what I read, and where I want to deviate. Nothing gets built until you sign off on the deviations at the bottom.

## What the concept actually shows

The deck is only two screens (plus the tutorial pass over both):

**Lobby (slides 1–20)** — night-sky garden background, everything overlaid:

- Top center: one black pill — `0 🍜 | 0 ✦ | 0 👝`
- Top right: globe (World), 3-bar settings, teal `TruAero` button
- Top left: teal player-icon square (first letter of username) with `username` under it
- Left rail down: Warriors (3 fanned cards, black label pill) → `Lv. 5` purple/gold hexagon (EXP road)→ gold trophy icon +`500 (number of trophies)` + green progress bar (trophy road)
- Right rail down: big purple `Celestial Gardens` pill → News → Shop → `:3 Friends` → Season Pass
- Bottom: dark `⚔️ Showdown 1v1 / Map Name here! (map name placeholer)` strip + huge yellow `PLAY`
- Tori sits center-right as a green circle with a speech bubble

**Battle (slides 21–30)** — flat purple map, green ground band, and:

- Top center: black `5:00` pill
- Top left: enemy HP bar, green fill, number centered (`2000`)
- `you` name pill above your warrior
- Off-screen teammate arrows: black arrow with `1` (left edge) and `2` (right edge)
- Bottom right: `1 Main` (red border) and `2 Mega` (yellow border) cards, then selected-attack name text (`Turtle Bite` / `None selected`)
- A cooldown clock disc over your warrior
- Aim: hold to show a gray ghost blob + crosshair, release to fire; click anywhere = auto aim
- Bottom of screen: elimination bar — blue `Imp` segment, red `pmI` segment, on a pink/peach/yellow gradient rail

Every other menu (News, Shop, Friends, Season Pass, TruAero, Settings, World, player profile, trophy/exp roads, other gamemodes, Celestial Gardens) is never drawn in the deck — those get a **Coming Soon** card, per your instruction.

## What I'll build

Fresh files, old arena components deleted:

- `src/pages/Arena.tsx` — lobby, 1:1 with the slides, no invented elements
- `src/components/arena/Lobby*.tsx` — small pieces (currency pill, rails, hex, trophy meter)
- `src/components/arena/Match.tsx` — real-time side-view match: WASD/arrows move, 1/2 select attack, hold-aim + release, click auto-aim, cooldown disc, 5:00 timer, elimination bar, bot opponent
- `src/components/arena/WarriorSelect.tsx` — warrior grid + noodles/packet upgrades (Health / Main / Mega, Lv 1–12)
- `src/components/arena/ComingSoon.tsx` — reused for every undrawn menu
- `src/components/arena/tori.ts` — Tori's line-by-line tutorial script, transcribed from the deck, stored but **not wired up** (per your instruction)

Currency reads/writes stay on the existing realtime hook so counters match the database everywhere.

Assets I'll upload from the new pack that aren't in the project yet: Max Icon + Max win/lose/draw/spark videos, the three CG emote gifs, and the Atheris Pass art.

## Deviations I need approval on

1. **Tori's lobby bubble** — the deck always draws Tori mid-screen with a bubble, but that's the tutorial state. Since the tutorial is off, I'd render the lobby with **no Tori bubble** by default. Alternative: keep Tori idle center-right with no bubble.
2. **Max** — there's a full Max asset set (icon + 4 videos) but Max appears nowhere in the deck. I'd add Max as a second warrior in the roster using those assets. Say the word if he's meant for something else.
3. **Elimination bar labels** — `Imp` / `pmI` read as placeholder text (mirrored). I'd render real player names there instead of literal `Imp`/`pmI`.
4. **Aspect ratio** — the deck is a fixed 16:9 frame. I'd letterbox the arena to 16:9 on wide screens so the layout never stretches, rather than fluid-filling the viewport.

Approve, or tell me which of the four to do differently, and I'll start.