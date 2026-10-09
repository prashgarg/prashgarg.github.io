export type FocusTimerMode = 'countdown' | 'stopwatch';
export type FocusTimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface FocusTimerState {
  mode: FocusTimerMode;
  status: FocusTimerStatus;
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  laps: number[];
}

interface PersistedFocusTimer {
  version: 1;
  mode: FocusTimerMode;
  status: FocusTimerStatus;
  durationMs: number;
  elapsedMs: number;
  startedAt: number | null;
  deadline: number | null;
  laps: number[];
  completionNotified: boolean;
  updatedAt: number;
  tabId: string;
}

const STORAGE_KEY = 'pg_focus_timer_v1';
const DEFAULT_MINUTES = 25;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const MAX_LAPS = 100;
const TICK_MS = 250;

const listeners = new Set<() => void>();
const serverSnapshot: FocusTimerState = {
  mode: 'countdown', status: 'idle', durationMs: DEFAULT_MINUTES * 60_000,
  elapsedMs: 0, remainingMs: DEFAULT_MINUTES * 60_000, laps: [],
};
let snapshot: FocusTimerState = serverSnapshot;
let tabId = `focus-${Math.random().toString(36).slice(2)}-${Date.now()}`;
let rawState: PersistedFocusTimer = defaultState();
let initialized = false;
let interval: ReturnType<typeof setInterval> | null = null;

export function clampFocusMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

export function formatFocusTime(milliseconds: number, rounding: 'ceil' | 'floor' = 'ceil'): string {
  const totalSeconds = Math.max(0, Math[rounding](milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function calculateFocusDisplay(state: Pick<PersistedFocusTimer, 'mode' | 'status' | 'durationMs' | 'elapsedMs' | 'startedAt' | 'deadline' | 'laps'>, now = Date.now()): FocusTimerState {
  const durationMs = state.durationMs;
  let elapsedMs = state.elapsedMs;
  let remainingMs = state.mode === 'countdown' ? Math.max(0, durationMs - elapsedMs) : 0;
  if (state.status === 'running') {
    if (state.mode === 'countdown' && state.deadline !== null) {
      remainingMs = Math.max(0, state.deadline - now);
      elapsedMs = Math.min(durationMs, durationMs - remainingMs);
    } else if (state.mode === 'stopwatch' && state.startedAt !== null) {
      elapsedMs = Math.max(0, Math.floor(state.elapsedMs + now - state.startedAt));
    }
  }
  return { mode: state.mode, status: state.status, durationMs, elapsedMs, remainingMs, laps: [...state.laps] };
}

function defaultState(now = Date.now()): PersistedFocusTimer {
  return {
    version: 1, mode: 'countdown', status: 'idle', durationMs: DEFAULT_MINUTES * 60_000,
    elapsedMs: 0, startedAt: null, deadline: null, laps: [], completionNotified: false,
    updatedAt: now, tabId,
  };
}

function validState(value: unknown): value is PersistedFocusTimer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersistedFocusTimer>;
  const nonNegativeFinite = (number: unknown): number is number => typeof number === 'number' && Number.isFinite(number) && number >= 0;
  const validTimestamp = (number: unknown): number is number => nonNegativeFinite(number) && number <= Number.MAX_SAFE_INTEGER;
  const validDuration = typeof candidate.durationMs === 'number' && Number.isFinite(candidate.durationMs)
    && candidate.durationMs >= MIN_MINUTES * 60_000 && candidate.durationMs <= MAX_MINUTES * 60_000;
  const validElapsed = nonNegativeFinite(candidate.elapsedMs) && candidate.elapsedMs <= Number.MAX_SAFE_INTEGER;
  return candidate.version === 1 && (candidate.mode === 'countdown' || candidate.mode === 'stopwatch')
    && (candidate.status === 'idle' || candidate.status === 'running' || candidate.status === 'paused' || candidate.status === 'finished')
    && validDuration && validElapsed
    && (candidate.startedAt === null || validTimestamp(candidate.startedAt))
    && (candidate.deadline === null || validTimestamp(candidate.deadline))
    && Array.isArray(candidate.laps) && candidate.laps.length <= MAX_LAPS
    && candidate.laps.every(lap => nonNegativeFinite(lap) && lap <= Number.MAX_SAFE_INTEGER)
    && typeof candidate.completionNotified === 'boolean' && validTimestamp(candidate.updatedAt)
    && typeof candidate.tabId === 'string' && candidate.tabId.length <= 120
    && (candidate.status === 'running'
      ? (candidate.mode === 'countdown' ? candidate.deadline !== null : candidate.startedAt !== null)
      : candidate.startedAt === null && candidate.deadline === null);
}

function readStored(): PersistedFocusTimer | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return validState(parsed) ? { ...parsed, laps: [...parsed.laps] } : null;
  } catch { return null; }
}

function writeStored() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rawState)); } catch { /* private browsing / blocked storage */ }
}

function emit() {
  snapshot = calculateFocusDisplay(rawState);
  listeners.forEach(listener => listener());
}

function finishCountdown(announce: boolean) {
  if (rawState.mode !== 'countdown' || rawState.status !== 'running') return;
  const runUpdatedAt = rawState.updatedAt;
  const latest = readStored();
  // A newer start/pause/reset in another tab wins over this stale deadline.
  if (latest && latest.updatedAt > runUpdatedAt) {
    rawState = { ...latest, laps: [...latest.laps] };
    if (rawState.status === 'running') ensureScheduler(); else stopScheduler();
    emit();
    return;
  }
  // Two open tabs can reach the same deadline. If another tab already wrote
  // the finished state for this run, adopt it without emitting a second chime.
  if (announce && latest && latest.status === 'finished' && latest.mode === 'countdown'
    && latest.durationMs === rawState.durationMs && latest.completionNotified && latest.updatedAt >= runUpdatedAt) {
    rawState = { ...latest, laps: [...latest.laps] };
    stopScheduler();
    emit();
    return;
  }
  rawState.status = 'finished';
  rawState.elapsedMs = rawState.durationMs;
  rawState.startedAt = null;
  rawState.deadline = null;
  stopScheduler();
  if (announce && !rawState.completionNotified) {
    rawState.completionNotified = true;
    rawState.updatedAt = Date.now(); rawState.tabId = tabId;
    writeStored();
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pg-focus-timer-finished'));
  }
  emit();
}

function tick() {
  if (rawState.status !== 'running') return;
  const now = Date.now();
  if (rawState.mode === 'countdown' && rawState.deadline !== null && now >= rawState.deadline) {
    finishCountdown(true);
    return;
  }
  emit();
}

function ensureScheduler() {
  if (interval || typeof window === 'undefined') return;
  interval = setInterval(tick, TICK_MS);
}

function stopScheduler() {
  if (interval) clearInterval(interval);
  interval = null;
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const incoming: unknown = JSON.parse(event.newValue);
    if (!validState(incoming)) return;
    // Storage events are last-write-wins. Ignore stale events from another tab;
    // this prevents a delayed pause in one tab from replacing a newer start.
    if (incoming.updatedAt < rawState.updatedAt || (incoming.updatedAt === rawState.updatedAt && incoming.tabId <= rawState.tabId)) return;
    rawState = { ...incoming, laps: [...incoming.laps] };
    emit();
    if (rawState.status === 'running') ensureScheduler(); else stopScheduler();
  } catch { /* malformed or inaccessible storage is harmless */ }
}

function onVisibilityChange() { tick(); }

export function initFocusTimer() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const stored = readStored();
  if (stored) rawState = { ...stored };
  // A timer that elapsed while the document was closed should look finished,
  // but must not chime again when the accessory is opened or reloaded.
  if (rawState.status === 'running' && rawState.mode === 'countdown' && rawState.deadline !== null && rawState.deadline <= Date.now()) {
    rawState.status = 'finished'; rawState.elapsedMs = rawState.durationMs;
    rawState.startedAt = null; rawState.deadline = null; rawState.completionNotified = true;
    rawState.updatedAt = Date.now(); writeStored();
  }
  window.addEventListener('storage', onStorage);
  window.addEventListener('visibilitychange', onVisibilityChange);
  snapshot = calculateFocusDisplay(rawState);
  if (rawState.status === 'running') ensureScheduler();
  else stopScheduler();
  emit();
}

export function getFocusTimerSnapshot(): FocusTimerState { return snapshot; }
export function subscribeFocusTimer(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }

export function startFocusTimer() {
  initFocusTimer();
  if (rawState.status === 'finished') return;
  const now = Date.now();
  const current = calculateFocusDisplay(rawState, now);
  if (rawState.mode === 'countdown') {
    const remaining = rawState.status === 'paused' ? current.remainingMs : rawState.durationMs;
    rawState.elapsedMs = Math.max(0, rawState.durationMs - remaining);
    rawState.deadline = now + remaining;
  } else {
    rawState.elapsedMs = current.elapsedMs;
    rawState.startedAt = now;
  }
  rawState.status = 'running'; rawState.completionNotified = false; rawState.updatedAt = now; rawState.tabId = tabId;
  writeStored(); ensureScheduler(); emit();
}

export function pauseFocusTimer() {
  if (rawState.status !== 'running') return;
  const current = calculateFocusDisplay(rawState);
  rawState.elapsedMs = current.elapsedMs; rawState.status = 'paused';
  rawState.startedAt = null; rawState.deadline = null; rawState.updatedAt = Date.now(); rawState.tabId = tabId;
  writeStored(); stopScheduler(); emit();
}

export function resetFocusTimer() {
  rawState = { ...defaultState(), mode: rawState.mode, durationMs: rawState.durationMs, tabId };
  rawState.updatedAt = Date.now(); writeStored(); stopScheduler(); emit();
}

export function setFocusTimerMode(mode: FocusTimerMode) {
  if (rawState.status === 'running' || rawState.mode === mode) return;
  rawState = { ...rawState, mode, status: 'idle', elapsedMs: 0, startedAt: null, deadline: null, completionNotified: false, updatedAt: Date.now(), tabId };
  writeStored(); stopScheduler(); emit();
}

export function setFocusTimerMinutes(minutes: number) {
  if (rawState.status === 'running') return;
  rawState = { ...rawState, durationMs: clampFocusMinutes(minutes) * 60_000, status: 'idle', elapsedMs: 0, startedAt: null, deadline: null, completionNotified: false, updatedAt: Date.now(), tabId };
  writeStored(); stopScheduler(); emit();
}

export function addFocusLap() {
  if (rawState.mode !== 'stopwatch' || rawState.status !== 'running') return;
  if (rawState.laps.length >= MAX_LAPS) return;
  const current = calculateFocusDisplay(rawState);
  rawState.laps = [...rawState.laps, current.elapsedMs];
  rawState.updatedAt = Date.now(); rawState.tabId = tabId; writeStored(); emit();
}

export function formatLap(milliseconds: number, previous = 0) {
  return formatFocusTime(Math.max(0, milliseconds - previous), 'floor');
}

// The test-only hook also makes hot module reloads in local development tidy.
export function shutdownFocusTimerForTests() {
  stopScheduler();
  if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  if (typeof window !== 'undefined') window.removeEventListener('visibilitychange', onVisibilityChange);
  initialized = false;
}
