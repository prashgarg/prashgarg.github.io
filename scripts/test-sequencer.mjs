import assert from 'node:assert/strict';
import {
  clampBpm,
  clearPattern,
  createSequencerState,
  loadSequencerState,
  MAX_BPM,
  MIN_BPM,
  presetPattern,
  saveSequencerState,
  sanitizeSequencerState,
  stepAtTime,
  stepDurationMs,
  toggleStep,
} from '../src/components/accessories/sequencerEngine.ts';

const state = createSequencerState();
assert.equal(state.pattern.kick.length, 16);
assert.equal(state.pattern.kick[0], true);
assert.equal(state.pattern.snare[4], true);
assert.equal(stepDurationMs(120), 125);
assert.equal(stepAtTime(1000, 1125, 120), 1);
assert.equal(stepAtTime(1000, 3000, 120), 0);
assert.equal(clampBpm(12), MIN_BPM);
assert.equal(clampBpm(999), MAX_BPM);
const toggled = toggleStep(state.pattern, 'tone', 1);
assert.equal(toggled.tone[1], true);
assert.equal(state.pattern.tone[1], false);
assert.equal(clearPattern().kick.some(Boolean), false);
assert.equal(presetPattern().hat[0], true);

const storage = new Map();
const fakeStorage = {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, String(value)); },
};
assert.equal(saveSequencerState(fakeStorage, state), true);
assert.deepEqual(loadSequencerState(fakeStorage), state);
const malformed = sanitizeSequencerState({ bpm: 'fast', pattern: { kick: [true, 'yes', false] }, muted: { hat: true } });
assert.equal(malformed.bpm, 110);
assert.deepEqual(malformed.pattern.kick.slice(0, 3), [true, false, false]);
assert.equal(malformed.pattern.kick.length, 16);
assert.equal(malformed.muted.hat, true);
assert.equal(loadSequencerState({ getItem() { throw new Error('blocked'); } }).bpm, 110);
console.log('sequencer engine checks passed');
