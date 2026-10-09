import assert from 'node:assert/strict';
import { build } from 'esbuild';

class FakeParam {
  constructor(value = 0) { this.value = value; this.lastTargetValue = value; }
  setTargetAtTime(value) { this.value = value; this.lastTargetValue = value; }
}

class FakeNode {
  constructor(context) { this.context = context; this.connections = []; this.disconnected = 0; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected += 1; this.connections = []; }
}

class FakeSource extends FakeNode {
  constructor(context) { super(context); this.started = 0; this.stopped = 0; this.buffer = null; this.loop = false; }
  start() { this.started += 1; }
  stop() { this.stopped += 1; }
}

class FakeAudioContext {
  static nextResume = 'immediate';
  static instances = [];
  constructor() {
    this.state = 'suspended';
    this.sampleRate = 1000;
    this.destination = new FakeNode(this);
    this.sources = [];
    this.gains = [];
    this.closed = 0;
    this.resumeMode = FakeAudioContext.nextResume;
    FakeAudioContext.instances.push(this);
  }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createGain() { const node = new FakeNode(this); node.gain = new FakeParam(); this.gains.push(node); return node; }
  createBufferSource() { const node = new FakeSource(this); this.sources.push(node); return node; }
  createBiquadFilter() { const node = new FakeNode(this); node.type = ''; node.frequency = new FakeParam(); node.Q = new FakeParam(); return node; }
  createOscillator() { const node = new FakeSource(this); node.type = ''; node.frequency = new FakeParam(); this.sources.push(node); return node; }
  resume() {
    if (this.resumeMode === 'reject') return Promise.reject(new Error('resume denied'));
    if (this.resumeMode === 'immediate') { this.state = 'running'; return Promise.resolve(); }
    return new Promise(resolve => { this.resolveResume = () => { this.state = 'running'; resolve(); }; });
  }
  close() { this.closed += 1; this.state = 'closed'; return Promise.resolve(); }
}

class FakeStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class FakeCustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}

class FakeWindow {
  constructor() {
    this.listeners = new Map();
    this.location = { origin: 'https://example.test' };
    this.localStorage = new FakeStorage();
    this.sessionStorage = new FakeStorage();
    this.top = this;
  }
  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback));
  }
  dispatchEvent(event) {
    for (const callback of [...(this.listeners.get(event.type) || [])]) callback(event);
    return true;
  }
}

const fakeWindow = new FakeWindow();
const fakeDocument = { documentElement: { dataset: {} } };
fakeWindow.document = fakeDocument;
globalThis.window = fakeWindow;
globalThis.document = fakeDocument;
globalThis.CustomEvent = FakeCustomEvent;
fakeWindow.AudioContext = FakeAudioContext;
fakeWindow.localStorage.setItem('pg_volume_v1', '0.5');

const bundle = await build({
  entryPoints: ['src/components/accessories/ambientMixerEngine.ts'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  write: false,
});
const mixerModule = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const { createAmbientMixer, DEFAULT_AMBIENT_LEVELS } = mixerModule;

assert.deepEqual(Object.keys(DEFAULT_AMBIENT_LEVELS), ['rain', 'ventilation', 'office']);
assert.ok(Object.values(DEFAULT_AMBIENT_LEVELS).every(value => value >= 0 && value <= 1));
assert.ok(DEFAULT_AMBIENT_LEVELS.rain > DEFAULT_AMBIENT_LEVELS.office, 'rain starts as the most audible layer');

// Cancelling while resume() is pending must not start nodes or publish an
// active-audio token once the browser eventually resolves the resume promise.
FakeAudioContext.nextResume = 'pending';
const pendingEngine = createAmbientMixer();
const pendingStart = pendingEngine.start();
const pendingContext = FakeAudioContext.instances.at(-1);
pendingEngine.stop();
pendingContext.resolveResume();
await pendingStart;
assert.equal(pendingContext.sources.filter(source => source.started > 0).length, 0, 'cancelled resume does not start sources');
assert.equal(fakeDocument.documentElement.dataset.pgAccessoryAudio, undefined, 'cancelled resume does not report playback');
pendingEngine.dispose();

// A successful start creates three sources, and repeated stop/dispose calls
// remain harmless while still closing the native context exactly once.
FakeAudioContext.nextResume = 'immediate';
const runningEngine = createAmbientMixer();
await runningEngine.start();
const runningContext = FakeAudioContext.instances.at(-1);
assert.equal(runningContext.sources.filter(source => source.started > 0).length, 3);
assert.deepEqual(JSON.parse(fakeDocument.documentElement.dataset.pgAccessoryAudio), ['ambient']);
runningEngine.stop();
runningEngine.stop();
assert.equal(fakeDocument.documentElement.dataset.pgAccessoryAudio, undefined, 'stop releases playback token');
assert.ok(runningContext.sources.every(source => source.stopped === 1), 'repeated stop does not stop nodes twice');
runningEngine.dispose();
runningEngine.dispose();
assert.equal(runningContext.closed, 1, 'dispose closes the context once');

// A rejected resume must surface as a rejected start without stale source or
// audio-token state, and cleanup remains safe afterwards.
FakeAudioContext.nextResume = 'reject';
const failedEngine = createAmbientMixer();
await assert.rejects(failedEngine.start(), /resume denied/);
const failedContext = FakeAudioContext.instances.at(-1);
assert.equal(failedContext.sources.filter(source => source.started > 0).length, 0);
assert.equal(fakeDocument.documentElement.dataset.pgAccessoryAudio, undefined, 'failed resume does not report playback');
failedEngine.stop();
failedEngine.dispose();

// The room mute gate is shared with the desktop. It forces the master gain
// to zero, then follows the normal volume when the mute event is cleared.
fakeWindow.sessionStorage.setItem('pg_muted', '1');
FakeAudioContext.nextResume = 'immediate';
const mutedEngine = createAmbientMixer();
const unsubscribe = mutedEngine.subscribeVolume(() => {});
await mutedEngine.start();
const mutedContext = FakeAudioContext.instances.at(-1);
assert.equal(mutedContext.gains[0].gain.value, 0, 'room mute gates the master gain');
fakeWindow.sessionStorage.removeItem('pg_muted');
fakeWindow.dispatchEvent(new FakeCustomEvent('pg-room-mute', { detail: false }));
assert.equal(mutedContext.gains[0].gain.lastTargetValue, 0.12, 'unmuting restores shared volume');
unsubscribe();
mutedEngine.dispose();

console.log('ambient mixer lifecycle checks passed');
