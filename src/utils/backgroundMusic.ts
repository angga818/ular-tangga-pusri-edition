import { Howl, Howler } from 'howler';
import { useSyncExternalStore } from 'react';

export interface MusicTrack {
  label: string;
  src: string[];
  loop?: boolean;
  volume?: number;
}

export interface MusicManifest {
  default: MusicTrack;
  themes?: Record<string, MusicTrack>;
}

export interface MusicSnapshot {
  enabled: boolean;
  muted: boolean;
  playing: boolean;
  loaded: boolean;
  volume: number;
  trackLabel: string;
  error: string | null;
}

const PREFS_KEY = 'pusri.bgm.prefs.v1';
const MANIFEST_URL = '/assets/audio/manifest.json';

const FALLBACK_MANIFEST: MusicManifest = {
  default: {
    label: 'BGM Utama',
    src: ['/assets/audio/background-music.wav'],
    loop: true,
    volume: 0.32,
  },
};

interface MusicPrefs {
  enabled: boolean;
  muted: boolean;
  volume: number;
}

const DEFAULT_PREFS: MusicPrefs = { enabled: true, muted: false, volume: 0.32 };

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREFS.volume;
  return Math.min(1, Math.max(0, value));
}

class BackgroundMusicEngine {
  private manifest: MusicManifest = FALLBACK_MANIFEST;
  private howl: Howl | null = null;
  private currentTrack: MusicTrack | null = null;
  private loadedSrc: string | null = null;
  private currentThemeId = 'default';
  private sourceIndex = 0;
  private prefs: MusicPrefs = { ...DEFAULT_PREFS };
  private hasStoredPrefs = false;
  private gestureSeen = false;
  private initialized = false;
  private listeners = new Set<() => void>();

  private snapshot: MusicSnapshot = {
    enabled: true,
    muted: false,
    playing: false,
    loaded: false,
    volume: DEFAULT_PREFS.volume,
    trackLabel: FALLBACK_MANIFEST.default.label,
    error: null,
  };

  constructor() {
    if (typeof window === 'undefined') return;
    Howler.autoUnlock = true;
    this.readPrefs();
    this.bindUnlockGestures();
  }

  // === Public API ===

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.loadManifest();
  }

  play(themeId = 'default'): void {
    this.init();
    this.currentThemeId = themeId;
    const track = this.resolveTrack(themeId);

    if (this.currentTrack && this.sameTrack(this.currentTrack, track)) {
      this.ensureHowl();
      if (this.prefs.enabled) this.howl?.play();
      this.update({ trackLabel: track.label });
      return;
    }

    this.currentTrack = track;
    this.sourceIndex = 0;
    this.ensureHowl();
    if (this.prefs.enabled && this.gestureSeen) this.howl?.play();
    this.update({ trackLabel: track.label });
  }

  playForTheme(themeId: string): void {
    this.play(themeId);
  }

  pause(): void {
    this.prefs.enabled = false;
    this.howl?.pause();
    this.persistPrefs();
    this.update({ enabled: false, playing: false });
  }

  resume(): void {
    this.prefs.enabled = true;
    this.persistPrefs();
    this.ensureHowl();
    if (this.gestureSeen) this.howl?.play();
    this.update({ enabled: true });
  }

  toggleEnabled(): void {
    if (this.prefs.enabled) this.pause();
    else this.resume();
  }

  toggleMute(): void {
    this.prefs.muted = !this.prefs.muted;
    this.persistPrefs();
    this.applyVolume();
    this.update({ muted: this.prefs.muted });
  }

  setVolume(value: number): void {
    this.prefs.volume = clampVolume(value);
    this.persistPrefs();
    this.applyVolume();
    this.update({ volume: this.prefs.volume });
  }

  getVolume(): number {
    return this.prefs.volume;
  }

  isMuted(): boolean {
    return this.prefs.muted;
  }

  isEnabled(): boolean {
    return this.prefs.enabled;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): MusicSnapshot => this.snapshot;

  // === Internals ===

  private readPrefs(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MusicPrefs>;
      this.prefs = {
        enabled: parsed.enabled !== false,
        muted: Boolean(parsed.muted),
        volume: clampVolume(Number(parsed.volume ?? DEFAULT_PREFS.volume)),
      };
      this.hasStoredPrefs = true;
    } catch {
      this.prefs = { ...DEFAULT_PREFS };
    }
    this.snapshot = {
      ...this.snapshot,
      enabled: this.prefs.enabled,
      muted: this.prefs.muted,
      volume: this.prefs.volume,
    };
  }

  private persistPrefs(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* storage penuh / dinonaktifkan — volume tetap jalan di memori */
    }
  }

  private bindUnlockGestures(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.gestureSeen = true;
      Howler.ctx?.resume?.().catch(() => {});
      if (this.prefs.enabled) {
        this.ensureHowl();
        this.howl?.play();
      }
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    for (const event of events) {
      window.addEventListener(event, unlock, { passive: true });
    }
  }

  private async loadManifest(): Promise<void> {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<MusicManifest>;
      if (data?.default?.src?.length) {
        this.manifest = {
          default: data.default,
          themes: data.themes || {},
        };
      }
      if (!this.hasStoredPrefs && this.manifest.default.volume !== undefined) {
        this.prefs.volume = clampVolume(this.manifest.default.volume);
        this.update({ volume: this.prefs.volume });
      }
    } catch (err) {
      this.update({ error: err instanceof Error ? err.message : 'Manifest audio tidak terbaca' });
    } finally {
      this.play(this.currentThemeId);
    }
  }

  private resolveTrack(themeId: string): MusicTrack {
    const themed = this.manifest.themes?.[themeId];
    if (themed?.src?.length) return themed;
    return this.manifest.default;
  }

  private sameTrack(a: MusicTrack, b: MusicTrack): boolean {
    return a.src.join('|') === b.src.join('|');
  }

  private ensureHowl(): void {
    const track = this.currentTrack || this.manifest.default;
    if (!this.currentTrack) this.currentTrack = track;

    const wantedSrc = track.src[this.sourceIndex] || track.src[0];
    if (this.howl && this.loadedSrc === wantedSrc) {
      this.applyVolume();
      return;
    }

    if (this.howl) {
      this.howl.unload();
      this.howl = null;
      this.loadedSrc = null;
    }

    this.sourceIndex = 0;
    this.loadSource(track);
  }

  private loadSource(track: MusicTrack): void {
    const src = track.src[this.sourceIndex];
    if (!src) {
      this.update({ error: 'File audio tidak ditemukan', loaded: false });
      return;
    }

    this.update({ loaded: false, error: null });
    this.loadedSrc = src;

    const howl = new Howl({
      src: [src],
      loop: track.loop !== false,
      volume: this.effectiveVolume(),
      html5: false,
      preload: true,
      onload: () => {
        this.update({ loaded: true, error: null });
        if (this.prefs.enabled && this.gestureSeen) howl.play();
      },
      onloaderror: (_id, error) => {
        const nextIndex = this.sourceIndex + 1;
        if (nextIndex < track.src.length) {
          this.sourceIndex = nextIndex;
          howl.unload();
          this.loadSource(track);
          return;
        }
        this.update({
          loaded: false,
          error: `Gagal memuat audio: ${String(error)}`,
        });
      },
      onplay: () => this.update({ playing: true }),
      onpause: () => this.update({ playing: false }),
      onstop: () => this.update({ playing: false }),
      onend: () => {
        if (!track.loop) this.update({ playing: false });
      },
    });

    this.howl = howl;
  }

  private effectiveVolume(): number {
    return this.prefs.muted ? 0 : this.prefs.volume;
  }

  private applyVolume(): void {
    this.howl?.volume(this.effectiveVolume());
  }

  private update(patch: Partial<MusicSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    if (
      next.enabled === this.snapshot.enabled &&
      next.muted === this.snapshot.muted &&
      next.playing === this.snapshot.playing &&
      next.loaded === this.snapshot.loaded &&
      next.volume === this.snapshot.volume &&
      next.trackLabel === this.snapshot.trackLabel &&
      next.error === this.snapshot.error
    ) {
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

export const backgroundMusic = new BackgroundMusicEngine();

export function useBackgroundMusic(): MusicSnapshot {
  return useSyncExternalStore(
    backgroundMusic.subscribe,
    backgroundMusic.getSnapshot,
    backgroundMusic.getSnapshot,
  );
}
