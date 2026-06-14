import { chromium, devices } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });

async function journeyToDesktop(p) {
  await sleep(1500);
  await p.keyboard.press('Enter');          // BIOS
  await sleep(5000);
  await p.mouse.move(700, 700);             // lean
  await sleep(2000);
  const crt = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return { l: parseFloat(s.getPropertyValue('--crt-left')), t: parseFloat(s.getPropertyValue('--crt-top')), w: parseFloat(s.getPropertyValue('--crt-w')), h: parseFloat(s.getPropertyValue('--crt-h')) }; });
  await p.mouse.click(crt.l + crt.w / 2, crt.t + crt.h / 2);
  for (let i = 0; i < 22; i++) { await sleep(1200); await p.keyboard.press('Enter'); }  // dolly+boot skip
  await sleep(2500);
}

// A) DEFAULT (bare /) → composite
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await journeyToDesktop(p);
  const a = await p.evaluate(() => {
    const f = document.querySelector('iframe[src^="/os"]');
    const overlay = document.querySelectorAll('.win95-desktop').length;   // should be 0 in main doc
    let inner = 'none';
    try { const d = f && f.contentDocument; inner = d ? ('desktop=' + d.querySelectorAll('.win95-desktop').length) : 'no-doc'; } catch { inner = 'x'; }
    // brightness: the canvas-wrapper filter should NOT contain brightness(0.32)
    const wrap = document.querySelector('div[style*="contrast(1.03)"]');
    const dim = wrap ? /brightness\(0\.32\)/.test(wrap.getAttribute('style') || '') : 'no-wrap';
    return { composedIframe: !!f, mainDocOverlay: overlay, inner, dimmed: dim, glass: document.querySelectorAll('iframe[src^="/os"]').length };
  });
  console.log('A default(/) → composite:', JSON.stringify(a), 'errs:', errs.join('|') || 'none');
  await p.screenshot({ path: 'shots/goal0612/composite-default.png' });
  await p.close();
}

// B) ?composite=0 → legacy overlay
{
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.goto(BASE + '/?composite=0', { waitUntil: 'load' });
  await journeyToDesktop(p);
  const bRes = await p.evaluate(() => ({
    overlay: document.querySelectorAll('.win95-desktop').length,        // should be 1 (overlay)
    composedIframe: document.querySelectorAll('iframe[src^="/os"]').length, // should be 0
    homePanel: document.querySelectorAll('.win95-desktop-home-inner').length,
  }));
  console.log('B ?composite=0 → overlay:', JSON.stringify(bRes), 'errs:', errs.join('|') || 'none');
  await p.close();
}

// C) touch device → overlay (composite gated off)
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(1500);
  const btn = await p.getByText('START', { exact: false }).last().boundingBox().catch(() => null);
  await p.touchscreen.tap(btn ? btn.x + btn.width / 2 : 195, btn ? btn.y + btn.height / 2 : 500);
  await sleep(2500);
  const c = await p.evaluate(() => ({ overlay: document.querySelectorAll('.win95-desktop').length, composedIframe: document.querySelectorAll('iframe[src^="/os"]').length }));
  console.log('C touch → overlay (no composite):', JSON.stringify(c));
  await ctx.close();
}

console.log('DONE');
await b.close();
