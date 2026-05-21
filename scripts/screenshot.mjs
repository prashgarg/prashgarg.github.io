// Headless screenshot of localhost:4321 — supports an optional action
// string with multiple sequential hover/click/wait steps.
//
// Usage:
//   node scripts/screenshot.mjs                                     // idle screenshot
//   node scripts/screenshot.mjs out.png 1600 1000 5                 // custom size + settle
//   node scripts/screenshot.mjs out.png 1400 900 5 'click=700,560 wait=1500'
//   node scripts/screenshot.mjs out.png 1400 900 5 'click=700,560 wait=2000 click=690,400 wait=1500'
//     ^ each click/hover/wait token is executed left-to-right in sequence.
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

// Parse action string into a sequence of tokens.
// Tokens: hover=x,y | click=x,y | wait=ms
// Multiple tokens are executed left-to-right.
if (action) {
  const tokens = action.match(/(?:hover|click)=\d+,\d+|wait=\d+/g) || [];
  for (const token of tokens) {
    const hoverM = token.match(/^hover=(\d+),(\d+)$/);
    const clickM = token.match(/^click=(\d+),(\d+)$/);
    const waitM  = token.match(/^wait=(\d+)$/);
    if (hoverM) {
      await page.mouse.move(Number(hoverM[1]), Number(hoverM[2]));
      console.log('hovered', hoverM[1], hoverM[2]);
      await page.waitForTimeout(120);
    } else if (clickM) {
      await page.mouse.click(Number(clickM[1]), Number(clickM[2]));
      console.log('clicked', clickM[1], clickM[2]);
    } else if (waitM) {
      await page.waitForTimeout(Number(waitM[1]));
      console.log('waited', waitM[1], 'ms');
    }
  }
}

await page.screenshot({ path: out, fullPage: false });
console.log('wrote', out, '@', page.url());
await browser.close();
