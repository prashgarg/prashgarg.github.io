// Phase-1 verification for goal_12jun26 (G9–G21).
// Usage: node scripts/verify-p1.mjs [base-url]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4321';
const DIR = 'shots/goal0612';
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (s) => console.log(s);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 150)));

// G10/G11/G13: research list — Forthcoming group, award chip, deep links
await p.goto(`${BASE}/research/`, { waitUntil: 'load' });
await sleep(1200);
const g10 = await p.evaluate(() => {
  const h2s = [...document.querySelectorAll('h2')].map(h => h.textContent.trim().replace(/\s+/g, ' '));
  const forth = h2s.find(t => t.includes('Forthcoming'));
  const disasters = [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Uneven Patterns'));
  const award = [...document.querySelectorAll('.badge')].find(b => b.textContent.includes('NetSciSci'));
  return { forth, disastersFound: !!disasters, awardChip: award ? award.textContent.trim() : null };
});
log(`G10 research sections → forthcoming="${g10.forth}" disastersNewTitle=${g10.disastersFound}`);
log(`G11 award chip on list → "${g10.awardChip}"`);
await p.screenshot({ path: `${DIR}/g10-research-top.png` });

// abstract + coverage links on the disasters card
const g10b = await p.evaluate(() => {
  const card = [...document.querySelectorAll('details')].find(d => d.querySelector('h3')?.textContent.includes('Uneven Patterns'));
  if (!card) return null;
  card.setAttribute('open', '');
  return card.querySelector('p').textContent.slice(0, 130);
});
log(`G10 abstract first line → "${g10b}"`);

// G13: coverage URLs on two papers
const g13 = await p.evaluate(() => {
  const out = {};
  for (const slug of ['causal-claims-economics', 'local-decline-populism', 'politicized-scientists']) {
    const card = document.getElementById(slug);
    if (!card) continue;
    out[slug] = [...card.querySelectorAll('a.chip')].map(a => `${a.textContent.trim()}→${new URL(a.href).pathname.slice(0, 40)}`);
  }
  return out;
});
for (const [k, v] of Object.entries(g13)) log(`G13 ${k}: ${v.join(' | ')}`);
await p.evaluate(() => document.getElementById('causal-claims-economics')?.setAttribute('open', ''));
await p.evaluate(() => document.getElementById('causal-claims-economics')?.scrollIntoView());
await sleep(400);
await p.screenshot({ path: `${DIR}/g13-causal-claims-card.png` });

// G20: BibTeX sample from the list page
const g20 = await p.evaluate(() => {
  const btn = document.querySelector('#political-expression-academics .cite-btn');
  return btn ? btn.getAttribute('data-bibtex') : 'NO BTN';
});
log(`G20 BibTeX sample:\n${g20}`);

// G12: talks page
await p.goto(`${BASE}/talks/`, { waitUntil: 'load' });
await sleep(1000);
const g12 = await p.evaluate(() => {
  const sub = document.querySelector('p.mt-2')?.textContent.trim();
  const text = document.body.innerText;
  return {
    subtitle: sub,
    valencia: text.includes('Universitat de València'),
    oxfordInet: text.includes('Oxford INET'),
    corte: text.includes('Corte'),
    ibeoWrong: /\bIbeo\b/.test(text),
  };
});
log(`G12 talks → subtitle="${g12.subtitle}" valència=${g12.valencia} oxfordINET=${g12.oxfordInet} corte=${g12.corte} staleIbeo=${g12.ibeoWrong}`);
await p.screenshot({ path: `${DIR}/g12-talks.png` });

// G15/G18: library — Dylan figures + Data section
await p.goto(`${BASE}/library/`, { waitUntil: 'load' });
await sleep(1500);
const g15 = await p.evaluate(() => ({
  figures: [...document.querySelectorAll('#dylan img')].map(i => ({ src: i.getAttribute('src'), ok: i.naturalWidth > 100 })),
  dataSection: !!document.getElementById('data'),
  datasets: [...document.querySelectorAll('#data h3')].map(h => h.textContent.trim().slice(0, 40)),
  jokermanLink: [...document.querySelectorAll('#dylan a')].some(a => a.href.includes('youtube.com/watch?v=1XSvsFgvWr0')),
}));
log(`G15 dylan figures → ${JSON.stringify(g15.figures)}`);
log(`G15 jokerman link → ${g15.jokermanLink}`);
log(`G18 data section=${g15.dataSection} datasets=${g15.datasets.join(' ; ')}`);
await p.evaluate(() => document.getElementById('dylan')?.scrollIntoView());
await sleep(400);
await p.screenshot({ path: `${DIR}/g15-dylan-figures.png` });
await p.evaluate(() => document.getElementById('data')?.scrollIntoView());
await sleep(400);
await p.screenshot({ path: `${DIR}/g18-data-section.png` });

// G9/G16/G19: CV — email, photo, sections
await p.goto(`${BASE}/cv/`, { waitUntil: 'load' });
await sleep(1200);
const g19 = await p.evaluate(() => {
  const t = document.body.innerText;
  return {
    email: t.includes('prashantgargib@gmail.com'),
    imperialEmail: t.includes('prashant.garg@imperial.ac.uk'),
    photo: (() => { const i = document.querySelector('.cv-photo'); return i && i.naturalWidth > 100; })(),
    sections: [...document.querySelectorAll('.cv-section-title')].map(h => h.textContent.trim()),
    soloDash: t.includes('with —'),
    solo: t.includes('Solo-authored'),
    award: t.includes('NetSciSci2025'),
    originShown: t.includes('prashgarg.github.io'),
  };
});
log(`G9/G16/G19 CV → ${JSON.stringify(g19)}`);
await p.screenshot({ path: `${DIR}/g19-cv-top.png` });

// G16/G17: desktop home — photo + bio (use ?embed route directly? no —
// the desktop home panel lives in the room flow; probe via the flow)
await p.goto(`${BASE}/`, { waitUntil: 'load' });
await sleep(1300);
await p.keyboard.press('Enter');
await sleep(5000);
await p.mouse.move(650, 700);
await sleep(2000);
const crt = await p.evaluate(() => {
  const s = getComputedStyle(document.documentElement);
  return { l: parseFloat(s.getPropertyValue('--crt-left')), t: parseFloat(s.getPropertyValue('--crt-top')), w: parseFloat(s.getPropertyValue('--crt-w')), h: parseFloat(s.getPropertyValue('--crt-h')) };
});
await p.mouse.click(crt.l + crt.w / 2, crt.t + crt.h / 2);
let mounted = 0;
for (let i = 0; i < 25 && !mounted; i++) {
  await sleep(1200);
  await p.keyboard.press('Enter');
  mounted = await p.locator('.win95-desktop').count();
}
await sleep(2000);
const g17 = await p.evaluate(() => ({
  photo: (() => { const i = document.querySelector('.win95-home-photo'); return i ? i.naturalWidth : 0; })(),
  bio: (document.querySelector('.win95-home-bio')?.textContent || '').slice(0, 80),
}));
log(`G16/G17 desktop home → photoNaturalWidth=${g17.photo} bio="${g17.bio}…"`);
await p.screenshot({ path: `${DIR}/g16-home-photo-bio.png` });

log(`pageerrors: ${errs.length ? errs.join(' | ') : 'none'}`);
console.log('DONE-P1');
await browser.close();
