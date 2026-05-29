# Architecture — Deep Code Reference

Last verified against: commit `0af7518`  
Read this alongside `HANDOFF.md` which covers the big picture.

---

## Table of Contents

1. [Phase machine & entry flow](#1-phase-machine--entry-flow)
2. [3D scene — Office.tsx](#2-3d-scene--officetsx)
   - [Room constants & palette](#21-room-constants--palette)
   - [Camera system](#22-camera-system)
   - [CRT monitor geometry & shader](#23-crt-monitor-geometry--shader)
   - [CRT screen projector (CSS var bridge)](#24-crt-screen-projector-css-var-bridge)
   - [Interactive objects](#25-interactive-objects)
   - [Materials & shaders](#26-materials--shaders)
   - [Audio system (StudyAudio)](#27-audio-system-studyaudio)
3. [Desktop shell — InnerDesktop.tsx](#3-desktop-shell--innerdesktoptsx)
   - [App registry & routing](#31-app-registry--routing)
   - [OpenWin state model](#32-openwin-state-model)
   - [Window lifecycle (open/close/minimize)](#33-window-lifecycle-opencloseminimize)
   - [Physics drag with inertia](#34-physics-drag-with-inertia)
   - [8-edge resize system](#35-8-edge-resize-system)
   - [Keyboard shortcuts](#36-keyboard-shortcuts)
   - [Sound system](#37-sound-system)
   - [Volume tray](#38-volume-tray)
   - [CSS injection strategy](#39-css-injection-strategy)
4. [Embed mode & iframe routing](#4-embed-mode--iframe-routing)
   - [Win95Layout embed bootstrap](#41-win95layout-embed-bootstrap)
   - [pg-nav message protocol](#42-pg-nav-message-protocol)
   - [Sub-path routing with findAppForPath](#43-sub-path-routing-with-findappforpath)
5. [Win95Layout.astro structure](#5-win95layoutastro-structure)
   - [Cmd+K palette](#51-cmdk-palette)
   - [Dark mode](#52-dark-mode)
6. [Data flow diagram](#6-data-flow-diagram)
7. [Performance notes](#7-performance-notes)

---

## 1. Phase machine & entry flow

**File:** `src/components/Office.tsx` (top-level `Office` component)

```ts
type Phase = 'splash' | 'entering' | 'idle' | 'dollying' | 'on-monitor' | 'booting' | 'desktop';
```

State transitions:

```
splash (R3F Canvas not yet mounted)
  ↓ Canvas onCreated
entering (CameraRig lerps from ENTRY_POS → IDLE_POS over ENTRY_MS=2400ms)
  ↓ CameraRig calls onEntryDone()
idle (mouse parallax + lean-in active; CRT clickable)
  ↓ user clicks CRT
dollying (CameraRig lerps from current → MONITOR_POS over DOLLY_MS=2200ms)
  ↓ CameraRig calls onArrived()
on-monitor (camera locked, boot HUD appears)
  ↓ boot sequence plays (typed text, ~3s)
booting
  ↓ boot done
desktop (InnerDesktop mounted, scene brightness 0.32)
```

**Key detail:** `sessionStorage.getItem('pg_phase')` is checked on mount. If it's already `'desktop'` (user navigated away and came back), the phase machine jumps straight to `desktop` — skipping the dolly + boot sequence. This keeps the experience snappy on return visits.

**Scene dim:**
```tsx
// In the JSX wrapping OfficeScene:
<div style={{ filter: phase === 'desktop' ? 'brightness(0.32)' : 'brightness(1)' }}>
  <Canvas ...>
```

---

## 2. 3D scene — Office.tsx

### 2.1 Room constants & palette

```ts
const ROOM_W = 36;   // world-space metres
const ROOM_D = 46;
const ROOM_H = 4.5;

const C = {
  carpet:    '#88AB7E',
  wall:      '#F2F0EC',
  ceiling:   '#D2D4D6',
  desk:      '#E4E2DC',
  deskLeg:   '#DDDBD6',
  partition: '#2F4D3A',   // darker sage, MDR fabric
  chair:     '#1C1C1C',
  monitor:   '#E2DED6',   // Lumon off-white
  monitorScreen: '#3A5040',
  clock:     '#F4F2EE',
  door:      '#DCDAD6',
};
```

**Symmetric 4-station layout:**
```ts
const SOUTH_DX = 0;   // centre station is at x=0
// The 4 stations are rendered by 4 <StationLite> in a <group> with
// rotation-y offsets (0, π/2, π, 3π/2) — each looks inward.
// Active south station sits at SOUTH_DX=0, DESK_Z=-4.5.
```

### 2.2 Camera system

**Constants (world space):**
```ts
const CAM_ENTRY_POS = new THREE.Vector3(2.20, 1.92, 5.20);
const CAM_ENTRY_TGT = new THREE.Vector3(0.10, 1.05, -5.00);
const CAM_IDLE_POS  = new THREE.Vector3(1.40, 1.50, 4.10);
const CAM_IDLE_TGT  = new THREE.Vector3(0.10, 1.10, -5.00);
const CAM_MONITOR_POS = new THREE.Vector3(SOUTH_DX + 0.10, 1.05, DESK_Z + 0.13);
const CAM_MONITOR_TGT = MONITOR_WORLD.clone();
const CAM_LEAN_POS  = new THREE.Vector3(SOUTH_DX + 0.10, 2.20, -1.05);
const CAM_LEAN_TGT  = new THREE.Vector3(SOUTH_DX + 0.10, 0.88, -4.45);
```

**CameraRig `useFrame` logic by phase:**
- `entering`: lerp ENTRY→IDLE using `easeOutExpo` over `ENTRY_MS`
- `dollying`: lerp current→MONITOR using `easeInOutCubic` over `DOLLY_MS`
- `on-monitor / booting / desktop`: `camera.position.lerp(CAM_MONITOR_POS, 0.08)` (settle)
- `idle`: parallax + lean-in (described below)

**Idle parallax + lean-in:**
```ts
// Screen-space mouse → leanK (0..1)
const yLean   = Math.max(0, Math.min(1, mouseY / 0.5));  // lower half of screen
const xCentre = 1 - Math.min(1, Math.abs(mouseX) / 0.85);
const leanK   = Math.pow(yLean * xCentre, 1.15);
// interpolate IDLE ↔ LEAN by leanK
// add sin-wave drift for living camera feel
// parallax amplitude scales by (1 - leanK*0.55) so it doesn't fight the lean
```

**FOV breakpoints** (set via `useEffect` on `size`):
```ts
camera.fov = aspect < 0.75 ? 48 : aspect < 1.2 ? 52 : 54;
```

### 2.3 CRT monitor geometry & shader

**Wedge body** — 8-vertex `BufferGeometry`, manually indexed:
```ts
const FW = 0.56, FH = 0.46;   // front face w × h
const BW = 0.40, BH = 0.30;   // back face (narrower + shorter)
const D  = 0.42;               // depth
// back face KEEPS the same bottom y (flat bottom), top is lower
// → top slopes front-to-back → reads as old CRT "hump" silhouette
```

Faces (triangle pairs): front / back / top(sloped) / bottom(flat) / left / right.

**CRT fragment shader** (`CRT_FRAG`):
- Uniform `uColor` (`#6CB8E0` teal), `uIntensity` (lerped on hover), `uTime`
- 22×14 grid of 7-segment digit glyphs scrolling upward (`uTime * 0.45`)
- Per-cell wiggle via `hash2(gridCel) → UV jitter`
- Cluster pulse: every 3×3 block can "activate" based on `hash1(clusterId + floor(uTime*0.6))`
- Highlight box: every 6s, pick a random 3×3 cluster, draw a teal outline that fades in/out
- `uIntensity` target: `phase=idle + hovered → 2.85`, `idle not hovered → 1.85`, `other → 0.12`
- Intensity lerps at `dt * 6` per frame (4 Hz time constant → smooth phosphor feel)

**Invisible hit target** overlaps the visible screen plane with a larger geometry (`0.85 × 0.65` vs screen `0.34 × 0.26`) for easier clicking:
```tsx
<mesh position={[0, 0.0, 0.22]} onClick={onClick}>
  <planeGeometry args={[0.85, 0.65]} />
  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
</mesh>
```

### 2.4 CRT screen projector (CSS var bridge)

`CrtScreenProjector` runs in `useFrame` and projects the 4 corners of the screen plane (in world space) into viewport pixels, then writes to CSS variables:

```ts
// Screen plane: position cx,cy+0.02,cz+0.207, half-widths hw=0.17, hh=0.13
// Corner → v.project(camera) → ndc → pixel coords
root.setProperty('--crt-left', `${minX}px`);
root.setProperty('--crt-top',  `${minY}px`);
root.setProperty('--crt-w',    `${maxX - minX}px`);
root.setProperty('--crt-h',    `${maxY - minY}px`);
```

`InnerDesktop.tsx` reads these in `.win95-desktop.embedded`:
```css
.win95-desktop.embedded {
  top:    var(--crt-top,  50%);
  left:   var(--crt-left, 50%);
  width:  var(--crt-w,    min(66vw, 880px));
  height: var(--crt-h,    min(78vh, 670px));
}
```

The overlay therefore tracks the screen plane exactly through the dolly animation.

### 2.5 Interactive objects

| Component | Trigger | Effect |
|-----------|---------|--------|
| `CrtMonitor` | click | phase `idle → dollying` |
| `LumonTrackball` | hover | omega lerps `0.15 → 4.0 rad/s` (dt * 4 time constant) |
| `DeskLamp` | click shade | toggles `on` state → emissive + pointLight |
| `CoffeeMug` | click | `sipUntilRef = t + 0.45`, dispatches `pg-mug-sip` |
| `CoffeeSteam` | listens `pg-mug-sip` | `sipUntilRef = t + 1.4` → boosts opacity/speed/rise |

**LivingProp** wrapper — sinusoidal y-bob + z-rot drift, tiny amplitudes (visible only on lean-in):
```ts
position.y = Math.sin(t * speed + phase) * ampY;
rotation.z = Math.sin(t * 0.7 + 1.3) * ampRot;
```

**DustParticles** — 90 `THREE.Points` drifting upward + sideways sway, white colour 0.25 opacity, depthWrite=false so they don't z-fight.

**WallClock** — real-time: `useFrame` updates hour/minute hand rotation from `new Date()`. Face radius 0.55.

**SmokeDetector** — blinks LED red for 120ms every 4s: `t = (elapsedTime + phaseOffset) % 4.0; intensity = t < 0.12 ? 2.2 : 0.0`.

### 2.6 Materials & shaders

**Wall panel seam shader** (`WALL_FRAG`):
- Uniform `uSeams` (number of vertical panels), `uWall` (base colour), `uSeam` (seam colour)
- Vertical seams via `smoothstep(0.965, 0.992, abs(fract(x*uSeams) - 0.5) * 2.0)`
- Single horizontal seam at `vUv.y ≈ 0.63` (top trim ~2.4m on 3.8m wall)

**Carpet noise shader** (`CARPET_FRAG`):
- `uBase` (carpet colour), `uRes` (pixel resolution for grain)
- `n1` = per-pixel white noise × 0.045 (weave grain)
- `n2` = coarser blotch noise × 0.025 (wear pattern)
- `track` = sin-wave lightening bands per 18 horizontal bands (vacuum streaks)

**Vacuum tracks overlay** (`CarpetVacuumTracks`):
- Separate transparent `ShaderMaterial` rendered on top of carpet (polygonOffset)
- Lines at 10° off horizontal, 0.45m spacing, per-line wobble
- Fades within 1.5m of pod centre (`avoid`) and toward room corners beyond 11m (`falloff`)

**Coffered ceiling** (`CofferedCeiling`):
- Outer slab: `THREE.ShapeGeometry` with diamond holes punched out via `shape.holes`
- Per-coffer: inverted frustum walls (dark `#4C5E50`) + emissive panel (white, intensity 2.6)
- `HOLE_HALF = 1.05`, `PANEL_HALF = 0.50`, `COFFER_DEPTH = 0.85`, spacing `3.0`

**PBR textures** — `useDeskNormalProps` and `useChairFabricProps` load CC0 normal maps from ambientCG via `useTexture`. `normalScale` is kept very low (0.15–0.45) so the colour read doesn't shift.

### 2.7 Audio system (StudyAudio)

**HVAC hum** (Web Audio API, no file required):
```
oscillator1: 42 Hz sine (fundamental)
oscillator2: 210 Hz sine (5th harmonic)
LFO: 0.07 Hz sine → modulates gain of both (tremolo)
```

**Focus mode** (when `phase=desktop`):
```
BiquadFilterNode: type='lowpass', frequency ramps 18000 → 700 Hz
Time constant: 2s exponential ramp (sounds like noise-cancelling headphones engaging)
```

**Volume** read from `localStorage.getItem('pg_volume_v1')`, updated via `pg-volume` custom event listener.

---

## 3. Desktop shell — InnerDesktop.tsx

### 3.1 App registry & routing

```ts
type AppId = 'home' | 'research' | 'talks' | 'library' | 'now' | 'cv';

interface AppDef {
  id: AppId;
  label: string;       // taskbar + icon label
  title: string;       // titlebar full text
  path: string;        // URL path + iframe src ('/' = inline home)
  Icon: () => React.ReactElement;  // 32×32 SVG icon
  defW: number;        // default window width
  defH: number;        // default window height
  cascadeIdx: number;  // cascade offset multiplier
}
```

`APP_BY_ID`: `Record<AppId, AppDef>` — O(1) lookup by id  
`APP_BY_PATH`: `Record<string, AppDef>` — O(1) lookup by exact path

**Cascade geometry** `defaultGeo(app)`:
```ts
// Origin: right of icon column (iconColWidth=110 + margin=14 = 124px)
// Each window steps down+right by (cascadeIdx * 32, cascadeIdx * 26)
// Clamped to containerSize so nothing goes off-screen
```

### 3.2 OpenWin state model

```ts
interface OpenWin {
  id: AppId;
  zIndex: number;           // draw order (higher = in front)
  minimized: boolean;
  maximized: boolean;
  x: number; y: number;     // top-left in container coords
  w: number; h: number;     // size
  openFrom?: { x: number; y: number };  // animation origin (icon centre)
  state: 'opening' | 'open' | 'closing' | 'minimizing';
  path?: string;            // sub-route override (e.g. /research/some-slug)
}
```

**`topId`** (computed inline, not from state):
```ts
const topId: AppId | null = (() => {
  const v = [...wins].filter(w => !w.minimized).sort((a,b) => b.zIndex - a.zIndex)[0];
  return v ? v.id : null;
})();
```

### 3.3 Window lifecycle (open/close/minimize)

**`openApp(id, fromPoint?, pathOverride?)`:**
1. If window already in `wins` array → restore it (`minimized=false, state='open'`), optionally update `path`
2. Otherwise → push new `OpenWin` with `state='opening'`, geometry from `defaultGeo`
3. After 220ms (animation duration) → set `state='open'`
4. `window.history.pushState` to the app path
5. `playWindowOpenDing()` only for genuinely new windows (not restores)

**`closeApp(id)`:**
1. Set `state='closing'`
2. After 220ms → filter window out of `wins`
3. Update URL to new topmost visible window (or '/')

**`minimizeApp(id)`:**
1. Set `state='minimizing'`
2. After 200ms → `minimized=true, state='open'`

**Window animations** — CSS keyframe approach:
```css
.win95-window.opening  → @keyframes w95-zoom-in  (scale 0.06→1, opacity 0→1, 200ms)
.win95-window.closing  → @keyframes w95-zoom-out (scale 1→0.06, opacity 1→0, 200ms)
.win95-window.minimizing → same as closing but transform-origin toward taskbar
```

`--from-x` / `--from-y` CSS vars set to icon position so zoom originates from the icon, not window centre.

**Taskbar chip restore** — replays `opening` animation but with `openFrom` pointing at the chip's screen position (zooms up from taskbar).

### 3.4 Physics drag with inertia

```ts
// onMouseDown on titlebar:
const sx = e.clientX, sy = e.clientY;
const ox = w.x, oy = w.y;
const samples: { t: number; x: number; y: number }[] = [];
// push initial sample; ring buffer max 6 samples

// onMouseMove:
samples.push({ t: performance.now(), x: nx, y: ny });
if (samples.length > 6) samples.shift();

// onMouseUp:
// find last sample that's <80ms old (stable velocity window)
const ref = samples.find(s => last.t - s.t < 80) || samples[0];
const dt = Math.max(1, last.t - ref.t);
let vx = (last.x - ref.x) / dt * 1000;  // px/sec
let vy = (last.y - ref.y) / dt * 1000;

// clamp to VMAX=1800 px/sec
// RAF decay loop:
vx *= Math.pow(0.92, dt_seconds * 60);   // 0.92 per frame at 60fps
// stops when Math.hypot(vx,vy) < 12
```

**Position clamps** during both drag and inertia:
```ts
nx = Math.max(-200, Math.min(containerSize.w - 80, ox + dx));
ny = Math.max(0,    Math.min(containerSize.h - 60, oy + dy));
// Allows -200px off left (partial drag-off) but prevents losing the titlebar
```

### 3.5 8-edge resize system

**Edge classification flags:**
```ts
const touchTop   = edge === 'n' || edge === 'ne' || edge === 'nw';
const touchBot   = edge === 's' || edge === 'se' || edge === 'sw';
const touchLeft  = edge === 'w' || edge === 'nw' || edge === 'sw';
const touchRight = edge === 'e' || edge === 'ne' || edge === 'se';
```

**Resize math:**
```ts
// RIGHT/BOTTOM: grow width/height by delta
if (touchRight) nw = Math.max(MIN_W, ow + dx);
if (touchBot)   nh = Math.max(MIN_H, oh + dy);
// LEFT/TOP: shrink AND translate origin
if (touchLeft)  { const proposed = ow - dx; nw = Math.max(MIN_W, proposed); nx = ox + (ow - nw); }
if (touchTop)   { const proposed = oh - dy; nh = Math.max(MIN_H, proposed); ny = oy + (oh - nh); }
```

The origin-translation for top/left edges means: if the user hits the MIN floor, the window stops and doesn't jump. The clamped `nw = MIN_W` → `nx = ox + (ow - MIN_W)` keeps the right/bottom edge fixed.

**CSS hit zones** (position relative to `.win95-window`):
```css
.win95-resize-edge.n  { top: -4px;    left: 6px;   right: 6px;   height: 8px; }
.win95-resize-edge.ne { top: -4px;    right: -4px;  width: 12px; height: 12px; }
/* ... etc. Corners are 12×12, edges are 8px thick */
```

The 6px `left`/`right` inset on cardinal edges lets the 12px corner hit zones overlap without conflict.

### 3.6 Keyboard shortcuts

All handled in a single `useEffect` on `window.addEventListener('keydown')`:

```
Alt+Tab      → cycle visible windows (highest zIndex first); Shift reverses
Escape       → (1) close Start menu, (2) close ctx menu, (3) close focused window
               (skipped if focus is inside an INPUT/TEXTAREA/contentEditable)
F11          → toggleMaximize(focusedId)
⌘/Ctrl+W     → closeApp(focusedId)
⌘/Ctrl+Q     → onClose() (return to 3D scene)
```

**Critical:** `focusedId` is computed **inline** from `wins` at call time, not from a separate state variable. This avoids the TypeScript "used before declaration" error and keeps it in sync with the current wins array.

**Dependency array:** `[wins, startOpen, ctxMenu, focusApp, closeApp, toggleMaximize, onClose]` — all the state and callbacks the handler touches.

### 3.7 Sound system

**Single shared `AudioContext`** (module-level `_uiAc`), lazy-created on first call, resumed if suspended.

**6 click variants** (type `ClickVariant`):
```ts
const CLICK_PROFILES: Record<ClickVariant, ClickProfile> = {
  default:  { durDown: 0.022, freqDown: 1800, gainDown: 0.22, ... },
  close:    { durDown: 0.018, freqDown: 2600, gainDown: 0.28, ... },  // sharper/brighter
  soft:     { durDown: 0.028, freqDown: 1100, gainDown: 0.18, ... },  // mellower
  tap:      { durDown: 0.016, freqDown: 2100, gainDown: 0.16, ... },  // icons
  menu:     { durDown: 0.020, freqDown: 1400, gainDown: 0.20, ... },  // start menu
  titlebtn: { durDown: 0.020, freqDown: 2000, gainDown: 0.20, ... },  // _/□/✕
};
```

Each click: white noise shaped by `exp(-i / (samples * decay))` → bandpass filter at `freqDown/Up` → gain node → destination. Total graph: `BufferSource → BiquadFilter(bandpass) → Gain → destination`.

Gain multiplied by `getUiVolume()` so global volume applies.

**Window open ding** (`playWindowOpenDing`):
```ts
// Two tones: B5 (988Hz) at t=0, E6 (1318Hz) at t=0.06s
// Each: sine oscillator → gain with ADSR (instant attack, exponential decay)
// ADSR: setValueAtTime(0.0001) → exponentialRampToValueAtTime(peak, t+0.005) → ramp to 0.0001
```

### 3.8 Volume tray

`VolumeTray` component renders: speaker icon button (click = mute toggle) + `<input type="range">`.

**State:**
- `vol` (local React state, initialised from `getUiVolume()`)
- `lastNonZeroRef` (tracks last non-zero volume for unmute restore)

**`pg-volume` custom event** — both directions:
- `setUiVolume(v)` dispatches it (when slider moves)
- `VolumeTray` listens for it (so external changes like Office.tsx audio sync update the slider)

**Persistence:** `localStorage.getItem/setItem('pg_volume_v1')` (0..1 float string).

### 3.9 CSS injection strategy

All Win95 CSS lives in `WIN95_STYLE` (a template literal string at the top of the file). It's injected once into `<head>` via `useEffect`:

```ts
useEffect(() => {
  const id = 'win95-styles';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id; s.textContent = WIN95_STYLE;
    document.head.appendChild(s);
  }
  // also injects Google Fonts link for Cormorant Garamond
}, []);
```

This avoids duplicate injection on React StrictMode double-mounts and survives HMR.

---

## 4. Embed mode & iframe routing

### 4.1 Win95Layout embed bootstrap

An inline `<script>` at the bottom of `Win95Layout.astro` body runs on every page load:

```js
var inIframe = window.top !== window;
var hasEmbed = /[?&]embed=1\b/.test(location.search);
if (!inIframe && !hasEmbed) return;
document.body.classList.add('w95-embed-body');
```

`w95-embed-body` CSS hides all chrome (`.w95-titlebar`, `.w95-menubar`, `.w95-statusbar`, `.w95-taskbar`) and removes box-shadows. The page renders as just the content.

### 4.2 pg-nav message protocol

Still in the same bootstrap script — a capture-phase click listener:

```js
document.addEventListener('click', function (e) {
  var a = e.target.closest('a');
  if (!a) return;
  var href = a.getAttribute('href') || '';
  var isExternal = a.target === '_blank' || /^https?:|^mailto:|^tel:/i.test(href);
  if (!href || isExternal) return;
  if (href.indexOf('/') !== 0) return;   // must be absolute path
  e.preventDefault();
  window.parent.postMessage({ type: 'pg-nav', href }, '*');
}, true);  // capture so it fires before link default
```

**Why capture phase:** prevents `<a>` default navigation before our handler runs. The `true` flag is critical.

### 4.3 Sub-path routing with findAppForPath

```ts
function findAppForPath(href: string): AppDef | null {
  const path = href.split(/[?#]/)[0];  // strip query + hash
  // 1. Exact match
  if (APP_BY_PATH[path]) return APP_BY_PATH[path];
  // 2. Longest prefix (skip '/' to avoid matching everything)
  let best: AppDef | null = null;
  for (const app of APPS) {
    if (app.path === '/') continue;
    if (path === app.path || path.startsWith(app.path + '/')) {
      if (!best || app.path.length > best.path.length) best = app;
    }
  }
  return best;
}
```

**`openApp` call from pg-nav:**
```ts
const overridePath = href !== app.path ? href : undefined;
openApp(app.id, undefined, overridePath);
```

If `overridePath` is set, `OpenWin.path` stores it and the iframe `key` prop forces a reload:
```tsx
<iframe
  key={w.path || app.path}   // changing key = React unmounts + remounts = fresh load
  src={(w.path || app.path) + '?embed=1'}
```

---

## 5. Win95Layout.astro structure

### 5.1 Cmd+K palette

**Build-time:** `paletteIndex` is constructed at Astro build time:
```ts
const paletteIndex = [
  ...navItems.filter(n => n.id !== 'home').map(n => ({ type:'page', url:n.href, ... })),
  ...papers.map(p => ({ type:'paper', url:`/research/${p.slug}`, haystack: `${p.title} ${p.coauthors}...` })),
  ...talks.map(t => ({ type:'talk', url: t.url || '/talks', ... })),
];
```

Passed to the client via `define:vars={{ paletteIndex }}` — Astro inlines it as a `const`.

**Client-side:**
- `⌘K` or `Ctrl+K` toggles backdrop (`cmdk-backdrop.open` class)
- Input filters `paletteIndex` by `haystack.indexOf(query)`
- Arrow keys move `active` index
- Enter navigates to `filtered[active].url` (external → `_blank`, internal → `location.href`)

### 5.2 Dark mode

```js
// Boot: apply before paint to prevent FOUC
var saved = localStorage.getItem('pg_theme');
if (saved === 'dark') document.documentElement.classList.add('dark');
```

Dark overrides are scoped to `html.dark .w95-body` and `html.dark .cmdk-*` via global CSS in the `<style>` block. The body content itself picks up `background-color: #1f1d1a` and `color: #e8e3d3`.

---

## 6. Data flow diagram

```
User                 Office.tsx              InnerDesktop.tsx          Win95Layout.astro
  │                      │                         │                         │
  ├─click CRT────────────►│                         │                         │
  │            phase→dollying                       │                         │
  │            phase→on-monitor                     │                         │
  │            phase→booting                        │                         │
  │            phase→desktop────────────────────────►│                         │
  │                      │          mounts InnerDesktop (embedded=true)        │
  │                      │                         │                         │
  │                      │◄─────pg-volume event────│ (volume slider moves)   │
  │                      │  StudyAudio adjusts gain │                         │
  │                      │                         │                         │
  │                InnerDesktop renders iframe─────────────────────────────────►│
  │                      │                         │    Win95Layout renders   │
  │                      │                         │    with ?embed=1         │
  │                      │                         │                         │
  │  click link in iframe────────────────────────────────────────────────────►│
  │                      │                         │◄────pg-nav postMessage───│
  │                      │                  findAppForPath(href)              │
  │                      │                  openApp(app.id, path)             │
  │                      │                  iframe.key changes → reload       │
```

---

## 7. Performance notes

**Why no `useMemo` abuse:** The 3D geometries that ARE memoized (`wedgeBody`, `cofferGeo`, `panelGeo`, `slabGeo`) are expensive to construct (manual vertex arrays, `computeVertexNormals`). Everything else (standard geometries) Three.js caches internally.

**`meshStandardMaterial` sharing:** `StationLite` pre-builds `matMetalDark`, `matChrome`, `matWheel`, `matRubber` with `useMemo` so 4 stations × 5 spokes × 2 wheels don't allocate 40 materials.

**`ContactShadows`** bakes a shadow texture onto the floor; no real-time shadow maps per mesh needed (except `castShadow: true` hints on high-priority geometry for quality).

**`EffectComposer` (N8AO + Bloom):** Post-processing is the most expensive thing on GPU. N8AO gives ambient occlusion in screen-space. Bloom makes the CRT and emissive ceiling panels glow. Both are cheap compared to geometry count because the scene is primitive-heavy, not vertex-heavy.

**InnerDesktop RAF management:** Each window has its own `inertiaRafRef.current[id]` handle. On unmount / new drag start, the old RAF is cancelled. This prevents multiple decay loops accumulating for the same window.

**`ResizeObserver` on container:** `containerSize` state updates when the CRT overlay resizes (e.g. window resize while in desktop mode). This keeps window cascade defaults and position clamps accurate without polling.

**iframe performance:** iframes are React-keyed by `w.path || app.path`. Changing the path changes the key, which forces React to unmount + remount the iframe (a fresh navigation). This is intentional — it ensures the embedded page reloads to the new sub-path — but it means a brief blank while the new page loads.
