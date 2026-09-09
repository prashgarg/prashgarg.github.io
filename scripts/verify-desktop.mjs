// Built desktop interaction checks, independent of the 3D renderer.
// node scripts/verify-desktop.mjs [base URL] [screenshot directory]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const shots = process.argv[3] || 'shots/desktop-check';
await mkdir(shots, {recursive:true});
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1024,height:640}});
// Exercise the real timer without waiting five minutes for every test.
await ctx.addInitScript(() => sessionStorage.setItem('pg_ss_ms', '1800'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const shot = name => page.screenshot({path:`${shots}/${name}.png`});
try {
  await page.goto(`${base}/os`, {waitUntil:'load'});
  await page.locator('.win95-home-name').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.match(await page.locator('.win95-home-bio').first().evaluate(el => getComputedStyle(el).fontFamily), /Georgia/);
  await page.mouse.move(20,20);
  await shot('home');
  // Single click must open exactly one window; repeated activation reuses it.
  await page.getByRole('button', {name:'Research',exact:true}).click();
  await page.locator('.win95-window').waitFor();
  const article = page.frameLocator('iframe.win95-iframe');
  await article.locator('h1').waitFor();
  await page.locator('.win95-window:not(.opening)').waitFor();
  await page.locator('.win95-content > [aria-hidden="true"]').waitFor({state:'detached'});
  await page.waitForTimeout(2200);
  assert.equal(await page.locator('.win95-screensaver').count(),0, 'Screensaver interrupted an open document');
  assert.equal(await page.locator('.win95-window').count(),1);
  const summary = article.locator('.paper-abstract summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  await article.locator('.paper-abstract[open]').first().waitFor();
  await shot('research-abstract');
  await summary.click();
  await shot('research');
  await page.getByRole('button',{name:'Maximise',exact:true}).click();
  const maximized = await page.locator('.win95-window').boundingBox();
  assert(maximized && maximized.width >= 1020 && maximized.height >= 600);
  await shot('research-maximized');
  await page.getByRole('button',{name:'Restore',exact:true}).click();
  await page.getByRole('button',{name:'Minimise',exact:true}).click();
  await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Research',exact:true}).first().click();
  await page.locator('.win95-window').waitFor();
  assert.equal(await page.locator('.win95-window').count(),1);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('.win95-window').waitFor({state:'detached'});
  await page.locator('.win95-screensaver').waitFor({timeout:6000});
  await shot('screensaver');
  await page.mouse.move(40,40);
  await page.locator('.win95-screensaver').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log('PASS: single-click opening, abstract keyboard access, maximize/restore/minimize, and document-aware screensaver.');
} catch (error) {
  await shot('failure');
  throw error;
} finally {
  await browser.close();
}
