import { chromium } from 'playwright';
const DIR = 'shots/review0526';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto('http://localhost:4321/', { waitUntil: 'load' });
await sleep(2600); await page.keyboard.press('Enter'); await sleep(3200);

// hover sweep over candidate monitor centres, screenshot each
const cands = [[685,505],[685,470],[700,500],[660,500]];
for (const [x,y] of cands) {
  await page.mouse.move(x, y); await sleep(500);
  await page.screenshot({ path: `${DIR}/probe-hover-${x}-${y}.png` });
  console.log('hover', x, y);
}
// now actually click the best guess and check for desktop
await page.mouse.move(685, 500); await sleep(300);
await page.mouse.down(); await sleep(60); await page.mouse.up();
await sleep(2600);                       // dolly
await page.keyboard.press('Space');      // skip boot
await sleep(1500);
const onDesktop = await page.locator('.win95-desktop').count();
console.log('win95-desktop count after click 685,500:', onDesktop);
await page.screenshot({ path: `${DIR}/probe-after-click.png` });
await browser.close();
