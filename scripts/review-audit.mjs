// Page-by-page audit: every dist page at desktop (1400x900) + mobile
// (390x844), console errors per page, layout overflow detection.
// Usage: node scripts/review-audit.mjs [base-url]
import { chromium } from 'playwright';
import { mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const BASE = process.argv[2] || 'http://localhost:4321';
const DIR = 'shots/audit0610';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// enumerate routes from dist/
const routes = ['/'];
const walk = (d, prefix) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, `${prefix}${f}/`);
    else if (f === 'index.html' && prefix) routes.push(`/${prefix}`);
  }
};
walk('dist', '');
routes.push('/404.html');

const browser = await chromium.launch({ headless: true });
const report = [];
for (const vp of [{ w: 1400, h: 900, tag: 'desk' }, { w: 390, h: 844, tag: 'mob' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  for (const r of routes) {
    errs.length = 0;
    try {
      await p.goto(BASE + r, { waitUntil: 'load', timeout: 30000 });
      await sleep(r === '/' ? 2500 : 1200);
      // horizontal overflow check (mobile killer)
      const overflow = await p.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const name = r === '/' ? 'home' : r.replace(/\//g, '_').replace(/^_|_$/g, '');
      await p.screenshot({ path: `${DIR}/${vp.tag}-${name}.png` });
      report.push({ route: r, vp: vp.tag, errors: [...errs], overflow });
    } catch (e) {
      report.push({ route: r, vp: vp.tag, errors: ['NAV-FAIL ' + e.message.split('\n')[0]], overflow: 0 });
    }
  }
  await ctx.close();
}
await browser.close();

let bad = 0;
for (const r of report) {
  const flag = r.errors.length || r.overflow > 1;
  if (flag) bad++;
  console.log(`${flag ? '⚠' : '✓'} [${r.vp}] ${r.route}  overflow=${r.overflow}px ${r.errors.length ? ' errors: ' + r.errors.join(' | ') : ''}`);
}
console.log(`\n${report.length} checks, ${bad} flagged`);
console.log('DONE-AUDIT');
