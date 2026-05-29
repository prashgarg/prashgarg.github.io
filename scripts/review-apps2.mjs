// Round 2: open Library/Now/CV in the overlay via dispatchEvent (bypasses
// actionability), and test Cmd+K palette, search typing, dark mode, and the
// CV print button — on standalone pages where reliable.
import { chromium } from 'playwright';
const DIR = 'shots/review0526';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const note = (...a) => console.log('NOTE:', ...a);

// ---------- A) overlay apps via dispatchEvent ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.addInitScript(() => { try { sessionStorage.setItem('pg_phase','desktop'); } catch(e){} });
  await page.goto('http://localhost:4321/', { waitUntil: 'load' });
  await sleep(2000);
  await page.addStyleTag({ content: `.win95-desktop.embedded{top:0!important;left:0!important;width:100vw!important;height:100vh!important;}` });
  await sleep(400);
  for (const label of ['Library','Now','CV']) {
    const icon = page.locator('.win95-icon', { hasText: new RegExp('^'+label+'$') }).first();
    await icon.dispatchEvent('dblclick');
    await sleep(1700);
    await page.screenshot({ path: `${DIR}/50-overlay-${label.toLowerCase()}.png` });
    const ifr = await page.locator('.win95-window iframe').count();
    note(`${label}: windows=${await page.locator('.win95-window').count()} iframes=${ifr}`);
    // close via dispatchEvent on last close btn
    const cb = page.locator('.win95-titlebtn-close').last();
    if (await cb.count()) await cb.dispatchEvent('click');
    await sleep(500);
  }
  await ctx.close();
}

// ---------- B) Cmd+K palette + search + dark mode on standalone research ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/research/', { waitUntil: 'load' });
  await sleep(1500);
  // Cmd+K
  await page.keyboard.press('Meta+k');
  await sleep(500);
  await page.keyboard.type('twitter');
  await sleep(600);
  await page.screenshot({ path: `${DIR}/51-cmdk-twitter.png` });
  note('cmdk results:', await page.locator('.cmdk-result').count());
  await page.keyboard.press('Escape');
  await sleep(300);
  // search input on the page
  const search = page.locator('input[type="text"], input:not([type])').first();
  if (await search.count()) {
    await search.click().catch(()=>{});
    await search.type('populism').catch(()=>{});
    await sleep(700);
    await page.screenshot({ path: `${DIR}/52-search-populism.png` });
  }
  await ctx.close();
}

// ---------- C) dark mode toggle ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/now/', { waitUntil: 'load' });
  await sleep(1200);
  await page.screenshot({ path: `${DIR}/53-now-light.png` });
  const toggle = page.locator('#theme-toggle');
  if (await toggle.count()) { await toggle.click(); await sleep(600); await page.screenshot({ path: `${DIR}/54-now-dark.png` }); note('dark toggled'); }
  await ctx.close();
}

// ---------- D) CV print button presence ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/cv/', { waitUntil: 'load' });
  await sleep(1200);
  const printBtns = await page.getByText(/Print/i).count();
  note('CV print buttons:', printBtns);
  await ctx.close();
}

await browser.close();
console.log('DONE-APPS2');
