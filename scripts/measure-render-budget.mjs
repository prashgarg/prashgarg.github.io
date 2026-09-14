import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const [baselineUrl = 'http://127.0.0.1:4325', candidateUrl = 'http://127.0.0.1:4326'] = process.argv.slice(2);
const outputDir = 'shots/find-share/performance';
const sampleMs = 5000;

const instrument = () => {
  const metrics = { frames: 0, draws: 0, drawArrays: 0, drawElements: 0, instanced: 0 };
  window.__renderMetrics = metrics;

  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(timestamp => {
    metrics.frames += 1;
    callback(timestamp);
  });

  for (const proto of [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype]) {
    if (!proto) continue;
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = proto[name];
      if (typeof original !== 'function' || original.__renderBudgetWrapped) continue;
      const wrapped = function (...args) {
        metrics.draws += 1;
        if (name === 'drawArrays') metrics.drawArrays += 1;
        else if (name === 'drawElements') metrics.drawElements += 1;
        else metrics.instanced += 1;
        return original.apply(this, args);
      };
      wrapped.__renderBudgetWrapped = true;
      proto[name] = wrapped;
    }
  }
};

async function sample(browser, label, url) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript(instrument);
  await context.addInitScript(() => sessionStorage.setItem('pg_reading', '1'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${url}/?app=home`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const start = await page.evaluate(() => ({ ...window.__renderMetrics, visibility: document.visibilityState, view: document.querySelector('#office')?.dataset.view }));
  await page.waitForTimeout(sampleMs);
  const end = await page.evaluate(() => ({ ...window.__renderMetrics, visibility: document.visibilityState, view: document.querySelector('#office')?.dataset.view }));

  // A hidden tab should stop drawing, then resume drawing when made visible.
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const hiddenStart = await page.evaluate(() => ({ ...window.__renderMetrics }));
  await page.waitForTimeout(1200);
  const hiddenEnd = await page.evaluate(() => ({ ...window.__renderMetrics }));
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(750);
  const resumed = await page.evaluate(() => ({ ...window.__renderMetrics, visibility: document.visibilityState }));

  await context.close();
  return { label, url, start, end, hiddenStart, hiddenEnd, resumed, errors };
}

const browser = await chromium.launch({ headless: true });
const baseline = await sample(browser, 'baseline', baselineUrl);
const candidate = await sample(browser, 'candidate', candidateUrl);
await browser.close();

const report = {
  measuredAt: new Date().toISOString(),
  sampleMs,
  note: 'Draw-call counts are WebGL method counts from the actual page. Hidden-tab visibility is simulated through the page lifecycle event because headless Playwright cannot background a tab reliably.',
  baseline,
  candidate,
};
await mkdir(outputDir, { recursive: true });
await writeFile(`${outputDir}/render-budget.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
