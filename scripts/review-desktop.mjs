// Desktop review: drop into desktop phase via sessionStorage, fullscreen
// the overlay for legible capture, then drive every app/window/button by
// CSS selector. Writes screenshots to shots/review0526/.
import { chromium } from 'playwright';

const DIR = 'shots/review0526';
const W = 1400, H = 900;
const url = 'http://localhost:4321/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));

const shot = async (name) => { await page.screenshot({ path: `${DIR}/${name}.png` }); console.log('shot', name); };
const note = (...a) => console.log('NOTE:', ...a);
const click = async (loc) => { await loc.click({ force: true, timeout: 8000 }); };
const dbl   = async (loc) => { await loc.dblclick({ force: true, timeout: 8000 }); };

await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase', 'desktop'); } catch (e) {} });
await page.goto(url, { waitUntil: 'load', timeout: 20000 });
await sleep(2000);

// Fullscreen the embedded overlay for legible review (projector keeps
// updating --crt-* vars, but !important wins). Does not change behaviour.
await page.addStyleTag({ content: `
  .win95-desktop.embedded { top:0 !important; left:0 !important; width:100vw !important; height:100vh !important; }
`});
await sleep(600);
await shot('30-desktop-empty');

const iconLabels = await page.locator('.win95-icon-label').allInnerTexts().catch(() => []);
note('icon labels:', JSON.stringify(iconLabels));

// --- Open each app via desktop icon, screenshot, then close ---
const apps = ['Home', 'Research', 'Talks', 'Library', 'Now', 'CV'];
for (let i = 0; i < apps.length; i++) {
  const label = apps[i];
  const icon = page.locator('.win95-icon', { hasText: new RegExp('^' + label + '$') }).first();
  if (await icon.count() === 0) { note('NO ICON for', label); continue; }
  try {
    await dbl(icon);
    await sleep(1600);                        // open anim + iframe load
    await shot(`31-app-${i}-${label.toLowerCase()}`);
    // Report whether an iframe loaded for this app
    const ifr = await page.locator('.win95-window iframe').count();
    note(`${label}: window iframes present =`, ifr);
    const closeBtn = page.locator('.win95-titlebtn-close').last();
    if (await closeBtn.count()) { await click(closeBtn); await sleep(500); }
  } catch (e) { note('ERR opening', label, e.message.split('\n')[0]); }
}

// --- Multi-window cascade ---
for (const label of ['Research', 'Talks', 'Library']) {
  const icon = page.locator('.win95-icon', { hasText: new RegExp('^' + label + '$') }).first();
  if (await icon.count()) { try { await dbl(icon); await sleep(900); } catch {} }
}
await shot('32-multiwindow-cascade');
note('open windows after cascade:', await page.locator('.win95-window').count());
note('taskbar chips:', await page.locator('.win95-taskbar-chip').count());

// --- Minimize top window ---
const minBtn = page.locator('.win95-titlebtn[title="Minimise"]').last();
if (await minBtn.count()) { try { await click(minBtn); await sleep(700); await shot('33-minimized'); } catch (e) { note('min err', e.message.split('\n')[0]); } }

// --- Restore via last taskbar chip ---
const lastChip = page.locator('.win95-taskbar-chip').last();
if (await lastChip.count()) { try { await click(lastChip); await sleep(700); await shot('34-restored'); } catch {} }

// --- Maximize then restore ---
const maxBtn = page.locator('.win95-titlebtn[title="Maximise"]').last();
if (await maxBtn.count()) { try { await click(maxBtn); await sleep(700); await shot('35-maximized'); } catch (e) { note('max err', e.message.split('\n')[0]); } }
const restoreBtn = page.locator('.win95-titlebtn[title="Restore"]').last();
if (await restoreBtn.count()) { try { await click(restoreBtn); await sleep(500); } catch {} }

// --- Start menu ---
const startBtn = page.locator('.win95-start-btn').first();
if (await startBtn.count()) { try { await click(startBtn); await sleep(500); await shot('36-startmenu'); await page.keyboard.press('Escape'); await sleep(300); } catch {} }

// --- Right-click context menu on empty desktop area ---
try { await page.mouse.click(1000, 300, { button: 'right' }); await sleep(400); await shot('37-contextmenu'); await page.keyboard.press('Escape'); await sleep(300); } catch {}

// --- Drag a window by titlebar ---
const tb = page.locator('.win95-titlebar').last();
if (await tb.count()) {
  const box = await tb.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 80, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 180, { steps: 14 });
    await page.mouse.up();
    await sleep(800);
    await shot('38-after-drag');
  }
}

// --- Resize a window from SE corner grip ---
const grip = page.locator('.win95-resize-grip').last();
if (await grip.count()) {
  const gb = await grip.boundingBox();
  if (gb) {
    await page.mouse.move(gb.x + 6, gb.y + 6);
    await page.mouse.down();
    await page.mouse.move(gb.x + 160, gb.y + 120, { steps: 12 });
    await page.mouse.up();
    await sleep(600);
    await shot('39-after-resize');
  }
}

// --- Volume slider + clock present? ---
note('volume slider present:', await page.locator('.win95-toolbar input[type="range"]').count());
note('clock text:', await page.locator('.win95-clock').first().innerText().catch(()=> 'n/a'));

console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
