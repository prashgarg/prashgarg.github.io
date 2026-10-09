// Run against a built preview with Node 22: node --experimental-strip-types scripts/verify-games.mjs [URL]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { SUITS, createGame, validateState, emptyFoundations } from '../src/components/games/solitaireEngine.ts';
const base=(process.argv[2]||'http://localhost:4321').replace(/\/$/,'');
const out='shots/games-check';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const context=async (options={})=>{
  const ctx=await browser.newContext({viewport:{width:1400,height:900},...options});
  ctx.on('page', page=>page.on('pageerror', e=>errors.push(e.message)));
  return ctx;
};
const wait=async(fn,message)=>{for(let i=0;i<50;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error(message);};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('pg_solitaire_v1')));
const shot=(page,name)=>page.screenshot({path:`${out}/${name}.png`});
const open=async(page,game)=>{
  await page.goto(`${base}/games/`,{waitUntil:'load'});
  await page.getByRole('button',{name:game,exact:true}).click();
  await page.locator(game==='Snake'?'.snake-board':'.solitaire-board').waitFor();
  await page.waitForTimeout(250);
};
const fixture=()=>{
  const all=SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${suit}-${i+1}`,suit,rank:i+1,faceUp:false})));
  const take=(id,faceUp=true)=>{const i=all.findIndex(c=>c.id===id);return {...all.splice(i,1)[0],faceUp};};
  const state={tableaus:[[take('hearts-7',false),take('hearts-1')],[take('clubs-2')],[take('diamonds-3')],[take('spades-13')],[],[take('clubs-1')],[take('diamonds-2')]],foundations:emptyFoundations(),stock:all,waste:[],moves:0,elapsed:0,won:false,history:[],drawCount:1,dailyDate:null};
  assert(validateState(state));return state;
};
const seed=async(ctx,state)=>ctx.addInitScript(data=>{
  if(location.protocol!=='http:'&&location.protocol!=='https:')return;
  if(!localStorage.getItem('pg_solitaire_v1'))localStorage.setItem('pg_solitaire_v1',JSON.stringify({version:1,...data}));
},state);
const drag=async(page,source,target)=>{
  const a=await source.boundingBox(),b=await target.boundingBox();assert(a&&b);
  await page.mouse.move(a.x+a.width/2,a.y+Math.min(12,a.height/2));await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await page.mouse.up();
};
try {
  const ctx=await context();const page=await ctx.newPage();const requests=[];
  page.on('request',r=>requests.push(r.url()));
  await page.goto(`${base}/os/`,{waitUntil:'load'});await page.getByRole('button',{name:'Games',exact:true}).waitFor();
  assert(!requests.some(url=>/\/(GamesApp|Snake|Solitaire|Minesweeper)\.[^/]+\.js$/.test(url)),'Games should be lazy');
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await page.getByRole('button',{name:'Snake',exact:true}).waitFor();
  assert(!requests.some(url=>/\/(Snake|Solitaire|Minesweeper)\.[^/]+\.js$/.test(url)),'Individual games should be lazy');
  await shot(page,'desktop-folder');
  await page.getByRole('button',{name:'Snake',exact:true}).click();
  await page.locator('.snake-board-ready').waitFor();
  await page.locator('.snake-action').click();
  await page.locator('.snake-board-running').waitFor();
  await page.keyboard.press('ArrowDown');await page.waitForTimeout(160);
  await page.keyboard.press('Space');await page.locator('.snake-board-paused').waitFor();
  const snake=()=>page.locator('.snake-head').getAttribute('style');const paused=await snake();
  await page.waitForTimeout(320);assert.equal(await snake(),paused);
  await shot(page,'snake-paused');
  await page.locator('.snake-action').click();await page.getByRole('button',{name:'Start',exact:true}).click();
  await page.locator('.snake-board-paused').waitFor();await page.keyboard.press('Escape');
  await page.locator('.snake-action').click();await page.getByRole('button',{name:'Minimise',exact:true}).click();
  await page.waitForTimeout(300);assert.equal(await page.locator('.snake-board-paused').count(),1);
  await page.locator('[data-app-task="games"]').click();await page.locator('.snake-action').waitFor();
  await page.waitForTimeout(250);assert.equal(await page.locator('.snake-board-paused').count(),1);
  await page.locator('.snake-action').click();await page.locator('.snake-board-lost').waitFor();await shot(page,'snake-game-over');
  await page.locator('.snake-action').click();await page.locator('.snake-board-running').waitFor();await page.locator('.snake-action').click();
  await page.getByRole('button',{name:'← Games',exact:true}).click();
  await page.getByRole('button',{name:'Solitaire',exact:true}).click();await page.locator('.solitaire-board').waitFor();
  await page.getByRole('button',{name:'Draw card',exact:true}).click();assert.equal((await saved(page)).moves,1);
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await saved(page)).moves,0);
  await page.getByRole('button',{name:'New deal',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  const old=JSON.stringify((await saved(page)).tableaus);
  await page.getByRole('button',{name:'New deal',exact:true}).click();await page.getByRole('button',{name:'Deal',exact:true}).click();
  const fresh=await saved(page);assert.equal(fresh.moves,0);assert.equal(fresh.history.length,0);assert.notEqual(JSON.stringify(fresh.tableaus),old);
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[data-app-window="games"]').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Solitaire',exact:true}).click();
  await page.locator('.solitaire-board').waitFor();assert.deepEqual((await saved(page)).tableaus,fresh.tableaus);
  await page.reload({waitUntil:'load'});
  await page.locator('.solitaire-board').waitFor();assert.deepEqual((await saved(page)).tableaus,fresh.tableaus);
  await shot(page,'solitaire-desktop');await ctx.close();
  console.log('PASS desktop launch, lazy loading, Snake keyboard/pause/minimise, Solitaire undo/new-deal/save/reload');

  const rules=await context();await seed(rules,fixture());const r=await rules.newPage();await open(r,'Solitaire');
  await r.getByRole('button',{name:'Ace of hearts, tableau 1',exact:true}).click();
  await r.getByRole('button',{name:'Empty spades foundation',exact:true}).click();assert.equal((await saved(r)).moves,0);
  await r.getByRole('button',{name:'Empty hearts foundation',exact:true}).press('Enter');
  assert.equal((await saved(r)).foundations.hearts.length,1);assert((await saved(r)).tableaus[0][0].faceUp);
  await r.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await saved(r)).tableaus[0].length,2);
  await drag(r,r.locator('[data-solitaire-card="clubs-2"]'),r.locator('[data-solitaire-card="diamonds-3"]'));
  await wait(async()=> (await saved(r)).tableaus[2].length===2,'Drag tableau to tableau');
  await drag(r,r.locator('[data-solitaire-card="spades-13"]'),r.getByRole('button',{name:'Empty tableau 5',exact:true}));
  assert.equal((await saved(r)).tableaus[4][0].id,'spades-13');
  await r.getByRole('button',{name:'Ace of clubs, tableau 6',exact:true}).click();await r.getByRole('button',{name:'Empty clubs foundation',exact:true}).click();
  await drag(r,r.locator('[data-solitaire-foundation="clubs"]'),r.locator('[data-solitaire-card="diamonds-2"]'));
  assert.equal((await saved(r)).tableaus[6].at(-1).id,'clubs-1');
  await shot(r,'solitaire-moves');
  const clock=r.locator('.solitaire-status time');await wait(async()=>await clock.innerText()!=='0:00','Solitaire timer running');
  await r.getByRole('button',{name:'Start',exact:true}).click();const t=await clock.innerText();await r.waitForTimeout(1100);assert.equal(await clock.innerText(),t);await r.keyboard.press('Escape');
  await rules.close();console.log('PASS legal/illegal foundation moves, drag tableau/foundation, timer pause');

  const win=createGame();win.tableaus=Array.from({length:7},()=>[]);win.stock=[];win.waste=[{id:'spades-13',suit:'spades',rank:13,faceUp:true}];
  win.foundations=Object.fromEntries(SUITS.map(suit=>[suit,Array.from({length:suit==='spades'?12:13},(_,i)=>({id:`${suit}-${i+1}`,suit,rank:i+1,faceUp:true}))]));assert(validateState(win));
  const end=await context();await seed(end,win);const e=await end.newPage();await open(e,'Solitaire');
  await drag(e,e.locator('.solitaire-waste'),e.locator('[data-solitaire-foundation="spades"]'));
  assert.equal((await saved(e)).won,true);await shot(e,'solitaire-won');await e.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await saved(e)).won,false);
  await end.close();console.log('PASS Solitaire win and undo win');

  for(const width of [390,320]){
    const mobile=await context({viewport:{width,height:width===390?844:568},isMobile:true,hasTouch:true});const p=await mobile.newPage();
    await p.goto(`${base}/os/`,{waitUntil:'load'});await p.getByRole('button',{name:'Games',exact:true}).waitFor();await shot(p,`home-${width}`);
    const gamesIcon=await p.getByRole('button',{name:'Games',exact:true}).boundingBox();assert(gamesIcon.x>=0&&gamesIcon.x+gamesIcon.width<=width);
    await p.getByRole('button',{name:'Games',exact:true}).tap();await p.getByRole('button',{name:'Snake',exact:true}).tap();await p.locator('.snake-board').waitFor();
    await p.locator('.snake-action').tap();await p.locator('.snake-board-running').waitFor();await p.getByRole('button',{name:'Down',exact:true}).tap();await p.locator('.snake-action').tap();await shot(p,`snake-${width}`);
    for(const rect of await p.locator('.snake-pad').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))))assert(rect.width>=44&&rect.height>=44);
    await p.getByRole('button',{name:'← Games',exact:true}).tap();await p.getByRole('button',{name:'Solitaire',exact:true}).tap();await p.locator('.solitaire-board').waitFor();
    await p.getByRole('button',{name:'Draw card',exact:true}).tap();assert.equal((await saved(p)).moves,1);await shot(p,`solitaire-${width}`);
    assert(await p.locator('.games-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Game must not overflow horizontally');
    await mobile.close();
  }
  console.log('PASS touch at 320/390 px: desktop icon, 44px Snake controls, Solitaire draw, no horizontal overflow');
  const corrupt=await context();await corrupt.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('pg_solitaire_v1','{broken');});const c=await corrupt.newPage();await open(c,'Solitaire');assert.equal((await saved(c)).stock.length,24);await corrupt.close();
  const blocked=await context();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('Storage blocked');};});const b=await blocked.newPage();await open(b,'Solitaire');await b.getByText('Saving is unavailable in this browser.').waitFor();await b.getByRole('button',{name:'Draw card',exact:true}).click();assert.equal(await b.locator('.solitaire-status span').innerText(),'Moves 1');await blocked.close();
  assert.deepEqual(errors,[]);console.log('PASS corrupt/blocked storage recovery; no browser exceptions');
} finally {await browser.close();}
