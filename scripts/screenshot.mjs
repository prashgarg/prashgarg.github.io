// Headless screenshot of localhost:4321 — supports an optional mid-page
// click so I can verify interactions (door click → dolly → boot → nav)
// without asking the user.
//
// Usage:
//   node scripts/screenshot.mjs                                     // idle screenshot
//   node scripts/screenshot.mjs out.png 1600 1000 5                 // custom size + settle
//   node scripts/screenshot.mjs out.png 1400 900 5 'click=700,560 wait=1500'
//     ^ after the initial settle, click (700,560), wait 1500ms, then snap.
import { chromium } from 'playwright';

const out      = process.argv[2] || 'screenshot.png';
const width    = Number(process.argv[3] || 1400);
const height   = Number(process.argv[4] || 900);
const settleMs = Number(process.argv[5] || 4000);
const action   = process.argv[6] || '';                // e.g. "click=700,560 wait=1500"
const url      = process.argv[7] || 'http://localhost:4321/';

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page    = await ctx.newPage();

page.on('console',  (msg) => { if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text()); });
page.on('pageerror',(err) => console.error('PAGE EXCEPTION:', err.message));

// 'load' rather than 'networkidle': drei's Text fetches a font over the
// network which keeps it 'busy' forever and trips a Playwright timeout.
await page.goto(url, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(settleMs);

// Optional hover, click + wait
const hoverMatch = action.match(/hover=(\d+),(\d+)/);
const clickMatch = action.match(/click=(\d+),(\d+)/);
const waitMatch  = action.match(/wait=(\d+)/);
if (hoverMatch) {
  const [, sx, sy] = hoverMatch;
  await page.mouse.move(Number(sx), Number(sy));
  console.log('hovered', sx, sy);
  await page.waitForTimeout(250);
}
if (clickMatch) {
  const [, sx, sy] = clickMatch;
  await page.mouse.click(Number(sx), Number(sy));
  console.log('clicked', sx, sy);
}
if (waitMatch) {
  await page.waitForTimeout(Number(waitMatch[1]));
}

await page.screenshot({ path: out, fullPage: false });
console.log('wrote', out, '@', page.url());
await browser.close();
