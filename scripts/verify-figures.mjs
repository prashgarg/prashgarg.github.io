import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:4327';
const checks = [];
const check = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
  if (!condition) throw new Error(message);
};

const browser = await chromium.launch({ headless: true });
await mkdir('shots/figure-cv',{recursive:true});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  for (const [slug, label] of [
    ['global-automation-atlas', 'Automation Atlas'],
    ['causal-claims-economics', 'Causal Claims'],
  ]) {
    await page.goto(`${base}/research/${slug}/`, { waitUntil: 'load' });
    const figure = page.locator('.paper-figure-trigger').first();
    check(await figure.count() === 1, `${label}: pilot figure is rendered`);
    check(await figure.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), `${label}: figure image loads`);
    const captionColor = await page.locator('.paper-figure figcaption').evaluate(node => getComputedStyle(node).color);
    check(captionColor !== 'rgba(20, 17, 13, 0.68)', `${label}: caption has a visible default color`);

    await figure.click();
    const dialog = page.locator('.paper-figure-dialog');
    check(await dialog.evaluate(node => node.open), `${label}: native dialog opens`);
    await page.screenshot({path:`shots/figure-cv/${slug}-enlarged.png`});
    check(await dialog.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), `${label}: enlarged image loads`);
    await page.keyboard.press('Escape');
    check(!(await dialog.evaluate(node => node.open)), `${label}: Escape closes dialog`);
    check(await page.evaluate(() => document.activeElement?.classList.contains('paper-figure-trigger')), `${label}: close restores trigger focus`);

    await figure.click();
    await page.mouse.click(2,2);
    check(!(await dialog.evaluate(node => node.open)), `${label}: backdrop closes dialog`);
  }

  await page.goto(`${base}/research/mapping-dylans-mind/`, { waitUntil: 'load' });
  check(await page.locator('.paper-figure-trigger').count() >= 4, 'Dylan: existing figures remain compatible');

  await page.goto(`${base}/research/causal-claims-economics/`, { waitUntil: 'load' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const dark = await page.locator('.paper-figure figcaption').evaluate(node => ({
    color: getComputedStyle(node).color,
    background: getComputedStyle(document.documentElement).backgroundColor,
  }));
  check(dark.color !== 'rgba(20, 17, 13, 0.68)', 'Dark mode: caption does not use dark ink on dark background');
  check(dark.background === 'rgb(27, 25, 22)', 'Dark mode: site dark background is active');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(`${base}/research/global-automation-atlas/`, { waitUntil: 'load' });
  const mobileBefore = await mobile.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  check(mobileBefore.width <= mobileBefore.viewport, 'Mobile: inline page has no horizontal overflow');
  const mobileFigure = mobile.locator('.paper-figure-trigger').first();
  await mobileFigure.click();
  const mobileDialog = mobile.locator('.paper-figure-dialog');
  const mobileState = await mobileDialog.evaluate(node => {
    const image = node.querySelector('.paper-figure-dialog-image');
    const inner = node.querySelector('.paper-figure-dialog-inner');
    return {
      open: node.open,
      imageWidth: image?.getBoundingClientRect().width || 0,
      innerWidth: inner?.clientWidth || 0,
      scrollable: Boolean(inner && inner.scrollWidth > inner.clientWidth),
    };
  });
  check(mobileState.open, 'Mobile: enlarged dialog opens');
  check(mobileState.imageWidth > mobileState.innerWidth, 'Mobile: enlarged image is wider than the dialog viewport');
  check(mobileState.scrollable, 'Mobile: enlarged figure can be horizontally scrolled');
  await mobileDialog.locator('.paper-figure-dialog-inner').evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=120;});
  const closeBox=await mobileDialog.locator('.paper-figure-dialog-close').boundingBox();
  check(closeBox && closeBox.x>=0 && closeBox.x+closeBox.width<=390 && closeBox.y>=0,'Mobile: close stays visible after scrolling');
  await mobile.screenshot({path:'shots/figure-cv/mobile-enlarged-scrolled.png'});
  await mobileDialog.getByRole('button',{name:'Close enlarged figure',exact:true}).click();
  check(!(await mobileDialog.evaluate(node=>node.open)), 'Mobile: close button works after scrolling');
  await mobileFigure.click();
  await mobile.keyboard.press('Escape');
  check(!(await mobileDialog.evaluate(node => node.open)), 'Mobile: Escape closes dialog');

  // The native modal must consume Escape without closing the surrounding
  // desktop paper window, including when it is nested inside the monitor.
  for(const monitor of [false,true]) {
    const context=await browser.newContext({viewport:monitor?{width:1400,height:900}:{width:390,height:844},isMobile:!monitor,hasTouch:!monitor});
    if(monitor) await context.addInitScript(()=>sessionStorage.setItem('pg_phase','desktop'));
    const host=await context.newPage();
    await host.goto(monitor ? base : `${base}/?app=home`,{waitUntil:'load'});
    const desktop=monitor?host.frameLocator('iframe[title="prashantgarg.os"]'):host;
    await desktop.locator('.win95-desktop:not([inert])').waitFor({timeout:60000});
    await desktop.getByRole('button',{name:'Research',exact:true}).click();
    const paper=desktop.frameLocator('iframe.win95-iframe');
    await paper.getByRole('link',{name:'Global Automation Atlas',exact:true}).first().click();
    const trigger=paper.locator('.paper-figure-trigger').first();
    await trigger.waitFor();
    await desktop.locator('.win95-content > [aria-hidden="true"]').waitFor({state:'detached'});
    await trigger.click();
    check(await paper.locator('.paper-figure-dialog').evaluate(el=>el.open),`${monitor?'Monitor':'Mobile desktop'}: nested figure opens`);
    await host.screenshot({path:`shots/figure-cv/${monitor?'monitor':'mobile'}-nested-enlarged.png`});
    await host.keyboard.press('Escape');
    check(!(await paper.locator('.paper-figure-dialog').evaluate(el=>el.open)),`${monitor?'Monitor':'Mobile desktop'}: Escape closes only the figure`);
    check(await desktop.locator('.win95-window').count()===1,`${monitor?'Monitor':'Mobile desktop'}: paper window remains open`);
    check(await trigger.evaluate(el=>el===document.activeElement),`${monitor?'Monitor':'Mobile desktop'}: trigger focus is restored`);
    await context.close();
  }

  console.log(`PASS: ${checks.length} figure checks`);
} finally {
  await browser.close();
}
