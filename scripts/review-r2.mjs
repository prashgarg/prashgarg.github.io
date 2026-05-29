// Round-2 capture: idle + lean (3D) and the no-regression overlay check.
import { chromium } from 'playwright';
const DIR = 'shots/goal0529';
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
  await p.screenshot({ path: `${DIR}/r2-idle.png` });
  await p.mouse.move(700, 700); await sleep(1800);
  await p.screenshot({ path: `${DIR}/r2-lean.png` });
  await ctx.close();
}
// B) no-regression overlay check
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
console.log('DONE-R2');
await browser.close();
