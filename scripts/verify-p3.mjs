// Phase-3 verification for goal_12jun26 (G29–G36).
// Each feature gets a fresh page (headless 3D re-render storms make a
// single long session flaky); a deep link drops us on the desktop.
// Usage: node scripts/verify-p3.mjs [base-url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4321';
const DIR = 'shots/goal0612';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (s) => console.log(s);
const browser = await chromium.launch({ headless: true });

async function desktopPage(query = '?app=now') {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__oscCount = 0;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { const po = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__oscCount++; return po.apply(this, arguments); }; }
  });
  await p.goto(BASE + '/' + query, { waitUntil: 'load' });
  await p.waitForSelector('.win95-desktop', { timeout: 20000 });
  await sleep(2500);
  return { ctx, p };
}
// The 3D canvas repaints at ~2fps headless, so Playwright's stability
// gate times out on overlay clicks. Dispatch the real React onClick via
// DOM .click() — same handler, no stability wait.
async function startMenuItem(p, label) {
  await p.evaluate(() => document.querySelector('.win95-start-btn').click());
  await sleep(500);
  const ok = await p.evaluate((lbl) => {
    const it = [...document.querySelectorAll('.win95-startmenu-item')].find(i => i.textContent.includes(lbl));
    if (!it) return false; it.click(); return true;
  }, label);
  if (!ok) throw new Error(`menu item ${label} not found`);
  await sleep(600);
}

// ---------- G36: standard page, no JS ----------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1100, height: 900 } });
  const p = await ctx.newPage();
  let bytes = 0;
  p.on('response', async r => { try { bytes += (await r.body()).length; } catch { /* */ } });
  await p.goto(`${BASE}/standard/`, { waitUntil: 'load' });
  const g36 = await p.evaluate(() => ({
    name: document.body.innerText.includes('Prashant Garg'),
    pubs: document.body.innerText.includes('Publications'),
    award: document.body.innerText.includes('NetSciSci'),
    email: document.body.innerText.includes('prashantgargib@gmail.com'),
  }));
  log(`G36 /standard (JS disabled) → ${JSON.stringify(g36)} transfer=${bytes}B`);
  await p.screenshot({ path: `${DIR}/g36-standard.png` });
  await ctx.close();
}

// ---------- G30a + G29: deep link + sounds ----------
{
  const { ctx, p } = await desktopPage('?app=research&paper=causal-claims-economics');
  const g30a = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe.win95-iframe')].pop(); return f ? f.src : 'no-iframe'; });
  log(`G30a ?app=&paper= → iframe ${g30a}`);
  await p.screenshot({ path: `${DIR}/g30-deeplink.png` });
  const s0 = await p.evaluate(() => window.__oscCount);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.win95-titlebtn-close')].pop(); if (b) b.click(); });
  await sleep(700);
  const s1 = await p.evaluate(() => window.__oscCount);
  log(`G29 sounds → startup chime+close fired oscillators ${s0} → ${s1}`);
  await ctx.close();
}

// ---------- G30b: Run 'talks' ----------
{
  const { ctx, p } = await desktopPage();
  await startMenuItem(p, 'Run');
  await p.locator('.win95-dialog-input').fill('talks', { force: true });
  await p.keyboard.press('Enter');
  await sleep(2200);
  const g30b = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe.win95-iframe')].pop(); return f ? f.src : 'no-iframe'; });
  log(`G30b Run 'talks' → iframe ${g30b}`);
  await ctx.close();
}

// ---------- G30c: Run garbage → error ----------
{
  const { ctx, p } = await desktopPage();
  await startMenuItem(p, 'Run');
  await p.locator('.win95-dialog-input').fill('zzzznotathing', { force: true });
  await p.keyboard.press('Enter');
  await sleep(500);
  const g30c = await p.locator('.win95-dialog-error').textContent().catch(() => null);
  log(`G30c Run error → "${g30c}"`);
  await p.screenshot({ path: `${DIR}/g30-run-error.png` });
  await ctx.close();
}

// ---------- G33: overtime → theme flip ----------
{
  const { ctx, p } = await desktopPage();
  const before = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  await startMenuItem(p, 'Run');
  await p.locator('.win95-dialog-input').fill('overtime', { force: true });
  await p.keyboard.press('Enter');
  await sleep(300);
  await p.screenshot({ path: `${DIR}/g33-flicker.png` });
  await sleep(700);
  const after = await p.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), stored: localStorage.getItem('pg_theme') }));
  log(`G33 overtime → dark ${before} → ${after.dark}, stored=${after.stored}`);
  await p.screenshot({ path: `${DIR}/g33-after.png` });
  await ctx.close();
}

// ---------- G34: System Properties ----------
{
  const { ctx, p } = await desktopPage();
  await startMenuItem(p, 'System Properties');
  const g34 = await p.locator('.win95-dialog', { hasText: 'Registered to' }).count();
  log(`G34 System Properties dialog present: ${g34}`);
  await p.screenshot({ path: `${DIR}/g34-sysprops.png` });
  await ctx.close();
}

// ---------- G35: Wellness Session ----------
{
  const { ctx, p } = await desktopPage();
  await startMenuItem(p, 'Wellness Session');
  const l1 = await p.locator('.win95-wellness-line').first().textContent();
  await p.evaluate(() => [...document.querySelectorAll('.win95-btn')].find(b => b.textContent.includes('Continue'))?.click());
  await sleep(250);
  const l2 = await p.locator('.win95-wellness-line').first().textContent();
  log(`G35 wellness line1="${l1}" → line2="${l2}"`);
  await p.screenshot({ path: `${DIR}/g35-wellness.png` });
  await ctx.close();
}

// ---------- G32: screensaver (fast hook) + dismiss ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { sessionStorage.setItem('pg_ss_ms', '3000'); } catch (e) { /* */ } });
  await p.goto(`${BASE}/?app=now`, { waitUntil: 'load' });
  await p.waitForSelector('.win95-desktop', { timeout: 20000 });
  let ss = 0;
  for (let t = 0; t < 7 && !ss; t++) { await sleep(2000); ss = await p.locator('.win95-screensaver').count(); }
  await p.screenshot({ path: `${DIR}/g32-screensaver.png` });
  await p.keyboard.press('Shift');
  await sleep(500);
  const ss2 = await p.locator('.win95-screensaver').count();
  log(`G32 screensaver appeared=${ss}; dismissed-by-keypress → ${ss2 === 0}`);
  await ctx.close();
}

// ---------- G36b: B boss-key ----------
{
  const { ctx, p } = await desktopPage();
  await p.keyboard.press('b');
  await sleep(1200);
  log(`G36b B key → ${p.url()}`);
  await ctx.close();
}

// ---------- G31: TL;DR toggles ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/research/`, { waitUntil: 'load' });
  await sleep(800);
  await p.evaluate(() => document.getElementById('causal-claims-economics')?.setAttribute('open', ''));
  await sleep(300);
  await p.locator('#causal-claims-economics .tldr-toggle').check();
  await sleep(300);
  const after = await p.evaluate(() => {
    const c = document.getElementById('causal-claims-economics');
    return { absHidden: c.querySelector('[data-abstract]').classList.contains('hidden'), tldrShown: !c.querySelector('[data-tldr]').classList.contains('hidden') };
  });
  log(`G31 list toggle → ${JSON.stringify(after)}`);
  await p.evaluate(() => document.getElementById('causal-claims-economics')?.scrollIntoView());
  await p.screenshot({ path: `${DIR}/g31-tldr-list.png` });
  await p.goto(`${BASE}/research/causal-claims-economics/`, { waitUntil: 'load' });
  await sleep(700);
  const g31b = await p.evaluate(() => document.body.innerText.includes('In plain English'));
  log(`G31 paper page plain-English box: ${g31b}`);
  await p.screenshot({ path: `${DIR}/g31-tldr-paper.png` });
  await ctx.close();
}

console.log('DONE-P3');
await browser.close();
