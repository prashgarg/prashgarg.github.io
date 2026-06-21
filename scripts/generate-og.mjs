/**
 * Generates 1200×630 Open Graph / social-share cards for each page.
 *
 * These are DESIGNED cards (a flat Severance-MDR office illustration + the
 * page title), rendered crisply from HTML via Playwright — NOT screenshots
 * of the live 3D scene (headless software-GL renders the WebGL office badly,
 * which is why the old index.png looked like a dark room). GPU-independent,
 * so it runs anywhere.
 *
 * Usage:  node scripts/generate-og.mjs
 * Output: public/og/{index,research,talks,library,now,cv,standard}.png
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/og');
const OG_W = 1200, OG_H = 630;

const TAGLINE = 'Economist working on science, innovation, production, and media — using machine learning, causal inference, and network science.';

const cards = [
  { out: 'index.png',    eyebrow: 'ECONOMIST · CAMBRIDGE → BOCCONI 2026', title: 'Prashant Garg', sub: TAGLINE },
  { out: 'standard.png', eyebrow: 'ECONOMIST · CAMBRIDGE → BOCCONI 2026', title: 'Prashant Garg', sub: TAGLINE },
  { out: 'research.png', eyebrow: 'PRASHANT GARG', title: 'Research', sub: 'Papers on AI & automation, science, networks, media, and political economy.' },
  { out: 'talks.png',    eyebrow: 'PRASHANT GARG', title: 'Talks & seminars', sub: 'Sixty-plus talks since 2023 across economics, data-science, and policy venues.' },
  { out: 'library.png',  eyebrow: 'PRASHANT GARG', title: 'Library', sub: 'Code, datasets, and the occasional essay.' },
  { out: 'now.png',      eyebrow: 'PRASHANT GARG', title: 'Now', sub: 'What I am working on right now.' },
  { out: 'cv.png',       eyebrow: 'PRASHANT GARG', title: 'Curriculum Vitae', sub: 'Education, awards, experience, and the full academic record.' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Flat illustration of the MDR office: coffered ceiling, cream wall, sage
// floor, a cream CRT (Lumon two-tone chin + turquoise Win95 screen) on a
// white desk, a chair. viewBox 0 0 470 630, slice-cropped to the right panel.
const OFFICE = `
<svg viewBox="0 0 470 630" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="470" height="630" fill="#E7E4DC"/>
  <!-- floor -->
  <rect x="0" y="372" width="470" height="258" fill="#64A76E"/>
  <rect x="0" y="372" width="470" height="6" fill="#5b9a64"/>
  <!-- ceiling -->
  <rect x="0" y="0" width="470" height="126" fill="#D2D4D6"/>
  ${[0,1,2,3,4].map(c => `<rect x="${c*96+6}" y="14" width="84" height="44" rx="2" fill="${c%2? '#FBFCFF':'#E9ECEC'}"/>`).join('')}
  ${[0,1,2,3,4].map(c => `<rect x="${c*96+6}" y="66" width="84" height="44" rx="2" fill="${c%2? '#E9ECEC':'#FBFCFF'}"/>`).join('')}
  <!-- wall seams -->
  ${[120,250,380].map(x => `<rect x="${x}" y="126" width="2" height="246" fill="#D9D6CE"/>`).join('')}
  <!-- back partition (dark sage cubicle panel) -->
  <rect x="120" y="250" width="230" height="122" fill="#1F3A30"/>
  <rect x="120" y="250" width="230" height="4" fill="#274a3c"/>
  <!-- desk -->
  <rect x="96" y="392" width="278" height="16" rx="4" fill="#EFF1EC"/>
  <rect x="96" y="408" width="278" height="9" fill="#D7D8D3"/>
  <rect x="116" y="417" width="66" height="118" fill="#DBDCDB"/>
  <rect x="288" y="417" width="66" height="118" fill="#DBDCDB"/>
  <rect x="120" y="452" width="58" height="2" fill="#9a9a96"/>
  <rect x="292" y="452" width="58" height="2" fill="#9a9a96"/>
  <!-- CRT monitor -->
  <rect x="176" y="266" width="118" height="104" rx="11" fill="#E4DFD4"/>
  <rect x="176" y="350" width="118" height="20" rx="3" fill="#B9C9CE"/>
  <rect x="190" y="280" width="90" height="58" rx="3" fill="#3e9697"/>
  <rect x="190" y="280" width="90" height="10" fill="#0000a3"/>
  <rect x="194" y="283" width="20" height="4" rx="1" fill="#dfe6e7"/>
  <rect x="266" y="282" width="10" height="6" rx="1" fill="#c3c6ca"/>
  ${[296,304,312,320,328].map(y => `<rect x="190" y="${y}" width="90" height="1.5" fill="#ffffff" opacity="0.10"/>`).join('')}
  <rect x="200" y="296" width="46" height="5" rx="2" fill="#bfe0df" opacity="0.6"/>
  <rect x="200" y="306" width="60" height="4" rx="2" fill="#bfe0df" opacity="0.45"/>
  <!-- neck + base -->
  <rect x="227" y="370" width="16" height="10" fill="#E4DFD4"/>
  <ellipse cx="235" cy="384" rx="26" ry="5" fill="#D7D8D3"/>
  <!-- keyboard hint -->
  <rect x="196" y="388" width="92" height="8" rx="2" fill="#cfd1cb"/>
  <!-- chair -->
  <rect x="206" y="430" width="58" height="60" rx="14" fill="#2C2E30"/>
  <rect x="200" y="486" width="70" height="18" rx="7" fill="#26282a"/>
  <rect x="231" y="504" width="8" height="40" fill="#3a3a3a"/>
  <ellipse cx="235" cy="548" rx="52" ry="9" fill="#1f1f20"/>
</svg>`;

function html({ eyebrow, title, sub }) {
  return `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${OG_W}px; height:${OG_H}px; }
  .card { width:${OG_W}px; height:${OG_H}px; display:flex; background:#ECEAE2; overflow:hidden;
          font-family:Inter,system-ui,sans-serif; }
  .left { flex:1; padding:74px 60px 56px 72px; display:flex; flex-direction:column; }
  .eyebrow { font-size:21px; font-weight:600; letter-spacing:0.13em; color:#2F5961; }
  .rule { width:60px; height:5px; background:#3e9697; border-radius:3px; margin:22px 0 0; }
  .title { font-family:'Space Grotesk',Inter,sans-serif; font-weight:700; color:#1E2925;
           font-size:${title.length > 14 ? 64 : 80}px; line-height:1.02; letter-spacing:-0.01em; margin-top:26px; }
  .sub { font-size:27px; line-height:1.42; color:#46514C; margin-top:24px; max-width:560px; font-weight:400; }
  .spacer { flex:1; }
  .foot { display:flex; align-items:center; gap:10px; font-size:20px; font-weight:500; color:#6B756F; }
  .foot .dot { width:11px; height:11px; border-radius:50%; background:#3e9697; }
  .right { width:466px; flex-shrink:0; border-left:1px solid rgba(0,0,0,0.06); }
</style></head>
<body><div class="card">
  <div class="left">
    <div class="eyebrow">${esc(eyebrow)}</div>
    <div class="rule"></div>
    <div class="title">${esc(title)}</div>
    <div class="sub">${esc(sub)}</div>
    <div class="spacer"></div>
    <div class="foot"><span class="dot"></span>prashgarg.github.io</div>
  </div>
  <div class="right">${OFFICE}</div>
</div></body></html>`;
}

const browser = await chromium.launch({ headless: true });
for (const c of cards) {
  const ctx = await browser.newContext({ viewport: { width: OG_W, height: OG_H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(html(c), { waitUntil: 'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  await page.waitForTimeout(400);
  const dest = path.join(outDir, c.out);
  await page.screenshot({ path: dest, fullPage: false });
  console.log('✓', c.out);
  await ctx.close();
}
await browser.close();
console.log('Done — OG cards in public/og/');
