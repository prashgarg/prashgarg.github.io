# CLAUDE.md — agent guidance for this repo

This file is read by Claude Code / Codex / Cursor / other coding agents
on every session. It encodes the project's working norms so iteration
stays focused and trustworthy.

It borrows liberally from
[Jesse Vincent's Superpowers methodology](https://github.com/obra/superpowers)
(MIT). If you want the full thing, install the plugin:

```text
/plugin install superpowers@claude-plugins-official
```

The plugin gives you the full skills suite. The notes below are the
distilled subset that has actually proven useful while building this
site — keep them in mind even without the plugin loaded.

---

## What this project is

A personal academic website for Prashant Garg.

- **Stack:** Astro + React Three Fiber + drei + Tailwind. Static site,
  deployed via GitHub Pages from `main`.
- **Home page** (`/`) is a 3D scene built in `src/components/Office.tsx` —
  a "Severance"-style office. Press Enter / click the monitor → camera
  dollies in → the monitor screen is a real composited DOM `<iframe>` of
  the Win95-style desktop (`/os`, `src/components/OsPage.tsx` +
  `InnerDesktop.tsx`) via drei `<Html transform>`. Click the room to exit.
  Touch devices / `?composite=0` get a fullscreen desktop overlay instead.
- **Inside pages** (`/research`, `/talks`, `/library`, `/now`, `/cv`) use
  `src/layouts/Win95Layout.astro` (Win95 window chrome). `/standard` is a
  plain, no-JS, server-rendered fallback. (The old cottage `Room.tsx` /
  `Study.tsx`, `public/models/`, and the v1 `Layout.astro` / `Nav.astro` /
  `Footer.astro` were removed in the 2026-06-15 review pass.)
- Branches: `main` is live, `v1-astro-archive` is the pre-3D version.

## Norms (the distilled Superpowers bits)

### 1. Verification before completion

> Evidence before claims, always.
> No completion claims without fresh verification evidence.

Before saying "this works" or committing:

1. `npm run build` must pass.
2. For visual changes, run `node scripts/screenshot.mjs shots/$NAME.png`
   and `Read` the file. Headless Playwright is set up; use it.
3. If a flow has interactions, screenshot mid-state and end-state
   (the `screenshot.mjs` script supports `'hover=x,y wait=ms'` and
   `'click=x,y wait=ms'` action args).
4. If something looks wrong in the screenshot, fix it before claiming
   "done" — don't paper over with prose.

Saying "looks good" without a screenshot is dishonesty here.

### 2. Brainstorming before creative work

When the user asks for a creative change (new aesthetic direction,
new interaction, new section), don't dive into code. Tease the spec
out first:

- Confirm intent — "do you want X or Y?"
- Surface tradeoffs honestly (the assets we have, what's achievable
  without a 3D artist, what's not).
- Offer 3–4 concrete options with different effort/result tradeoffs.
- Recommend honestly, including options that mean throwing away work
  if that's the right call.

The user has explicitly preferred this style multiple times. Don't
invent — ask, then execute.

### 3. Git worktrees for visual A/B

This project has an aesthetic that's still being found. When trying
a meaningfully different direction (e.g. "cottage with real textures
instead of pastel recolour"), use a separate branch (or git worktree)
so the working version on `main` stays intact and the user can
compare side-by-side. Reuse `v2-3d-library` as the pattern — branch,
iterate, decide, then merge or discard.

### 4. Plans for multi-step work

For changes that touch >2 files or take >5 commits, write the plan
first (a numbered list in the chat) and confirm before executing.

### 5. Finishing a branch

When a direction is done and the user is happy:

1. Tag the milestone (e.g. `v2-pastel-cottage`).
2. Merge to `main` only after a successful local build + screenshot
   pass.
3. Watch the deploy workflow on `prashgarg.github.io`.
4. Screenshot the **live** site too — local dev and prod sometimes
   diverge (we discovered this when 140 MB of textures broke the
   first live deploy).

## Things that bit us once and should not bite again

- **Use Node 22 — Node 23+ hangs BOTH the dev server AND the build.**
  Astro 6 + Vite 7 hang silently on Node 23/24/25 (`npm run dev` prints
  the banner then never binds :4321; `astro build` sits at ~0 % CPU
  forever — verified 2026-06-09 on v25.8.0). There is NO nvm on this
  machine; Node 22 is installed keg-only via Homebrew. Prefix PATH
  before any npm command:
  `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` (→ v22.22.3).
  The `predev` guard (`scripts/check-node.mjs`) errors clearly on bad
  versions, but there is no `prebuild` guard — don't forget the PATH.
  Review against the built site: `npm run build && npm run serve`
  (serves `dist/` on http://localhost:4321 — what the screenshot/
  Playwright harness needs).
- **Quaternius `.glb` files ship with high-res textures.** We override
  every material colour at runtime, so the textures are pure bloat.
  `scripts/strip-textures.mjs` strips them — total assets ~140 MB →
  ~1 MB. If you add a new Quaternius model, run the strip script.
- **drei's `<Text>` fetches a font over the network.** Playwright's
  `waitUntil: 'networkidle'` never resolves while that's in flight.
  `scripts/screenshot.mjs` uses `'load'` instead. Don't switch back.
- **Camera FOV needs to widen on portrait viewports.** `CameraRig`
  handles this via aspect-ratio breakpoints (58° / 50° / 42° / 36°).
- **Boot → inner page transition** depends on the `html` background
  staying `#0E0D0B` (set in `src/layouts/Layout.astro`) so the
  browser never flashes white between pages.
- **`.glb` files referenced in code but missing from `/public/models/`**
  fall back to primitives gracefully via the `Model` component's
  `ErrorBoundary`. Test the fallback before assuming a model loads.

## Asset license posture

- All 3D models under `/public/models/` are CC0 (Quaternius public
  domain dedication). No attribution required but credited in the
  top-level README.
- Architecture inspiration credited to Henry Heffernan in README; no
  code or assets reproduced from his repo.
- Visual register tips its hat to PostHog; no code or assets
  reproduced.

## Useful scripts

```sh
npm run dev                                      # http://localhost:4321
npm run build                                    # static into dist/
node scripts/screenshot.mjs shots/$N.png 1400 900 5000
node scripts/screenshot.mjs $N 390 844 6000      # mobile portrait
node scripts/screenshot.mjs $N 1400 900 4000 'click=720,560 wait=1500'
node scripts/strip-textures.mjs                  # strip all .glb files
node scripts/strip-textures.mjs public/models/new.glb   # one file
```

## When in doubt

Ask the user.
