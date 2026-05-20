import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- materials --------------------------------------------------- */
const WOOD_FLOOR  = '#2E1F12';
const WALL_BEIGE  = '#A88963';
const WALL_DEEP   = '#6E5235';
const WALNUT      = '#3A2618';
const BRASS       = '#B88643';
const SHADE_GREEN = '#1F4D3A';
const PAPER_CREAM = '#E8DBB6';

/* ---------- floor ------------------------------------------------------- */
function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial color={WOOD_FLOOR} roughness={0.85} metalness={0.0} />
    </mesh>
  );
}

/* ---------- walls + ceiling -------------------------------------------- */
function Walls() {
  return (
    <group>
      {/* back wall */}
      <mesh position={[0, 3, -5]} receiveShadow>
        <planeGeometry args={[22, 6]} />
        <meshStandardMaterial color={WALL_BEIGE} roughness={1} />
      </mesh>
      {/* left wall (we'll cover with bookshelves) */}
      <mesh position={[-7, 3, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color={WALL_DEEP} roughness={1} />
      </mesh>
      {/* right wall */}
      <mesh position={[7, 3, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color={WALL_BEIGE} roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh position={[0, 6, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[22, 12]} />
        <meshStandardMaterial color="#5d4530" roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- bookshelf wall (the library nook signature) --------------- */
function BookshelfWall() {
  /* shelves: 5 rows. each row holds 24 varied book spines. */
  const palette = useMemo(
    () => ['#5C2D1F', '#3B2A14', '#243A2A', '#2D2A4A', '#5A4421', '#3A1F1F', '#22344A', '#4A3320', '#36223A'],
    [],
  );

  const shelves: number[] = [0.4, 1.4, 2.4, 3.4, 4.4]; // y positions
  const SHELF_W = 9.4; // along z
  const SHELF_X = -6.85; // just in front of left wall

  function Books({ y }: { y: number }) {
    const seed = y * 17.3;
    const books: { z: number; w: number; h: number; lean: number; color: string }[] = [];
    let z = -SHELF_W / 2 + 0.12;
    let i = 0;
    while (z < SHELF_W / 2 - 0.12) {
      const r1 = ((Math.sin(seed + i * 3.13) + 1) / 2);
      const r2 = ((Math.sin(seed + i * 7.91) + 1) / 2);
      const r3 = ((Math.sin(seed + i * 1.77) + 1) / 2);
      const w = 0.08 + r1 * 0.06;
      const h = 0.55 + r2 * 0.25;
      const lean = (r3 - 0.5) * 0.12; // tilt some books
      const color = palette[(i + Math.floor(seed * 11)) % palette.length];
      books.push({ z: z + w / 2, w, h, lean, color });
      z += w + 0.005;
      i++;
    }
    return (
      <>
        {books.map((b, idx) => (
          <mesh
            key={idx}
            position={[SHELF_X + 0.2, y + b.h / 2, b.z]}
            rotation-x={b.lean}
            castShadow
          >
            <boxGeometry args={[0.28, b.h, b.w]} />
            <meshStandardMaterial color={b.color} roughness={0.85} />
          </mesh>
        ))}
      </>
    );
  }

  return (
    <group>
      {/* shelf planks */}
      {shelves.map((y, i) => (
        <mesh key={i} position={[SHELF_X, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.05, SHELF_W + 0.3]} />
          <meshStandardMaterial color={WALNUT} roughness={0.75} />
        </mesh>
      ))}
      {/* vertical posts */}
      {[-SHELF_W / 2 - 0.05, SHELF_W / 2 + 0.05].map((z, i) => (
        <mesh key={i} position={[SHELF_X, 2.5, z]} castShadow>
          <boxGeometry args={[0.6, 5, 0.1]} />
          <meshStandardMaterial color={WALNUT} roughness={0.75} />
        </mesh>
      ))}
      {/* back panel */}
      <mesh position={[SHELF_X - 0.32, 2.5, 0]} castShadow>
        <boxGeometry args={[0.04, 5, SHELF_W]} />
        <meshStandardMaterial color="#1F1208" roughness={1} />
      </mesh>
      {/* books per shelf */}
      {shelves.map((y, i) => <Books key={i} y={y} />)}
    </group>
  );
}

/* ---------- desk -------------------------------------------------------- */
function Desk() {
  return (
    <group position={[1.5, 0, -1.5]}>
      {/* top */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.08, 1.6]} />
        <meshStandardMaterial color={WALNUT} roughness={0.55} />
      </mesh>
      {/* legs */}
      {[
        [-1.45, 0.5, -0.7],
        [ 1.45, 0.5, -0.7],
        [-1.45, 0.5,  0.7],
        [ 1.45, 0.5,  0.7],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.12, 1.0, 0.12]} />
          <meshStandardMaterial color={WALNUT} roughness={0.7} />
        </mesh>
      ))}
      {/* paper stack on desk */}
      <mesh position={[-1.0, 1.07, 0.3]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.45]} />
        <meshStandardMaterial color={PAPER_CREAM} roughness={1} />
      </mesh>
      <mesh position={[-1.05, 1.105, 0.25]} rotation-y={0.12} castShadow>
        <boxGeometry args={[0.55, 0.02, 0.42]} />
        <meshStandardMaterial color="#F0E5C2" roughness={1} />
      </mesh>
      {/* coffee mug */}
      <mesh position={[1.1, 1.18, 0.45]} castShadow>
        <cylinderGeometry args={[0.09, 0.085, 0.22, 24]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.6} />
      </mesh>
      <mesh position={[1.21, 1.18, 0.45]} castShadow>
        <torusGeometry args={[0.06, 0.018, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- monitor (CRT-ish portal to inner OS) ----------------------- */
function Monitor() {
  return (
    <group position={[1.5, 1.04, -2.0]}>
      {/* base */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.7, 0.1, 0.4]} />
        <meshStandardMaterial color="#3A332B" roughness={0.7} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshStandardMaterial color="#3A332B" roughness={0.7} />
      </mesh>
      {/* body */}
      <mesh position={[0, 0.65, -0.05]} castShadow>
        <boxGeometry args={[1.5, 1.0, 0.95]} />
        <meshStandardMaterial color="#D8C49E" roughness={0.6} />
      </mesh>
      {/* screen bezel (slightly inset) */}
      <mesh position={[0, 0.65, 0.43]}>
        <boxGeometry args={[1.32, 0.85, 0.04]} />
        <meshStandardMaterial color="#1F1A14" roughness={0.4} />
      </mesh>
      {/* glowing screen surface */}
      <mesh position={[0, 0.65, 0.46]}>
        <planeGeometry args={[1.18, 0.74]} />
        <meshStandardMaterial
          color="#0E160D"
          emissive="#1B7A4E"
          emissiveIntensity={0.65}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/* ---------- library lamp (banker's lamp) ------------------------------ */
function Lamp() {
  return (
    <group position={[-0.4, 1.04, -1.6]}>
      {/* base disc */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.06, 24]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* upright */}
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 16]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* shade */}
      <mesh position={[0, 0.55, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.6, 24, 1, true]} />
        <meshStandardMaterial
          color={SHADE_GREEN}
          roughness={0.55}
          side={THREE.DoubleSide}
          emissive={SHADE_GREEN}
          emissiveIntensity={0.18}
        />
      </mesh>
      {/* warm bulb light inside the shade */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={4.5}
        distance={5.5}
        decay={2}
        color="#FFB870"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </group>
  );
}

/* ---------- reading chair (suggestive, low-poly) ---------------------- */
function Chair() {
  return (
    <group position={[-2.5, 0, 1.5]} rotation-y={0.6}>
      {/* seat cushion */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.1, 0.25, 1.0]} />
        <meshStandardMaterial color="#5A2E20" roughness={0.85} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 1.1, -0.4]} castShadow>
        <boxGeometry args={[1.1, 1.1, 0.2]} />
        <meshStandardMaterial color="#4F2818" roughness={0.85} />
      </mesh>
      {/* arms */}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.8, 0]} castShadow>
          <boxGeometry args={[0.12, 0.4, 1.0]} />
          <meshStandardMaterial color="#4F2818" roughness={0.85} />
        </mesh>
      ))}
      {/* feet */}
      {[
        [-0.45, 0.18, -0.4],
        [ 0.45, 0.18, -0.4],
        [-0.45, 0.18,  0.4],
        [ 0.45, 0.18,  0.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.1, 0.36, 0.1]} />
          <meshStandardMaterial color="#1F140C" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- window with warm beam -------------------------------------- */
function Window() {
  /* a tall window on the right wall, with warm directional light coming in */
  return (
    <group position={[6.95, 3, 1.5]} rotation-y={-Math.PI / 2}>
      <mesh>
        <planeGeometry args={[2.4, 3.2]} />
        <meshStandardMaterial color="#F2C078" emissive="#F2C078" emissiveIntensity={0.45} />
      </mesh>
      {/* muntin cross */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[2.4, 0.04, 0.02]} />
        <meshStandardMaterial color={WALNUT} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.04, 3.2, 0.02]} />
        <meshStandardMaterial color={WALNUT} />
      </mesh>
    </group>
  );
}

/* ---------- floating dust motes --------------------------------------- */
function Dust() {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(140 * 3);
    for (let i = 0; i < 140; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = Math.random() * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);
  useFrame((s, dt) => {
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * 0.04;
      if (arr[i + 1] > 5) arr[i + 1] = 0;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#F3D9A3" size={0.025} sizeAttenuation transparent opacity={0.65} />
    </points>
  );
}

/* ---------- scene ------------------------------------------------------ */
function Scene() {
  return (
    <Suspense fallback={null}>
      {/* warm ambient */}
      <ambientLight intensity={0.18} color="#F4C58A" />
      {/* late-afternoon sun through the right window */}
      <directionalLight
        position={[7, 4.5, 2]}
        intensity={0.55}
        color="#F2A560"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* fill from behind the camera */}
      <pointLight position={[2, 3, 5]} intensity={0.55} color="#FFD8A0" distance={12} decay={2} />

      <Floor />
      <Walls />
      <BookshelfWall />
      <Window />
      <Desk />
      <Monitor />
      <Lamp />
      <Chair />
      <Dust />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.45} blur={2.4} far={3} />
    </Suspense>
  );
}

/* ---------- top-level component --------------------------------------- */
export default function Room() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#13100B' }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[5.6, 2.6, 4.2]} fov={42} />
        <OrbitControls
          target={[1.2, 1.6, -1]}
          maxPolarAngle={Math.PI * 0.5}
          minDistance={3}
          maxDistance={11}
          enablePan={false}
        />
        <fog attach="fog" args={['#1A130A', 12, 22]} />
        <Scene />
      </Canvas>
    </div>
  );
}
