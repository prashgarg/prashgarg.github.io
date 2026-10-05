// Test real pointer coordinates in the transformed monitor, then mobile root entry.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=(process.argv[2]||'http://localhost:4321').replace(/\/$/,'');
const out='shots/games-check';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1400,height:900}});
 await context.addInitScript(()=>{
  if(location.protocol!=='http:')return;
  const deck=['clubs','diamonds','hearts','spades'].flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${suit}-${i+1}`,suit,rank:i+1,faceUp:false})));
  const ace=deck.splice(deck.findIndex(c=>c.id==='hearts-1'),1)[0];ace.faceUp=true;
  if(!localStorage.getItem('pg_solitaire_v1'))localStorage.setItem('pg_solitaire_v1',JSON.stringify({version:1,tableaus:[[ace],[],[],[],[],[],[]],foundations:{clubs:[],diamonds:[],hearts:[],spades:[]},stock:deck,waste:[],moves:0,elapsed:0,won:false,history:[]}));
 });
 const p=await context.newPage();p.setDefaultTimeout(20000);
 await p.goto(base,{waitUntil:'load'});
 await p.locator('.office-monitor[data-ready="true"]').waitFor({timeout:60000});
 await p.getByRole('button',{name:'ENTER',exact:true}).click();await p.locator('#office[data-phase="idle"]').waitFor({timeout:60000});
 await p.keyboard.press('Enter');await p.locator('#office[data-phase="desktop"]').waitFor({timeout:60000});await p.waitForTimeout(1200);
 const f=p.frameLocator('iframe[title="prashantgarg.os"]');
 await f.getByRole('button',{name:'Games',exact:true}).click();await f.getByRole('button',{name:'Solitaire',exact:true}).click();
 await f.locator('[data-solitaire-card="hearts-1"]:enabled').waitFor();
 const a=await f.locator('[data-solitaire-card="hearts-1"]').boundingBox(),z=await f.locator('[data-solitaire-foundation="hearts"]').boundingBox();
 await p.mouse.move(a.x+a.width/2,a.y+a.height/3);await p.mouse.down();await p.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:12});
 await p.screenshot({path:`${out}/solitaire-monitor-drag.png`});await p.mouse.up();
 await f.getByRole('button',{name:'hearts foundation: Ace of hearts',exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('pg_solitaire_v1')).foundations.hearts.length),1);
 await p.screenshot({path:`${out}/solitaire-monitor-move.png`});console.log('PASS real monitor Solitaire pointer drag onto foundation');await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const m=await mobile.newPage();await m.goto(base,{waitUntil:'load'});
 await m.getByRole('button',{name:'Games',exact:true}).tap();await m.getByRole('button',{name:'Snake',exact:true}).tap();await m.locator('.snake-action').tap();await m.locator('.snake-board-running').waitFor();await m.locator('.snake-action').tap();await m.locator('.snake-board-paused').waitFor();
 await m.screenshot({path:`${out}/snake-mobile-root.png`});
 await m.getByRole('button',{name:'← Games',exact:true}).tap();await m.getByRole('button',{name:'Solitaire',exact:true}).tap();await m.getByRole('button',{name:'Draw card',exact:true}).tap();
 assert.equal(await m.evaluate(()=>JSON.parse(localStorage.getItem('pg_solitaire_v1')).moves),1);
 await m.screenshot({path:`${out}/solitaire-mobile-root.png`});console.log('PASS lightweight mobile root: Snake and Solitaire touch play');await mobile.close();
}finally{await browser.close();}
