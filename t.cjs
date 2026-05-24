const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'shots/v1-bios.png' });
  for (let i = 0; i < 24; i++) {
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'START');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    });
    if (s) { await p.mouse.click(s.x, s.y); break; }
  }
  await p.waitForTimeout(3500);
  await p.mouse.move(100, 100); await p.waitForTimeout(4500);  // wait for click hint to appear
  await p.screenshot({ path: 'shots/v1-idle-hint.png' });
  // Lean
  await p.mouse.move(700, 750); await p.waitForTimeout(3500);
  await p.screenshot({ path: 'shots/v1-lean.png' });
  // Click monitor — use larger hit target now
  await p.mouse.move(100, 100); await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    const r = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return { x: parseFloat(cs.getPropertyValue('--crt-left')) + parseFloat(cs.getPropertyValue('--crt-w'))/2, y: parseFloat(cs.getPropertyValue('--crt-top')) + parseFloat(cs.getPropertyValue('--crt-h'))/2 }; });
    await p.mouse.click(Math.round(r.x), Math.round(r.y));
    await p.waitForTimeout(300);
    if (await p.evaluate(() => !!document.querySelector('.win95-desktop'))) break;
  }
  await p.waitForTimeout(7500);
  await p.screenshot({ path: 'shots/v1-desktop.png' });
  await b.close();
})();
