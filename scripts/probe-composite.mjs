import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const CZ = process.argv[3] || '';   // framing distance to test
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await p.goto(BASE + '/?composite=1' + (CZ ? '&cz=' + CZ : ''), { waitUntil: 'load' });
await sleep(1500);
await p.keyboard.press('Enter');         // BIOS → entering
await sleep(5000);
await p.mouse.move(700, 700);            // lean in
await sleep(2000);
const crt = await p.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  return { l: parseFloat(s.getPropertyValue('--crt-left')), t: parseFloat(s.getPropertyValue('--crt-top')), w: parseFloat(s.getPropertyValue('--crt-w')), h: parseFloat(s.getPropertyValue('--crt-h')) };
});
await p.mouse.click(crt.l + crt.w / 2, crt.t + crt.h / 2);
let found = 0;
for (let i = 0; i < 25 && !found; i++) {
  await sleep(1200);
  await p.keyboard.press('Enter');
  found = await p.evaluate(() => document.querySelectorAll('iframe[src="/os"]').length);
}
await sleep(5000);
const st = await p.evaluate(() => {
  const f = document.querySelector('iframe[src="/os"]');
  const r = f ? f.getBoundingClientRect() : null;
  const s = getComputedStyle(document.documentElement);
  const crtW = parseFloat(s.getPropertyValue('--crt-w'));
  const crtH = parseFloat(s.getPropertyValue('--crt-h'));
  window.__crt = { crtW, crtH };
  let inner = 'none';
  try {
    const d = f && f.contentDocument;
    inner = d ? ('desktop=' + d.querySelectorAll('.win95-desktop').length + ' icons=' + d.querySelectorAll('.win95-icon').length) : 'no-doc';
  } catch { inner = 'xorigin'; }
  // also the Html wrapper transform
  const wrap = f ? f.closest('div[style*="matrix3d"]') : null;
  return {
    iframePresent: !!f,
    rect: r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}` : null,
    screenBox: `${Math.round(crtW)}x${Math.round(crtH)}`,
    inner,
    hasMatrix3d: !!wrap || (f ? /matrix3d/.test(f.parentElement?.parentElement?.getAttribute('style') || '') : false),
  };
});
const widthPct = Math.round((parseInt(st.screenBox) / 1400) * 100);
console.log(`COMPOSITE cz=${CZ || 'default'}: ${JSON.stringify(st)} screenWidth≈${widthPct}% of viewport`);
await p.screenshot({ path: `shots/goal0612/composite-cz${CZ || 'def'}.png` });

// Interaction test: click the Research icon inside the composited iframe
let clicked = 'skip';
if (process.argv[4] === 'interact') try {
  const f = await p.$('iframe[src="/os"]');
  const frame = f && await f.contentFrame();
  if (frame) {
    const icon = await frame.$('.win95-icon[title="Research"]');
    if (icon) {
      await icon.dblclick();
      await sleep(2500);
      clicked = await frame.evaluate(() => document.querySelectorAll('.win95-window').length + ' windows; top iframe ' + ([...document.querySelectorAll('iframe.win95-iframe')].pop()?.src || 'none'));
    } else clicked = 'icon-not-found';
  } else clicked = 'no-contentframe';
} catch (e) { clicked = 'err ' + e.message.slice(0, 80); }
console.log('INTERACTION (open Research in composited desktop):', clicked);
await p.screenshot({ path: 'shots/goal0612/composite-2-interaction.png' });
console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
await b.close();
