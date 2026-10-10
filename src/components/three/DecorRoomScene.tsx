"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { DecorKit } from "@/lib/domain/catalog";
import { mulberry32 } from "./capability";

export interface RoomSize {
  w: number;
  d: number;
  h: number;
}

interface Props {
  room: RoomSize;
  kits: DecorKit["id"][];
  evening: boolean;
  quality: "high" | "low";
}

/** Scale-accurate living room (1 unit = 1 m) with the chosen decor kits staged against the feature wall. */
export default function DecorRoomScene({ room, kits, evening, quality }: Props) {
  const backZ = -room.d / 2;
  return (
    <Canvas camera={{ position: [room.w * 0.35, 1.7, room.d * 0.75], fov: 50 }} dpr={quality === "high" ? [1, 1.75] : [1, 1.25]} gl={{ antialias: quality === "high" }}>
      <color attach="background" args={[evening ? "#07070c" : "#15161f"]} />
      <ambientLight intensity={evening ? 0.28 : 0.6} />
      <directionalLight position={[2, room.h, 3]} intensity={evening ? 0.15 : 1.1} color={evening ? "#A78BFA" : "#FFF3E0"} />
      <pointLight position={[-room.w / 2 + 0.5, 1.6, room.d / 2 - 0.6]} intensity={evening ? 6 : 2} color="#FFB36B" decay={2} />

      <Room room={room} />
      <Sofa position={[0, 0, room.d / 2 - 0.55]} />

      {kits.includes("neon-backdrop") && <NeonBackdrop position={[0, 0, backZ + 0.05]} evening={evening} />}
      {kits.includes("balloon-arch") && <BalloonArch position={[0, 0, backZ + (kits.includes("neon-backdrop") ? 0.45 : 0.3)]} count={quality === "high" ? 180 : 90} />}
      {kits.includes("boho-tabletop") && <BohoTable position={[0, 0, backZ + 1.4]} evening={evening} />}

      <ContactShadows position={[0, 0.002, 0]} scale={Math.max(room.w, room.d)} opacity={0.5} blur={2.5} far={3} frames={1} />
      <OrbitControls
        target={[0, 1.1, backZ + 0.8]}
        enablePan={false}
        minDistance={1.5}
        maxDistance={Math.max(room.w, room.d) * 0.95}
        minPolarAngle={0.6}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
      />
    </Canvas>
  );
}

function Room({ room }: { room: RoomSize }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.w, room.d]} />
        <meshStandardMaterial color="#3A2E28" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.003, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.w * 0.55, room.d * 0.45]} />
        <meshStandardMaterial color="#C9BBA6" roughness={1} />
      </mesh>
      <mesh position={[0, room.h / 2, -room.d / 2]}>
        <planeGeometry args={[room.w, room.h]} />
        <meshStandardMaterial color="#E7E0D6" roughness={0.95} />
      </mesh>
      <mesh position={[-room.w / 2, room.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[room.d, room.h]} />
        <meshStandardMaterial color="#DDD5CA" roughness={0.95} />
      </mesh>
      {/* Window on the side wall */}
      <mesh position={[-room.w / 2 + 0.01, 1.5, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.4, 1.3]} />
        <meshStandardMaterial color="#9EC5FF" emissive="#6E9BE0" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Sofa(props: { position: [number, number, number] }) {
  const fabric = <meshStandardMaterial color="#4B4E6D" roughness={0.9} />;
  return (
    <group {...props}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.1, 0.44, 0.9]} />
        {fabric}
      </mesh>
      <mesh position={[0, 0.62, 0.36]}>
        <boxGeometry args={[2.1, 0.5, 0.2]} />
        {fabric}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.38, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.9]} />
          {fabric}
        </mesh>
      ))}
    </group>
  );
}

const ARCH_COLORS = ["#F5D061", "#FF918F", "#C9B8FD", "#FFFFFF", "#F4B6C2", "#E9C25A"];

/** 2.6 m wide organic arch: balloons scattered around a parabola with varied sizes. */
function BalloonArch({ position, count }: { position: [number, number, number]; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(() => {
    const rand = mulberry32(count);
    return Array.from({ length: count }, (_, i) => {
      const t = (i / count) * Math.PI;
      const x = Math.cos(t) * 1.3 + (rand() - 0.5) * 0.25;
      const y = Math.sin(t) * 2.1 + 0.15 + (rand() - 0.5) * 0.25;
      const z = (rand() - 0.5) * 0.4;
      return { x, y, z, s: 0.08 + rand() * 0.11, c: ARCH_COLORS[Math.floor(rand() * ARCH_COLORS.length)]! };
    });
  }, [count]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    layout.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.s, b.s * 1.12, b.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(b.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [layout]);

  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshPhysicalMaterial roughness={0.18} metalness={0.3} clearcoat={1} iridescence={0.6} />
      </instancedMesh>
    </group>
  );
}

/** Velvet panel with a script-like neon tube and a fairy-light fringe. */
function NeonBackdrop({ position, evening }: { position: [number, number, number]; evening: boolean }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [-0.8, 1.2], [-0.6, 1.55], [-0.45, 1.2], [-0.3, 1.5], [-0.1, 1.15], [0.05, 1.45],
          [0.2, 1.2], [0.35, 1.55], [0.5, 1.2], [0.7, 1.45], [0.85, 1.25],
        ].map(([x, y]) => new THREE.Vector3(x, y, 0.04)),
      ),
    [],
  );
  const glow = evening ? 4 : 1.6;
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.4, 2.2, 0.04]} />
        <meshPhysicalMaterial color="#2B1A3A" roughness={0.9} sheen={1} sheenColor="#A78BFA" sheenRoughness={0.5} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 160, 0.018, 8, false]} />
        <meshStandardMaterial color="#FF5E5B" emissive="#FF5E5B" emissiveIntensity={glow} toneMapped={false} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} position={[-1.15 + (i * 2.3) / 23, 2.15 - (i % 2) * 0.05, 0.05]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#FFE6A8" emissive="#FFD27A" emissiveIntensity={evening ? 3 : 1} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function BohoTable({ position, evening }: { position: [number, number, number]; evening: boolean }) {
  const rand = useMemo(() => mulberry32(42), []);
  const pampas = useMemo(() => Array.from({ length: 7 }, () => ({ a: (rand() - 0.5) * 0.9, l: 0.55 + rand() * 0.35 })), [rand]);
  return (
    <group position={position}>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[1.8, 0.05, 0.9]} />
        <meshStandardMaterial color="#B98A5E" roughness={0.6} />
      </mesh>
      {[[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.36, z!]}>
          <cylinderGeometry args={[0.025, 0.025, 0.72, 8]} />
          <meshStandardMaterial color="#8C6440" />
        </mesh>
      ))}
      <mesh position={[0, 0.768, 0]}>
        <boxGeometry args={[0.4, 0.004, 0.92]} />
        <meshStandardMaterial color="#EDE4D3" roughness={1} />
      </mesh>
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.772, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.02, 8, 32]} />
          <meshStandardMaterial color="#C9A06A" roughness={0.8} />
        </mesh>
      ))}
      {/* Vase + pampas */}
      <mesh position={[0, 0.9, -0.15]}>
        <cylinderGeometry args={[0.07, 0.1, 0.28, 16]} />
        <meshStandardMaterial color="#D8C3A5" roughness={0.9} />
      </mesh>
      {pampas.map((p, i) => (
        <mesh key={i} position={[Math.sin(p.a) * 0.18, 1.0 + p.l / 2, -0.15]} rotation={[0, 0, -p.a * 0.6]} scale={[0.07, p.l / 2, 0.07]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial color="#EAD9BD" roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} position={[-0.7 + i * 0.28, 0.77, -0.3 + (i % 2) * 0.1]}>
          <mesh position={[0, 0.08 + (i % 3) * 0.03, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.16 + (i % 3) * 0.06, 16]} />
            <meshStandardMaterial color="#F6EEE2" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.19 + (i % 3) * 0.06, 0]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#FFB347" emissive="#FF9A3C" emissiveIntensity={evening ? 5 : 1.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
