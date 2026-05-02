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
