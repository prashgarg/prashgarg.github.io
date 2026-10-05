// Focused Snake v2 verifier. Run after the parent has rebuilt dist:
// node --experimental-strip-types scripts/verify-snake-polish.mjs [base]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createSnakeGame, resetGame, startGame, stepGame } from '../src/components/games/snakeEngine.ts';

const base = (process.argv[2] || 'http://127.0.0.1:4331').replace(/\/$/, '');
const out = 'shots/games-polish';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

const waitForRunning = async page => {
  await page.locator('.snake-board-running').waitFor({ timeout: 6000 });
};
const openSnake = async page => {
  await page.goto(`${base}/games/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Snake', exact: true }).click();
  await page.locator('.snake-board-ready').waitFor();
};
const readStorage = page => page.evaluate(() => ({
  v2: JSON.parse(localStorage.getItem('pg_snake_best_v2') || 'null'),
  old: localStorage.getItem('pg_snake_best_v1'),
}));

// Pure smoke checks keep the wrap edge and fresh-run reset deterministic.
{
  const state = startGame(createSnakeGame({ width: 3, height: 3, snake: [{ x: 2, y: 1 }], direction: 'right', food: { x: 1, y: 0 }, mode: 'wrap' }));
  assert.deepEqual(stepGame(state).snake[0], { x: 0, y: 1 });
  const reset = resetGame({ ...state, score: 40, difficulty: 'fast', mode: 'wrap' });
  assert.equal(reset.score, 0);
  assert.equal(reset.difficulty, 'fast');
  assert.equal(reset.mode, 'wrap');
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await desktop.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('pg_snake_best_v1', '70'));
  await openSnake(page);
  const migrated = await readStorage(page);
  assert.equal(migrated.v2.version, 2);
  assert.equal(migrated.v2.scores['classic:walls'], 70);
  assert.equal(await page.getByRole('combobox', { name: 'Speed' }).inputValue(), 'classic');
  assert.equal(await page.getByRole('combobox', { name: 'Board' }).inputValue(), 'walls');
  await page.getByRole('combobox', { name: 'Speed' }).selectOption('easy');
  await page.getByRole('combobox', { name: 'Board' }).selectOption('wrap');
  assert.equal(await page.getByRole('combobox', { name: 'Speed' }).inputValue(), 'easy');
  assert.equal(await page.getByRole('combobox', { name: 'Board' }).inputValue(), 'wrap');

  // Starting a countdown and taking focus away must leave the game ready.
  await page.locator('.snake-overlay-action').click();
  await page.waitForTimeout(260);
  assert(await page.locator('.snake-countdown').count() === 1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.snake-board-ready').count(), 1);
  assert.equal(await page.locator('.snake-countdown').count(), 0);

  await page.locator('.snake-overlay-action').click();
  await waitForRunning(page);
  assert.equal(await page.getByRole('combobox', { name: 'Speed' }).isDisabled(), true);
  await page.locator('.snake-action').click();
  await page.locator('.snake-board-paused').waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Board' }).isDisabled(), true);
  await page.locator('.snake-overlay-secondary').click();
  await page.locator('.snake-board-ready').waitFor();
  assert.equal(await page.getByRole('combobox', { name: 'Speed' }).isDisabled(), false);
  assert.equal(await page.locator('.snake-food-feedback').count(), 0);
  await page.screenshot({ path: `${out}/desktop-ready.png` });
  await desktop.close();
  console.log('PASS desktop settings, v1 migration, countdown blur cancellation, paused New game, and reset feedback');

  // Start-menu focus loss drives the same active=false cancellation path.
  const osContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const os = await osContext.newPage();
  os.on('pageerror', error => errors.push(error.message));
  await os.goto(`${base}/os/`, { waitUntil: 'load' });
  await os.getByRole('button', { name: 'Start', exact: true }).click();
  await os.getByRole('menuitem', { name: 'Games', exact: true }).click();
  await os.getByRole('button', { name: 'Snake', exact: true }).click();
  const gameSurface = os.locator('[data-app-window="games"]');
  await gameSurface.locator('.snake-board-ready').waitFor();
  await gameSurface.locator('.snake-overlay-action').click({ force: true });
  await os.waitForTimeout(260);
  await os.locator('[aria-controls="desktop-start-menu"]').click();
  await os.waitForTimeout(120);
  assert.equal(await gameSurface.locator('.snake-board-ready').count(), 1);
  assert.equal(await gameSurface.locator('.snake-countdown').count(), 0);
  await osContext.close();
  console.log('PASS Start-menu deactivation cancels countdown before launch');

  for (const width of [390, 320]) {
    const mobileContext = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 568 }, isMobile: true, hasTouch: true,
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => errors.push(error.message));
    await openSnake(mobile);
    const board = mobile.locator('.snake-board');
    // Use the overlay itself for touch Start/Resume, ensuring its pointerdown
    // is not interpreted as a board swipe.
    await mobile.locator('.snake-overlay-action').tap();
    await waitForRunning(mobile);
    const boardBox = await board.boundingBox();
    assert(boardBox, `Snake board should have bounds at ${width}px`);
    const touch = await mobileContext.newCDPSession(mobile);
    const x = boardBox.x + boardBox.width / 2;
    const y = boardBox.y + boardBox.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 9 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 34, id: 9 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForTimeout(220);
    assert.equal((await board.getAttribute('class')).includes('snake-dir-up'), true);
    await mobile.locator('.snake-action').tap();
    await mobile.locator('.snake-board-paused').waitFor();
    await mobile.locator('.snake-overlay-action').tap();
    await waitForRunning(mobile);
    assert(await mobile.locator('.snake-pad').count() === 4);
    for (const rect of await mobile.locator('.snake-pad').evaluateAll(els => els.map(el => {
      const box = el.getBoundingClientRect();
      const content = document.querySelector('.games-content')?.getBoundingClientRect();
      return { width: box.width, height: box.height, visible: box.bottom <= (content?.bottom ?? window.innerHeight) && box.top >= (content?.top ?? 0) };
    }))) {
      assert(rect.width >= 44 && rect.height >= 44);
      assert.equal(rect.visible, true, `D-pad must be visible at ${width}px`);
    }
    assert(await mobile.locator('.games-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await mobile.screenshot({ path: `${out}/mobile-${width}.png` });
    await mobileContext.close();
    console.log(`PASS touch Start/Resume, pointermove swipe, 44px controls, and ${width}px fit`);
  }

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
