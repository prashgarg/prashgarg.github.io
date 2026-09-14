// Exercise shared history and reading restoration through the real nested desktop.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = (process.argv[2] || 'http://127.0.0.1:4326').replace(/\/$/, '');
const shots = process.argv[3] || 'shots/find-share/navigation';
await mkdir(shots, {recursive:true});
const browser = await chromium.launch({headless:true});
try {
  for (const mobile of [false, true]) {
    const ctx = await browser.newContext({viewport: mobile ? {width:320,height:740} : {width:1400,height:900}, isMobile:mobile, hasTouch:mobile});
    await ctx.addInitScript(() => sessionStorage.setItem('pg_reading','1'));
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    const desktop = mobile ? page : page.frameLocator('iframe[title="prashantgarg.os"]');
    const article = desktop.frameLocator('iframe.win95-iframe');
    const shot = name => page.screenshot({path:`${shots}/${mobile?'mobile':'desktop'}-${name}.png`});
    try {
      await page.goto(`${base}/?app=home`,{waitUntil:'load'});
      await desktop.locator('.win95-desktop:not([inert])').waitFor();
      await desktop.getByRole('button',{name:'Research',exact:true}).click();
      await article.getByRole('heading',{name:'Research',exact:true}).waitFor();
      await desktop.locator('.win95-content > [aria-hidden="true"]').waitFor({state:'detached'});
      assert.equal(new URL(page.url()).pathname,'/research');
      await article.locator('.paper-abstract summary').first().click();
      const link=article.locator('h3 a').nth(1);
      await link.scrollIntoViewIfNeeded();
      const destination=await link.getAttribute('href');
      const before=await article.locator('html').evaluate(()=>scrollY);
      await shot('list');
      await link.click();
      await article.locator('#copy-link-btn').waitFor();
      assert.equal(new URL(page.url()).pathname,destination);
      await shot('paper');
      const length=await page.evaluate(()=>history.length);
      await page.goBack();
      await article.getByRole('heading',{name:'Research',exact:true}).waitFor();
      await desktop.locator('.win95-content > [aria-hidden="true"]').waitFor({state:'detached'});
      assert.equal(await article.locator('.paper-abstract[open]').count(),1);
      const after=await article.locator('html').evaluate(()=>scrollY);
      assert(Math.abs(before-after)<4,`Back changed scroll from ${before} to ${after}`);
      assert.equal(await page.evaluate(()=>history.length),length,'Back added history');
      await shot('back');
      await page.goForward();
      await article.locator('#copy-link-btn').waitFor();
      assert.equal(new URL(page.url()).pathname,destination);
      assert.equal(await page.evaluate(()=>history.length),length);
      const direct=await ctx.newPage();
      await direct.goto(page.url(),{waitUntil:'load'});
      await direct.locator('#copy-link-btn').waitFor();
      await direct.close();
      const start=desktop.getByRole('button',{name:'Start',exact:true});
      await start.focus(); await page.keyboard.press('ArrowDown');
      await desktop.getByRole('menu',{name:'Start',exact:true}).waitFor();
      assert.equal(await desktop.getByRole('menuitem').first().evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('End');
      assert.equal(await desktop.getByRole('menuitem').last().evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Escape');
      assert.equal(await start.evaluate(el=>el===document.activeElement),true);
      await start.click(); await desktop.getByRole('menuitem',{name:'Run…',exact:true}).click();
      const run=desktop.getByRole('dialog',{name:'Run',exact:true});
      await run.waitFor();
      await desktop.getByRole('textbox',{name:'Run command'}).fill('properties');
      await page.keyboard.press('Enter');
      const props=desktop.getByRole('dialog',{name:'System Properties',exact:true});
      await props.waitFor();
      await page.waitForTimeout(100);
      assert.equal(await props.evaluate(el=>el.contains(document.activeElement)),true,'Dialog change lost focus');
      for(let i=0;i<6;i++) { await page.keyboard.press('Tab'); assert.equal(await props.evaluate(el=>el.contains(document.activeElement)),true); }
      await shot('dialog');
      await page.keyboard.press('Escape');
      await props.waitFor({state:'detached'});
      await start.evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await start.evaluate(el=>el===document.activeElement),true);
      if(mobile) {
        const bounds=await desktop.locator('.win95-toolbar button').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({text:el.textContent, r:el.getBoundingClientRect().toJSON()})));
        assert(bounds.every(({r})=>r.x>=0&&r.right<=320&&r.height>=40),JSON.stringify(bounds));
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${mobile?'mobile':'desktop'}: paper URL, Back/Forward, abstract/scroll, deep link, menus, dialog focus.`);
    } catch(error) {await shot('failure'); throw error;}
    finally {await ctx.close();}
  }
} finally {await browser.close();}
