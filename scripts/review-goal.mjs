// Combined verification capture for the /goal run. Writes to shots/goal0529/.
import { chromium } from 'playwright';
const DIR = 'shots/goal0529';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const note = (...a) => console.log('NOTE:', ...a);
const errors = [];

// ---- A) 3D idle + lean (desktop viewport) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2600); await page.keyboard.press('Enter'); await sleep(3400);
  await page.screenshot({ path: `${DIR}/g-11-idle.png` });
  await page.mouse.move(700, 680); await sleep(1700);
  await page.screenshot({ path: `${DIR}/g-12-lean.png` });
  note('idle+lean done');
  await ctx.close();
}

// ---- B) desktop overlay (fullscreen) ----
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase','desktop'); } catch(e){} });
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2000);
  await page.addStyleTag({ content: `.win95-desktop.embedded{top:0!important;left:0!important;width:100vw!important;height:100vh!important;}` });
  await sleep(400);
  await page.screenshot({ path: `${DIR}/g-30-desktop.png` });
  // open Home + Research to confirm no regression
  for (const label of ['Home','Research']) {
    const icon = page.locator('.win95-icon', { hasText: new RegExp('^'+label+'$') }).first();
    await icon.dispatchEvent('dblclick'); await sleep(1500);
  }
  await page.screenshot({ path: `${DIR}/g-31-windows.png` });
  note('overlay windows:', await page.locator('.win95-window').count(), 'iframes:', await page.locator('.win95-window iframe').count());
  await ctx.close();
}

// ---- C) Cmd+K palette on standalone research ----
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/research/', { waitUntil: 'load' });
  await sleep(1400);
  await page.keyboard.press('Meta+k'); await sleep(500);
  await page.keyboard.type('twitter'); await sleep(600);
  await page.screenshot({ path: `${DIR}/g-51-cmdk.png` });
  // measure column geometry of first result to PROVE grid applies
  const geo = await page.evaluate(() => {
    const r = document.querySelector('.cmdk-result');
    if (!r) return null;
    const kids = [...r.children].map(c => ({ cls: c.className, x: Math.round(c.getBoundingClientRect().x), w: Math.round(c.getBoundingClientRect().width) }));
    return { display: getComputedStyle(r).display, cols: getComputedStyle(r).gridTemplateColumns, kids };
  });
  note('cmdk first-result geometry:', JSON.stringify(geo));
  await ctx.close();
}

// ---- D) standalone research page: confirm floating buttons cleared status bar ----
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/research/', { waitUntil: 'load' });
  await sleep(1400);
  await page.screenshot({ path: `${DIR}/g-40-research-page.png` });
  const btnBottoms = await page.evaluate(() => {
    const t = document.querySelector('.theme-toggle'); const k = document.querySelector('.cmdk-hint-btn');
    const sb = document.querySelector('.w95-statusbar');
    const rb = (e) => e ? Math.round(e.getBoundingClientRect().bottom) : null;
    const rt = (e) => e ? Math.round(e.getBoundingClientRect().top) : null;
    return { themeBottom: rb(t), cmdkBottom: rb(k), statusTop: rt(sb), statusBottom: rb(sb), vh: window.innerHeight };
  });
  note('button vs statusbar geometry:', JSON.stringify(btnBottoms));
  await ctx.close();
}

// ---- E) mobile window (portrait) ----
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase','desktop'); } catch(e){} });
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2200);
  await page.addStyleTag({ content: `.win95-desktop.embedded{top:0!important;left:0!important;width:100vw!important;height:100vh!important;}` });
  await sleep(400);
  const icon = page.locator('.win95-icon', { hasText: /^Research$/ }).first();
  await icon.dispatchEvent('dblclick'); await sleep(1800);
  await page.screenshot({ path: `${DIR}/g-62-mobile-window.png` });
  // does the window overflow the 390px viewport?
  const wbox = await page.evaluate(() => {
    const w = document.querySelector('.win95-window');
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { x: Math.round(r.x), right: Math.round(r.right), vw: window.innerWidth, maximizedFits: r.right <= window.innerWidth + 1 && r.x >= -1 };
  });
  note('mobile window box:', JSON.stringify(wbox));
  await ctx.close();
}

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
console.log('DONE-REVIEW-GOAL');
await browser.close();
