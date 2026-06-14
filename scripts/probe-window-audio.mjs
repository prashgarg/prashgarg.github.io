import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });

// Window geometry: open Research, measure the window rect vs the desktop
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto(BASE + '/?app=research', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(4000);
  const os = await (await p.$('iframe[src^="/os"]')).contentFrame();
  const geo = await os.evaluate(() => {
    const d = document.querySelector('.win95-window');
    const desk = document.querySelector('.win95-desktop') || document.body;
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { winW: Math.round(r.width), winH: Math.round(r.height),
             deskW: Math.round(desk.clientWidth), deskH: Math.round(desk.clientHeight),
             left: Math.round(r.left), top: Math.round(r.top) };
  });
  if (geo) {
    const pctW = Math.round(100*geo.winW/geo.deskW), pctH = Math.round(100*geo.winH/geo.deskH);
    const rightGap = geo.deskW - geo.left - geo.winW;
    console.log(`WINDOW geo: ${geo.winW}x${geo.winH} on desk ${geo.deskW}x${geo.deskH} = ${pctW}%x${pctH}%; left=${geo.left} rightGap=${rightGap} (centered if ~equal); top=${geo.top}`);
  } else console.log('WINDOW geo: no .win95-window found');
}

// Audio: opening a 2nd file must NOT start another ambient track
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const plays = { parent: 0 };
  await p.addInitScript(() => {
    window.__plays = 0;
    const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(){ window.__plays++; return op.apply(this, arguments); };
  });
  await p.goto(BASE + '/?app=research', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(3500);
  // count ambient <audio> plays across ALL frames (parent + nested content iframes)
  const countAll = async () => {
    let total = 0;
    for (const fr of p.frames()) {
      try { total += await fr.evaluate(() => window.__plays || 0); } catch {}
    }
    return total;
  };
  const before = await countAll();
  // open a second app (Talks) by deep navigating the os iframe icon
  const os = await (await p.$('iframe[src^="/os"]')).contentFrame();
  await os.evaluate(() => {
    const icon = [...document.querySelectorAll('.win95-icon')].find(i => /Talks/i.test(i.textContent||''));
    if (icon) { icon.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); }
  });
  await sleep(3500);
  const after = await countAll();
  console.log(`AUDIO ambient play() calls across all frames: ${before} -> ${after} (want unchanged / no new track on file open)`);
}

console.log('DONE');
await b.close();
