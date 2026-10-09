// Focus-timer browser integration checks. Run against a built preview with Node 22:
//   node scripts/verify-focus-timer.mjs http://127.0.0.1:4331
//
// The tests use Playwright's virtual clock, so a one-minute countdown never
// makes the test suite wait a real minute.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = (process.argv[2] || 'http://127.0.0.1:4321').replace(/\/$/, '');
const errors = [];
const browser = await chromium.launch({ headless: true });

const context = async (options = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ...options });
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return ctx;
};

const appWindow = (page, id) => page.locator(`[data-app-window="${id}"]`);

async function openFocus(page) {
  await page.goto(`${base}/os/?app=focus`, { waitUntil: 'load' });
  await appWindow(page, 'focus').waitFor();
  await page.locator('[data-focus-timer]').waitFor();
  await page.waitForTimeout(100);
}

async function clearSavedTimer(page) {
  // addInitScript runs on every navigation. Keep the seed guard so a later
  // /notepad or /focus navigation in the same context can observe persistence.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('focus-test-seeded')) {
      localStorage.removeItem('pg_focus_timer_v1');
      sessionStorage.setItem('focus-test-seeded', '1');
    }
  });
}

async function installClock(page) {
  assert(page.clock, 'Playwright clock API is required for timer tests');
  await page.clock.install({ time: new Date('2026-10-05T10:00:00.000Z') });
}

async function chooseOneMinute(page) {
  const input = page.locator('[data-focus-timer] input[type="number"]');
  await input.fill('1');
  await input.blur();
  await page.waitForTimeout(40);
  assert.equal(await input.inputValue(), '1', 'custom duration should remain one minute');
}

async function startCountdown(page) {
  await chooseOneMinute(page);
  await page.locator('[data-focus-timer]').getByRole('button', { name: 'Start', exact: true }).click();
}

async function persisted(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('pg_focus_timer_v1') || 'null'));
}

function secondsInDisplay(value) {
  const match = String(value || '').match(/^(\d+):(\d{2})$/);
  assert(match, `expected a mm:ss display, received ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

async function closeTimer(page) {
  await appWindow(page, 'focus').getByRole('button', { name: 'Close', exact: true }).click();
  await appWindow(page, 'focus').waitFor({ state: 'detached' });
}

try {
  // A running countdown is owned by the desktop service rather than the
  // visible React window: minimising it must not pause its deadline.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await clearSavedTimer(page);
    await installClock(page);
    await openFocus(page);
    await startCountdown(page);
    await page.clock.fastForward(10_000);
    const afterTenSeconds = await persisted(page);
    assert.equal(afterTenSeconds.status, 'running');
    assert.equal(secondsInDisplay(await page.locator('.focus-timer-time').textContent()), 50, 'countdown should advance while running');

    await appWindow(page, 'focus').getByRole('button', { name: 'Minimise', exact: true }).click();
    await appWindow(page, 'focus').waitFor({ state: 'hidden' });
    await page.clock.fastForward(5_000);
    const whileMinimised = await persisted(page);
    assert.equal(whileMinimised.status, 'running');
    await page.locator('[data-app-task="focus"]').click();
    await appWindow(page, 'focus').waitFor({ state: 'visible' });
    const afterRestore = secondsInDisplay(await page.locator('.focus-timer-time').textContent());
    assert(afterRestore <= 46 && afterRestore >= 44, 'minimising must not pause the timer');
    await ctx.close();
    console.log('PASS countdown keeps running while its window is minimised');
  }

  // Pausing and resuming must preserve elapsed time. Blurring an unchanged
  // custom-duration field is a common accidental reset path.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await clearSavedTimer(page);
    await installClock(page);
    await openFocus(page);
    await startCountdown(page);
    await page.clock.fastForward(12_000);
    await page.locator('[data-focus-timer]').getByRole('button', { name: 'Pause', exact: true }).click();
    const paused = await persisted(page);
    assert.equal(paused.status, 'paused');
    assert(paused.elapsedMs >= 11_000 && paused.elapsedMs <= 13_000, 'pause should capture current progress');
    const displayedWhilePaused = await page.locator('.focus-timer-time').textContent();
    const input = page.locator('[data-focus-timer] input[type="number"]');
    await input.focus();
    await input.blur();
    assert.equal((await persisted(page)).status, 'paused', 'unchanged custom duration must not reset a paused timer');
    assert.equal(await page.locator('.focus-timer-time').textContent(), displayedWhilePaused);
    await page.locator('[data-focus-timer]').getByRole('button', { name: 'Resume', exact: true }).click();
    await page.clock.fastForward(5_000);
    assert.equal((await persisted(page)).status, 'running');
    const resumedDisplay = secondsInDisplay(await page.locator('.focus-timer-time').textContent());
    assert(resumedDisplay <= 44 && resumedDisplay >= 42, 'resume should continue from paused progress');
    await ctx.close();
    console.log('PASS countdown pause/resume and custom-duration blur preserve progress');
  }

  // Completion dispatches one notification. Closing the timer window and
  // reloading into another accessory must retain the running store service;
  // opening the finished timer again must not announce a second time.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await clearSavedTimer(page);
    await page.addInitScript(() => {
      window.__focusFinished = Number(sessionStorage.getItem('focus-finished-count') || '0');
      window.addEventListener('pg-focus-timer-finished', () => {
        window.__focusFinished += 1;
        sessionStorage.setItem('focus-finished-count', String(window.__focusFinished));
      });
    });
    await installClock(page);
    await openFocus(page);
    await startCountdown(page);
    await closeTimer(page);
    await page.goto(`${base}/os/?app=notepad`, { waitUntil: 'load' });
    await appWindow(page, 'notepad').waitFor();
    await page.clock.fastForward(61_000);
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__focusFinished), 1, 'timer should finish after its window closes');
    assert.equal((await persisted(page)).status, 'finished');
    await appWindow(page, 'focus').waitFor({ state: 'visible' });
    await page.locator('[data-focus-timer]').waitFor();
    assert.equal(await page.locator('.focus-timer-status').textContent(), 'Time is up', 'completion should restore the closed Focus timer');

    await page.goto(`${base}/os/?app=focus`, { waitUntil: 'load' });
    await appWindow(page, 'focus').waitFor();
    await page.waitForTimeout(50);
    assert.equal(await page.locator('.focus-timer-status').textContent(), 'Time is up');
    assert.equal(await page.evaluate(() => window.__focusFinished), 1, 'reload must not re-announce a finished timer');
    await ctx.close();
    console.log('PASS closed-window completion, desktop restore, and single notification');
  }

  // Stopwatch display should use elapsed-time flooring (never showing one
  // second too early) and preserve interval laps while paused.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await clearSavedTimer(page);
    await installClock(page);
    await openFocus(page);
    const timer = page.locator('[data-focus-timer]');
    await timer.getByRole('button', { name: 'Stopwatch', exact: true }).click();
    await timer.getByRole('button', { name: 'Start', exact: true }).click();
    await page.clock.fastForward(1_250);
    assert.equal(await timer.locator('.focus-timer-time').textContent(), '00:01', 'stopwatch should floor elapsed seconds');
    await timer.getByRole('button', { name: 'Lap', exact: true }).click();
    await page.clock.fastForward(2_500);
    await timer.getByRole('button', { name: 'Lap', exact: true }).click();
    assert.equal(await timer.locator('.focus-timer-laps li').count(), 2);
    assert(await timer.locator('.focus-timer-laps').getByText('Lap 2', { exact: true }).count());
    await timer.getByRole('button', { name: 'Pause', exact: true }).click();
    assert.equal((await persisted(page)).status, 'paused');
    await ctx.close();
    console.log('PASS stopwatch flooring, laps, and pause state');
  }

  // Reject structurally valid-but-impossible saved state. The user should get
  // a clean default timer instead of a negative or overlong display.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('pg_focus_timer_v1', JSON.stringify({
      version: 1, mode: 'countdown', status: 'idle', durationMs: 25 * 60_000,
      elapsedMs: -9_000, startedAt: null, deadline: null, laps: [-5, 'bad'],
      completionNotified: false, updatedAt: Date.now(), tabId: 'corrupt-test',
    })));
    await installClock(page);
    await openFocus(page);
    assert.equal(await page.locator('.focus-timer-time').textContent(), '25:00');
    assert.equal(await page.locator('.focus-timer-status').textContent(), 'Ready');
    await ctx.close();
    console.log('PASS malformed persisted timer state falls back safely');
  }

  assert.deepEqual(errors, [], `browser page errors: ${errors.join('; ')}`);
  console.log('PASS focus timer browser checks');
} finally {
  await browser.close();
}
