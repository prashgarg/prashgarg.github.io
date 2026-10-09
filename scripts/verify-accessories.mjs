// Browser integration checks for the Win95 Accessories applications.
// Run against a built preview with Node 22:
//   node scripts/verify-accessories.mjs http://127.0.0.1:4331
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const out = 'shots/accessories';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const context = async (options = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
};
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const wait = async (fn, message) => {
  for (let i = 0; i < 60; i += 1) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
};
const appWindow = (page, id) => page.locator(`[data-app-window="${id}"]`);
const openDeep = async (page, id, waitFor = `.accessory-app`) => {
  await page.goto(`${base}/os/?app=${id}`, { waitUntil: 'load' });
  await appWindow(page, id).waitFor();
  await page.locator(waitFor).waitFor();
  await page.waitForTimeout(180);
};
const closeWindow = async (page, id) => {
  await appWindow(page, id).getByRole('button', { name: 'Close', exact: true }).click();
  await appWindow(page, id).waitFor({ state: 'detached' });
};
const textDownload = async download => {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};
const pngDownload = async download => {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};
const canvasInk = page => page.locator('.paint-canvas').evaluate(canvas => {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    // The paper is #fffdf7. Count pixels that are materially different.
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 240) ink += 1;
  }
  return ink;
});
const touchDrag = async (page, from, to) => {
  const client = await page.context().newCDPSession(page);
  const point = (x, y, id = 1) => ({ x, y, radiusX: 2, radiusY: 2, force: 1, id });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(from.x, from.y)] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(to.x, to.y)] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

try {
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(`${base}/os/?app=home`, { waitUntil: 'load' });
  await page.locator('.win95-desktop').waitFor();
  assert.equal(await page.locator('[data-app-window]').count(), 0, 'desktop should start without accessory windows');
  assert.equal(await page.locator('[data-app-icon="accessories"]').count(), 0, 'Accessories should not clutter the desktop icon column');
  assert.equal(await page.locator('[data-app-icon="notepad"]').count(), 0);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const startMenu = page.getByRole('menu', { name: 'Start', exact: true });
  await startMenu.getByRole('menuitem', { name: 'Accessories', exact: true }).click();
  const accessoriesMenu = page.getByRole('menu', { name: 'Accessories', exact: true });
  await accessoriesMenu.waitFor();
  assert.equal(await page.locator('[data-app-window="accessories"]').count(), 0, 'opening the Accessories submenu must not open its folder window');
  for (const label of ['Notepad', 'Paint', 'Calculator', 'Focus timer', 'Filing cabinet', 'Ambient mixer', 'Music sequencer']) {
    await accessoriesMenu.getByRole('menuitem', { name: label, exact: true }).waitFor();
  }
  await shot(page, 'desktop-accessories-submenu');

  // The folder remains available as a direct route for users who want its icon grid.
  await page.goto(`${base}/os/?app=accessories`, { waitUntil: 'load' });
  await appWindow(page, 'accessories').waitFor();
  for (const label of ['Notepad', 'Paint', 'Calculator', 'Focus timer']) {
    await appWindow(page, 'accessories').getByRole('button', { name: label, exact: true }).waitFor();
  }
  await shot(page, 'desktop-folder');
  await ctx.close();
  console.log('PASS Accessories submenu and direct folder route stay out of the idle desktop');

  // Notepad: delayed local save, clear confirmation, text export, close/reopen,
  // and the browser-storage failure message.
  const notes = await context();
  const n = await notes.newPage();
  await n.addInitScript(() => localStorage.removeItem('pg_notepad_v1'));
  await openDeep(n, 'notepad', '.notepad-editor');
  const editor = n.locator('.notepad-editor');
  await editor.fill('A small note from the sandbox.\nKeep the machine quiet.');
  await n.locator('[aria-label="Filename"]').fill('sandbox-notes');
  await n.waitForTimeout(500);
  assert.equal(await n.evaluate(() => JSON.parse(localStorage.getItem('pg_notepad_v1')).content), 'A small note from the sandbox.\nKeep the machine quiet.');
  const downloadPromise = n.waitForEvent('download');
  await n.getByRole('button', { name: 'Save as .txt', exact: true }).click();
  const noteDownload = await downloadPromise;
  assert.equal(noteDownload.suggestedFilename(), 'sandbox-notes.txt');
  assert.equal(await textDownload(noteDownload), 'A small note from the sandbox.\nKeep the machine quiet.');
  await n.getByRole('button', { name: 'New', exact: true }).click();
  await n.getByRole('alert').getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.match(await editor.inputValue(), /small note/);
  await n.getByRole('button', { name: 'New', exact: true }).click();
  await n.getByRole('alert').getByRole('button', { name: 'Clear', exact: true }).click();
  assert.equal(await editor.inputValue(), '');
  await editor.fill('Reopened note');
  await n.waitForTimeout(500);
  await closeWindow(n, 'notepad');
  await n.getByRole('button', { name: 'Start', exact: true }).click();
  await n.getByRole('menu', { name: 'Start', exact: true }).getByRole('menuitem', { name: 'Accessories', exact: true }).click();
  await n.getByRole('menu', { name: 'Accessories', exact: true }).getByRole('menuitem', { name: 'Notepad', exact: true }).click();
  await appWindow(n, 'notepad').locator('.notepad-editor').waitFor();
  assert.equal(await appWindow(n, 'notepad').locator('.notepad-editor').inputValue(), 'Reopened note');
  await shot(n, 'notepad-reopened');
  await notes.close();

  const blockedNotes = await context();
  await blockedNotes.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'pg_notepad_v1') throw new Error('Storage blocked for test');
      return original.call(this, key, value);
    };
  });
  const bn = await blockedNotes.newPage();
  await openDeep(bn, 'notepad', '.notepad-editor');
  await bn.locator('.notepad-editor').fill('cannot save');
  await bn.locator('.notepad-editor').blur();
  await bn.getByText('Could not save in this browser').waitFor();
  await blockedNotes.close();
  console.log('PASS Notepad save, export, clear/cancel, reopen, and blocked-storage handling');

  // Paint: pencil and rectangle strokes, undo/redo, pointer cancellation,
  // persistence, and a real PNG header/dimension check.
  const paintCtx = await context();
  const p = await paintCtx.newPage();
  await p.addInitScript(() => {
    if (!sessionStorage.getItem('pg_paint_cleared')) {
      localStorage.removeItem('pg_paint_v1');
      sessionStorage.setItem('pg_paint_cleared', '1');
    }
  });
  await openDeep(p, 'paint', '.paint-canvas');
  const canvas = p.locator('.paint-canvas');
  const box = await canvas.boundingBox();
  assert(box && box.width > 200 && box.height > 100);
  const before = await canvasInk(p);
  await p.mouse.move(box.x + 60, box.y + 50);
  await p.mouse.down();
  await p.mouse.move(box.x + 240, box.y + 110, { steps: 8 });
  await p.mouse.up();
  const pencil = await canvasInk(p);
  assert(pencil > before, 'pencil stroke should change the canvas');
  await appWindow(p, 'paint').getByRole('button', { name: 'Rectangle', exact: true }).click();
  await p.mouse.move(box.x + 300, box.y + 90);
  await p.mouse.down();
  await p.mouse.move(box.x + 460, box.y + 190, { steps: 8 });
  await p.mouse.up();
  const rectangle = await canvasInk(p);
  assert(rectangle > pencil, 'rectangle stroke should change the canvas');
  await p.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal(await canvasInk(p), pencil, 'undo should remove the rectangle');
  await p.getByRole('button', { name: 'Redo', exact: true }).click();
  assert.equal(await canvasInk(p), rectangle, 'redo should restore the rectangle');
  // Start a long line and cancel it; the temporary shape must not be committed.
  const cancelBox = await canvas.boundingBox();
  await p.mouse.move(cancelBox.x + 500, cancelBox.y + 80);
  await p.mouse.down();
  await p.mouse.move(cancelBox.x + 650, cancelBox.y + 180, { steps: 4 });
  await p.evaluate(() => document.querySelector('.paint-canvas').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })));
  await p.mouse.up();
  assert.equal(await canvasInk(p), rectangle, 'pointer cancellation should restore the pre-stroke canvas');
  const pngPromise = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Save PNG', exact: true }).click();
  const png = await pngDownload(await pngPromise);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 800);
  assert.equal(png.readUInt32BE(20), 500);
  await p.waitForTimeout(600);
  await closeWindow(p, 'paint');
  await p.goto(`${base}/os/?app=paint`, { waitUntil: 'load' });
  await appWindow(p, 'paint').locator('.paint-canvas').waitFor();
  await wait(async () => (await appWindow(p, 'paint').locator('.paint-restoring').count()) === 0, 'Paint restore overlay should settle');
  await wait(async () => (await canvasInk(p)) > before, 'saved painting should be restored after reopening');
  await shot(p, 'paint-restored');
  await paintCtx.close();
  console.log('PASS Paint pencil/rectangle, undo/redo, pointercancel, PNG export, and persistence');

  // Calculator: keyboard and button paths, repeated equals, percent semantics,
  // and focus isolation from a note editor in another inline window.
  const calcCtx = await context();
  const c = await calcCtx.newPage();
  await openDeep(c, 'calculator', '.calculator-app');
  const calculator = appWindow(c, 'calculator').locator('.calculator-app');
  await calculator.focus();
  await c.keyboard.type('12+3');
  await c.keyboard.press('Enter');
  assert.equal(await calculator.getByLabel('Calculator display').textContent(), '15');
  await c.keyboard.press('Enter');
  assert.equal(await calculator.getByLabel('Calculator display').textContent(), '18');
  await calculator.getByRole('button', { name: 'Clear calculator', exact: true }).click();
  for (const key of ['2', '0', '0', '+', '1', '0', 'Percent', 'Equals']) {
    const button = key === '+' ? calculator.getByRole('button', { name: 'Add', exact: true })
      : key === 'Percent' ? calculator.getByRole('button', { name: 'Percent', exact: true })
        : key === 'Equals' ? calculator.getByRole('button', { name: 'Equals', exact: true })
          : calculator.getByRole('button', { name: key, exact: true });
    await button.click();
  }
  assert.equal(await calculator.getByLabel('Calculator display').textContent(), '220');
  await c.getByRole('button', { name: 'Start', exact: true }).click();
  await c.getByRole('menu', { name: 'Start', exact: true }).getByRole('menuitem', { name: 'Accessories', exact: true }).click();
  await c.getByRole('menu', { name: 'Accessories', exact: true }).getByRole('menuitem', { name: 'Notepad', exact: true }).click();
  await appWindow(c, 'notepad').locator('.notepad-editor').waitFor();
  await appWindow(c, 'notepad').locator('.notepad-editor').click();
  await c.keyboard.type('123');
  assert.equal(await appWindow(c, 'notepad').locator('.notepad-editor').inputValue(), '123');
  await shot(c, 'calculator-and-notepad');
  await calcCtx.close();
  console.log('PASS Calculator keyboard/repeated-equals/percent and note-input focus isolation');

  // Focus timer: ensure the clock route opens the same working accessory and
  // that the basic stopwatch lifecycle is usable.
  const timerCtx = await context();
  const t = await timerCtx.newPage();
  await openDeep(t, 'focus', '[data-focus-timer]');
  const timer = appWindow(t, 'focus');
  await timer.getByRole('button', { name: 'Stopwatch', exact: true }).click();
  await timer.getByRole('button', { name: 'Start', exact: true }).click();
  await timer.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  await timer.getByRole('button', { name: 'Pause', exact: true }).click();
  await timer.getByText('Paused', { exact: true }).waitFor();
  await shot(t, 'focus-timer');
  await timerCtx.close();
  console.log('PASS Focus timer deep link and stopwatch start/pause');

  // Touch layout: use CDP touch events for a real mobile paint stroke and
  // verify that the toolbars stay within the maximised accessory window.
  for (const [width, height] of [[390, 844], [320, 568]]) {
    const mobile = await context({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const m = await mobile.newPage();
    await openDeep(m, 'paint', '.paint-canvas');
    const paintApp = appWindow(m, 'paint').locator('.paint-app');
    assert(await paintApp.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Paint must not overflow horizontally at ${width}px`);
    for (const button of await appWindow(m, 'paint').locator('.paint-tool').evaluateAll(els => els.map(el => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height })))) {
      assert(button.h >= 44, `Paint touch tool should be at least 44px high at ${width}px`);
    }
    const mobileCanvas = m.locator('.paint-canvas');
    const mobileBox = await mobileCanvas.boundingBox();
    const mobileBefore = await canvasInk(m);
    await touchDrag(m, { x: mobileBox.x + 30, y: mobileBox.y + 30 }, { x: mobileBox.x + 180, y: mobileBox.y + 90 });
    await m.waitForTimeout(100);
    assert((await canvasInk(m)) > mobileBefore, `Touch paint stroke should register at ${width}px`);
    await shot(m, `paint-mobile-${width}`);
    await mobile.close();
  }
  console.log('PASS 390px/320px touch Paint controls and drawing');

  // Every accessory has a direct /os/?app= route. This catches regressions in
  // the lightweight desktop entry and query-to-path mapping.
  const deep = await context();
  const d = await deep.newPage();
  for (const [id, selector] of [['notepad', '.notepad-editor'], ['paint', '.paint-canvas'], ['calculator', '.calculator-app'], ['focus', '[data-focus-timer]']]) {
    await openDeep(d, id, selector);
    assert.equal(await appWindow(d, id).count(), 1, `deep link should open ${id}`);
  }
  await deep.close();
  assert.deepEqual(errors, [], `browser page errors: ${errors.join('; ')}`);
  console.log('PASS accessory deep links and browser exception check');
} finally {
  await browser.close();
}
