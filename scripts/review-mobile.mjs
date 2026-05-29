// Mobile/portrait review: 3D idle + desktop overlay + an open window at 390x844.
import { chromium } from 'playwright';
const DIR = 'shots/review0526';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const note = (...a) => console.log('NOTE:', ...a);

// A) 3D idle at portrait (skip BIOS via keyboard)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2600); await page.keyboard.press('Enter'); await sleep(3200);
  await page.screenshot({ path: `${DIR}/60-mobile-idle.png` });
  note('mobile idle captured');
  await ctx.close();
}
// B) desktop overlay at portrait + open a window
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase','desktop'); } catch(e){} });
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2200);
  await page.addStyleTag({ content: `.win95-desktop.embedded{top:0!important;left:0!important;width:100vw!important;height:100vh!important;}` });
  await sleep(400);
  await page.screenshot({ path: `${DIR}/61-mobile-desktop.png` });
  // open Research
  const icon = page.locator('.win95-icon', { hasText: /^Research$/ }).first();
  await icon.dispatchEvent('dblclick');
  await sleep(1800);
  await page.screenshot({ path: `${DIR}/62-mobile-research-window.png` });
  note('mobile window iframes:', await page.locator('.win95-window iframe').count(), 'wins:', await page.locator('.win95-window').count());
  await ctx.close();
}
// C) standalone research page at portrait (the real mobile content path)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/research/', { waitUntil: 'load' });
  await sleep(1500);
  await page.screenshot({ path: `${DIR}/63-mobile-research-page.png` });
  await ctx.close();
}
await browser.close();
console.log('DONE-MOBILE');
