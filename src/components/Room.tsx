import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- materials --------------------------------------------------- */
const WOOD_FLOOR  = '#5A4028';   // lifted from near-black to warm walnut
const WALL_BEIGE  = '#D6B98C';   // lifted cream-tan
const WALL_DEEP   = '#A98358';   // softer warm
const WALNUT      = '#5A3E27';   // shelf wood, lighter than before
const BRASS       = '#C99551';
const SHADE_GREEN = '#235C46';
const PAPER_CREAM = '#F1E6C4';
const CARPET_RED  = '#7C2A21';   // Persian rug base
const CARPET_GOLD = '#C8985A';   // Persian rug accent
const CEIL_WARM   = '#9C7A52';
const LEATHER     = '#5E2C1E';

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
        <meshStandardMaterial color={CEIL_WARM} roughness={1} />
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

/* ---------- Persian rug ------------------------------------------------ */
function Rug() {
  return (
    <group position={[0.3, 0.012, 0.6]}>
      {/* outer field */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[5.4, 3.6]} />
        <meshStandardMaterial color={CARPET_RED} roughness={1} />
      </mesh>
      {/* gold border */}
      <mesh position={[0, 0.001, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.65, 1.85, 4, 1]} />
        <meshStandardMaterial color={CARPET_GOLD} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* inner cream medallion */}
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.55, 24]} />
        <meshStandardMaterial color="#E0C58A" roughness={1} />
      </mesh>
      {/* central dark anchor */}
      <mesh position={[0, 0.003, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color="#3A1812" roughness={1} />
      </mesh>
      {/* corner medallions */}
      {[
        [-2.0,  1.2],
        [ 2.0,  1.2],
        [-2.0, -1.2],
        [ 2.0, -1.2],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 0.002, p[1]]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.32, 16]} />
          <meshStandardMaterial color={CARPET_GOLD} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- rolling library ladder ------------------------------------- */
function Ladder() {
  /* leans slightly against the bookshelf wall */
  return (
    <group position={[-6.2, 0, -2.4]} rotation={[0, 0.05, -0.06]}>
      {/* rails */}
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 3.8, 12]} />
          <meshStandardMaterial color={WALNUT} roughness={0.6} metalness={0.05} />
        </mesh>
      ))}
      {/* rungs */}
      {Array.from({ length: 9 }, (_, i) => 0.35 + i * 0.42).map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.56, 10]} />
          <meshStandardMaterial color={WALNUT} roughness={0.6} />
        </mesh>
      ))}
      {/* brass top hardware suggesting a rolling carriage */}
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 3.85, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 16]} />
          <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
      {/* small wheels at the foot */}
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 0.05, 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- oil painting on the back wall ----------------------------- */
function Painting() {
  /* an abstract landscape suggested with stacked colour bands */
  return (
    <group position={[3.4, 3.4, -4.92]}>
      {/* outer gilded frame */}
      <mesh castShadow>
        <boxGeometry args={[1.7, 1.25, 0.08]} />
        <meshStandardMaterial color="#8C6A2E" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* inner relief */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.55, 1.10, 0.02]} />
        <meshStandardMaterial color="#3A2A14" roughness={0.7} />
      </mesh>
      {/* sky band */}
      <mesh position={[0, 0.30, 0.07]}>
        <planeGeometry args={[1.46, 0.45]} />
        <meshStandardMaterial color="#D9A06A" roughness={1} />
      </mesh>
      {/* horizon band */}
      <mesh position={[0, 0.03, 0.07]}>
        <planeGeometry args={[1.46, 0.12]} />
        <meshStandardMaterial color="#7D4A26" roughness={1} />
      </mesh>
      {/* foreground band */}
      <mesh position={[0, -0.27, 0.07]}>
        <planeGeometry args={[1.46, 0.50]} />
        <meshStandardMaterial color="#3A2A18" roughness={1} />
      </mesh>
      {/* tiny suggested moon */}
      <mesh position={[-0.45, 0.40, 0.08]}>
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial color="#F1E1B5" emissive="#F1E1B5" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/* ---------- globe on a brass arc ------------------------------------- */
function Globe({ position = [2.45, 1.04, -1.55] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* wood base */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.06, 24]} />
        <meshStandardMaterial color={WALNUT} roughness={0.55} />
      </mesh>
      {/* brass arc */}
      <mesh position={[0, 0.27, 0]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.20, 0.012, 8, 32, Math.PI]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* globe sphere */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#B98955" roughness={0.7} />
      </mesh>
      {/* a few suggested continents as offset spots */}
      {[
        [0.10, 0.32, 0.10],
        [-0.05, 0.40, 0.13],
        [0.07, 0.20, -0.14],
        [-0.13, 0.27, 0.05],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} scale={[0.05, 0.04, 0.045]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#3D2A14" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- side table + teapot --------------------------------------- */
function SideTable() {
  return (
    <group position={[-3.7, 0, 2.6]}>
      {/* top */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 28]} />
        <meshStandardMaterial color={WALNUT} roughness={0.55} />
      </mesh>
      {/* legs */}
      {[
        [ 0.30, 0.36,  0.00],
        [-0.15, 0.36,  0.26],
        [-0.15, 0.36, -0.26],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.04, 0.72, 10]} />
          <meshStandardMaterial color={WALNUT} roughness={0.6} />
        </mesh>
      ))}
      {/* teapot on top */}
      <Teapot position={[0.05, 0.78, 0.05]} />
      {/* a small stack of books on the table */}
      <mesh position={[-0.18, 0.78, -0.05]} castShadow>
        <boxGeometry args={[0.18, 0.04, 0.24]} />
        <meshStandardMaterial color="#3A1F1F" roughness={0.85} />
      </mesh>
      <mesh position={[-0.18, 0.82, -0.05]} castShadow>
        <boxGeometry args={[0.17, 0.03, 0.23]} />
        <meshStandardMaterial color="#243A2A" roughness={0.85} />
      </mesh>
      <mesh position={[-0.18, 0.85, -0.05]} castShadow>
        <boxGeometry args={[0.18, 0.035, 0.235]} />
        <meshStandardMaterial color="#2D2A4A" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Teapot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* body */}
      <mesh castShadow>
        <sphereGeometry args={[0.12, 24, 18]} />
        <meshStandardMaterial color="#E8DBB6" roughness={0.5} />
      </mesh>
      {/* lid */}
      <mesh position={[0, 0.10, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.025, 18]} />
        <meshStandardMaterial color="#E8DBB6" roughness={0.5} />
      </mesh>
      {/* knob */}
      <mesh position={[0, 0.125, 0]} castShadow>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* spout */}
      <mesh position={[0.11, 0.02, 0]} rotation-z={-0.7} castShadow>
        <cylinderGeometry args={[0.018, 0.03, 0.13, 14]} />
        <meshStandardMaterial color="#E8DBB6" roughness={0.5} />
      </mesh>
      {/* handle */}
      <mesh position={[-0.12, 0.02, 0]} rotation-z={Math.PI / 2} castShadow>
        <torusGeometry args={[0.06, 0.014, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#E8DBB6" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ---------- draped throw blanket on the armchair --------------------- */
function ChairThrow() {
  /* a flat plane bent over the chair's arm; not real cloth, just suggestive */
  return (
    <group position={[-2.5, 0, 1.5]} rotation-y={0.6}>
      {/* over the right arm + dangling */}
      <mesh position={[0.55, 0.85, 0.05]} rotation={[0.12, 0, -0.05]} castShadow>
        <boxGeometry args={[0.22, 0.05, 1.05]} />
        <meshStandardMaterial color="#C49157" roughness={0.95} />
      </mesh>
      <mesh position={[0.66, 0.70, 0.20]} rotation={[0, 0, -1.45]} castShadow>
        <boxGeometry args={[0.55, 0.04, 0.35]} />
        <meshStandardMaterial color="#C49157" roughness={0.95} />
      </mesh>
      {/* a folded edge on the seat */}
      <mesh position={[0.10, 0.65, 0.30]} rotation={[0.04, 0.3, 0]} castShadow>
        <boxGeometry args={[0.70, 0.05, 0.45]} />
        <meshStandardMaterial color="#A8773F" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ---------- camera rig: wide establishing + mouse parallax ------------ */
const BASE_POS = new THREE.Vector3(6.5, 3.2, 5.6);
const BASE_TGT = new THREE.Vector3(0.5, 1.6, -1.0);

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef(BASE_TGT.clone());

  useEffect(() => {
    function onMove(e: PointerEvent) {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    function onLeave() { mouse.current.x = 0; mouse.current.y = 0; }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  useFrame(() => {
    /* push the camera slightly opposite to the mouse to create a 'look around' parallax */
    const wantX = BASE_POS.x - mouse.current.x * 0.55;
    const wantY = BASE_POS.y + mouse.current.y * 0.35;
    const wantZ = BASE_POS.z;
    camera.position.x += (wantX - camera.position.x) * 0.06;
    camera.position.y += (wantY - camera.position.y) * 0.06;
    camera.position.z += (wantZ - camera.position.z) * 0.06;

    /* and shift the target subtly in the same direction so the room stays anchored */
    const tx = BASE_TGT.x + mouse.current.x * 0.20;
    const ty = BASE_TGT.y - mouse.current.y * 0.10;
    target.current.x += (tx - target.current.x) * 0.08;
    target.current.y += (ty - target.current.y) * 0.08;
    camera.lookAt(target.current);
  });
  return null;
}

/* ---------- scene ------------------------------------------------------ */
function Scene() {
  return (
    <Suspense fallback={null}>
      {/* lifted ambient so shadows are no longer murky */}
      <ambientLight intensity={0.55} color="#F8D6A2" />
      {/* late-afternoon sun, brighter and warmer */}
      <directionalLight
        position={[7, 5, 2.5]}
        intensity={1.45}
        color="#FFC07A"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={22}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {/* a sky-bounce fill from above so the ceiling and walls don't go flat */}
      <hemisphereLight args={['#FFE8B8', '#3A2A18', 0.55]} />
      {/* warm fill from behind the camera */}
      <pointLight position={[2, 3.4, 5.4]} intensity={0.95} color="#FFD89A" distance={14} decay={2} />

      <Floor />
      <Rug />
      <Walls />
      <BookshelfWall />
      <Ladder />
      <Window />
      <Painting />
      <Desk />
      <Globe />
      <Monitor />
      <Lamp />
      <Chair />
      <ChairThrow />
      <SideTable />
      <Dust />
      <ContactShadows position={[0, 0.015, 0]} opacity={0.35} blur={2.6} far={3.5} />
    </Suspense>
  );
}

/* ---------- top-level component --------------------------------------- */
export default function Room() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#3A2614' }}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[BASE_POS.x, BASE_POS.y, BASE_POS.z]} fov={40} />
        <CameraRig />
        <fog attach="fog" args={['#3A2614', 22, 38]} />
        <Scene />
      </Canvas>
    </div>
  );
}
