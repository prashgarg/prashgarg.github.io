# Goals — Severance MDR fidelity, round 2 (file: goal_29may26.md)

Follow-on to `goal_20may26.md` (which is done: lighting, ceiling v1, carpet,
lamps, dividers v1, the Win95 fixes, and the **pinwheel pod** all shipped).
This round closes the remaining gap to the real show frames: the pod should feel
**tiny and lonely in a cavernous green room**, the desks **longer**, the
**pinwheel twist more pronounced & correctly handed**, the **dividers meeting
cleanly at the central post**, and the **ceiling** reworked to the show's
square pyramidal grid with bright rectangular lights.

All 3D edits are in `src/components/Office.tsx`.

> **Reference.** Read `shots/REFERENCE-NOTES.md` and, if present, the saved show
> frames `shots/ref-severance-1.png … ref-severance-5.png` before starting.
> Compare your output against `shots/goal0529/pw-11-idle.png` /
> `pw-12-lean.png` (the current pinwheel) to confirm each change improved it.

> **How `/goal` judges done (per Claude docs).** The evaluator is a small model
> that reads ONLY the conversation text — it does NOT run commands or view
> screenshots. So after each goal: (1) run the verify command, (2) `Read` the
> screenshot, (3) state a plain-text line `N<k> PASS — <evidence>` or
> `N<k> FAIL — <reason>` quoting what you saw / measured. A goal counts as done
> only when its PASS line is in the transcript.

> **Keep the active desk fixed.** The active (k=0) desk currently sits at exactly
> `(0,0,DESK_Z)` and the CRT, accessories, camera dolly, and the inner-desktop
> overlay projector all depend on that. Do NOT move the active desk or the
> `MONITOR_WORLD` / `CAM_MONITOR_*` constants. The pinwheel is built so changing
> `POD_CX` keeps the active desk put (`ARM_DX = 0 − POD_CX`). Verify after each
> scene change that the desktop overlay still mounts (Appendix A, step 4).

---

## N1 — [HIGH] Make the room read cavernous: pull the idle camera back so the pod is small in frame

**Problem.** In `pw-11-idle.png` the workstation fills ~half the frame. The real
MDR hero shots (`ref-severance-1.png`, `ref-severance-5.png`) are wide and
near-symmetric: the pod occupies ~30–35% of frame width and is surrounded by a
huge sea of green floor (bottom ~40%), white walls (mid), bright ceiling (top
~30%).

**Action.** This is camera-only (safe — does not touch the dolly). In
`Office.tsx`:
- Pull `CAM_IDLE_POS` back and a touch higher and more centred, e.g. from
  `(1.40, 1.50, 4.10)` → roughly `(0.70, 1.62, 6.6)` (eye-level, more head-on).
- Nudge `CAM_IDLE_TGT` so the pod sits centred, e.g. `(0.10, 1.10, -5.00)` →
  `(0.25, 1.05, -5.0)`.
- Optionally widen the landscape FOV one notch (`camera.fov` line: `54` → `56`).
- Keep the lean-in (`CAM_LEAN_*`) as is so hovering still moves in close.

Tune the exact numbers by screenshot until the composition matches the
reference. The room itself (`ROOM_W=36`, `ROOM_D=46`) is already large; if after
the camera pull the walls still feel close, bump `ROOM_W`/`ROOM_D` by ~20%.

**Verify (measurable).** Fresh `shots/goal0529/r2-idle.png`: the workstation
occupies ≲ 40% of frame width, with a large empty green margin on both sides and
generous floor in the lower third — visibly closer to `ref-severance-5.png`.
`Read` it and post `N1 PASS/FAIL`.

## N2 — [HIGH] Lengthen the desks to the show's longer rectangles

**Problem.** Desks read a bit square/compact (`pw-12-lean.png`). The real MDR
desks are longer rectangles (clearly wider than deep).

**Action.** In `StationLite()`:
- Desk surface `RoundedBox args={[1.55, 0.06, 1.30]}` → lengthen to ~
  `[1.95, 0.06, 1.25]` (wider, slightly less deep).
- Move the two pedestals out to match the new width: they're at `x=±0.50`
  (`RoundedBox args={[0.66, 0.72, 1.20]} position={[±0.50, 0.36, DESK_DZ]}`) →
  shift to about `±0.66` and re-place both drawer pulls/divider seams that
  reference `±0.50`.
- Check the monitor/keyboard/accessory offsets still sit sensibly on the wider
  top (they're small, should be fine; nudge if a prop hangs off the edge).

**Verify (measurable).** `r2-idle.png` / `r2-lean.png`: desks are visibly longer
than deep (≈ 1.5:1), pedestals sit under the desk corners, nothing floats off the
edge. `Read` and post `N2 PASS/FAIL`.

## N3 — [HIGH] Exaggerate the pinwheel twist and match the reference handedness

**Problem.** The spiral is currently subtle (`POD_CX = 0.55`). The show's
pinwheel (`ref-severance-2.png`, top-down) is a clear windmill.

**Action.** In the pinwheel IIFE in `Office.tsx`:
- Increase the tangential offset: `POD_CX = 0.55` → ~`0.95` for a more obvious
  spiral. (`ARM_DX = 0 − POD_CX` keeps the active desk fixed automatically.)
- Optionally lengthen the radial arm: `POD_CZ = DESK_Z − 1.02` → `DESK_Z − 1.15`
  so desks spread (pairs with N1).
- **Handedness:** compare your top-down/oblique result to `ref-severance-2.png`.
  If the spiral turns the opposite way, negate the tangential offset (use
  `POD_CX = −0.95`, `ARM_DX = 0 − POD_CX`) to flip it to match.
- Re-check the 4 desks don't overlap each other or the central column after the
  larger offset; widen `POD_CZ` if they collide.

**Verify (measurable).** `r2-idle.png`: the 4 desks clearly windmill (rotational,
obvious spiral) and the turn direction matches `ref-severance-2.png`; no desk
overlaps. `Read` and post `N3 PASS/FAIL`.

## N4 — [MEDIUM] Make the four dividers meet cleanly at the central column

**Problem.** The per-desk divider walls (one behind each desk, `MdrPanel w={1.46}`
at local `[0, 0.52, −0.76]`) are placed by eye and don't butt the central white
column cleanly — there can be gaps/overlap where they meet
(`pw-12-lean.png`). In the show the four panels meet crisply at the post.

**Action.** In the pinwheel IIFE:
- Position each divider so its INNER end touches the central column (column is
  `0.34` wide at pod centre). Compute the divider's inner-edge distance from the
  pod centre and set its width/offset so all four inner ends land on the column
  faces (a clean windmill butt-joint), not floating short or overshooting.
- Make sure the white frame caps (from G13) read at the join.
- If a per-desk wall can't be made to meet cleanly, switch to placing the four
  panels as a dedicated windmill around the column (like the old
  `MdrDividerCluster` but with a tangential offset so it's a pinwheel, not a `+`).

**Verify (measurable).** `r2-lean.png`: the four green walls meet at the white
column with no visible gap or messy overlap at the post. `Read` and post
`N4 PASS/FAIL`.

## N5 — [HIGH] Rework the ceiling to the show's square pyramidal grid + bright rectangular lights

**Problem.** v1 (G1) fixed the brightness, but the geometry is still diamond
holes rotated 45°. The real MDR ceiling (`ref-severance-1.png`,
`ref-severance-5.png`) is an **axis-aligned square grid** of shallow inverted
**pyramid coffers** with **bright flat rectangular light panels** set into the
grid in a regular pattern, crisp pale T-bar grid lines, and a soft gradient on
the facets (brighter toward the apex). It reads luminous and orderly.

**Action.** Rework `CofferedCeiling()`:
- Change the coffer openings from diamonds to **axis-aligned squares** on the
  `SPACING = 3.0` grid (rebuild `slabGeo` holes + `cofferGeo` as a 4-sided
  square inverted pyramid instead of the diamond geometry).
- Add a **regular pattern of bright flat rectangular light panels** flush in the
  grid (e.g. a long rectangle per cell, or every other cell — match the
  reference cadence), near-white emissive so they glow as the dominant light.
- Keep facets pale (`~#D2DBD0`) but add a subtle gradient (brighter toward the
  apex) — e.g. a second lighter material or vertex-driven shade.
- Render crisp **pale T-bar grid lines** between cells (thin light beams), not
  dark seams.
- Keep `Bloom` from blowing it out (`luminanceThreshold` ~0.75).

**Verify (measurable).** `r2-idle.png`: the ceiling reads as a clean
**square** grid of pale pyramidal coffers with regular bright rectangular lights
and crisp pale grid lines — visibly closer to `ref-severance-5.png` than the
current diamond version. `Read` and post `N5 PASS/FAIL`.

---

## Done / no-regression check (required before finishing)

After all scene edits, confirm the entry experience still works (the pinwheel was
built to preserve it, but N1–N5 touch the scene):

- `r2-idle.png` and `r2-lean.png` render with no console/page errors.
- The inner Win95 desktop overlay still mounts and the CRT projection vars are
  non-zero (Appendix A step 4) — proves the dolly target + overlay are intact.

Post `NO-REGRESSION PASS` with the overlay-present + projection-vars evidence.

**Met when** N1, N2, N3, N5 each have a PASS line AND `NO-REGRESSION PASS` is
present (N4 is MEDIUM — include if reached, else report its FAIL) — or stop after
30 turns and summarize remaining FAILs.

---

## Appendix A — capture harness (reuse, do not rediscover)

1. **`npm run dev` hangs on Node 23+** (this machine is on 25). Verify against
   the built site:
   ```sh
   npm run build && npm run serve     # serve = python3 -m http.server 4321 --directory dist
   ```
2. **3D idle/lean capture** (BIOS is dismissed with a keypress, NOT a click):
   ```js
   await page.goto('http://localhost:4321/', { waitUntil:'load' });
   await sleep(2600); await page.keyboard.press('Enter'); await sleep(3400);
   await page.screenshot({ path:'shots/goal0529/r2-idle.png' });
   await page.mouse.move(700, 690); await sleep(1700);          // lean-in
   await page.screenshot({ path:'shots/goal0529/r2-lean.png' });
   ```
3. **Monitor click does NOT register via Playwright** (R3F raycast). To reach the
   desktop, set `sessionStorage['pg_phase']='desktop'` via `addInitScript` before
   `goto('/')`.
4. **No-regression overlay check** (proves dolly target + projector intact):
   ```js
   await page.addInitScript(()=>{try{sessionStorage.setItem('pg_phase','desktop')}catch(e){}});
   await page.goto('http://localhost:4321/'); await sleep(2500);
   const present = await page.locator('.win95-desktop').count();          // expect 1
   const crt = await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);
     return {w:s.getPropertyValue('--crt-w'), h:s.getPropertyValue('--crt-h')};}); // expect non-zero
   ```
5. Existing reusable scripts in `scripts/`: `review-goal.mjs`, `review-mobile.mjs`,
   `review-desktop.mjs`. Build takes ~2.5 min; run it in the background and wait
   on a `build exit=` marker.

## Appendix B — current constants (so you can find/anchor edits)

- Room: `ROOM_W=36`, `ROOM_D=46`, `ROOM_H=4.5` (lines ~71–73).
- Idle camera: `CAM_IDLE_POS=(1.40,1.50,4.10)`, `CAM_IDLE_TGT=(0.10,1.10,-5.00)`
  (~132–133); FOV `aspect<0.75?48:aspect<1.2?52:54` (~542). **Do not touch**
  `CAM_MONITOR_*`, `CAM_LEAN_*`, `MONITOR_WORLD`, `SOUTH_DX`, `DESK_Z`.
- Pinwheel IIFE (~2313): `POD_CX=0.55`, `POD_CZ=DESK_Z-1.02`, `ARM_DX=0-POD_CX`,
  `ARM_DZ=DESK_Z-POD_CZ`; per-desk divider `MdrPanel w={1.46} h={1.05}` at local
  `[0,0.52,-0.06-0.70]`; central column `boxGeometry [0.34,1.70,0.34]`.
- Desk (`StationLite`, ~1464): `DESK_DZ=-0.06`, `CHAIR_Z=1.00`; desk surface
  `[1.55,0.06,1.30]`; pedestals `[0.66,0.72,1.20]` at `x=±0.50`.
- Ceiling (`CofferedCeiling`, ~304): `SPACING=3.0`, `HOLE_HALF=1.05`,
  `PANEL_HALF=0.50`, `COFFER_DEPTH=0.85`; slab `#E6EAE4`, facets `#D2DBD0`,
  panels emissive white `2.2`.
