// Smoke-test the accessories through both desktop presentation modes:
// the fullscreen lightweight desktop and the DOM desktop composited into the
// 3D monitor. Run against a built preview with Node 22.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://127.0.0.1:4331').replace(/\/$/, '');
const output = process.argv[3] || 'shots/accessories-monitor';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  reducedMotion: 'reduce',
});
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
const page = await context.newPage();
page.setDefaultTimeout(15000);
const windowFor = (root, id) => root.locator(`[data-app-window="${id}"]`);
const openStartAccessory = async root => {
  await root.getByRole('button', { name: 'Start', exact: true }).click();
  const menu = root.getByRole('menu', { name: 'Start', exact: true });
  await menu.getByRole('menuitem', { name: 'Accessories', exact: true }).hover();
  const branch = root.getByRole('menu', { name: 'Accessories', exact: true });
  await branch.waitFor();
  return { menu, branch };
};
const launch = async (root, id, label) => {
  const { branch } = await openStartAccessory(root);
  await branch.getByRole('menuitem', { name: label, exact: true }).click();
  const window = windowFor(root, id);
  await window.waitFor();
  return window;
};
const close = async (root, id) => {
  const window = windowFor(root, id);
  await window.getByRole('button', { name: 'Close', exact: true }).click();
  await window.waitFor({ state: 'detached' });
};

try {
  // Lightweight mode: the same desktop used on touch screens and by the
  // explicit ?composite=0 fallback. This confirms the Start submenu launches
  // the real applications without an intermediate folder window.
  await page.goto(`${base}/?composite=0`, { waitUntil: 'load' });
  const desktop = page.locator('.win95-desktop');
  await desktop.waitFor();
  const timer = await launch(page, 'focus', 'Focus timer');
  await timer.locator('[data-focus-timer]').waitFor();
  assert.equal(await page.locator('[data-app-window="accessories"]').count(), 0);
  await page.screenshot({ path: `${output}/lightweight-focus.png` });
  await close(page, 'focus');
  const paint = await launch(page, 'paint', 'Paint');
  await paint.locator('.paint-canvas').waitFor();
  assert(await paint.locator('.paint-app').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Paint must fit the lightweight desktop');
  await close(page, 'paint');
  console.log('PASS lightweight desktop accessories launch and fit');

  // Full room mode: session storage takes us directly to the monitor after
  // hydration, avoiding the BIOS animation while retaining the real iframe.
  const roomContext = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const room = await roomContext.newPage();
  room.setDefaultTimeout(20000);
  roomContext.on('page', child => child.on('pageerror', error => errors.push(error.message)));
  await room.addInitScript(() => sessionStorage.setItem('pg_phase', 'desktop'));
  await room.goto(`${base}/`, { waitUntil: 'load' });
  const frame = room.frameLocator('iframe[title="prashantgarg.os"]');
  await frame.locator('.win95-desktop').waitFor();
  const framedTimer = await launch(frame, 'focus', 'Focus timer');
  await framedTimer.locator('[data-focus-timer]').waitFor();
  assert.equal(await frame.locator('[data-app-window="accessories"]').count(), 0);
  await room.screenshot({ path: `${output}/composited-focus.png` });
  await close(frame, 'focus');
  const framedPaint = await launch(frame, 'paint', 'Paint');
  await framedPaint.locator('.paint-canvas').waitFor();
  await close(frame, 'paint');
  await roomContext.close();
  console.log('PASS composited monitor accessories launch and cleanup');

  assert.deepEqual(errors, [], `browser page errors: ${errors.join('; ')}`);
} catch (error) {
  await page.screenshot({ path: `${output}/accessories-monitor-failure.png`, timeout: 5000 }).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
