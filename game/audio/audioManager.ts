import { Howl, Howler } from "howler";
import { AUDIO } from "@/game/config/audio";
import { clamp01, damp, lerp } from "@/game/systems/math";
import { encodeWav } from "./dsp";
import { SOUND_BUILDERS, type SoundId } from "./synth";

const LOOPING: ReadonlySet<SoundId> = new Set(["engine", "music"]);
const MUSIC_IDS: ReadonlySet<SoundId> = new Set(["music"]);

/** Optional real audio files; when present they replace the synthesized placeholder. */
export const AUDIO_FILES: Partial<Record<SoundId, string>> = {};

/** Yields to the event loop (not rAF: background tabs throttle animation frames). */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Sounds that can arrive after the loading screen (only needed after "Start"). */
const DEFERRED: ReadonlySet<SoundId> = new Set(["music"]);

export interface PlayOptions {
  rate?: number;
  volume?: number;
}

/**
 * Thin Howler wrapper: one Howl per sound, an engine loop whose pitch and
 * volume follow the ship, ambient music, and global mute/suspend.
 */
class AudioManager {
  private howls: Partial<Record<SoundId, Howl>> = {};
  private urls: string[] = [];
  private engineId: number | null = null;
  private musicId: number | null = null;
  private engineVolume = 0;
  private enginePitch: number = AUDIO.enginePitch.min;
  private engineTimer = 0;
  private engineMuted = false;
  private loaded: Promise<void> | null = null;
  /** Start was pressed before the music finished loading. */
  private musicRequested = false;

  /**
   * Synthesizes (or loads) every sound effect; resolves when they are ready.
   * Music keeps loading in the background. Safe to call more than once.
   */
  load(onProgress?: (progress: number) => void): Promise<void> {
    this.loaded ??= this.loadAll(onProgress);
    return this.loaded;
  }

  private async loadAll(onProgress?: (progress: number) => void): Promise<void> {
    Howler.volume(AUDIO.masterVolume);
    const ids = Object.keys(SOUND_BUILDERS) as SoundId[];
    const essential = ids.filter((id) => !DEFERRED.has(id));
    let done = 0;
    const pending: Promise<void>[] = [];
    for (const id of essential) {
      await yieldToMain();
      pending.push(
        this.createHowl(id).then(() => {
          done += 1;
          onProgress?.(done / essential.length);
        }),
      );
    }
    await Promise.all(pending);
    void this.loadDeferred(ids.filter((id) => DEFERRED.has(id)));
  }

  private async loadDeferred(ids: SoundId[]): Promise<void> {
    for (const id of ids) {
      await yieldToMain();
      await this.createHowl(id);
    }
    if (this.musicRequested) this.startMusic();
  }

  private createHowl(id: SoundId): Promise<void> {
    let src = AUDIO_FILES[id];
    let format: string[] | undefined;
    if (!src) {
      const sound = SOUND_BUILDERS[id]();
      src = URL.createObjectURL(new Blob([encodeWav(sound.samples, sound.sampleRate)], { type: "audio/wav" }));
      this.urls.push(src);
      format = ["wav"];
    }
    const howl = new Howl({
      src: [src],
      format,
      loop: LOOPING.has(id),
      volume: MUSIC_IDS.has(id) ? AUDIO.musicVolume : AUDIO.sfxVolume,
      preload: true,
    });
    this.howls[id] = howl;
    return new Promise<void>((resolve) => {
      if (howl.state() === "loaded") resolve();
      else {
        howl.once("load", () => resolve());
        howl.once("loaderror", () => resolve());
      }
    });
  }

  /** Must run inside a user gesture (the Start button) to satisfy autoplay rules. */
  unlock(): void {
    const context = Howler.ctx;
    if (context && context.state !== "running") void context.resume();
  }

  play(id: SoundId, options: PlayOptions = {}): void {
    const howl = this.howls[id];
    if (!howl) return;
    const soundId = howl.play();
    if (options.rate !== undefined) howl.rate(options.rate, soundId);
    if (options.volume !== undefined) howl.volume(options.volume * AUDIO.sfxVolume, soundId);
  }

  startMusic(): void {
    this.musicRequested = true;
    const howl = this.howls.music;
    if (!howl || howl.state() !== "loaded" || (this.musicId !== null && howl.playing(this.musicId))) return;
    this.musicId = howl.play();
    howl.fade(0, AUDIO.musicVolume, AUDIO.musicFadeIn * 1000, this.musicId);
  }

  setMusicDucked(ducked: boolean): void {
    const howl = this.howls.music;
    if (!howl || this.musicId === null) return;
    howl.fade(howl.volume(this.musicId) as number, ducked ? AUDIO.musicVolume * 0.4 : AUDIO.musicVolume, 400, this.musicId);
  }

  startEngine(): void {
    const howl = this.howls.engine;
    if (!howl) return;
    if (this.engineId === null || !howl.playing(this.engineId)) {
      this.engineId = howl.play();
      howl.volume(0, this.engineId);
    }
    this.engineMuted = false;
  }

  stopEngine(): void {
    const howl = this.howls.engine;
    if (!howl || this.engineId === null) return;
    howl.stop(this.engineId);
    this.engineId = null;
    this.engineVolume = 0;
  }

  /** Silences the engine while paused without losing its loop position. */
  setEngineMuted(muted: boolean): void {
    this.engineMuted = muted;
    const howl = this.howls.engine;
    if (howl && this.engineId !== null && muted) howl.volume(0, this.engineId);
  }

  /**
   * Called every frame; only touches Howler every `engineUpdateInterval`.
   * `speed01` = 0..1 of max speed (can exceed 1 while boosting).
   */
  updateEngine(speed01: number, throttle: number, boosting: boolean, dt: number): void {
    const howl = this.howls.engine;
    if (!howl || this.engineId === null || this.engineMuted) return;
    const { idle, max, boost } = AUDIO.engineVolume;
    const targetVolume = boosting ? boost : lerp(idle, max, clamp01(Math.max(speed01, throttle * 0.6)));
    const pitch = AUDIO.enginePitch;
    const targetPitch = boosting ? pitch.boost : lerp(pitch.min, pitch.max, clamp01(speed01));
    this.engineVolume = damp(this.engineVolume, targetVolume, AUDIO.engineResponse, dt);
    this.enginePitch = damp(this.enginePitch, targetPitch, AUDIO.engineResponse, dt);
    this.engineTimer += dt;
    if (this.engineTimer < AUDIO.engineUpdateInterval) return;
    this.engineTimer = 0;
    howl.volume(this.engineVolume, this.engineId);
    howl.rate(this.enginePitch, this.engineId);
  }

  setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  /** Tab hidden → suspend the whole audio context (saves battery). */
  suspend(): void {
    const context = Howler.ctx;
    if (context && context.state === "running") void context.suspend();
  }

  resume(): void {
    const context = Howler.ctx;
    if (context && context.state === "suspended") void context.resume();
  }

  dispose(): void {
    for (const howl of Object.values(this.howls)) howl?.unload();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.howls = {};
    this.urls = [];
    this.engineId = null;
    this.musicId = null;
    this.loaded = null;
    this.musicRequested = false;
  }
}

export const audio = new AudioManager();
