// Regression checks for shared sound state across the room, the composited
// monitor, and the standalone desktop. Run against a built preview with
// Node 22:
//   node scripts/verify-accessory-audio-monitor.mjs http://127.0.0.1:4331
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://127.0.0.1:4331').replace(/\/$/, '');
const output = process.argv[3] || 'shots/audio-monitor';
await mkdir(output, { recursive: true });

// Keep native Web Audio, but record every context and gain/filter created by
// the app. This distinguishes “a token says playing” from actual ducking.
const installAudioProbe = () => {
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  if (NativeAudioContext) {
    window.__pgAudioContexts = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        const record = { context: this, gains: [], filters: [] };
        window.__pgAudioContexts.push(record);
        const createGain = this.createGain.bind(this);
        const createFilter = this.createBiquadFilter.bind(this);
        this.createGain = (...values) => {
          const gain = createGain(...values);
          record.gains.push(gain);
          return gain;
        };
        this.createBiquadFilter = (...values) => {
          const filter = createFilter(...values);
          record.filters.push(filter);
          return filter;
        };
      }
    };
    window.webkitAudioContext = window.AudioContext;
  }
  const NativeAudio = window.Audio;
  window.__pgAudioElements = [];
  if (NativeAudio) {
    window.Audio = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        window.__pgAudioElements.push(this);
      }
    };
  }
};

const browser = await chromium.launch({ headless: true });
const errors = [];
const makeContext = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce', ...options });
  context.on('page', child => child.on('pageerror', error => errors.push(error.message)));
  await context.addInitScript(installAudioProbe);
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pg_volume_v1', '0.6');
      localStorage.setItem('pg_last_nonzero_volume_v1', '0.6');
      sessionStorage.removeItem('pg_muted');
    } catch { /* initial about:blank frames may deny storage access */ }
  });
  return context;
};
const waitFor = async (page, predicate, message, timeout = 7000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await page.waitForTimeout(60);
  }
  throw new Error(message);
};
const tokens = page => page.evaluate(() => {
  try { return JSON.parse(document.documentElement.dataset.pgAccessoryAudio || '[]').sort(); }
  catch { return []; }
});
const audioSnapshot = page => page.evaluate(() => ({
  contexts: (window.__pgAudioContexts || []).map(record => ({
    state: record.context.state,
    gains: record.gains.map(gain => gain.gain.value),
    filters: record.filters.map(filter => ({ q: filter.Q?.value, frequency: filter.frequency?.value })),
  })),
  html: (window.__pgAudioElements || []).map(audio => ({ volume: audio.volume, muted: audio.muted })),
}));
const setSlider = async (root, page, value) => {
  const slider = root.locator('input.win95-vol-slider');
  await slider.waitFor();
  await slider.fill(String(value));
  await page.waitForTimeout(180);
};
const appWindow = (root, id) => root.locator(`[data-app-window="${id}"]`);
const closeApp = async (root, id) => {
  const window = appWindow(root, id);
  await window.getByRole('button', { name: 'Close', exact: true }).click();
  await window.waitFor({ state: 'detached' });
};
const openBranchApp = async (root, label, id) => {
  await root.getByRole('button', { name: 'Start', exact: true }).click();
  const start = root.getByRole('menu', { name: 'Start', exact: true });
  await start.getByRole('menuitem', { name: 'Accessories', exact: true }).hover();
  const accessories = root.getByRole('menu', { name: 'Accessories', exact: true });
  await accessories.getByRole('menuitem', { name: label, exact: true }).click();
  const window = appWindow(root, id);
  await window.waitFor();
  return window;
};
const topRoomGain = page => page.evaluate(() => {
  const room = (window.__pgAudioContexts || []).find(record => record.filters.some(filter => Math.abs((filter.Q?.value || 0) - 0.7) < 0.02));
  return room?.gains[0]?.gain.value ?? null;
});

try {
  // Standalone /os: the HTML ambient bed is separate from the accessory
  // AudioContext. Starting an accessory ducks it; stopping restores it.
  const standaloneContext = await makeContext();
  const standalone = await standaloneContext.newPage();
  standalone.setDefaultTimeout(15000);
  await standalone.goto(`${base}/os/?app=ambient`, { waitUntil: 'load' });
  const ambient = appWindow(standalone, 'ambient');
  await ambient.locator('.ambient-mixer-app').waitFor();
  await standalone.waitForTimeout(250);
  const bedBefore = await standalone.evaluate(() => window.__pgAudioElements?.at(-1)?.volume ?? null);
  assert.equal(typeof bedBefore, 'number', 'standalone desktop should create its HTML ambient bed');
  await ambient.getByRole('button', { name: 'Play', exact: true }).click();
  await waitFor(standalone, async () => (await tokens(standalone)).includes('ambient'), 'ambient mixer should start');
  await waitFor(standalone, async () => {
    const bed = (await audioSnapshot(standalone)).html.at(-1);
    return bed && bed.volume < 0.01;
  }, 'standalone HTML ambient bed should duck while mixer plays');
  const ambientGain = async () => (await audioSnapshot(standalone)).contexts.at(-1)?.gains[0];
  assert((await ambientGain()) > 0.01, 'ambient mixer master should be audible at positive volume');
  await setSlider(standalone, standalone, 0);
  await waitFor(standalone, async () => (await ambientGain()) < 0.01, 'tray mute should silence the accessory master');
  assert.equal(await standalone.evaluate(() => sessionStorage.getItem('pg_muted')), '1');
  await setSlider(standalone, standalone, 0.5);
  await waitFor(standalone, async () => (await ambientGain()) > 0.01, 'positive tray volume should restore accessory output');
  assert.equal(await standalone.evaluate(() => sessionStorage.getItem('pg_muted')), null);
  await ambient.getByRole('button', { name: 'Stop', exact: true }).click();
  await waitFor(standalone, async () => (await tokens(standalone)).length === 0, 'stopping mixer should clear its token');
  await waitFor(standalone, async () => (await standalone.evaluate(() => window.__pgAudioElements?.at(-1)?.volume ?? 0)) > 0.01, 'stopping mixer should restore standalone bed volume');
  await closeApp(standalone, 'ambient');
  await standaloneContext.close();
  console.log('PASS standalone HTML bed duck/restore and tray mute/restore');

  // Composite monitor: room HUD mute is the same persisted state as the
  // iframe tray. Two sources duck the room together, and iframe reload clears
  // ownership so the room can restore its own master.
  const compositeContext = await makeContext();
  const composite = await compositeContext.newPage();
  composite.setDefaultTimeout(30000);
  await composite.goto(`${base}/`, { waitUntil: 'load' });
  await composite.locator('.office-monitor[data-ready="true"]').waitFor({ timeout: 60000 });
  await composite.getByRole('button', { name: 'ENTER', exact: true }).click();
  await composite.locator('#office[data-phase="idle"]').waitFor({ timeout: 60000 });
  await composite.locator('.office-sound').click();
  assert.equal(await composite.evaluate(() => sessionStorage.getItem('pg_muted')), '1');
  await composite.locator('.office-enter').click();
  await composite.locator('#office[data-phase="desktop"]').waitFor({ timeout: 60000 });
  const frame = composite.frameLocator('iframe[title="prashantgarg.os"]');
  await frame.locator('.win95-desktop').waitFor();
  const framedAmbient = await openBranchApp(frame, 'Ambient mixer', 'ambient');
  await framedAmbient.getByRole('button', { name: 'Play', exact: true }).click();
  await waitFor(composite, async () => (await tokens(composite)).includes('ambient'), 'composited mixer should publish its token');
  const framedAmbientGain = async () => frame.locator('body').evaluate(() => window.__pgAudioContexts?.at(-1)?.gains[0]?.gain.value ?? null);
  await waitFor(composite, async () => (await framedAmbientGain()) < 0.01, 'room HUD mute should silence iframe mixer');
  await setSlider(frame, composite, 0.5);
  await waitFor(composite, async () => (await composite.evaluate(() => sessionStorage.getItem('pg_muted'))) === null, 'positive iframe slider should clear room HUD mute');
  await waitFor(composite, async () => (await framedAmbientGain()) > 0.01, 'positive iframe slider should restore mixer output');
  const framedSequencer = await openBranchApp(frame, 'Music sequencer', 'sequencer');
  await framedSequencer.getByRole('button', { name: 'Play sequencer', exact: true }).click();
  await waitFor(composite, async () => {
    const current = await tokens(composite);
    return current.includes('ambient') && current.includes('sequencer');
  }, 'both accessory sources should be reported while playing');
  await waitFor(composite, async () => (await topRoomGain(composite)) < 0.01, 'accessory sources should duck the room master');
  await framedSequencer.getByRole('button', { name: 'Stop sequencer', exact: true }).click();
  await waitFor(composite, async () => (await tokens(composite)).includes('ambient'), 'stopping one source must retain the other');
  assert((await topRoomGain(composite)) < 0.01, 'room should remain ducked while mixer continues');
  // The sequencer is the front window after its launch. Minimise it before
  // clicking the mixer behind it so the test follows the real hit-testing
  // path rather than forcing a click through another window.
  await framedSequencer.getByRole('button', { name: 'Minimise', exact: true }).click();
  await framedAmbient.getByRole('button', { name: 'Stop', exact: true }).click();
  await waitFor(composite, async () => (await tokens(composite)).length === 0, 'stopping final source should clear tokens');
  await waitFor(composite, async () => (await topRoomGain(composite)) > 0.01, 'room master should restore after final source stops');
  // Reload while an accessory is active: pagehide/unmount cleanup must not
  // leave the top document permanently ducked.
  await framedAmbient.getByRole('button', { name: 'Play', exact: true }).click();
  await waitFor(composite, async () => (await tokens(composite)).includes('ambient'), 'mixer should restart before iframe reload');
  const iframe = composite.locator('iframe[title="prashantgarg.os"]');
  await iframe.evaluate(element => element.contentWindow.location.reload());
  await frame.locator('.win95-desktop').waitFor();
  await waitFor(composite, async () => (await tokens(composite)).length === 0, 'iframe reload should clear accessory ownership tokens');
  await waitFor(composite, async () => (await topRoomGain(composite)) > 0.01, 'iframe reload should restore room audio');
  // Exercise the reverse direction too: the tray mutes, then the room HUD
  // unmutes the same state after returning from the monitor.
  await setSlider(frame, composite, 0);
  await waitFor(composite, async () => (await composite.evaluate(() => sessionStorage.getItem('pg_muted'))) === '1', 'tray zero should set the shared room mute');
  await frame.getByRole('button', { name: 'Back to the office', exact: true }).click();
  await composite.locator('#office[data-phase="idle"]').waitFor({ timeout: 30000 });
  await composite.locator('.office-sound').click();
  await waitFor(composite, async () => (await composite.evaluate(() => sessionStorage.getItem('pg_muted'))) === null, 'room HUD should clear tray mute');
  assert.deepEqual(errors, [], `browser page errors: ${errors.join('; ')}`);
  console.log('PASS composited room mute/tray sync, multi-source ducking, and restoration');
  await compositeContext.close();
} finally {
  await browser.close();
}
