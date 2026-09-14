import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4326';
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`PASS ${message}`);
  else { failures.push(message); console.log(`FAIL ${message}`); }
};

const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
await page.goto(`${base}/os/`, { waitUntil: 'load' });
await page.locator('[data-app-icon="talks"]').click();
await page.locator('[data-app-window="talks"] iframe.win95-iframe').waitFor({ timeout: 5000 });
const initialTalksFrame = page.frames().find(frame => frame.url().includes('/talks') && frame.url().includes('embed=1'));
check(Boolean(initialTalksFrame), 'Talks app opens before Find navigation');
if (!initialTalksFrame) throw new Error('Initial Talks iframe did not mount');
const archive2025 = initialTalksFrame.locator('[data-talk-year-group="2025"]');
await archive2025.waitFor({ timeout: 5000 });
if (await archive2025.evaluate(element => element instanceof HTMLDetailsElement && element.open)) {
  await archive2025.locator('summary').click();
}
check(await archive2025.evaluate(element => element instanceof HTMLDetailsElement && !element.open), '2025 archive starts collapsed');

await page.locator('.win95-find-btn').click();
const input = page.locator('#pg-find-input');
await input.fill('e');
const resultBox = page.locator('.pg-find-results');
for (let i = 0; i < 11; i += 1) await page.keyboard.press('ArrowDown');
await page.waitForTimeout(100);
check(Boolean(await input.getAttribute('aria-activedescendant')), 'ArrowDown updates active result');
check(await resultBox.evaluate(element => element.scrollTop > 0), 'active result scrolls into view');
await input.fill('ZBW Seminar');
check(await page.locator('.pg-find-result').count() === 1, 'unique archive talk search result');
await input.press('Enter');
const talksFrameHandle = page.locator('[data-app-window="talks"] iframe.win95-iframe');
await talksFrameHandle.waitFor({ timeout: 5000 });
const talksFrame = page.frames().find(frame => frame.url().includes('/talks') && frame.url().includes('embed=1'));
check(Boolean(talksFrame), 'archive talk opens inside Talks app window');
if (!talksFrame) throw new Error('Talks iframe did not mount');
await talksFrame.locator('#talk-2025-20-may-2025-zbw-seminar-hamburg-causal-claims-in-economics').waitFor({ timeout: 5000 });
check(talksFrame.url().includes('#talk-2025-20-may-2025-zbw-seminar-hamburg-causal-claims-in-economics'), 'archive talk result has stable content anchor');
check(await talksFrame.locator('[data-talk-item]').count() > 0, 'talk archive loaded');
check(await talksFrame.locator('[data-talk-item]').evaluateAll(rows => {
  const ids = rows.map(row => row.id).filter(Boolean);
  return ids.length === new Set(ids).size && ids.length === rows.length;
}), 'all talk row anchors are unique');
const target = talksFrame.locator('#talk-2025-20-may-2025-zbw-seminar-hamburg-causal-claims-in-economics');
check(await target.count() === 1, 'archive talk target exists');
check(await target.evaluate(row => row.closest('details')?.open === true), 'archive year group opens for hash target');
check(await target.isVisible(), 'archive talk target is visible after Find navigation');

await page.goto(`${base}/os/`, { waitUntil: 'load' });
const findButton = page.locator('.win95-find-btn');
await findButton.click();
await page.keyboard.press('Escape');
await page.waitForTimeout(50);
check(await findButton.evaluate(element => document.activeElement === element), 'Escape restores focus to Find opener');
await findButton.click();
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
check(await page.locator('.pg-find-dialog').evaluate(dialog => dialog.contains(document.activeElement)), 'Tab focus remains contained in Find dialog');

await page.goto(`${base}/os/`, { waitUntil: 'load' });
await page.locator('.win95-find-btn').click();
await page.locator('#pg-find-input').fill('Global Automation Atlas');
const dataset = page.locator('.pg-find-result').filter({ hasText: 'Open data' }).first();
const oldUrl = page.url();
const popupPromise = page.waitForEvent('popup', { timeout: 2000 }).catch(() => null);
await dataset.click();
const popup = await popupPromise;
check(Boolean(popup), 'dataset result opens in a new tab');
check(page.url() === oldUrl, 'external dataset keeps current URL');
if (popup) await popup.close();

const mobileContext = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });
const mobile = await mobileContext.newPage();
await mobile.goto(`${base}/os/`, { waitUntil: 'load' });
await mobile.locator('.win95-find-btn').click();
const box = await mobile.locator('.pg-find-dialog').boundingBox();
check(Boolean(box && box.width <= 320 && box.height <= 568), 'Find fits 320px touch viewport');
await mobile.locator('#pg-find-input').fill('automation');
check(await mobile.locator('.pg-find-result').count() > 0, 'mobile search returns results');
const closeBox = await mobile.locator('.pg-find-close').boundingBox();
const clearBox = await mobile.locator('.pg-find-clear').boundingBox();
const inputBox = await mobile.locator('#pg-find-input').boundingBox();
check(Boolean(closeBox && closeBox.width >= 44 && closeBox.height >= 44), 'mobile close control has a 44px touch target');
check(Boolean(clearBox && clearBox.width >= 44 && clearBox.height >= 44), 'mobile clear control has a 44px touch target');
check(Boolean(inputBox && inputBox.height >= 44), 'mobile search input has a 44px touch target');
await mobile.screenshot({ path: 'shots/find-share/mobile-find-320-final.png', fullPage: true });
await mobile.keyboard.press('Escape');

await mobile.close();
await mobileContext.close();
await page.close();
await browser.close();
console.log(`SUMMARY failures=${failures.length}`);
if (failures.length) process.exit(1);
