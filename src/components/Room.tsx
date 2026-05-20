/**
 * Home scene: a small chibi house exterior, Animal Crossing register.
 * Pastel candy palette. Built from primitives + RoundedBox (chamfered) so
 * everything reads as deliberately stylised, not "tried to be realistic".
 * The front door is the click target — clicking it will eventually trigger
 * the boot sequence and reveal the inner site.
 */
import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, RoundedBox, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- model loader with primitive fallback ----------------------
 * Drop CC0 .glb files into /public/models/. If a file isn't there yet
 * (or fails to load), the primitive fallback renders instead — so the
 * scene always shows *something* and quality lifts as assets land.
 * ---------------------------------------------------------------------- */
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { /* swallow — fallback renders */ }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function GLTFInner({ url, recolor }: { url: string; recolor?: Record<string, string> }) {
  const { scene } = useGLTF(url);
  // clone so multiple instances of the same model don't fight over the same tree
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o: any) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mat = o.material as THREE.MeshStandardMaterial;
      if (recolor && mat?.name && recolor[mat.name]) {
        const next = mat.clone();
        // strip textures so the override colour shows cleanly
        next.map = null;
        next.normalMap = null;
        next.metalnessMap = null;
        next.roughnessMap = null;
        next.aoMap = null;
        next.color = new THREE.Color(recolor[mat.name]);
        next.flatShading = true;
        next.metalness = 0;
        next.roughness = 0.95;
        next.needsUpdate = true;
        o.material = next;
      }
    });
    return s;
  }, [scene, recolor]);
  return <primitive object={cloned} />;
}

function Model({ url, fallback, modelScale = 1, modelY = 0, recolor }: {
  url: string;
  fallback: ReactNode;
  modelScale?: number;
  modelY?: number;
  recolor?: Record<string, string>;
}) {
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <group scale={[modelScale, modelScale, modelScale]} position={[0, modelY, 0]}>
          <GLTFInner url={url} recolor={recolor} />
        </group>
      </Suspense>
    </ModelErrorBoundary>
  );
}

/* ---------- palette (pastel candy) ------------------------------------ */
const C = {
  sky:        '#AEDDEF',
  skyTop:     '#7FC6E5',
  ground:     '#B5DD9A',
  grass:      '#8FCB7C',
  pathStone:  '#F1E3BD',
  body:       '#FCE6A8',  // butter walls
  bodyTrim:   '#F5C26F',
  roof:       '#A4DDC5',  // mint roof
  roofTrim:   '#6FB89B',
  door:       '#FF9EC0',  // pink door
  doorTrim:   '#C45C82',
  knob:       '#FFD66D',
  window:     '#C0E5F3',
  windowFrame:'#FFFFFF',
  chimney:    '#E48267',
  smoke:      '#FFFFFF',
  trunk:      '#A07550',
  leaves:     '#B5E0A1',
  leavesDark: '#8FC885',
  bush:       '#8FC988',
  flowerPink: '#FF9EC9',
  flowerYel:  '#FFE08A',
  flowerRed:  '#FF7A7A',
  mailbox:    '#B788E0',
  flag:       '#FF6B6B',
  sign:       '#FFFAEC',
  fence:      '#FFFFFF',
  cloud:      '#FFFFFF',
};

/* ---------- camera rig: 3/4 on the house + mouse parallax ------------- */
const CAM_POS = new THREE.Vector3(4.0, 2.8, 5.0);
const CAM_TGT = new THREE.Vector3(0.0, 1.2, 0.0);

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const tgt = useRef(CAM_TGT.clone());

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
    const wantX = CAM_POS.x - mouse.current.x * 0.45;
    const wantY = CAM_POS.y + mouse.current.y * 0.28;
    camera.position.x += (wantX - camera.position.x) * 0.06;
    camera.position.y += (wantY - camera.position.y) * 0.06;
    const tx = CAM_TGT.x + mouse.current.x * 0.15;
    const ty = CAM_TGT.y - mouse.current.y * 0.10;
    tgt.current.x += (tx - tgt.current.x) * 0.08;
    tgt.current.y += (ty - tgt.current.y) * 0.08;
    camera.lookAt(tgt.current);
  });
  return null;
}

/* ---------- ground ---------------------------------------------------- */
function Ground() {
  return (
    <group>
      {/* circular grass island */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color={C.ground} roughness={1} flatShading />
      </mesh>
      {/* darker rim to suggest a hill edge */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <ringGeometry args={[8.9, 9.4, 48]} />
        <meshStandardMaterial color={C.grass} roughness={1} flatShading side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- house ----------------------------------------------------- */
function HouseBody() {
  return (
    <group>
      {/* main box */}
      <RoundedBox args={[2.8, 2.0, 2.4]} radius={0.10} smoothness={4} position={[0, 1.0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.body} roughness={0.9} flatShading />
      </RoundedBox>
      {/* base trim */}
      <RoundedBox args={[2.95, 0.18, 2.55]} radius={0.06} smoothness={3} position={[0, 0.09, 0]} castShadow>
        <meshStandardMaterial color={C.bodyTrim} roughness={0.9} flatShading />
      </RoundedBox>
    </group>
  );
}

function Roof() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.62, 0);
    s.lineTo( 1.62, 0);
    s.lineTo( 0,    1.20);
    s.closePath();
    return s;
  }, []);
  return (
    <>
      <mesh position={[0, 2.0, 1.25]} rotation-x={Math.PI / 2} castShadow>
        <extrudeGeometry args={[shape, { depth: 2.5, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 }]} />
        <meshStandardMaterial color={C.roof} roughness={0.9} flatShading />
      </mesh>
      {/* ridge cap */}
      <mesh position={[0, 3.18, 0]} castShadow>
        <boxGeometry args={[0.16, 0.10, 2.6]} />
        <meshStandardMaterial color={C.roofTrim} roughness={0.9} flatShading />
      </mesh>
    </>
  );
}

function Door({ onEnter }: { onEnter?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = hovered ? 1.05 : 1.0;
    const s = ref.current.scale.x;
    const next = s + (target - s) * Math.min(1, dt * 8);
    ref.current.scale.set(next, next, next);
  });
  return (
    <group
      ref={ref}
      position={[0, 0.75, 1.23]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut={()  => { setHovered(false); document.body.style.cursor = 'default'; }}
      onClick={() => onEnter?.()}
    >
      {/* frame */}
      <RoundedBox args={[0.85, 1.45, 0.05]} radius={0.06} smoothness={3} position={[0, 0, -0.04]} castShadow>
        <meshStandardMaterial color={C.doorTrim} roughness={0.8} flatShading />
      </RoundedBox>
      {/* door */}
      <RoundedBox args={[0.72, 1.32, 0.10]} radius={0.05} smoothness={3} castShadow>
        <meshStandardMaterial color={C.door} roughness={0.7} flatShading />
      </RoundedBox>
      {/* small heart-ish pane */}
      <mesh position={[0, 0.35, 0.055]}>
        <circleGeometry args={[0.10, 18]} />
        <meshStandardMaterial color={C.window} emissive={C.window} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.35, 0.062]}>
        <ringGeometry args={[0.10, 0.115, 18]} />
        <meshStandardMaterial color={C.windowFrame} side={THREE.DoubleSide} />
      </mesh>
      {/* doorknob */}
      <mesh position={[0.24, -0.04, 0.06]}>
        <sphereGeometry args={[0.045, 14, 10]} />
        <meshStandardMaterial color={C.knob} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Window({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.62, 0.62, 0.08]} radius={0.07} smoothness={3} castShadow>
        <meshStandardMaterial color={C.windowFrame} roughness={0.8} flatShading />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.48, 0.48]} />
        <meshStandardMaterial color={C.window} emissive={C.window} emissiveIntensity={0.20} />
      </mesh>
      {/* mullion + sill */}
      <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.50, 0.025, 0.01]} /><meshStandardMaterial color={C.windowFrame} /></mesh>
      <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.025, 0.50, 0.01]} /><meshStandardMaterial color={C.windowFrame} /></mesh>
      <mesh position={[0, -0.36, 0.06]}><boxGeometry args={[0.72, 0.06, 0.04]} /><meshStandardMaterial color={C.bodyTrim} flatShading /></mesh>
      {/* flower box */}
      <mesh position={[0, -0.45, 0.10]} castShadow>
        <boxGeometry args={[0.68, 0.10, 0.12]} />
        <meshStandardMaterial color={C.doorTrim} flatShading />
      </mesh>
      {[-0.20, 0, 0.20].map((x, i) => (
        <group key={i} position={[x, -0.35, 0.16]}>
          <mesh><sphereGeometry args={[0.045, 10, 8]} /><meshStandardMaterial color={[C.flowerPink, C.flowerYel, C.flowerRed][i]} flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}

function Chimney() {
  return (
    <RoundedBox args={[0.34, 0.78, 0.34]} radius={0.05} smoothness={3} position={[0.85, 2.85, -0.4]} castShadow>
      <meshStandardMaterial color={C.chimney} roughness={0.9} flatShading />
    </RoundedBox>
  );
}

function Smoke() {
  const ref = useRef<THREE.Group>(null!);
  const N = 4;
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.children.forEach((p) => {
      p.position.y += dt * 0.25;
      const s = (p.scale.x as number) + dt * 0.05;
      p.scale.set(s, s, s);
      const m = (p as any).material as THREE.MeshStandardMaterial;
      if (m) m.opacity = Math.max(0, 0.7 - (p.position.y / 2.6));
      if (p.position.y > 2.6) {
        p.position.y = 0;
        p.scale.setScalar(0.20);
        if (m) m.opacity = 0.7;
      }
    });
  });
  return (
    <group ref={ref} position={[0.85, 3.30, -0.4]}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} position={[0, i * 0.65, 0]} scale={[0.20 + i * 0.05, 0.20 + i * 0.05, 0.20 + i * 0.05]}>
          <sphereGeometry args={[0.30, 14, 10]} />
          <meshStandardMaterial color={C.smoke} transparent opacity={0.65} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function House({ onEnter }: { onEnter?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = hovered ? 1.025 : 1.0;
    const s = ref.current.scale.x;
    const next = s + (target - s) * Math.min(1, dt * 8);
    ref.current.scale.set(next, next, next);
  });
  const primitive = (
    <>
      <HouseBody />
      <Roof />
      <Door onEnter={onEnter} />
      <Window position={[-0.85, 1.25, 1.22]} />
      <Window position={[ 0.85, 1.25, 1.22]} />
      <Chimney />
    </>
  );
  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      onClick={(e) => { e.stopPropagation(); onEnter?.(); }}
    >
      <Model url="/models/house.glb" fallback={primitive} modelScale={0.6} />
      <Smoke />
    </group>
  );
}

/* ---------- plants ---------------------------------------------------- */
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const primitive = (
    <>
      <mesh position={[0, 0.80, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.20, 1.6, 12]} />
        <meshStandardMaterial color={C.trunk} roughness={0.95} flatShading />
      </mesh>
      {[
        [0,     1.85, 0,     0.90, C.leaves],
        [0.50,  2.10, 0,     0.55, C.leavesDark],
        [-0.45, 2.10, 0,     0.55, C.leaves],
        [0,     2.20, 0.45,  0.50, C.leavesDark],
        [0,     2.25, -0.35, 0.50, C.leaves],
        [0.25,  2.50, 0.10,  0.42, C.leaves],
        [-0.20, 2.50, -0.05, 0.40, C.leavesDark],
      ].map(([x, y, z, r, col], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} castShadow>
          <sphereGeometry args={[r as number, 16, 12]} />
          <meshStandardMaterial color={col as string} roughness={0.95} flatShading />
        </mesh>
      ))}
    </>
  );
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <Model
        url="/models/tree.glb"
        fallback={primitive}
        modelScale={0.22}
        recolor={{
          'Bark_NormalTree':   C.trunk,
          'Leaves_NormalTree': C.leaves,
        }}
      />
    </group>
  );
}

function Bush({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const primitive = (
    <>
      {[
        [0,     0.22, 0,     0.27],
        [0.20,  0.18, 0.06,  0.20],
        [-0.18, 0.18, -0.04, 0.22],
        [0.05,  0.32, 0.12,  0.16],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} castShadow>
          <sphereGeometry args={[r as number, 12, 10]} />
          <meshStandardMaterial color={C.bush} roughness={0.95} flatShading />
        </mesh>
      ))}
    </>
  );
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <Model
        url="/models/bush.glb"
        fallback={primitive}
        modelScale={0.22}
        recolor={{
          'Leaves_NormalTree': C.bush,
          'Flowers':           C.flowerPink,
        }}
      />
    </group>
  );
}

function Flower({ position, color }: { position: [number, number, number]; color: string }) {
  const variant =
    color === C.flowerPink ? 'pink' :
    color === C.flowerYel  ? 'yellow' :
    color === C.flowerRed  ? 'red' : 'pink';
  const primitive = (
    <>
      <mesh position={[0, 0.10, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.20, 6]} />
        <meshStandardMaterial color="#7DBA73" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.04, 0.22, Math.sin(a) * 0.04]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        );
      })}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={C.flowerYel} flatShading />
      </mesh>
    </>
  );
  return (
    <group position={position}>
      <Model
        url={`/models/flower-${variant}.glb`}
        fallback={primitive}
        modelScale={0.12}
        recolor={{
          'Leaves':  '#8FCB7C',
          'Flowers': color,
        }}
      />
    </group>
  );
}

/* ---------- path stones (Quaternius Pebble_Round) -------------------- */
function PebbleStone({ position, scale = 1, rotation = 0 }: {
  position: [number, number, number]; scale?: number; rotation?: number;
}) {
  const fb = (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[0.42, 24]} />
      <meshStandardMaterial color={C.pathStone} roughness={1} flatShading />
    </mesh>
  );
  return (
    <group position={position} scale={[scale, scale, scale]} rotation-y={rotation}>
      <Model
        url="/models/pebble.glb"
        fallback={fb}
        modelScale={0.18}
        recolor={{ 'PathRocks': C.pathStone }}
      />
    </group>
  );
}

function Path() {
  const stones: { p: [number, number, number]; s: number; r: number }[] = [
    { p: [ 0.05, 0.02,  3.30], s: 1.0,  r: 0.20 },
    { p: [-0.10, 0.02,  2.65], s: 0.85, r: 1.10 },
    { p: [ 0.10, 0.02,  2.05], s: 1.0,  r: 2.00 },
    { p: [-0.05, 0.02,  1.50], s: 0.90, r: 0.50 },
  ];
  return (
    <>
      {stones.map((s, i) => (
        <PebbleStone key={i} position={s.p} scale={s.s} rotation={s.r} />
      ))}
    </>
  );
}

/* ---------- mushroom (two variants, recoloured) ---------------------- */
function Mushroom({ position, variant = 'a', color, scale = 1 }: {
  position: [number, number, number]; variant?: 'a' | 'b'; color: string; scale?: number;
}) {
  const fb = (
    <mesh position={[0, 0.12, 0]} castShadow>
      <sphereGeometry args={[0.10, 12, 8]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <Model
        url={`/models/mushroom-${variant}.glb`}
        fallback={fb}
        modelScale={0.18}
        recolor={{ 'Mushrooms': color }}
      />
    </group>
  );
}

/* ---------- grass tuft (Quaternius Grass_Wispy_Tall) ----------------- */
function Grass({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const fb = (
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 0.12, 6]} />
      <meshStandardMaterial color="#8FCB7C" />
    </mesh>
  );
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <Model
        url="/models/grass.glb"
        fallback={fb}
        modelScale={0.22}
        recolor={{ 'Grass': '#8FCB7C' }}
      />
    </group>
  );
}

/* ---------- clover patch --------------------------------------------- */
function Clover({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const fb = (
    <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[0.08, 8]} />
      <meshStandardMaterial color="#7DBA73" />
    </mesh>
  );
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <Model
        url="/models/clover.glb"
        fallback={fb}
        modelScale={0.20}
        recolor={{ 'Leaves': '#7DBA73' }}
      />
    </group>
  );
}

/* ---------- mailbox + sign ------------------------------------------- */
function Mailbox() {
  return (
    <group position={[-2.0, 0, 1.6]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.10, 10]} />
        <meshStandardMaterial color={C.trunk} flatShading />
      </mesh>
      <RoundedBox args={[0.36, 0.26, 0.50]} radius={0.10} smoothness={3} position={[0, 1.20, 0]} castShadow>
        <meshStandardMaterial color={C.mailbox} roughness={0.85} flatShading />
      </RoundedBox>
      {/* flag pole */}
      <mesh position={[0.22, 1.28, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.02]} />
        <meshStandardMaterial color={C.flag} />
      </mesh>
      <mesh position={[0.26, 1.35, 0]}>
        <boxGeometry args={[0.14, 0.10, 0.01]} />
        <meshStandardMaterial color={C.flag} flatShading />
      </mesh>
    </group>
  );
}

function Sign() {
  return (
    <group position={[2.0, 0, 2.0]} rotation-y={-0.35}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.05, 0.90, 0.05]} />
        <meshStandardMaterial color={C.trunk} />
      </mesh>
      <RoundedBox args={[0.66, 0.42, 0.05]} radius={0.06} smoothness={3} position={[0, 0.85, 0]} castShadow>
        <meshStandardMaterial color={C.sign} roughness={0.9} flatShading />
      </RoundedBox>
      {/* a couple of strokes hinting at handwriting */}
      <mesh position={[-0.10, 0.93, 0.03]}><boxGeometry args={[0.36, 0.05, 0.005]} /><meshStandardMaterial color={C.trunk} /></mesh>
      <mesh position={[ 0.05, 0.83, 0.03]}><boxGeometry args={[0.42, 0.04, 0.005]} /><meshStandardMaterial color={C.trunk} /></mesh>
    </group>
  );
}

/* ---------- fence (white picket) ------------------------------------- */
function Fence({ angle, radius = 6.5, count = 26 }: { angle: [number, number]; radius?: number; count?: number }) {
  const posts = useMemo(() => {
    const arr: { x: number; z: number; ry: number }[] = [];
    const [a0, a1] = angle;
    for (let i = 0; i <= count; i++) {
      const t = a0 + (a1 - a0) * (i / count);
      arr.push({ x: Math.cos(t) * radius, z: Math.sin(t) * radius, ry: -t + Math.PI / 2 });
    }
    return arr;
  }, [angle, radius, count]);
  return (
    <>
      {posts.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation-y={p.ry}>
          <mesh position={[0, 0.30, 0]} castShadow>
            <boxGeometry args={[0.06, 0.60, 0.04]} />
            <meshStandardMaterial color={C.fence} flatShading />
          </mesh>
          {/* picket point */}
          <mesh position={[0, 0.66, 0]} castShadow>
            <coneGeometry args={[0.045, 0.10, 4]} />
            <meshStandardMaterial color={C.fence} flatShading />
          </mesh>
        </group>
      ))}
      {/* horizontal rails (approximated by short bars between adjacent posts) */}
      {posts.slice(0, -1).map((p, i) => {
        const n = posts[i + 1];
        const mx = (p.x + n.x) / 2;
        const mz = (p.z + n.z) / 2;
        const dx = n.x - p.x;
        const dz = n.z - p.z;
        const len = Math.hypot(dx, dz);
        const ry = -Math.atan2(dz, dx);
        return (
          <mesh key={'r' + i} position={[mx, 0.40, mz]} rotation-y={ry}>
            <boxGeometry args={[len, 0.05, 0.025]} />
            <meshStandardMaterial color={C.fence} flatShading />
          </mesh>
        );
      })}
    </>
  );
}

/* ---------- cloud ---------------------------------------------------- */
function Cloud({ position, scale = 1, speed = 0.02 }: { position: [number, number, number]; scale?: number; speed?: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { if (ref.current) ref.current.position.x += dt * speed; if (ref.current && ref.current.position.x > 14) ref.current.position.x = -14; });
  return (
    <group ref={ref} position={position} scale={[scale, scale, scale]}>
      {[
        [0,    0, 0,   0.55],
        [0.7, -0.05, 0, 0.40],
        [-0.6, -0.05, 0, 0.40],
        [0.3,  0.10, 0, 0.38],
        [-0.2, 0.12, 0, 0.36],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[r as number, 16, 12]} />
          <meshStandardMaterial color={C.cloud} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- sky (gradient backdrop) ---------------------------------- */
function Sky() {
  const tex = useMemo(() => {
    const cnv = document.createElement('canvas');
    cnv.width = 2; cnv.height = 256;
    const ctx = cnv.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0,    C.skyTop);
    g.addColorStop(0.65, C.sky);
    g.addColorStop(1,    '#E8F4FA');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh scale={[80, 80, 80]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

/* ---------- butterflies ---------------------------------------------- */
function Butterfly({ origin, color }: { origin: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const left = useRef<THREE.Mesh>(null!);
  const right = useRef<THREE.Mesh>(null!);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase;
    if (ref.current) {
      ref.current.position.set(
        origin[0] + Math.sin(t * 0.6) * 0.6,
        origin[1] + Math.cos(t * 0.8) * 0.2,
        origin[2] + Math.cos(t * 0.5) * 0.5,
      );
      ref.current.rotation.y = Math.sin(t * 0.7);
    }
    const flap = Math.sin(t * 18) * 0.7;
    if (left.current)  left.current.rotation.y  =  flap;
    if (right.current) right.current.rotation.y = -flap;
  });
  return (
    <group ref={ref}>
      <mesh ref={left} position={[-0.04, 0, 0]}>
        <planeGeometry args={[0.10, 0.08]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh ref={right} position={[0.04, 0, 0]}>
        <planeGeometry args={[0.10, 0.08]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  );
}

/* ---------- scene ----------------------------------------------------- */
function Scene({ onEnter }: { onEnter?: () => void }) {
  return (
    <Suspense fallback={null}>
      <Sky />
      <ambientLight intensity={0.8} color="#FFF6E0" />
      <hemisphereLight args={['#FFFFFF', '#8FCB7C', 0.55]} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.10}
        color="#FFF1C8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={28}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      <Ground />
      <Path />
      <House onEnter={onEnter} />

      <Tree position={[ 3.0, 0, -1.5]} scale={1.05} />
      <Tree position={[-3.2, 0, -1.0]} scale={0.85} />
      <Tree position={[-3.6, 0,  2.2]} scale={0.70} />

      <Bush position={[ 1.7, 0, 1.6]} scale={1.0} />
      <Bush position={[ 2.0, 0, 0.8]} scale={0.85} />
      <Bush position={[-1.8, 0, 0.6]} scale={1.0} />
      <Bush position={[-2.1, 0, 2.3]} scale={0.85} />

      <Flower position={[ 1.2, 0,  2.4]} color={C.flowerPink} />
      <Flower position={[ 1.5, 0,  2.7]} color={C.flowerYel} />
      <Flower position={[-1.3, 0,  2.5]} color={C.flowerRed} />
      <Flower position={[-1.6, 0,  2.0]} color={C.flowerPink} />
      <Flower position={[ 0.8, 0, -2.0]} color={C.flowerYel} />
      <Flower position={[-0.7, 0, -2.2]} color={C.flowerPink} />

      {/* mushrooms at the tree bases */}
      <Mushroom position={[ 3.30, 0, -1.85]} variant="a" color={C.flowerPink} />
      <Mushroom position={[ 3.50, 0, -1.15]} variant="b" color={C.flowerYel} scale={0.9} />
      <Mushroom position={[-3.45, 0, -0.65]} variant="a" color={C.flowerRed} scale={0.85} />
      <Mushroom position={[-3.40, 0,  2.55]} variant="b" color={C.flowerPink} />

      {/* grass tufts scattered across the lawn */}
      <Grass position={[ 2.30, 0,  1.95]} scale={1.0} />
      <Grass position={[-2.10, 0,  1.60]} scale={1.2} />
      <Grass position={[ 1.70, 0,  3.05]} scale={0.8} />
      <Grass position={[-1.10, 0, -2.55]} scale={0.9} />
      <Grass position={[ 3.30, 0,  0.90]} scale={1.0} />
      <Grass position={[-2.90, 0,  0.50]} scale={0.85} />
      <Grass position={[ 2.80, 0,  2.55]} scale={0.75} />
      <Grass position={[-0.90, 0,  3.10]} scale={1.0} />

      {/* clover patches as ground detail */}
      <Clover position={[ 1.30, 0,  2.75]} />
      <Clover position={[-1.40, 0,  2.65]} scale={1.1} />
      <Clover position={[ 2.10, 0, -1.50]} />
      <Clover position={[-2.20, 0, -1.20]} scale={0.9} />
      <Clover position={[ 0.65, 0, -3.05]} />
      <Clover position={[-0.50, 0,  3.50]} scale={1.0} />

      <Mailbox />
      <Sign />

      {/* a soft picket fence behind the house */}
      <Fence angle={[Math.PI * 0.6, Math.PI * 1.4]} radius={5.8} count={22} />

      <Cloud position={[-5, 6.0,  -8]} scale={1.0} speed={0.04} />
      <Cloud position={[ 4, 7.0, -10]} scale={1.3} speed={0.025} />
      <Cloud position={[ 8, 5.5,  -7]} scale={0.8} speed={0.05} />

      <Butterfly origin={[ 1.6, 1.1, 2.5]} color={C.flowerPink} />
      <Butterfly origin={[-1.6, 1.0, 2.0]} color={C.flowerYel} />

      <ContactShadows position={[0, 0.005, 0]} opacity={0.30} blur={2.4} far={4} />
    </Suspense>
  );
}

/* ---------- boot overlay (door click → terminal typing) -------------- */
function BootOverlay({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const skipped = useRef(false);

  useEffect(() => {
    const script = [
      { line: 'prashantgarg.org · v2.0',       typeMs: 22, pauseMs: 220 },
      { line: 'booting…',                       typeMs: 38, pauseMs: 260 },
      { line: '> mounting research      [ ok ]',typeMs: 14, pauseMs: 90  },
      { line: '> mounting talks         [ ok ]',typeMs: 14, pauseMs: 90  },
      { line: '> mounting library       [ ok ]',typeMs: 14, pauseMs: 90  },
      { line: '> warming the kettle     [ ok ]',typeMs: 14, pauseMs: 140 },
      { line: '',                                typeMs: 0,  pauseMs: 220 },
      { line: 'welcome, prashant.',              typeMs: 55, pauseMs: 600 },
    ];

    let cancelled = false;
    let buf = '';

    async function run() {
      for (const step of script) {
        for (let i = 0; i < step.line.length; i++) {
          if (cancelled || skipped.current) return;
          buf += step.line[i];
          setText(buf);
          await new Promise(r => setTimeout(r, step.typeMs));
        }
        buf += '\n';
        setText(buf);
        if (cancelled || skipped.current) return;
        await new Promise(r => setTimeout(r, step.pauseMs));
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
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <div
      onClick={() => { skipped.current = true; setDone(true); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0E0D0B', color: '#E8E0CB',
        fontFamily: "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', cursor: 'pointer',
        animation: done ? 'bootFade 600ms ease forwards' : 'none',
      }}
    >
      <div style={{ width: 'min(92vw, 560px)', padding: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {text}<span style={{ color: '#F9BD2B' }}>▋</span>
        </pre>
        <div style={{ marginTop: 36, fontSize: 11, color: 'rgba(232,224,203,0.35)' }}>
          press any key · click to skip
        </div>
      </div>
      <style>{`@keyframes bootFade { to { opacity: 0; } }`}</style>
    </div>
  );
}

/* ---------- top-level component --------------------------------------- */
export default function Room() {
  const [entering, setEntering] = useState(false);
  const handleEnter = () => setEntering(true);
  const handleBootDone = () => setEntering(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.sky }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[CAM_POS.x, CAM_POS.y, CAM_POS.z]} fov={36} />
        <CameraRig />
        <Scene onEnter={handleEnter} />
      </Canvas>
      {entering && <BootOverlay onDone={handleBootDone} />}
    </div>
  );
}
