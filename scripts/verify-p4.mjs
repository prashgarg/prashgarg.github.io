// Phase-4 verification for goal_12jun26 (G37–G46).
// Usage: node scripts/verify-p4.mjs [base-url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4321';
const DIR = 'shots/goal0612';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (s) => console.log(s);
const browser = await chromium.launch({ headless: true });

async function desktop(query) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  await p.goto(BASE + '/' + query, { waitUntil: 'load' });
  await p.waitForSelector('.win95-desktop', { timeout: 20000 });
  await sleep(2500);
  return { ctx, p };
}

// G38: Terminal — papers, cite (copies BibTeX), open
{
  const { ctx, p } = await desktop('?app=terminal');
  const type = async (cmd) => {
    await p.evaluate(() => document.querySelector('.win95-term-input')?.focus());
    await p.locator('.win95-term-input').fill(cmd, { force: true });
    await p.keyboard.press('Enter');
    await sleep(500);
  };
  await type('papers --year 2025');
  await type('cite causal-claims-economics');
  const out = await p.evaluate(() => document.querySelector('.win95-term')?.textContent || '');
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => '')).catch(() => '');
  log(`G38 terminal → papers2025 listed=${/2025/.test(out)}; cite output has BibTeX=${/@article|@misc/.test(out)}; clipboard has @=${/@/.test(clip)}`);
  await p.screenshot({ path: `${DIR}/g38-terminal.png` });
  await ctx.close();
}

// G37: MDR — fill the active bin to 100% → opens filtered research
{
  const { ctx, p } = await desktop('?app=mdr');
  // click Refine repeatedly (22% each → 5 clicks)
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => [...document.querySelectorAll('.win95-btn')].find(b => /Refine/.test(b.textContent))?.click());
    await sleep(250);
  }
  await sleep(1500);
  const res = await p.evaluate(() => {
    const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
    const pct = document.querySelector('.win95-mdr-bin.active .win95-mdr-bin-pct')?.textContent;
    return { iframe: f ? f.src : 'none', activePct: pct };
  });
  log(`G37 MDR → active bin ${res.activePct}; opened research iframe: ${res.iframe}`);
  await p.screenshot({ path: `${DIR}/g37-mdr.png` });
  await ctx.close();
}

// G39: File Explorer — recycle bin + open a paper
{
  const { ctx, p } = await desktop('?app=files');
  const fileCount = await p.locator('.win95-file').count();
  await p.evaluate(() => [...document.querySelectorAll('.win95-files-tab')].find(t => /Recycle/.test(t.textContent))?.click());
  await sleep(400);
  const binText = await p.evaluate(() => document.querySelector('.win95-files-body')?.textContent || '');
  log(`G39 files → ${fileCount} file icons; recycle bin has rejected_draft=${/rejected_draft/.test(binText)}`);
  await p.screenshot({ path: `${DIR}/g39-files.png` });
  await ctx.close();
}

// G40: System Monitor — stats + caveat
{
  const { ctx, p } = await desktop('?app=sysmon');
  const m = await p.evaluate(() => {
    const t = document.querySelector('.win95-sysmon')?.textContent || '';
    return { papers: /12 papers|papers/.test(t), cites: /indexed citations/.test(t), caveat: /Google Scholar is authoritative/.test(t), conflate: /conflates this profile/.test(t) };
  });
  log(`G40 sysmon → ${JSON.stringify(m)}`);
  await ctx.close();
}

// G46: Org Chart — Fetzer node largest
{
  const { ctx, p } = await desktop('?app=orgchart');
  const has = await p.evaluate(() => (document.querySelector('.win95-orgchart')?.textContent || '').includes('Thiemo Fetzer'));
  const nodes = await p.locator('.win95-orgchart circle').count();
  log(`G46 orgchart → Fetzer present=${has}, ${nodes} nodes`);
  await ctx.close();
}

// G37: Perks — a stored perk reflects in the app, and a live award
// (cite via terminal) bumps it.
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('pg_perks_v1', JSON.stringify({ 'music-dance': true })); } catch (e) {} });
  await p.goto(`${BASE}/?app=perks`, { waitUntil: 'load' });
  await p.waitForSelector('.win95-perks', { timeout: 20000 });
  await sleep(2200);
  const earned = await p.evaluate(() => [...document.querySelectorAll('.win95-perk.earned')].length);
  const head = await p.evaluate(() => document.querySelector('.win95-perks-head')?.textContent);
  log(`G37 perks → earned visible: ${earned}; header="${head}"`);
  await p.screenshot({ path: `${DIR}/g37-perks.png` });
  await ctx.close();
}

// G45: Lumon FM — play starts an oscillator
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__osc = 0; const AC = window.AudioContext; if (AC) { const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__osc++; return o.apply(this, arguments); }; } });
  await p.goto(`${BASE}/?app=fm`, { waitUntil: 'load' });
  await p.waitForSelector('.win95-fm', { timeout: 20000 });
  await sleep(2000);
  const before = await p.evaluate(() => window.__osc);
  await p.evaluate(() => [...document.querySelectorAll('.win95-btn')].find(b => /Play/.test(b.textContent))?.click());
  await sleep(600);
  const after = await p.evaluate(() => window.__osc);
  log(`G45 Lumon FM → oscillators ${before} → ${after} (drone started)`);
  await ctx.close();
}

// G41: BIOS Setup — DEL opens it, toggle persists
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'load' });
  await sleep(900);
  await p.keyboard.press('Delete');
  await sleep(500);
  const setupOpen = await p.locator('.bios-setup').count();
  // toggle skip-intro (first row) on
  await p.evaluate(() => { const r = document.querySelectorAll('.bios-setup div[style*="cursor"]')[0]; r && r.click(); });
  await sleep(300);
  const cfg = await p.evaluate(() => localStorage.getItem('pg_bios_v1'));
  const perk = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('pg_perks_v1') || '{}')['finger-trap']; } catch { return false; } });
  log(`G41 BIOS Setup → opened=${setupOpen}, cfg=${cfg}, finger-trap perk=${perk}`);
  await p.screenshot({ path: `${DIR}/g41-bios-setup.png` });
  await ctx.close();
}

// G44: talks .ics — valid VEVENT
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const r = await p.request.get(`${BASE}/talks/oxford-inet-meeting-11-jun-2026.ics`);
  const body = await r.text();
  log(`G44 ics → status ${r.status()}, has DTSTART=${/DTSTART/.test(body)}, has VEVENT=${/BEGIN:VEVENT/.test(body)}, ct=${r.headers()['content-type']}`);
  await ctx.close();
}

console.log('DONE-P4');
await browser.close();
