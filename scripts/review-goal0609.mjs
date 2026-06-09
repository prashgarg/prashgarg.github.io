// goal_09jun26 capture: idle + lean + topdown (G5 debug) + /cv/ + /now/ + overlay.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const DIR = 'shots/goal0609';
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
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2600); await p.keyboard.press('Enter'); await sleep(3600);
  await p.screenshot({ path: `${DIR}/g-idle.png` });
  await p.mouse.move(700, 700); await sleep(1800);
  await p.screenshot({ path: `${DIR}/g-lean.png` });
  await ctx.close();
}
// A2) high-res lean — dividers/mats span enough pixels to sample reliably
{
  const ctx = await browser.newContext({ viewport: { width: 2600, height: 1700 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2600); await p.keyboard.press('Enter'); await sleep(3600);
  await p.mouse.move(1300, 1320); await sleep(1800);
  await p.screenshot({ path: `${DIR}/g-lean-hires.png` });
  await ctx.close();
}
// B) topdown debug view (G5 handedness)
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/?topdown=1', { waitUntil: 'load' });
  await sleep(2600); await p.keyboard.press('Enter'); await sleep(3000);
  await p.screenshot({ path: `${DIR}/g-topdown.png` });
  await ctx.close();
}
// C) /cv/ + /now/
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/cv/', { waitUntil: 'load' });
  await sleep(1500);
  await p.screenshot({ path: `${DIR}/g-cv.png` });
  await p.goto('http://localhost:4321/now/', { waitUntil: 'load' });
  await sleep(1500);
  await p.screenshot({ path: `${DIR}/g-now.png` });
  await ctx.close();
}
// D) no-regression overlay check
let present = 0, crt = null;
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { sessionStorage.setItem('pg_phase', 'desktop'); } catch (e) {} });
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2500);
  present = await p.locator('.win95-desktop').count();
  crt = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return { w: s.getPropertyValue('--crt-w'), h: s.getPropertyValue('--crt-h') }; });
  await ctx.close();
}
console.log('overlay present:', present, 'crt:', JSON.stringify(crt));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
console.log('DONE-G0609');
await browser.close();
