import { migrateProgress, PROGRESS_VERSION, progressData, type ProgressData } from "@/game/stores/progressStore";
import { mergeProgress, sameProgress } from "./merge";

/** Where an account's progress lives (Supabase in the game, an in-memory fake in tests). */
export interface ProgressRemote {
  load(userId: string): Promise<{ data: unknown; version: number } | null>;
  save(userId: string, data: ProgressData, version: number): Promise<void>;
}

export interface LocalProgress {
  get(): ProgressData;
  /** Replaces the saved progress (keeps the store's actions). */
  set(data: ProgressData): void;
}

/**
 * Pulls the account, merges it with this device's progress (guest progress
 * joins the account on first sign-in), writes the result to both sides.
 */
export async function syncProgress(remote: ProgressRemote, local: LocalProgress, userId: string): Promise<ProgressData> {
  const stored = await remote.load(userId);
  const current = progressData(local.get());
  const merged = stored ? mergeProgress(current, migrateProgress(stored.data, stored.version)) : current;
  if (!sameProgress(merged, current)) local.set(merged);
  const remoteData = stored ? progressData(migrateProgress(stored.data, stored.version)) : null;
  if (!remoteData || !sameProgress(merged, remoteData)) await remote.save(userId, merged, PROGRESS_VERSION);
  return merged;
}

/** Uploads the current progress (after local changes). */
export async function pushProgress(remote: ProgressRemote, local: LocalProgress, userId: string): Promise<void> {
  await remote.save(userId, progressData(local.get()), PROGRESS_VERSION);
}
