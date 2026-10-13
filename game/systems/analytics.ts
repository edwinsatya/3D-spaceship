import { ACCOUNT, ACCOUNT_CONFIGURED } from "@/game/config/account";
import type { MissionId } from "@/game/data/missions";

/**
 * Anonymous product analytics: which modes are played, whether the tutorial
 * gets finished, mission results and how long sessions last. No account,
 * email or other personal data — only a random id per browser tab session.
 * Events go to the `analytics_events` table (insert-only, see supabase/
 * migrations) when accounts are configured, and to the console in dev.
 */
export type AnalyticsEvent =
  | { name: "game_start"; props: { mode: string; mission: MissionId | null; device: string; quality: string } }
  | { name: "tutorial_complete"; props: { device: string } }
  | { name: "mission_complete"; props: { mission: MissionId; stars: number; value: number; first: boolean } }
  | { name: "session_end"; props: { active_seconds: number; runs: number } };

export const ANALYTICS_EVENTS = ["game_start", "tutorial_complete", "mission_complete", "session_end"] as const;

let enabled = false;
let sessionId: string | null = null;

function session(): string {
  sessionId ??= typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return sessionId;
}

export function setAnalyticsEnabled(on: boolean): void {
  enabled = on;
}

/** Fire-and-forget; `keepalive` lets the last event of a closing tab still arrive. */
export function track(event: AnalyticsEvent): void {
  if (!enabled) return;
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event.name, event.props);
  if (!ACCOUNT_CONFIGURED || typeof fetch === "undefined") return;
  void fetch(`${ACCOUNT.url}/rest/v1/analytics_events`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: ACCOUNT.key,
      Authorization: `Bearer ${ACCOUNT.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ session_id: session(), event: event.name, props: event.props }),
  }).catch(() => {
    // Offline or blocked: analytics never gets in the way of playing.
  });
}
