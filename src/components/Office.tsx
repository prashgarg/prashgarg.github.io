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
import { PerspectiveCamera, ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
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
const ROOM_W = 22;
const ROOM_D = 30;
const ROOM_H = 3.8;

/* ---------- palette --------------------------------------------------- */
const C = {
  carpet:    '#5E7B65',
  wall:      '#EAEAE6',
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
const LEFT_DESK_X    = -0.85;
const RIGHT_DESK_X   =  0.85;
const MONITOR_WORLD  = new THREE.Vector3(LEFT_DESK_X, 1.08, DESK_Z);

const CAM_ENTRY_POS  = new THREE.Vector3(-0.5, 2.4, 8);
const CAM_ENTRY_TGT  = new THREE.Vector3(0.1, 1.1, DESK_Z);
const CAM_IDLE_POS   = new THREE.Vector3(-0.7, 1.58, 3.4);
const CAM_IDLE_TGT   = new THREE.Vector3(0.15, 0.95, DESK_Z);
const CAM_MONITOR_POS = new THREE.Vector3(LEFT_DESK_X, 1.12, DESK_Z + 1.55);
const CAM_MONITOR_TGT = MONITOR_WORLD.clone();

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
    // combine
    vec3 col = uColor * scan * vig * (0.30 + content * 0.95) * flicker;
    col += uColor * cursor * 0.85;
    gl_FragColor = vec4(col * uIntensity, 1.0);
  }
`;

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

/* ---------- carpet noise shader (subtle weave) ----------------------- */
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
    vec3 col = uBase + vec3(n1 + n2);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------- ceiling diamond-grid shader ------------------------------ */
const CEIL_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Diamond grid = square grid rotated 45°.
// Three layers: structural beam (dark edge), coffer reveal (medium), panel centre (bright).
const CEIL_FRAG = `
  uniform vec2 uFreq;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * uFreq;
    // rotate 45°
    vec2 q = vec2(p.x + p.y, p.x - p.y);
    vec2 f = fract(q);
    // cell-local coords [-1,1]
    vec2 c   = (f - 0.5) * 2.0;
    float d  = max(abs(c.x), abs(c.y));   // 0 = centre, 1 = edge

    float isPanel = 1.0 - smoothstep(0.50, 0.62, d);   // bright inner cell
    float isBeam  =       smoothstep(0.82, 0.92, d);    // dark structural frame

    vec3 panelCol  = vec3(0.92, 0.94, 0.96);
    vec3 cofferCol = vec3(0.72, 0.74, 0.76);
    vec3 beamCol   = vec3(0.48, 0.50, 0.52);

    vec3 col = mix(cofferCol, panelCol, isPanel);
    col      = mix(col, beamCol, isBeam);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------- camera rig ----------------------------------------------- */
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
    camera.fov = aspect < 0.75 ? 52 : aspect < 1.2 ? 56 : 58;
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
    // ── idle: parallax + monitor magnetism (Henry's pattern) ──────────────
    // - subtle sine drift so it never feels static
    // - cursor moves camera laterally + tilts target (more breathing)
    // - "monitor magnet": the closer the cursor is to the screen centre
    //   (top-centre of viewport), the further the camera dollies in
    const ms = state.clock.elapsedTime * 1000;
    const driftX = Math.sin((ms + 19000) * 0.00007) * 0.22;
    const driftY = Math.sin((ms +  1000) * 0.000003) * 0.08;
    // proximity to the monitor in screen space — monitor sits roughly
    // at (mouseX ~ -0.4, mouseY ~ -0.3) when at idle, so when the cursor
    // moves into that region we want the camera to lean in.
    const mx = mouse.current.x, my = mouse.current.y;
    const distToMon = Math.hypot(mx - (-0.40), my - (-0.30));
    const magnet = 1 - Math.min(1, distToMon / 1.1);   // 0…1, peaks near monitor
    const zoomK  = Math.pow(magnet, 1.8) * 0.30;       // 0…0.30 — gentle lean-in
    // wider cursor-parallax for "breathing"
    const wx = idlePos.current.x + driftX - mx * 0.45;
    const wy = idlePos.current.y + driftY + my * 0.28;
    // dolly toward monitor when cursor is near monitor — interpolate
    // between idlePos and a point closer to the monitor
    const zoomedZ = idlePos.current.z * (1 - zoomK) + (DESK_Z + 2.4) * zoomK;
    const zoomedY = idlePos.current.y * (1 - zoomK * 0.4) + 1.20 * (zoomK * 0.4);
    camera.position.x += (wx - camera.position.x) * 0.05;
    camera.position.y += (wy + (zoomedY - idlePos.current.y) - camera.position.y) * 0.05;
    camera.position.z += (zoomedZ - camera.position.z) * 0.05;
    // target also drifts and leans toward monitor when zooming
    const tx = idleTgt.current.x + mx * 0.14 + (LEFT_DESK_X - idleTgt.current.x) * zoomK * 0.5;
    const ty = idleTgt.current.y - my * 0.08;
    tgt.current.x += (tx - tgt.current.x) * 0.07;
    tgt.current.y += (ty - tgt.current.y) * 0.07;
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
      <mesh>
        <circleGeometry args={[0.24, 48]} />
        <meshStandardMaterial color={C.clock} roughness={0.7} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.22, 0.26, 48]} />
        <meshStandardMaterial color="#404040" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* hour hand */}
      <mesh ref={hrRef} position={[0, 0.055, 0.012]}>
        <boxGeometry args={[0.022, 0.13, 0.007]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* minute hand */}
      <mesh ref={minRef} position={[0, 0.075, 0.016]}>
        <boxGeometry args={[0.014, 0.17, 0.006]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* centre dot */}
      <mesh position={[0, 0, 0.018]}>
        <circleGeometry args={[0.012, 16]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
    </group>
  );
}

/* ---------- CRT monitor (click target) ------------------------------- */
function CrtMonitor({ phase, onClick }: { phase: Phase; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const clickable = phase === 'idle';
  // CRT shader material — phosphor green with scanlines + terminal rows
  const crtMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uColor:     { value: new THREE.Color('#7ED9A8') },
      uIntensity: { value: 1.2 },
      uTime:      { value: 0 },
    },
    vertexShader: WALL_VERT,
    fragmentShader: CRT_FRAG,
  }), []);
  useFrame((state) => {
    crtMat.uniforms.uTime.value      = state.clock.elapsedTime;
    crtMat.uniforms.uIntensity.value = clickable ? (hovered ? 1.7 : 1.15) : 0.12;
  });
  return (
    <group position={MONITOR_WORLD.toArray()}>
      {/* body */}
      <mesh castShadow>
        <boxGeometry args={[0.54, 0.46, 0.40]} />
        <meshStandardMaterial color={C.monitor} roughness={0.55} />
      </mesh>
      {/* front bezel indent */}
      <mesh position={[0, 0.01, 0.20]}>
        <boxGeometry args={[0.44, 0.36, 0.01]} />
        <meshStandardMaterial color="#B8B4AC" roughness={0.5} />
      </mesh>
      {/* screen — CRT shader + the actual click target */}
      <mesh
        position={[0, 0.02, 0.207]}
        onClick={clickable ? onClick : undefined}
        onPointerEnter={() => { if (clickable) setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <planeGeometry args={[0.34, 0.26]} />
        <primitive object={crtMat} attach="material" />
      </mesh>
      {/* subtle screen glow light onto the desk + chair */}
      {clickable && (
        <pointLight
          position={[0, 0.02, 0.35]}
          intensity={hovered ? 0.7 : 0.32}
          distance={2.5}
          decay={2}
          color="#7ED9A8"
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
  // 5 spokes radiating from a central hub; small wheels at each tip.
  const SPOKES = 5;
  const SPOKE_LEN = 0.34;
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

      {/* === SEAT === */}
      {/* seat pan (rounded edges via slightly larger softer top) */}
      <mesh position={[0, 0.49, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.08, 0.50]} />
        <meshStandardMaterial color="#181818" roughness={0.8} />
      </mesh>
      {/* seat highlight (rim) */}
      <mesh position={[0, 0.535, 0]}>
        <boxGeometry args={[0.48, 0.005, 0.46]} />
        <meshStandardMaterial color="#222" roughness={0.8} />
      </mesh>

      {/* === BACKREST === */}
      {/* short arm connecting seat to back */}
      <mesh position={[0, 0.62, -0.22]} castShadow>
        <boxGeometry args={[0.05, 0.20, 0.05]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.45} />
      </mesh>
      {/* the padded backrest (taller than the seat) */}
      <mesh position={[0, 0.90, -0.24]} castShadow>
        <boxGeometry args={[0.50, 0.55, 0.09]} />
        <meshStandardMaterial color="#181818" roughness={0.8} />
      </mesh>

      {/* === ARMRESTS === */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* vertical post */}
          <mesh position={[side * 0.28, 0.60, -0.05]} castShadow>
            <boxGeometry args={[0.03, 0.22, 0.03]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.45} />
          </mesh>
          {/* horizontal arm pad */}
          <mesh position={[side * 0.28, 0.71, 0.02]} castShadow>
            <boxGeometry args={[0.06, 0.035, 0.30]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- main 3-D scene ------------------------------------------- */
function OfficeScene({ phase, onMonitorClick }: {
  phase: Phase; onMonitorClick: () => void;
}) {
  // Ceiling diamond-grid shader
  const ceilMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uFreq: { value: new THREE.Vector2(8.0, 10.5) },
    },
    vertexShader: CEIL_VERT,
    fragmentShader: CEIL_FRAG,
    side: THREE.FrontSide,
  }), []);

  // Wall shader (panel seams) — one instance shared across all 3 walls
  const wallMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSeams: { value: 9.0 },
      uWall:  { value: new THREE.Color('#EAEAE6') },
      uSeam:  { value: new THREE.Color('#B8B8B4') },
    },
    vertexShader: WALL_VERT,
    fragmentShader: WALL_FRAG,
  }), []);

  // Carpet shader (subtle texture)
  const carpetMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color(C.carpet) },
      uRes:  { value: new THREE.Vector2(180, 240) },
    },
    vertexShader: WALL_VERT, // reuses the same simple vUv pass-through
    fragmentShader: CARPET_FRAG,
  }), []);

  // Fluorescent ceiling lights in a 3 × 3 grid
  const lightGrid: [number, number][] = [
    [-6.5, -10], [0, -10], [6.5, -10],
    [-6.5,  -2], [0,  -2], [6.5,  -2],
    [-6.5,   6], [0,   6], [6.5,   6],
  ];

  return (
    <>
      {/* ── LIGHTING ─────────────────────────────────────────────────── */}
      {/* Cool ambient — fluorescent rooms have almost no shadow gradient */}
      <ambientLight intensity={1.45} color="#DCE8F0" />

      {/* Dedicated desk fill — compensates for partitions blocking ceiling lights */}
      <pointLight position={[0.3, ROOM_H - 0.5, DESK_Z + 0.5]} intensity={5.5} distance={7} decay={2} color="#F0F5FF" />

      {/* Ceiling panel lights: cool white, even spread */}
      {lightGrid.map(([x, z], i) => (
        <pointLight
          key={i}
          position={[x, ROOM_H - 0.25, z]}
          intensity={4.5}
          distance={20}
          decay={2}
          color="#EEF3FF"
        />
      ))}

      {/* ── FLOOR — sage-green carpet w/ shader noise ────────────────── */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={carpetMat} attach="material" />
      </mesh>

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

      {/* ── CEILING — diamond-grid shader ────────────────────────────── */}
      <mesh rotation-x={Math.PI / 2} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>

      {/* Small ceiling fixtures (smoke detectors / vents) — scatter a few */}
      {[
        [-6, -8], [4, -6], [-3, 1], [7, 4], [-7, 8],
      ].map(([x, z], i) => (
        <mesh key={`fix-${i}`} position={[x, ROOM_H - 0.04, z]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.10, 16]} />
          <meshStandardMaterial color="#5A5C60" roughness={0.45} metalness={0.25} />
        </mesh>
      ))}

      {/* ── WALLS — panel-seam shader ───────────────────────────────── */}
      {/* back wall (uses a flat plane so the shader UV maps cleanly) */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2 + 0.05]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* left wall */}
      <mesh position={[-ROOM_W / 2 + 0.05, ROOM_H / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* right wall */}
      <mesh position={[ROOM_W / 2 - 0.05, ROOM_H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* ── DESK ASSEMBLY — two desks + L-shape back bridge ─────────── */}

      {/* LEFT desk surface — MeshReflectorMaterial for subtle sheen */}
      <mesh position={[LEFT_DESK_X, 0.74, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.06, 1.35]} />
        <MeshReflectorMaterial
          color={C.desk}
          blur={[300, 60]}
          resolution={256}
          mixBlur={1}
          mixStrength={0.22}
          roughness={0.78}
          depthScale={0.05}
          minDepthThreshold={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* LEFT pedestal — beefier, full filing-cabinet volume */}
      <mesh position={[LEFT_DESK_X - 0.32, 0.36, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.72, 1.28]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.5} />
      </mesh>
      {/* LEFT pedestal — 3 drawer lines */}
      {[0.18, 0.42, 0.62].map((y, i) => (
        <mesh key={`ldL-${i}`} position={[LEFT_DESK_X - 0.32, y, DESK_Z + 0.642]}>
          <boxGeometry args={[0.75, 0.006, 0.004]} />
          <meshStandardMaterial color="#A8A8A4" />
        </mesh>
      ))}
      {/* LEFT pedestal — 3 drawer handles */}
      {[0.28, 0.50, 0.64].map((y, i) => (
        <mesh key={`lhL-${i}`} position={[LEFT_DESK_X - 0.32, y, DESK_Z + 0.648]}>
          <boxGeometry args={[0.15, 0.018, 0.010]} />
          <meshStandardMaterial color="#C8C6C2" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {/* LEFT inner support (vertical post at desk gap edge) */}
      <mesh position={[LEFT_DESK_X + 0.72, 0.36, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.72, 1.28]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.5} />
      </mesh>

      {/* RIGHT desk surface */}
      <mesh position={[RIGHT_DESK_X, 0.74, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.06, 1.35]} />
        <MeshReflectorMaterial
          color={C.desk}
          blur={[300, 60]}
          resolution={256}
          mixBlur={1}
          mixStrength={0.22}
          roughness={0.78}
          depthScale={0.05}
          minDepthThreshold={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* RIGHT pedestal — beefier, full filing-cabinet volume */}
      <mesh position={[RIGHT_DESK_X + 0.32, 0.36, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.72, 1.28]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.5} />
      </mesh>
      {/* RIGHT pedestal — 3 drawer lines */}
      {[0.18, 0.42, 0.62].map((y, i) => (
        <mesh key={`ldR-${i}`} position={[RIGHT_DESK_X + 0.32, y, DESK_Z + 0.642]}>
          <boxGeometry args={[0.75, 0.006, 0.004]} />
          <meshStandardMaterial color="#A8A8A4" />
        </mesh>
      ))}
      {/* RIGHT pedestal — 3 drawer handles */}
      {[0.28, 0.50, 0.64].map((y, i) => (
        <mesh key={`lhR-${i}`} position={[RIGHT_DESK_X + 0.32, y, DESK_Z + 0.648]}>
          <boxGeometry args={[0.15, 0.018, 0.010]} />
          <meshStandardMaterial color="#C8C6C2" roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {/* RIGHT inner support */}
      <mesh position={[RIGHT_DESK_X - 0.72, 0.36, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.72, 1.28]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.5} />
      </mesh>

      {/* ── L-SHAPE BACK BRIDGE — connects the two desks ─────────────── */}
      {/* Small back-jog desktop spanning the gap between the two desks */}
      <mesh position={[0, 0.74, DESK_Z - 0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 0.45]} />
        <MeshReflectorMaterial
          color={C.desk}
          blur={[300, 60]}
          resolution={256}
          mixBlur={1}
          mixStrength={0.22}
          roughness={0.78}
          depthScale={0.05}
          minDepthThreshold={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* Small support block under the bridge */}
      <mesh position={[0, 0.40, DESK_Z - 0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.30, 0.66, 0.40]} />
        <meshStandardMaterial color={C.deskLeg} roughness={0.5} />
      </mesh>

      {/* ── PARTITION SCREENS — T-arrangement ────────────────────────── */}
      {/* CENTRE vertical partition — sits ON TOP of the desks */}
      <mesh position={[0, 1.32, DESK_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 1.10, 1.30]} />
        <meshStandardMaterial color={C.partition} roughness={0.92} />
      </mesh>
      {/* BACK partition — also sits above desk level */}
      <mesh position={[0, 1.32, DESK_Z - 0.74]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 1.10, 0.07]} />
        <meshStandardMaterial color={C.partition} roughness={0.92} />
      </mesh>
      {/* Outer wrap-around partitions — also sit above desk level */}
      <mesh position={[-1.78, 1.32, DESK_Z - 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 1.10, 1.00]} />
        <meshStandardMaterial color={C.partition} roughness={0.92} />
      </mesh>
      <mesh position={[1.78, 1.32, DESK_Z - 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 1.10, 1.00]} />
        <meshStandardMaterial color={C.partition} roughness={0.92} />
      </mesh>

      {/* ── OFFICE CHAIR — pulled up to the right desk ──────────────── */}
      <OfficeChair pos={[RIGHT_DESK_X, 0, DESK_Z + 1.15]} />

      {/* ── CRT MONITOR ──────────────────────────────────────────────── */}
      <CrtMonitor phase={phase} onClick={onMonitorClick} />

      {/* ── DESK OBJECTS — minimal, matches reference ──────────────── */}
      {/* small green object beside monitor (reference has a small notes square) */}
      <mesh position={[LEFT_DESK_X + 0.42, 0.775, DESK_Z]}>
        <boxGeometry args={[0.10, 0.025, 0.10]} />
        <meshStandardMaterial color="#B4C892" roughness={0.85} />
      </mesh>
      {/* stack of papers — LEFT desk, in front of monitor */}
      <mesh position={[LEFT_DESK_X + 0.18, 0.775, DESK_Z + 0.42]}>
        <boxGeometry args={[0.26, 0.022, 0.20]} />
        <meshStandardMaterial color="#F0EDE4" roughness={0.9} />
      </mesh>
      {/* coffee mug — RIGHT desk, on near edge */}
      <mesh position={[RIGHT_DESK_X + 0.30, 0.785, DESK_Z + 0.22]}>
        <cylinderGeometry args={[0.052, 0.046, 0.10, 14]} />
        <meshStandardMaterial color="#DCDAD6" roughness={0.55} />
      </mesh>
      <mesh position={[RIGHT_DESK_X + 0.36, 0.785, DESK_Z + 0.22]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.028, 0.008, 6, 10, Math.PI]} />
        <meshStandardMaterial color="#D8D6D2" roughness={0.55} />
      </mesh>
      {/* telephone — RIGHT desk, back-right corner */}
      <mesh position={[RIGHT_DESK_X + 0.20, 0.775, DESK_Z - 0.35]}>
        <boxGeometry args={[0.22, 0.055, 0.16]} />
        <meshStandardMaterial color="#D0CEC8" roughness={0.6} />
      </mesh>
      <mesh position={[RIGHT_DESK_X + 0.20, 0.84, DESK_Z - 0.35]}>
        <boxGeometry args={[0.18, 0.055, 0.06]} />
        <meshStandardMaterial color="#C8C6C0" roughness={0.6} />
      </mesh>

      {/* ── WALL CLOCK (right wall) ───────────────────────────────────── */}
      <WallClock pos={[ROOM_W / 2 - 0.12, 2.7, 3]} />

      {/* ── DOOR (left wall, slightly ajar) ──────────────────────────── */}
      {/* door frame */}
      <mesh position={[-ROOM_W / 2 + 0.12, 1.2, 8.5]}>
        <boxGeometry args={[0.14, 2.5, 1.08]} />
        <meshStandardMaterial color="#D6D4D0" roughness={0.7} />
      </mesh>
      {/* door leaf — open ~20° so you see the edge */}
      <group position={[-ROOM_W / 2 + 0.16, 1.2, 8.0]} rotation-y={0.35}>
        <mesh castShadow>
          <boxGeometry args={[0.055, 2.4, 0.96]} />
          <meshStandardMaterial color={C.door} roughness={0.7} />
        </mesh>
        {/* door knob */}
        <mesh position={[0.04, 0, 0.38]}>
          <sphereGeometry args={[0.034, 12, 8]} />
          <meshStandardMaterial color="#8A8880" roughness={0.25} metalness={0.65} />
        </mesh>
      </group>
      {/* slight darkness behind door (void) */}
      <mesh position={[-ROOM_W / 2 + 0.04, 1.2, 8.5]}>
        <boxGeometry args={[0.05, 2.4, 1.0]} />
        <meshStandardMaterial color="#181818" />
      </mesh>
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
    { text: '> mounting research archives',                                    type: 'check'  },
    { text: '> calibrating global automation',                                 type: 'check'  },
    { text: '> warming the study lamp',                                        type: 'check'  },
    { text: '> loading vinyl collection',                                      type: 'check'  },
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono }}>
      <div style={{ width: 'min(92vw, 500px)', padding: 24, opacity: biosGone ? 0 : 1, transition: 'opacity 0.32s ease', pointerEvents: biosGone ? 'none' : 'auto', position: showPopup ? 'absolute' : 'static' }}>
        {LINES.slice(0, step).map((line, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', lineHeight: line.type === 'blank' ? '0.85em' : '1.85em', color: line.type === 'header' ? '#fff' : line.type === 'sub' ? 'rgba(255,255,255,0.52)' : line.type === 'footer' ? 'rgba(255,255,255,0.28)' : '#a4d9c5', fontSize: line.type === 'header' ? 14 : line.type === 'footer' ? 10 : 12, letterSpacing: line.type === 'header' ? '0.10em' : '0.04em' }}>
            {line.type === 'check' ? (<><span>{line.text}</span><span style={{ color: '#4ec994', marginLeft: 20, flexShrink: 0 }}>[ ok ]</span></>) : (<span>{line.text || ' '}</span>)}
          </div>
        ))}
        {step > 0 && step <= LINES.length && <span style={{ color: '#F9BD2B', fontSize: 13 }}>▋</span>}
      </div>
      {showPopup && (
        <div onClick={dismiss} style={{ border: '7px solid #fff', padding: '32px 44px', width: 'min(88vw, 340px)', boxSizing: 'border-box', cursor: 'pointer', opacity: dismissed ? 0 : 1, transform: dismissed ? 'scale(1.06)' : 'scale(1)', transition: dismissed ? 'opacity 0.2s ease, transform 0.2s ease' : 'none', animation: dismissed ? 'none' : 'bios-popup-in 0.28s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: '0.10em', marginBottom: 20 }}>prashantgarg.org&nbsp;&nbsp;{new Date().getFullYear()}</div>
          <div style={{ color: '#fff', fontSize: 13, letterSpacing: '0.04em', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 7 }}>
            Click START to enter
            <span style={{ display: 'inline-block', width: '0.65em', height: '1.05em', background: '#fff', verticalAlign: 'middle', animation: 'bios-blink 0.65s step-end infinite' }} />
          </div>
          <button
            onMouseEnter={() => setStartHover(true)}
            onMouseLeave={() => setStartHover(false)}
            onMouseDown={() => playUiClick('down')}
            onMouseUp={() => playUiClick('up')}
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            style={{ background: startHover ? '#fff' : '#000', color: startHover ? '#000' : '#fff', border: '2px solid #fff', padding: '7px 32px', fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', cursor: 'pointer', transition: 'background 0.12s ease, color 0.12s ease', outline: 'none' }}
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
      { line: '> waking the study  [ ok ]',                     typeMs: 8,  pauseMs: 140 },
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
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(86vw, 1200px)', height: 'min(78vh, 720px)',
        zIndex: 9999,
        background: '#0E0D0B', color: '#A4D9C5',
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
  // Henry-style HUD chips — bigger, more letter-spacing, monospaced
  const chip: React.CSSProperties = {
    background: '#000', color: '#fff',
    fontFamily: "ui-monospace,'SF Mono',Menlo,Consolas,monospace",
    fontSize: 15, lineHeight: '22px',
    padding: '4px 12px',
    display: 'inline-block',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  };
  const chipName: React.CSSProperties = { ...chip, fontSize: 17, lineHeight: '24px' };
  const muteOpacity = muteActive ? 0.2 : muteHovering ? 0.8 : 1.0;
  const muteScale   = muteActive ? 0.8 : 1.0;
  return (
    <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
      {nameText && <div style={chipName}>{nameText}</div>}
      {showSub  && <div style={chip}>{subText}</div>}
      {showTime && <div style={chip}>{timeText}</div>}
      <button onMouseEnter={() => setMuteHovering(true)} onMouseLeave={() => { setMuteHovering(false); setMuteActive(false); }} onMouseDown={e => { e.stopPropagation(); setMuteActive(true); onMuteToggle(); }} onMouseUp={() => setMuteActive(false)} onTouchStart={e => { e.stopPropagation(); onMuteToggle(); }} aria-label={muted ? 'Unmute' : 'Mute'} style={{ width: 40, height: 40, background: '#000', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
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
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[CAM_ENTRY_POS.x, CAM_ENTRY_POS.y, CAM_ENTRY_POS.z]} fov={58} />
        <CameraRig phase={phase} onArrived={handleArrived} onEntryDone={handleEntryDone} />
        <OfficeScene phase={phase} onMonitorClick={handleClick} />
      </Canvas>
      {phase !== 'splash' && <GrainOverlay />}
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
