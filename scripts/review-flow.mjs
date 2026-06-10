// FULL end-to-end flow review on the live site:
//   BIOS → entering → idle (FPS) → lean → CRT click → dolly (FPS/jank) →
//   boot → desktop → open every app window (iframe readiness) →
//   Start menu → maximize → shut down → back to the 3D room.
// Usage: node scripts/review-flow.mjs [base-url]  (default prashgarg.github.io)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'https://prashgarg.github.io';
const DIR = 'shots/flow0610';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const errors = [];
const log = (s) => console.log('STEP:', s);
p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

// RAF-based FPS/jank sampler — returns { fps, worst, jank50 } over windowMs
const sampleFps = (windowMs) => p.evaluate((win) => new Promise(res => {
  const deltas = [];
  let last = performance.now();
  let raf;
  const tick = (t) => { deltas.push(t - last); last = t; raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  setTimeout(() => {
    cancelAnimationFrame(raf);
    const avg = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
    res({
      fps: Math.round(1000 / avg),
      worst: Math.round(Math.max(...deltas)),
      jank50: deltas.filter(d => d > 50).length,
      frames: deltas.length,
    });
  }, win);
}), windowMs);

// 1) BIOS splash
await p.goto(BASE + '/', { waitUntil: 'load' });
await sleep(1300);
await p.screenshot({ path: `${DIR}/01-bios.png` });
log('01 BIOS captured');

// 2) entering transition (mid-flight)
await p.keyboard.press('Enter');
await sleep(900);
await p.screenshot({ path: `${DIR}/02-entering-mid.png` });
log('02 entering mid-transition captured');

// 3) idle settled + FPS
await sleep(3200);
await p.screenshot({ path: `${DIR}/03-idle.png` });
const idleFps = await sampleFps(2000);
log(`03 idle captured — FPS ${JSON.stringify(idleFps)}`);

// 4) lean-in
await p.mouse.move(700, 700);
await sleep(1800);
await p.screenshot({ path: `${DIR}/04-lean.png` });
log('04 lean captured');

// 5) CRT click — use the projected CRT rect the site itself computes
const crt = await p.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  return {
    left: parseFloat(s.getPropertyValue('--crt-left')),
    top: parseFloat(s.getPropertyValue('--crt-top')),
    w: parseFloat(s.getPropertyValue('--crt-w')),
    h: parseFloat(s.getPropertyValue('--crt-h')),
  };
});
log(`05 CRT rect ${JSON.stringify(crt)}`);
const cx = crt.left + crt.w / 2, cy = crt.top + crt.h / 2;
await p.mouse.click(cx, cy);

// 6) dolly — mid-shot + jank sample (DOLLY_MS = 2200)
const dollyFpsP = sampleFps(1800);
await sleep(800);
await p.screenshot({ path: `${DIR}/05-dolly-mid.png` });
const dollyFps = await dollyFpsP;
log(`05 dolly mid captured — FPS ${JSON.stringify(dollyFps)}`);

// 7) boot sequence — capture it typing, then skip with a keypress
//    (headless renders the 3D at ~2 fps, so the ~2.4 s real-browser boot
//    crawls here; skipping is exactly what the overlay supports).
await sleep(1700);                       // arrival ≈ click + 2400ms
await p.screenshot({ path: `${DIR}/06-boot-early.png` });
await p.keyboard.press('Enter');         // "press any key" → skip typing
await sleep(1200);
await p.screenshot({ path: `${DIR}/07-boot-late.png` });
log('06/07 boot captured (skipped via keypress)');

// 8) desktop mounts
try {
  await p.waitForSelector('.win95-desktop', { timeout: 15000 });
} catch { errors.push('FLOW desktop never mounted'); }
await sleep(2500);
await p.screenshot({ path: `${DIR}/08-desktop-home.png` });
const homeVisible = await p.locator('.win95-window').count();
log(`08 desktop captured — windows open: ${homeVisible}`);

// 8b) Home-on-desktop check — the desktop itself should show home content
const homePanel = await p.locator('.win95-desktop-home-inner').count();
log(`08b desktop home panel present: ${homePanel}`);
if (!homePanel) errors.push('FLOW desktop home panel missing');

// 9) open every app from its desktop icon (dblclick)
for (const app of ['Research', 'Talks', 'Library', 'Now', 'CV']) {
  try {
    await p.locator(`.win95-icon[title="${app}"]`).dblclick();
    await sleep(2400);
    // iframe readiness (same-origin)
    const ready = await p.evaluate(() => {
      const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
      if (!f) return 'no-iframe';
      try {
        const d = f.contentDocument;
        // 'interactive' is fine — headless throttling delays subresources
        return d && (d.readyState === 'complete' || d.readyState === 'interactive')
          && d.body && d.body.children.length > 0
          ? 'ready' : `state=${d ? d.readyState : 'null'}`;
      } catch (e) { return 'cross-origin?'; }
    });
    await p.screenshot({ path: `${DIR}/09-app-${app.toLowerCase()}.png` });
    log(`09 ${app} window — iframe ${ready}`);
    if (ready !== 'ready' && app !== 'Home') errors.push(`FLOW ${app} iframe not ready: ${ready}`);
  } catch (e) { errors.push(`FLOW open ${app} failed: ${e.message}`); }
}

// 10) maximize the top window (dblclick its titlebar), then Start menu
try {
  await p.locator('.win95-titlebar').last().dblclick();
  await sleep(900);
  await p.screenshot({ path: `${DIR}/10-maximized.png` });
  log('10 maximize captured');
} catch (e) { errors.push('FLOW maximize failed: ' + e.message); }
// 10b) Home TASKBAR button → desktop: every window minimizes, home
//      panel visible (the desktop icons can be covered by windows; the
//      taskbar Home button is the always-reachable affordance).
try {
  await p.locator('.win95-home-btn').click();
  await sleep(900);
  const visibleWins = await p.evaluate(() =>
    [...document.querySelectorAll('.win95-window')].filter(w => w.offsetParent !== null).length);
  await p.screenshot({ path: `${DIR}/10b-home-desktop.png` });
  log(`10b Home→desktop — visible windows: ${visibleWins}`);
  if (visibleWins > 0) errors.push(`FLOW Home did not clear desktop (${visibleWins} windows visible)`);
} catch (e) { errors.push('FLOW home-to-desktop failed: ' + e.message); }

try {
  await p.locator('.win95-tray-btn', { hasText: 'Start' }).first().click()
    .catch(() => p.getByText('Start', { exact: true }).first().click());
  await sleep(700);
  await p.screenshot({ path: `${DIR}/11-startmenu.png` });
  log('11 start menu captured');
} catch (e) { errors.push('FLOW start menu failed: ' + e.message); }

// 11) shut down → back to the 3D room
try {
  await p.getByText(/Shut Down/i).first().click();
  await sleep(2500);
  await p.screenshot({ path: `${DIR}/12-back-to-room.png` });
  const desktopGone = await p.locator('.win95-desktop').count();
  log(`12 shutdown captured — desktop remaining: ${desktopGone}`);
} catch (e) { errors.push('FLOW shutdown failed: ' + e.message); }

console.log('IDLE-FPS:', JSON.stringify(idleFps));
console.log('DOLLY-FPS:', JSON.stringify(dollyFps));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
console.log('DONE-FLOW');
await browser.close();
