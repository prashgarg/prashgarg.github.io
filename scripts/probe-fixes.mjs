import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });

// 1) Idle view (monitor in room — see new thinner bezel + bigger screen)
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(1200); await p.keyboard.press('Enter'); // skip BIOS
  await sleep(5500);                                   // entering -> idle
  const phase = await p.evaluate(() => document.querySelector('iframe[src^="/os"]') ? 'desktop' : 'pre-desktop');
  await p.screenshot({ path: 'shots/review0613/idle-thin-bezel.png' });
  console.log('IDLE screenshot taken; phase=', phase);
}

// 2) Click-to-exit: deep link -> desktop, click room corner -> should exit
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto(BASE + '/?app=now', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(3500);
  const before = await p.evaluate(() => document.querySelectorAll('iframe[src^="/os"]').length);
  // pointerdown in the top-left room corner (away from centered monitor)
  await p.mouse.move(80, 80); await p.mouse.down(); await p.mouse.up();
  await sleep(1500);
  const afterRoomClick = await p.evaluate(() => ({
    iframe: document.querySelectorAll('iframe[src^="/os"]').length,
    ss: (() => { try { return sessionStorage.getItem('pg_phase'); } catch { return 'x'; } })(),
  }));
  console.log(`CLICK ROOM CORNER → iframe ${before} -> ${afterRoomClick.iframe} (want 0); SS_PHASE=${afterRoomClick.ss} (want null)`);
}

// 3) Click INSIDE the monitor (iframe) should NOT exit
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto(BASE + '/?app=now', { waitUntil: 'load' });
  await p.waitForSelector('iframe[src^="/os"]', { timeout: 20000 });
  await sleep(3500);
  await p.mouse.move(700, 450); await p.mouse.down(); await p.mouse.up();  // dead center = iframe
  await sleep(1200);
  const stay = await p.evaluate(() => document.querySelectorAll('iframe[src^="/os"]').length);
  console.log(`CLICK MONITOR CENTER → iframe count ${stay} (want 1, stays inside)`);
}

console.log('DONE');
await b.close();
