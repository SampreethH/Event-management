"use client";

import { AdaptiveDpr, ContactShadows, Environment, Float, Lightformer, OrbitControls, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mulberry32 } from "./capability";
import { ItemMesh, type PreviewItem } from "./PartyItem";
import { useSleeveTexture } from "./useSleeveTexture";

// Box geometry (metres-ish scene units). Base is centred on its group origin.
const W = 2.0;
const H = 1.6;
const RIBBON_W = 0.3;
const LID = { w: 2.1, h: 0.28, closedY: 0.92, openY: 1.6, openTilt: -0.85 };
const FACES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export interface LuxuryPartyBoxSceneProps {
  open: boolean;
  boxColor: string;
  ribbonColor: string;
  /** Printed on a band across the front face; empty hides the band. */
  label: string;
  items: PreviewItem[];
  quality: "high" | "low";
  /** Render loop pauses when false (offscreen). */
  active: boolean;
  /** Reduced motion: no idle float, no drifting dust. */
  still: boolean;
  zoom: boolean;
  dustCount: number;
}

/** Floating gold motes — one instanced draw call, seeded so layout is render-pure. */
function FestiveDust({ count, still }: { count: number; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const rand = mulberry32(count * 7919);
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 8,
      y: (rand() - 0.5) * 6,
      z: (rand() - 0.5) * 8,
      speed: 0.2 + rand() * 0.5,
      scale: 0.02 + rand() * 0.04,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = still ? 0 : clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(p.x + Math.sin(t * p.speed + i) * 0.15, p.y + Math.cos(t * p.speed + i) * 0.15, p.z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#F5D061" emissive="#F5D061" emissiveIntensity={1.2} roughness={0.2} />
    </instancedMesh>
  );
}

/** Treats nested in the cavity that rise above the rim when the lid lifts. */
function RisingTreats({ items, open }: { items: PreviewItem[]; open: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const progress = useRef(0);
  const slots = useMemo(
    () =>
      items.slice(0, 9).map((_, i, all) => {
        const cols = Math.min(3, all.length);
        const rows = Math.ceil(all.length / cols);
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          x: (col - (cols - 1) / 2) * 0.55,
          z: (row - (rows - 1) / 2) * 0.55,
          tilt: ((i * 37) % 11) / 30 - 0.15,
        };
      }),
    [items],
  );

  useFrame(({ clock }, dt) => {
    progress.current = THREE.MathUtils.damp(progress.current, open ? 1 : 0, 3.2, Math.min(dt, 0.05));
    refs.current.forEach((g, i) => {
      if (!g) return;
      // Staggered rise starts once the lid has cleared the rim.
      const local = THREE.MathUtils.clamp((progress.current - 0.2 - i * 0.05) / 0.6, 0, 1);
      const eased = 1 - (1 - local) ** 3;
      g.position.y = THREE.MathUtils.lerp(H / 2 - 0.45, H / 2 + 0.28, eased) + Math.sin(clock.elapsedTime * 1.3 + i) * 0.03 * eased;
      g.rotation.y = eased * (0.6 + i * 0.4);
      g.visible = progress.current > 0.02;
    });
  });

  return (
    <>
      {slots.map((s, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} position={[s.x, H / 2 - 0.45, s.z]} rotation={[0, 0, s.tilt]} scale={1.15}>
          <ItemMesh item={items[i]!} />
        </group>
      ))}
    </>
  );
}

function GiftBox({ open, boxColor, ribbonColor, label, items }: Pick<LuxuryPartyBoxSceneProps, "open" | "boxColor" | "ribbonColor" | "label" | "items">) {
  const lid = useRef<THREE.Group>(null);
  const band = useSleeveTexture(boxColor, ribbonColor, label);

  // Shared materials: one instance each, disposed when colours change or on unmount.
  const boxMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: boxColor, roughness: 0.32, metalness: 0.08, clearcoat: 0.25, clearcoatRoughness: 0.1 }),
    [boxColor],
  );
  const ribbonMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: ribbonColor, metalness: 0.92, roughness: 0.2, clearcoat: 0.45, reflectivity: 1, side: THREE.DoubleSide }),
    [ribbonColor],
  );
  const cavityMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#050507", roughness: 1 }), []);
  useEffect(() => () => boxMaterial.dispose(), [boxMaterial]);
  useEffect(() => () => ribbonMaterial.dispose(), [ribbonMaterial]);
  useEffect(() => () => cavityMaterial.dispose(), [cavityMaterial]);

  useFrame((_, dt) => {
    const l = lid.current;
    if (!l) return;
    const d = Math.min(dt, 0.05);
    l.rotation.x = THREE.MathUtils.damp(l.rotation.x, open ? LID.openTilt : 0, 4, d);
    l.position.y = THREE.MathUtils.damp(l.position.y, open ? LID.openY : LID.closedY, 4, d);
  });

  const half = W / 2 + 0.01;
  return (
    <group position={[0, -0.4, 0]}>
      {/* Base — bevelled edges catch the key light's specular */}
      <RoundedBox args={[W, H, W]} radius={0.05} smoothness={4} material={boxMaterial} />

      {/* Dark cavity mouth so the open box reads as hollow */}
      <mesh position={[0, H / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={cavityMaterial}>
        <planeGeometry args={[W - 0.16, W - 0.16]} />
      </mesh>

      {/* Printed belly-band over the ribbon, so the custom text is never covered */}
      {label && band && (
        <mesh position={[0, -0.32, half + 0.004]}>
          <planeGeometry args={[W - 0.06, 0.42]} />
          <meshPhysicalMaterial map={band} roughness={0.3} clearcoat={0.4} />
        </mesh>
      )}

      {/* Vertical ribbon on all four faces so it holds up from every orbit angle */}
      {FACES.map((ry) => (
        <group key={ry} rotation={[0, ry, 0]}>
          <mesh position={[0, 0, half]} material={ribbonMaterial}>
            <planeGeometry args={[RIBBON_W, H]} />
          </mesh>
        </group>
      ))}

      <RisingTreats items={items} open={open} />

      {/* Lid lifts and tilts back */}
      <group ref={lid} position={[0, LID.closedY, 0]}>
        <RoundedBox args={[LID.w, LID.h, LID.w]} radius={0.04} smoothness={4} material={boxMaterial} />
        {[0, Math.PI / 2].map((rz) => (
          <mesh key={rz} position={[0, LID.h / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, rz]} material={ribbonMaterial}>
            <planeGeometry args={[RIBBON_W, LID.w]} />
          </mesh>
        ))}
        {/* Lid-lip ribbon wraps */}
        {FACES.map((ry) => (
          <group key={ry} rotation={[0, ry, 0]}>
            <mesh position={[0, 0, LID.w / 2 + 0.005]} material={ribbonMaterial}>
              <planeGeometry args={[RIBBON_W, LID.h]} />
            </mesh>
          </group>
        ))}
        {/* Bow */}
        <group position={[0, 0.22, 0]}>
          <mesh rotation={[0, 0.78, 0.5]} material={ribbonMaterial}>
            <torusGeometry args={[0.22, 0.05, 16, 32]} />
          </mesh>
          <mesh rotation={[0, -0.78, -0.5]} material={ribbonMaterial}>
            <torusGeometry args={[0.22, 0.05, 16, 32]} />
          </mesh>
          <mesh material={ribbonMaterial}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Studio rig from the design spec: warm key top-right, strong lavender rim from
 * behind-left, soft warm fill. Reflections come from a procedural Lightformer
 * studio instead of `preset="city"`, which would fetch an HDR from a CDN
 * (blocked by our CSP, and a 1–2 MB download on mobile).
 */
function StudioLighting({ quality }: { quality: "high" | "low" }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={2.2} color="#FFF6D8" />
      <directionalLight position={[-6, -1, -5]} intensity={3.5} color="#9A84FF" />
      <pointLight position={[-3, 2, 3]} intensity={0.8} color="#FFE6B0" />
      <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
        {/* Metallic ribbon shows almost nothing but reflections, so the studio needs
            bright cards on every side the camera can orbit to. */}
        <Lightformer form="rect" intensity={4} color="#FFF4DE" position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={3} color="#FFE9C2" position={[4, 2, 5]} target={[0, 0, 0]} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#FFFFFF" position={[6, 2, -1]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#FFE2A8" position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#9A84FF" position={[-3, 1, -6]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#F5D061" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
    </>
  );
}

export default function LuxuryPartyBoxScene(props: LuxuryPartyBoxSceneProps) {
  const [quality, setQuality] = useState(props.quality);
  const high = quality === "high";

  return (
    <Canvas
      camera={{ position: [3.2, 2.4, 3.8], fov: 42 }}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: high, alpha: true, powerPreference: "high-performance" }}
      frameloop={props.active ? "always" : "never"}
      aria-label="3D gift box preview. Drag to rotate."
    >
      <PerformanceMonitor onDecline={() => setQuality("low")} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <StudioLighting quality={quality} />

      <Float speed={props.still ? 0 : 1.8} rotationIntensity={props.still ? 0 : 0.2} floatIntensity={props.still ? 0 : 0.35}>
        <GiftBox open={props.open} boxColor={props.boxColor} ribbonColor={props.ribbonColor} label={props.label} items={props.items} />
      </Float>

      <ContactShadows position={[0, -1.3, 0]} opacity={0.7} scale={7} blur={2.2} far={3} color="#000000" resolution={high ? 512 : 256} frames={high ? Infinity : 1} />
      <FestiveDust count={high ? props.dustCount : Math.round(props.dustCount / 2)} still={props.still} />

      {/* Zoom is off by default so the wheel keeps scrolling the page. */}
      <OrbitControls enablePan={false} enableZoom={props.zoom} minDistance={3} maxDistance={7} maxPolarAngle={Math.PI / 2 + 0.05} enableDamping />
    </Canvas>
  );
}
