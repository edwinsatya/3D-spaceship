/** Optional player accounts (Supabase). Without these variables the game is guest-only. */
export const ACCOUNT = {
  /** Inlined at build time (see .env.example); direct references so Next can inline them. */
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  table: "player_progress",
  /** Wait this long after the last change before uploading (ms). */
  uploadDelay: 2500,
  /** Pull the account again when the tab regains focus, at most this often (ms). */
  refreshInterval: 30_000,
} as const;

export const ACCOUNT_CONFIGURED = Boolean(ACCOUNT.url && ACCOUNT.key);
