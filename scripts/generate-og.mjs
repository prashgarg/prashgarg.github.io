/**
 * Generates 1200×630 Open Graph images for each page.
 * Screenshotting the live Astro dev server at localhost:4321.
 *
 * Usage:
 *   node scripts/generate-og.mjs
 *
 * Output: public/og/{index,research,talks,library,now}.png
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir    = path.resolve(__dirname, '../public/og');

const BASE_URL = 'http://localhost:4321';
const OG_W = 1200;
const OG_H = 630;

const pages = [
  { path: '/',         out: 'index.png',    settleMs: 5000 },
  { path: '/research', out: 'research.png', settleMs: 2000 },
  { path: '/talks',    out: 'talks.png',    settleMs: 2000 },
  { path: '/library',  out: 'library.png',  settleMs: 2000 },
  { path: '/now',      out: 'now.png',      settleMs: 2000 },
];

const browser = await chromium.launch({ headless: true });

for (const pg of pages) {
  const ctx  = await browser.newContext({ viewport: { width: OG_W, height: OG_H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const url  = BASE_URL + pg.path;
  console.log(`→ ${url}`);

  await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(pg.settleMs);

  const dest = path.join(outDir, pg.out);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`   ✓ ${dest}`);
  await ctx.close();
}

await browser.close();
console.log('\nDone — OG images in public/og/');
