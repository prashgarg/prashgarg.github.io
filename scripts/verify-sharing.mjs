import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4326';
const detail = `${base}/research/causal-claims-economics/`;
const browser = await chromium.launch({ headless: true });
const results = [];
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  results.push(message);
};

async function newPage(width = 1280, height = 800, touch = false) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: touch,
    hasTouch: touch,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  return { context, page };
}

const { context, page } = await newPage();
await page.goto(detail, { waitUntil: 'load' });
await page.waitForSelector('#cmdk-hint-btn');

await page.locator('#cmdk-hint-btn').click();
await page.waitForSelector('.pg-find-dialog');
check(await page.locator('.pg-find-dialog').isVisible(), 'Find opens from the taskbar button');
check(await page.locator('.w95-shell').evaluate(node => node.inert), 'Find makes the page shell inert');

await page.keyboard.press('Meta+k');
await page.waitForTimeout(50);
check(!(await page.locator('.pg-find-dialog').count()), 'Cmd+K toggles Find closed');
check(await page.evaluate(() => document.activeElement?.id) === 'cmdk-hint-btn', 'Find restores focus to its opener');

await page.keyboard.press('Meta+k');
await page.waitForSelector('.pg-find-dialog');
await page.keyboard.press('Escape');
await page.waitForTimeout(50);
check(!(await page.locator('.pg-find-dialog').count()), 'Escape closes Find');
check(await page.evaluate(() => document.activeElement?.id) === 'cmdk-hint-btn', 'Escape restores focus to the taskbar button');

await page.keyboard.press('Control+k');
await page.waitForSelector('.pg-find-dialog');
check(await page.locator('.pg-find-dialog').isVisible(), 'Ctrl+K opens Find');
await page.keyboard.press('Control+k');
await page.waitForTimeout(50);
check(!(await page.locator('.pg-find-dialog').count()), 'Ctrl+K toggles Find closed');

async function clipboardScenario({ api, exec, expected, label }) {
  const isolated = await newPage();
  const scenarioPage = isolated.page;
  await scenarioPage.goto(detail, { waitUntil: 'load' });
  await scenarioPage.waitForSelector('#copy-link-btn');
  await scenarioPage.evaluate(({ apiMode, execMode }) => {
    window.__copyResult = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async value => {
        window.__copyResult = value;
        if (apiMode === 'reject') throw new Error('denied');
      } },
    });
    document.execCommand = () => execMode === 'success';
  }, { apiMode: api, execMode: exec });
  await scenarioPage.locator('#copy-link-btn').click();
  await scenarioPage.waitForTimeout(250);
  const state = await scenarioPage.evaluate(() => ({
    button: document.querySelector('#copy-link-btn')?.textContent,
    fallbackVisible: document.querySelector('#copy-link-fallback')?.hidden === false,
    fallbackValue: document.querySelector('#copy-link-fallback')?.value,
    active: document.activeElement?.id,
    copied: window.__copyResult,
  }));
  if (expected === 'success') {
    check(state.button === 'Copied', `${label}: modern clipboard succeeds`);
    check(state.copied === 'https://prashantgarg.org/research/causal-claims-economics/', `${label}: copied URL is canonical`);
  } else if (expected === 'fallback') {
    check(state.button === 'Copied', `${label}: rejected API falls back to execCommand`);
    check(state.active === 'copy-link-btn', `${label}: fallback restores focus`);
  } else {
    check(state.button === 'Copy failed', `${label}: both clipboard paths report failure`);
    check(state.fallbackVisible && state.active === 'copy-link-fallback', `${label}: selectable canonical URL is exposed`);
    check(state.fallbackValue === 'https://prashantgarg.org/research/causal-claims-economics/', `${label}: failure field contains public URL`);
    await scenarioPage.waitForTimeout(2300);
    const persistent = await scenarioPage.evaluate(() => ({
      visible: document.querySelector('#copy-link-fallback')?.hidden === false,
      value: document.querySelector('#copy-link-fallback')?.value,
    }));
    check(persistent.visible && persistent.value === 'https://prashantgarg.org/research/causal-claims-economics/', `${label}: selected URL remains available after the status timeout`);
  }
  await isolated.context.close();
}

await clipboardScenario({ api: 'success', exec: 'failure', expected: 'success', label: 'Clipboard API' });
await clipboardScenario({ api: 'reject', exec: 'success', expected: 'fallback', label: 'Rejected Clipboard API' });
await clipboardScenario({ api: 'reject', exec: 'failure', expected: 'failure', label: 'Unavailable clipboard' });

await context.close();

for (const width of [320, 390]) {
  const touchPage = await newPage(width, 844, true);
  await touchPage.page.goto(detail, { waitUntil: 'load' });
  await touchPage.page.waitForSelector('#copy-link-btn');
  const layout = await touchPage.page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    controls: [...document.querySelectorAll('.paper-primary-links a, .paper-primary-links button')].map(node => Math.round(node.getBoundingClientRect().height)),
  }));
  check(layout.overflow <= 0, `Touch ${width}px layout has no horizontal overflow`);
  check(layout.controls.every(height => height >= 44), `Touch ${width}px paper controls meet 44px target`);
  await touchPage.context.close();
}

await browser.close();
console.log(`PASS: ${results.length} sharing and Find checks`);
