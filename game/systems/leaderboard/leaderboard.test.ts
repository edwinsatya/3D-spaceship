import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasLeaderboard, LEADERBOARD } from "@/game/config/leaderboard";
import { BLOCKED_ANYWHERE, BLOCKED_WORDS } from "@/game/data/blockedWords";
import {
  CALL_SIGN_ADJECTIVES,
  CALL_SIGN_NOUNS,
  callSignName,
  isCallSign,
  leaderboardName,
  randomCallSign,
  type CallSign,
} from "@/game/data/callSigns";
import { MISSION_ORDER, MISSIONS, type MissionId } from "@/game/data/missions";
import { SHIPS } from "@/game/data/ships";
import { LOCALES } from "@/game/i18n/types";
import { useAccountStore } from "@/game/stores/accountStore";
import { useLeaderboardStore } from "@/game/stores/leaderboardStore";
import { flyWaypoints, missionWaypoints } from "@/game/systems/autopilot";
import { getMissionLayout } from "@/game/systems/missionLayout";
import { cleanNickname, nicknameProblem } from "./nickname";
import { LeaderboardError, parseBoard, parseOutcome, type LeaderboardRemote } from "./remote";
import {
  beginLeaderboardRun,
  ensureProfile,
  finishLeaderboardRun,
  loadBoard,
  pickRandomName,
  saveNickname,
  setLeaderboardSource,
} from "./service";

const migration = (name: string) => readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");
const SQL = migration("20261013020000_leaderboard.sql");
const NICKNAME_SQL = migration("20261013030000_leaderboard_nicknames.sql");
/** The quoted words of the array a SQL function returns. */
const sqlWords = (fn: string) => {
  const body = NICKNAME_SQL.match(new RegExp(`function public\\.${fn}\\(\\)[\\s\\S]*?array\\[([\\s\\S]*?)\\]`))?.[1] ?? "";
  return [...body.matchAll(/'([^']+)'/g)].map(([, word]) => word);
};
const timed = MISSION_ORDER.filter((id) => MISSIONS[id].rating.kind === "time");

describe("leaderboard rules", () => {
  it("has a board for every timed mission and none for photo scores", () => {
    for (const id of MISSION_ORDER) expect(hasLeaderboard(id)).toBe(MISSIONS[id].rating.kind === "time");
  });

  it("uses the same minimum times as the server", () => {
    const server = Object.fromEntries([...SQL.matchAll(/when '([a-z-]+)' then (\d+)/g)].map(([, id, ms]) => [id, Number(ms)]));
    const client = Object.fromEntries(timed.map((id) => [id, (LEADERBOARD.minSeconds[id] ?? 0) * 1000]));
    expect(server).toEqual(client);
  });

  it.each(timed)("%s: the minimum is out of reach but not meaningless", (id) => {
    const layout = getMissionLayout(id);
    const waypoints = missionWaypoints(layout);
    const fastest = Math.min(...SHIPS.map((ship) => flyWaypoints(layout, waypoints, true, ship)));
    const minimum = LEADERBOARD.minSeconds[id] ?? 0;
    // Room for pilots who beat the autopilot by a lot, while still refusing silly times.
    expect(minimum).toBeLessThanOrEqual(fastest * 0.6);
    expect(minimum).toBeGreaterThanOrEqual(fastest * 0.4);
    expect(minimum).toBeLessThan(MISSIONS[id].rating.three);
  });

  it("matches the call sign ranges the table accepts", () => {
    const { adjectives, nouns, tagMin, tagMax } = LEADERBOARD.callSign;
    expect(SQL).toContain(`adjective between 0 and ${adjectives - 1}`);
    expect(SQL).toContain(`noun between 0 and ${nouns - 1}`);
    expect(SQL).toContain(`tag between ${tagMin} and ${tagMax}`);
    expect(SQL).toContain(`floor(random() * ${adjectives})::smallint, floor(random() * ${nouns})::smallint`);
    expect(SQL).toContain(`(${tagMin} + floor(random() * ${tagMax - tagMin + 1}))::smallint`);
  });
});

describe("call signs", () => {
  it("has a full, duplicate-free word list in every language", () => {
    for (const locale of LOCALES) {
      expect(CALL_SIGN_ADJECTIVES[locale]).toHaveLength(LEADERBOARD.callSign.adjectives);
      expect(CALL_SIGN_NOUNS[locale]).toHaveLength(LEADERBOARD.callSign.nouns);
      expect(new Set(CALL_SIGN_ADJECTIVES[locale]).size).toBe(LEADERBOARD.callSign.adjectives);
      expect(new Set(CALL_SIGN_NOUNS[locale]).size).toBe(LEADERBOARD.callSign.nouns);
    }
  });

  it("reads naturally in each language", () => {
    const sign: CallSign = { adjective: 0, noun: 0, tag: 42 };
    expect(callSignName(sign, "en")).toBe("Swift Comet 42");
    expect(callSignName(sign, "id")).toBe("Komet Gesit 42");
    expect(leaderboardName({ callSign: sign, nickname: null }, "en")).toBe("Swift Comet 42");
    expect(leaderboardName({ callSign: sign, nickname: "Budi" }, "id")).toBe("Budi");
  });

  it("rolls valid call signs, and a re-roll always changes the words", () => {
    for (let i = 0; i < 200; i++) expect(isCallSign(randomCallSign())).toBe(true);
    expect(isCallSign(randomCallSign(undefined, () => 0.999999))).toBe(true);
    const previous = randomCallSign(undefined, () => 0.5);
    const next = randomCallSign(previous, () => 0.5);
    expect(isCallSign(next)).toBe(true);
    expect(next.adjective !== previous.adjective || next.noun !== previous.noun).toBe(true);
    expect(isCallSign({ adjective: 16, noun: 0, tag: 42 })).toBe(false);
    expect(isCallSign({ adjective: 0, noun: 0, tag: 100 })).toBe(false);
  });
});

/** The same names were run through leaderboard_nickname_problem on Postgres. */
const NAME_SAMPLES: [string, string | null][] = [
  ["Budi", null], ["Rocket Kid 2026", null], ["Si_Komet-7", null], ["Pantai Indah", null], ["Cockpit Ace", null],
  ["Masuk Angin", null], ["Grape Juice", null], ["Bob", null], ["Fukuoka Fan", null], ["Ashton", null], ["Golf Club", null],
  ["Ab", "length"], ["ThisNameIsWayTooLong", "length"],
  ["Budi!!", "characters"], [" Budi", "characters"], ["Budi  Kid", "characters"], ["Bu😀di", "characters"],
  ["0812345678", "contact"], ["Call 08123", "contact"], ["www.kid", "contact"],
  ["Fuck", "blocked"], ["FUUUCK you", "blocked"], ["Anjing123", "blocked"], ["4nj1ng", "blocked"], ["Si Babi", "blocked"],
  ["Asu", "blocked"], ["kontol", "blocked"], ["Tai Kucing", "blocked"], ["Ngentot", "blocked"], ["B4ngs4t", "blocked"],
  ["F4ck", "blocked"], ["Fvck Off", "blocked"], ["Kntl", "blocked"],
];

describe("typed names", () => {
  it.each(NAME_SAMPLES)("%j → %s", (name, expected) => {
    expect(nicknameProblem(name)).toBe(expected);
  });

  it("tidies spaces like the server", () => {
    expect(cleanNickname("  Budi   Kid  ")).toBe("Budi Kid");
    expect(cleanNickname("   ")).toBe("");
  });

  it("uses the same word lists and limits as the server", () => {
    expect(sqlWords("leaderboard_blocked_anywhere")).toEqual(BLOCKED_ANYWHERE);
    expect(sqlWords("leaderboard_blocked_words")).toEqual(BLOCKED_WORDS);
    const { min, max, maxDigits } = LEADERBOARD.nickname;
    expect(NICKNAME_SQL).toContain(`char_length(p_nickname) < ${min} or char_length(p_nickname) > ${max}`);
    expect(NICKNAME_SQL).toContain(`'[^0-9]', '', 'g')) > ${maxDigits}`);
    expect(NICKNAME_SQL).toContain("translate(v_lower, '0134578', 'oieastb')");
  });

  it("knows the server's refusals", () => {
    expect(new LeaderboardError("nickname_blocked").nicknameProblem).toBe("blocked");
    expect(new LeaderboardError("nickname_whatever").nicknameProblem).toBeNull();
    expect(new LeaderboardError("implausible_time").nicknameProblem).toBeNull();
  });
});

describe("server responses", () => {
  it("parses boards and drops malformed rows", () => {
    const board = parseBoard([
      { rank: "2", adjective: 1, noun: 2, tag: 30, nickname: "Budi", time_ms: 21000, is_me: true, players: "3" },
      { rank: 1, adjective: 0, noun: 0, tag: 10, time_ms: 19000, is_me: false, players: 3 },
      { rank: 3, adjective: 99, noun: 0, tag: 10, time_ms: 25000, is_me: false, players: 3 },
    ]);
    expect(board.players).toBe(3);
    expect(board.rows.map((row) => row.rank)).toEqual([1, 2]);
    expect(board.rows[1]).toEqual({ rank: 2, callSign: { adjective: 1, noun: 2, tag: 30 }, nickname: "Budi", timeMs: 21000, isMe: true });
    expect(board.rows[0].nickname).toBeNull();
    expect(parseBoard(null)).toEqual({ rows: [], players: 0 });
  });

  it("parses a submission and knows refusals from failures", () => {
    expect(parseOutcome([{ best_ms: 15000, rank: 1, players: 2, improved: true }])).toEqual({ bestMs: 15000, rank: 1, players: 2, improved: true });
    expect(() => parseOutcome([])).toThrow(LeaderboardError);
    expect(new LeaderboardError("implausible_time").refused).toBe(true);
    expect(new LeaderboardError("Failed to fetch").refused).toBe(false);
  });
});

/** In-memory backend that behaves like the SQL functions closely enough for the client flow. */
function fakeRemote() {
  const calls: string[] = [];
  let tickets = 0;
  const backend = {
    calls,
    failStart: false,
    submitError: null as LeaderboardError | Error | null,
    callSign: null as CallSign | null,
    nickname: null as string | null,
    failSave: false,
    submitDelay: null as Promise<void> | null,
  };
  const remote: LeaderboardRemote = {
    async start(mission) {
      calls.push(`start:${mission}`);
      if (backend.failStart) throw new Error("offline");
      return `ticket-${++tickets}`;
    },
    async submit(ticket, timeMs) {
      calls.push(`submit:${ticket}:${timeMs}`);
      if (backend.submitDelay) await backend.submitDelay;
      if (backend.submitError) throw backend.submitError;
      return { bestMs: timeMs, rank: 1, players: 1, improved: true };
    },
    async top(mission) {
      calls.push(`top:${mission}`);
      return { rows: [], players: 0 };
    },
    async loadProfile() {
      return backend.callSign ? { callSign: backend.callSign, nickname: backend.nickname } : null;
    },
    async saveRandomName(sign) {
      calls.push("saveRandomName");
      if (backend.failSave) throw new Error("offline");
      backend.callSign = sign;
      backend.nickname = null;
    },
    async setNickname(nickname) {
      calls.push(`setNickname:${nickname}`);
      if (backend.failSave) throw new Error("offline");
      // Stands in for a word the client list doesn't know yet.
      if (nickname === "Sneaky Word") throw new LeaderboardError("nickname_blocked");
      backend.nickname = nickname;
      return nickname;
    },
  };
  return { backend, remote };
}

describe("leaderboard client flow", () => {
  let fake: ReturnType<typeof fakeRemote>;
  const run = (runId: number, mission: MissionId = "orbit-rings") => beginLeaderboardRun(runId, mission);
  const submission = () => useLeaderboardStore.getState().submission;

  beforeEach(() => {
    fake = fakeRemote();
    setLeaderboardSource(() => Promise.resolve(fake.remote));
    useAccountStore.setState({ status: "signedIn" });
    useLeaderboardStore.setState({ submission: null, boards: {}, callSign: null, nickname: null, callSignStatus: "idle" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    setLeaderboardSource(null);
    vi.restoreAllMocks();
  });

  it("asks for a ticket at the start and posts the time at the end", async () => {
    run(1);
    await finishLeaderboardRun(1, "orbit-rings", 23456.7);
    expect(fake.backend.calls).toEqual(["start:orbit-rings", "submit:ticket-1:23456.7"]);
    expect(submission()).toEqual({ runId: 1, state: { status: "ranked", outcome: { bestMs: 23456.7, rank: 1, players: 1, improved: true } } });
  });

  it("invites guests to sign in instead of posting", async () => {
    useAccountStore.setState({ status: "signedOut" });
    run(1);
    await finishLeaderboardRun(1, "orbit-rings", 20000);
    expect(fake.backend.calls).toEqual([]);
    expect(submission()?.state).toEqual({ status: "guest" });
  });

  it("stays out of the way without accounts and on photo missions", async () => {
    run(1, "red-spot-photo");
    await finishLeaderboardRun(1, "red-spot-photo", 90);
    useAccountStore.setState({ status: "unconfigured" });
    run(2);
    await finishLeaderboardRun(2, "orbit-rings", 20000);
    expect(fake.backend.calls).toEqual([]);
    expect(submission()).toBeNull();
  });

  it("tells refused times apart from connection trouble", async () => {
    fake.backend.submitError = new LeaderboardError("implausible_time");
    run(1);
    await finishLeaderboardRun(1, "orbit-rings", 20000);
    expect(submission()?.state).toEqual({ status: "refused" });
    fake.backend.submitError = new Error("Failed to fetch");
    run(2);
    await finishLeaderboardRun(2, "orbit-rings", 20000);
    expect(submission()?.state).toEqual({ status: "unavailable" });
    fake.backend.submitError = null;
    fake.backend.failStart = true;
    run(3);
    await finishLeaderboardRun(3, "orbit-rings", 20000);
    expect(submission()?.state).toEqual({ status: "unavailable" });
  });

  it("can't post a run that had no ticket (signed in mid-run)", async () => {
    useAccountStore.setState({ status: "signedOut" });
    run(1);
    useAccountStore.setState({ status: "signedIn" });
    await finishLeaderboardRun(1, "orbit-rings", 20000);
    expect(fake.backend.calls).toEqual([]);
    expect(submission()?.state).toEqual({ status: "unavailable" });
  });

  it("drops a late answer once the next run has started", async () => {
    let release = () => {};
    fake.backend.submitDelay = new Promise<void>((resolve) => (release = resolve));
    run(1);
    const posting = finishLeaderboardRun(1, "orbit-rings", 20000);
    await vi.waitFor(() => expect(fake.backend.calls).toContain("submit:ticket-1:20000"));
    run(2);
    release();
    await posting;
    expect(submission()).toBeNull();
  });

  it("caches boards and refetches after a new time", async () => {
    await loadBoard("orbit-rings");
    await loadBoard("orbit-rings");
    expect(fake.backend.calls.filter((call) => call.startsWith("top"))).toHaveLength(1);
    run(1);
    await finishLeaderboardRun(1, "orbit-rings", 20000);
    expect(useLeaderboardStore.getState().boards["orbit-rings"]?.loadedAt).toBe(0);
    await loadBoard("orbit-rings");
    expect(fake.backend.calls.filter((call) => call.startsWith("top"))).toHaveLength(2);
  });

  it("gives a first-time player a call sign and keeps the old one if a re-roll fails", async () => {
    await ensureProfile();
    const first = useLeaderboardStore.getState().callSign;
    expect(isCallSign(first)).toBe(true);
    expect(fake.backend.callSign).toEqual(first);
    fake.backend.failSave = true;
    await pickRandomName();
    expect(useLeaderboardStore.getState().callSign).toEqual(first);
    expect(useLeaderboardStore.getState().callSignStatus).toBe("error");
    fake.backend.failSave = false;
    await pickRandomName();
    expect(useLeaderboardStore.getState().callSign).not.toEqual(first);
    expect(fake.backend.callSign).toEqual(useLeaderboardStore.getState().callSign);
  });

  it("saves a typed name, refuses bad ones before asking the server, and can go back to a call sign", async () => {
    await ensureProfile();
    expect(await saveNickname("  Space   Budi ")).toBeNull();
    expect(useLeaderboardStore.getState().nickname).toBe("Space Budi");
    expect(fake.backend.calls).toContain("setNickname:Space Budi");
    expect(useLeaderboardStore.getState().boards).toEqual({});

    const before = fake.backend.calls.length;
    expect(await saveNickname("Anjing123")).toBe("blocked");
    expect(await saveNickname("Ab")).toBe("length");
    expect(fake.backend.calls).toHaveLength(before);

    expect(await saveNickname("Sneaky Word")).toBe("blocked");
    expect(useLeaderboardStore.getState().nickname).toBe("Space Budi");

    fake.backend.failSave = true;
    expect(await saveNickname("Rocket Rina")).toBe("error");
    expect(useLeaderboardStore.getState().nickname).toBe("Space Budi");
    fake.backend.failSave = false;

    expect(await saveNickname("   ")).toBeNull();
    expect(useLeaderboardStore.getState().nickname).toBeNull();
    expect(await saveNickname("Rocket Rina")).toBeNull();
    await pickRandomName();
    expect(useLeaderboardStore.getState().nickname).toBeNull();
    expect(fake.backend.nickname).toBeNull();
  });
});
