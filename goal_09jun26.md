# Goals — final Severance-fidelity push (file: goal_09jun26.md)

One single push to close every remaining gap between our MDR office and the
show reference. Supersedes `goal_followups.md` (its open items are folded in
here as G4/G5/G8). The desk-pod pinwheel rebuild is DONE and committed
(`4c01de7`) — do not redo it.

All 3D edits → `src/components/Office.tsx`. Page edits → noted per goal.

> **Reference frames (all on disk now).** `shots/ref-severance-1.png` is the
> gold standard (2128×1596 — big enough to pixel-sample). `ref-severance-2.png`
> (275×183, top-down pinwheel) and `ref-severance-3.png` (fan recreation) for
> layout/handedness. `shots/REFERENCE-NOTES.md` has the full written spec.
> Current baselines: `shots/goal0529/dr-idle.png`, `dr-lean.png`.

> **How the evaluator judges done.** It reads ONLY the transcript — it does NOT
> run commands or view screenshots. After each fix: (1) run the verify command,
> (2) `Read` the screenshot / paste the sampled hex values, (3) post a
> plain-text line `G<k> PASS — <evidence>` or `G<k> FAIL — <reason>`.

> **Guardrails (unchanged).** Do NOT move the active desk or touch
> `CAM_MONITOR_*`, `CAM_LEAN_*`, `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`.
> (`CAM_IDLE_*` MAY be tuned — G7 only.) After any scene change run the
> Appendix-A overlay check (expect `.win95-desktop` count 1, crt vars ≠ 0,
> ERRORS: none).

> **Measured gaps this file is built on** (sampled 2026-06-09, ImageMagick
> 1×1-resize averages; ours from `dr-idle.png` 1400×900, ref from
> `ref-severance-1.png` 2128×1596):
>
> | Surface | Ours renders | Show renders | Verdict |
> |---|---|---|---|
> | Carpet | `#435338` dark olive | `#67A36F` bright clean green | ~1.6× too dark, too warm |
> | Walls | `#888880` mid grey | `#B2C6CF` pale cool white | too dark, warm cast |
> | Ceiling facets | `#7B796A` grey-tan | `#9DBBB6`–`#B1C9CD` | far too dark |
> | Ceiling light panels | small, dim | `#D2E1E5`, huge, glowing | too small + too dim |
> | Divider fabric | washes to pale sage | `#1F3F34` deep forest | reads washed-out |
> | Chair mats | `#A6AB97` (brighter than carpet!) | `#5F8E72` (slightly darker than carpet) | inverted contrast |
>
> The single biggest problem is GLOBAL: the whole scene is underexposed with a
> warm-tan cast; the show is bright, clinical, slightly cool. Fix G1 first —
> it moves every other number — then retune the rest.

---

## G1 — [HIGH, DO FIRST] Global exposure + colour grade

**Problem.** Scene renders ~1.6× darker than the show with a warm/tan cast
(numbers above). `toneMappingExposure` is already 1.35; the deficit is light
intensity + warmth, not tone mapping alone.

**Action.** In the Canvas/lighting setup (`Office.tsx` ~2152 env, ~3298 gl):
- Raise flood/fill light intensity (and/or `environmentIntensity 0.50 → ~0.7`,
  `toneMappingExposure 1.35 → ~1.5`) until the carpet patch samples near
  target. Iterate — sample, adjust, re-render.
- Cool the light slightly: tint key/fill toward `#F2FAF6` / cool-white; the
  show has a faint cyan-green fluorescent cast (ref walls have B > R).
- If the carpet still lands olive after lighting, lift the base
  `C.carpet '#6E9457'` toward `~'#74A56E'` — but lighting first.
- Re-check `Bloom luminanceThreshold 0.75` afterwards — brightening must not
  white-out the CRT screen or ceiling panels.

**Verify (quantitative).** Fresh idle capture, then:
```sh
magick shots/goal0609/g-idle.png -crop 300x100+550+800 +repage -resize 1x1 txt: # carpet
magick shots/goal0609/g-idle.png -crop 300x60+200+330  +repage -resize 1x1 txt: # wall
```
Targets: carpet R 80–115, G 140–180, B 85–125 (ref `#67A36F`); wall channels
160–205 with B ≥ R (ref `#B2C6CF`). Post the sampled hexes + `G1 PASS/FAIL`.

## G2 — [HIGH] Ceiling: luminous near-white + much bigger light panels

**Problem.** Ceiling facets render `#7B796A` grey-tan; light panels are small
squares (1.24 m in a 3.0 m cell ≈ 41%) and barely glow. The show ceiling is one
of the BRIGHTEST things in frame: big long glowing rectangles + pale facets
(`/tmp` crops; ref top band `#D2E1E5` panels, `#9DBBB6+` facets).

**Action.** In `CofferedCeiling()` (~305):
- Facet vertex colours: `cOpen [0.78,0.82,0.78] → ~[0.88,0.90,0.88]`,
  `cApex [0.92,0.94,0.92] → ~[0.98,0.99,0.98]`; facet mat `#E2E8E0 → #EAEFEA`;
  slab `#E8ECE6 → #EEF2EC`.
- Light panels: make them LONG RECTANGLES ~60–70% of the cell (e.g.
  `PANEL_HALF 0.62 →` rectangle ~1.9 × 0.9 m per cell, oriented in rows like
  ref-1) and raise `emissiveIntensity 2.0 → ~2.8–3.2` so they read as the
  light source (slight bloom OK, no white-out).

**Verify.** Fresh idle capture:
```sh
magick shots/goal0609/g-idle.png -crop 300x80+550+80 +repage -resize 1x1 txt:  # ceiling
```
Target: ceiling average ≥ the wall average from G1 (≥ ~`#A8B8B0`), panels
clearly glowing in the `Read` screenshot, grid still crisp. `G2 PASS/FAIL`.

## G3 — [MED] Dividers must read deep forest green

**Problem.** Fabric base is `#2F4D3A` but renders washed pale sage (the white
frame caps + flood light wash it out); show divider samples `#1F3F34`. Also
ref-1 shows the panels running LONG — past the desk edges — ours are 1.62 m on
a 1.95 m desk.

**Action.**
- Deepen `C.partition '#2F4D3A' → ~'#27443A'` and/or drop the fabric material's
  env response (lower `envMapIntensity`, keep roughness 0.92) so it stays dark
  under G1's brighter light. Retune AFTER G1.
- Lengthen the pod divider arms `MdrPanel w={1.62} → ~1.9` (Office.tsx ~2319)
  so each panel runs past its desk like ref-1. Keep h=0.85, top ≈1.33 m.
- Check the panel behind the CRT isn't washed by the screen-glow light.

**Verify.** Lean capture; sample a divider patch (pick coords off the fresh
shot); target G > R, all channels ≤ ~`#4A6656` (clearly darker than desks).
`Read` + `G3 PASS/FAIL`.

## G4 — [MED] Chair mats: translucent grey pentagons, LOWER contrast than now

**Problem.** Two failures vs ref: shape (circular discs, show = irregular
pentagon) AND tone — ours render `#A6AB97`, BRIGHTER than the carpet; the show
mat (`#5F8E72`) is slightly darker/greyer than its carpet. Bright blobs are the
single most visible pod defect at idle.

**Action.** In `StationLite()` chair-mat block (~1598): replace the
`cylinderGeometry [0.65,0.65,0.012,64]` disc + `ringGeometry` rim with an
extruded irregular-pentagon `Shape` (~1.1 × 1.3 m, like ref-1), translucent
grey — e.g. `color '#6A7A6E'`, `transparent`, `opacity ~0.45`, no
transmission, no rim. Tune opacity so the rendered mat is *slightly darker*
than adjacent carpet, never brighter.

**Verify.** Idle + lean capture: mats read as subtle grey pentagons; sample a
mat patch and its adjacent carpet — mat value ≤ carpet value. `G4 PASS/FAIL`.

## G5 — [MED] Pinwheel handedness vs the show (now unblocked)

**Problem.** Spiral direction was set by eye (`POD_CX = +0.62`); never checked
against the show. `ref-severance-2.png` (top-down) + `ref-severance-3.png` are
now on disk but small — supplement with a debug top-down render.

**Action.** Temporarily add a debug camera override (e.g. read a
`?topdown` query param → camera at `(POD centre, ~9, DESK_Z)` looking down) OR
hack `CAM_IDLE_POS` locally WITHOUT committing it; screenshot; compare the
windmill turn direction against ref-2/ref-3. If mirrored, set
`POD_CX = -0.62` (ARM_DX follows). Remove the debug override before commit.

**Verify.** Post which way each turns (ours vs show) + `G5 PASS` (matched or
corrected). The debug change must not appear in the final diff.

## G6 — [LOW] Desk-prop fidelity pass (ref-1 close-up)

**Problem.** Ref-1 details we're missing or haven't confirmed: a brown
folder/box accent on one pedestal top; all 4 stations showing CRT + blue
keyboard shapes; cables; wall vents read as dark clutter (show walls are
cleaner).

**Action.**
- Add one small brown box/folder (`~0.25×0.06×0.18`, `#6B4A2F`) on a lite-desk
  pedestal (any non-active desk).
- Confirm each lite desk has a CRT-ish white box + keyboard slab (StationLite
  variants should already do this — verify visually in the lean shot).
- Fade/shrink the high wall vents (lighter grey, fewer) so walls read clean
  like ref-1; KEEP the clock and the MDR doorway sign.

**Verify.** Lean capture shows the brown accent + 4 equipped desks; idle shows
cleaner walls. `Read` + `G6 PASS/FAIL`.

## G7 — [LOW, OPTIONAL] Idle composition — pod slightly larger in frame

**Problem.** At idle the pod is ~15% of frame width; ref-1 is ~50%, old notes
say 30–35%. "Emptiness is the point" was deliberate — so only a NUDGE.

**Action.** Pull `CAM_IDLE_POS` z `6.60 → ~5.6` (and/or retarget slightly) so
the pod reads ~25–30% of frame width. Touch ONLY `CAM_IDLE_*`. Keep the
doorway/clock/sign in frame.

**Verify.** Fresh idle vs `dr-idle.png` side-by-side read; pod visibly larger,
room still cavernous. `G7 PASS/FAIL` (or `G7 WONTDO — kept emptiness`).

## G8 — [LOW] Page-level leftovers (from goal_followups F4/F5)

- **CV nav:** add `{ href:'/cv', label:'CV', id:'cv' }` to `navItems` in
  `src/layouts/Win95Layout.astro` (~35); mirror in `NAV_LINKS` in
  `src/components/InnerDesktop.tsx` (~929).
- **Now wording:** `src/pages/now.astro` says "Postdoc"; make the current role
  match Home/CV ("Research Associate, University of Cambridge"; Bocconi
  postdoc = future move, per `src/data/site.ts`).

**Verify.** Capture `/cv/` (menu shows CV, active-highlighted) and `/now/`
(wording matches). `Read` + `G8 PASS/FAIL`.

## G9 — [HOUSEKEEPING] Fix the stale Node note in CLAUDE.md

**Problem.** CLAUDE.md says only the dev server hangs on Node 23+ and suggests
`npm run build` as the workaround — but `astro build` ALSO hangs on Node 23+
(verified 2026-06-09: build sat at 0.7 s CPU for 7 min on v25.8.0, completed
in 1 m 55 s on v22). There is no nvm on this machine; Node 22 is installed
keg-only via Homebrew.

**Action.** Update the "Use Node 22" bullet: build AND dev need Node 22; the
binary lives at `/opt/homebrew/opt/node@22/bin` — prefix PATH with it
(`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`). Mention `nvm use` no
longer applies.

**Verify.** `Read` the updated bullet. `G9 PASS`.

---

**Met when** G1–G4 have PASS lines (these are the look), G5 PASS, G6 + G8 + G9
PASS (quick), G7 PASS or WONTDO — or stop after 30 turns and summarize
remaining FAILs. Finish with ONE commit per logical group (lighting, pod,
pages, docs ok) or a single commit — then `npm run build` green + final
idle/lean/overlay captures in `shots/goal0609/`.

---

## Appendix A — capture harness (UPDATED for Node 22 path)

1. **Node:** no nvm. Use the Homebrew keg:
   `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` (gives v22.22.3).
   BOTH `astro build` and `astro dev` hang silently on Node 23+.
2. Build + serve: `npm run build` (~2 min — run in background, wait on a
   `build exit=` marker) then `npm run serve` (python http.server on :4321,
   `lsof -ti:4321 | xargs kill -9` first if occupied).
3. 3D capture — reuse `scripts/review-dr.mjs` (idle + lean + overlay check in
   one run); copy it to write `shots/goal0609/g-idle.png`/`g-lean.png`, or
   inline: dismiss BIOS with **Enter keypress** (not click), sleeps
   2600/3600/1800 ms.
4. Pixel sampling: `magick <png> -crop WxH+X+Y +repage -resize 1x1 txt:`
   (ImageMagick is installed). `sips --cropOffset` silently center-crops — do
   NOT use it.
5. Overlay no-regression: expect `.win95-desktop` count 1, `--crt-w/h` ≠ 0,
   zero console errors (review-dr.mjs prints all three).
6. Desktop/page captures: plain `goto` to `/cv/`, `/now/`.

## Appendix B — current constants (post-4c01de7)

- Pinwheel pod IIFE (~2296): `POD_CX=0.62`, `POD_CZ=DESK_Z-1.10`; per-desk
  divider `MdrPanel w=1.62 h=0.85` at local `[0, 0.48, -0.76]`; NO central
  post anymore.
- `MdrPanel` (~1974): fabric `C.partition` + white caps `#F4F5F2`, pedestal
  feet; local origin at panel bottom.
- Ceiling (`CofferedCeiling`, ~305): `SPACING=3.0`, `HALF_OPEN=1.30`,
  `PANEL_HALF=0.62`, `COFFER_DEPTH=0.80`; `cOpen=[0.78,0.82,0.78]`,
  `cApex=[0.92,0.94,0.92]`; facet `#E2E8E0`, slab `#E8ECE6`, emissive 2.0.
- Palette (~77): carpet `#6E9457`, desk `#E4E2DC`, partition `#2F4D3A`,
  door `#DCDAD6`.
- Lighting: `Environment preset="lobby" environmentIntensity={0.50}` (~2152);
  `toneMappingExposure: 1.35` (~3298); `Bloom intensity 0.65 threshold 0.75`
  (~3312).
- Desk (`StationLite`, ~1462): surface `[1.95,0.06,1.25]`; chair mat disc +
  rim at ~1598 (G4 target). Wall seam shader ~421 (vertical seams + 2.4 m
  trim). Doorway void + hallway + MDR sign ~2573–2629. White task lamp ~1677.
- Idle camera: `CAM_IDLE_POS=(0.70,1.62,6.60)`, `CAM_IDLE_TGT=(0.25,1.05,-5.00)`
  (G7 may tune). **Never touch** `CAM_MONITOR_*`, `CAM_LEAN_*`,
  `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`.
