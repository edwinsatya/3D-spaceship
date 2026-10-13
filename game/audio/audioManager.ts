import { Howl, Howler } from "howler";
import { AUDIO } from "@/game/config/audio";
import { SETTINGS } from "@/game/config/settings";
import { SHIPS, type ShipId } from "@/game/data/ships";
import { clamp01, damp, lerp } from "@/game/systems/math";
import { encodeWav } from "./dsp";
import { engineSound, SOUND_BUILDERS, type SoundId, type SynthesizedSound } from "./synth";

const MUSIC_IDS: ReadonlySet<SoundId> = new Set(["music"]);

/** Optional real audio files; when present they replace the synthesized placeholder. */
export const AUDIO_FILES: Partial<Record<SoundId, string>> = {};
/** Optional recorded engine loops per ship (seamless loops). */
export const ENGINE_FILES: Partial<Record<ShipId, string>> = {};

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

/** Player volume sliders, 0..1 each (Settings → Sound). */
export type AudioMix = Record<"master" | "music" | "effects" | "engine", number>;

/**
 * Thin Howler wrapper: one Howl per sound, one engine loop per ship whose
 * pitch and volume follow the flight, ambient music, a four-channel mix
 * (master, music, effects, engine) and global mute/suspend.
 */
class AudioManager {
  private howls: Partial<Record<SoundId, Howl>> = {};
  private engines: Partial<Record<ShipId, Howl>> = {};
  private urls: string[] = [];
  private engineShip: ShipId | null = null;
  private engineId: number | null = null;
  private musicId: number | null = null;
  private musicDucked = false;
  private engineVolume = 0;
  private enginePitch: number = AUDIO.enginePitch.min;
  private engineTimer = 0;
  private engineMuted = false;
  private preview: { ship: ShipId; id: number; timer: ReturnType<typeof setTimeout> } | null = null;
  private mix: AudioMix = { ...SETTINGS.volume };
  private loaded: Promise<void> | null = null;
  /** Start was pressed before the music finished loading. */
  private musicRequested = false;

  /**
   * Synthesizes (or loads) every sound effect and engine; resolves when they
   * are ready. Music keeps loading in the background. Safe to call again.
   */
  load(onProgress?: (progress: number) => void): Promise<void> {
    this.loaded ??= this.loadAll(onProgress);
    return this.loaded;
  }

  private async loadAll(onProgress?: (progress: number) => void): Promise<void> {
    this.applyMaster();
    const ids = Object.keys(SOUND_BUILDERS) as SoundId[];
    const essential = ids.filter((id) => !DEFERRED.has(id));
    const total = essential.length + SHIPS.length;
    let done = 0;
    const tick = () => {
      done += 1;
      onProgress?.(done / total);
    };
    const pending: Promise<void>[] = [];
    for (const id of essential) {
      await yieldToMain();
      pending.push(this.createHowl(id).then(tick));
    }
    for (const ship of SHIPS) {
      await yieldToMain();
      pending.push(this.createEngine(ship.id, () => engineSound(ship.engine)).then(tick));
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

  private source(file: string | undefined, build: () => SynthesizedSound): { src: string; format?: string[] } {
    if (file) return { src: file };
    const sound = build();
    const src = URL.createObjectURL(new Blob([encodeWav(sound.samples, sound.sampleRate)], { type: "audio/wav" }));
    this.urls.push(src);
    return { src, format: ["wav"] };
  }

  private whenLoaded(howl: Howl): Promise<void> {
    return new Promise<void>((resolve) => {
      if (howl.state() === "loaded") resolve();
      else {
        howl.once("load", () => resolve());
        howl.once("loaderror", () => resolve());
      }
    });
  }

  private createHowl(id: SoundId): Promise<void> {
    const { src, format } = this.source(AUDIO_FILES[id], SOUND_BUILDERS[id]);
    const music = MUSIC_IDS.has(id);
    const howl = new Howl({ src: [src], format, loop: music, volume: music ? this.musicLevel() : this.effectsLevel(), preload: true });
    this.howls[id] = howl;
    return this.whenLoaded(howl);
  }

  private createEngine(ship: ShipId, build: () => SynthesizedSound): Promise<void> {
    const { src, format } = this.source(ENGINE_FILES[ship], build);
    const howl = new Howl({ src: [src], format, loop: true, volume: 0, preload: true });
    this.engines[ship] = howl;
    return this.whenLoaded(howl);
  }

  private musicLevel(): number {
    return AUDIO.musicVolume * this.mix.music * (this.musicDucked ? 0.4 : 1);
  }

  private effectsLevel(): number {
    return AUDIO.sfxVolume * this.mix.effects;
  }

  private applyMaster(): void {
    Howler.volume(AUDIO.masterVolume * this.mix.master);
  }

  /** Volume sliders changed: applies at once (also to sounds already playing). */
  setMix(mix: AudioMix): void {
    this.mix = { ...mix };
    this.applyMaster();
    for (const [id, howl] of Object.entries(this.howls) as [SoundId, Howl][]) {
      if (!MUSIC_IDS.has(id)) howl.volume(this.effectsLevel());
    }
    const music = this.howls.music;
    if (music && this.musicId !== null) music.volume(this.musicLevel(), this.musicId);
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
    if (options.volume !== undefined) howl.volume(options.volume * this.effectsLevel(), soundId);
  }

  startMusic(): void {
    this.musicRequested = true;
    const howl = this.howls.music;
    if (!howl || howl.state() !== "loaded" || (this.musicId !== null && howl.playing(this.musicId))) return;
    this.musicId = howl.play();
    howl.fade(0, this.musicLevel(), AUDIO.musicFadeIn * 1000, this.musicId);
  }

  setMusicDucked(ducked: boolean): void {
    this.musicDucked = ducked;
    const howl = this.howls.music;
    if (!howl || this.musicId === null) return;
    howl.fade(howl.volume(this.musicId) as number, this.musicLevel(), 400, this.musicId);
  }

  /** Starts (or switches to) the engine loop of `ship`. */
  startEngine(ship: ShipId): void {
    this.stopPreview();
    if (this.engineShip !== ship) this.stopEngine();
    const howl = this.engines[ship];
    if (!howl) return;
    if (this.engineId === null || !howl.playing(this.engineId)) {
      this.engineId = howl.play();
      howl.volume(0, this.engineId);
    }
    this.engineShip = ship;
    this.engineMuted = false;
  }

  stopEngine(): void {
    const howl = this.engineShip ? this.engines[this.engineShip] : undefined;
    if (howl && this.engineId !== null) howl.stop(this.engineId);
    this.engineId = null;
    this.engineShip = null;
    this.engineVolume = 0;
  }

  /** Hangar: a short rev of a ship's engine when you pick it. */
  previewEngine(ship: ShipId): void {
    this.stopPreview();
    const howl = this.engines[ship];
    if (!howl || this.engineId !== null) return;
    const id = howl.play();
    const level = AUDIO.engineVolume.max * this.mix.engine;
    const { duration, fade } = AUDIO.enginePreview;
    howl.rate(AUDIO.enginePitch.max, id);
    howl.fade(0, level, fade * 1000, id);
    const timer = setTimeout(() => {
      howl.fade(level, 0, fade * 1000, id);
      setTimeout(() => howl.stop(id), fade * 1000);
    }, duration * 1000);
    this.preview = { ship, id, timer };
  }

  private stopPreview(): void {
    if (!this.preview) return;
    clearTimeout(this.preview.timer);
    this.engines[this.preview.ship]?.stop(this.preview.id);
    this.preview = null;
  }

  /** Silences the engine while paused / in the map or photo mode without losing its loop position. */
  setEngineMuted(muted: boolean): void {
    this.engineMuted = muted;
    const howl = this.engineShip ? this.engines[this.engineShip] : undefined;
    if (howl && this.engineId !== null && muted) howl.volume(0, this.engineId);
  }

  /**
   * Called every frame; only touches Howler every `engineUpdateInterval`.
   * `speed01` = 0..1 of max speed (can exceed 1 while boosting).
   */
  updateEngine(speed01: number, throttle: number, boosting: boolean, dt: number): void {
    const howl = this.engineShip ? this.engines[this.engineShip] : undefined;
    if (!howl || this.engineId === null || this.engineMuted) return;
    const { idle, max, boost } = AUDIO.engineVolume;
    const targetVolume = (boosting ? boost : lerp(idle, max, clamp01(Math.max(speed01, throttle * 0.6)))) * this.mix.engine;
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
    this.stopPreview();
    for (const howl of [...Object.values(this.howls), ...Object.values(this.engines)]) howl?.unload();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.howls = {};
    this.engines = {};
    this.urls = [];
    this.engineId = null;
    this.engineShip = null;
    this.musicId = null;
    this.loaded = null;
    this.musicRequested = false;
  }
}

export const audio = new AudioManager();
