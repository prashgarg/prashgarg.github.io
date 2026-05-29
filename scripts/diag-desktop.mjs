import { chromium } from 'playwright';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase','desktop'); } catch(e){} });
await page.goto('http://localhost:4321/', { waitUntil: 'load' });

for (const t of [1500, 3500, 6000]) {
  await sleep(t === 1500 ? 1500 : (t - prev()));
  const info = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const d = document.querySelector('.win95-desktop');
    const r = d ? d.getBoundingClientRect() : null;
    return {
      crt: { left: s.getPropertyValue('--crt-left'), top: s.getPropertyValue('--crt-top'), w: s.getPropertyValue('--crt-w'), h: s.getPropertyValue('--crt-h') },
      desk: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      icons: document.querySelectorAll('.win95-icon').length,
    };
  });
  console.log(`@${t}ms`, JSON.stringify(info));
}
function prev(){ return 0; }
await page.screenshot({ path: 'shots/review0526/diag-final.png' });

// Try forcing camera settle longer then re-read
await sleep(2000);
const fin = await page.evaluate(() => {
  const d = document.querySelector('.win95-desktop'); const r = d?.getBoundingClientRect();
  return r ? { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) } : null;
});
console.log('final desk rect', JSON.stringify(fin));
await browser.close();
