export const SEQUENCER_STORAGE_KEY = 'pg_sequencer_v1';
export const TRACK_IDS = ['kick', 'snare', 'hat', 'tone'] as const;
export type TrackId = typeof TRACK_IDS[number];

export const TRACK_LABELS: Record<TrackId, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hat: 'Hat',
  tone: 'Tone',
};

export const STEP_COUNT = 16;
export const MIN_BPM = 60;
export const MAX_BPM = 180;

export type SequencerPattern = Record<TrackId, boolean[]>;

export type SequencerState = {
  bpm: number;
  pattern: SequencerPattern;
  muted: Record<TrackId, boolean>;
};

export const EMPTY_PATTERN: SequencerPattern = {
  kick: Array(STEP_COUNT).fill(false),
  snare: Array(STEP_COUNT).fill(false),
  hat: Array(STEP_COUNT).fill(false),
  tone: Array(STEP_COUNT).fill(false),
};

export const DEFAULT_PATTERN: SequencerPattern = {
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  tone: [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false],
};

export function clonePattern(pattern: SequencerPattern): SequencerPattern {
  return {
    kick: [...pattern.kick],
    snare: [...pattern.snare],
    hat: [...pattern.hat],
    tone: [...pattern.tone],
  };
}

export function createSequencerState(): SequencerState {
  return {
    bpm: 110,
    pattern: clonePattern(DEFAULT_PATTERN),
    muted: { kick: false, snare: false, hat: false, tone: false },
  };
}

function validTrack(value: unknown): boolean[] {
  if (!Array.isArray(value)) return Array(STEP_COUNT).fill(false);
  return Array.from({ length: STEP_COUNT }, (_, index) => value[index] === true);
}

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 110;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value)));
}

export function sanitizeSequencerState(value: unknown): SequencerState {
  const fallback = createSequencerState();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<SequencerState>;
  const rawPattern = raw.pattern as Partial<SequencerPattern> | undefined;
  const rawMuted = raw.muted as Partial<Record<TrackId, unknown>> | undefined;
  return {
    bpm: clampBpm(typeof raw.bpm === 'number' ? raw.bpm : fallback.bpm),
    pattern: {
      kick: validTrack(rawPattern?.kick),
      snare: validTrack(rawPattern?.snare),
      hat: validTrack(rawPattern?.hat),
      tone: validTrack(rawPattern?.tone),
    },
    muted: {
      kick: rawMuted?.kick === true,
      snare: rawMuted?.snare === true,
      hat: rawMuted?.hat === true,
      tone: rawMuted?.tone === true,
    },
  };
}

export function loadSequencerState(storage: Pick<Storage, 'getItem'> | null | undefined): SequencerState {
  const fallback = createSequencerState();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(SEQUENCER_STORAGE_KEY);
    return raw ? sanitizeSequencerState(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveSequencerState(storage: Pick<Storage, 'setItem'> | null | undefined, state: SequencerState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SEQUENCER_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function toggleStep(pattern: SequencerPattern, track: TrackId, step: number): SequencerPattern {
  if (!Number.isInteger(step) || step < 0 || step >= STEP_COUNT) return pattern;
  const next = clonePattern(pattern);
  next[track][step] = !next[track][step];
  return next;
}

export function clearPattern(): SequencerPattern { return clonePattern(EMPTY_PATTERN); }
export function presetPattern(): SequencerPattern { return clonePattern(DEFAULT_PATTERN); }

/** Duration of one sixteenth-note step, in milliseconds. */
export function stepDurationMs(bpm: number): number {
  return 60000 / clampBpm(bpm) / 4;
}

export function nextStep(step: number): number { return (step + 1) % STEP_COUNT; }

export function stepAtTime(startTimeMs: number, nowMs: number, bpm: number): number {
  if (!Number.isFinite(startTimeMs) || !Number.isFinite(nowMs) || nowMs < startTimeMs) return 0;
  return Math.floor((nowMs - startTimeMs) / stepDurationMs(bpm)) % STEP_COUNT;
}
