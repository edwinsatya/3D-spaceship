import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNT, ACCOUNT_CONFIGURED } from "@/game/config/account";
import { useAccountStore } from "@/game/stores/accountStore";
import { useProgressStore, type ProgressData } from "@/game/stores/progressStore";
import { getSupabase, supabaseRemote } from "./supabase";
import { pushProgress, syncProgress, type LocalProgress } from "./sync";

let userId: string | null = null;
/** Set while merged account data is written into the store (don't upload it straight back). */
let applying = false;
let uploadTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

const local: LocalProgress = {
  get: () => useProgressStore.getState(),
  set: (data: ProgressData) => {
    applying = true;
    try {
      useProgressStore.setState(data);
    } finally {
      applying = false;
    }
  },
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runSync(supabase: SupabaseClient): Promise<void> {
  const id = userId;
  if (!id) return;
  useAccountStore.getState().set({ sync: "syncing" });
  try {
    await syncProgress(supabaseRemote(supabase), local, id);
    useAccountStore.getState().set({ sync: "synced", lastSyncedAt: Date.now() });
  } catch (error) {
    console.warn("[account] sync failed", error);
    useAccountStore.getState().set({ sync: "error" });
  }
}

function scheduleUpload(supabase: SupabaseClient): void {
  if (!userId || applying) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(async () => {
    const id = userId;
    if (!id) return;
    useAccountStore.getState().set({ sync: "syncing" });
    try {
      await pushProgress(supabaseRemote(supabase), local, id);
      useAccountStore.getState().set({ sync: "synced", lastSyncedAt: Date.now() });
    } catch (error) {
      console.warn("[account] upload failed", error);
      useAccountStore.getState().set({ sync: "error" });
    }
  }, ACCOUNT.uploadDelay);
}

/** Restores the session, keeps progress in sync while signed in. Call once on startup. */
export async function startAccount(): Promise<void> {
  if (started) return;
  started = true;
  const store = useAccountStore.getState();
  const pending = getSupabase();
  if (!ACCOUNT_CONFIGURED || !pending) {
    store.set({ status: "unconfigured" });
    return;
  }
  const supabase = await pending;
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const changed = (user?.id ?? null) !== userId;
    userId = user?.id ?? null;
    useAccountStore.getState().set(
      user ? { status: "signedIn", email: user.email ?? null, linkSentTo: null, error: null } : { status: "signedOut", email: null, sync: "idle" },
    );
    // Supabase advises against awaiting its own calls inside this callback.
    if (user && changed) setTimeout(() => void runSync(supabase), 0);
  });
  useProgressStore.subscribe(() => scheduleUpload(supabase));
  document.addEventListener("visibilitychange", () => {
    const { status, lastSyncedAt, sync } = useAccountStore.getState();
    if (document.visibilityState !== "visible" || status !== "signedIn" || sync === "syncing") return;
    if (lastSyncedAt === null || Date.now() - lastSyncedAt > ACCOUNT.refreshInterval) void runSync(supabase);
  });
}

function returnUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: returnUrl() } });
  if (error) useAccountStore.getState().set({ error: message(error) });
}

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  useAccountStore.getState().set({ error: null });
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: returnUrl() } });
  useAccountStore.getState().set(error ? { error: message(error) } : { linkSentTo: email });
}

/** Signs out; progress stays on this device and the player carries on as a guest. */
export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  clearTimeout(uploadTimer);
  const { error } = await supabase.auth.signOut();
  if (error) useAccountStore.getState().set({ error: message(error) });
}

export async function syncNow(): Promise<void> {
  const supabase = await getSupabase();
  if (supabase) await runSync(supabase);
}
