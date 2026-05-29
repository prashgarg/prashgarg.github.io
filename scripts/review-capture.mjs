// Full-flow review capture: BIOS → idle → into-monitor → desktop → apps.
// Drives the real page with keyboard + mouse and writes a series of
// screenshots to shots/review0526/. Run while a server is on :4321.
import { chromium } from 'playwright';

const DIR = 'shots/review0526';
const W = Number(process.env.W || 1400);
const H = Number(process.env.H || 900);
const tag = process.env.TAG || '';
const url = 'http://localhost:4321/';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));

const shot = async (name) => {
  const p = `${DIR}/${tag}${name}.png`;
  await page.screenshot({ path: p });
  console.log('shot', p);
};

await page.goto(url, { waitUntil: 'load', timeout: 20000 });

// 1) Wait for BIOS popup, then dismiss via keyboard (any key dismisses).
await sleep(2600);
await shot('10-bios-popup');
await page.keyboard.press('Enter');     // dismiss BIOS → entering
await sleep(3200);                        // entry animation (2400ms) + settle
await shot('11-idle');

// 2) lean-in: move mouse to lower-centre
await page.mouse.move(700, 680);
await sleep(1600);
await shot('12-lean');

// 3) Click the CRT monitor (centre of frame) to dolly in + boot.
await page.mouse.move(700, 450);
await sleep(300);
await page.mouse.click(700, 450);
await sleep(2600);                         // dolly 2200ms
await shot('13-on-monitor');
await sleep(2600);                         // boot typing
await shot('14-desktop-empty');

// Report current phase if exposed
const phase = await page.evaluate(() => (window).__pg_phase || 'unknown').catch(() => 'n/a');
console.log('phase after flow:', phase);

console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
