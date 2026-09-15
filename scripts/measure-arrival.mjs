// Compare fresh browser contexts; record JS payload and time until the desktop is usable.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const [baseline='http://127.0.0.1:4326', candidate='http://127.0.0.1:4327'] = process.argv.slice(2);
const browser = await chromium.launch({headless:true});
const records=[];
try {
  for (const mode of ['mobile','preferred-desktop']) {
    for (const [label, base] of [['baseline',baseline],['candidate',candidate]]) {
      const mobile=mode==='mobile';
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1400,height:900},isMobile:mobile,hasTouch:mobile});
      if(!mobile) await context.addInitScript(()=>{localStorage.setItem('pg_view','desktop');sessionStorage.setItem('pg_reading','1');});
      const page=await context.newPage();
      const responses=[];
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',response=>{
        if(new URL(response.url()).origin===new URL(base).origin && /\.js(?:\?|$)/.test(response.url())) {
          responses.push(response.body().then(body=>({path:new URL(response.url()).pathname,bytes:body.length})).catch(()=>({path:response.url(),bytes:0})));
        }
      });
      await page.goto(`${base}/?app=home`,{waitUntil:'load'});
      await page.waitForFunction(()=>{
        const direct=document.querySelector('.win95-desktop:not([inert]) .win95-home-name');
        const frame=document.querySelector('iframe[title="prashantgarg.os"]');
        const inner=frame?.contentDocument?.querySelector('.win95-desktop:not([inert]) .win95-home-name');
        const target=direct||inner;
        return target && target.getBoundingClientRect().height>0 && target.ownerDocument.fonts.status==='loaded';
      },null,{timeout:60000});
      const readyMs=await page.evaluate(()=>performance.now());
      await page.waitForTimeout(1000);
      const scripts=await Promise.all(responses);
      records.push({label,mode,readyMs:Math.round(readyMs),javascriptBytes:scripts.reduce((sum,s)=>sum+s.bytes,0),scripts,canvases:await page.locator('canvas').count(),errors});
      await context.close();
    }
  }
} finally {await browser.close();}
await mkdir('shots/arrival',{recursive:true});
await writeFile('shots/arrival/loading-comparison.json',JSON.stringify({note:'Uncompressed JavaScript response bytes and one cold-context timing sample; local host performance is not a device-speed guarantee.',records},null,2));
console.log(records.map(({scripts,...record})=>record));
