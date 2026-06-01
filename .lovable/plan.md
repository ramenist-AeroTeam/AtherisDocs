# Arena Rework — Plan

Scope: rebuild the Arena tab end-to-end. Homepage redesign comes after, in a follow-up turn.

## What changes for the player

- Pick a game mode (same picker as today: 1v1 / 2v2 / etc.)
- Bring a **warrior** into the match. Each warrior has: name, rarity, trophy count, and **2 weapons**.
- Each weapon has a level. Upgrade weapons with **noodles** + **noodle packets** (inventory item).
- Match has a **5:00 hard cap** and a **map** that changes per season/event.
- Live **in-match chat** sidebar.
- **Win = +10 trophies, loss = −5 trophies** (on the warrior).
- Under **20 trophies** → matched against bots. Above → matched with real players (bot fallback if no opponent found).

## Database (new tables, all RLS'd)

- `warrior_templates` — the roster I'll seed (3 placeholders for now: Ramen Knight / Lumina Mage / Void Rogue). Fields: name, emoji, rarity, base_weapon_1, base_weapon_2, weapon_1_emoji, weapon_2_emoji. Public read, staff-only write.
- `user_warriors` — instance owned by a user. Fields: user_id, template_id, nickname, trophies (default 0), weapon_1_level, weapon_2_level, is_equipped.
- `arena_maps` — season/event maps. Fields: name, emoji, theme (`spring`/`summer`/`autumn`/`winter`/`event`), bg_gradient, is_active. Public read.
- `arena_chat` — match-scoped chat. Fields: match_id, user_id, content. Read for match participants, insert self.
- Extend `arena_matches`: add `map_id`, `is_bot_match` (bool).
- Extend `arena_players`: add `warrior_id` (the user_warrior brought into the match).

RPCs (security definer):
- `upgrade_warrior_weapon(warrior_id, slot)` — checks ownership, charges noodles + 1 packet from inventory based on current level, bumps weapon level.
- `resolve_arena_match(match_id, winner_team)` — updates each warrior's trophies (+10 / −5, clamped at 0).
- `grant_starter_warrior()` — gives the user one Ramen Knight if they have none. Called on first arena visit.

## Frontend

Rewrite `src/components/ArenaTab.tsx` into:
- `ArenaTab.tsx` — top-level routing between Lobby / Roster / Match.
- `arena/WarriorRoster.tsx` — grid of owned warriors; click to view detail + upgrade weapons; equip toggle.
- `arena/WarriorCard.tsx` — visual card showing rarity border, trophy count, weapon list with level pips.
- `arena/UpgradeDialog.tsx` — shows cost (noodles + packets) and confirms.
- `arena/Lobby.tsx` — mode picker (kept), now also shows current season map preview + "with bot" badge if user's equipped warrior has <20 trophies.
- `arena/MatchView.tsx` — 5-minute countdown header, map background, players + HPs, action buttons (existing move system stays mechanically — weapons just reskin moves), **right-side ChatPanel**.
- `arena/ChatPanel.tsx` — realtime via `arena_chat` table.

Trophy ladder, bot match flag, and the under-20 bot rule live in the matchmaking helper inside `Lobby.tsx`.

## What stays

- The existing round-resolution / move-locking machinery in `arena_rounds` stays — weapons are flavored move sources, not a new combat engine.
- Mode list (1v1, 2v2, etc.) is unchanged.

## Out of scope (this turn)

- Homepage redesign — separate turn after arena lands.
- Full warrior roster — seeding 3 placeholders so you can fill out the catalog later.
- Designing per-season map art beyond gradient + emoji theming.

## Order of operations

1. Migration (tables, columns, RPCs, seed 3 warriors + 1 default map).
2. Frontend rewrite of ArenaTab + new subcomponents.
3. Wire chat realtime + 5-min timer.
4. Verify build, then move on to homepage.

Approve and I'll start with the migration.