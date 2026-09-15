// Exercise the lightweight entry with real browser requests and live document state.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:4327';
const shots = 'shots/arrival';
await mkdir(shots, {recursive:true});
const browser = await chromium.launch({headless:true});
try {
  for (const mobile of [false,true]) {
    const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1400,height:900},isMobile:mobile,hasTouch:mobile});
    if (!mobile) await context.addInitScript(() => localStorage.setItem('pg_view','desktop'));
    const page = await context.newPage();
    const scripts=[]; const errors=[];
    page.on('request', r => {if(r.resourceType()==='script') scripts.push(r.url());});
    page.on('pageerror', e=>errors.push(e.message));
    page.setDefaultTimeout(45000);
    const shot = name=>page.screenshot({path:`${shots}/${mobile?'mobile':'preferred'}-${name}.png`});
    try {
      await page.goto(base,{waitUntil:'load'});
      await page.locator('.win95-desktop:not([inert])').waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('canvas').count(),0);
      assert.equal(scripts.some(url=>/Office\./.test(url)),false,'Room bundle downloaded before request');
      assert.equal(await page.locator('#entry').evaluate(el=>el.inert),true);
      await shot('home');
      await page.getByRole('button',{name:'Research',exact:true}).click();
      const article = page.frameLocator('iframe.win95-iframe');
      await article.getByRole('heading',{name:'Research',exact:true}).waitFor();
      await page.locator('.win95-content > [aria-hidden="true"]').waitFor({state:'detached'});
      await article.locator('.paper-abstract summary').first().click();
      await article.locator('html').evaluate(()=>scrollTo({top:320,behavior:'instant'}));
      const before=await article.locator('html').evaluate(()=>scrollY);
      await page.locator('iframe.win95-iframe').evaluate(el=>el.dataset.continuity='retained');
      await page.getByRole('button',{name:'Back to the office',exact:true}).click();
      await page.locator('#office[data-phase="idle"]').waitFor();
      assert(scripts.some(url=>/Office\./.test(url)),'Room bundle did not load on request');
      await page.waitForTimeout(800);
      await shot('room');
      await page.getByRole('button',{name:'Desktop',exact:true}).click();
      await page.locator('.win95-desktop:not([inert])').waitFor();
      assert.equal(await page.locator('iframe.win95-iframe').count(),1,'Duplicate desktop document');
      assert.equal(await page.locator('iframe.win95-iframe').getAttribute('data-continuity'),'retained');
      assert.equal(await article.locator('.paper-abstract[open]').count(),1);
      assert(Math.abs(await article.locator('html').evaluate(()=>scrollY)-before)<3);
      await shot('returned');
      // A second round catches stale controlled Office phase bugs.
      await page.getByRole('button',{name:'Back to the office',exact:true}).click();
      await page.locator('#office[data-phase="idle"]').waitFor();
      await page.getByRole('button',{name:'Desktop',exact:true}).click();
      await page.locator('.win95-desktop:not([inert])').waitFor();
      assert.equal(await page.locator('iframe.win95-iframe').getAttribute('data-continuity'),'retained');
      await page.locator('.win95-titlebar').click();
      await page.keyboard.press('Escape');
      await page.locator('iframe.win95-iframe').waitFor({state:'detached'});
      assert.equal(await page.locator('#office').getAttribute('data-phase'),'desktop','Closing a paper also left the desktop');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${mobile?'mobile':'preferred desktop'}: no initial room bundle/Canvas, lazy Room, two returns retain iframe, abstract and scroll.`);
    } catch(error) {await shot('failure');throw error;}
    finally {await context.close();}
  }
  // Use one browser context across genuinely separate tabs to test persistence.
  const context=await browser.newContext({viewport:{width:1400,height:900}});
  const page=await context.newPage();
  await page.goto(`${base}/?app=home`,{waitUntil:'load'});
  await page.getByRole('button',{name:'Start',exact:true}).click();
  const checkbox=page.getByRole('menuitemcheckbox',{name:'Start in desktop view',exact:true});
  assert.equal(await checkbox.getAttribute('aria-checked'),'false');
  await checkbox.focus(); await page.keyboard.press('Space');
  assert.equal(await checkbox.getAttribute('aria-checked'),'true');
  await page.keyboard.press('Escape');
  const next=await context.newPage();
  await next.goto(base,{waitUntil:'load'});
  await next.locator('.win95-desktop:not([inert])').waitFor();
  assert.equal(await next.locator('canvas').count(),0);
  await next.getByRole('button',{name:'Start',exact:true}).click();
  await next.getByRole('menuitemcheckbox',{name:'Start in desktop view',exact:true}).click();
  assert.equal(await next.evaluate(()=>localStorage.getItem('pg_view')),'office');
  await next.keyboard.press('Escape');
  const mute=next.locator('button[title="Mute ambient"]');
  await mute.focus(); await next.keyboard.press('Enter');
  await next.locator('button[title="Unmute ambient"]').waitFor();
  await next.keyboard.press('Enter'); await mute.waitFor();
  const office=await context.newPage();
  await office.goto(base,{waitUntil:'load'});
  await office.locator('#office').waitFor({timeout:60000});
  await office.getByRole('button',{name:'ENTER',exact:true}).waitFor({timeout:60000});
  await context.close();
  console.log('PASS: preference persists between tabs, opting out restores entrance, keyboard preference and volume controls.');
  const noJs=await browser.newContext({javaScriptEnabled:false});
  const plain=await noJs.newPage(); await plain.goto(base,{waitUntil:'load'});
  assert(await plain.locator('#entry').isVisible());
  assert.equal(await plain.getByRole('link',{name:'Research',exact:true}).getAttribute('href'),'/research/');
  await noJs.close();
  const blocked=await browser.newContext();
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Unavailable');}});});
  const limited=await blocked.newPage();
  await limited.goto(`${base}/?app=home`,{waitUntil:'load'});
  await limited.getByRole('button',{name:'Start',exact:true}).click();
  await limited.getByRole('menuitemcheckbox').click();
  await limited.getByRole('status').filter({hasText:'couldn’t save'}).waitFor();
  assert.equal(await limited.getByRole('menuitemcheckbox').getAttribute('aria-checked'),'false');
  await blocked.close();
  console.log('PASS: no-JavaScript links and unavailable preference storage fallback.');
  for(const failure of ['module','webgl']) {
    const context=await browser.newContext({viewport:{width:1400,height:900}});
    if(failure==='module') await context.route('**/Office.*.js',route=>route.abort());
    else await context.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args) {
        return /^webgl|^experimental-webgl/.test(type) ? null : getContext.call(this,type,...args);
      };
    });
    const page=await context.newPage();
    await page.goto(`${base}/?app=home`,{waitUntil:'load'});
    await page.getByRole('button',{name:'Research',exact:true}).click();
    await page.frameLocator('iframe.win95-iframe').locator('h1').waitFor();
    await page.locator('iframe.win95-iframe').evaluate(el=>el.dataset.continuity='failure-retained');
    await page.getByRole('button',{name:'Back to the office',exact:true}).click();
    if(failure==='module') await page.getByText('The room couldn’t load.').waitFor();
    await page.getByRole('button',{name:'Back to desktop',exact:true}).click();
    await page.locator('.win95-desktop:not([inert])').waitFor();
    assert.equal(await page.locator('iframe.win95-iframe').getAttribute('data-continuity'),'failure-retained');
    await context.close();
  }
  console.log('PASS: failed room download and unavailable WebGL return to the same document.');
} finally {await browser.close();}
