import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4321';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0,140)));
await p.goto(BASE + '/', { waitUntil: 'load' });
await sleep(1200); await p.keyboard.press('Enter');   // skip BIOS
await sleep(5500);                                     // entering -> idle
// lean in: cursor to lower-centre triggers CAM_LEAN_POS over ~2s
for (let i = 0; i < 20; i++) { await p.mouse.move(700, 770); await sleep(150); }
await sleep(2500);
await p.screenshot({ path: 'shots/review0613/desk-props.png' });
console.log('desk lean screenshot taken; errs:', errs.join(' | ') || 'none');
await b.close();
