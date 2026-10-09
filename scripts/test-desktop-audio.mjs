import assert from 'node:assert/strict';
import { build } from 'esbuild';

class FakeStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

class FakeCustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}

class FakeWindow {
  constructor(origin = 'https://example.test') {
    this.listeners = new Map();
    this.location = { origin };
    this.localStorage = new FakeStorage();
    this.sessionStorage = new FakeStorage();
    this.top = this;
  }
  addEventListener(type, callback) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback));
  }
  dispatchEvent(event) {
    for (const callback of [...(this.listeners.get(event.type) || [])]) callback(event);
    return true;
  }
}

const parent = new FakeWindow();
const child = new FakeWindow();
child.top = parent;
child.localStorage = parent.localStorage;

globalThis.window = parent;
globalThis.CustomEvent = FakeCustomEvent;
globalThis.StorageEvent = class StorageEvent {};

const bundle = await build({
  entryPoints: ['src/lib/desktopAudio.ts'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  write: false,
});
const audio = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const {
  DESKTOP_MUTED_KEY,
  DESKTOP_VOLUME_KEY,
  readDesktopAudio,
  setDesktopMuted,
  setDesktopVolume,
  subscribeDesktopAudio,
  toggleDesktopMuted,
} = audio;

const fresh = () => {
  parent.localStorage.clear();
  parent.sessionStorage.clear();
  child.sessionStorage.clear();
  globalThis.window = parent;
};

fresh();
assert.deepEqual(readDesktopAudio(), { volume: 0.6, muted: false, effectiveVolume: 0.6 }, 'fresh state should use the 60% default');

setDesktopVolume(0.72);
assert.deepEqual(readDesktopAudio(), { volume: 0.72, muted: false, effectiveVolume: 0.72 });
setDesktopVolume(0);
assert.equal(parent.localStorage.getItem(DESKTOP_VOLUME_KEY), '0.72', 'zero slider must retain the previous preference');
assert.equal(parent.sessionStorage.getItem(DESKTOP_MUTED_KEY), '1');
assert.deepEqual(readDesktopAudio(), { volume: 0.72, muted: true, effectiveVolume: 0 });

setDesktopVolume(0.41);
assert.equal(parent.sessionStorage.getItem(DESKTOP_MUTED_KEY), null, 'positive slider should clear mute');
assert.deepEqual(readDesktopAudio(), { volume: 0.41, muted: false, effectiveVolume: 0.41 });

toggleDesktopMuted();
assert.deepEqual(readDesktopAudio(), { volume: 0.41, muted: true, effectiveVolume: 0 });
toggleDesktopMuted();
assert.deepEqual(readDesktopAudio(), { volume: 0.41, muted: false, effectiveVolume: 0.41 }, 'icon toggle should restore the previous positive volume');

fresh();
parent.localStorage.setItem(DESKTOP_VOLUME_KEY, '0');
setDesktopMuted(true);
assert.equal(readDesktopAudio().effectiveVolume, 0);
setDesktopMuted(false);
assert(readDesktopAudio().volume > 0, 'unmuting a legacy zero-volume preference should restore a positive volume');
assert.equal(readDesktopAudio().muted, false);

// A same-origin iframe and its parent share localStorage and session mute
// state. The subscription must observe changes dispatched by the other side.
fresh();
globalThis.window = child;
const updates = [];
const unsubscribe = subscribeDesktopAudio(state => updates.push(state));
setDesktopVolume(0.63);
assert(updates.some(state => state.volume === 0.63 && state.effectiveVolume === 0.63), 'iframe subscription should receive parent-visible volume changes');
setDesktopVolume(0);
assert(updates.some(state => state.muted && state.effectiveVolume === 0), 'iframe subscription should receive shared mute changes');
unsubscribe();

console.log('desktop audio state checks passed');
