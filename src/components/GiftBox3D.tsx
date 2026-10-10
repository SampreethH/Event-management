"use client";

import {
  AdaptiveDpr,
  Billboard,
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  PerformanceMonitor,
  PresentationControls,
  RoundedBox,
} from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mulberry32 } from "@/components/three/capability";

/**
 * "Happy Everything" gift box — the hero centrepiece.
 *
 * Navy satin box with gold bands, lid swung almost upright, treats floating in an
 * arc above the opening (cake slice, cookies, macarons) with ribboned presents
 * peeking out, glossy translucent balloons, multicolour confetti and a lavender
 * glow pooled beneath. Procedural throughout; the only asset is the self-hosted
 * city HDRI on the high tier.
 */

// Proportions taken from the reference: a low, wide base (≈0.55 h/w) and a deep tray lid.
const W = 1.8;
const H = 1.0;
const D = 1.8;
const WALL = 0.06;
const LID_H = 0.26;
const LID_OPEN = -2.2; // leaning well back (≈35° past vertical) so the inner face tips toward the viewer
const RIBBON_W = 0.17;

const GOLD = "#F5D061";
const LAVENDER = "#A78BFA";

export interface GiftBox3DProps {
  open: boolean;
  onToggle?: () => void;
  quality: "high" | "low";
  active?: boolean;
  still?: boolean;
  onFallback?: () => void;
  /** Keeps the drawing buffer so the frame can be exported (static asset generation). */
  capture?: boolean;
}

// ─── Textures ───────────────────────────────────────────────────────────────

type Painter = (ctx: CanvasRenderingContext2D) => void;

/** Paints a module-level drawing function into a canvas texture once. */
function useCanvasTexture(draw: Painter, w: number, h: number, srgb = true) {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [draw, w, h, srgb]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/**
 * Front-face print: upright gold "Happy Everything" in the lower-left, with a
 * glitter spray drifting off to the right and down, as in the reference.
 */
const drawStamp: Painter = (ctx) => {
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-satoshi").trim() || "sans-serif";
  const foil = ctx.createLinearGradient(0, 300, 0, 420);
  foil.addColorStop(0, "#F9E29A");
  foil.addColorStop(1, "#C99A2E");
  ctx.fillStyle = foil;
  ctx.textBaseline = "middle";
  ctx.font = `500 98px ${font}`;
  ctx.fillText("Happy Everything", 50, 350);
  // Glitter: dense near the text's right end, thinning outward.
  const rand = mulberry32(2024);
  for (let i = 0; i < 380; i++) {
    const t = rand();
    const x = 560 + t * 440 + (rand() - 0.5) * 140;
    const y = 330 + (rand() - 0.2) * 260 * (0.4 + t);
    ctx.globalAlpha = (1 - t * 0.6) * (0.5 + rand() * 0.5);
    ctx.fillStyle = rand() > 0.85 ? "#FFF6D6" : GOLD;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rand() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** Soft lavender radial glow for the floor beneath the box. */
const drawGlow: Painter = (ctx) => {
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, "rgba(167,139,250,0.9)");
  g.addColorStop(0.35, "rgba(139,108,240,0.45)");
  g.addColorStop(1, "rgba(80,60,180,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
};

// ─── Materials ──────────────────────────────────────────────────────────────

function useMaterials() {
  const mats = useMemo(
    () => ({
      // Deep navy-black satin with a cool violet sheen, as in the reference.
      box: new THREE.MeshPhysicalMaterial({ color: "#0D0E1C", roughness: 0.4, metalness: 0.15, clearcoat: 0.4, clearcoatRoughness: 0.4, sheen: 0.5, sheenColor: new THREE.Color("#4A3D9A"), sheenRoughness: 0.45 }),
      inner: new THREE.MeshStandardMaterial({ color: "#07070D", roughness: 0.95 }),
      // Inside of the lid: tipped toward the key light when open, so keep it matte and dark.
      lidInner: new THREE.MeshPhysicalMaterial({ color: "#0E0F20", roughness: 0.75, metalness: 0.05, sheen: 0.4, sheenColor: new THREE.Color("#3B3080") }),
      ribbon: new THREE.MeshPhysicalMaterial({ color: "#E9C25A", metalness: 0.55, roughness: 0.35, clearcoat: 0.5, emissive: new THREE.Color("#8A6418"), emissiveIntensity: 0.3, side: THREE.DoubleSide }),
      tissue: new THREE.MeshPhysicalMaterial({ color: "#E2B84E", metalness: 0.45, roughness: 0.45, flatShading: true, sheen: 0.6, sheenColor: new THREE.Color("#FFF1B8") }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

// ─── Treats ─────────────────────────────────────────────────────────────────

/** Closed cake wedge: an extruded circular sector (cylinder thetaLength leaves the cut faces open). */
function useWedge(radius: number, height: number, angle = Math.PI / 3.6) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(radius, 0);
    shape.absarc(0, 0, radius, 0, angle, false);
    shape.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -height / 2, 0);
    g.computeVertexNormals();
    return g;
  }, [radius, height, angle]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/** Reference slice: cream / red-velvet / cream / red-velvet stack, white frosting, cherry, cut face toward the viewer. */
function CakeSlice() {
  const layer = useWedge(0.46, 0.075);
  const frosting = useWedge(0.47, 0.06);
  const cream = <meshPhysicalMaterial color="#F7EBD6" roughness={0.8} />;
  const red = <meshPhysicalMaterial color="#B5303F" roughness={0.75} />;
  const stack: [number, ReactNode][] = [
    [0, cream],
    [0.075, red],
    [0.15, cream],
    [0.225, red],
  ];
  return (
    <group rotation={[0.2, -2.35, 0.12]}>
      {stack.map(([y, m], i) => (
        <mesh key={i} geometry={layer} position={[0, y, 0]} castShadow>
          {m}
        </mesh>
      ))}
      <mesh geometry={frosting} position={[0, 0.3, 0]}>
        <meshPhysicalMaterial color="#FFF8EE" roughness={0.35} sheen={1} sheenColor="#ffffff" />
      </mesh>
      {/* Cherry on the wedge's mid-line (sector y → -z after the extrude rotation) */}
      <mesh position={[0.3, 0.38, -0.13]} castShadow>
        <sphereGeometry args={[0.055, 20, 20]} />
        <meshPhysicalMaterial color="#D21F3C" roughness={0.12} clearcoat={1} />
      </mesh>
    </group>
  );
}

/** Chocolate-chip cookie shown face-on (always turned toward the camera). */
function Cookie({ seed }: { seed: number }) {
  const chips = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: 7 }, () => {
      const a = r() * Math.PI * 2;
      const d = 0.04 + 0.13 * Math.sqrt(r()); // uniform over the disc, so chips spread out
      return [Math.cos(a) * d, Math.sin(a) * d, 0.035] as [number, number, number];
    });
  }, [seed]);
  return (
    <Billboard>
      <group rotation={[0, 0, seed * 0.3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.19, 0.06, 40]} />
          <meshPhysicalMaterial color="#E2AA62" roughness={0.8} sheen={0.8} sheenColor="#FAD9A2" />
        </mesh>
        {chips.map((p, i) => (
          <mesh key={i} position={p} scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.027, 10, 10]} />
            <meshPhysicalMaterial color="#3A1C0E" roughness={0.35} />
          </mesh>
        ))}
      </group>
    </Billboard>
  );
}

function Macaron({ color }: { color: string }) {
  return (
    <group>
      {[0.06, -0.06].map((y) => (
        <mesh key={y} position={[0, y, 0]} scale={[1, 0.5, 1]} castShadow>
          <sphereGeometry args={[0.19, 32, 20]} />
          <meshPhysicalMaterial color={color} roughness={0.6} sheen={1} sheenColor="#ffffff" sheenRoughness={0.5} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.165, 0.165, 0.06, 32]} />
        <meshPhysicalMaterial color="#FFF6E8" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Present({ color, ribbon, size }: { color: string; ribbon: string; size: number }) {
  const rib = <meshPhysicalMaterial color={ribbon} metalness={ribbon === GOLD ? 0.6 : 0.05} roughness={0.35} clearcoat={0.5} />;
  const h = size * 0.9;
  return (
    <group>
      <RoundedBox args={[size, h, size]} radius={0.03} smoothness={3} castShadow>
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.4} />
      </RoundedBox>
      <mesh>
        <boxGeometry args={[size + 0.008, h + 0.008, size * 0.17]} />
        {rib}
      </mesh>
      <mesh>
        <boxGeometry args={[size * 0.17, h + 0.008, size + 0.008]} />
        {rib}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * size * 0.12, h / 2 + 0.03, 0]} rotation={[Math.PI / 2, s * 0.55, 0]} scale={[1, 0.55, 1]}>
          <torusGeometry args={[size * 0.17, size * 0.045, 10, 24]} />
          {rib}
        </mesh>
      ))}
    </group>
  );
}

/** Crumpled gold tissue: a cluster of flat-shaded low-poly sheets. */
function Tissue({ material }: { material: THREE.Material }) {
  const bits = useMemo(() => {
    const r = mulberry32(11);
    return Array.from({ length: 6 }, () => ({
      p: [(r() - 0.5) * 0.5, r() * 0.04, (r() - 0.5) * 0.3] as [number, number, number],
      rot: [(r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.6] as [number, number, number],
      s: [0.14 + r() * 0.08, 0.018 + r() * 0.015, 0.11 + r() * 0.06] as [number, number, number],
    }));
  }, []);
  return (
    <>
      {bits.map((b, i) => (
        <mesh key={i} position={b.p} rotation={b.rot} scale={b.s} material={material}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </>
  );
}

interface TreatSlot {
  node: ReactNode;
  /** Resting spot inside the box (hidden when closed). */
  from: [number, number, number];
  /** Spot when open — matches the reference composition. */
  to: [number, number, number];
  rot?: [number, number, number];
  bob?: number;
}

function Treats({ open, still }: { open: boolean; still: boolean }) {
  const slots = useMemo<TreatSlot[]>(
    () => [
      // Inside, resting on/among the tissue
      { node: <Present color="#A98AEB" ribbon={GOLD} size={0.46} />, from: [0.15, H * 0.4, 0.4], to: [0.15, H - 0.02, 0.48], rot: [0.12, 0.35, -0.1], bob: 0.3 },
      { node: <Macaron color="#E99A6F" />, from: [-0.55, H * 0.4, 0.3], to: [-0.62, H + 0.02, 0.3], rot: [0.35, 0, -0.15], bob: 0.4 },
      { node: <Present color="#A98AEB" ribbon={GOLD} size={0.32} />, from: [-0.2, H * 0.4, -0.1], to: [-0.22, H + 0.22, -0.12], rot: [0.25, 0.6, 0.2] },
      { node: <Macaron color="#F1AFB3" />, from: [0.2, H * 0.4, -0.3], to: [0.22, H + 0.36, -0.32], rot: [0.3, 0, 0.12] },
      { node: <Present color="#E8B94A" ribbon="#D33A44" size={0.4} />, from: [0.6, H * 0.4, -0.05], to: [0.66, H + 0.12, -0.08], rot: [0.1, -0.3, 0.12] },
      // Floating above
      { node: <CakeSlice />, from: [-0.6, H * 0.4, 0], to: [-1.0, H + 0.95, 0.05], bob: 1 },
      { node: <Cookie seed={3} />, from: [-0.2, H * 0.4, -0.3], to: [-0.18, H + 1.3, -0.35], bob: 1 },
      { node: <Cookie seed={9} />, from: [0.3, H * 0.4, -0.3], to: [0.55, H + 0.98, -0.4], bob: 1 },
    ],
    [],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const progress = useRef(0);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    progress.current = THREE.MathUtils.damp(progress.current, open ? 1 : 0, 2.8, Math.min(dt, 0.05));
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const slot = slots[i]!;
      const local = THREE.MathUtils.clamp((progress.current - 0.2 - i * 0.045) / 0.55, 0, 1);
      const e = 1 - (1 - local) ** 3;
      g.position.lerpVectors(a.set(...slot.from), b.set(...slot.to), e);
      const [rx, ry, rz] = slot.rot ?? [0, 0, 0];
      const amt = (slot.bob ?? 0.5) * e;
      g.rotation.set(rx * e, ry * e, rz * e);
      if (!still) {
        g.position.y += Math.sin(t * 1.1 + i * 1.3) * 0.035 * amt;
        g.rotation.y += Math.sin(t * 0.5 + i) * 0.12 * amt;
      }
      g.scale.setScalar(0.7 + 0.3 * e);
    });
  });

  return (
    <>
      {slots.map((s, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} position={s.from}>
          {s.node}
        </group>
      ))}
    </>
  );
}

// ─── Box ────────────────────────────────────────────────────────────────────

const FACES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

function Box({ open, onToggle, still }: { open: boolean; onToggle?: () => void; still: boolean }) {
  const mats = useMaterials();
  const stamp = useCanvasTexture(drawStamp, 1024, 512);
  const lid = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!lid.current) return;
    lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, open ? LID_OPEN : 0, 3.2, Math.min(dt, 0.05));
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onToggle?.();
  };

  const walls: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [0, WALL / 2, 0], s: [W, WALL, D] },
    { p: [0, H / 2, D / 2 - WALL / 2], s: [W, H, WALL] },
    { p: [0, H / 2, -D / 2 + WALL / 2], s: [W, H, WALL] },
    { p: [W / 2 - WALL / 2, H / 2, 0], s: [WALL, H, D - 2 * WALL] },
    { p: [-W / 2 + WALL / 2, H / 2, 0], s: [WALL, H, D - 2 * WALL] },
  ];
  const LW = W + 0.08;
  const LD = D + 0.08;

  return (
    <group onClick={click} onPointerOver={() => (document.body.style.cursor = "grab")} onPointerOut={() => (document.body.style.cursor = "")}>
      {walls.map((w, i) => (
        <RoundedBox key={i} args={w.s} position={w.p} radius={0.03} smoothness={3} material={mats.box} castShadow receiveShadow />
      ))}
      {/* Dark interior floor */}
      <mesh position={[0, WALL + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.inner}>
        <planeGeometry args={[W - 2 * WALL, D - 2 * WALL]} />
      </mesh>
      {/* Gold tissue tucked under the front present, peeking above the rim */}
      <group position={[0.12, H - 0.08, 0.5]}>
        <Tissue material={mats.tissue} />
      </group>

      {/* Front print (the +z face turns toward the viewer's left) */}
      {stamp && (
        <mesh position={[0, H * 0.42, D / 2 + 0.004]}>
          <planeGeometry args={[W - 0.1, (W - 0.1) / 2]} />
          <meshPhysicalMaterial map={stamp} emissiveMap={stamp} emissive={GOLD} emissiveIntensity={0.45} transparent alphaTest={0.08} metalness={0.5} roughness={0.35} />
        </mesh>
      )}

      <Treats open={open} still={still} />

      {/* Deep tray lid, hinged on the back edge */}
      <group ref={lid} position={[0, H, -D / 2 - 0.04]}>
        <group position={[0, LID_H / 2 - 0.05, D / 2 + 0.04]}>
          <RoundedBox args={[LW, LID_H, LD]} radius={0.04} smoothness={4} material={mats.box} castShadow />
          {/* Inner face of the tray, seen when open */}
          <mesh position={[0, -LID_H / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.lidInner}>
            <planeGeometry args={[LW - 0.04, LD - 0.04]} />
          </mesh>
          {/* Ribbon cross over the top... */}
          {[0, Math.PI / 2].map((rz) => (
            <mesh key={rz} position={[0, LID_H / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, rz]} material={mats.ribbon}>
              <planeGeometry args={[RIBBON_W, LW]} />
            </mesh>
          ))}
          {/* ...wrapping down every lip, which is what shows as gold tabs when the lid stands open */}
          {FACES.map((ry) => (
            <group key={ry} rotation={[0, ry, 0]}>
              <mesh position={[0, 0, LD / 2 + 0.003]} material={mats.ribbon}>
                <planeGeometry args={[RIBBON_W, LID_H]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

// ─── Atmosphere ─────────────────────────────────────────────────────────────

type BalloonKind = "gold" | "violet";
const BALLOONS: { p: [number, number, number]; kind: BalloonKind; s: number }[] = [
  { p: [-1.8, 1.55, -0.6], kind: "violet", s: 0.4 },
  { p: [-0.7, 3.0, -1.4], kind: "gold", s: 0.42 },
  { p: [0.95, 3.3, -2.2], kind: "violet", s: 0.34 },
  { p: [1.8, 2.15, -1.0], kind: "gold", s: 0.42 },
  { p: [2.25, 0.95, -0.4], kind: "violet", s: 0.38 },
];

/** Glossy, slightly translucent latex: strong clearcoat highlight, a touch of thin-film sheen. */
function Balloon({ kind, s }: { kind: BalloonKind; s: number }) {
  const color = kind === "gold" ? "#E8BF55" : "#A47BEA";
  return (
    <group scale={s}>
      <mesh scale={[1, 1.16, 1]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.08}
          metalness={kind === "gold" ? 0.35 : 0.15}
          clearcoat={1}
          clearcoatRoughness={0.04}
          iridescence={0.35}
          iridescenceIOR={1.3}
          emissive={color}
          emissiveIntensity={0.12}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh position={[0, -1.2, 0]}>
        <coneGeometry args={[0.1, 0.15, 12]} />
        <meshStandardMaterial color={kind === "gold" ? "#C99A2E" : "#7C5CE6"} />
      </mesh>
      <mesh position={[0, -2.75, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 2.9, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Balloons({ still }: { still: boolean }) {
  return (
    <>
      {BALLOONS.map((b, i) => (
        <Float key={i} speed={still ? 0 : 0.8 + i * 0.15} rotationIntensity={still ? 0 : 0.2} floatIntensity={still ? 0 : 0.7} floatingRange={[-0.1, 0.1]}>
          <group position={b.p}>
            <Balloon kind={b.kind} s={b.s} />
          </group>
        </Float>
      ))}
    </>
  );
}

const CONFETTI = ["#F5D061", "#F472B6", "#5EEAD4", "#A78BFA", "#FF8A80", "#FFFFFF", "#93C5FD"];

/** Multicolour confetti: instanced paper flakes tumbling slowly around the box. */
function Confetti({ count, still }: { count: number; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const flakes = useMemo(() => {
    const r = mulberry32(count * 13);
    return Array.from({ length: count }, () => {
      // Cluster around the box, thinning outward.
      const ang = r() * Math.PI * 2;
      const rad = 0.6 + r() ** 0.7 * 2.6;
      return {
        x: Math.cos(ang) * rad,
        y: -0.9 + r() * 4.2,
        z: Math.sin(ang) * rad * 0.6 - 0.2,
        w: 0.035 + r() * 0.03,
        h: 0.06 + r() * 0.05,
        spin: (r() - 0.5) * 2.5,
        phase: r() * Math.PI * 2,
        fall: 0.04 + r() * 0.08,
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    flakes.forEach((_, i) => m.setColorAt(i, c.set(CONFETTI[i % CONFETTI.length]!)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [flakes]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = still ? 0 : clock.elapsedTime;
    flakes.forEach((f, i) => {
      const y = (((f.y - t * f.fall + 0.9) % 4.2) + 4.2) % 4.2 - 0.9;
      dummy.position.set(f.x + Math.sin(t * 0.5 + f.phase) * 0.1, y, f.z);
      dummy.rotation.set(t * f.spin + f.phase, t * f.spin * 0.6, f.phase);
      dummy.scale.set(f.w, f.h, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.5} metalness={0.2} emissive="#ffffff" emissiveIntensity={0.08} />
    </instancedMesh>
  );
}

function FloorGlow() {
  const glow = useCanvasTexture(drawGlow, 512, 512, false);
  if (!glow) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.895, 0]}>
      <planeGeometry args={[4.6, 4.6]} />
      <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.75} />
    </mesh>
  );
}

// ─── Lighting ───────────────────────────────────────────────────────────────

function Lights({ quality }: { quality: "high" | "low" }) {
  const high = quality === "high";
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={2}
        color="#FFF2D6"
        castShadow={high}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, 2]} intensity={0.6} color="#DCE3FF" />
      {/* Purple rim tracing the dark edges */}
      <directionalLight position={[-5, 1.5, -5]} intensity={3.5} color="#9A84FF" />
      {/* Lavender up-light from the floor glow */}
      <pointLight position={[0.6, -0.85, 2.6]} intensity={0.6} distance={5} decay={1.6} color={LAVENDER} />
      {high ? (
        // Self-hosted copy of drei's `city` preset (Poly Haven, CC0) — same look, no third-party fetch.
        <Environment files="/hdri/potsdamer_platz_1k.hdr" environmentIntensity={0.5} />
      ) : (
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={2.5} color="#FFF1D6" position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#FFFFFF" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[2, 5, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#9A84FF" position={[-5, 1, -2]} rotation-y={Math.PI / 2} scale={[2, 5, 1]} />
        </Environment>
      )}
    </>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

export default function GiftBox3D({ open, onToggle, quality, active = true, still = false, onFallback, capture = false }: GiftBox3DProps) {
  const high = quality === "high";
  return (
    <Canvas
      shadows={high}
      camera={{ position: [0.3, 4.2, 7.9], fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(0.3, 0.95, 0)}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: high, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: capture }}
      frameloop={active ? "always" : "never"}
      aria-label="Interactive 3D gift box. Drag to spin, tap to open or close."
    >
      {/* If even the low tier can't keep up, hand over to the static image. */}
      <PerformanceMonitor flipflops={3} onFallback={onFallback} />
      <AdaptiveDpr pixelated={false} />
      <Lights quality={quality} />

      <PresentationControls global={false} cursor snap={false} speed={1.2} rotation={[0.02, -0.78, 0]} polar={[-0.2, 0.3]} azimuth={[-Infinity, Infinity]} damping={0.25}>
        <Float speed={still ? 0 : 1.3} rotationIntensity={still ? 0 : 0.1} floatIntensity={still ? 0 : 0.2} floatingRange={[-0.03, 0.03]}>
          <group position={[0, -0.9, 0]}>
            <Box open={open} onToggle={onToggle} still={still} />
          </group>
        </Float>
      </PresentationControls>

      <FloorGlow />
      <ContactShadows position={[0, -0.9, 0]} opacity={0.7} scale={5} blur={2.4} far={2} resolution={high ? 512 : 256} frames={high ? Infinity : 1} />
      <Balloons still={still} />
      <Confetti count={high ? 240 : 100} still={still} />
    </Canvas>
  );
}
