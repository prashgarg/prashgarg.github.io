// Browser checks for the cascading Start-menu launchers.
// Run against a built preview with Node 22:
//   node scripts/verify-start-submenus.mjs http://127.0.0.1:4331
//
// The menu is intentionally tested through its accessible roles.  This keeps
// the check about the interaction contract rather than the implementation of
// the fly-out (desktop) or replacement (narrow touch) layout.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const out = 'shots/start-submenus';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const context = async (options = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
};
const wait = async (fn, message) => {
  for (let i = 0; i < 60; i += 1) {
    if (await fn()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
};
const start = page => page.getByRole('menu', { name: 'Start', exact: true });
const branch = (page, name) => page.getByRole('menu', { name, exact: true });
const menuitem = (menu, name) => menu.getByRole('menuitem', { name, exact: true });
const screenshot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const openStart = async page => {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await start(page).waitFor();
};
const closeApp = async (page, id) => {
  const win = page.locator(`[data-app-window="${id}"]`);
  if (await win.count()) {
    await win.getByRole('button', { name: 'Close', exact: true }).click();
    await win.waitFor({ state: 'detached' });
  }
};
const assertFitsViewport = async (page, menu, label) => {
  const viewport = page.viewportSize();
  assert(viewport, 'test context must have a viewport');
  const box = await menu.boundingBox();
  assert(box, `${label} submenu should be laid out`);
  assert(box.x >= -1 && box.y >= -1, `${label} submenu should not begin outside the viewport`);
  assert(box.x + box.width <= viewport.width + 1, `${label} submenu should fit horizontally`);
  assert(box.y + box.height <= viewport.height + 1, `${label} submenu should fit vertically`);
  for (const item of await menu.getByRole('menuitem').all()) {
    const itemBox = await item.boundingBox();
    assert(itemBox, `${label} item should be laid out`);
    assert(itemBox.x >= -1 && itemBox.x + itemBox.width <= viewport.width + 1,
      `${label} item should fit horizontally`);
  }
};

const games = ['Snake', 'Solitaire', 'Minesweeper'];
const accessories = ['Notepad', 'Paint', 'Calculator', 'Focus timer', 'Filing cabinet', 'Ambient mixer', 'Music sequencer'];
const accessoryIds = {
  Notepad: 'notepad', Paint: 'paint', Calculator: 'calculator', 'Focus timer': 'focus',
  'Filing cabinet': 'cabinet', 'Ambient mixer': 'ambient', 'Music sequencer': 'sequencer',
};
const assertFocused = async item => {
  await wait(
    () => item.evaluate(element => document.activeElement === element),
    `expected ${await item.innerText()} to have keyboard focus`,
  );
};

try {
  // Desktop uses a genuine right-hand fly-out. Hovering the parent should not
  // create a Games/Accessories window, and the pointer must be able to cross
  // the small gap to the child menu without closing it.
  const desktop = await context();
  const page = await desktop.newPage();
  await page.goto(`${base}/os/?app=home`, { waitUntil: 'load' });
  await page.locator('.win95-desktop').waitFor();
  await openStart(page);
  const gamesParent = menuitem(start(page), 'Games');
  await gamesParent.hover();
  const gamesMenu = branch(page, 'Games');
  await gamesMenu.waitFor();
  assert.equal(await page.locator('[data-app-window="games"]').count(), 0, 'hovering Games must not open its folder window');
  assert.equal(await page.locator('[data-app-window="accessories"]').count(), 0, 'hovering a Start branch must not open a folder window');
  const parentBox = await gamesParent.boundingBox();
  const childBox = await gamesMenu.boundingBox();
  assert(parentBox && childBox);
  // Walk through the actual horizontal gap in small steps. A menu that
  // vanishes during this walk will fail the final visible assertion.
  await page.mouse.move(parentBox.x + parentBox.width - 3, parentBox.y + parentBox.height / 2);
  await page.mouse.move(childBox.x + 4, childBox.y + childBox.height / 2, { steps: 12 });
  await gamesMenu.waitFor();
  for (const label of games) await menuitem(gamesMenu, label).waitFor();
  await screenshot(page, 'desktop-games-flyout');

  // A child game is a direct launch into the selected pane, rather than a
  // second click through a folder window.
  await menuitem(gamesMenu, 'Snake').click();
  await page.locator('[data-app-window="games"]').waitFor();
  await page.locator('[data-game="snake"]').waitFor();
  assert.equal(await page.locator('[data-app-window="accessories"]').count(), 0);
  assert.equal(await page.locator('.games-folder').count(), 0, 'direct Start launch must skip the Games folder');
  await closeApp(page, 'games');

  await openStart(page);
  const accessoriesParent = menuitem(start(page), 'Accessories');
  await accessoriesParent.hover();
  const accessoriesMenu = branch(page, 'Accessories');
  await accessoriesMenu.waitFor();
  for (const label of accessories) await menuitem(accessoriesMenu, label).waitFor();
  await screenshot(page, 'desktop-accessories-flyout');
  for (const label of accessories) {
    await menuitem(accessoriesMenu, label).click();
    const id = accessoryIds[label];
    await page.locator(`[data-app-window="${id}"]`).waitFor();
    assert.equal(await page.locator('[data-app-window="accessories"]').count(), 0,
      `${label} must launch directly without an Accessories folder`);
    await closeApp(page, id);
    await openStart(page);
    await menuitem(start(page), 'Accessories').hover();
    await branch(page, 'Accessories').waitFor();
  }
  // Clicking outside the menu closes both levels.
  // The home card intentionally captures pointer events over the central
  // desktop; use the exposed empty strip above it for a real outside click.
  await page.mouse.click(760, 40);
  assert.equal(await start(page).count(), 0, 'clicking outside should close the root Start menu');
  assert.equal(await branch(page, 'Accessories').count(), 0, 'clicking outside should close the branch menu');
  await desktop.close();
  console.log('PASS desktop Games/Accessories fly-outs, direct launches, pointer crossing, and outside close');

  // Keyboard contract: Right enters a branch, Down/Up stay within it, Left
  // returns to its parent, and Escape first closes the branch then the root.
  const keyboard = await context();
  const k = await keyboard.newPage();
  await k.goto(`${base}/os/?app=home`, { waitUntil: 'load' });
  await openStart(k);
  const root = start(k);
  const gp = menuitem(root, 'Games');
  await gp.focus();
  await k.keyboard.press('ArrowRight');
  const km = branch(k, 'Games');
  await km.waitFor();
  const snakeItem = menuitem(km, 'Snake');
  const solitaireItem = menuitem(km, 'Solitaire');
  const minesweeperItem = menuitem(km, 'Minesweeper');
  await assertFocused(snakeItem);
  await k.keyboard.press('ArrowDown');
  await assertFocused(solitaireItem);
  await k.keyboard.press('ArrowUp');
  await assertFocused(snakeItem);
  // Branch menus wrap independently: Up from the first item reaches the
  // last, and Down from the last returns to the first.
  await snakeItem.focus();
  await k.keyboard.press('ArrowUp');
  await assertFocused(minesweeperItem);
  await k.keyboard.press('ArrowDown');
  await assertFocused(snakeItem);
  await k.keyboard.press('ArrowLeft');
  await km.waitFor({ state: 'hidden' });
  await assertFocused(gp);
  await k.keyboard.press('ArrowRight');
  await km.waitFor();
  await k.keyboard.press('Escape');
  await km.waitFor({ state: 'hidden' });
  await k.keyboard.press('Escape');
  await root.waitFor({ state: 'hidden' });

  // The second branch must have the same independent wrap-around behavior.
  await openStart(k);
  const accessoriesParentKeyboard = menuitem(start(k), 'Accessories');
  await accessoriesParentKeyboard.focus();
  await k.keyboard.press('ArrowRight');
  const kam = branch(k, 'Accessories');
  await kam.waitFor();
  const accessoryItems = kam.getByRole('menuitem');
  const firstAccessory = accessoryItems.first();
  const lastAccessory = accessoryItems.last();
  await firstAccessory.focus();
  await k.keyboard.press('ArrowUp');
  await assertFocused(lastAccessory);
  await k.keyboard.press('ArrowDown');
  await assertFocused(firstAccessory);
  await k.keyboard.press('ArrowLeft');
  await kam.waitFor({ state: 'hidden' });
  await assertFocused(accessoriesParentKeyboard);
  await k.keyboard.press('Escape');
  await root.waitFor({ state: 'hidden' });
  await keyboard.close();
  console.log('PASS Start-menu keyboard branch navigation and Escape hierarchy');

  // On touch-sized desktops the child menu replaces the list or otherwise
  // repositions it. Either shape is fine; every visible control must remain
  // inside the viewport, and Back must return to the root menu.
  for (const [width, height] of [[390, 844], [320, 568]]) {
    const mobile = await context({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const m = await mobile.newPage();
    await m.goto(`${base}/os/?app=home`, { waitUntil: 'load' });
    await openStart(m);
    const mStart = start(m);
    await menuitem(mStart, 'Accessories').tap();
    const mAccessories = branch(m, 'Accessories');
    await mAccessories.waitFor();
    await assertFitsViewport(m, mAccessories, `Accessories at ${width}px`);
    for (const item of await mAccessories.getByRole('menuitem').all()) {
      assert((await item.boundingBox()).height >= 44, 'touch submenu items should be at least 44px high');
    }
    await screenshot(m, `mobile-${width}-accessories-panel`);
    const mobileAccessoryItems = mAccessories.getByRole('menuitem');
    // The replacement menu must keep arrow navigation inside its own branch,
    // including at both ends of the list (the first item is the Start return
    // control on narrow layouts).
    await mobileAccessoryItems.first().focus();
    await m.keyboard.press('ArrowUp');
    await assertFocused(mobileAccessoryItems.last());
    await m.keyboard.press('ArrowDown');
    await assertFocused(mobileAccessoryItems.first());
    assert(await mAccessories.evaluate(menu => menu.contains(document.activeElement)),
      `Accessories keyboard focus should stay within the ${width}px replacement menu`);
    const back = mAccessories.getByRole('menuitem', { name: 'Start', exact: true });
    assert(await back.count(), 'narrow submenu should expose a Start/Back action');
    await back.tap();
    await mAccessories.waitFor({ state: 'hidden' });
    await mStart.waitFor();
    await menuitem(mStart, 'Games').tap();
    const mGames = branch(m, 'Games');
    await mGames.waitFor();
    await assertFitsViewport(m, mGames, `Games at ${width}px`);
    await menuitem(mGames, 'Minesweeper').tap();
    await m.locator('[data-app-window="games"]').waitFor();
    await m.locator('[data-game="minesweeper"]').waitFor();
    assert.equal(await m.locator('.games-folder').count(), 0);
    await screenshot(m, `mobile-${width}-minesweeper`);
    await mobile.close();
  }
  console.log('PASS 390px/320px touch branch fit, Back navigation, and direct game launch');

  assert.deepEqual(errors, [], 'Start submenu interactions should not produce page errors');
} finally {
  await browser.close();
}
