# Agent Handoff — prashgarg.github.io personal site

Last updated: 2026-05-25  
Last commit: `0af7518` — "Batch (b): keyboard shortcuts + 8-edge window resize"

---

## What this project is

Personal academic website for economist **Prashant Garg**.  
Live at → `https://prashgarg.github.io`  
Repo root → `/Users/prashgarg/Library/CloudStorage/Dropbox-PrashantGarg/Prashant Garg/my_website`

**Stack:** Astro v6 · React Three Fiber · Drei · Tailwind v4 · TypeScript  
Static build → `dist/` → GitHub Pages from `main`.

---

## Architecture overview

```
Entry experience (3D scene)
  src/pages/index.astro
    └── src/components/Office.tsx          ← entire R3F scene (~3300 lines)
          ├── OfficeScene                  ← room geometry, lighting, carpet
          ├── CrtMonitor                   ← wedge BufferGeometry, clickable
          ├── LumonTrackball               ← spins on hover
          ├── DeskLamp                     ← click to toggle
          ├── CoffeeMug + CoffeeSteam      ← click interaction
          ├── FirstVisitWelcome            ← fades in 4s after entry
          ├── CameraRig                    ← idle orbit + dolly-on-click
          └── StudyAudio                   ← HVAC hum, focus-mode lowpass

Inner experience (Win95 desktop inside CRT)
  src/layouts/Win95Layout.astro            ← full chrome + embed mode (?embed=1)
  src/components/InnerDesktop.tsx          ← multi-window shell (~1700+ lines)
    ├── APP_BY_ID / APP_BY_PATH registries
    ├── openApp / closeApp / minimizeApp / toggleMaximize / focusApp
    ├── Physics drag (ring-buffer inertia, RAF decay 0.92^(dt*60))
    ├── 8-edge resize (n/s/e/w/ne/nw/se/sw), min 360×260
    ├── Keyboard shortcuts (Alt+Tab, Esc, F11, ⌘W, ⌘Q)
    ├── VolumeTray (localStorage pg_volume_v1)
    ├── Right-click context menu
    ├── Start menu
    └── HomeContent (inline first-launch welcome)
```

### Routing inside the CRT

- The CRT iframe src is `Win95Layout.astro` pages with `?embed=1` appended.
- In embed mode, Win95Layout strips its chrome and intercepts all internal `<a>` clicks, posting `{type:'pg-nav', href}` to `window.parent`.
- `InnerDesktop.tsx` listens for `pg-nav` and calls `openApp(id, fromPoint, pathOverride)` with `findAppForPath(href)` (longest-prefix matcher) so sub-routes like `/research/<slug>` open the Research window at the right path.
- `OpenWin` has a `path?` field; iframes use `key={w.path || app.path}` to force reload on path change.

---

## Key files

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/Office.tsx` | ~3300 | Entire R3F home scene |
| `src/components/InnerDesktop.tsx` | ~1700 | Win95 desktop shell |
| `src/layouts/Win95Layout.astro` | ~750 | Page chrome + embed mode |
| `src/pages/index.astro` | 7 | Entry point |
| `scripts/screenshot.mjs` | — | Playwright headless screenshots |
| `scripts/strip-textures.mjs` | — | Strip textures from .glb files |

---

## Scene design — Office.tsx

### Camera
- Idle corner-quarter position: `(1.40, 1.50, 4.10)` looking toward `(0.10, 1.10, -5.00)`
- Click CRT → dolly into monitor → `phase = 'desktop'`
- Phase transitions: `intro → room → desktop`
- Scene dims to `brightness(0.32)` when `phase=desktop`

### Aesthetic target
Severance MDR office:
- Sage-green fabric divider panels with chrome frames + white feet (`MdrDividerCluster`, `MdrPanel`)
- Carpet vacuum-sweep shader (`CarpetVacuumTracks`) — straight diagonal sweeps 10° off horizontal
- Deep coffer ceiling with shadow
- 4-station symmetric layout (SOUTH_DX=0)
- CRT wedge geometry (narrower back, sloped top): 8 vertices `BufferGeometry`

### Interactive objects
| Object | Interaction |
|--------|-------------|
| CRT Monitor | Click → dolly + boot to inner site |
| LumonTrackball | Hover → spin (omega 0.15 → 4.0 rad/s) |
| DeskLamp | Click → toggle emissive + pointLight |
| CoffeeMug | Click → `pg-mug-sip` event + bob; Steam boosts |
| FirstVisitWelcome | localStorage `pg_seen_welcome_v1`, fades in 4s |

### Audio
- `StudyAudio`: HVAC hum = 42Hz + 210Hz harmonic + 0.07Hz LFO tremolo
- Volume from localStorage `pg_volume_v1`; dispatched via `pg-volume` custom event
- Focus mode (when inside monitor): BiquadFilterNode lowpass 18kHz → 700Hz

---

## Desktop shell — InnerDesktop.tsx

### Window state
```ts
interface OpenWin {
  id: AppId;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  x: number; y: number; w: number; h: number;
  openFrom?: { x: number; y: number };   // for open animation origin
  state?: Record<string, unknown>;
  path?: string;                          // sub-route override for iframe
}
```

### Keyboard shortcuts
```
Alt+Tab   → cycle visible windows (highest zIndex first)
Esc       → close Start / ctx menu, then close focused window
F11       → toggle maximize focused window
⌘/Ctrl+W  → close focused window
⌘/Ctrl+Q  → onClose() (exit inner site, return to 3D scene)
```

### Resize edges
8 invisible `.win95-resize-edge` divs per non-maximized window.  
Edge labels: `n s e w ne nw se sw`.  
Top/left edges shrink AND translate origin; right/bottom just resize.  
Min size: 360 × 260 px.

### Physics drag
- 6-sample ring buffer tracks pointer positions + timestamps
- On mouse-up: velocity = displacement over last 80ms
- RAF loop: `velocity *= 0.92^(dt_seconds * 60)` per frame, stops at < 0.5 px/frame

### Sound system
```ts
playUiClick(type, variant)
// variants: 'default' | 'close' | 'soft' | 'tap' | 'menu' | 'titlebtn'

playWindowOpenDing()
// synthesized B5+E6 two-tone bell
```

---

## Lessons learned (don't repeat these bugs)

1. **Quaternius .glb files have heavy textures** — run `scripts/strip-textures.mjs` on any new model. Total assets 140 MB → 1 MB after strip.
2. **drei `<Text>` fetches font over network** — Playwright `waitUntil: 'networkidle'` never resolves. Use `'load'` in screenshot.mjs.
3. **Camera FOV breakpoints for portrait viewports**: 58° / 50° / 42° / 36° in `CameraRig`.
4. **Background stays `#0E0D0B`** (set in `src/layouts/Layout.astro`) to prevent white flash on boot transition.
5. **Vite 8 + Astro 6 incompatibility** → fixed with `"overrides": { "vite": "^7" }` in package.json.
6. **TypeScript `topId` used-before-declaration** — compute `focusedId` inline inside keydown handler.
7. **Stale dist** — always `pkill -9 -f "astro|vite|node.*build|serve"` before rebuilding when in doubt.
8. **`pg-nav` only matched exact paths** — fixed with `findAppForPath()` longest-prefix matcher + `OpenWin.path` field.

---

## Verification protocol (per CLAUDE.md)

Before claiming anything works:
1. `npm run build` must pass (run from project root)
2. `node scripts/screenshot.mjs shots/$NAME.png 1400 900 5000` — Read the file
3. For interactions: `node scripts/screenshot.mjs $N 1400 900 4000 'click=720,560 wait=1500'`
4. If anything looks wrong in the screenshot, fix before claiming done

---

## What was just shipped (Batch b — commit 0af7518)

- Alt+Tab cycles visible windows
- Esc closes Start/ctx menu then focused window
- F11 maximizes/restores
- ⌘/Ctrl+W closes window; ⌘/Ctrl+Q exits to 3D scene
- 8 invisible resize-edge divs around each non-maximized window
- Min size 360×260 enforced on all 8 edges

---

## Proposed next batch (Batch c — NOT YET STARTED, awaiting user confirmation)

**Mobile polish + snap-to-edge:**
- Viewport < 600px → new windows default to `maximized: true`
- Touch-and-hold (500ms long press) → right-click context menu on touch devices
- Drag window within ~24px of screen edge → snap preview overlay → release → snap to half-screen (Win11 Snap Assist style)

**Other items on the backlog (rough priority):**
- Active-window shadow glow (brighten box-shadow on focused window)
- iframe loading shimmer (skeleton while iframe loads)
- Minimize / maximize sound variants (softer whoosh for minimize vs. ding for open)
- CV print polish (verify `Cmd+P` / print CSS)
- Cmd+K palette (search across papers/talks/pages)
- Search inputs (pagefind integration inside iframe)

---

## Useful commands

```sh
npm run dev                                         # localhost:4321
npm run build                                       # → dist/
node scripts/screenshot.mjs shots/$N.png 1400 900 5000
node scripts/screenshot.mjs $N 390 844 6000          # mobile portrait
node scripts/screenshot.mjs $N 1400 900 4000 'click=720,560 wait=1500'
node scripts/strip-textures.mjs                     # strip all .glb
node scripts/strip-textures.mjs public/models/x.glb # one file
pkill -9 -f "astro|vite|node.*build|serve"          # kill stale servers
```
