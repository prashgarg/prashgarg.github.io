/**
 * Home scene v3: a small academic study — wood floor, warm walls, a
 * window, a desk facing the camera with a CRT monitor that the user
 * dollies into and clicks through to the inner site.
 *
 * Architecture inspired by Henry Heffernan's portfolio
 *   https://github.com/henryjeff/portfolio-website  (MIT)
 *   https://github.com/henryjeff/portfolio-inner-site (MIT)
 * The patterns adopted: scene → camera state machine → CRT portal →
 * inner OS. Code, geometry, materials, shaders all original.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, RoundedBox, ContactShadows, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import InnerDesktop from './InnerDesktop';

/* ---------- palette: evening study, single warm lamp pool -----------
 * Aesthetic direction (committed): Hopper/Vermeer interior — one
 * dominant warm light source (the banker's lamp on the desk), with
 * the rest of the room falling into deep shadow. Walls a deep,
 * muted teal so the warm amber pop reads strongly against it.
 * Floor + desk + shelves in differentiated wood tones so it doesn't
 * read as one big slab. */
const C = {
  floor:        '#2a1a10',   // dark stained oak floorboards
  floorTrim:    '#1a0e07',
  wall:         '#344a50',   // lifted further — needed for runtime lighting
  wallShadow:   '#253a38',
  ceiling:      '#2a2424',
  windowGlow:   '#f4a958',   // late sun (warmer, less yellow)
  windowSky:    '#3a4856',   // dusk
  desk:         '#4f2e16',   // honey walnut desk
  deskTop:      '#3a1f0c',
  chair:        '#1e120a',
  chairCushion: '#3e1610',
  monitorBody:  '#bca988',   // warm beige CRT
  monitorBezel: '#0e0a06',
  crtGlow:      '#85d8b6',   // mint phosphor — slightly cooler
  book1:        '#5a2418',
  book2:        '#1d3b2a',
  book3:        '#243a5a',
  book4:        '#5a4421',
  paper:        '#e4d29a',
  brass:        '#d8a25c',   // brighter brass to catch lamp light
  vinyl:        '#0d0a08',
  vinylLabel:   '#c44848',
  postcard1:    '#c89055',
  postcard2:    '#8aa572',
  postcard3:    '#b87480',
  postcard4:    '#6f8aa3',
  rug:          '#4a1a18',   // deeper oxblood
  rugPattern:   '#a87440',
};

/* ---------- camera state machine + parallax ------------------------- */
const CAM_IDLE_POS = new THREE.Vector3(2.8, 1.9, 4.2);
const CAM_IDLE_TGT = new THREE.Vector3(0.2, 1.4, -0.3);
const CAM_MONITOR_POS = new THREE.Vector3(0.05, 1.45, 0.6);
const CAM_MONITOR_TGT = new THREE.Vector3(0.05, 1.45, -0.35);

type Phase = 'idle' | 'dollying' | 'on-monitor' | 'booting' | 'desktop';
const DOLLY_MS = 1600;
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function CameraRig({ phase, onArrived }: { phase: Phase; onArrived: () => void }) {
  const { camera, size } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const tgt = useRef(CAM_IDLE_TGT.clone());
  const startedAt = useRef<number | null>(null);
  const fromPos = useRef(CAM_IDLE_POS.clone());
  const fromTgt = useRef(CAM_IDLE_TGT.clone());
  const arrivedFired = useRef(false);
  // aspect-adaptive idle position / target (updated when size changes)
  const idlePos = useRef(CAM_IDLE_POS.clone());
  const idleTgt = useRef(CAM_IDLE_TGT.clone());

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < 0.7) {
      // phone portrait — THREE.js FOV is vertical, so a tall portrait viewport
      // with a large FOV shows ceiling+floor. Use a smaller FOV (zoom to desk)
      // and move the camera slightly closer + lower to frame the desk scene.
      camera.fov = 42;
      idlePos.current.set(3.0, 1.6, 3.8);
      idleTgt.current.set(0.15, 1.25, -0.2);
    } else if (aspect < 1.0) {
      camera.fov = 48;
      idlePos.current.copy(CAM_IDLE_POS);
      idleTgt.current.copy(CAM_IDLE_TGT);
    } else if (aspect < 1.4) {
      camera.fov = 40;
      idlePos.current.copy(CAM_IDLE_POS);
      idleTgt.current.copy(CAM_IDLE_TGT);
    } else {
      camera.fov = 34;
      idlePos.current.copy(CAM_IDLE_POS);
      idleTgt.current.copy(CAM_IDLE_TGT);
    }
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useEffect(() => {
    if (phase === 'dollying') {
      startedAt.current = performance.now();
      fromPos.current.copy(camera.position);
      fromTgt.current.copy(tgt.current);
      arrivedFired.current = false;
    }
  }, [phase, camera]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => { mouse.current.x = 0; mouse.current.y = 0; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useFrame(() => {
    if (phase === 'dollying') {
      const k = easeOutCubic(Math.min(1, (performance.now() - (startedAt.current ?? 0)) / DOLLY_MS));
      camera.position.lerpVectors(fromPos.current, CAM_MONITOR_POS, k);
      tgt.current.lerpVectors(fromTgt.current, CAM_MONITOR_TGT, k);
      camera.lookAt(tgt.current);
      if (!arrivedFired.current && k >= 1) { arrivedFired.current = true; onArrived(); }
      return;
    }
    if (phase === 'on-monitor' || phase === 'booting' || phase === 'desktop') {
      camera.position.lerp(CAM_MONITOR_POS, 0.08);
      tgt.current.lerp(CAM_MONITOR_TGT, 0.08);
      camera.lookAt(tgt.current);
      return;
    }
    // idle: parallax (uses aspect-adaptive idle pos/tgt)
    const wx = idlePos.current.x - mouse.current.x * 0.35;
    const wy = idlePos.current.y + mouse.current.y * 0.22;
    camera.position.x += (wx - camera.position.x) * 0.06;
    camera.position.y += (wy - camera.position.y) * 0.06;
    camera.position.z += (idlePos.current.z - camera.position.z) * 0.06;
    const tx = idleTgt.current.x + mouse.current.x * 0.10;
    const ty = idleTgt.current.y - mouse.current.y * 0.06;
    tgt.current.x += (tx - tgt.current.x) * 0.08;
    tgt.current.y += (ty - tgt.current.y) * 0.08;
    camera.lookAt(tgt.current);
  });
  return null;
}

/* ---------- floor + walls + ceiling --------------------------------- */
function Room() {
  return (
    <group>
      {/* hardwood floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={C.floor} roughness={0.85} />
      </mesh>
      {/* back wall (behind desk) */}
      <mesh position={[0, 1.6, -2.8]} receiveShadow>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={C.wall} roughness={1} />
      </mesh>
      {/* left wall (with window) */}
      <mesh position={[-4, 1.6, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial color={C.wallShadow} roughness={1} />
      </mesh>
      {/* right wall */}
      <mesh position={[4, 1.6, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial color={C.wall} roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh position={[0, 3.2, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={C.ceiling} roughness={1} />
      </mesh>
      {/* baseboard / floor trim along back wall */}
      <mesh position={[0, 0.06, -2.78]} castShadow>
        <boxGeometry args={[8, 0.12, 0.04]} />
        <meshStandardMaterial color={C.floorTrim} />
      </mesh>
    </group>
  );
}

/* ---------- window on the left wall, warm sun through ---------------- */
function Window() {
  return (
    <group position={[-3.97, 1.8, -1.0]} rotation-y={Math.PI / 2}>
      {/* frame */}
      <mesh>
        <planeGeometry args={[1.6, 1.8]} />
        <meshStandardMaterial color={C.desk} roughness={0.7} />
      </mesh>
      {/* glow panes */}
      <mesh position={[-0.38, 0.42, 0.01]}>
        <planeGeometry args={[0.66, 0.78]} />
        <meshStandardMaterial color={C.windowGlow} emissive={C.windowGlow} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.38, 0.42, 0.01]}>
        <planeGeometry args={[0.66, 0.78]} />
        <meshStandardMaterial color={C.windowGlow} emissive={C.windowGlow} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-0.38, -0.42, 0.01]}>
        <planeGeometry args={[0.66, 0.78]} />
        <meshStandardMaterial color={C.windowSky} emissive={C.windowSky} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.38, -0.42, 0.01]}>
        <planeGeometry args={[0.66, 0.78]} />
        <meshStandardMaterial color={C.windowSky} emissive={C.windowSky} emissiveIntensity={0.3} />
      </mesh>
      {/* sash mullions */}
      <mesh position={[0, 0, 0.015]}><boxGeometry args={[1.55, 0.04, 0.005]} /><meshStandardMaterial color={C.desk} /></mesh>
      <mesh position={[0, 0, 0.015]}><boxGeometry args={[0.04, 1.7, 0.005]} /><meshStandardMaterial color={C.desk} /></mesh>
    </group>
  );
}

/* ---------- rug under the desk -------------------------------------- */
function Rug() {
  return (
    <group position={[0, 0.005, 0]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.2, 4.4]} />
        <meshStandardMaterial color={C.rug} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.55, 0.68, 4, 1]} />
        <meshStandardMaterial color={C.rugPattern} side={THREE.DoubleSide} roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- the desk ------------------------------------------------- */
function Desk() {
  return (
    <group position={[0, 0, -1.7]}>
      {/* top */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.05, 1.2]} />
        <meshStandardMaterial color={C.deskTop} roughness={0.5} />
      </mesh>
      {/* legs */}
      {[
        [-1.30, 0.39, -0.50],
        [ 1.30, 0.39, -0.50],
        [-1.30, 0.39,  0.50],
        [ 1.30, 0.39,  0.50],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.78, 0.08]} />
          <meshStandardMaterial color={C.desk} roughness={0.7} />
        </mesh>
      ))}
      {/* a small drawer on the right */}
      <mesh position={[1.05, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.32, 1.0]} />
        <meshStandardMaterial color={C.desk} roughness={0.65} />
      </mesh>
      <mesh position={[1.05, 0.55, 0.51]}>
        <boxGeometry args={[0.46, 0.28, 0.005]} />
        <meshStandardMaterial color={C.deskTop} roughness={0.5} />
      </mesh>
      <mesh position={[1.05, 0.55, 0.515]}>
        <sphereGeometry args={[0.025, 12, 8]} />
        <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- chair ---------------------------------------------------- */
function Chair() {
  return (
    // pushed back and offset left so it clears the CRT sightline
    // (camera sits at x≈2.8, so moving the chair to x=-0.45 puts it
    // out of the direct view of the monitor from the idle camera angle)
    <group position={[-0.45, 0, -0.95]}>
      {/* seat */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.55, 0.06, 0.55]} />
        <meshStandardMaterial color={C.chair} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color={C.chairCushion} roughness={0.95} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 0.92, -0.24]} castShadow>
        <boxGeometry args={[0.55, 0.8, 0.06]} />
        <meshStandardMaterial color={C.chair} roughness={0.7} />
      </mesh>
      {/* legs */}
      {[
        [-0.22, 0.24, -0.22],
        [ 0.22, 0.24, -0.22],
        [-0.22, 0.24,  0.22],
        [ 0.22, 0.24,  0.22],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.05, 0.48, 0.05]} />
          <meshStandardMaterial color={C.chair} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- the monitor (CRT) — click target ------------------------ */
function Monitor({ phase, onClick }: { phase: Phase; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const screenRef = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (!screenRef.current) return;
    // very subtle scanline flicker via emissive intensity wobble
    const mat = screenRef.current.material as THREE.MeshStandardMaterial;
    const t = s.clock.elapsedTime;
    mat.emissiveIntensity = 0.75 + Math.sin(t * 11) * 0.04 + Math.sin(t * 2.3) * 0.02;
  });
  return (
    <group
      position={[0.05, 0.81, -1.95]}
      onPointerOver={(e) => { e.stopPropagation(); if (phase === 'idle') setHovered(true); document.body.style.cursor = phase === 'idle' ? 'pointer' : 'default'; }}
      onPointerOut={()  => { setHovered(false); document.body.style.cursor = 'default'; }}
      onClick={(e)      => { e.stopPropagation(); if (phase === 'idle') onClick(); }}
    >
      {/* body */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.05, 0.84, 0.78]} />
        <meshStandardMaterial color={C.monitorBody} roughness={0.55} />
      </mesh>
      {/* base */}
      <mesh position={[0, 0.04, -0.05]} castShadow>
        <boxGeometry args={[0.6, 0.08, 0.42]} />
        <meshStandardMaterial color={C.monitorBody} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.10, -0.05]} castShadow>
        <boxGeometry args={[0.22, 0.10, 0.18]} />
        <meshStandardMaterial color={C.monitorBody} roughness={0.55} />
      </mesh>
      {/* bezel (front face inset) */}
      <mesh position={[0, 0.44, 0.39]}>
        <boxGeometry args={[0.94, 0.72, 0.02]} />
        <meshStandardMaterial color={C.monitorBezel} roughness={0.4} />
      </mesh>
      {/* the screen — emissive phosphor with a faint terminal prompt */}
      <mesh ref={screenRef} position={[0, 0.44, 0.405]}>
        <planeGeometry args={[0.78, 0.58]} />
        <meshStandardMaterial color="#0a120e" emissive={C.crtGlow} emissiveIntensity={0.55} roughness={0.3} />
      </mesh>
      {/* prompt text glowing on the screen — invites the click */}
      <Text position={[-0.32, 0.55, 0.408]} fontSize={0.030} color="#bff0d8"
            anchorX="left" anchorY="middle"
            outlineWidth={0.0008} outlineColor="#85d8b6"
            font={undefined}>
        prashantgarg.os
      </Text>
      <Text position={[-0.32, 0.30, 0.408]} fontSize={0.024} color="#85d8b6"
            anchorX="left" anchorY="middle">
        {'>'} login_
      </Text>
      {/* hover ring */}
      {hovered && (
        <Billboard position={[0, 1.05, 0]}>
          <Text fontSize={0.10} color="#FAF6E9" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#14110D">
            click to enter
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/* ---------- desk props: vinyl, books, papers, postcards, etc. ------- */
function DeskProps() {
  return (
    <group position={[0, 0, -1.7]}>
      {/* a desk lamp (banker's lamp, brass + green shade) */}
      <group position={[-1.10, 0.80, 0.25]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.10, 0.12, 0.04, 18]} />
          <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.40, 12]} />
          <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.40, 18, 1, true]} />
          <meshStandardMaterial color="#225948" emissive="#225948" emissiveIntensity={0.15} side={THREE.DoubleSide} roughness={0.55} />
        </mesh>
        <pointLight position={[0, 0.40, 0]} intensity={8.5} distance={3.2} decay={2} color="#FFB266" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      </group>

      {/* stack of papers (his research drafts) */}
      <group position={[-0.5, 0.82, 0.20]}>
        <mesh castShadow><boxGeometry args={[0.42, 0.04, 0.30]} /><meshStandardMaterial color={C.paper} /></mesh>
        <mesh position={[0.02, 0.035, 0.01]} rotation-y={0.08} castShadow><boxGeometry args={[0.40, 0.022, 0.29]} /><meshStandardMaterial color="#ede1be" /></mesh>
        <mesh position={[-0.01, 0.052, -0.005]} rotation-y={-0.04} castShadow><boxGeometry args={[0.41, 0.015, 0.30]} /><meshStandardMaterial color="#f4ebcc" /></mesh>
      </group>

      {/* a stack of books on the left side of the desk */}
      <group position={[-0.4, 0.81, -0.3]}>
        <mesh position={[0, 0.04, 0]} castShadow><boxGeometry args={[0.18, 0.05, 0.26]} /><meshStandardMaterial color={C.book1} roughness={0.7} /></mesh>
        <mesh position={[-0.01, 0.10, -0.005]} rotation-y={0.06} castShadow><boxGeometry args={[0.18, 0.04, 0.26]} /><meshStandardMaterial color={C.book2} roughness={0.7} /></mesh>
        <mesh position={[0.01, 0.155, 0.01]} rotation-y={-0.04} castShadow><boxGeometry args={[0.17, 0.05, 0.25]} /><meshStandardMaterial color={C.book3} roughness={0.7} /></mesh>
        <mesh position={[0, 0.21, 0]} castShadow><boxGeometry args={[0.18, 0.04, 0.26]} /><meshStandardMaterial color={C.book4} roughness={0.7} /></mesh>
      </group>

      {/* Bob Dylan vinyl record, on its sleeve, leaning against the books */}
      <group position={[-0.85, 0.81, -0.3]} rotation-y={-0.15}>
        {/* sleeve */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.36, 0.36, 0.012]} />
          <meshStandardMaterial color="#3b2418" roughness={0.85} />
        </mesh>
        {/* the record peeking out — black with red label */}
        <mesh position={[0.04, 0.20, 0.008]}>
          <circleGeometry args={[0.16, 32]} />
          <meshStandardMaterial color={C.vinyl} roughness={0.4} />
        </mesh>
        <mesh position={[0.04, 0.20, 0.009]}>
          <circleGeometry args={[0.05, 24]} />
          <meshStandardMaterial color={C.vinylLabel} />
        </mesh>
        {/* tiny "DYLAN" text on sleeve */}
        <Text position={[0, 0.31, 0.008]} fontSize={0.030} color="#e8d8ab" anchorX="center" anchorY="middle">DYLAN</Text>
      </group>

      {/* a small stack of postcards near the right of the desk */}
      <group position={[0.45, 0.81, 0.25]} rotation-y={0.18}>
        <mesh position={[0, 0.005, 0]} castShadow><boxGeometry args={[0.22, 0.008, 0.14]} /><meshStandardMaterial color={C.postcard1} /></mesh>
        <mesh position={[-0.01, 0.014, 0.006]} rotation-y={0.10} castShadow><boxGeometry args={[0.22, 0.006, 0.14]} /><meshStandardMaterial color={C.postcard2} /></mesh>
        <mesh position={[0.015, 0.021, -0.004]} rotation-y={-0.08} castShadow><boxGeometry args={[0.22, 0.006, 0.14]} /><meshStandardMaterial color={C.postcard3} /></mesh>
        <mesh position={[0, 0.028, 0.002]} castShadow><boxGeometry args={[0.22, 0.005, 0.14]} /><meshStandardMaterial color={C.postcard4} /></mesh>
      </group>

      {/* coffee mug */}
      <group position={[0.55, 0.81, -0.10]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.12, 18]} />
          <meshStandardMaterial color="#e9d8b0" roughness={0.6} />
        </mesh>
        <mesh position={[0.055, 0.06, 0]} rotation-z={Math.PI / 2}>
          <torusGeometry args={[0.028, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#e9d8b0" roughness={0.6} />
        </mesh>
      </group>

      {/* small brass globe on the right edge of the desk */}
      <group position={[-1.00, 0.81, -0.30]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 18]} />
          <meshStandardMaterial color="#412817" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation-z={Math.PI / 2}>
          <torusGeometry args={[0.13, 0.008, 6, 24, Math.PI]} />
          <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.115, 24, 18]} />
          <meshStandardMaterial color="#b58550" roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- wall art: a small postcard pin-board + a framed print --- */
function WallArt() {
  return (
    <group>
      {/* pin board above the desk */}
      <mesh position={[-1.05, 2.05, -2.78]} castShadow>
        <boxGeometry args={[1.1, 0.78, 0.03]} />
        <meshStandardMaterial color="#5a3a1c" roughness={0.85} />
      </mesh>
      {([
        { p: [-1.35, 2.20, -2.76], col: C.postcard1, rot:  0.04, label: 'CAMBRIDGE',  sub: '·  econ' },
        { p: [-0.95, 2.18, -2.76], col: C.postcard2, rot: -0.06, label: 'OXFORD',     sub: '·  inet' },
        { p: [-0.65, 2.25, -2.76], col: C.postcard3, rot:  0.02, label: 'IMPERIAL',   sub: '·  phd' },
        { p: [-1.20, 1.92, -2.76], col: C.postcard4, rot: -0.03, label: 'BOCCONI',    sub: "·  '26" },
        { p: [-0.75, 1.92, -2.76], col: '#d9c290',  rot:  0.07, label: 'LONDON',     sub: '·  home' },
      ] as const).map((pc, i) => (
        <group key={i} position={[pc.p[0], pc.p[1], pc.p[2]]} rotation-z={pc.rot}>
          <mesh castShadow>
            <planeGeometry args={[0.21, 0.14]} />
            <meshStandardMaterial color={pc.col} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 0.020, 0.001]} fontSize={0.024} color="#1a0e07"
                anchorX="center" anchorY="middle" maxWidth={0.18}
                font={undefined} letterSpacing={0.04}>
            {pc.label}
          </Text>
          <Text position={[0, -0.024, 0.001]} fontSize={0.014} color="rgba(26,14,7,0.7)"
                anchorX="center" anchorY="middle" maxWidth={0.18}>
            {pc.sub}
          </Text>
          {/* small pin */}
          <mesh position={[0, 0.055, 0.004]}>
            <sphereGeometry args={[0.008, 8, 6]} />
            <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* a framed atlas-style world-map print on the back wall, right of the pin board */}
      <group position={[1.10, 2.05, -2.78]}>
        {/* gilded frame */}
        <mesh castShadow><boxGeometry args={[1.0, 0.72, 0.04]} /><meshStandardMaterial color="#8c6a2e" metalness={0.4} roughness={0.5} /></mesh>
        {/* pale-ocean paper */}
        <mesh position={[0, 0, 0.022]}><boxGeometry args={[0.92, 0.64, 0.005]} /><meshStandardMaterial color="#ddeef2" roughness={0.9} /></mesh>
        {/* lat/lon grid — thin parallels + meridians */}
        {[-0.22, -0.10, 0.02, 0.14, 0.22].map((y, i) => (
          <mesh key={`h${i}`} position={[0, y, 0.026]}>
            <planeGeometry args={[0.88, 0.004]} />
            <meshStandardMaterial color="#99bfcc" opacity={0.5} transparent />
          </mesh>
        ))}
        {[-0.36, -0.18, 0.00, 0.18, 0.36].map((x, i) => (
          <mesh key={`v${i}`} position={[x, 0, 0.026]}>
            <planeGeometry args={[0.004, 0.60]} />
            <meshStandardMaterial color="#99bfcc" opacity={0.5} transparent />
          </mesh>
        ))}
        {/* simplified continents (rough positional blobs) */}
        {/* Americas */}
        <mesh position={[-0.30,  0.08, 0.028]} scale={[0.7, 1.1, 1]}><circleGeometry args={[0.10, 12]} /><meshStandardMaterial color="#c8a46a" /></mesh>
        <mesh position={[-0.28, -0.08, 0.028]} scale={[0.6, 0.9, 1]}><circleGeometry args={[0.08, 10]} /><meshStandardMaterial color="#c0985e" /></mesh>
        {/* Europe / Africa */}
        <mesh position={[ 0.02,  0.08, 0.028]} scale={[0.6, 0.8, 1]}><circleGeometry args={[0.07, 10]} /><meshStandardMaterial color="#c9a56c" /></mesh>
        <mesh position={[ 0.04, -0.07, 0.028]} scale={[0.7, 1.0, 1]}><circleGeometry args={[0.09, 10]} /><meshStandardMaterial color="#ba9454" /></mesh>
        {/* Asia */}
        <mesh position={[ 0.22,  0.06, 0.028]} scale={[1.4, 0.9, 1]}><circleGeometry args={[0.12, 14]} /><meshStandardMaterial color="#c7a268" /></mesh>
        {/* Australia */}
        <mesh position={[ 0.30, -0.14, 0.028]} scale={[0.8, 0.6, 1]}><circleGeometry args={[0.05, 10]} /><meshStandardMaterial color="#c2974e" /></mesh>
        {/* label */}
        <Text position={[0, -0.29, 0.028]} fontSize={0.038} color="#3a2616" anchorX="center" anchorY="middle">atlas</Text>
      </group>

      {/* a small "network" print to the left of the pin board */}
      <group position={[-2.7, 2.0, -2.78]}>
        <mesh castShadow><boxGeometry args={[0.62, 0.62, 0.04]} /><meshStandardMaterial color="#8c6a2e" metalness={0.4} roughness={0.5} /></mesh>
        <mesh position={[0, 0, 0.022]}><boxGeometry args={[0.56, 0.56, 0.005]} /><meshStandardMaterial color="#1d1813" roughness={0.9} /></mesh>
        {/* dots */}
        {[
          [-0.16, 0.14], [0.10, 0.18], [0.18, -0.05], [-0.10, -0.12], [0.00, 0.00], [-0.20, -0.04], [0.20, 0.10],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.030]}><circleGeometry args={[0.018, 10]} /><meshStandardMaterial color="#e8d8ab" emissive="#e8d8ab" emissiveIntensity={0.2} /></mesh>
        ))}
        {/* edges — quick straight lines between a few of them */}
        {[
          [[-0.16, 0.14], [0.00, 0.00]],
          [[0.10, 0.18], [0.00, 0.00]],
          [[0.18, -0.05], [0.00, 0.00]],
          [[-0.10, -0.12], [0.00, 0.00]],
          [[0.10, 0.18], [0.18, -0.05]],
        ].map(([a, b], i) => {
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const len = Math.hypot(dx, dy);
          const rot = Math.atan2(dy, dx);
          return (
            <mesh key={i} position={[mx, my, 0.028]} rotation-z={rot}>
              <planeGeometry args={[len, 0.005]} />
              <meshStandardMaterial color="#7a6234" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ---------- music corner: record player + unlabelled sleeves
 *  Generic music presence on the right wall — no named artists or
 *  album art. The user can list favourite musicians in plain text on
 *  the /about or /now page; visual reproduction in a curated-collection
 *  context is the line I don't want to cross. */
function MusicWall() {
  const sleeves = ['#7d2418', '#1f3b4a', '#b08230', '#1d1d1d', '#a83a22', '#2d5a3a'];
  return (
    <group position={[3.95, 1.1, -1.3]} rotation-y={-Math.PI / 2}>
      {/* shelf */}
      <mesh position={[0, -0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.04, 0.28]} />
        <meshStandardMaterial color={C.desk} roughness={0.6} />
      </mesh>
      {/* back rail */}
      <mesh position={[0, 0.35, -0.12]}>
        <boxGeometry args={[1.8, 0.7, 0.012]} />
        <meshStandardMaterial color={C.wallShadow} roughness={1} />
      </mesh>

      {/* record player on the left of the shelf */}
      <group position={[-0.55, 0.08, 0]}>
        {/* plinth */}
        <mesh castShadow>
          <boxGeometry args={[0.50, 0.08, 0.40]} />
          <meshStandardMaterial color="#2a1810" roughness={0.6} />
        </mesh>
        {/* platter */}
        <mesh position={[0.04, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.012, 28]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
        {/* the spinning record on top */}
        <mesh position={[0.04, 0.058, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.002, 28]} />
          <meshStandardMaterial color="#0d0a08" roughness={0.5} />
        </mesh>
        {/* small label centre */}
        <mesh position={[0.04, 0.060, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.001, 18]} />
          <meshStandardMaterial color="#c44848" />
        </mesh>
        {/* tonearm */}
        <mesh position={[0.16, 0.05, -0.15]} rotation-y={0.4} castShadow>
          <boxGeometry args={[0.22, 0.018, 0.014]} />
          <meshStandardMaterial color={C.brass} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.22, 0.06, -0.18]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.03, 12]} />
          <meshStandardMaterial color={C.brass} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* a row of unlabelled record sleeves leaning against the rail */}
      {sleeves.map((color, i) => {
        const x = 0.15 + i * 0.12;
        const rot = ((i % 2) - 0.5) * 0.04;
        return (
          <mesh key={i} position={[x, 0.20, 0]} rotation-z={rot} castShadow>
            <boxGeometry args={[0.32, 0.32, 0.010]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- acoustic guitar leaning in the corner -------------------- */
function Guitar() {
  return (
    <group position={[3.5, 0, 0.9]} rotation-z={-0.18} rotation-y={-0.7}>
      {/* body — two rounded discs at slightly different radii to fake a guitar shape */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 18, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial color="#8a4a22" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.20, 0.10, 24]} />
        <meshStandardMaterial color="#7a3f1c" roughness={0.55} />
      </mesh>
      {/* sound hole */}
      <mesh position={[0, 0.42, 0.18]}>
        <circleGeometry args={[0.05, 18]} />
        <meshStandardMaterial color="#1a0e07" />
      </mesh>
      {/* neck */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.07, 0.85, 0.05]} />
        <meshStandardMaterial color="#4a2814" roughness={0.6} />
      </mesh>
      {/* headstock */}
      <mesh position={[0, 1.52, 0]} castShadow>
        <boxGeometry args={[0.12, 0.14, 0.05]} />
        <meshStandardMaterial color="#3a1d0e" roughness={0.6} />
      </mesh>
      {/* strings — six thin lines on the neck */}
      {[-0.025, -0.015, -0.005, 0.005, 0.015, 0.025].map((x, i) => (
        <mesh key={i} position={[x, 0.95, 0.04]}>
          <boxGeometry args={[0.002, 1.55, 0.002]} />
          <meshStandardMaterial color="#d2bd92" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- an open notebook with abstract scribbles ----------------- */
function Notebook() {
  return (
    <group position={[0.55, 0.811, -1.45]} rotation-y={0.12} rotation-x={-Math.PI / 2}>
      {/* left page */}
      <mesh position={[-0.13, 0, 0.003]} castShadow>
        <boxGeometry args={[0.24, 0.32, 0.006]} />
        <meshStandardMaterial color={C.paper} roughness={1} />
      </mesh>
      {/* right page */}
      <mesh position={[ 0.13, 0, 0.003]} castShadow>
        <boxGeometry args={[0.24, 0.32, 0.006]} />
        <meshStandardMaterial color="#f6ecd0" roughness={1} />
      </mesh>
      {/* spine seam */}
      <mesh position={[0, 0, 0.006]}>
        <boxGeometry args={[0.005, 0.32, 0.002]} />
        <meshStandardMaterial color="#a98358" />
      </mesh>
      {/* scribble lines on the left page (no readable text) */}
      {[0.10, 0.04, -0.02, -0.08, -0.14].map((y, i) => (
        <mesh key={i} position={[-0.13, y, 0.008]}>
          <boxGeometry args={[0.18 - (i % 3) * 0.03, 0.006, 0.001]} />
          <meshStandardMaterial color="#3a2616" />
        </mesh>
      ))}
      {/* a doodle on the right page — a small circle and a wavy line */}
      <mesh position={[0.16, 0.10, 0.008]}>
        <ringGeometry args={[0.018, 0.024, 16]} />
        <meshStandardMaterial color="#3a2616" side={THREE.DoubleSide} />
      </mesh>
      {[0.04, -0.02, -0.08, -0.14].map((y, i) => (
        <mesh key={'r' + i} position={[0.10 + (i % 2) * 0.03, y, 0.008]}>
          <boxGeometry args={[0.10 + (i % 2) * 0.04, 0.005, 0.001]} />
          <meshStandardMaterial color="#3a2616" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- gender-fluid pride pin on the pinboard ------------------- */
function GenderFluidPin() {
  /* the gender-fluid pride flag stripe colours: pink / white / purple
     / black / blue. five horizontal stripes, small enough to be a
     pinboard pin. */
  const stripes = ['#ff77a8', '#ffffff', '#b885d7', '#000000', '#1f3aa6'];
  return (
    <group position={[-0.50, 1.96, -2.760]}>
      {/* round backing */}
      <mesh>
        <circleGeometry args={[0.045, 24]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* stripes as small rectangles inside the circle */}
      {stripes.map((c, i) => (
        <mesh key={i} position={[0, 0.024 - i * 0.014, 0.001]}>
          <planeGeometry args={[0.075, 0.012]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      {/* a tiny brass pin head bottom-centre */}
      <mesh position={[0, -0.05, 0.004]}>
        <sphereGeometry args={[0.008, 10, 8]} />
        <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- a small floor lamp in the corner ------------------------ */
function FloorLamp() {
  return (
    <group position={[-3.2, 0, -1.8]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.08, 18]} />
        <meshStandardMaterial color={C.desk} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.7, 12]} />
        <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.78, 0]} castShadow>
        <coneGeometry args={[0.22, 0.30, 18, 1, true]} />
        <meshStandardMaterial color="#e6c89e" emissive="#e6c89e" emissiveIntensity={0.18} side={THREE.DoubleSide} roughness={0.65} />
      </mesh>
      {/* floor lamp fill — warm corner glow */}
      <pointLight position={[0, 1.66, 0]} intensity={1.2} distance={3.5} decay={2} color="#d49158" />
    </group>
  );
}

/* ---------- scene ---------------------------------------------------- */
function Scene({ phase, onMonitorClick, onArrived }: {
  phase: Phase; onMonitorClick: () => void; onArrived: () => void;
}) {
  return (
    <Suspense fallback={null}>
      {/* Lighting: warm late-afternoon study. The banker's lamp is the
          hero point, ambient + hemisphere give the room its base tone,
          and three targeted fills ensure no wall falls into pure black.
          The right wall faces away from the directional so it needs its
          own dedicated fills — that's the pair at x≈3.5. */}
      {/* Ambient is intentionally high because runtime lighting on dark
          materials can't match baked lighting. This is the "floor" —
          keeps walls from going black. Lamp pool still dominates because
          it has intensity 8.5 in a 3.2-unit radius. */}
      <ambientLight intensity={0.45} color="#3d3428" />
      <directionalLight
        position={[-6, 3.5, 0.5]}
        intensity={0.65}
        color="#d8a870"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={16}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* hemisphere gives warm sky tint from above */}
      <hemisphereLight args={['#b09070', '#201008', 0.50]} />
      {/* RIGHT SIDE — the camera looks from x≈2.8 so x>3 is in frame.
          These two fills lift the guitar, music shelf, right wall. */}
      <pointLight position={[3.8, 2.5, 1.2]} intensity={2.0} distance={7.0} decay={2} color="#c8964a" />
      <pointLight position={[3.5, 2.5, -0.8]} intensity={1.20} distance={6.0} decay={2} color="#b88040" />
      {/* window bounce — left wall + floor lamp corner */}
      <pointLight position={[-3.5, 2.2, -0.8]} intensity={0.65} distance={5.5} decay={2} color="#e8b878" />
      {/* overhead fill — ceiling bounce keeps the back wall readable */}
      <pointLight position={[0.5, 3.6, 0.5]}  intensity={0.25} distance={10.0} decay={2} color="#b09060" />
      {/* fog pushed to background only — depth not haze */}
      <fog attach="fog" args={['#140c08', 12, 24]} />

      <Room />
      <Window />
      <Rug />
      <Desk />
      <DeskProps />
      <Notebook />
      <Chair />
      <Monitor phase={phase} onClick={onMonitorClick} />
      <WallArt />
      <GenderFluidPin />
      <MusicWall />
      <Guitar />
      <FloorLamp />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} blur={2.4} far={4.5} />
    </Suspense>
  );
}

/* ---------- boot overlay (CRT screen → terminal → inner site) -------- */
function BootOverlay({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const skipped = useRef(false);

  useEffect(() => {
    const script = [
      { line: 'prashantgarg.os',                                typeMs: 14, pauseMs: 120 },
      { line: '> waking the study  [ ok ]',                     typeMs: 8,  pauseMs: 140 },
      { line: '> mounting research, talks, library  [ ok ]',    typeMs: 8,  pauseMs: 220 },
      { line: '',                                                typeMs: 0,  pauseMs: 80  },
      { line: 'welcome.',                                        typeMs: 40, pauseMs: 360 },
    ];
    let cancelled = false;
    let buf = '';
    async function run() {
      for (const s of script) {
        for (let i = 0; i < s.line.length; i++) {
          if (cancelled || skipped.current) return;
          buf += s.line[i];
          setText(buf);
          await new Promise(r => setTimeout(r, s.typeMs));
        }
        buf += '\n';
        setText(buf);
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

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 380);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <div
      onClick={() => { skipped.current = true; setDone(true); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0E0D0B', color: '#A4D9C5',
        fontFamily: "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh', cursor: 'pointer',
      }}
    >
      <div style={{ width: 'min(92vw, 560px)', padding: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {text}<span style={{ color: '#F9BD2B' }}>▋</span>
        </pre>
        <div style={{ marginTop: 36, fontSize: 11, color: 'rgba(164,217,197,0.45)' }}>
          press any key · click to skip
        </div>
      </div>
    </div>
  );
}

/* ---------- mute button (Henry Heffernan style) ---------------------- */
// SVG icons adapted from Henry Heffernan's portfolio-website (MIT).
// 26.5×26.5 px black square, white icon at 10 px wide.
// States: default opacity 1.0 → hover 0.8 → pressed scale 0.8 / opacity 0.2.
function VolumeOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149.48 122.85" width="10" height="10" fill="#fff">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M149.48,62.67c-1.15,16.31-7.19,28.67-18.4,38.5-3.33,2.92-7.63,3-10.05.29s-1.94-6.62,1.24-9.53c5.68-5.18,10.33-11,12.44-18.54,4.23-15,1.13-28.3-9.75-39.63-1.09-1.13-2.32-2.14-3.38-3.3-2.52-2.75-2.65-6.65-.36-9a6.76,6.76,0,0,1,9.05-.27c9.84,8.43,16.26,18.91,18.37,31.79C149.24,56.64,149.3,60.38,149.48,62.67Z" transform="translate(0 -0.15)"/>
      <path d="M123,61.54a25.75,25.75,0,0,1-8.75,19.53c-2.85,2.56-7,2.71-9.43.29S102.2,74.9,105,72c2.27-2.34,4.46-4.66,4.94-8.08.67-4.66-.48-8.68-4-11.92-1.91-1.75-3.34-3.76-2.87-6.51.41-2.4,1.52-4.35,4-5.19A6.85,6.85,0,0,1,114.19,42,25.77,25.77,0,0,1,123,61.54Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}
function VolumeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 153.1 122.85" width="10" height="10" fill="#fff">
      <path d="M87.87,61.64q0,25.53,0,51c0,4-1.16,7.34-4.91,9.36A7.37,7.37,0,0,1,74.24,121q-13.39-12.1-26.88-24.1c-3.16-2.82-6.26-5.7-9.54-8.38a6.53,6.53,0,0,0-3.7-1.41C27.56,87,21,87.05,14.44,87,5.08,87,.1,82.08,0,72.79Q0,61.08,0,49.38c.07-8.78,5.39-14,14.21-14.05,6.73,0,13.46,0,20.18-.06a5.09,5.09,0,0,0,3.06-1.15q17.58-15.46,35-31.06C75.59.3,78.82-.71,82.75,1S87.83,6,87.85,9.85c.06,13.53,0,27.06,0,40.59Z" transform="translate(0 -0.15)"/>
      <path d="M137.18,62.29c4.61,4.19,9.06,8.13,13.38,12.2,2.66,2.52,3.19,5.58,1.78,8.23-1.8,3.37-6.94,5.37-11.37,1.06q-5.72-5.55-11.43-11.1c-.44-.43-.9-.84-1.95-1.8-4.19,4.33-8.24,8.66-12.45,12.84-3,3-6,3.3-9.23,1.32a6,6,0,0,1-2-8.51,13.79,13.79,0,0,1,2-2.42c4.06-4,8.15-7.92,12.38-12-.54-.56-1-1.06-1.45-1.52-3.8-3.7-7.63-7.38-11.41-11.11-2.75-2.73-3.26-5.5-1.63-8.34,2.31-4,7.53-4.55,11.28-.88,4.24,4.15,8.27,8.5,12.51,12.89,1.06-1,1.56-1.4,2-1.86,3.77-3.74,7.52-7.49,11.31-11.22,2.56-2.52,5.4-3.15,8.26-1.91a6.27,6.27,0,0,1,3.1,8.84,13.16,13.16,0,0,1-2.2,2.75C146,53.72,142,57.66,137.18,62.29Z" transform="translate(0 -0.15)"/>
    </svg>
  );
}

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const [active,   setActive]   = useState(false);
  const [hovering, setHovering] = useState(false);

  const opacity = active ? 0.2 : hovering ? 0.8 : 1.0;
  const scale   = active ? 0.8 : 1.0;

  return (
    <button
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setActive(false); }}
      onMouseDown={e => { e.stopPropagation(); setActive(true); onToggle(); }}
      onMouseUp={() => setActive(false)}
      // mobile
      onTouchStart={e => { e.stopPropagation(); onToggle(); }}
      aria-label={muted ? 'Unmute' : 'Mute'}
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: 26.5,
        height: 26.5,
        background: '#000',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 8,
        boxSizing: 'border-box',
      }}
    >
      <span style={{
        opacity,
        transform: `scale(${scale})`,
        transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
      }}>
        {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
      </span>
    </button>
  );
}

/* ---------- film grain overlay --------------------------------------- */
// A low-res (220×140) noise canvas rendered at ~15 fps and stretched to
// fill the viewport via CSS. mix-blend-mode: soft-light adds photographic
// grain without brightening or darkening the scene — same technique Henry
// Heffernan uses (screen.glsl noise at 12% soft-light opacity).
function GrainOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let id: ReturnType<typeof setInterval>;
    const draw = () => {
      const { width: w, height: h } = canvas;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    id = setInterval(draw, 66); // ~15 fps
    return () => clearInterval(id);
  }, []);
  return (
    <canvas
      ref={ref}
      width={220}
      height={140}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 6,
        mixBlendMode: 'soft-light',
        opacity: 0.09,
        imageRendering: 'pixelated',
      }}
    />
  );
}

/* ---------- programmatic ambient audio ------------------------------- */
// Brown noise through a 380 Hz low-pass filter → believable room hum.
// Volume ramps from 0 → 0.055 over 5 s so it's never jarring.
// Starts only after a user interaction (browser AudioContext policy).
function StudyAudio({ active, muted }: { active: boolean; muted: boolean }) {
  const ctxRef  = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);

  // start on first pointerdown
  useEffect(() => {
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const ac = new AudioContext();
      ctxRef.current = ac;

      // brown noise: integrate white noise for 1/f² power spectrum
      const bufSize = ac.sampleRate * 2;
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      // low-pass: cuts highs, leaves the low room rumble
      const lpf = ac.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 380;
      lpf.Q.value = 0.8;

      // a second, higher filter adds a faint electronics hiss (CRT buzz)
      const hpf = ac.createBiquadFilter();
      hpf.type = 'bandpass';
      hpf.frequency.value = 2800;
      hpf.Q.value = 8.0;
      const hissGain = ac.createGain();
      hissGain.gain.value = 0.008;

      const master = ac.createGain();
      gainRef.current = master;
      master.gain.setValueAtTime(0, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.055, ac.currentTime + 5);

      src.connect(lpf);
      lpf.connect(master);
      src.connect(hpf);
      hpf.connect(hissGain);
      hissGain.connect(master);
      master.connect(ac.destination);
      src.start();
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);

  // respond to active (phase) and muted (user toggle)
  useEffect(() => {
    const g = gainRef.current;
    const ac = ctxRef.current;
    if (!g || !ac) return;
    const target = (active && !muted) ? 0.055 : 0.0;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(target, ac.currentTime + 1.2);
  }, [active, muted]);

  return null;
}

/* ---------- tap hint (mobile-only) ----------------------------------- */
function TapHint() {
  const [visible, setVisible] = useState(true);
  // fade out after 4 s or on first touch
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    const hide = () => { setVisible(false); clearTimeout(t); };
    window.addEventListener('pointerdown', hide, { once: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', hide); };
  }, []);
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '18%', left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, pointerEvents: 'none', zIndex: 10,
    }}>
      {/* pulsing ring */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '1.5px solid rgba(164,217,197,0.55)',
        animation: 'tap-pulse 1.6s ease-out infinite',
      }} />
      <span style={{
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        fontSize: 11, color: 'rgba(164,217,197,0.7)',
        letterSpacing: '0.08em',
        animation: 'tap-fade 1.6s ease-in-out infinite',
      }}>tap the monitor</span>
      <style>{`
        @keyframes tap-pulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          60%  { transform: scale(1.25); opacity: 0.15; }
          100% { transform: scale(0.85); opacity: 0.7; }
        }
        @keyframes tap-fade {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ---------- top-level ------------------------------------------------ */
const SS_PHASE = 'pg_phase';

export default function Study() {
  // if the user navigated away from the desktop and pressed Back,
  // sessionStorage retains 'desktop' so we skip the animation entirely
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === 'undefined') return 'idle';
    try {
      if (sessionStorage.getItem(SS_PHASE) === 'desktop') return 'desktop';
    } catch { /* ignore */ }
    return 'idle';
  });
  // detect touch-only devices (no fine pointer) to show the tap hint
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => { setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches); }, []);

  const handleClick    = () => { if (phase === 'idle') setPhase('dollying'); };
  const handleArrived  = () => { setPhase('booting'); };
  // Boot finishes → show Win95 desktop instead of navigating away
  const handleBootDone = () => { setPhase('desktop'); };
  // User closes the desktop window (×) → back to study idle view
  const handleDesktopClose = () => {
    try { sessionStorage.removeItem(SS_PHASE); } catch { /* ignore */ }
    setPhase('idle');
  };
  const [muted, setMuted] = useState(false);
  // audio is audible only while the 3D scene is the active view
  const audioActive = phase === 'idle' || phase === 'dollying' || phase === 'on-monitor';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1A130A' }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[CAM_IDLE_POS.x, CAM_IDLE_POS.y, CAM_IDLE_POS.z]} fov={34} />
        <CameraRig phase={phase} onArrived={handleArrived} />
        <Scene phase={phase} onMonitorClick={handleClick} onArrived={handleArrived} />
      </Canvas>
      {/* film grain overlay — photographic texture over the 3D canvas */}
      {phase !== 'desktop' && <GrainOverlay />}
      {/* ambient room audio — brown noise + CRT hiss, starts on first click */}
      <StudyAudio active={audioActive} muted={muted} />
      {/* mute toggle — bottom-left, Henry Heffernan style, hidden during Win95 */}
      {phase !== 'desktop' && (
        <MuteButton muted={muted} onToggle={() => setMuted(m => !m)} />
      )}
      {phase === 'idle' && isTouch && <TapHint />}
      {phase === 'booting' && <BootOverlay onDone={handleBootDone} />}
      {phase === 'desktop' && <InnerDesktop onClose={handleDesktopClose} />}
    </div>
  );
}
