// Built-page checks for navigation, disclosures and the rolling talk archive.
// node scripts/verify-browsing.mjs [base URL] [previous build URL]
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2] || 'http://localhost:4325';
const previous=process.argv[3] || 'http://localhost:4324';
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Rome'});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const externalLinks=()=>page.locator('article a[href]').evaluateAll(links=>[...new Set(links.map(a=>a.href).filter(h=>/^https?:/.test(h)&&!h.startsWith(location.origin)))].sort());
try {
  for(const route of ['research','library','talks']) {
    await page.goto(`${previous}/${route}/?embed=1`,{waitUntil:'load'});
    const links=await externalLinks();
    const talkCount=route==='talks' ? await page.locator('article li').count() : null;
    await page.goto(`${base}/${route}/?embed=1`,{waitUntil:'load'});
    assert.deepEqual(await externalLinks(),links,`${route} lost external resources`);
    assert(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth));
    for(const link of await page.locator('article nav a[href^="#"]').all()) {
      const href=await link.getAttribute('href');
      assert.equal(await page.locator(href).count(),1,`Missing ${href}`);
      await link.click();
      assert.equal(new URL(page.url()).hash,href);
    }
    if(route==='research') {
      assert.match(await page.locator('article h3').first().innerText(),/Natural Disasters/);
      const disclosure=page.locator('.paper-coverage summary').first();
      await disclosure.focus(); await page.keyboard.press('Enter');
      await page.locator('.paper-coverage[open]').waitFor();
      assert.equal(await page.locator('article li').count(),12);
    }
    if(route==='library') assert.equal(await page.locator('article section').first().getAttribute('id'),'data');
    if(route==='talks') assert.equal(await page.locator('[data-talk-item]').count(),talkCount);
  }
  const count=await page.locator('[data-talk-item]').count();
  for(const date of ['2026-09-18T12:00:00+02:00','2026-09-19T12:00:00+02:00','2027-01-09T12:00:00+01:00','2028-01-01T12:00:00+01:00']) {
    const dated=await browser.newContext({timezoneId:'Europe/Rome'});
    await dated.addInitScript(now=>{const OriginalDate=Date; window.Date=class extends OriginalDate{constructor(...args){super(...(args.length ? args : [now]));} static now(){return new OriginalDate(now).getTime();}};},date);
    const p=await dated.newPage();
    await p.goto(`${base}/talks/`,{waitUntil:'load'});
    assert.equal(await p.locator('[data-talk-item]').count(),count,`Lost talk on ${date}`);
    const future=p.locator('[data-talk-upcoming-list]');
    if(date.startsWith('2026-09-18')) assert.equal(await future.getByText('17–18 Sep 2026',{exact:true}).count(),1);
    if(date.startsWith('2026-09-19')) assert.equal(await future.getByText('17–18 Sep 2026',{exact:true}).count(),0);
    if(date.startsWith('2027-01-09')) assert.equal(await future.getByText('6–9 Jan 2027',{exact:true}).count(),1);
    if(date.startsWith('2028')) {
      assert.equal(await future.locator('[data-talk-item]').count(),0);
      assert.equal(await p.locator('[data-talk-year-group="2027"] [data-talk-item]').count(),1);
    }
    for(const group of await p.locator('[data-talk-year-group]').all()) {
      const n=await group.locator('[data-talk-item]').count();
      if(n) assert.match(await group.locator('summary').innerText(),new RegExp(`\\(${n}\\)`));
    }
    await dated.close();
  }
  const noJs=await browser.newContext({javaScriptEnabled:false});
  const plain=await noJs.newPage();
  await plain.goto(`${base}/talks/`,{waitUntil:'load'});
  assert.equal(await plain.locator('[data-talk-item]').count(),count);
  const old=plain.locator('[data-talk-year-group="2025"]');
  await old.locator('summary').click();
  assert.notEqual(await old.getAttribute('open'),null);
  await noJs.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: preserved paper/talk/resource links, working section anchors/disclosures, mobile fit, date rollover and no-JS archive.');
} finally {await browser.close();}
