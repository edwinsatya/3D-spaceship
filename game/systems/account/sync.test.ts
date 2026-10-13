import { describe, expect, it } from "vitest";
import { migrateProgress, type ProgressData } from "@/game/stores/progressStore";
import { syncProgress, type LocalProgress, type ProgressRemote } from "./sync";

function fakeRemote(initial: Record<string, { data: unknown; version: number }> = {}) {
  const rows = new Map(Object.entries(initial));
  let saves = 0;
  const remote: ProgressRemote = {
    load: async (userId) => rows.get(userId) ?? null,
    save: async (userId, data, version) => {
      saves++;
      rows.set(userId, { data: JSON.parse(JSON.stringify(data)), version });
    },
  };
  return { remote, rows, saves: () => saves };
}

function fakeLocal(data: ProgressData): LocalProgress & { value: ProgressData } {
  const local = {
    value: data,
    get: () => local.value,
    set: (next: ProgressData) => {
      local.value = next;
    },
  };
  return local;
}

const progress = (patch: Partial<ProgressData>) => ({ ...migrateProgress(undefined, 3), ...patch });

describe("syncProgress", () => {
  it("uploads guest progress to a new account", async () => {
    const { remote, rows } = fakeRemote();
    const local = fakeLocal(progress({ discovered: ["earth"] }));
    await syncProgress(remote, local, "player");
    expect((rows.get("player")?.data as ProgressData).discovered).toEqual(["earth"]);
  });

  it("brings another device's progress in and merges it with the guest's", async () => {
    const { remote, rows } = fakeRemote({
      player: { data: progress({ discovered: ["mars"], missions: { "orbit-rings": { best: 25_000, bestStars: 3, completions: 2 } } }), version: 3 },
    });
    const local = fakeLocal(progress({ discovered: ["earth"] }));
    await syncProgress(remote, local, "player");
    expect(local.value.discovered).toEqual(["earth", "mars"]);
    expect(local.value.missions["orbit-rings"]?.bestStars).toBe(3);
    expect((rows.get("player")?.data as ProgressData).discovered).toEqual(["earth", "mars"]);
  });

  it("understands older saves stored on the account", async () => {
    const { remote } = fakeRemote({ player: { data: { missions: { "orbit-rings": { bestTimeMs: 31_000, bestStars: 2, completions: 1 } } }, version: 2 } });
    const local = fakeLocal(progress({}));
    await syncProgress(remote, local, "player");
    expect(local.value.missions["orbit-rings"]?.best).toBe(31_000);
  });

  it("does not upload when nothing changed", async () => {
    const same = progress({ discovered: ["earth"] });
    const { remote, saves } = fakeRemote({ player: { data: same, version: 3 } });
    await syncProgress(remote, fakeLocal(same), "player");
    expect(saves()).toBe(0);
  });
});
