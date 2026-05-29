# Goals — visual review of 2026-05-29 (file: goal_20may26.md)

Outcome of a full visual + functional pass over the site: the 3D Severance/MDR
office entry, the dolly-into-CRT flow, and the Win95 multi-window desktop with
all six apps. Every window, button, menu, drag/resize, palette, search, theme
toggle, and the mobile viewport were exercised. Screenshots live in
`shots/review0526/`.

Each goal is **specific, measurable, and actionable**, with the exact files to
touch and a **verification command** that proves it's done. Run these with
`/goal`. Do them in priority order; G0 first (it unblocks verification).

> Verification convention used below: serve the built site on :4321, then drive
> it headlessly. See **Appendix A** for the capture harness gotchas discovered
> this run (they will bite again otherwise).

> **Reference frames.** The authentic Severance MDR look is now documented in
> `shots/REFERENCE-NOTES.md` (rewritten 2026-05-29 from real show stills). Save
> the user-provided frames as `shots/ref-severance-1.png … ref-severance-5.png`
> and `Read` them before doing G1–G5 / G13–G15.

> **IMPORTANT — how `/goal` judges completion (per Claude docs).** The `/goal`
> evaluator is a small fast model that reads ONLY what's been surfaced in the
> conversation. **It does not run commands or look at screenshots.** So after
> each fix you MUST: (1) run the verification command, (2) `Read` the resulting
> screenshot, and (3) **state in plain text** whether the acceptance criterion
> passed, quoting the evidence (e.g. "ceiling panels are now the brightest
> elements; recesses no longer black — PASS"). The goal is only "met" when the
> transcript contains an explicit per-goal PASS line. Phrase progress as
> `G1 PASS / G2 PASS / …` so the evaluator can confirm.

---

## G0 — [BLOCKER] `npm run dev` hangs; fix the toolchain or document the workaround

**Problem.** `npm run dev` never binds to :4321 on this machine. Root cause:
local Node is **v25.8.0**, but Astro 6 + Vite 7 expect Node 22.x (package.json
`engines` says `>=22.12.0`). The dev process starts, prints the npm banner, and
then hangs with no "Local: http://localhost:4321" line. This blocks the normal
screenshot workflow in CLAUDE.md.

**Action.**
- Add an `.nvmrc` pinning `22` (or `22.12.0`), and a short note in CLAUDE.md /
  README "use Node 22 — Node 23+ hangs the dev server."
- Optionally add a `predev` guard that errors clearly if `node -v` is ≥ 23.
- As a fallback for headless review, document: `npm run build` then
  `python3 -m http.server 4321 --directory dist` (this is what worked this run).

**Verify (measurable).**
- With Node 22 active: `npm run dev` prints a `localhost:4321` line within 10s
  and `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/` returns
  `200`.
- `.nvmrc` exists and contains `22`.

---

## 3D scene — closing the gap to the Severance MDR reference

Reference target is in `shots/REFERENCE-NOTES.md`. Compare against
`shots/review0526/11-idle.png` and `12-lean.png`. Edits in `src/components/Office.tsx`.

### G1 — [HIGH] Rebuild the ceiling as bright pale pyramid-coffers + flat light panels (not dark recesses)

**Problem.** This is the #1 visual gap. In `11-idle.png` / `12-lean.png` the
coffer recesses read as **dark grey/black squares**. The real Severance ceiling
(see `ref-severance-1.png`, `ref-severance-5.png`, and the rewritten
`REFERENCE-NOTES.md`) is the OPPOSITE — one of the brightest things in frame:

- A grid of shallow **inverted-pyramid coffers** whose 4 sloped facets are
  **pale white-green** (slopes ≈ `#D8E0D6`, lightening toward `#EAEFEA` at the
  apex) — they catch light, never go black.
- **Flat bright rectangular fluorescent panels** set flush in the grid in a
  regular pattern (long near-white rectangles, slightly cool) — the real light
  sources, glowing.
- Thin pale-grey T-bar grid lines between cells.

**Action.** In `CofferedCeiling()` (Office.tsx):
- Invert the value scheme: make the coffer-wall/facet colour **light** (replace
  `#4C5E50` with ~`#D2DBD0`) so recesses read pale, not black.
- Lighten the slab (`#A2B0A4` → near-white `#E6EAE4`).
- Keep/scatter bright emissive flat panels (pure white, `emissiveIntensity`
  high) on a regular grid so they glow as the dominant light.
- Re-tune `Bloom` (`luminanceThreshold` 0.75) so panels bloom without washing
  the whole frame.

**Verify (measurable).** In a fresh `11-idle.png`: the ceiling is among the
brightest regions, facets are pale (not dark), flat panels glow. `Read` the shot
and state PASS only if no dark/black coffer squares remain and the ceiling
visibly matches `ref-severance-5.png`.

### G2 — [HIGH] Raise overall scene brightness to the "clinical fluorescent flood" level

**Problem.** The room reads dim/murky (`11-idle.png`). The reference is "very
bright, even, clinical fluorescent flood … no strong shadows."

**Action.** Increase ambient/hemisphere/fill light intensity in `OfficeScene`
(and/or `toneMappingExposure`, currently `1.20`). Keep shadows soft. Avoid
crushing the carpet to a muddy green — target a brighter, desaturated sage.

Also shift the carpet from grey-sage (`C.carpet = #88AB7E`) to the **more
saturated putting-green** of the show (~`#6E9457` / `#6B8E5A`) — the real floor
is greener and slightly more saturated, not sage (see `ref-severance-5.png`).

**Verify (measurable).** New `11-idle.png` is visibly brighter; walls and floor
mid-tones lift; no dark/murky corners; the carpet reads as a saturated mid-green
matching `ref-severance-5.png` (not grey-sage). `Read` and state PASS/FAIL.

### G3 — [MEDIUM] Remove the FLOOR lamp; restyle the desk lamp to a small white task lamp

**Problem.** A freestanding **floor lamp** appears on the right in `11-idle.png` —
that is wrong for MDR and should go. **Correction to the earlier draft:** a small
**white desk task lamp IS screen-accurate** (visible on the desk in
`ref-severance-5.png`), so don't remove all lamps — just the floor lamp, and make
the desk lamp a small modern white task lamp (not a warm banker's lamp).

**Action.** In Office.tsx: remove the freestanding floor-lamp component entirely.
Keep a `DeskLamp` but restyle it white/neutral and small (drop the warm
`#FFD8A0`/`#FFCD7E` emissive + warm point light, which clashes with the cool
fluorescent room).

**Verify (measurable).** No freestanding floor lamp in `11-idle.png`/`12-lean.png`;
the desk lamp (if present) is small and white, not a warm banker's lamp. `Read`
and state PASS/FAIL.

### G4 — [MEDIUM] Fix the first-visit welcome copy (stale + grammatically broken)

**Problem.** The `FirstVisitWelcome` tooltip (`12-lean.png`, top-right) reads:
"This is a 3-D **study**. The monitor is the way in / Click it to enter the
desktop. The **mobile is on the desk respond to you**…" — it calls the scene a
"study" (old concept; should be "office"/"workstation") and the last sentence is
ungrammatical/unclear.

**Action.** Rewrite the copy in the `FirstVisitWelcome` component to match the
MDR-office concept and fix grammar. Keep it to ~2 short sentences.

**Verify (measurable).** Tooltip text contains no "study"; sentences are
grammatical; mentions clicking the monitor to enter.

### G5 — [LOW] Soften the carpet vacuum tracks

**Problem.** The diagonal vacuum sweeps (`CarpetVacuumTracks`) read as strong
streaks (`12-lean.png`). Reference wants them "subtle."

**Action.** Lower the track alpha (the `* 0.32` factor in the fragment shader) and
/or widen spacing so the tracks are a faint suggestion, not bold stripes.

**Verify (measurable).** Tracks visible only on close inspection in `12-lean.png`;
they no longer dominate the floor.

### G13 — [MEDIUM] Give the green dividers white frame caps

**Problem.** The real MDR dividers are dark forest-green fabric with **white
frame edges/caps** on the top and sides (`ref-severance-4.png`,
`ref-severance-5.png`). Ours (`MdrPanel`, partition `#2F4D3A`) have the right
colour but no white frame cap, so they read as plain green slabs.

**Action.** Add a thin white frame/cap geometry along the top edge (and sides) of
each divider panel.

**Verify (measurable).** In `11-idle.png`/`12-lean.png` the dividers show a white
top frame over the dark-green fabric, matching `ref-severance-4.png`. PASS/FAIL.

### G14 — [LOW] Chair mats: translucent grey, irregular pentagon shape

**Problem.** The show's chair mats are **translucent grey with an irregular
pentagon-ish outline** (`ref-severance-5.png`); ours are clear circular glass
discs.

**Action.** Change the chair-mat geometry from a circle to an irregular
pentagon/teardrop and tint it translucent grey.

**Verify (measurable).** Chair mats in `11-idle.png` are non-circular translucent
grey, matching `ref-severance-5.png`. PASS/FAIL.

### G15 — [OPTIONAL] Consider the authentic pinwheel desk layout

**Problem.** The real MDR pod is a **pinwheel** — 4 desks rotated 90° and offset
so they spiral around a central column (`ref-severance-2.png` top-down). This
project deliberately switched to a SYMMETRIC cross (`SOUTH_DX=0`). The symmetric
look is cleaner but less authentic.

**Action (optional — needs a design call).** If authenticity is preferred,
restore a rotational pinwheel offset for the 4 stations. Otherwise leave as-is
and mark this goal "won't do (deliberate symmetric choice)".

**Verify.** Either the layout pinwheels like `ref-severance-2.png`, OR the goal
is explicitly marked won't-do with a one-line rationale. PASS/FAIL.

---

## Win95 desktop & inner pages

Desktop chrome lives in `src/components/InnerDesktop.tsx`; page content + palette
+ theme live in `src/layouts/Win95Layout.astro`.

### G6 — [HIGH] Fix Cmd+K palette result rows — fields concatenate with no spacing

**Problem.** Open Cmd+K, type a query (`shots/review0526/51-cmdk-twitter.png`):
each result renders as one run-together string —
`paperPolitical Expression of Academics on TwitterNature Human Behaviour · 2025`.
The `.cmdk-result` 3-column grid (`grid-template-columns: 60px 1fr auto; gap:14px`)
is not taking effect, so the type / label / sub spans collapse together. Rows are
unreadable.

**Action.** In `Win95Layout.astro`, fix the palette result markup/CSS so the three
fields are clearly separated (ensure the grid actually applies to `.cmdk-result`;
the spans may be missing display/column placement, or a global CSS reset is
overriding it). Add visible spacing between type, title, and subtitle.

**Verify (measurable).** In a fresh `51-cmdk-*.png`, each result shows a distinct
type chip, a title, and a right-aligned subtitle with clear gaps — no
concatenated words.

### G7 — [HIGH] Mobile: open windows maximized so they fit the viewport

**Problem.** On portrait (390px), opening any app makes the window keep its
desktop cascade size (~760px wide) and **overflow far past the right edge** —
content is clipped and unusable (`shots/review0526/62-mobile-research-window.png`).
The standalone content pages ARE responsive (`63-mobile-research-page.png`); only
the windowed overlay is broken.

**Action.** In `InnerDesktop.tsx`: when `containerSize.w < 600` (or a media
query), new windows should default to `maximized: true` (fill the desktop minus
taskbar), and `defaultGeo`/drag clamps should never exceed the container width.

**Verify (measurable).** Re-run `scripts/review-mobile.mjs`; in
`62-mobile-research-window.png` the opened window fits entirely within the 390px
width (no horizontal overflow), titlebar buttons visible, content readable.

### G8 — [MEDIUM] Floating "dark" + "⌘K search" buttons overlap the status bar

**Problem.** On every page the two floating buttons (bottom-right) sit on top of
the window status bar — the `prashantgarg.os` status cell text peeks out behind
them (`40-page-research.png`, `52-search-populism.png`, and inside iframes in
`32-multiwindow-cascade.png`). Looks like a z-index/junk overlap.

**Action.** In `Win95Layout.astro`, raise the buttons above the status bar
(increase their `bottom` offset to clear the 22px status bar + any taskbar), or
hide them in embedded/iframe mode (chrome is stripped there anyway, so they
overlap iframe content).

**Verify (measurable).** In a fresh `40-page-research.png`, the floating buttons
do not overlap the status bar; in an embedded window they don't cover content.

### G9 — [LOW] Add "CV" to the window menu bar for discoverability

**Problem.** The menu bar shows Study / Research / Talks / Library / Now but
**not CV** (`40-page-cv.png`), even though CV is a first-class desktop app/icon.

**Action.** Add a `CV` entry to `navItems` in `Win95Layout.astro` (and the
`NAV_LINKS` in `InnerDesktop.tsx` if the in-overlay nav should match).

**Verify (measurable).** `40-page-cv.png` shows a `CV` item in the menu bar,
highlighted active on the CV page.

### G10 — [LOW] Tighten empty-desktop / default window framing

**Problem.** Two minor framing issues: (a) the empty desktop is a large teal void
with only a left icon column (`30-desktop-empty.png`); (b) the default Home window
leaves a big empty area below it (`31-app-0-home.png`).

**Action (optional polish).** Consider a subtle desktop watermark/clock, and/or a
slightly taller default window height (`defH`) or vertical centering on first
open. Keep it minimal — don't clutter.

**Verify.** Subjective; confirm via fresh `30-desktop-empty.png` /
`31-app-0-home.png` that the composition feels intentional, not empty.

---

## Consistency (low priority)

### G11 — [LOW] Align role wording across Home / Now / CV

**Problem.** Home + CV say "Research Associate at Cambridge"; Now says "Postdoc."
(`31-app-0-home.png`, `40-page-now.png`, `40-page-cv.png`). Minor but reads
inconsistent.

**Action.** Pick one self-description and use it consistently (data lives in
`src/data/site`).

**Verify.** The three surfaces use the same role phrasing.

### G12 — [LOW/VERIFY] Confirm theme default is light on every page

**Problem.** `40-page-library.png` rendered in dark mode while the other pages
were light in the same batch. A clean re-test (`verify-library.png`,
`verify-research.png`) showed **both light** (`pg_theme=null`), so this was likely
a fluke — but worth a guard.

**Action.** Confirm the theme-boot script only applies `dark` when
`localStorage.pg_theme === 'dark'`, with no path that defaults library to dark.

**Verify (measurable).** Fresh-context loads of all 5 pages report
`document.documentElement.classList.contains('dark') === false` when no
`pg_theme` is set (the one-liner in Appendix A).

---

## Appendix A — capture harness gotchas (read before verifying)

These cost time this run; reuse them:

1. **Dev server hangs on Node 25** (see G0). Until fixed, verify against the
   built site:
   ```sh
   npm run build
   python3 -m http.server 4321 --directory dist &
   ```
2. **The BIOS splash gates entry.** It types lines (~1s), then shows a START
   popup (~2s). Playwright synthetic *mouse clicks do not dismiss it* — press a
   key instead: `await page.keyboard.press('Enter')`.
3. **The CRT monitor click also doesn't register via Playwright mouse events**
   (R3F raycast vs synthetic pointer events). To review the desktop, bypass the
   dolly: set `sessionStorage['pg_phase']='desktop'` via `addInitScript` before
   `goto('/')` — Office.tsx boots straight into the desktop overlay.
4. **The overlay is sized to the live CRT projection and the camera keeps
   lerping**, so the overlay micro-moves forever → Playwright "element not
   stable" and even `{force:true}` clicks can time out. Two fixes used:
   - For legible capture, pin the overlay fullscreen:
     `page.addStyleTag({content:".win95-desktop.embedded{top:0!important;left:0!important;width:100vw!important;height:100vh!important;}"})`.
   - To open/close windows reliably, use `locator.dispatchEvent('dblclick')` /
     `dispatchEvent('click')` (bypasses actionability entirely).
5. **Reusable scripts written this run** (in `scripts/`):
   `review-desktop.mjs`, `review-apps2.mjs`, `review-mobile.mjs`,
   `probe-monitor.mjs`, `diag-desktop.mjs`. Theme check one-liner:
   ```sh
   node -e "import('playwright').then(async({chromium})=>{const b=await chromium.launch();for(const p of ['library','research','talks','now','cv']){const c=await b.newContext();const pg=await c.newPage();await pg.goto('http://localhost:4321/'+p+'/');await new Promise(r=>setTimeout(r,1000));console.log(p,await pg.evaluate(()=>document.documentElement.classList.contains('dark')));await c.close();}await b.close();})"
   ```

## Appendix B — what already works (do not regress)

- Entry flow: BIOS → entry → idle → lean-in → dolly → boot → desktop. ✓
- All 6 apps open with content: Home (inline), Research/Talks/Library/Now/CV
  (iframes load). ✓ (`31-*`, `50-*`)
- Multi-window cascade, taskbar chips, focus ordering. ✓ (`32-*`)
- Start menu (6 apps + Shut Down), right-click context menu (Refresh / Open Home
  / Back to Study; disabled items greyed). ✓ (`36-*`, `37-*`)
- Window drag and SE-corner resize reflow content. ✓ (`38-*`, `39-*`)
- Cmd+K returns correct matches (rendering aside, see G6); in-page search filters
  ("1 paper matching populism"). ✓ (`51-*`, `52-*`)
- Dark-mode toggle works. ✓ (`53-*`, `54-*`)
- CV Print + PDF(Drive) buttons present. ✓
- Standalone content pages are mobile-responsive. ✓ (`63-*`)
