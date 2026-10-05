// Run against the built sandbox with Node 22:
// node --experimental-strip-types scripts/verify-minesweeper.mjs http://127.0.0.1:4331
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createMinesweeperGame, revealCell } from '../src/components/games/minesweeperEngine.ts';

const base = (process.argv[2] || 'http://127.0.0.1:4331').replace(/\/$/, '');
const output = 'shots/games-polish';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const desktop = { width: 1400, height: 900 };

async function makeContext(options = {}, deterministic = false) {
  const context = await browser.newContext({ viewport: desktop, ...options });
  if (deterministic) await context.addInitScript(() => { Math.random = () => 0.42; });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return context;
}

async function openFromDesktop(page) {
  await page.goto(`${base}/os/`, { waitUntil: 'load' });
  await page.locator('.win95-start-btn[aria-haspopup="menu"]').waitFor();
  await page.locator('.win95-start-btn[aria-haspopup="menu"]').click();
  await page.getByRole('menuitem', { name: 'Games', exact: true }).click();
  await page.getByRole('button', { name: 'Minesweeper', exact: true }).click();
  await page.locator('.minesweeper-game').waitFor();
}

async function openDirect(page) {
  await page.goto(`${base}/games/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Minesweeper', exact: true }).click();
  await page.locator('.minesweeper-game').waitFor();
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}

try {
  const context = await makeContext();
  const page = await context.newPage();
  await openFromDesktop(page);

  // First reveal is safe and starts the timer.
  const first = page.locator('[data-cell-index="40"]');
  await first.click();
  assert(!((await page.locator('.minesweeper-game').getAttribute('class')) || '').includes('minesweeper-lost'));
  assert.equal(await page.locator('.mine-cell[tabindex="0"]').count(), 1, 'grid should have one tab stop');

  // Right-click and F both flag real cells; the counter reflects both flags.
  const rightClickTarget = page.locator('.mine-cell-hidden').first();
  const rightClickIndex = await rightClickTarget.getAttribute('data-cell-index');
  await rightClickTarget.click({ button: 'right' });
  const flaggedByMouse = page.locator(`[data-cell-index="${rightClickIndex}"]`);
  assert((await flaggedByMouse.getAttribute('class')).includes('mine-cell-flagged'));
  const keyboardFlagTarget = page.locator('.mine-cell-hidden').first();
  const keyboardFlagIndex = await keyboardFlagTarget.getAttribute('data-cell-index');
  await keyboardFlagTarget.focus();
  await keyboardFlagTarget.press('f');
  assert((await page.locator(`[data-cell-index="${keyboardFlagIndex}"]`).getAttribute('class')).includes('mine-cell-flagged'));

  // Arrow navigation moves the single roving tab stop without adding 81 tabs.
  const cellZero = page.locator('[data-cell-index="0"]');
  await cellZero.focus();
  await cellZero.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-cell-index')), '1');
  assert.equal(await page.locator('.mine-cell[tabindex="0"]').count(), 1);

  // Changing difficulty freezes the timer until the inline confirmation is resolved.
  await page.getByRole('button', { name: 'Intermediate', exact: true }).click();
  await page.locator('.minesweeper-confirm').waitFor();
  assert(await page.locator('.minesweeper-paused').count() === 1);
  const timer = page.locator('.minesweeper-counter').nth(1);
  const frozen = await timer.innerText();
  await page.waitForTimeout(1150);
  assert.equal(await timer.innerText(), frozen, 'difficulty confirmation should freeze timer');
  await page.keyboard.press('Escape');
  await page.locator('.minesweeper-confirm').waitFor({ state: 'detached' });
  await page.locator('.minesweeper-playing').waitFor();

  // Browser blur pauses the running board and focus resumes it.
  const otherPage = await context.newPage();
  await otherPage.goto('about:blank');
  await otherPage.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.locator('.minesweeper-paused').waitFor();
  await screenshot(page, 'minesweeper-paused');
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.locator('.minesweeper-playing').waitFor();

  // Opening the real Start menu makes the Games window inactive and pauses it.
  await page.locator('.win95-start-btn[aria-haspopup="menu"]').click();
  await page.locator('#desktop-start-menu').waitFor();
  await page.locator('.minesweeper-paused').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.minesweeper-playing').waitFor();
  await screenshot(page, 'minesweeper-desktop');
  await context.close();
  console.log('PASS desktop first reveal, flags, roving keyboard grid, difficulty confirmation, blur, and Start-menu pause');

  // Deterministic loss: calculate the board from the same seeded first click,
  // then trigger the mine through an actual browser click.
  const lossContext = await makeContext({}, true);
  const lossPage = await lossContext.newPage();
  await openDirect(lossPage);
  await lossPage.locator('[data-cell-index="0"]').click();
  const deterministicState = revealCell(createMinesweeperGame({ difficulty: 'beginner', seed: Math.floor(0.42 * 0x1_0000_0000) }), 0);
  const mineIndex = deterministicState.cells.findIndex(cell => cell.mine);
  assert(mineIndex >= 0);
  await lossPage.locator(`[data-cell-index="${mineIndex}"]`).click();
  await lossPage.locator('.minesweeper-lost').waitFor();
  await screenshot(lossPage, 'minesweeper-lost');
  await lossContext.close();

  // Deterministic win: reveal every known safe square through actual clicks.
  const winContext = await makeContext({}, true);
  const winPage = await winContext.newPage();
  await openDirect(winPage);
  await winPage.locator('[data-cell-index="0"]').click();
  for (let index = 1; index < deterministicState.cells.length; index += 1) {
    if (deterministicState.cells[index].mine) continue;
    const cell = winPage.locator(`[data-cell-index="${index}"]`);
    if ((await cell.getAttribute('class'))?.includes('mine-cell-hidden')) await cell.click();
    if (await winPage.locator('.minesweeper-won').count()) break;
  }
  await winPage.locator('.minesweeper-won').waitFor();
  await screenshot(winPage, 'minesweeper-won');
  await winContext.close();
  console.log('PASS deterministic actual-click loss and win');

  // Intermediate remains contained on narrow screens: only its own board
  // region scrolls horizontally, never the page.
  for (const width of [390, 320]) {
    const mobileContext = await makeContext({ viewport: { width, height: width === 390 ? 844 : 568 }, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage();
    await openDirect(mobile);
    assert(await mobile.locator('.minesweeper-board-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'beginner board should fit horizontally');
    await screenshot(mobile, `minesweeper-beginner-${width}`);
    await mobile.getByRole('button', { name: 'Intermediate', exact: true }).click();
    await mobile.locator('.minesweeper-intermediate').waitFor();
    const dimensions = await mobile.locator('.minesweeper-board-scroll').evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    assert(dimensions.scrollWidth > dimensions.clientWidth, `intermediate board should scroll inside its region at ${width}px`);
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `page should not overflow horizontally at ${width}px`);
    const region = mobile.locator('.minesweeper-board-scroll');
    assert(await region.evaluate(el => el.clientHeight >= 160), 'scroll region must stay usable');
    await mobile.getByRole('button', { name: 'Flag', exact: true }).tap();
    await region.evaluate(el => { el.scrollTop = el.scrollHeight; el.scrollLeft = el.scrollWidth; });
    await mobile.locator('[data-cell-index="255"]').tap();
    assert(await mobile.locator('[data-cell-index="255"].mine-cell-flagged').count());
    const flag = await mobile.getByRole('button', { name: 'Flag', exact: true }).boundingBox();
    const content = await mobile.locator('.games-content').boundingBox();
    assert(flag.y >= content.y && flag.y + flag.height <= content.y + content.height, 'Flag control remains visible at board bottom right');
    await screenshot(mobile, `minesweeper-mobile-${width}`);
    await mobileContext.close();
  }
  console.log('PASS intermediate board containment at 390px and 320px');

  assert.deepEqual(errors, [], 'browser page errors');
} finally {
  await browser.close();
}
