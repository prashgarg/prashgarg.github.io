# Goals — follow-ups (file: goal_followups.md)

Remaining polish after `goal_20may26.md` (shipped) and `goal_29may26.md`
(shipped: cavernous framing, longer desks, stronger pinwheel, windmill
dividers, square-grid ceiling). These are the leftover / lower-priority items
plus one tuning fix flagged during the last verification.

All 3D edits → `src/components/Office.tsx`. Desktop/page edits → noted per goal.

> **Reference.** Read `shots/REFERENCE-NOTES.md`. If the show frames are saved as
> `shots/ref-severance-1.png … ref-severance-5.png`, read them too — F1 is the
> task in **F2** (the handedness check needs the top-down `ref-severance-2.png`).
> Baselines to compare against: `shots/goal0529/r2-idle.png`, `r2-lean.png`.

> **How `/goal` judges done.** The evaluator reads ONLY the transcript — it does
> NOT run commands or view screenshots. After each fix: (1) run the verify
> command, (2) `Read` the screenshot, (3) post a plain-text line
> `F<k> PASS — <evidence>` or `F<k> FAIL — <reason>`. A goal is done only when
> its PASS line is in the transcript.

> **Guardrails (unchanged).** Do NOT move the active desk or touch
> `CAM_MONITOR_*`, `CAM_LEAN_*`, `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`. After any
> scene change, run the Appendix-A overlay check and confirm it still mounts.

---

## F1 — [HIGH] Brighten the ceiling — it reads grey at grazing angles

**Problem.** After the N5 square-grid rebuild, the ceiling is correct in shape
but reads a touch **grey/dim at the wide grazing angle** in `r2-idle.png` (the
facet vertex-colour gradient darkens them). The show ceiling is luminous,
near-white, slightly overexposed.

**Action.** In `CofferedCeiling()`:
- Lift the facet vertex colours toward white: `cOpen [0.78,0.82,0.78] → ~[0.88,0.90,0.88]`,
  `cApex [0.92,0.94,0.92] → ~[0.98,0.99,0.98]`.
- Raise the light-panel `emissiveIntensity 2.0 → ~2.6`.
- Optionally lighten the facet base material `#E2E8E0 → #EAEFEA` and the slab
  `#E8ECE6 → #EEF2EC`.
- Re-check `Bloom` (`luminanceThreshold ~0.75`) doesn't blow it out.

**Verify.** Fresh `f-idle.png`: the ceiling reads near-white/luminous across the
whole frame (no grey patches at the far end), still a crisp square grid. `Read`
and post `F1 PASS/FAIL`.

## F2 — [MEDIUM] Confirm / fix the pinwheel handedness vs the show

**Problem.** N3 made the spiral obvious but its turn direction was never checked
against the real top-down (`ref-severance-2.png`) — the reference frames aren't
on disk, so it was set by eye (`POD_CX = 0.95`).

**Action.** Save `ref-severance-2.png` to `shots/` first (ask the user if
missing). Compare the windmill turn direction in `r2-idle.png` to it. If
mirrored, flip the sign in the pinwheel IIFE: `POD_CX = -0.95` (ARM_DX follows
via `0 - POD_CX`). Leave as-is if it already matches.

**Verify.** State which direction each turns and whether they match; post
`F2 PASS` (matches, or corrected) / `F2 FAIL`. If `ref-severance-2.png` is
unavailable, post `F2 BLOCKED — reference frame not on disk`.

## F3 — [MEDIUM] Chair mats: translucent grey, irregular pentagon (was circular)

**Problem.** Chair mats are clear circular discs; the show's are translucent
**grey with an irregular pentagon** outline (`ref-severance-5.png`). (Old G14.)

**Action.** In `StationLite()` (the "Chair mat" block, ~line 1598): replace the
`cylinderGeometry args={[0.65,0.65,0.012,64]}` disc with a pentagon/teardrop
(e.g. an extruded `Shape` or a low-segment shape) and tint it translucent grey
(drop the near-clear `transmission`); adjust the `ringGeometry` rim to match the
new outline or remove it.

**Verify.** `f-idle.png`: chair mats are non-circular, translucent grey. `Read`
and post `F3 PASS/FAIL`.

## F4 — [LOW] Add "CV" to the window menu bar

**Problem.** Menu bar shows Study / Research / Talks / Library / Now but not CV,
though CV is a desktop app/icon. (Old G9.)

**Action.** Add a `CV` entry (`{ href:'/cv', label:'CV', id:'cv' }`) to
`navItems` in `src/layouts/Win95Layout.astro` (~line 35). Optionally mirror in
`NAV_LINKS` in `src/components/InnerDesktop.tsx` (~line 929) if the in-overlay
nav should match.

**Verify.** Capture `http://localhost:4321/cv/`; the menu bar shows `CV`,
active-highlighted on the CV page. `Read` and post `F4 PASS/FAIL`.

## F5 — [LOW] Align role wording (Now page says "Postdoc")

**Problem.** The Now page reads "Cambridge, May 2026. Postdoc." while Home/CV say
"Research Associate at Cambridge" (data: `src/data/site.ts` role
`Research Associate` current; `Postdoctoral Researcher (from Sept 2026)` =
incoming Bocconi). Reads inconsistent. (Old G11.)

**Action.** Edit the Now page copy (`src/pages/now.astro`) so the present role
matches Home/CV (e.g. "Research Associate, University of Cambridge" now; mention
the incoming Bocconi postdoc as a future move, not the current title).

**Verify.** Capture `http://localhost:4321/now/`; the current-role wording
matches Home/CV. `Read` and post `F5 PASS/FAIL`.

## F6 — [LOW/OPTIONAL] Empty-desktop & default window framing

**Problem.** The empty desktop is a large teal void with only the left icon
column; the default Home window leaves a big empty area below it. (Old G10.)

**Action (optional polish).** A subtle desktop watermark/clock, and/or a taller
default window height (`defH`) or vertical centring on first open, in
`InnerDesktop.tsx`. Keep minimal.

**Verify.** Fresh empty-desktop + Home-window overlay shots read intentional, not
empty. `Read` and post `F6 PASS/FAIL` (or `F6 WONTDO — <reason>`).

---

**Met when** F1 and F3 have PASS lines AND F4, F5 are PASS (they're quick) — F2
PASS or BLOCKED, F6 optional — or stop after 25 turns and summarize remaining
FAILs.

---

## Appendix A — capture harness (reuse)

1. `npm run dev` hangs on Node 23+ here. Verify on the built site:
   `npm run build && npm run serve` (serve = `python3 -m http.server 4321 --directory dist`).
2. 3D capture — dismiss BIOS with a **keypress**, not a click:
   ```js
   await page.goto('http://localhost:4321/',{waitUntil:'load'});
   await sleep(2600); await page.keyboard.press('Enter'); await sleep(3600);
   await page.screenshot({path:'shots/goal0529/f-idle.png'});
   await page.mouse.move(700,700); await sleep(1800);
   await page.screenshot({path:'shots/goal0529/f-lean.png'});
   ```
3. Desktop/page captures: just `goto` the standalone URL (`/cv/`, `/now/`).
4. No-regression overlay check (after any scene change):
   ```js
   await page.addInitScript(()=>{try{sessionStorage.setItem('pg_phase','desktop')}catch(e){}});
   await page.goto('http://localhost:4321/'); await sleep(2500);
   // expect .win95-desktop count === 1 and --crt-w/--crt-h non-zero
   ```
5. Reusable scripts: `scripts/review-r2.mjs` (idle+lean+overlay), `review-mobile.mjs`.
   Build ~2.5 min — run in background, wait on a `build exit=` marker.

## Appendix B — current constants

- Ceiling (`CofferedCeiling`, ~305): `SPACING=3.0`, `HALF_OPEN=1.30`,
  `PANEL_HALF=0.62`, `COFFER_DEPTH=0.80`; vertex colours `cOpen=[0.78,0.82,0.78]`,
  `cApex=[0.92,0.94,0.92]`; facet mat `#E2E8E0` (vertexColors), slab `#E8ECE6`,
  panel emissive white `2.0`.
- Pinwheel IIFE (~2316): `POD_CX=0.95`, `POD_CZ=DESK_Z-1.18`; dividers
  `MdrPanel w={1.10}` at `[0.17+1.10/2, 0.52, 0.155]` ×4 rotated; column
  `[0.34,1.70,0.34]`.
- Desk (`StationLite`, ~1464): surface `[1.95,0.06,1.25]`; pedestals
  `[0.66,0.72,1.20]` at `x=±0.66`; chair mat disc `cylinderGeometry
  [0.65,0.65,0.012,64]` + rim `ringGeometry [0.62,0.665,64]` (~1598).
- Idle camera: `CAM_IDLE_POS=(0.70,1.62,6.60)`, `CAM_IDLE_TGT=(0.25,1.05,-5.00)`,
  FOV `aspect<0.75?50:aspect<1.2?54:56`. **Do not touch** `CAM_MONITOR_*`,
  `CAM_LEAN_*`, `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`.
- Nav: `navItems` in `Win95Layout.astro` (~35); `NAV_LINKS` in
  `InnerDesktop.tsx` (~929). Role data: `src/data/site.ts` (~17, ~35).
