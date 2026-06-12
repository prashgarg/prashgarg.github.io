# Goals — review0612 mega-push (file: goal_12jun26.md)

Built from the 2026-06-12 8-agent live review (82 captures in
`shots/review0612/`, committed `e0fe7ec`; raw findings preserved at
`shots/review0612/workflow-result.json`), a full content-parity audit
against the old site (prashantgarg.org — still the live Google Site),
and feature research across creative/academic web. The P0 bugs were
re-confirmed with live DOM probes on 2026-06-12 (embed flex-centering:
body `scrollH 1651` vs `clientH 760`, search bar at `y=-800`,
unreachable even standalone; taskbar text `rgb(232,219,182)` cream on
light-grey). `goal_09jun26.md` is closed — do not reopen its items.

> **Locked user decisions (2026-06-12, do not re-ask):**
> 1. Site email = **prashantgargib@gmail.com** (everywhere; replaces
>    prashant.garg@imperial.ac.uk).
> 2. Disasters paper: **adopt the old-site version** — title "Uneven
>    Patterns of Cross-Border Media Coverage Following Natural
>    Disasters", the new quantitative abstract, presented as
>    **Forthcoming, Nature Human Behaviour** under Publications.
> 3. Portrait photo: **yes — desktop home + CV** (re-host from old site).
> 4. Feature scope: **Everything** (all of Phase 3 AND Phase 4).

> **How the evaluator judges done.** It reads ONLY the transcript — it
> does NOT run commands or view screenshots. After each goal: (1) run
> the verify command, (2) `Read` the screenshot / paste probe output,
> (3) post a plain-text line `G<k> PASS — <evidence>` or
> `G<k> FAIL — <reason>`. Goals marked SCAFFOLD pass when the feature
> works with clearly-labeled draft content; flag the draft for user
> review in the final report — never invent biographical facts.

> **Guardrails.**
> - **Node 22 only**: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`
>   before EVERY npm/node command (no prebuild guard exists).
> - **Never** add a CNAME file or touch GitHub Pages custom-domain
>   settings — the domain cutover is a user-side action.
> - Scene work (Phase 2): do NOT touch `CAM_MONITOR_*`, `CAM_LEAN_*`,
>   `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`. `CAM_IDLE_*` may be tuned
>   (G24). After any scene change run the Appendix-A overlay check
>   (expect `.win95-desktop` count 1, crt vars ≠ 0, ERRORS: none).
> - Keep the boot→inner transition contract: `html` background
>   `#0E0D0B`, `?embed=1` + `body.w95-embed-body` chrome-stripping,
>   `pg-nav` postMessage routing, popstate handling.
> - New `.glb` assets must go through `scripts/strip-textures.mjs`.
> - **Commit at every phase boundary; push after Phase 1 lands
>   (content correctness ships first), then push per phase.** Before
>   every push: `npm run build` + `node scripts/review-flow.mjs
>   http://localhost:4321` (with `npm run serve`) + `node
>   scripts/review-audit.mjs` clean. After every push: `gh run watch`,
>   then re-run review-flow against https://prashgarg.github.io.
> - All new pages/apps: add to sitemap/RSS where applicable, keep the
>   no-WebGL fallback page's link list current, OG image per new page
>   if the og pipeline supports it cheaply.

---

## Phase 0 — critical UX fixes [DO FIRST]

### G1 — [CRITICAL] Embed pages open mid-content with the top unreachable
**Problem.** `Win95Layout.astro` `.w95-shell` keeps `height:100vh;
display:flex; align-items:center; justify-content:center` (lines
~106–111) in embed mode; the embed CSS block (~329) resets `body` but
never `.w95-shell`. Content taller than the window gets flex-centered
and the overflow above is clipped — Research opens at "Revise &
Resubmit" (the two NHB papers, title, search, filters all invisible),
CV opens at "Talks (59)". Reproduced 4/4, desktop and mobile, windowed
AND standalone `?embed=1`.
**Action.** Add to the embed block:
`body.w95-embed-body .w95-shell { display:block !important; height:auto !important; }`
(verify nothing else depended on the centering).
**Verify.** Playwright against built site: open
`/research/?embed=1` standalone and via a desktop window; probe the
search input's `getBoundingClientRect().y` ≥ 0 and
`document.elementFromPoint(width/2, 40)` is the page header, not a
mid-page card. Screenshot both. `G1 PASS/FAIL` with the probed y.

### G2 — [HIGH] Taskbar text nearly invisible
**Problem.** `.win95-start-btn`, `.win95-taskbar-chip`, `.win95-clock`,
`.win95-home-btn` (InnerDesktop.tsx ~539–600) set no `color`, so they
inherit the site cream `rgb(232,219,182)` on `#c3c6ca` chrome.
**Action.** `color: #000;` (or `#1a1a1a`) on those classes (and any
Start-menu/tray text with the same inheritance).
**Verify.** Probe `getComputedStyle` color of Start button, a window
chip, and the clock on the live desktop → expect black-ish; screenshot.

### G3 — [MED] Dragged windows paint over the taskbar
**Action.** Raise the taskbar's z-index above window z-stack (or clamp
window y so titlebars can't overlap it). Keep Start menu above taskbar.
**Verify.** Drag a window onto the taskbar region (Playwright mouse
drag), screenshot: taskbar fully visible.

### G4 — [MED] Home-card "Open paper →" opens the Research LIST
**Problem.** The desktop-home paper card ignores the existing
`openApp(id, fromPoint, pathOverride)` third argument
(InnerDesktop.tsx:1351).
**Action.** Pass `pathOverride = '/research/<slug>'` so the window
opens the actual paper page.
**Verify.** Click the card → window iframe src ends
`/research/<slug>?embed=1`; screenshot shows the paper detail.

### G5 — [LOW] Drag clamp lets the ✕ slide off-screen
**Action.** Clamp window x/y so at least the close button (right edge
of titlebar) stays on-viewport.
**Verify.** Drag far right/down; probe titlebar bounding rect within
viewport; screenshot.

### G6 — [LOW] Volume slider is a modern blue range input
**Action.** Style `input[type=range]` (InnerDesktop.tsx ~1245) as a
Win95 slider (square thumb, sunken track, grey chrome) — CSS only.
**Verify.** Screenshot the tray volume popout.

### G7 — [HIGH, MOBILE] The 3D scene is a mandatory ~4.9 MB gate on phones
**Problem.** On touch devices the room exists only to deliver one
~25 px CRT tap target after a ~5 s load.
**Action.** On `(hover: none)` devices, after the BIOS START tap go
**straight to the fullscreen embedded desktop** (skip room + dolly).
Keep the room reachable via an explicit "View office (3D)" item (Start
menu or BIOS line) so the scene isn't lost on mobile, and keep the
no-WebGL fallback intact.
**Verify.** Playwright touch context (390×844, `touchscreen.tap`):
BIOS → tap → assert `.win95-desktop` mounts without WebGL canvas
visible; time-to-desktop logged; screenshot. Desktop (hover) flow
unchanged — re-run review-flow locally, 18 steps green.

### G8 — [MED, MOBILE] Touch-target and clipping fixes
**Action.** At ≤390px: affiliations rows must not clip ("CURREN…");
titlebar buttons ≥ 32px (44px where feasible) on touch; nav/filter tap
targets ≥ 32px; search/text inputs `font-size ≥ 16px` (kills iOS zoom);
audit remaining "Press any key"/"Click START" copy for touch wording.
**Verify.** review-audit.mjs mobile pass: zero overflow flags on
changed pages; screenshot affiliations strip + a window titlebar at
390px; probe one input's computed font-size.

---

## Phase 1 — content parity + accuracy (push immediately after)

Old-site source pages to scrape are in Appendix B. The old site is
authoritative for: disasters paper metadata, press article URLs, award,
the two extra talks, Dylan figures, portrait, bio.

### G9 — [HIGH] Email → prashantgargib@gmail.com
`src/data/site.ts:5` + every surface that renders it (home contact
strip, CV header, anywhere else grep finds the Imperial address).
**Verify.** `grep -rn "imperial.ac.uk" src/` → only legitimately
historical mentions (affiliation rows), none as contact email;
screenshot home contact strip + CV header.

### G10 — [HIGH] Disasters paper → adopt old-site version
`site.ts` slug `cross-border-media-disasters`: (a) title → "Uneven
Patterns of Cross-Border Media Coverage Following Natural Disasters";
(b) blurb → the NEW quantitative abstract scraped verbatim from the
old site (it cites effect sizes, e.g. earthquakes b≈0.0785 vs floods
b≈0.0069 — scrape, don't retype from memory); (c) present as
**Forthcoming, Nature Human Behaviour** under the Publications group
on /research and /cv (either `status:'published'` with venue
"Nature Human Behaviour (forthcoming)" or a dedicated status — pick
one, keep statusMeta labels honest). Keep the Research Square link.
**Verify.** Screenshot the paper card under Publications with new
title + "Forthcoming"; paste the first sentence of the new abstract
next to the old site's text.

### G11 — [HIGH] Add the award (the only one): Best Student Paper, NetSciSci2025
For "Simple Contagion Drives Population-Scale Platform Migration"
(link https://netscisci.github.io/). Add an awards field/array in
site.ts, render on the CV (Awards section — see G19) and as a chip on
the paper's card/detail page.
**Verify.** Screenshot CV Awards section + paper card chip.

### G12 — [MED] Talks data fixes
(a) Add: Universitat de València seminar, 4 Dec 2026, València (paper
TBC — include as-is, old-site faithful; url
https://www.uv.es/uvweb/economic-analysis-department/en/department-economic-analysis-1285854461277.html);
Oxford INET Meeting panel "AI as a Scientific Instrument for
Economics", 11 Jun 2026, Oxford (https://www.inet.ox.ac.uk/).
(b) Restore dropped talk URLs: LSE QueerConf
(https://www.lsequeerconf.com/home), EAYE 2025
(https://www.eaye.info/eayeam/2025-edition), LSE-IGC Env-Pop conf
(https://www.lse-environment-week.com/env-pop-conf), 5th QMUL Econ &
Finance Workshop (qmul.ac.uk CfP page). These were dropped in 7c4f345
because curl 404'd them — re-add to the talk entries; conference sites
die, the historical record stays.
(c) Fix location typo site.ts:418 — 'Ibeo' is the workshop acronym,
not a place; the XII IBEO Workshop venue per its own page (URL in the
entry) — set the real city (Alghero/Corte — check the linked program).
(d) talks.astro:28 subtitle: compute the year range from data
(`Math.min`/`Math.max`), no hardcoded 2022.
**Verify.** Screenshot /talks 2026 group with 6 talks; grep shows no
hardcoded year; paste corrected Ibeo entry.

### G13 — [HIGH] Press coverage: deep links + missing items
Chips currently point at outlet HOMEPAGES. Scrape the old site's
per-paper coverage lists and replace with the specific article URLs:
- **Causal Claims**: The Economist, Marginal Revolution (v1 AND v2
  posts), Noahpinion, World Bank, VoxDev, Australian Treasury, Nada es
  Gratis.
- **Local Decline**: The Guardian, FAZ, LSE Business Review, The
  Conversation, VoxEU, CAGE (+ ADD the Warwick news item
  https://warwick.ac.uk/fac/soc/economics/news/2025/5/the_visual_politics_of_decline_how_empty_high_streets_fuel_populism/
  and the second CAGE 08-05-25 link).
- **AIPNET**: SCMP interview, The Ecologist.
- **Platform Migration**: rename the 'Clarivate' chip — the old link
  actually goes to a Research Professional News article
  (researchprofessionalnews.com) — use that name+URL; Cybernews,
  Aporia Magazine.
- **Dylan**: FT deep link
  (https://www.ft.com/content/8bf3e57a-e196-495b-b7b0-8d3b2ef142d5).
- **Politicized Scientists**: ADD Italian coverage — Nada es Gratis
  (https://nadaesgratis.es/admin/el-impacto-de-que-los-cientificos-opinen-sobre-politica-en-redes-sociales),
  A Fuoco (https://www.a-fuoco.it/p/parlare-di-politica-sui-social-media),
  iL Post (https://www.ilpost.it/2024/12/20/politica-scienza/), and the
  THE op-ed (timeshighereducation.com/campus/how-preserve-academic-credibility-when-engaging-social-media).
- **Political Expression**: The American Saga deep link (on old site).
Bot-403 domains (FT/Economist/SCMP etc.) can't be curl-verified —
match the old site's hrefs exactly and note them as unverifiable.
**Verify.** For each paper, paste old-site URL vs new chip URL pairs;
spot-screenshot two paper cards.

### G14 — [LOW] Causal Claims: add the v2 Twitter thread
https://x.com/Prashant_Garg_/status/1879101708174864562 alongside v1.

### G15 — [MED] Dylan essay: re-host the 5 figures + Jokerman link
Old /mapping-dylans-mind has 5 Google-hosted figures (Jokerman
knowledge graph, theme-evolution, alluvial, metaphor-trend,
dishabituation) + YouTube link
(https://www.youtube.com/watch?v=1XSvsFgvWr0). Download, optimize
(webp/jpg, sane width ≤1600px), serve from `public/library/dylan/`,
embed in the Dylan library entry with captions + the YouTube link.
**Verify.** Built page shows 5 figures; total added weight stated
(target <1.5 MB); screenshot.

### G16 — [MED] Portrait photo → desktop home + CV (locked decision 3)
Scrape the old-site home portrait (882×1061, Google-hosted), optimize
(~50–150 KB), commit as `public/photo.jpg` (replace placeholder
photo.svg usage), render on the desktop-home panel (tasteful, Win95
frame fits the fiction) and the CV header. Alt text "Prashant Garg".
**Verify.** Screenshots of desktop home + CV with photo; file size.

### G17 — [MED] Bio prose on the desktop home
The old home bio ("Hi, I'm Prashant Garg… recently completed my PhD in
Economics at Imperial College London… joining Bocconi University as a
Postdoctoral Researcher in September 2026") exists nowhere on the new
site. Add a 2–3 sentence bio to the desktop-home panel (and the
standalone home fallback), scraped from the old site and updated only
with facts already in site.ts (Cambridge current, Bocconi incoming).
**Verify.** Screenshot; paste bio text + its old-site source line.

### G18 — [MED] Library gains a "Data" (public goods) section
Mirror the old Public Goods → Data section: three open datasets —
Causal Claims knowledge graph (45,000 papers), AIPNET product-level
I/O data, Academic Expression data (political stance of academics
2016–2022) — as first-class Library entries with links (causal.claims,
aipnet.io, academicexpression.online + GitHub where the old site has
it). Note: G39 (File Explorer) will reuse this data — structure it in
site.ts, not hardcoded markup.
**Verify.** Screenshot /library Data section (desktop + embed mode).

### G19 — [HIGH] CV completeness + correctness
(a) Add **Education**, **Awards/Grants**, **Teaching** sections — the
things committees scan first. Source: download the Drive CV PDF
(`site.cv` link) and extract; if the PDF is unreachable, scaffold the
sections from known facts (PhD Imperial, award from G11) and FLAG the
gaps for the user — do not invent degrees/years.
(b) Solo papers render "with —" (cv.astro:88) → omit the "with" line
when no coauthors.
(c) Commit a real `/cv.pdf`: generate via Playwright `page.pdf()` of
/cv (print stylesheet already forces light) and link it next to the
Drive button.
**Verify.** Screenshot CV sections; show `with —` gone for a solo
paper; `ls -la public/cv.pdf` + open it (pdftotext or page count).

### G20 — [HIGH] URL strategy + BibTeX quality (domain not cut over)
prashantgarg.org still serves the old Google Site — every visible
prashantgarg.org URL on the new site 404s or shows the wrong site.
(a) Introduce ONE `site.origin` constant (= `https://prashgarg.github.io`
for now; cutover later becomes a one-line flip) and use it for
canonical/JSON-LD/OG/share-intent URLs ([slug].astro:37,42,88,98,
Layout heads, papers.xml). Stop advertising a domain that serves
different content.
(b) BibTeX: consistent `Lastname, Firstname and Lastname, Firstname`
author format; add DOIs where they exist; the `url` field should
prefer DOI/preprint (Research Square, CESifo, etc.) over site URLs.
(c) cv.astro footer/contacts still print "prashantgarg.org" — same
constant.
**Verify.** `grep -rn "prashantgarg.org" src/ | grep -v origin` →
empty (or each remaining hit justified in transcript); paste one
generated BibTeX entry; validate papers.xml with xmllint.

### G21 — [LOW] Dataset-size consistency (100,000 vs 300,000 academics)
Tools blurb says "100,000+", old Public Goods page says "300,000
(2016–2022)" for the same Academic Expression dataset. Check
academicexpression.online's own claim; make all site surfaces match
it. If the source is ambiguous, use the published paper's abstract
figure (site.ts:69 says "over 100,000 scholars") site-wide and flag.
**Verify.** Paste the source-of-truth line + grep showing consistency.

---

## Phase 2 — scene grade ("the set is right — the light is from the wrong show")

Verification harness: Appendix A. Reference: `shots/ref-severance-1.png`
(2128×1596). Iterate sample→adjust→re-render like goal_09jun26 G1.
Order matters: G22 (grade) first — it moves every other number.

### G22 — [HIGH] Cool the warm/green-contaminated grade
Ceiling renders cream `#F0F1D7` vs ref near-white `#FEFEFE`; desk
fronts green-washed. Cool/neutralize `Environment` intensity + ambient
color (currently `#E5F2EC` ambient 1.7, hemi `#F2FAFA`/`#B6CCB2`,
`environmentIntensity 0.62`, exposure 1.45).
**Verify.** `magick` 1×1 samples: ceiling patch R≈G≈B within ~6 units
and ≥ 0xE8; desk-front sample not green-shifted (G within 8 of R/B);
paste hexes.

### G23 — [HIGH] Dividers render ~3 stops too light
Painted `#27443A` (forensic match to the show's `#274438`) but the
desk spotlight blasts them to `#85B272`. Darken rendered result: cut
fabric `envMapIntensity` (now 0.3), narrow/attenuate the spotlight,
or drop fabric base — keep the PAINT value, fix the LIGHT.
**Verify.** Divider face sample in idle render lands `#2A4438`–`#4A6450`
band (clearly deep green, V < 0.45); paste hex.

### G24 — [MED] Pod presence in frame (~16% → toward ~46% of width)
`CAM_IDLE_POS` z 4.90 → ~2.4 (allowed), raise target to pull the
ceiling into the top third. Re-check portrait FOV breakpoints + lean
interaction still aim correctly (CAM_LEAN_* untouched).
**Verify.** Idle screenshot: pod spans ≥ 35% of frame width (measure
via the two outer desk edges); lean + CRT click still work in
review-flow; paste measurement.

### G25 — [MED] Ceiling: sparse rectangular fluorescents, not 192 lightboxes
Light only ~every 3rd coffer cell, panels as rectangles (not full-cell
squares), deepen unlit pyramids (`COFFER_DEPTH 0.32 → ~0.5`), unlit
facets darker than lit panels by ≥ 25%.
**Verify.** Count lit cells in a downsampled ceiling band (same
40×28-downsample trick as the divider scan) → 25–40% lit; paste count.

### G26 — [MED] Room height compression
`ROOM_H 4.5 → ~3.4` ("the compression is half the dread"). Re-fit
wall seams, vents, light grid, ceiling — and re-run the overlay check
(CRT projection must not shift: CAM_MONITOR_* are fixed, but wall/
ceiling geometry feeding ambient occlusion changes).
**Verify.** Overlay check (Appendix A) green; idle + lean screenshots;
ceiling occupies the top ~1/4–1/3 of the idle frame.

### G27 — [LOW] Carpet hue: yellow-drifted
Live `#73A35F` vs ref's cooler minty `#79B27D`. Nudge `C.carpet`
toward cooler green after G22 settles.
**Verify.** Carpet sample: G > R by ≥ 40 and B ≥ 0x60; paste hex.

### G28 — [LOW] Scene polish bundle
(a) Vacuum tracks read as mowed-lawn stripes → cut opacity/frequency.
(b) Rotary phone prop on a neighbor desk if a CC0 model is available
(strip textures!) — else primitives or skip with a note.
(c) BIOS splash: enforce a minimum display time (~800 ms) so it can't
race past before first paint.
**Verify.** Screenshots; for (c) a cold-load capture at +400 ms shows
the BIOS text.

---

## Phase 3 — features: quick wins (all locked IN by decision 4)

### G29 — [HIGH] Win95 sound scheme
Startup chime after boot, window open/close/minimize thwips, error
ding, Start-menu click — tiny, soft, Severance-clean. Route through
the EXISTING audio context + volume slider + focus-lowpass plumbing
(muting/ducking comes free). Synthesize or use CC0 one-shots (<100 KB
total, note license/source in README).
**Verify.** Probe: AudioContext node count changes on window open;
volume 0 → silent (no new context errors); total added bytes stated.

### G30 — [HIGH] Run… dialog + deep-linkable window state
Start menu gets "Run…" (classic dialog; accepts app names + paper
slugs). URL state: `?app=research`, `?app=research&paper=<slug>` (use
the existing `pathOverride`) opens that window on load; window
open/focus updates the URL (history.replaceState — don't fight the
existing pushState navigation). Works on the standalone desktop AND
embedded (room boot) path.
**Verify.** Load `/?app=research&paper=<slug>` cold → window open on
the paper; Run… "talks" opens Talks; screenshots; review-flow still
18-green.

### G31 — [HIGH, SCAFFOLD] Plain-English TL;DR per paper
3-sentence non-technical summary per paper, "[×] Plain English" toggle
beside the abstract (list + detail pages). DRAFT the summaries from
the existing abstracts — accurate, no overclaiming, flagged for user
review in the final report.
**Verify.** Screenshot toggle on/off on one paper; all papers have a
tldr field (grep count = paper count).

### G32 — [MED] Idle screensaver — "Lumon After Dark"
After ~90 s desktop inactivity: dim + DVD-style bouncing logo (or
drifting Kier-esque aphorisms — original text only, no show quotes).
Any input dismisses. Respect `prefers-reduced-motion` (no screensaver).
**Verify.** Playwright: idle 95 s (fake timers or temporarily
configurable timeout) → screensaver div present; keypress dismisses;
screenshot.

### G33 — [MED] Overtime Contingency — in-fiction dark mode
Hidden trigger (typing `overtime` in Run…/Terminal, or Konami code):
CRT-flicker glitch (~0.5 s, skipped under reduced-motion) then toggle
the EXISTING dark/light themes, renamed innie/outie. Persist choice.
**Verify.** Trigger → `document.documentElement` theme class flips;
screenshot both states.

### G34 — [LOW] System Properties = /uses + colophon
A "System Properties" dialog (Win95 tabbed) listing the research
toolchain + how the site is built (Astro + R3F, CC0 Quaternius,
texture-strip pipeline). Content from CLAUDE.md/README facts only.
**Verify.** Screenshot dialog; link present in Start menu.

### G35 — [MED, SCAFFOLD] Wellness Session — About/FAQ app
Ms.-Casey-deadpan About page: ~12–15 flat statements that are actually
bio/FAQ ("Your outie studies the economics of technology and
language."), 3–4 real links (CV, email, Scholar). Facts only from
site.ts/old-site bio; DRAFT flagged for user review.
**Verify.** Screenshot; every factual claim traceable (cite source per
line in transcript).

### G36 — [HIGH] Standard Issue mode — plain-HTML boss key
Taskbar/Start item ("Standard Issue View") + `B` key → a fast, plain,
beautiful academic page: name, bio, papers list with links, CV, email.
Implementation hint: it's mostly a styled route reusing existing
embed pages/site data — no 3D, no JS requirements; this also IS the
accessibility/no-WebGL story (fold the existing fallback into it).
**Verify.** Lighthouse-ish sanity: loads < 100 KB transfer (probe via
Playwright response sizes), readable screenshot, reachable from
taskbar + Start + `B`; works with JS disabled (curl the route, content
present in HTML).

---

## Phase 4 — features: flagship + academic utility

### G37 — [HIGH] MDR.exe — playable Macrodata Refinement + Perks
Desktop app: grid of softly wiggling digits; "scary" clusters tremble;
lasso them into **five bins = your five research topics**; filling a
bin opens that topic's filtered Research window; 100% → waffle-party
confetti/praise toast. Plus **Perks & Incentives** tracker app
(localStorage achievements: Finger Trap = find BIOS setup, Waffle
Party = finish MDR, Music Dance Experience = use volume, 5% of files
refined = read 5 abstracts…). Keep it original-art (no show assets),
performant (canvas, pause when window inactive), touch-workable.
**Verify.** Playwright: open MDR.exe, simulate lasso → bin fill →
assert the filtered Research window opens; perks persist across
reload; screenshots of game + perks app; FPS sane on desktop.

### G38 — [HIGH] Terminal.exe — C:\> with real academic commands
Commands: `help`, `papers [--year --topic]`, `cite <slug>` (prints +
copies BibTeX — reuse G20's generator), `cv`, `now`, `open <app>`,
`whoami`, `clear`; hidden `lumon`, `kier`, `overtime` (→ G33). Driven
from site.ts data, command parsing tolerant. (Blog-as-terminal-notes:
OUT of this run — note as future.)
**Verify.** Playwright types `papers --year 2025` → correct count;
`cite causal-claims` puts BibTeX on clipboard (probe via
navigator.clipboard read or the fallback prompt); screenshot.

### G39 — [HIGH] My Documents + Recycle Bin — files, data, replication
Explorer-style app: papers as .pdf icons (open the paper window),
talks as .ppt, CV.pdf, and a **Data** folder surfacing G18's datasets
+ GitHub repos (sizes/licenses where known). Recycle Bin contains the
academic file drawer: 'rejected_draft_v7.doc', null results — funny
but TASTEFUL (no real coauthor/journal names in the jokes).
**Verify.** Screenshot explorer + recycle bin; double-click a paper
.pdf → research window opens (probe iframe src).

### G40 — [MED] Citation metrics as Task Manager
"System Monitor" app: citations/year as the green CPU graph, per-paper
counts, h-index — fetched at BUILD time from OpenAlex (free, no key;
author search "Prashant Garg" + affiliation disambiguation — verify
the author ID matches the actual papers before trusting counts; if
ambiguous, FAIL and flag rather than show wrong numbers). Cache JSON
into src/data at build; no client-side API calls.
**Verify.** Paste the OpenAlex author ID + 2 spot-checked paper counts
vs the API response; screenshot the app; build passes offline-ish
(cached file committed).

### G41 — [MED] BIOS Setup screen (press DEL) = real settings
"Press DEL to enter SETUP" during BIOS; blue/grey BIOS panel with
WORKING toggles persisted to localStorage: reduced motion, CRT
scanlines, sounds on/off (G29), theme innie/outie (G33),
skip-intro-by-default, Standard Issue mode (G36). Settings respected
on next load.
**Verify.** Playwright: DEL during BIOS → panel; toggle skip-intro →
reload → goes straight to desktop; screenshot.

### G42 — [MED, SCAFFOLD] Help.exe — Employee Handbook (advice pages)
Windows-Help-style viewer app with a TOC. SCAFFOLD ONLY: structure +
2 starter pages DRAFTED from non-personal, well-established generic
guidance (e.g. "emailing professors", "what an RA does") clearly
marked "draft — review me"; the user writes the real advice later.
**Verify.** Screenshot viewer + TOC; drafts labeled.

### G43 — [MED] Press clippings surface
Group ALL coverage (from G13's deep links) by paper on a dedicated
surface — either a "Press" app/window or a section of Standard Issue
mode — plus a "for journalists" line: one-sentence bio + headshot
download (G16's photo).
**Verify.** Screenshot; count of coverage items matches site.ts.

### G44 — [LOW] Talks upgrade: .ics + materials
Upcoming talks (date > today) get an "Add to calendar" .ics download
(generated at build); past talks get slides/video links where site.ts
has them (don't fabricate materials).
**Verify.** Download .ics for the Oxford INET talk → valid (xmllint
no, but `grep DTSTART`); screenshot.

### G45 — [LOW, CONDITIONAL] Lumon FM — channel music player
Winamp-style player with 2–3 channels through the existing audio
plumbing. ONLY include audio that is verifiably CC0/CC-BY (note
attribution in README) and < 4 MB total — otherwise ship the app with
a single generated ambient-drone channel (WebAudio synth, zero
assets) and note that real tracks await user-supplied files.
**Verify.** Screenshot; play → volume slider affects it; total bytes.

### G46 — [MED] Org Chart — coauthor/topic network app
Force-directed graph (you center; coauthors, topics, papers as nodes)
built from site.ts; click paper → opens its research window; click
coauthor → joint-work list. Canvas/SVG, no heavy dep if avoidable
(d3-force is fine).
**Verify.** Screenshot; click a paper node → window opens (probe).

### G47 — [LOW, CONDITIONAL] Visitor Log — guestbook
Backed by giscus (GitHub Discussions). REQUIRES enabling Discussions
on prashgarg/prashgarg.github.io — attempt via
`gh api repos/prashgarg/prashgarg.github.io --method PATCH -f
has_discussions=true` + giscus category setup; if any step needs
interactive consent we can't grant, build the app UI, stub the
backend, and FLAG the one-click user action needed.
**Verify.** Screenshot app; if live: post + see a test entry (then
delete it); if stubbed: the flag in the final report.

### G48 — [STRETCH, OPTIONAL] Hover preview cards + backlinks
Gwern-style hover previews for internal references + "Referenced by"
lists. Only attempt if everything above is green and budget remains;
otherwise note as deferred. (Per-paper permalinks already exist —
this is the cross-linking layer.)

---

## Out of scope / user actions (report, don't do)

- **Domain cutover** (registrar CNAME www → prashgarg.github.io, apex
  A 185.199.108–111.153, then Pages custom domain, then flip
  `site.origin`). User-side; never pre-empt.
- Two Bluesky post links 404 via curl but are headless-unverifiable —
  list them for the user to check in a browser.
- Real Help.exe advice content, Wellness/TL;DR final wording, Lumon FM
  tracks: drafts/stubs ship now, user reviews after.

## Appendix A — capture harness (Node 22)

```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"   # EVERY shell
npm run build && npm run serve                       # dist/ on :4321
node scripts/screenshot.mjs shots/goal0612/$N.png 1400 900 5000
node scripts/screenshot.mjs shots/goal0612/$N-mob.png 390 844 6000
node scripts/review-flow.mjs http://localhost:4321   # 18-step journey
node scripts/review-audit.mjs                        # every route × 2 viewports
# overlay check (after ANY scene change): expect .win95-desktop count 1,
# crt vars ≠ 0, ERRORS: none — see scripts/review-goal0609.mjs
# pixel sampling:
magick shots/goal0612/idle.png -crop 300x100+550+800 +repage -resize 1x1 txt:
```
Headless renders 3D at ~2 fps (software GL) — FPS numbers and
animation timing in headless runs are artifacts, not real performance.
Boot overlay: press Enter to skip typing (by design). Mobile taps need
`p.touchscreen.tap()`, not mouse.click.

## Appendix B — old-site source pages (scrape targets)

- https://www.prashantgarg.org/ (home: portrait img, bio, email)
- https://www.prashantgarg.org/research (paper list incl. disasters
  new title/abstract/Forthcoming; press deep links per paper)
- https://www.prashantgarg.org/scientists-on-twitter (coverage incl.
  Italian items)
- https://www.prashantgarg.org/mapping-dylans-mind (5 figures,
  YouTube link)
- Public Goods / Data page (3 datasets; award mention near platform-
  migration paper; navigate from home nav)
- Talks page (the 2026 list with València + Oxford INET; talk URLs)
Old site is a Google Site: fetch with a browser UA; images are
googleusercontent URLs — download at max resolution available.

## Appendix C — evidence pointers

- `shots/review0612/` — 82 live captures (committed e0fe7ec) +
  `workflow-result.json` (full 8-agent findings: parityGaps, review
  lenses, 26-feature inspiration list with impact/effort).
- `shots/flow0610/` — 18-step journey baseline (all green, a892281).
- Live DOM probes 2026-06-12: embed bug (`scrollH 1651/clientH 760`,
  search y=-800/-698 standalone), taskbar `rgb(232,219,182)`,
  in-iframe nav OK (`/research/political-expression-academics` routed
  to parent URL correctly).
