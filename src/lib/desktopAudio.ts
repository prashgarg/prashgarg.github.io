/** Shared audio state for the room, desktop, and small desktop accessories. */

export const DESKTOP_VOLUME_KEY = 'pg_volume_v1';
export const DESKTOP_MUTED_KEY = 'pg_muted';
const LAST_NONZERO_VOLUME_KEY = 'pg_last_nonzero_volume_v1';
const VOLUME_EVENT = 'pg-volume';
const MUTE_EVENT = 'pg-room-mute';

const DEFAULT_VOLUME = 0.6;
const EPSILON = 0.001;

export interface DesktopAudioState {
  /** Stored slider preference, kept positive so mute can be reversed. */
  volume: number;
  muted: boolean;
  effectiveVolume: number;
}

function clamp(value: unknown, fallback = DEFAULT_VOLUME): number {
  if (value === null || value === undefined || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function sameOriginTop(): Window | null {
  if (typeof window === 'undefined') return null;
  try {
    const top = window.top;
    if (top && top.location.origin === window.location.origin) return top;
  } catch { /* cross-origin parents are outside this audio surface */ }
  return window;
}

function eventWindows(): Window[] {
  if (typeof window === 'undefined') return [];
  const top = sameOriginTop();
  return top && top !== window ? [window, top] : [window];
}

function readLocal(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeLocal(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* storage may be blocked */ }
}

function readSession(key: string): string | null {
  const top = sameOriginTop();
  for (const owner of top && top !== window ? [top, window] : [window]) {
    try {
      const value = owner.sessionStorage.getItem(key);
      if (value !== null) return value;
    } catch { /* continue to the next accessible storage owner */ }
  }
  return null;
}

function writeSession(key: string, value: string | null): void {
  for (const owner of eventWindows()) {
    try {
      if (value === null) owner.sessionStorage.removeItem(key);
      else owner.sessionStorage.setItem(key, value);
    } catch { /* storage may be blocked */ }
  }
}

function notify(): void {
  const state = readDesktopAudio();
  for (const target of eventWindows()) {
    try {
      target.dispatchEvent(new CustomEvent(VOLUME_EVENT, { detail: state }));
      target.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: state }));
    } catch { /* older or restricted documents may not expose CustomEvent */ }
  }
}

function storedVolume(): number {
  const value = clamp(readLocal(DESKTOP_VOLUME_KEY), DEFAULT_VOLUME);
  if (value > EPSILON) return value;
  return clamp(readLocal(LAST_NONZERO_VOLUME_KEY), DEFAULT_VOLUME);
}

export function readDesktopAudio(): DesktopAudioState {
  if (typeof window === 'undefined') {
    return { volume: DEFAULT_VOLUME, muted: false, effectiveVolume: DEFAULT_VOLUME };
  }
  const volume = storedVolume();
  let muted = false;
  try { muted = readSession(DESKTOP_MUTED_KEY) === '1'; } catch { /* default to unmuted */ }
  // Older builds represented mute by writing a literal zero to the volume
  // key without setting pg_muted. Treat that legacy value as muted once,
  // while keeping the previous nonzero preference available for unmute.
  const legacyZero = readLocal(DESKTOP_VOLUME_KEY) === '0' && !muted;
  muted = muted || legacyZero;
  return { volume, muted, effectiveVolume: muted ? 0 : volume };
}

export function readDesktopVolume(): number { return readDesktopAudio().volume; }
export function readDesktopMuted(): boolean { return readDesktopAudio().muted; }
export function readEffectiveDesktopVolume(): number { return readDesktopAudio().effectiveVolume; }

/** Subscribe to changes from the tray, room HUD, other pages, or an iframe. */
export function subscribeDesktopAudio(callback: (state: DesktopAudioState) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const targets = eventWindows();
  const onChange = () => callback(readDesktopAudio());
  const onStorage = (event: StorageEvent) => {
    if (event.key === DESKTOP_VOLUME_KEY || event.key === DESKTOP_MUTED_KEY || event.key === LAST_NONZERO_VOLUME_KEY) onChange();
  };
  for (const target of targets) {
    try {
      target.addEventListener(VOLUME_EVENT, onChange);
      target.addEventListener(MUTE_EVENT, onChange);
      target.addEventListener('storage', onStorage);
    } catch { /* inaccessible window */ }
  }
  callback(readDesktopAudio());
  return () => {
    for (const target of targets) {
      try {
        target.removeEventListener(VOLUME_EVENT, onChange);
        target.removeEventListener(MUTE_EVENT, onChange);
        target.removeEventListener('storage', onStorage);
      } catch { /* inaccessible window */ }
    }
  };
}

export function setDesktopMuted(muted: boolean): DesktopAudioState {
  const rawVolume = readLocal(DESKTOP_VOLUME_KEY);
  if (!muted && (rawVolume === null || clamp(rawVolume, 0) <= EPSILON)) {
    writeLocal(DESKTOP_VOLUME_KEY, String(storedVolume()));
  }
  writeSession(DESKTOP_MUTED_KEY, muted ? '1' : null);
  notify();
  return readDesktopAudio();
}

export function toggleDesktopMuted(): DesktopAudioState {
  return setDesktopMuted(!readDesktopMuted());
}

/** Set the slider. A zero value mutes while retaining the previous preference. */
export function setDesktopVolume(value: number): DesktopAudioState {
  const volume = clamp(value, 0);
  if (volume > EPSILON) {
    writeLocal(DESKTOP_VOLUME_KEY, String(volume));
    writeLocal(LAST_NONZERO_VOLUME_KEY, String(volume));
    writeSession(DESKTOP_MUTED_KEY, null);
  } else {
    const previous = storedVolume();
    writeLocal(LAST_NONZERO_VOLUME_KEY, String(previous > EPSILON ? previous : DEFAULT_VOLUME));
    writeSession(DESKTOP_MUTED_KEY, '1');
  }
  notify();
  return readDesktopAudio();
}
