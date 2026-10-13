import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT, ACCOUNT_CONFIGURED } from "@/game/config/account";
import type { ProgressData } from "@/game/stores/progressStore";
import type { ProgressRemote } from "./sync";

let client: Promise<SupabaseClient> | null = null;

/** The Supabase client, loaded on demand; null when accounts are not configured. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!ACCOUNT_CONFIGURED) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(ACCOUNT.url, ACCOUNT.key, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}

/** One row per player in `player_progress` (see supabase/migrations); RLS keeps rows private. */
export function supabaseRemote(supabase: SupabaseClient): ProgressRemote {
  return {
    async load(userId) {
      const { data, error } = await supabase.from(ACCOUNT.table).select("data, version").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? { data: data.data as unknown, version: Number(data.version) } : null;
    },
    async save(userId, data: ProgressData, version) {
      const { error } = await supabase
        .from(ACCOUNT.table)
        .upsert({ user_id: userId, data, version, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}
