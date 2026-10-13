import { create } from "zustand";

export type AccountStatus = "unconfigured" | "loading" | "signedOut" | "signedIn";
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/** Account and sync state for the UI (the session itself is kept by Supabase). */
interface AccountStore {
  status: AccountStatus;
  email: string | null;
  sync: SyncStatus;
  lastSyncedAt: number | null;
  /** Magic link sent to this address (shown until signed in). */
  linkSentTo: string | null;
  error: string | null;
  panelOpen: boolean;
  set: (patch: Partial<Omit<AccountStore, "set" | "openPanel" | "closePanel">>) => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useAccountStore = create<AccountStore>()((set) => ({
  status: "loading",
  email: null,
  sync: "idle",
  lastSyncedAt: null,
  linkSentTo: null,
  error: null,
  panelOpen: false,
  set: (patch) => set(patch),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false, error: null }),
}));
