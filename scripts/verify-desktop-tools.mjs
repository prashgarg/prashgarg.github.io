// Browser checks for the useful desktop accessories added after the games.
// Run against a built preview with Node 22:
//   node scripts/verify-desktop-tools.mjs http://127.0.0.1:4331
//
// This intentionally tests the user-facing contracts (accessible controls,
// local persistence, downloads, and cleanup) rather than component internals.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const shots = process.argv[3] || 'shots/desktop-tools';
await mkdir(shots, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const contexts = [];

const makeContext = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  contexts.push(context);
  return context;
};

const waitFor = async (fn, message, timeout = 4000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
};

const shot = (page, name) => page.screenshot({ path: `${shots}/${name}.png` });
const appWindow = (page, id) => page.locator(`[data-app-window="${id}"]`);
const closeApp = async (page, id) => {
  const win = appWindow(page, id);
  await win.getByRole('button', { name: 'Close', exact: true }).click();
  await win.waitFor({ state: 'detached' });
};
const open = async (page, id) => {
  await page.goto(`${base}/os/?app=${id}`, { waitUntil: 'load' });
  await appWindow(page, id).waitFor();
};

try {
  // Filing cabinet: search, save, reload, internal navigation, and BibTeX
  // download. The published DOI gives this export a useful metadata check.
  const cabinetContext = await makeContext();
  const cabinet = await cabinetContext.newPage();
  await cabinet.goto(`${base}/os/?app=cabinet`, { waitUntil: 'load' });
  await appWindow(cabinet, 'cabinet').waitFor();
  await cabinet.evaluate(() => localStorage.removeItem('pg_filing_cabinet_v1'));
  await cabinet.reload({ waitUntil: 'load' });
  await appWindow(cabinet, 'cabinet').waitFor();
  const search = cabinet.getByRole('searchbox', { name: 'Search papers' });
  await search.fill('Political Expression of Academics');
  const record = cabinet.locator('.filing-record').first();
  await record.waitFor();
  const paperTitle = record.locator('h2 a');
  assert.match(await paperTitle.textContent(), /Political Expression/);
  await record.getByRole('button', { name: 'Save', exact: true }).click();
  await record.getByRole('button', { name: 'Saved', exact: true }).waitFor();
  assert.equal(await cabinet.getByRole('button', { name: 'Export .bib', exact: true }).isEnabled(), true);
  const downloadPromise = cabinet.waitForEvent('download');
  await cabinet.getByRole('button', { name: 'Export .bib', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'prashant-garg-reading-list.bib');
  const bib = await download.createReadStream();
  let bibText = '';
  for await (const chunk of bib) bibText += chunk.toString();
  assert.match(bibText, /10\.1038\/s41562-025-02199-1/, 'export should retain the verified DOI');
  await cabinet.reload({ waitUntil: 'load' });
  await appWindow(cabinet, 'cabinet').waitFor();
  await cabinet.getByRole('tab', { name: /Saved \(1\)/ }).waitFor();
  await cabinet.getByRole('tab', { name: /Saved \(1\)/ }).click();
  assert.equal(await cabinet.locator('.filing-record').count(), 1);
  await shot(cabinet, 'cabinet-saved');
  // The paper title is an in-desktop link. It should open a research window
  // without destroying the cabinet window behind it.
  await cabinet.getByRole('tab', { name: /All papers/ }).click();
  await cabinet.locator('.filing-record h2 a').first().click();
  await appWindow(cabinet, 'research').waitFor();
  assert.equal(await appWindow(cabinet, 'cabinet').count(), 1);
  await closeApp(cabinet, 'research');
  await closeApp(cabinet, 'cabinet');
  await cabinetContext.close();
  console.log('PASS filing cabinet search/save/reload/export/navigation');

  // A storage-blocked browser should leave the accessory usable and explain
  // that the reading list cannot persist.
  const blockedContext = await makeContext();
  await blockedContext.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });
  });
  const blocked = await blockedContext.newPage();
  await blocked.goto(`${base}/os/?app=cabinet`, { waitUntil: 'load' });
  await appWindow(blocked, 'cabinet').waitFor();
  await blocked.getByRole('searchbox', { name: 'Search papers' }).waitFor();
  await blocked.getByRole('searchbox', { name: 'Search papers' }).fill('automation');
  await blocked.locator('.filing-record').first().waitFor();
  await blocked.locator('.filing-record').first().getByRole('button', { name: 'Save', exact: true }).click();
  assert.match(await blocked.locator('.filing-alert').textContent(), /not allowing/i);
  await blockedContext.close();
  console.log('PASS filing cabinet blocked-storage fallback');

  // Ambient mixer: sliders persist, sound starts only after Play, the shared
  // tray volume reaches the master, and closing cleans up its audio token.
  const ambientContext = await makeContext();
  await ambientContext.addInitScript(() => {
    const Constructor = window.AudioContext;
    if (!Constructor) return;
    Object.defineProperty(window, '__pgTestAudioGains', { configurable: true, value: [] });
    const originalCreateGain = Constructor.prototype.createGain;
    Constructor.prototype.createGain = function (...args) {
      const gain = originalCreateGain.apply(this, args);
      window.__pgTestAudioGains.push(gain);
      return gain;
    };
  });
  const ambient = await ambientContext.newPage();
  await open(ambient, 'ambient');
  await ambient.evaluate(() => { localStorage.removeItem('pg_ambient_mixer_v1'); localStorage.setItem('pg_volume_v1', '0.6'); });
  await ambient.reload({ waitUntil: 'load' });
  await appWindow(ambient, 'ambient').waitFor();
  const rain = ambient.getByRole('slider', { name: 'Rain level' });
  await rain.fill('0.66');
  assert.equal(await rain.inputValue(), '0.66');
  assert.equal(await ambient.locator('html').getAttribute('data-pg-accessory-audio'), null, 'mixer must not autoplay');
  await ambient.reload({ waitUntil: 'load' });
  await appWindow(ambient, 'ambient').waitFor();
  assert.equal(await ambient.getByRole('slider', { name: 'Rain level' }).inputValue(), '0.66');
  const play = ambient.getByRole('button', { name: 'Play', exact: true });
  await play.click();
  await ambient.waitForTimeout(400);
  const ambientStatus = ambient.locator('.ambient-mixer-status');
  const ambientMessage = await ambientStatus.textContent();
  const ambientPlaying = /playing/i.test(ambientMessage || '') || (await ambient.locator('html').getAttribute('data-pg-accessory-audio'))?.includes('ambient');
  if (await ambient.evaluate(() => 'AudioContext' in window)) {
    assert(ambientPlaying || /unavailable|could not start/i.test(ambientMessage || ''), `unexpected mixer state: ${ambientMessage}`);
  }
  if (ambientPlaying) {
    const volumeSlider = ambient.locator('.win95-vol-slider');
    await volumeSlider.fill('0');
    await ambient.waitForTimeout(180);
    assert.equal(await ambient.evaluate(() => sessionStorage.getItem('pg_muted')), '1');
    assert.equal(await ambient.evaluate(() => localStorage.getItem('pg_volume_v1')), '0.6', 'mute should retain the saved volume');
    const masterGain = await ambient.evaluate(() => Number(window.__pgTestAudioGains?.[0]?.gain?.value));
    assert(Number.isFinite(masterGain) && masterGain < 0.05, `ambient master should mute at zero volume (got ${masterGain})`);
    assert.match(await ambientStatus.textContent(), /muted|Playing/i);
    await shot(ambient, 'ambient-playing');
  }
  await closeApp(ambient, 'ambient');
  assert.equal(await ambient.locator('html').getAttribute('data-pg-accessory-audio'), null, 'closing mixer must clear its audio token');
  await ambientContext.close();
  console.log('PASS ambient mixer no-autoplay/sliders/volume/cleanup');

  // Sequencer: pattern editing and persistence, confirmation controls, step
  // animation after Play, shared volume, and audio cleanup.
  const sequenceContext = await makeContext();
  await sequenceContext.addInitScript(() => {
    const Constructor = window.AudioContext;
    if (!Constructor) return;
    Object.defineProperty(window, '__pgTestAudioGains', { configurable: true, value: [] });
    const originalCreateGain = Constructor.prototype.createGain;
    Constructor.prototype.createGain = function (...args) {
      const gain = originalCreateGain.apply(this, args);
      window.__pgTestAudioGains.push(gain);
      return gain;
    };
  });
  const sequence = await sequenceContext.newPage();
  await sequence.goto(`${base}/os/?app=sequencer`, { waitUntil: 'load' });
  await appWindow(sequence, 'sequencer').waitFor();
  await sequence.evaluate(() => { localStorage.removeItem('pg_sequencer_v1'); localStorage.setItem('pg_volume_v1', '0.6'); });
  await sequence.reload({ waitUntil: 'load' });
  await appWindow(sequence, 'sequencer').waitFor();
  const firstKick = sequence.getByRole('button', { name: /^Kick, step 1,/ });
  assert.equal(await firstKick.getAttribute('aria-pressed'), 'true');
  const bpm = sequence.getByRole('spinbutton', { name: 'Beats per minute' });
  await bpm.fill('140');
  await bpm.blur();
  assert.equal(await bpm.inputValue(), '140');
  await firstKick.click();
  assert.equal(await firstKick.getAttribute('aria-pressed'), 'false');
  await sequence.getByRole('button', { name: 'Clear', exact: true }).click();
  await sequence.getByText('Clear all?', { exact: true }).waitFor();
  await sequence.locator('.sequencer-app').focus();
  await sequence.keyboard.press('Escape');
  assert.equal(await sequence.getByText('Clear all?', { exact: true }).count(), 0);
  await sequence.getByRole('button', { name: 'Clear', exact: true }).click();
  await sequence.getByRole('button', { name: 'Clear', exact: true }).last().click();
  assert.equal(await sequence.getByRole('button', { name: /^Kick, step 1,/ }).getAttribute('aria-pressed'), 'false');
  await sequence.getByRole('button', { name: 'Pattern', exact: true }).click();
  assert.equal(await sequence.getByRole('button', { name: /^Kick, step 1,/ }).getAttribute('aria-pressed'), 'true');
  await sequence.getByRole('button', { name: /^Kick, step 1,/ }).click();
  await sequence.reload({ waitUntil: 'load' });
  await appWindow(sequence, 'sequencer').waitFor();
  assert.equal(await sequence.getByRole('spinbutton', { name: 'Beats per minute' }).inputValue(), '140');
  assert.equal(await sequence.getByRole('button', { name: /^Kick, step 1,/ }).getAttribute('aria-pressed'), 'false');
  assert.equal(await sequence.locator('html').getAttribute('data-pg-accessory-audio'), null, 'sequencer must not autoplay on reload');
  const playSequence = sequence.getByRole('button', { name: /Play sequencer/ });
  await playSequence.click();
  await sequence.waitForTimeout(500);
  const sequenceStatus = sequence.locator('.sequencer-app .accessory-status');
  const sequenceMessage = await sequenceStatus.textContent();
  if (/playing/i.test(sequenceMessage || '')) {
    const currentBefore = await sequence.locator('.sequencer-step-number.is-current').first().textContent();
    await sequence.waitForTimeout(260);
    const currentAfter = await sequence.locator('.sequencer-step-number.is-current').first().textContent();
    assert.notEqual(currentBefore, currentAfter, 'playing sequencer should advance its current step');
    await sequence.locator('.win95-vol-slider').fill('0');
    await sequence.waitForTimeout(180);
    assert.equal(await sequence.evaluate(() => sessionStorage.getItem('pg_muted')), '1');
    const sequenceMasterGain = await sequence.evaluate(() => Number(window.__pgTestAudioGains?.[0]?.gain?.value));
    assert(Number.isFinite(sequenceMasterGain) && sequenceMasterGain < 0.05, `sequencer master should mute at zero volume (got ${sequenceMasterGain})`);
    await shot(sequence, 'sequencer-playing');
    await sequence.getByRole('button', { name: /Stop sequencer/ }).click();
  } else {
    assert.match(sequenceMessage || '', /unavailable|enable|Ready|Stopped/i);
  }
  await closeApp(sequence, 'sequencer');
  assert.equal(await sequence.locator('html').getAttribute('data-pg-accessory-audio'), null, 'closing sequencer must clear its audio token');
  await sequenceContext.close();
  console.log('PASS sequencer pattern/persistence/confirm/play/cleanup');

  // The full step grid remains reachable on the narrow touch layout by
  // horizontal scrolling, while the toolbar and status stay visible.
  for (const [width, height] of [[390, 844], [320, 568]]) {
    const mobileContext = await makeContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`${base}/os/?app=sequencer`, { waitUntil: 'load' });
    await appWindow(mobile, 'sequencer').waitFor();
    const grid = mobile.locator('.sequencer-grid-wrap');
    assert((await grid.evaluate(el => el.scrollWidth)) > (await grid.evaluate(el => el.clientWidth)), `sequencer should scroll horizontally at ${width}px`);
    await grid.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    assert(await mobile.getByRole('button', { name: /^Kick, step 16,/ }).boundingBox(), `step 16 should be reachable at ${width}px`);
    assert(await mobile.getByRole('button', { name: /Play sequencer/ }).boundingBox(), `sequencer toolbar should fit at ${width}px`);
    await shot(mobile, `sequencer-mobile-${width}`);
    await mobileContext.close();
  }
  console.log('PASS sequencer 390px/320px touch layout and horizontal reachability');

  assert.deepEqual(errors, [], 'desktop accessories should not produce page errors');
  console.log('PASS desktop tools checks complete');
} finally {
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  await browser.close();
}
