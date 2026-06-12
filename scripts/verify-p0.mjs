// Phase-0 verification for goal_12jun26 (G1–G8).
// Usage: node scripts/verify-p0.mjs [base-url]   (default http://localhost:4321)
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4321';
const DIR = 'shots/goal0612';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const browser = await chromium.launch({ headless: true });

// ---------- G1: standalone embed page opens at the TOP ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1120, height: 780 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/research/?embed=1`, { waitUntil: 'load' });
  await sleep(1200);
  const probe = await p.evaluate(() => {
    const search = document.getElementById('paper-search');
    const topEl = document.elementFromPoint(window.innerWidth / 2, 40);
    return {
      searchY: search ? Math.round(search.getBoundingClientRect().y) : null,
      topEl: topEl ? `${topEl.tagName}.${topEl.className?.toString().slice(0, 40)}` : null,
      shellDisplay: getComputedStyle(document.querySelector('.w95-shell')).display,
    };
  });
  await p.screenshot({ path: `${DIR}/g1-standalone-embed.png` });
  log(`G1a standalone /research/?embed=1 → searchY=${probe.searchY} shellDisplay=${probe.shellDisplay} topEl=${probe.topEl}`);
  await ctx.close();
}

// ---------- desktop journey (G1 windowed, G2, G3, G4, G5, G6) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(1300);
  await p.keyboard.press('Enter');          // BIOS → entering
  await sleep(4200);                        // settle to idle
  const crt = await p.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return { left: parseFloat(s.getPropertyValue('--crt-left')), top: parseFloat(s.getPropertyValue('--crt-top')), w: parseFloat(s.getPropertyValue('--crt-w')), h: parseFloat(s.getPropertyValue('--crt-h')) };
  });
  // lean in first — the idle CRT is a ~30px target; lean grows it
  await p.mouse.move(700, 700);
  await sleep(2000);
  const crt2 = await p.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return { left: parseFloat(s.getPropertyValue('--crt-left')), top: parseFloat(s.getPropertyValue('--crt-top')), w: parseFloat(s.getPropertyValue('--crt-w')), h: parseFloat(s.getPropertyValue('--crt-h')) };
  });
  await p.mouse.click(crt2.left + crt2.w / 2, crt2.top + crt2.h / 2);
  // headless renders ~2fps, so the boot overlay mounts late and its
  // keydown listener attaches later still — press Enter until the
  // desktop appears (each press is a no-op before the overlay exists)
  let mounted = 0;
  for (let i = 0; i < 25 && !mounted; i++) {
    await sleep(1200);
    await p.keyboard.press('Enter');
    mounted = await p.locator('.win95-desktop').count();
  }
  if (!mounted) throw new Error('desktop never mounted');
  await sleep(2000);

  // G2: taskbar text colors
  const colors = await p.evaluate(() => {
    const c = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).color : 'MISSING'; };
    return { start: c('.win95-start-btn'), home: c('.win95-home-btn'), clock: c('.win95-clock') };
  });
  log(`G2 taskbar colors → ${JSON.stringify(colors)}`);
  await p.screenshot({ path: `${DIR}/g2-desktop-taskbar.png` });

  // G4: home-card "Open paper →" deep link
  await p.locator('.win95-card-link', { hasText: 'Open paper' }).click();
  await sleep(2600);
  const g4 = await p.evaluate(() => {
    const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
    return f ? f.src : 'no-iframe';
  });
  log(`G4 home card iframe src → ${g4}`);
  await p.screenshot({ path: `${DIR}/g4-paper-window.png` });

  // G1b: the windowed Research page — top visible inside iframe
  const g1b = await p.evaluate(() => {
    const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
    try {
      const d = f.contentDocument;
      const h1 = d.querySelector('h1');
      return h1 ? `h1Y=${Math.round(h1.getBoundingClientRect().y)} text=${h1.textContent.slice(0, 30)}` : 'no-h1';
    } catch { return 'x-origin'; }
  });
  log(`G1b windowed page top → ${g1b}`);

  // G3 + G5: drag the window toward bottom-right, beyond old limits
  const tb = await p.locator('.win95-titlebar').last().boundingBox();
  await p.mouse.move(tb.x + tb.width / 2, tb.y + 8);
  await p.mouse.down();
  await p.mouse.move(1390, 880, { steps: 12 });
  await p.mouse.up();
  await sleep(600);
  const g35 = await p.evaluate(() => {
    const win = [...document.querySelectorAll('.win95-window')].pop();
    const r = win.getBoundingClientRect();
    const closeBtn = win.querySelector('.win95-titlebtn-close');
    const cb = closeBtn ? closeBtn.getBoundingClientRect() : null;
    const toolbar = document.querySelector('.win95-toolbar');
    const tz = toolbar ? getComputedStyle(toolbar).zIndex : 'none';
    const wz = getComputedStyle(win).zIndex;
    return { winRight: Math.round(r.right), closeRight: cb ? Math.round(cb.right) : null, closeTop: cb ? Math.round(cb.top) : null, vw: window.innerWidth, vh: window.innerHeight, toolbarZ: tz, winZ: wz };
  });
  log(`G3 toolbarZ=${g35.toolbarZ} vs winZ=${g35.winZ}; G5 closeBtn right=${g35.closeRight} top=${g35.closeTop} (viewport ${g35.vw}x${g35.vh})`);
  await p.screenshot({ path: `${DIR}/g3g5-drag-bottom-right.png` });

  // G6: volume slider styling
  const g6 = await p.evaluate(() => {
    const s = document.querySelector('.win95-vol-slider');
    return s ? getComputedStyle(s).appearance : 'MISSING';
  });
  log(`G6 vol slider appearance=${g6}`);
  await p.screenshot({ path: `${DIR}/g6-taskbar-closeup.png`, clip: { x: 1000, y: 860, width: 400, height: 40 } });

  log(`journey pageerrors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
}

// ---------- G7 + G8: touch device ----------
{
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
  });
  const p = await ctx.newPage();
  const reqs = [];
  p.on('request', r => { if (r.url().endsWith('.glb')) reqs.push(r.url()); });
  const t0 = Date.now();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await sleep(1500);
  await p.screenshot({ path: `${DIR}/g7-mob-bios.png` });
  // tap START
  const btn = await p.getByText('START', { exact: false }).last().boundingBox()
    .catch(() => null);
  if (btn) await p.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2);
  else await p.touchscreen.tap(195, 500);
  await sleep(2500);
  const g7 = await p.evaluate(() => ({
    desktop: document.querySelectorAll('.win95-desktop').length,
    canvas: document.querySelectorAll('canvas').length,
    desktopRect: (() => { const d = document.querySelector('.win95-desktop'); if (!d) return null; const r = d.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; })(),
  }));
  log(`G7 after START tap (+${Date.now() - t0}ms) → desktop=${g7.desktop} canvas=${g7.canvas} rect=${g7.desktopRect} glbRequests=${reqs.length}`);
  await p.screenshot({ path: `${DIR}/g7-mob-desktop.png` });

  // Start menu should have "View office (3D)"
  const startBtn = await p.locator('.win95-start-btn').first().boundingBox();
  if (startBtn) await p.touchscreen.tap(startBtn.x + startBtn.width / 2, startBtn.y + startBtn.height / 2);
  await sleep(700);
  const g7b = await p.locator('.win95-startmenu-item', { hasText: 'View office' }).count();
  log(`G7b "View office (3D)" start-menu item present: ${g7b}`);
  await p.screenshot({ path: `${DIR}/g7-mob-startmenu.png` });
  // close menu
  await p.touchscreen.tap(195, 300);
  await sleep(500);

  // G8: affiliations + titlebtn sizes + input font-size
  const g8 = await p.evaluate(() => {
    const tag = document.querySelector('.win95-affil-tag');
    const tagFit = tag ? (tag.scrollWidth <= tag.clientWidth + 1) : null;
    return { tagFit, tagText: tag ? tag.textContent : null };
  });
  log(`G8a affil tag fits: ${JSON.stringify(g8)}`);
  await p.screenshot({ path: `${DIR}/g8-mob-home.png` });

  // open Research via icon tap (single tap on touch)
  const icon = await p.locator('.win95-icon[title="Research"]').boundingBox();
  if (icon) {
    await p.touchscreen.tap(icon.x + icon.width / 2, icon.y + icon.height / 2);
    await sleep(2800);
    const g8b = await p.evaluate(() => {
      const btn = document.querySelector('.win95-titlebtn');
      const r = btn ? btn.getBoundingClientRect() : null;
      const f = [...document.querySelectorAll('iframe.win95-iframe')].pop();
      let inputFs = null, h1y = null;
      try {
        const d = f.contentDocument;
        const inp = d.getElementById('paper-search');
        inputFs = inp ? getComputedStyle(inp).fontSize : 'no-input';
        const h1 = d.querySelector('h1');
        h1y = h1 ? Math.round(h1.getBoundingClientRect().y) : null;
      } catch { inputFs = 'x-origin'; }
      return { titlebtn: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null, inputFs, h1y };
    });
    log(`G8b titlebtn=${g8b.titlebtn} searchFontSize=${g8b.inputFs} h1Y=${g8b.h1y}`);
    await p.screenshot({ path: `${DIR}/g8-mob-research.png` });
  } else {
    log('G8b research icon not found');
  }
  await ctx.close();
}

console.log('DONE-P0');
await browser.close();
