// Headless screenshot of localhost:4321 so the dev loop can iterate without
// asking the user for a screenshot. Usage:
//   node scripts/screenshot.mjs                       (default: 1400x900, 4s settle)
//   node scripts/screenshot.mjs out.png 1600 1000 6   (custom path + size + settleMs)
import { chromium } from 'playwright';

const out      = process.argv[2] || 'screenshot.png';
const width    = Number(process.argv[3] || 1400);
const height   = Number(process.argv[4] || 900);
const settleMs = Number(process.argv[5] || 4000);
const url      = process.argv[6] || 'http://localhost:4321/';

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page    = await ctx.newPage();

page.on('console',  (msg) => { if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text()); });
page.on('pageerror',(err) => console.error('PAGE EXCEPTION:', err.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(settleMs);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log('wrote', out);
