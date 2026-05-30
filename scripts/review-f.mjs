// Follow-ups capture: ceiling/mats (idle+lean), CV menu, Now wording, overlay check.
import { chromium } from 'playwright';
const DIR = 'shots/goal0529';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const errors = [];

// A) 3D idle + lean (F1 ceiling, F3 mats)
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2600); await p.keyboard.press('Enter'); await sleep(3600);
  await p.screenshot({ path: `${DIR}/f-idle.png` });
  await p.mouse.move(700, 705); await sleep(1800);
  await p.screenshot({ path: `${DIR}/f-lean.png` });
  await ctx.close();
}
// B) CV page (F4 nav active) + Now page (F5 wording)
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 860 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/cv/', { waitUntil: 'load' });
  await sleep(1200);
  await p.screenshot({ path: `${DIR}/f-cv.png` });
  const nav = await p.locator('.w95-menuitem').allInnerTexts().catch(() => []);
  console.log('CV menu items:', JSON.stringify(nav));
  await p.goto('http://localhost:4321/now/', { waitUntil: 'load' });
  await sleep(1000);
  const nowFirst = await p.locator('section p').first().innerText().catch(() => 'n/a');
  console.log('Now first line:', JSON.stringify(nowFirst.trim().slice(0, 120)));
  await p.screenshot({ path: `${DIR}/f-now.png` });
  await ctx.close();
}
// C) no-regression overlay check
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
console.log('DONE-F');
await browser.close();
