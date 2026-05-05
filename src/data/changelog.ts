export type ChangelogEntry = {
  date: string; // ISO yyyy-mm-dd
  version: string;
  title: string;
  tags: ("feature" | "fix" | "design" | "backend" | "beta")[];
  notes: string[];
};

// Hand-maintained. Newest first.
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-05-05",
    version: "0.8.0-beta",
    title: "Google Docs–style Property + live everything",
    tags: ["feature", "design", "backend"],
    notes: [
      "Replaced the entire app shell. The sidebar of tabs and the brick/block builder are gone — every player has one auto-built Property document.",
      "New Docs-style format toolbar: Bold, Italic, Underline, Strike, text color, highlight, headings, lists, alignment, fonts, sizes, links, undo/redo. The bar greys out when nothing is selected and lights up when text is selected.",
      "Live save with 400ms debounce. Edits made in one window appear in another within ~1 second — no refresh.",
      "Visible mouse cursors are back, redesigned with avatar pills (initials + name) styled to match the concept. Per-property scope.",
      "Cool startup splash screen with a soft 3-note WebAudio chime. Toggle the chime from the header speaker icon.",
      "Tutorial spotlight rewritten for the new layout: format bar → currencies → Aero → stat cards.",
      "Stat cards (Profile, Currency, Inventory, Garden) live below the doc and update in realtime.",
    ],
  },
  {
    date: "2026-05-04",
    version: "0.7.0-beta",
    title: "Concept-aligned UI + spotlight tutorial + per-tab cursors",
    tags: ["feature", "design", "fix"],
    notes: [
      "Fixed duplicate-key error on tab creation by dropping the unique-user-tab constraint.",
      "Restyled the sidebar to pill-style cards with a NEW badge for fresh tabs (matches concept).",
      "Slimmed the top bar — removed the font picker and role badge in header, kept the beta chip, currencies, and avatar.",
      "Live cursors now scope per-tab — you only see people on the same property as you.",
      "Replaced the modal tutorial with a guided spotlight tour that highlights real UI (tabs, currencies, Aero, builder).",
      "All edits already saved live via realtime subscriptions — no more refreshing every 10 seconds.",
    ],
  },
  {
    date: "2026-05-03",
    version: "0.6.0-beta",
    title: "Unified builder + Aero migration + tutorial",
    tags: ["feature", "design", "backend"],
    notes: [
      "Removed Achievements / AI Builder / Code Runner top tabs — focusing the app on tabs & properties.",
      "Reworked top bar to match the concept: sticky, beta chip, currencies, Aero CTA, tutorial CTA.",
      "Builder dock now contains every block type (buttons, content, AND property modules: stats, currency, inventory, garden) — no more separate add-block menu.",
      "Properties are auto-built on signup with header + stats + currency + inventory + garden — they're now your home/stat-board, not something you create.",
      "New 'Played Aero?' button in the header: players submit their Aero username, pets, and old role; staff review & approve from the same dialog.",
      "Tutorial dialog walks new players through Atheris — shown once, re-openable from the header.",
      "Fixed tab-creation error by removing the property/blank picker and using a single blank-tab create flow (devs+ only).",
    ],
  },
  {
    date: "2026-05-02",
    version: "0.5.0-beta",
    title: "Landing page, beta banner & changelog",
    tags: ["feature", "design", "beta"],
    notes: [
      "Added a public landing page at / introducing Atheris.",
      "Moved the app dashboard to /app and the auth flow to /auth.",
      "New /changelog page documenting every visible change so far.",
      "Sitewide beta disclaimer banner (dismissible per session).",
      "Concept-faithful Property header: sparkle title, picture-of-the-day, highlighted intro, Titles section.",
      "New floating Builder dock with drag-to-add Purchase / Regular / HTML / Timer presets.",
    ],
  },
  {
    date: "2026-04-21",
    version: "0.4.0",
    title: "Property vs Blank tabs",
    tags: ["feature", "backend"],
    notes: [
      "Tabs now come in two kinds: Property (pre-seeded blocks) and Blank (empty canvas).",
      "Picker dialog when creating a new tab.",
      "All previously auto-created tabs were converted to Blank.",
    ],
  },
  {
    date: "2026-04-21",
    version: "0.3.0",
    title: "Block-based properties + realtime cursors",
    tags: ["feature", "backend", "design"],
    notes: [
      "Rewrote tabs into a drag-and-drop block engine: Header, Stats, Currency, Inventory, Garden, Buttons, Timer, Text.",
      "Per-block gradient styling: none, auto-shimmer, or custom two-color picker.",
      "Inventory categories: Seeds, Gear, Pets, Fruits/Crops, Cooking, Cosmetics, Titles, Other.",
      "Garden plants with food, water, happiness, level, and noodles/hour.",
      "Custom action buttons with currency costs and colored variants.",
      "Realtime colored cursors visible across the entire app via Supabase Presence.",
      "Vertical sidebar of tabs with privacy lock and level lock indicators.",
    ],
  },
  {
    date: "2026-04-15",
    version: "0.2.0",
    title: "Roles, achievements & AI builder",
    tags: ["feature", "backend"],
    notes: [
      "User roles: Owner, Co-Owner, Dev, Member, Custom — stored in a separate user_roles table.",
      "Achievements system: staff create achievements and grant them to players.",
      "AI Feature Builder tab — describe a feature, get runnable HTML/JS scaffolding.",
      "HTML/JS Code Runner tab with sandboxed iframe and 'always on' mode.",
      "Currency chips for Noodles 🍜 and Lumina ✦, level badge, font preference selector.",
    ],
  },
  {
    date: "2026-04-10",
    version: "0.1.0",
    title: "First playable build",
    tags: ["feature", "design"],
    notes: [
      "Google sign-in via Lovable Cloud.",
      "Profiles table with display name, avatar emoji, currencies, level/XP.",
      "Corner chat with role colors and avatars.",
      "Initial design system: Inter / Space Grotesk / Playfair / JetBrains Mono / Caveat fonts and HSL token palette.",
    ],
  },
];
