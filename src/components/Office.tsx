/**
 * Office.tsx — 1970s/80s institutional office scene.
 *
 * Aesthetic reference: a large, empty corporate office with sage-green
 * carpet, white panelled walls, diamond-grid fluorescent ceiling, and
 * a white modular desk + CRT monitor set centrally. The camera starts
 * at the entrance and dollies through the empty space toward the screen.
 *
 * Phase machine, audio, and overlays identical to Study.tsx.
 * Only the Scene geometry and camera positions change.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, ContactShadows, MeshReflectorMaterial, Environment, RoundedBox, useTexture } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import InnerDesktop from './InnerDesktop';

/* ---------- shared UI audio helpers ---------------------------------- */
// Mechanical click + keyboard typing sounds, synthesised inline so we
// don't need any audio files. Shared AudioContext (created lazily on
// the first call) so it gets unlocked by the same user gesture as the
// main ambient audio.
let _uiAc: AudioContext | null = null;
function getUiAc(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_uiAc) {
    try { _uiAc = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); }
    catch { return null; }
  }
  if (_uiAc.state === 'suspended') _uiAc.resume();
  return _uiAc;
}
function playUiClick(type: 'down' | 'up' = 'down') {
  const ac = getUiAc(); if (!ac) return;
  const now    = ac.currentTime;
  const durS   = type === 'down' ? 0.024 : 0.016;
  const bpFreq = type === 'down' ? 1800 : 3200;
  const gain   = type === 'down' ? 0.22 : 0.16;
  const n      = Math.floor(ac.sampleRate * durS);
  const buf    = ac.createBuffer(1, n, ac.sampleRate);
  const d      = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25));
  const src = ac.createBufferSource(); src.buffer = buf;
  const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = bpFreq; bpf.Q.value = 0.7;
  const g   = ac.createGain(); g.gain.value = gain;
  src.connect(bpf); bpf.connect(g); g.connect(ac.destination); src.start(now);
}
// Softer, slightly varied keystroke for typewriter HUD.
function playKeystroke() {
  const ac = getUiAc(); if (!ac) return;
  const now    = ac.currentTime;
  const durS   = 0.013 + Math.random() * 0.006;
  const bpFreq = 2200 + Math.random() * 900;
  const gain   = 0.085 + Math.random() * 0.025;
  const n      = Math.floor(ac.sampleRate * durS);
  const buf    = ac.createBuffer(1, n, ac.sampleRate);
  const d      = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.2));
  const src = ac.createBufferSource(); src.buffer = buf;
  const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = bpFreq; bpf.Q.value = 0.85;
  const g   = ac.createGain(); g.gain.value = gain;
  src.connect(bpf); bpf.connect(g); g.connect(ac.destination); src.start(now);
}

/* ---------- phase type ------------------------------------------------ */
type Phase = 'splash' | 'entering' | 'idle' | 'dollying' | 'on-monitor' | 'booting' | 'desktop';

/* ---------- room constants ------------------------------------------- */
const ROOM_W = 36;
const ROOM_D = 46;
const ROOM_H = 4.5;

/* ---------- palette --------------------------------------------------- */
const C = {
  carpet:    '#88AB7E',
  wall:      '#F2F0EC',
  ceiling:   '#D2D4D6',
  desk:      '#E4E2DC',
  deskLeg:   '#DDDBD6',
  partition: '#3D5C44',
  chair:     '#1C1C1C',
  chairMetal:'#3A3A3A',
  monitor:   '#C8C4BC',
  monitorScreen: '#3A5040',
  clock:     '#F4F2EE',
  door:      '#DCDAD6',
};

/* ---------- camera rig constants ------------------------------------- */
const ENTRY_MS = 2400;
const DOLLY_MS = 2200;
function easeOutExpo(t: number) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

// Desk and monitor sit at centre of the room (z=0 in room-depth terms,
// which in world coords is z = -4.5 when the camera enters from z ≈ +13)
const DESK_Z         = -4.5;
// Symmetric 4-station layout: all 4 booths share identical StationLite
// geometry. The active station (SOUTH) puts its monitor on the desk at
// the same local position as the lite stations (local 0.1, 1.05, -0.35),
// so MONITOR_WORLD reflects that.
const MONITOR_WORLD  = new THREE.Vector3(0.10, 1.05, DESK_Z - 0.35);   // (0.10, 1.05, -4.85)

// IDLE wide view — empty-office atmosphere (reference 3) where the
// 4-booth cubicle cross (reference 4) sits prominently in the frame
// surrounded by empty floor. Elevated, slightly off-centre.
// Idle: cinematic 3/4 wide. Workstation small in frame, empty room
// dominates. Camera pulled back + slightly elevated for atmosphere.
// Closer + lower + horizontal-ish view → workstation larger in frame,
// less floor visible, walls + ceiling more balanced (matches reference)
// Centred camera so the workstation sits dead-centre horizontally
const CAM_ENTRY_POS  = new THREE.Vector3(0.10, 2.0, 6.0);
const CAM_ENTRY_TGT  = new THREE.Vector3(0.10, 1.10, -5.0);
const CAM_IDLE_POS   = new THREE.Vector3(0.10, 1.7, 3.8);
const CAM_IDLE_TGT   = new THREE.Vector3(0.10, 1.10, -5.0);
// Camera ends VERY close to the monitor face — ~0.3 m from the screen.
// At FOV 58° this makes the monitor screen fill roughly 66%×78% of the
// viewport, so the bezel reads as a frame around the inner site (Heffer
// pattern). Camera is dead-centred on the monitor so the screen always
// projects to viewport center.
const CAM_MONITOR_POS = new THREE.Vector3(0.10, 1.05, DESK_Z + 0.20);   // (0.10, 1.05, -4.30)
const CAM_MONITOR_TGT = MONITOR_WORLD.clone();

// Lean-in close-up frame — looks STEEPLY DOWN at the desk so the chair
// back tucks into the bottom-foreground (not blocking the keyboard +
// monitor). Camera is high enough that the chair-top is well below
// the target line.
const CAM_LEAN_POS   = new THREE.Vector3(0.10, 2.45, -1.60);
const CAM_LEAN_TGT   = new THREE.Vector3(0.10, 0.78, -4.65);

/* ---------- CRT screen shader — pronounced scanlines + faux ASCII ---- */
const CRT_FRAG = `
  uniform vec3  uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  float hash1(float x){ return fract(sin(x * 12.9898) * 43758.5453); }
  float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    // CRT vignette + slight pincushion-like darkening
    vec2 cv = uv - 0.5;
    float vig = 1.0 - smoothstep(0.06, 0.66, length(cv));
    vig = mix(0.35, 1.0, vig);
    // strong horizontal scanlines (visible at any distance)
    float scan = 0.5 + 0.5 * sin(uv.y * 160.0);
    scan = mix(0.45, 1.10, scan);
    // ROLLING SCANLINE — classic CRT artifact, a brighter band that
    // drifts slowly down the screen. Periodic in y.
    float rollY = mod(uv.y - uTime * 0.18, 1.0);
    float rollBand = exp(-pow((rollY - 0.5) * 6.0, 2.0)) * 0.20;
    // terminal rows — 14 rows of "text"
    float NROWS = 14.0;
    float row = floor(uv.y * NROWS);
    float rowSeed = hash1(row);
    // some rows are blank (empty lines between paragraphs)
    float rowActive = step(0.18, rowSeed);
    // row content width — varies per row
    float rowWidth = 0.10 + rowSeed * 0.76;
    float inLeftMargin = step(0.06, uv.x);
    float inRow = step(uv.x, rowWidth) * inLeftMargin * rowActive;
    // ASCII-character cells — divide each row into ~52 character cells
    float charX = floor(uv.x * 52.0);
    float charSeed = hash2(vec2(charX, row));
    // most cells are filled (~75%), some empty (spaces)
    float charBright = step(0.25, charSeed);
    // dim some characters to fake variation in glyph density
    float charLevel = mix(0.45, 1.0, hash2(vec2(charX + 0.3, row)));
    float content = inRow * charBright * charLevel;
    // blinking cursor on bottom-active row
    float cursorRow = NROWS - 2.0;
    float onCursorRow = step(cursorRow - 0.5, row) * step(row, cursorRow + 0.5);
    float cursorX = step(0.06, uv.x) * step(uv.x, 0.085);
    float cursorBlink = step(0.5, fract(uTime * 0.8));
    float cursor = onCursorRow * cursorX * cursorBlink;
    // slow flicker
    float flicker = 0.93 + 0.07 * sin(uTime * 6.0 + hash1(floor(uTime * 30.0)) * 5.0);
    // SLOW BREATHING — subtle 6-second sine to make the CRT feel alive
    float breath = 0.94 + 0.06 * sin(uTime * 1.05);
    // combine
    vec3 col = uColor * scan * vig * (0.30 + content * 0.95) * flicker * breath;
    col += uColor * cursor * 0.85;
    col += uColor * rollBand;          // the rolling scanline band
    gl_FragColor = vec4(col * uIntensity, 1.0);
  }
`;

/* ---------- 3-D coffered ceiling -------------------------------------
 * Inverted-square-frustum coffers carved up into a slab with matching
 * diamond-shaped holes punched out. From the floor you look up through
 * the holes into recessed cells with bright fluorescent panels at the
 * back — geometric depth, not a shader trick.
 *
 *           panel  <-- emissive plane at COFFER_DEPTH
 *          /     \
 *         /       \ <-- sloped walls (inverted frustum)
 *        /         \
 *  -----+           +-----  <-- slab with diamond hole
 *  (opening)
 */
function CofferedCeiling() {
  const SPACING      = 3.0;     // grid spacing of coffer centres
  const HOLE_HALF    = 1.05;    // opening diamond half-diagonal
  const PANEL_HALF   = 0.55;    // recessed panel half-diagonal
  const COFFER_DEPTH = 0.45;    // how far up the recess extends

  // 1) coffer positions on a regular grid (inset half-spacing from walls)
  const positions = useMemo(() => {
    const arr: [number, number][] = [];
    const halfW = ROOM_W / 2 - SPACING / 2;
    const halfD = ROOM_D / 2 - SPACING / 2;
    for (let x = -halfW; x <= halfW + 0.001; x += SPACING) {
      for (let z = -halfD; z <= halfD + 0.001; z += SPACING) {
        arr.push([x, z]);
      }
    }
    return arr;
  }, []);

  // 2) slab geometry — outer rect minus a diamond hole per coffer
  const slabGeo = useMemo(() => {
    const w = ROOM_W / 2 + 0.5;
    const d = ROOM_D / 2 + 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-w, -d);
    shape.lineTo( w, -d);
    shape.lineTo( w,  d);
    shape.lineTo(-w,  d);
    shape.lineTo(-w, -d);
    for (const [x, z] of positions) {
      const hole = new THREE.Path();
      hole.moveTo(x - HOLE_HALF, z);
      hole.lineTo(x,             z + HOLE_HALF);
      hole.lineTo(x + HOLE_HALF, z);
      hole.lineTo(x,             z - HOLE_HALF);
      hole.lineTo(x - HOLE_HALF, z);
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, [positions]);

  // 3) ONE coffer wall geometry (inverted frustum) — shared across all
  const cofferGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      // opening diamond at y=0
      -HOLE_HALF, 0, 0,                       // 0: west
       0,         0,  HOLE_HALF,              // 1: south
       HOLE_HALF, 0, 0,                       // 2: east
       0,         0, -HOLE_HALF,              // 3: north
      // panel diamond at y=COFFER_DEPTH
      -PANEL_HALF, COFFER_DEPTH, 0,           // 4
       0,          COFFER_DEPTH,  PANEL_HALF, // 5
       PANEL_HALF, COFFER_DEPTH, 0,           // 6
       0,          COFFER_DEPTH, -PANEL_HALF, // 7
    ]);
    const idx = [
      0, 1, 4,  1, 5, 4,   // SW wall
      1, 2, 5,  2, 6, 5,   // SE wall
      2, 3, 6,  3, 7, 6,   // NE wall
      3, 0, 7,  0, 4, 7,   // NW wall
    ];
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  // 4) panel geometry — diamond plane at back of recess (emissive)
  const panelGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      -PANEL_HALF, 0, 0,           // west
       0,         0,  PANEL_HALF,  // south
       PANEL_HALF, 0, 0,           // east
       0,         0, -PANEL_HALF,  // north
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setIndex([0, 2, 1,  0, 3, 2]);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group>
      {/* Slab with diamond holes — pale grey to match the reference */}
      <mesh rotation-x={Math.PI / 2} position={[0, ROOM_H, 0]}>
        <primitive object={slabGeo} attach="geometry" />
        <meshStandardMaterial color="#C8CACC" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Coffer walls + emissive panels — one per hole */}
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, ROOM_H, z]}>
          <mesh>
            <primitive object={cofferGeo} attach="geometry" />
            <meshStandardMaterial color="#E4E6E8" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, COFFER_DEPTH - 0.005, 0]}>
            <primitive object={panelGeo} attach="geometry" />
            <meshStandardMaterial
              color="#F8FAFC"
              emissive="#FFFFFF"
              emissiveIntensity={0.95}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- wall panel-seam shader ----------------------------------- */
// Thin vertical lines + occasional horizontal at standard panel heights,
// approximating the modular wall panels in the reference image.
const WALL_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WALL_FRAG = `
  uniform float uSeams;
  uniform vec3 uWall;
  uniform vec3 uSeam;
  varying vec2 vUv;
  void main() {
    // vertical seams
    float x = vUv.x * uSeams;
    float dV = abs(fract(x) - 0.5) * 2.0;
    float seamV = smoothstep(0.965, 0.992, dV);
    // single horizontal at ~2.4m (top trim) on a 3.8m wall ~= 0.63
    float y = vUv.y;
    float dH = abs(y - 0.63);
    float seamH = 1.0 - smoothstep(0.002, 0.006, dH);
    float seam = max(seamV, seamH * 0.55);
    vec3 col = mix(uWall, uSeam, seam);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------- carpet noise shader (subtle weave + vacuum tracks) ------ */
const CARPET_FRAG = `
  uniform vec3 uBase;
  uniform vec2 uRes;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vUv * uRes;
    // 1) fine pixel noise (~weave grain)
    float n1 = (hash(floor(p)) - 0.5) * 0.045;
    // 2) coarser blotches (mild wear pattern)
    float n2 = (hash(floor(p * 0.08)) - 0.5) * 0.025;
    // 3) vacuum tracks — slow horizontal sinusoidal lightening,
    //    with a per-band random offset so the streaks read as
    //    directional carpet sweep marks
    float bandIdx = floor(vUv.y * 18.0);
    float bandRand = hash(vec2(bandIdx, 7.0));
    float band = sin(vUv.x * 9.0 + bandRand * 6.28) * 0.5 + 0.5;
    float track = (band - 0.5) * 0.022;
    vec3 col = uBase + vec3(n1 + n2 + track);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------- camera rig ----------------------------------------------- */
/**
 * Projects the CRT screen plane into viewport pixels every frame and
 * writes the bounding rect to CSS variables on <html>. The embedded
 * InnerDesktop overlay reads these vars so it sits EXACTLY inside the
 * CRT bezel — instead of an arbitrary 66vw × 78vh box that overflows.
 *
 * Why every frame: the camera dollies smoothly, so the screen rect is
 * animated through several seconds; we want the overlay to slot in only
 * once the camera arrives. We still update during idle (the screen is
 * tiny then, so the overlay isn't shown anyway) — cheap enough.
 */
function CrtScreenProjector() {
  const { camera, size } = useThree();
  // Screen plane lives at MONITOR_WORLD + local offset [0, 0.02, 0.207],
  // size 0.34 × 0.26 (see CrtMonitor). Four corners in world space:
  const corners = useMemo(() => {
    const cx = MONITOR_WORLD.x, cy = MONITOR_WORLD.y + 0.02, cz = MONITOR_WORLD.z + 0.207;
    const hw = 0.17, hh = 0.13;
    return [
      new THREE.Vector3(cx - hw, cy - hh, cz),
      new THREE.Vector3(cx + hw, cy - hh, cz),
      new THREE.Vector3(cx - hw, cy + hh, cz),
      new THREE.Vector3(cx + hw, cy + hh, cz),
    ];
  }, []);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
      v.copy(c).project(camera);
      const px = (v.x + 1) * 0.5 * size.width;
      const py = (1 - v.y) * 0.5 * size.height;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const root = document.documentElement.style;
    root.setProperty('--crt-left', `${minX}px`);
    root.setProperty('--crt-top',  `${minY}px`);
    root.setProperty('--crt-w',    `${maxX - minX}px`);
    root.setProperty('--crt-h',    `${maxY - minY}px`);
  });
  return null;
}

function CameraRig({ phase, onArrived, onEntryDone }: {
  phase: Phase; onArrived: () => void; onEntryDone: () => void;
}) {
  const { camera, size } = useThree();
  const mouse  = useRef({ x: 0, y: 0 });
  const tgt    = useRef(CAM_ENTRY_TGT.clone());
  const fromPos = useRef(CAM_IDLE_POS.clone());
  const fromTgt = useRef(CAM_IDLE_TGT.clone());
  const startedAt       = useRef<number | null>(null);
  const entryStartTime  = useRef<number | null>(null);
  const arrivedFired    = useRef(false);
  const entryFired      = useRef(false);
  const idlePos = useRef(CAM_IDLE_POS.clone());
  const idleTgt = useRef(CAM_IDLE_TGT.clone());

  // widen FOV slightly on landscape monitors — office is a wide room
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.fov = aspect < 0.75 ? 48 : aspect < 1.2 ? 52 : 54;
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useEffect(() => {
    if (phase === 'entering') { entryStartTime.current = null; entryFired.current = false; }
    if (phase === 'dollying') {
      startedAt.current = performance.now();
      fromPos.current.copy(camera.position);
      fromTgt.current.copy(tgt.current);
      arrivedFired.current = false;
    }
  }, [phase, camera]);

  useEffect(() => {
    const mv = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const lv = () => { mouse.current.x = 0; mouse.current.y = 0; };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerleave', lv);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerleave', lv); };
  }, []);

  useFrame((state) => {
    // ── entry ─────────────────────────────────────────────────────────────
    if (phase === 'entering') {
      if (entryStartTime.current === null) {
        entryStartTime.current = performance.now();
        camera.position.copy(CAM_ENTRY_POS);
        tgt.current.copy(CAM_ENTRY_TGT);
      }
      const k = easeOutExpo(Math.min(1, (performance.now() - entryStartTime.current) / ENTRY_MS));
      camera.position.lerpVectors(CAM_ENTRY_POS, idlePos.current, k);
      tgt.current.lerpVectors(CAM_ENTRY_TGT, idleTgt.current, k);
      camera.lookAt(tgt.current);
      if (!entryFired.current && k >= 0.99) { entryFired.current = true; onEntryDone(); }
      return;
    }
    // ── dolly ──────────────────────────────────────────────────────────────
    if (phase === 'dollying') {
      const k = easeOutCubic(Math.min(1, (performance.now() - (startedAt.current ?? 0)) / DOLLY_MS));
      camera.position.lerpVectors(fromPos.current, CAM_MONITOR_POS, k);
      tgt.current.lerpVectors(fromTgt.current, CAM_MONITOR_TGT, k);
      camera.lookAt(tgt.current);
      if (!arrivedFired.current && k >= 1) { arrivedFired.current = true; onArrived(); }
      return;
    }
    // ── on-monitor / booting / desktop ─────────────────────────────────────
    if (phase === 'on-monitor' || phase === 'booting' || phase === 'desktop') {
      camera.position.lerp(CAM_MONITOR_POS, 0.08);
      tgt.current.lerp(CAM_MONITOR_TGT, 0.08);
      camera.lookAt(tgt.current);
      return;
    }
    // ── idle: parallax + LEAN-IN on cursor approach ──────────────────────
    // Strategy: when cursor moves into the lower-centre of the viewport
    // (where the workstation lives) the camera smoothly transitions from
    // CAM_IDLE_POS (wide doorway view) to CAM_LEAN_POS (close-up of
    // keyboard + monitor). When cursor moves back up/out, it pulls back.
    //
    // Trigger is screen-space (not world-space) on purpose — using world
    // proximity would create a feedback loop: camera leans in → ws moves
    // on screen → cursor no longer near ws → camera pulls back. Screen
    // position is stable through the transition.
    const mx = mouse.current.x, my = mouse.current.y;
    // yLean: 0 at mouse.y=0 (centre), 1 at mouse.y>=0.5 (lower half)
    // xCentre: 1 when |mx|<small, fades to 0 by |mx|=0.85
    const yLean   = Math.max(0, Math.min(1, my / 0.5));
    const xCentre = 1 - Math.min(1, Math.abs(mx) / 0.85);
    const leanK   = Math.pow(yLean * xCentre, 1.15);   // 0…1 — eased
    // sine drift so it never feels static
    const ms = state.clock.elapsedTime * 1000;
    const driftX = Math.sin((ms + 19000) * 0.00007) * 0.18;
    const driftY = Math.sin((ms +  1000) * 0.000003) * 0.06;
    // interpolate IDLE ↔ LEAN positions / targets by leanK
    const basePosX = idlePos.current.x * (1 - leanK) + CAM_LEAN_POS.x * leanK;
    const basePosY = idlePos.current.y * (1 - leanK) + CAM_LEAN_POS.y * leanK;
    const basePosZ = idlePos.current.z * (1 - leanK) + CAM_LEAN_POS.z * leanK;
    const baseTgtX = idleTgt.current.x * (1 - leanK) + CAM_LEAN_TGT.x * leanK;
    const baseTgtY = idleTgt.current.y * (1 - leanK) + CAM_LEAN_TGT.y * leanK;
    const baseTgtZ = idleTgt.current.z * (1 - leanK) + CAM_LEAN_TGT.z * leanK;
    // parallax — dialed down during lean so the cursor doesn't fight the
    // smooth lean-in transition
    const parallaxScale = 1 - leanK * 0.55;
    const wx = basePosX + driftX - mx * 0.34 * parallaxScale;
    const wy = basePosY + driftY + my * 0.20 * parallaxScale * (1 - leanK * 0.8);
    const wz = basePosZ;
    // smooth lerp toward target — slightly faster lerp during lean for
    // responsiveness, slower at idle for stillness
    const lerpK = 0.05 + leanK * 0.04;
    camera.position.x += (wx - camera.position.x) * lerpK;
    camera.position.y += (wy - camera.position.y) * lerpK;
    camera.position.z += (wz - camera.position.z) * lerpK;
    const tx = baseTgtX + mx * 0.11 * parallaxScale;
    const ty = baseTgtY - my * 0.06 * parallaxScale * (1 - leanK * 0.7);
    tgt.current.x += (tx - tgt.current.x) * (lerpK + 0.02);
    tgt.current.y += (ty - tgt.current.y) * (lerpK + 0.02);
    tgt.current.z += (baseTgtZ - tgt.current.z) * (lerpK + 0.02);
    camera.lookAt(tgt.current);
  });
  return null;
}

/* ---------- wall clock ----------------------------------------------- */
function WallClock({ pos }: { pos: [number, number, number] }) {
  const hrRef  = useRef<THREE.Mesh>(null);
  const minRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const now = new Date();
    const hr  = now.getHours() % 12 + now.getMinutes() / 60;
    const mn  = now.getMinutes() + now.getSeconds() / 60;
    if (hrRef.current)  hrRef.current.rotation.z  = -(hr / 12) * Math.PI * 2;
    if (minRef.current) minRef.current.rotation.z = -(mn / 60) * Math.PI * 2;
  });
  return (
    <group position={pos} rotation={[0, -Math.PI / 2, 0]}>
      {/* face — bigger (radius 0.40 → 0.55) so it reads from the
          new closer idle camera */}
      <mesh>
        <circleGeometry args={[0.55, 48]} />
        <meshStandardMaterial color={C.clock} roughness={0.7} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.52, 0.58, 48]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* 12 hour-marker ticks (proportionally larger) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const len = i % 3 === 0 ? 0.085 : 0.050;
        return (
          <mesh key={`tk-${i}`} position={[Math.sin(a) * 0.46, Math.cos(a) * 0.46, 0.009]} rotation={[0, 0, -a]}>
            <boxGeometry args={[0.016, len, 0.005]} />
            <meshStandardMaterial color="#1A1A1A" />
          </mesh>
        );
      })}
      {/* hour hand */}
      <mesh ref={hrRef} position={[0, 0.125, 0.012]}>
        <boxGeometry args={[0.040, 0.30, 0.007]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* minute hand */}
      <mesh ref={minRef} position={[0, 0.17, 0.016]}>
        <boxGeometry args={[0.026, 0.40, 0.006]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* centre dot */}
      <mesh position={[0, 0, 0.020]}>
        <circleGeometry args={[0.030, 16]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
    </group>
  );
}

/* ---------- smoke detector with periodic blinking LED --------------- */
function SmokeDetector({ x, z, phaseOffset }: { x: number; z: number; phaseOffset: number }) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!ledRef.current) return;
    // Blink red ~every 4 s for ~120 ms each (real smoke detector behaviour)
    const t = (state.clock.elapsedTime + phaseOffset) % 4.0;
    ledRef.current.emissiveIntensity = t < 0.12 ? 2.2 : 0.0;
  });
  return (
    <group position={[x, ROOM_H - 0.04, z]}>
      {/* round body */}
      <mesh rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.14, 18]} />
        <meshStandardMaterial color="#6A6C70" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* small red LED */}
      <mesh rotation-x={Math.PI / 2} position={[0.045, -0.002, 0]}>
        <circleGeometry args={[0.012, 10]} />
        <meshStandardMaterial ref={ledRef} color="#FF2020" emissive="#FF2020" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

/* ---------- power LED (slow pulse) ---------------------------------- */
function PowerLed({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!ref.current) return;
    // 1.6 Hz heartbeat-style pulse
    const t = state.clock.elapsedTime;
    ref.current.emissiveIntensity = 1.2 + Math.sin(t * 1.6) * 0.55;
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.009, 10, 8]} />
      <meshStandardMaterial ref={ref} color="#6BE08C" emissive="#6BE08C" emissiveIntensity={1.5} />
    </mesh>
  );
}

/* ---------- CRT monitor (click target) ------------------------------- */
function CrtMonitor({ phase, onClick }: { phase: Phase; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const clickable = phase === 'idle';
  // Subtle plastic micro-detail on the beige CRT shell — breaks up the
  // perfectly flat box read from idle distance. Reuses the same desk
  // normal map; very low scale so the texture stays barely perceptible.
  const plastic = useDeskNormalProps(3, 2);
  // CRT shader material — teal-blue terminal (matches the reference)
  const crtMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor:     { value: new THREE.Color('#6CB8E0') },
      uIntensity: { value: 1.2 },
      uTime:      { value: 0 },
    },
    vertexShader: WALL_VERT,
    fragmentShader: CRT_FRAG,
  }), []);
  useFrame((state) => {
    crtMat.uniforms.uTime.value      = state.clock.elapsedTime;
    // Bright phosphor pop visible from idle distance + dramatic hover.
    // The CRT acts as the visual anchor / focal point of the scene.
    crtMat.uniforms.uIntensity.value = clickable ? (hovered ? 2.6 : 1.85) : 0.12;
  });
  return (
    <group position={MONITOR_WORLD.toArray()}>
      {/* body — bevelled, subtle plastic micro-detail */}
      <RoundedBox args={[0.54, 0.46, 0.40]} radius={0.020} smoothness={4} castShadow>
        <meshStandardMaterial {...(plastic as any)} color={C.monitor} roughness={0.55} normalScale={[0.12, 0.12] as any} />
      </RoundedBox>
      {/* SIDE VENTS — thin horizontal slits on both sides (CRT cooling) */}
      {([-1, 1] as const).map((side) =>
        [0.10, 0.06, 0.02, -0.02, -0.06, -0.10].map((y, i) => (
          <mesh key={`vent-${side}-${i}`} position={[side * 0.272, y, 0]}>
            <boxGeometry args={[0.005, 0.012, 0.30]} />
            <meshStandardMaterial color="#7E7A72" roughness={0.6} />
          </mesh>
        ))
      )}
      {/* top vent grille */}
      {[0.10, 0.06, 0.02, -0.02, -0.06, -0.10].map((z, i) => (
        <mesh key={`tvent-${i}`} position={[0, 0.234, z]}>
          <boxGeometry args={[0.34, 0.005, 0.018]} />
          <meshStandardMaterial color="#7E7A72" roughness={0.6} />
        </mesh>
      ))}
      {/* front bezel indent */}
      <mesh position={[0, 0.01, 0.20]}>
        <boxGeometry args={[0.44, 0.36, 0.01]} />
        <meshStandardMaterial color="#B8B4AC" roughness={0.5} />
      </mesh>
      {/* power LED — tiny green dot below screen, pulses softly */}
      <PowerLed position={[0.16, -0.18, 0.21]} />
      {/* power button */}
      <mesh position={[0.20, -0.18, 0.21]}>
        <boxGeometry args={[0.03, 0.012, 0.005]} />
        <meshStandardMaterial color="#9E9A92" roughness={0.5} />
      </mesh>
      {/* screen — CRT shader + the actual click target */}
      <mesh
        position={[0, 0.02, 0.207]}
        onClick={clickable ? onClick : undefined}
        onPointerEnter={(e) => {
          if (clickable) { setHovered(true); document.body.style.cursor = 'pointer'; }
        }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <planeGeometry args={[0.34, 0.26]} />
        <primitive object={crtMat} attach="material" />
      </mesh>
      {/* subtle screen glow light — teal/blue to match the new CRT colour */}
      {clickable && (
        <pointLight
          position={[0, 0.02, 0.35]}
          intensity={hovered ? 1.0 : 0.5}
          distance={3.0}
          decay={2}
          color="#6CB8E0"
        />
      )}
      {/* neck */}
      <mesh position={[0, -0.30, 0.06]}>
        <boxGeometry args={[0.13, 0.13, 0.24]} />
        <meshStandardMaterial color="#C0BDB6" roughness={0.6} />
      </mesh>
      {/* base */}
      <mesh position={[0, -0.36, 0.06]}>
        <boxGeometry args={[0.30, 0.04, 0.26]} />
        <meshStandardMaterial color="#BEB9B2" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ---------- office chair (5-spoke base + wheels, padded seat/back) --- */
function OfficeChair({ pos }: { pos: [number, number, number] }) {
  const SPOKES = 5;
  const SPOKE_LEN = 0.34;
  const fabric = useChairFabricProps();
  return (
    <group position={pos}>
      {/* === BASE ASSEMBLY === */}
      {/* central hub */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.06, 16]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.35} metalness={0.55} />
      </mesh>
      {/* 5 spokes */}
      {Array.from({ length: SPOKES }).map((_, i) => {
        const a = (i / SPOKES) * Math.PI * 2;
        return (
          <group key={i} position={[0, 0.045, 0]} rotation={[0, a, 0]}>
            <mesh position={[SPOKE_LEN / 2, 0, 0]} castShadow>
              {/* slim spoke, narrows toward the tip */}
              <boxGeometry args={[SPOKE_LEN, 0.03, 0.06]} />
              <meshStandardMaterial color="#2D2D2D" roughness={0.4} metalness={0.5} />
            </mesh>
            {/* wheel/caster at spoke tip — small dark disc */}
            <mesh position={[SPOKE_LEN + 0.01, 0.005, 0]} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.038, 0.038, 0.045, 14]} />
              <meshStandardMaterial color="#0E0E0E" roughness={0.55} />
            </mesh>
          </group>
        );
      })}

      {/* === COLUMN === */}
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.034, 0.04, 0.42, 12]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.35} metalness={0.55} />
      </mesh>

      {/* === SEAT (black office chair) — bevelled + fabric normal === */}
      <RoundedBox args={[0.52, 0.08, 0.50]} radius={0.02} smoothness={3} position={[0, 0.49, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...(fabric as any)} color="#1A1A1A" roughness={0.78} normalScale={[0.40, 0.40] as any} />
      </RoundedBox>
      {/* seat highlight (rim) */}
      <mesh position={[0, 0.535, 0]}>
        <boxGeometry args={[0.48, 0.005, 0.46]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.75} />
      </mesh>

      {/* === BACKREST === */}
      {/* short arm connecting seat to back (dark metal) */}
      <mesh position={[0, 0.62, -0.22]} castShadow>
        <boxGeometry args={[0.05, 0.20, 0.05]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.45} />
      </mesh>
      {/* padded backrest — shorter low-back design (was 0.55 tall, center
          y=0.90 → top y≈1.18 which sat right in front of the CRT screen
          from the idle camera). Now height 0.34, center y=0.74 → top
          y=0.91, comfortably below the CRT screen bottom (y≈0.94). */}
      <RoundedBox args={[0.50, 0.34, 0.09]} radius={0.025} smoothness={3} position={[0, 0.74, -0.24]} castShadow>
        <meshStandardMaterial {...(fabric as any)} color="#1A1A1A" roughness={0.78} normalScale={[0.40, 0.40] as any} />
      </RoundedBox>

      {/* === ARMRESTS === */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* vertical post (dark metal) */}
          <mesh position={[side * 0.28, 0.60, -0.05]} castShadow>
            <boxGeometry args={[0.03, 0.22, 0.03]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.45} />
          </mesh>
          {/* horizontal arm pad — black */}
          <mesh position={[side * 0.28, 0.71, 0.02]} castShadow>
            <boxGeometry args={[0.06, 0.035, 0.30]} />
            <meshStandardMaterial color="#1C1C1C" roughness={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- coffee steam (rising wisps from mug) -------------------- */
function CoffeeSteam({ origin }: { origin: [number, number, number] }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 12;
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const seeds = useMemo(() => {
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) s[i] = Math.random();
    return s;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const cycle = (t * 0.35 + seeds[i]) % 1.0;   // 0..1 lifecycle
      // y rises from 0 to 0.35 over the cycle
      positions[i * 3]     = Math.sin(cycle * 6.0 + seeds[i] * 6.28) * 0.035 * cycle;
      positions[i * 3 + 1] = cycle * 0.40;
      positions[i * 3 + 2] = Math.cos(cycle * 5.5 + seeds[i] * 4.0) * 0.025 * cycle;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    // fade material by averaging lifecycle — peaks mid, fades at top
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.22;
  });
  return (
    <points ref={ref} position={origin}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#FFFFFF"
        sizeAttenuation
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </points>
  );
}

/* ---------- floating dust particles (atmosphere) -------------------- */
// Slow-drifting points scattered through the room volume. Catches the
// fluorescent light and gives the empty room a subtle "lived in" feel
// without distracting from the workstation focal point.
function DustParticles() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 90;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = 0.5 + Math.random() * 3.4;
      arr[i * 3 + 2] = -10 + (Math.random() - 0.5) * 24;
    }
    return arr;
  }, []);
  const seeds = useMemo(() => {
    const arr = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) arr[i] = Math.random() * 6.28;
    return arr;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      // gentle vertical bob + slow horizontal sway
      pos[i * 3 + 1] = 0.5 + ((seeds[i] + t * 0.08) % 3.4);
      pos[i * 3]    += Math.sin(t * 0.07 + seeds[i]) * 0.0008;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#FFFFFF"
        sizeAttenuation
        transparent
        opacity={0.25}
        depthWrite={false}
      />
    </points>
  );
}

/* ---------- "lite" workstation — used for the 3 inactive stations --
 * A single desk + pedestal + non-interactive CRT + chair + chair-mat.
 * Designed to be instanced inside a rotated group so the same code
 * renders the N/E/W stations in the cubicle cross.
 *
 * Local axes:
 *   • desk surface centred at local origin (y=0.74)
 *   • chair is at local +Z (so rotation determines which world direction
 *     the chair faces away to)
 *   • monitor sits at local -Z (against the partition arm)
 */
function StationLite({ active = false }: { active?: boolean } = {}) {
  const DESK_DZ = -0.06;
  const CHAIR_Z = 1.00;
  // Shared normal+roughness props (subtle micro-detail, no colour shift)
  const deskNormals  = useDeskNormalProps(2, 1.5);
  const chairFabric  = useChairFabricProps();
  return (
    <>
      {/* Desk surface — bevelled, subtle wood-grain normal */}
      <RoundedBox args={[1.55, 0.06, 1.30]} radius={0.015} smoothness={3} position={[0, 0.74, DESK_DZ]} castShadow receiveShadow>
        <meshStandardMaterial
          {...(deskNormals as any)}
          color={C.desk}
          roughness={0.42}
          metalness={0.02}
          normalScale={[0.18, 0.18] as any}
        />
      </RoundedBox>
      {/* Desk modesty panel — only spans the gap BETWEEN the two pedestals
          (pedestals are at x=±0.50, width 0.66 → inner edges at ±0.17).
          Recessed inward so the two pedestals visually pop out as separate
          boxy volumes from the wider idle camera. */}
      <mesh position={[0, 0.50, DESK_DZ + 0.50]}>
        <boxGeometry args={[0.34, 0.40, 0.03]} />
        <meshStandardMaterial {...(deskNormals as any)} color={C.deskLeg} roughness={0.55} normalScale={[0.15, 0.15] as any} />
      </mesh>
      {/* LEFT pedestal — bevelled, subtle normal */}
      <RoundedBox args={[0.66, 0.72, 1.20]} radius={0.015} smoothness={3} position={[-0.50, 0.36, DESK_DZ]} castShadow receiveShadow>
        <meshStandardMaterial {...(deskNormals as any)} color={C.deskLeg} roughness={0.5} normalScale={[0.20, 0.20] as any} />
      </RoundedBox>
      {/* LEFT drawer lines */}
      {[0.18, 0.42, 0.62].map((y, i) => (
        <mesh key={`lp-${i}`} position={[-0.50, y, DESK_DZ + 0.60]}>
          <boxGeometry args={[0.56, 0.005, 0.004]} />
          <meshStandardMaterial color="#A8A8A4" />
        </mesh>
      ))}
      {/* LEFT drawer pulls */}
      {[0.27, 0.50, 0.65].map((y, i) => (
        <mesh key={`lph-${i}`} position={[-0.50, y, DESK_DZ + 0.604]}>
          <boxGeometry args={[0.12, 0.018, 0.008]} />
          <meshStandardMaterial color="#C8C6C2" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {/* RIGHT pedestal — bevelled, mirror of left */}
      <RoundedBox args={[0.66, 0.72, 1.20]} radius={0.015} smoothness={3} position={[0.50, 0.36, DESK_DZ]} castShadow receiveShadow>
        <meshStandardMaterial {...(deskNormals as any)} color={C.deskLeg} roughness={0.5} normalScale={[0.20, 0.20] as any} />
      </RoundedBox>
      {/* RIGHT drawer lines */}
      {[0.18, 0.42, 0.62].map((y, i) => (
        <mesh key={`rp-${i}`} position={[0.50, y, DESK_DZ + 0.60]}>
          <boxGeometry args={[0.56, 0.005, 0.004]} />
          <meshStandardMaterial color="#A8A8A4" />
        </mesh>
      ))}
      {/* RIGHT drawer pulls */}
      {[0.27, 0.50, 0.65].map((y, i) => (
        <mesh key={`rph-${i}`} position={[0.50, y, DESK_DZ + 0.604]}>
          <boxGeometry args={[0.12, 0.018, 0.008]} />
          <meshStandardMaterial color="#C8C6C2" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {/* Inactive CRT — boxy beige body. SKIPPED on the active station;
          the parent renders an active CRT (with shader + click) instead. */}
      {!active && (
        <>
          <mesh position={[0.10, 1.04, DESK_DZ - 0.35]} castShadow>
            <boxGeometry args={[0.46, 0.40, 0.34]} />
            <meshStandardMaterial color={C.monitor} roughness={0.55} />
          </mesh>
          <mesh position={[0.10, 1.05, DESK_DZ - 0.18]}>
            <planeGeometry args={[0.30, 0.22]} />
            <meshStandardMaterial color="#1A2820" roughness={0.4} emissive="#0F1812" emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[0.10, 0.79, DESK_DZ - 0.35]}>
            <boxGeometry args={[0.26, 0.04, 0.22]} />
            <meshStandardMaterial color="#BEB9B2" roughness={0.5} />
          </mesh>
        </>
      )}
      {/* Office chair — rotated 180° so the seated USER faces the desk
          and monitor (toward local -Z). Tucked closer to the desk now. */}
      <group position={[0.05, 0, CHAIR_Z]} rotation-y={Math.PI}>
        <OfficeChair pos={[0, 0, 0]} />
      </group>
      {/* Chair mat under chair */}
      <mesh rotation-x={-Math.PI / 2} position={[0.05, 0.011, CHAIR_Z]}>
        <circleGeometry args={[0.62, 32]} />
        <meshStandardMaterial color="#1E2823" roughness={0.85} />
      </mesh>
    </>
  );
}

/* ---------- 1980s keyboard + numeric pad ----------------------------- */
function Keyboard({ pos }: { pos: [number, number, number] }) {
  // Main alphanumeric block + small numeric pad to the right
  const KEY_COLOR = '#5BA8B0';      // teal-blue like the references
  const KEY_DARK  = '#2F5961';
  // Generate a 4-row × 12-col grid of tiny key bumps for the main board
  const keys: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) keys.push([r, c]);
  }
  return (
    <group position={pos}>
      {/* Main keyboard body — flat tray */}
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.40, 0.024, 0.14]} />
        <meshStandardMaterial color="#E2DFD7" roughness={0.55} />
      </mesh>
      {/* Coloured keys: little flat bumps on top */}
      {keys.map(([r, c]) => (
        <mesh key={`k-${r}-${c}`} position={[-0.18 + c * 0.0315, 0.027, -0.045 + r * 0.025]}>
          <boxGeometry args={[0.026, 0.008, 0.020]} />
          <meshStandardMaterial color={c < 11 ? KEY_COLOR : KEY_DARK} roughness={0.5} />
        </mesh>
      ))}
      {/* spacebar */}
      <mesh position={[-0.05, 0.027, 0.058]}>
        <boxGeometry args={[0.14, 0.008, 0.020]} />
        <meshStandardMaterial color={KEY_COLOR} roughness={0.5} />
      </mesh>
      {/* small dial / trackball area to the right of the spacebar */}
      <mesh position={[0.10, 0.027, 0.058]}>
        <cylinderGeometry args={[0.015, 0.015, 0.012, 16]} />
        <meshStandardMaterial color="#202C32" roughness={0.5} />
      </mesh>
      {/* Numeric pad block */}
      <mesh position={[0.27, 0.012, 0]} castShadow>
        <boxGeometry args={[0.10, 0.024, 0.14]} />
        <meshStandardMaterial color="#E2DFD7" roughness={0.55} />
      </mesh>
      {/* number-pad keys 4×3 */}
      {Array.from({ length: 4 }).flatMap((_, r) =>
        Array.from({ length: 3 }).map((_, c) => (
          <mesh key={`n-${r}-${c}`} position={[0.245 + c * 0.025, 0.027, -0.045 + r * 0.025]}>
            <boxGeometry args={[0.020, 0.008, 0.020]} />
            <meshStandardMaterial color={KEY_COLOR} roughness={0.5} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ---------- desk lamp (banker's style, small, emits warm light) ----- */
function DeskLamp({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      {/* base disc */}
      <mesh position={[0, 0.018, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.075, 0.035, 18]} />
        <meshStandardMaterial color="#F0EEEA" roughness={0.55} metalness={0.04} />
      </mesh>
      {/* stem */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 10]} />
        <meshStandardMaterial color="#E8E6E2" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* lampshade — slanted box, faintly emissive underside */}
      <mesh position={[0.05, 0.31, 0]} rotation-z={-0.45} castShadow>
        <boxGeometry args={[0.16, 0.07, 0.13]} />
        <meshStandardMaterial
          color="#F2F0EC"
          roughness={0.6}
          emissive="#FFD8A0"
          emissiveIntensity={0.20}
        />
      </mesh>
      {/* warm pool of light cast onto the desk surface */}
      <pointLight
        position={[0.12, 0.25, 0]}
        intensity={1.6}
        distance={1.4}
        decay={2}
        color="#FFCD7E"
      />
    </group>
  );
}

/* ---------- PBR textured surfaces (CC0 from ambientCG) -------------- */
// Each surface loads its full PBR set (Color + NormalGL + Roughness + AO)
// and tiles it via texture.repeat. The base color is tinted via .color so
// we keep the sage/cream palette while gaining real surface micro-detail.

function TexturedCarpet({ width, depth }: { width: number; depth: number }) {
  // Skip the colour map (it's brown — would override our sage-green tint).
  // Use only normal + roughness + AO so the texture adds surface micro-
  // detail (weave bumps + grime) while the meshStandardMaterial.color
  // keeps the green palette.
  const props = useTexture({
    normalMap:    '/textures/Carpet013/Carpet013_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Carpet013/Carpet013_1K-JPG_Roughness.jpg',
    aoMap:        '/textures/Carpet013/Carpet013_1K-JPG_AmbientOcclusion.jpg',
  });
  useMemo(() => {
    Object.values(props).forEach((t: any) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(width / 2.0, depth / 2.0);
      t.anisotropy = 8;
    });
  }, [props, width, depth]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        {...(props as any)}
        color={C.carpet}
        roughness={0.92}
        normalScale={[0.7, 0.7] as any}
        aoMapIntensity={1.0}
      />
    </mesh>
  );
}

function TexturedWallPlane({
  pos, rot, size,
}: {
  pos: [number, number, number];
  rot: [number, number, number];
  size: [number, number];
}) {
  // Drop the colour map — only the surface detail matters; the colour
  // stays as our cream-white from C.wall.
  const props = useTexture({
    normalMap:    '/textures/PaintedPlaster017/PaintedPlaster017_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/PaintedPlaster017/PaintedPlaster017_1K-JPG_Roughness.jpg',
  });
  useMemo(() => {
    Object.values(props).forEach((t: any) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(size[0] / 3, size[1] / 3);
      t.anisotropy = 8;
    });
  }, [props, size]);
  return (
    <mesh position={pos} rotation={rot} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial
        {...(props as any)}
        color={C.wall}
        roughness={0.78}
        normalScale={[0.30, 0.30] as any}
      />
    </mesh>
  );
}

// Desk + pedestal material props — applied to white surfaces to add
// fine micro-detail without staining the colour. Uses Wood062's
// normal + roughness only (no colour map → white stays white).
function useDeskNormalProps(repeatX = 1.5, repeatY = 1.0) {
  const props = useTexture({
    normalMap:    '/textures/Wood062/Wood062_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Wood062/Wood062_1K-JPG_Roughness.jpg',
  });
  useMemo(() => {
    Object.values(props).forEach((t: any) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = 8;
    });
  }, [props, repeatX, repeatY]);
  return props;
}

// Chair leather / fabric props — uses Carpet013's normal as a fabric
// stand-in (subtle weave on the upholstery). Aggressively low scale.
function useChairFabricProps() {
  const props = useTexture({
    normalMap:    '/textures/Carpet013/Carpet013_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Carpet013/Carpet013_1K-JPG_Roughness.jpg',
  });
  useMemo(() => {
    Object.values(props).forEach((t: any) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 3);
      t.anisotropy = 4;
    });
  }, [props]);
  return props;
}

// Partition fabric props — same Carpet013 PBR set as the chair, but
// tiled much wider (panels are ~4 m long). Gives the dark green
// dividers a perceptible textile weave under the directional light.
function usePartitionFabricProps(repeatX = 8, repeatY = 2) {
  const props = useTexture({
    normalMap:    '/textures/Carpet013/Carpet013_1K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/Carpet013/Carpet013_1K-JPG_Roughness.jpg',
  });
  useMemo(() => {
    Object.values(props).forEach((t: any) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = 8;
    });
  }, [props, repeatX, repeatY]);
  return props;
}

/* ---------- main 3-D scene ------------------------------------------- */
function OfficeScene({ phase, onMonitorClick }: {
  phase: Phase; onMonitorClick: () => void;
}) {
  // Wall shader (panel seams) — one instance shared across all 3 walls
  const wallMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSeams: { value: 3.0 },
      uWall:  { value: new THREE.Color('#F2F0EC') },
      uSeam:  { value: new THREE.Color('#D4D2CE') },
    },
    vertexShader: WALL_VERT,
    fragmentShader: WALL_FRAG,
  }), []);

  // Shared wood normal for the white MDR-style cross dividers between
  // the 4 stations (tiled long for the EW arm, fine enough for the NS).
  const deskCrossNormals = useDeskNormalProps(4, 1.2);

  // Carpet shader (subtle texture)
  const carpetMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color(C.carpet) },
      uRes:  { value: new THREE.Vector2(180, 240) },
    },
    vertexShader: WALL_VERT, // reuses the same simple vUv pass-through
    fragmentShader: CARPET_FRAG,
  }), []);

  // Fluorescent ceiling lights — wider grid for the bigger room
  const lightGrid: [number, number][] = [
    [-12, -16], [-4, -16], [4, -16], [12, -16],
    [-12,  -6], [-4,  -6], [4,  -6], [12,  -6],
    [-12,   4], [-4,   4], [4,   4], [12,   4],
    [-12,  14], [-4,  14], [4,  14], [12,  14],
  ];

  return (
    <>
      {/* ── LIGHTING ─────────────────────────────────────────────────── */}
      {/* Image-based ambient lighting + reflections — soft "lobby" preset
          gives the scene proper environmental cues so metallic + glossy
          surfaces feel grounded. background={false} keeps our 3D walls. */}
      <Environment preset="lobby" background={false} environmentIntensity={0.35} />

      {/* Single dominant SHADOW caster — angled "sun"-style directional.
          All nine ceiling pointLights provide flat fluorescent flood
          without shadow cost; this one casts contact shadows under
          furniture so the scene reads grounded. */}
      <directionalLight
        position={[8, 9, 4]}
        intensity={0.55}
        color="#FFFFFF"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Cool ambient — fluorescent rooms have almost no shadow gradient. */}
      <ambientLight intensity={1.85} color="#F0F2F0" />

      {/* Dedicated desk fill — compensates for partitions blocking ceiling lights */}
      <pointLight position={[0.3, ROOM_H - 0.5, DESK_Z + 0.5]} intensity={7.5} distance={9} decay={2} color="#F6F9FF" />

      {/* (Active-station spotlight removed — reference is uniform flood) */}

      {/* Ceiling panel lights — true fluorescent flood */}
      {lightGrid.map(([x, z], i) => (
        <pointLight
          key={i}
          position={[x, ROOM_H - 0.25, z]}
          intensity={7.0}
          distance={26}
          decay={2}
          color="#F5F8FF"
        />
      ))}

      {/* ── FLOOR — real CC0 carpet PBR texture ────────────────────── */}
      <TexturedCarpet width={ROOM_W} depth={ROOM_D} />

      {/* ── DUST PARTICLES — atmospheric haze ─────────────────────── */}
      <DustParticles />

      {/* ── ContactShadows under chair + desk area ──────────────────── */}
      <ContactShadows
        position={[0.3, 0.012, DESK_Z + 0.7]}
        opacity={0.42}
        scale={5.5}
        blur={2.8}
        far={1.8}
        resolution={512}
        color="#0A1A0F"
      />

      {/* ── CEILING — actual 3-D coffered grid (recessed geometry) ──── */}
      <CofferedCeiling />
      {/* Scattered ceiling fixtures (smoke detectors with blinking LEDs) */}
      {[
        [-9, -12, 0.0],   // [x, z, phaseOffset]
        [ 6, -10, 0.7],
        [-4,   0, 1.4],
        [10,   5, 2.1],
        [-10, 12, 2.8],
        [ 4,  14, 3.5],
      ].map(([x, z, ph], i) => (
        <SmokeDetector key={`fix-${i}`} x={x as number} z={z as number} phaseOffset={ph as number} />
      ))}

      {/* ── WALLS — real CC0 painted-plaster PBR texture ──────────── */}
      <TexturedWallPlane
        pos={[0, ROOM_H / 2, -ROOM_D / 2 + 0.05]}
        rot={[0, 0, 0]}
        size={[ROOM_W, ROOM_H]}
      />
      <TexturedWallPlane
        pos={[-ROOM_W / 2 + 0.05, ROOM_H / 2, 0]}
        rot={[0, Math.PI / 2, 0]}
        size={[ROOM_D, ROOM_H]}
      />
      <TexturedWallPlane
        pos={[ROOM_W / 2 - 0.05, ROOM_H / 2, 0]}
        rot={[0, -Math.PI / 2, 0]}
        size={[ROOM_D, ROOM_H]}
      />

      {/* ── SEVERANCE MDR DIVIDERS ──────────────────────────────────
          Integrated WHITE cross dividers between the 4 stations — not
          loose green fabric cubicle walls. Same off-white as the desks
          (sharing the wood normal map for consistency) so they read as
          built-in MDR furniture, not generic office partitions. Tall
          enough to occlude monitors between adjacent workers. */}
      {/* EW arm — west desk to east desk */}
      <mesh position={[0, 1.30, DESK_Z - 0.74]} castShadow receiveShadow>
        <boxGeometry args={[3.20, 1.12, 0.06]} />
        <meshStandardMaterial {...(deskCrossNormals as any)} color={C.desk} roughness={0.45} metalness={0.02} normalScale={[0.16, 0.16] as any} />
      </mesh>
      {/* NS arm — south desk to north desk */}
      <mesh position={[0, 1.30, DESK_Z - 0.74]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 1.12, 1.50]} />
        <meshStandardMaterial {...(deskCrossNormals as any)} color={C.desk} roughness={0.45} metalness={0.02} normalScale={[0.16, 0.16] as any} />
      </mesh>
      {/* Slim dark top trim along each arm — subtle line that gives the
          dividers a finished MDR-furniture edge instead of a raw box. */}
      <mesh position={[0, 1.87, DESK_Z - 0.74]}>
        <boxGeometry args={[3.22, 0.025, 0.08]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.87, DESK_Z - 0.74]}>
        <boxGeometry args={[0.08, 0.025, 1.52]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.6} />
      </mesh>

      {/* ── 4 SYMMETRIC BOOTHS ───────────────────────────────────────
          All 4 booths share identical StationLite geometry. Only the
          SOUTH booth is the "active" one (active CRT + accessories). */}
      {/* SOUTH (active) */}
      <group position={[0, 0, DESK_Z]}>
        <StationLite active />
      </group>
      {/* NORTH — user faces south */}
      <group position={[0, 0, DESK_Z - 1.42]} rotation-y={Math.PI}>
        <StationLite />
      </group>
      {/* EAST — user faces west. Pulled in to x=1.5 (was 3.0) so the
          four-station pod clusters tightly around the centre — the
          Severance MDR layout where monitors meet back-to-back. */}
      <group position={[1.5, 0, DESK_Z - 0.74]} rotation-y={Math.PI / 2}>
        <StationLite />
      </group>
      {/* WEST — user faces east. Mirror of east, also pulled in to ±1.5. */}
      <group position={[-1.5, 0, DESK_Z - 0.74]} rotation-y={-Math.PI / 2}>
        <StationLite />
      </group>

      {/* ── ACTIVE CRT on the south booth (click target) ──────────── */}
      <CrtMonitor phase={phase} onClick={onMonitorClick} />

      {/* ── DESK ACCESSORIES — all on the south booth only ──────────
          Positioned in world coords corresponding to the south booth's
          desk surface at z = DESK_Z (-4.5), centred at x = 0.10 to align
          with the active CRT. */}

      {/* keyboard — directly in front of monitor */}
      <Keyboard pos={[0.05, 0.77, DESK_Z + 0.30]} />

      {/* desk lamp — back-left corner */}
      <DeskLamp pos={[-0.55, 0.77, DESK_Z - 0.45]} />

      {/* sticky notes — to the right of keyboard */}
      <mesh position={[0.50, 0.776, DESK_Z + 0.30]} rotation-y={0.18}>
        <boxGeometry args={[0.10, 0.012, 0.10]} />
        <meshStandardMaterial color="#F5E68A" roughness={0.85} />
      </mesh>
      <mesh position={[0.51, 0.782, DESK_Z + 0.30]} rotation-y={0.14}>
        <boxGeometry args={[0.10, 0.005, 0.10]} />
        <meshStandardMaterial color="#F8EC9A" roughness={0.85} />
      </mesh>

      {/* stack of papers — far-left front of desk */}
      <mesh position={[-0.55, 0.775, DESK_Z + 0.45]} rotation-y={-0.12}>
        <boxGeometry args={[0.16, 0.018, 0.12]} />
        <meshStandardMaterial color="#F0EDE4" roughness={0.9} />
      </mesh>

      {/* coffee mug — right-front corner */}
      <mesh position={[0.65, 0.785, DESK_Z + 0.15]}>
        <cylinderGeometry args={[0.052, 0.046, 0.10, 14]} />
        <meshStandardMaterial color="#DCDAD6" roughness={0.55} />
      </mesh>
      <mesh position={[0.71, 0.785, DESK_Z + 0.15]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.028, 0.008, 6, 10, Math.PI]} />
        <meshStandardMaterial color="#D8D6D2" roughness={0.55} />
      </mesh>
      {/* rising coffee steam — subtle white wisps above the mug */}
      <CoffeeSteam origin={[0.65, 0.84, DESK_Z + 0.15]} />

      {/* small framed picture — back-right of desk */}
      <mesh position={[0.55, 0.81, DESK_Z - 0.45]} rotation-y={-0.20}>
        <boxGeometry args={[0.13, 0.10, 0.018]} />
        <meshStandardMaterial color="#3A3632" roughness={0.5} />
      </mesh>
      <mesh position={[0.55, 0.81, DESK_Z - 0.441]} rotation-y={-0.20}>
        <planeGeometry args={[0.10, 0.075]} />
        <meshStandardMaterial color="#8AA5C8" roughness={0.8} />
      </mesh>

      {/* tissue box — small white cube on the right-front of desk */}
      <mesh position={[0.50, 0.83, DESK_Z + 0.45]}>
        <boxGeometry args={[0.14, 0.10, 0.10]} />
        <meshStandardMaterial color="#F8F6F2" roughness={0.85} />
      </mesh>
      {/* tissue slot — small darker indent on top */}
      <mesh position={[0.50, 0.885, DESK_Z + 0.45]}>
        <boxGeometry args={[0.08, 0.006, 0.04]} />
        <meshStandardMaterial color="#C8C6C2" roughness={0.9} />
      </mesh>

      {/* pen holder — small cylinder cup beside monitor */}
      <mesh position={[-0.35, 0.81, DESK_Z - 0.15]}>
        <cylinderGeometry args={[0.045, 0.04, 0.10, 14]} />
        <meshStandardMaterial color="#3A3C3E" roughness={0.6} />
      </mesh>
      {/* pens poking out of holder */}
      <mesh position={[-0.35, 0.91, DESK_Z - 0.15]} rotation-z={0.08}>
        <cylinderGeometry args={[0.005, 0.005, 0.10, 6]} />
        <meshStandardMaterial color="#5BA8B0" />
      </mesh>
      <mesh position={[-0.36, 0.90, DESK_Z - 0.14]} rotation-z={-0.12} rotation-x={0.08}>
        <cylinderGeometry args={[0.005, 0.005, 0.10, 6]} />
        <meshStandardMaterial color="#D33A3A" />
      </mesh>

      {/* in-tray with a small stack of papers — back-centre of desk */}
      <mesh position={[-0.10, 0.78, DESK_Z - 0.45]}>
        <boxGeometry args={[0.20, 0.025, 0.16]} />
        <meshStandardMaterial color="#8E8C88" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-0.10, 0.80, DESK_Z - 0.45]}>
        <boxGeometry args={[0.17, 0.015, 0.13]} />
        <meshStandardMaterial color="#F0EDE4" roughness={0.9} />
      </mesh>
      <mesh position={[-0.09, 0.812, DESK_Z - 0.45]}>
        <boxGeometry args={[0.17, 0.005, 0.13]} />
        <meshStandardMaterial color="#E8E4DA" roughness={0.9} />
      </mesh>

      {/* small pen — long thin cylinder on top of the papers stack */}
      <mesh position={[-0.10, 0.83, DESK_Z - 0.40]} rotation-z={Math.PI/2} rotation-x={0.15}>
        <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.55} />
      </mesh>

      {/* ── WALL CLOCKS — one on each side wall (matches reference) ─── */}
      <WallClock pos={[ROOM_W / 2 - 0.12, 2.8, 3]} />
      <WallClock pos={[-ROOM_W / 2 + 0.12, 2.8, -2]} />

      {/* ── FRAMED PICTURE — on the back wall between the two desks ── */}
      <group position={[0, 1.85, -ROOM_D / 2 + 0.06]}>
        {/* outer frame */}
        <mesh>
          <boxGeometry args={[0.40, 0.30, 0.025]} />
          <meshStandardMaterial color="#2A2826" roughness={0.55} />
        </mesh>
        {/* image inside frame (placeholder soft photo tones) */}
        <mesh position={[0, 0, 0.014]}>
          <planeGeometry args={[0.34, 0.24]} />
          <meshStandardMaterial color="#8A9AB8" roughness={0.8} />
        </mesh>
      </group>

      {/* ── HVAC GRILLES — larger dark vents, more visible from idle ── */}
      {([
        // back wall: 3 vents at top
        [[-9, 3.7, -ROOM_D / 2 + 0.10] as const, [0.95, 0.32, 0.05] as const],
        [[ 0, 3.7, -ROOM_D / 2 + 0.10] as const, [0.95, 0.32, 0.05] as const],
        [[ 9, 3.7, -ROOM_D / 2 + 0.10] as const, [0.95, 0.32, 0.05] as const],
        // left wall: 2 vents
        [[-ROOM_W / 2 + 0.10, 3.7, -10] as const, [0.05, 0.32, 0.95] as const],
        [[-ROOM_W / 2 + 0.10, 3.7,   4] as const, [0.05, 0.32, 0.95] as const],
        // right wall: 2 vents
        [[ROOM_W / 2 - 0.10, 3.7, -10] as const, [0.05, 0.32, 0.95] as const],
        [[ROOM_W / 2 - 0.10, 3.7,   4] as const, [0.05, 0.32, 0.95] as const],
      ] as const).map(([p, s], i) => (
        <mesh key={`vent-${i}`} position={p}>
          <boxGeometry args={s} />
          <meshStandardMaterial color="#3A3C3E" roughness={0.55} metalness={0.25} />
        </mesh>
      ))}

      {/* ── WALL TRIM — ceiling junction + upper trim line (~2.4m) + baseboard ── */}
      {([
        // CEILING JUNCTION trim
        [[0, ROOM_H - 0.01, -ROOM_D / 2 + 0.07] as const, [ROOM_W, 0.025, 0.025] as const, '#7C7E80'],
        [[-ROOM_W / 2 + 0.07, ROOM_H - 0.01, 0] as const, [0.025, 0.025, ROOM_D] as const, '#7C7E80'],
        [[ROOM_W / 2 - 0.07, ROOM_H - 0.01, 0] as const, [0.025, 0.025, ROOM_D] as const, '#7C7E80'],
        // UPPER TRIM at ~2.4m (door-head height)
        [[0, 2.40, -ROOM_D / 2 + 0.07] as const, [ROOM_W, 0.05, 0.02] as const, '#9A9C9E'],
        [[-ROOM_W / 2 + 0.07, 2.40, 0] as const, [0.02, 0.05, ROOM_D] as const, '#9A9C9E'],
        [[ROOM_W / 2 - 0.07, 2.40, 0] as const, [0.02, 0.05, ROOM_D] as const, '#9A9C9E'],
        // BASEBOARD at ~0.12m (skirt)
        [[0, 0.12, -ROOM_D / 2 + 0.07] as const, [ROOM_W, 0.18, 0.03] as const, '#3A3C3E'],
        [[-ROOM_W / 2 + 0.07, 0.12, 0] as const, [0.03, 0.18, ROOM_D] as const, '#3A3C3E'],
        [[ROOM_W / 2 - 0.07, 0.12, 0] as const, [0.03, 0.18, ROOM_D] as const, '#3A3C3E'],
      ] as const).map(([p, s, c], i) => (
        <mesh key={`trim-${i}`} position={p}>
          <boxGeometry args={s} />
          <meshStandardMaterial color={c as string} roughness={0.5} metalness={0.15} />
        </mesh>
      ))}

      {/* ── DOOR (BACK wall, off-centre — visible behind the cubicles) ──
          Previously sat on the left wall at x=-18, well outside the idle
          frame. Relocated to the back wall so it actually reads as the
          dark doorway in the reference image. */}
      {/* dark doorway void — set INTO the back wall (z just inside it) */}
      <mesh position={[-6.0, 1.20, -ROOM_D / 2 + 0.10]}>
        <boxGeometry args={[1.05, 2.40, 0.06]} />
        <meshStandardMaterial color="#0A0A0C" roughness={0.85} />
      </mesh>
      {/* door frame (lighter trim around the opening) */}
      <mesh position={[-6.0, 1.22, -ROOM_D / 2 + 0.14]}>
        <boxGeometry args={[1.18, 2.55, 0.10]} />
        <meshStandardMaterial color="#C8C6C2" roughness={0.7} />
      </mesh>
      {/* door leaf — open ~30° INTO the room (toward camera) so you
          see the edge against the void */}
      <group position={[-5.55, 1.20, -ROOM_D / 2 + 0.30]} rotation-y={-0.50}>
        <mesh castShadow>
          <boxGeometry args={[0.95, 2.35, 0.055]} />
          <meshStandardMaterial color={C.door} roughness={0.7} />
        </mesh>
        {/* door knob */}
        <mesh position={[0.38, 0, 0.04]}>
          <sphereGeometry args={[0.034, 12, 8]} />
          <meshStandardMaterial color="#8A8880" roughness={0.25} metalness={0.65} />
        </mesh>
      </group>
    </>
  );
}

/* ================================================================
   OVERLAYS — copied verbatim from Study.tsx
   ================================================================ */

/* ---------- BIOS splash ---------------------------------------------- */
function BiosScreen({ onDone }: { onDone: () => void }) {
  const [step,        setStep]        = useState(0);
  const [biosGone,    setBiosGone]    = useState(false);
  const [showPopup,   setShowPopup]   = useState(false);
  const [dismissed,   setDismissed]   = useState(false);
  const [startHover,  setStartHover]  = useState(false);
  const dismissedRef = useRef(false);

  const LINES = [
    { text: 'prashantgarg.org  v1.0',                                          type: 'header' },
    { text: 'Economist · Cambridge · Imperial · LSE',                         type: 'sub'    },
    { text: '',                                                                 type: 'blank'  },
    { text: '> initializing workstation',                                      type: 'check'  },
    { text: '> mounting research archives',                                    type: 'check'  },
    { text: '> calibrating fluorescent ceiling',                               type: 'check'  },
    { text: '> establishing network link',                                     type: 'check'  },
    { text: '',                                                                 type: 'blank'  },
    { text: `Press any key to skip memory test · ${new Date().getFullYear()}`, type: 'footer' },
  ] as const;
  const DELAYS = [0, 130, 280, 420, 560, 700, 840, 960, 1060];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    DELAYS.forEach((d, i) => { timers.push(setTimeout(() => setStep(i + 1), d)); });
    timers.push(setTimeout(() => { setBiosGone(true); setTimeout(() => setShowPopup(true), 340); }, 1700));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setDismissed(true);
    setTimeout(onDone, 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Tab') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!showPopup) return;
    const onDown = () => dismiss();
    window.addEventListener('pointerdown', onDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onDown, { capture: true });
  }, [showPopup]); // eslint-disable-line

  const mono = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000',
      // very subtle CRT scanlines for the BIOS background — period 3px
      backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: mono,
    }}>
      <div style={{ width: 'min(92vw, 500px)', padding: 24, opacity: biosGone ? 0 : 1, transition: 'opacity 0.32s ease', pointerEvents: biosGone ? 'none' : 'auto', position: showPopup ? 'absolute' : 'static' }}>
        {LINES.slice(0, step).map((line, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', lineHeight: line.type === 'blank' ? '0.85em' : '1.85em', color: line.type === 'header' ? '#fff' : line.type === 'sub' ? 'rgba(255,255,255,0.52)' : line.type === 'footer' ? 'rgba(255,255,255,0.28)' : '#a4d9c5', fontSize: line.type === 'header' ? 14 : line.type === 'footer' ? 10 : 12, letterSpacing: line.type === 'header' ? '0.10em' : '0.04em' }}>
            {line.type === 'check' ? (<><span>{line.text}</span><span style={{ color: '#4ec994', marginLeft: 20, flexShrink: 0 }}>[ ok ]</span></>) : (<span>{line.text || ' '}</span>)}
          </div>
        ))}
        {step > 0 && step <= LINES.length && <span style={{ color: '#F9BD2B', fontSize: 13 }}>▋</span>}
      </div>
      {showPopup && (
        <div
          onClick={dismiss}
          style={{
            border: '8px solid #fff',
            padding: '44px 56px',
            width: 'min(92vw, 480px)',
            boxSizing: 'border-box',
            cursor: 'pointer',
            opacity: dismissed ? 0 : 1,
            transform: dismissed ? 'scale(1.06)' : 'scale(1)',
            transition: dismissed ? 'opacity 0.2s ease, transform 0.2s ease' : 'none',
            animation: dismissed ? 'none' : 'bios-popup-in 0.32s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, letterSpacing: '0.14em', marginBottom: 26 }}>
            prashantgarg.org&nbsp;&nbsp;·&nbsp;&nbsp;{new Date().getFullYear()}
          </div>
          <div style={{ color: '#fff', fontSize: 18, lineHeight: 1.4, letterSpacing: '0.05em', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 9 }}>
            Click START to enter
            <span style={{ display: 'inline-block', width: '0.55em', height: '1.05em', background: '#fff', verticalAlign: 'middle', animation: 'bios-blink 0.65s step-end infinite' }} />
          </div>
          <button
            onMouseEnter={() => setStartHover(true)}
            onMouseLeave={() => setStartHover(false)}
            onMouseDown={() => playUiClick('down')}
            onMouseUp={() => playUiClick('up')}
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            style={{
              background: startHover ? '#fff' : '#000',
              color: startHover ? '#000' : '#fff',
              border: '2px solid #fff',
              padding: '11px 48px',
              fontFamily: mono,
              fontSize: 15,
              letterSpacing: '0.24em',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
              outline: 'none',
            }}
          >START</button>
        </div>
      )}
      <style>{`@keyframes bios-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes bios-popup-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

/* ---------- boot overlay --------------------------------------------- */
function BootOverlay({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const skipped = useRef(false);
  useEffect(() => {
    const script = [
      { line: 'prashantgarg.org',                                typeMs: 14, pauseMs: 120 },
      { line: '> booting workstation  [ ok ]',                  typeMs: 8,  pauseMs: 140 },
      { line: '> mounting research, talks, library  [ ok ]',    typeMs: 8,  pauseMs: 220 },
      { line: '',                                                typeMs: 0,  pauseMs: 80  },
      { line: 'welcome.',                                        typeMs: 40, pauseMs: 360 },
    ];
    let cancelled = false, buf = '';
    async function run() {
      for (const s of script) {
        for (let i = 0; i < s.line.length; i++) {
          if (cancelled || skipped.current) return;
          buf += s.line[i]; setText(buf);
          await new Promise(r => setTimeout(r, s.typeMs));
        }
        buf += '\n'; setText(buf);
        if (cancelled || skipped.current) return;
        await new Promise(r => setTimeout(r, s.pauseMs));
      }
      if (!cancelled) setDone(true);
    }
    run();
    function onKey() { skipped.current = true; setText(script.map(s => s.line).join('\n')); setDone(true); }
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; window.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (!done) return; const t = setTimeout(onDone, 380); return () => clearTimeout(t); }, [done, onDone]);
  return (
    <div
      onClick={() => { skipped.current = true; setDone(true); }}
      style={{
        position: 'fixed',
        // Use the live CRT screen projection (set by CrtScreenProjector
        // every frame). Fallbacks keep the overlay sensible if the
        // projector hasn't written the vars yet.
        top:    'var(--crt-top,  50%)' as any,
        left:   'var(--crt-left, 50%)' as any,
        width:  'var(--crt-w,    min(66vw, 880px))' as any,
        height: 'var(--crt-h,    min(78vh, 670px))' as any,
        zIndex: 9999,
        background: '#0E0D0B', color: '#A4D9C5',
        // subtle CRT scanlines for the boot terminal background
        backgroundImage: 'repeating-linear-gradient(to bottom, rgba(164,217,197,0.045) 0px, rgba(164,217,197,0.045) 1px, transparent 1px, transparent 3px)',
        fontFamily: "ui-monospace,'SF Mono',Menlo,Monaco,Consolas,monospace",
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10%', cursor: 'pointer',
        boxShadow: '0 0 0 2px #2b2b2b, 0 20px 60px rgba(0,0,0,0.55)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 'min(92%, 560px)', padding: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}<span style={{ color: '#F9BD2B' }}>▋</span></pre>
        <div style={{ marginTop: 36, fontSize: 11, color: 'rgba(164,217,197,0.45)' }}>press any key · click to skip</div>
      </div>
    </div>
  );
}

/* ---------- volume icons --------------------------------------------- */
function VolumeOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149.48 122.85" width="16" height="16" fill="#fff">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M149.48,62.67c-1.15,16.31-7.19,28.67-18.4,38.5-3.33,2.92-7.63,3-10.05.29s-1.94-6.62,1.24-9.53c5.68-5.18,10.33-11,12.44-18.54,4.23-15,1.13-28.3-9.75-39.63-1.09-1.13-2.32-2.14-3.38-3.3-2.52-2.75-2.65-6.65-.36-9a6.76,6.76,0,0,1,9.05-.27c9.84,8.43,16.26,18.91,18.37,31.79C149.24,56.64,149.3,60.38,149.48,62.67Z" transform="translate(0 -0.15)"/>
      <path d="M123,61.54a25.75,25.75,0,0,1-8.75,19.53c-2.85,2.56-7,2.71-9.43.29S102.2,74.9,105,72c2.27-2.34,4.46-4.66,4.94-8.08.67-4.66-.48-8.68-4-11.92-1.91-1.75-3.34-3.76-2.87-6.51.41-2.4,1.52-4.35,4-5.19A6.85,6.85,0,0,1,114.19,42,25.77,25.77,0,0,1,123,61.54Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}
function VolumeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 153.1 122.85" width="16" height="16" fill="#fff">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M137.18,62.29c4.61,4.19,9.06,8.13,13.38,12.2,2.66,2.52,3.19,5.58,1.78,8.23-1.8,3.37-6.94,5.37-11.37,1.06q-5.72-5.55-11.43-11.1c-.44-.43-.9-.84-1.95-1.8-4.19,4.33-8.24,8.66-12.45,12.84-3,3-6,3.3-9.23,1.32a6,6,0,0,1-2-8.51,13.79,13.79,0,0,1,2-2.42c4.06-4,8.15-7.92,12.38-12-.54-.56-1-1.06-1.45-1.52-3.8-3.7-7.63-7.38-11.41-11.11-2.75-2.73-3.26-5.5-1.63-8.34,2.31-4,7.53-4.55,11.28-.88,4.24,4.15,8.27,8.5,12.51,12.89,1.06-1,1.56-1.4,2-1.86,3.77-3.74,7.52-7.49,11.31-11.22,2.56-2.52,5.4-3.15,8.26-1.91a6.27,6.27,0,0,1,3.1,8.84,13.16,13.16,0,0,1-2.2,2.75C146,53.72,142,57.66,137.18,62.29Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}

/* ---------- phase-transition flash ---------------------------------- */
// Brief dark fade overlay that triggers on every phase change. Smooths
// the visual jumps between BIOS→entering, dollying→booting, etc.
function PhaseFlash({ phase }: { phase: Phase }) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    // Quick fade-in then fade-out on each phase change
    setOpacity(0.45);
    const t = setTimeout(() => setOpacity(0), 250);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.4s ease-out',
        zIndex: 7, // above scene & vignette, below HUD & overlays
      }}
    />
  );
}

/* ---------- vignette overlay ----------------------------------------- */
// Soft radial darkening at the corners — pulls the eye toward the
// centre of the frame and adds cinematic atmosphere. Sits beneath the
// HUD and grain, above the canvas.
function VignetteOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        background:
          'radial-gradient(ellipse 115% 115% at 50% 50%, transparent 40%, rgba(0,0,0,0.10) 70%, rgba(0,0,0,0.32) 100%)',
      }}
    />
  );
}

/* ---------- grain overlay -------------------------------------------- */
function GrainOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let id: ReturnType<typeof setInterval>;
    const draw = () => {
      const { width: w, height: h } = canvas;
      const img = ctx.createImageData(w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255; }
      ctx.putImageData(img, 0, 0);
    };
    draw(); id = setInterval(draw, 66);
    return () => clearInterval(id);
  }, []);
  return <canvas ref={ref} width={220} height={140} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6, mixBlendMode: 'soft-light', opacity: 0.07, imageRendering: 'pixelated' }} />;
}

/* ---------- ambient audio -------------------------------------------- */
const AMBIENT_VOL = 0.32;
function StudyAudio({ active, muted }: { active: boolean; muted: boolean }) {
  const ctxRef  = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    const start = async () => {
      if (startedRef.current) return; startedRef.current = true;
      const ac = new AudioContext(); ctxRef.current = ac;
      const master = ac.createGain(); gainRef.current = master;
      master.gain.setValueAtTime(0, ac.currentTime); master.connect(ac.destination);
      let fileLoaded = false;
      try {
        const res = await fetch('/audio/ambient.mp3');
        if (res.ok) { const ab = await res.arrayBuffer(); const buf = await ac.decodeAudioData(ab); const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(master); src.start(); fileLoaded = true; }
      } catch { /* fallback */ }
      if (fileLoaded) return;
      const sr = ac.sampleRate, bufSize = sr * 4, nbuf = ac.createBuffer(1, bufSize, sr), nd = nbuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufSize; i++) { const w = Math.random()*2-1; last = (last+0.02*w)/1.02; nd[i] = last*3.5; }
      const noiseSrc = ac.createBufferSource(); noiseSrc.buffer = nbuf; noiseSrc.loop = true;
      const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 400; bpf.Q.value = 0.6;
      const ng = ac.createGain(); ng.gain.value = 0.55;
      noiseSrc.connect(bpf); bpf.connect(ng); ng.connect(master); noiseSrc.start();
      ([{ freq: 55, lfoRate: 0.031, gain: 0.09 }, { freq: 82.41, lfoRate: 0.048, gain: 0.07 }, { freq: 110, lfoRate: 0.022, gain: 0.06 }] as const).forEach(({ freq, lfoRate, gain }) => {
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq; osc.detune.value = (Math.random()-0.5)*3;
        const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = lfoRate;
        const lg = ac.createGain(); lg.gain.value = gain * 0.4;
        const eg = ac.createGain(); eg.gain.value = gain;
        lfo.connect(lg); lg.connect(eg.gain); osc.connect(eg); eg.connect(master); osc.start(); lfo.start();
      });
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);
  useEffect(() => {
    const g = gainRef.current, ac = ctxRef.current; if (!g || !ac) return;
    const target = (active && !muted) ? AMBIENT_VOL : 0;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(target, ac.currentTime + 1.2);
  }, [active, muted]);
  return null;
}

/* ---------- HUD overlay ---------------------------------------------- */
function getTime() {
  const d = new Date(); let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}:${m < 10 ? '0'+m : m} ${ap}`;
}
function HudOverlay({ muted, onMuteToggle }: { muted: boolean; onMuteToggle: () => void }) {
  const [nameText, setNameText] = useState('');
  const [subText,  setSubText]  = useState('');
  const [timeText, setTimeText] = useState('');
  const [showSub,  setShowSub]  = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [muteActive,   setMuteActive]   = useState(false);
  const [muteHovering, setMuteHovering] = useState(false);
  function typeString(str: string, setter: (s: string) => void, done: () => void, withSound = false) {
    let i = 0, built = '';
    function step() {
      if (i >= str.length) { done(); return; }
      const ch = str[i++];
      built += ch;
      setter(built);
      if (withSound && ch !== ' ') playKeystroke();
      setTimeout(step, Math.random()*70+55);
    }
    step();
  }
  useEffect(() => {
    const t = setTimeout(() => {
      typeString('Prashant Garg', setNameText, () => {
        setShowSub(true);
        typeString('Economist', setSubText, () => {
          setShowTime(true);
          setTimeText(getTime());
        }, true);
      }, true);
    }, 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line
  useEffect(() => { if (!showTime) return; const id = setInterval(() => setTimeText(getTime()), 5000); return () => clearInterval(id); }, [showTime]);
  // Henry-style HUD chips — bigger, more letter-spacing, monospaced.
  // Animated fade+slide in via the chip-in keyframe.
  const chip: React.CSSProperties = {
    background: '#000', color: '#fff',
    fontFamily: "ui-monospace,'SF Mono',Menlo,Consolas,monospace",
    fontSize: 15, lineHeight: '22px',
    padding: '4px 12px',
    display: 'inline-block',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    animation: 'hud-chip-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
  };
  const chipName: React.CSSProperties = { ...chip, fontSize: 17, lineHeight: '24px' };
  const muteOpacity = muteActive ? 0.2 : muteHovering ? 0.8 : 1.0;
  const muteScale   = muteActive ? 0.8 : 1.0;
  return (
    <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
      <style>{`
        @keyframes hud-chip-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {nameText && <div style={chipName}>{nameText}</div>}
      {showSub  && <div style={chip}>{subText}</div>}
      {showTime && <div style={chip}>{timeText}</div>}
      <button
        onMouseEnter={() => setMuteHovering(true)}
        onMouseLeave={() => { setMuteHovering(false); setMuteActive(false); }}
        onMouseDown={e => { e.stopPropagation(); setMuteActive(true); onMuteToggle(); }}
        onMouseUp={() => setMuteActive(false)}
        onTouchStart={e => { e.stopPropagation(); onMuteToggle(); }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        style={{
          width: 40, height: 40,
          background: '#000',
          border: muteHovering ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.10)',
          padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s ease, background 0.18s ease',
          animation: 'hud-chip-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
          animationDelay: '0.6s',
        }}
      >
        <span style={{ opacity: muteOpacity, transform: `scale(${muteScale})`, transition: 'opacity 0.2s ease-out, transform 0.2s ease-out', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}>
          {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
        </span>
      </button>
    </div>
  );
}

/* ---------- tap hint -------------------------------------------------- */
function TapHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    const hide = () => { setVisible(false); clearTimeout(t); };
    window.addEventListener('pointerdown', hide, { once: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', hide); };
  }, []);
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', bottom: '18%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid rgba(164,217,197,0.55)', animation: 'tap-pulse 1.6s ease-out infinite' }} />
      <span style={{ fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 11, color: 'rgba(164,217,197,0.7)', letterSpacing: '0.08em', animation: 'tap-fade 1.6s ease-in-out infinite' }}>tap the monitor</span>
      <style>{`@keyframes tap-pulse{0%{transform:scale(0.85);opacity:0.7}60%{transform:scale(1.25);opacity:0.15}100%{transform:scale(0.85);opacity:0.7}}@keyframes tap-fade{0%,100%{opacity:0.5}50%{opacity:0.9}}`}</style>
    </div>
  );
}

/* ================================================================
   TOP-LEVEL COMPONENT
   ================================================================ */
const SS_PHASE = 'pg_phase';
const SS_MUTED = 'pg_muted';

export default function Office() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === 'undefined') return 'splash';
    try { if (sessionStorage.getItem(SS_PHASE) === 'desktop') return 'desktop'; } catch { /* */ }
    return 'splash';
  });
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => { setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches); }, []);

  const handleEntryDone    = () => setPhase('idle');
  const handleClick        = () => { if (phase === 'idle') setPhase('dollying'); };
  const handleArrived      = () => setPhase('booting');
  const handleBootDone     = () => setPhase('desktop');
  const handleDesktopClose = () => {
    try { sessionStorage.removeItem(SS_PHASE); } catch { /* */ }
    setPhase('idle');
  };

  const [muted, setMuted] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SS_MUTED) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(SS_MUTED, muted ? '1' : '0'); } catch { /* */ }
  }, [muted]);

  // audio plays during every visible phase — the 3D room stays on screen
  // even when the embedded InnerDesktop is open, so music continues
  const audioActive = phase !== 'splash';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#C8CAC4' }}>
      {/* Subtle cool color grade — gives the institutional fluorescent
          feel of the references (slight contrast + cool tint). */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'contrast(1.03) saturate(0.98) hue-rotate(-2deg)',
      }}>
        <Canvas
          shadows="soft"
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
        >
          <PerspectiveCamera makeDefault position={[CAM_ENTRY_POS.x, CAM_ENTRY_POS.y, CAM_ENTRY_POS.z]} fov={54} />
          <CameraRig phase={phase} onArrived={handleArrived} onEntryDone={handleEntryDone} />
          <CrtScreenProjector />
          <OfficeScene phase={phase} onMonitorClick={handleClick} />
          {/* Post-processing: N8AO for ambient occlusion (grime in corners
              where geometry meets), Bloom for soft halo around the CRT
              + bright ceiling panels. */}
          <EffectComposer multisampling={0} disableNormalPass={false}>
            <N8AO aoRadius={0.5} intensity={1.4} aoSamples={16} denoiseSamples={4} color="black" />
            <Bloom intensity={0.32} luminanceThreshold={0.85} luminanceSmoothing={0.4} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </div>
      {phase !== 'splash' && <VignetteOverlay />}
      {phase !== 'splash' && <GrainOverlay />}
      <PhaseFlash phase={phase} />
      <StudyAudio active={audioActive} muted={muted} />
      {phase !== 'splash' && (
        <HudOverlay muted={muted} onMuteToggle={() => setMuted(m => !m)} />
      )}
      {(phase === 'idle' || phase === 'entering') && isTouch && <TapHint />}
      {phase === 'splash'  && <BiosScreen onDone={() => setPhase('entering')} />}
      {phase === 'booting' && <BootOverlay onDone={handleBootDone} />}
      {phase === 'desktop' && <InnerDesktop onClose={handleDesktopClose} embedded />}
    </div>
  );
}
