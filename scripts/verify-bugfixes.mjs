import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });

// 1) Window sizing + scroll in the composited monitor
{
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const audioPlays = [];
  await p.addInitScript(() => {
    window.__audio = 0;
    const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__audio++; return op.apply(this, arguments); };
  });
  await p.goto(BASE + '/?app=research', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(4000);
  const os = await (await p.$('iframe[src^="/os"]')).contentFrame();
  // window size
  const win = await os.evaluate(() => {
    const w = document.querySelector('.win95-window');
    if (!w) return null;
    const r = w.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log('WINDOW size in /os (viewport 1040x795):', JSON.stringify(win));
  // scroll the nested research iframe via real wheel over the window centre
  const nestedBefore = await os.evaluate(() => {
    const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
    try { return f.contentDocument.scrollingElement.scrollTop; } catch { return 'x'; }
  });
  // wheel over centre of the composited monitor
  await p.mouse.move(700, 450);
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 300); await sleep(120); }
  await sleep(500);
  const nestedAfter = await os.evaluate(() => {
    const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
    try { return f.contentDocument.scrollingElement.scrollTop; } catch { return 'x'; }
  });
  console.log(`SCROLL nested research: ${nestedBefore} -> ${nestedAfter} (>0 = scrolls)`);
  // audio: only the parent room should play, not the /os iframe
  const parentAudio = await p.evaluate(() => window.__audio);
  const osAudio = await os.evaluate(() => window.__audio);
  console.log(`AUDIO play() calls — parent room: ${parentAudio}, /os iframe: ${osAudio} (os should be 0)`);
  await p.screenshot({ path: 'shots/review0613/bugfix-composite.png' });
  await ctx.close();
}

// 2) returning visitor skips intro (SS_PHASE persisted) — same context, second load
{
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  // first visit: reach desktop via deep link (sets SS_PHASE)
  await p.goto(BASE + '/?app=now', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(1500);
  const ss = await p.evaluate(() => { try { return sessionStorage.getItem('pg_phase'); } catch { return 'x'; } });
  // second visit (bare /, same session) should skip straight to desktop
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(2500);
  const composedFast = await p.evaluate(() => document.querySelectorAll('iframe[src^="/os"]').length);
  console.log(`RETURNING visitor — SS_PHASE='${ss}'; bare / mounts composite immediately: ${composedFast === 1}`);
  await ctx.close();
}

console.log('DONE');
await b.close();
