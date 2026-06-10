// Live-site review after deploy: idle + lean + /cv/ + /now/ + overlay check.
// Usage: node scripts/review-live.mjs [base-url]   (default https://www.prashantgarg.org)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'https://www.prashantgarg.org';
const DIR = 'shots/live0610';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const errors = [];

// A) idle + lean
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(3200); await p.keyboard.press('Enter'); await sleep(4200);
  await p.screenshot({ path: `${DIR}/live-idle.png` });
  await p.mouse.move(700, 700); await sleep(1800);
  await p.screenshot({ path: `${DIR}/live-lean.png` });
  await ctx.close();
}
// B) pages
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/cv/', { waitUntil: 'load' });
  await sleep(1800);
  await p.screenshot({ path: `${DIR}/live-cv.png` });
  await p.goto(BASE + '/now/', { waitUntil: 'load' });
  await sleep(1800);
  await p.screenshot({ path: `${DIR}/live-now.png` });
  await ctx.close();
}
// C) overlay no-regression
let present = 0, crt = null;
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { sessionStorage.setItem('pg_phase', 'desktop'); } catch (e) {} });
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(3000);
  present = await p.locator('.win95-desktop').count();
  crt = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return { w: s.getPropertyValue('--crt-w'), h: s.getPropertyValue('--crt-h') }; });
  await ctx.close();
}
console.log('BASE:', BASE);
console.log('overlay present:', present, 'crt:', JSON.stringify(crt));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
console.log('DONE-LIVE');
await browser.close();
