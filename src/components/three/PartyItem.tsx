"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

export type ItemKind = "snack" | "cake" | "tin" | "macaron" | "gift";

export interface PreviewItem {
  kind: ItemKind;
  color: string;
  accent?: string;
}

interface Props {
  item: PreviewItem;
  index: number;
  count: number;
  /** Shared 0→1 lid-open progress owned by CelebrationBox. */
  progress: RefObject<number>;
  /** How far items fly out when open. 0 = stay nested in the box. */
  explode: number;
  boxHeight: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Nested slot inside the box (3 × n grid) and an exploded orbit position above it. */
function slots(index: number, count: number, explode: number, h: number) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const rows = Math.ceil(count / 3);
  const rest = new THREE.Vector3((col - 1) * 0.42, 0.32, (row - (rows - 1) / 2) * 0.42);
  // A wide, low halo around the open box keeps everything in frame as the hero scrolls.
  const angle = (index / Math.max(1, count)) * Math.PI * 2 + 0.4;
  const radius = 1.15 + explode * 0.95;
  const out = new THREE.Vector3(Math.cos(angle) * radius, h * 0.6 + explode * (0.15 + (index % 3) * 0.3), Math.sin(angle) * radius * 0.75);
  return { rest, out };
}

export function PartyItem({ item, index, count, progress, explode, boxHeight }: Props) {
  const group = useRef<THREE.Group>(null);
  const { rest, out } = slots(index, count, explode, boxHeight);
  const stagger = Math.min(0.06, 0.45 / Math.max(1, count));

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const raw = clamp01((progress.current - 0.25 - index * stagger) / 0.6);
    const t = easeOutCubic(raw);
    g.position.lerpVectors(rest, out, t);
    const time = clock.elapsedTime;
    // Idle bob + slow spin only once airborne
    g.position.y += Math.sin(time * 1.4 + index) * 0.06 * t;
    g.rotation.y = t * (time * 0.4 + index);
    g.rotation.z = Math.sin(time * 0.8 + index * 2) * 0.18 * t;
    g.scale.setScalar(0.85 + 0.25 * t);
  });

  return (
    <group ref={group} position={rest}>
      <ItemMesh item={item} />
    </group>
  );
}

/** The treat geometry on its own, for scenes that animate items their own way. */
export function ItemMesh({ item }: { item: PreviewItem }) {
  const accent = item.accent ?? "#F5D061";
  switch (item.kind) {
    case "snack":
      return (
        <group>
          <RoundedBox args={[0.32, 0.42, 0.14]} radius={0.035} smoothness={3}>
            <meshPhysicalMaterial color={item.color} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
          </RoundedBox>
          <mesh position={[0, 0.06, 0.071]}>
            <planeGeometry args={[0.26, 0.1]} />
            <meshStandardMaterial color={accent} metalness={0.6} roughness={0.25} />
          </mesh>
        </group>
      );
    case "cake":
      return (
        <group rotation={[0, Math.PI / 6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 32, 1, false, 0, Math.PI / 3]} />
            <meshStandardMaterial color={item.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.115, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.04, 32, 1, false, 0, Math.PI / 3]} />
            <meshPhysicalMaterial color="#FFF4E6" roughness={0.4} sheen={1} sheenColor="#FFE3C2" />
          </mesh>
          <mesh position={[0.12, 0.17, 0.08]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshPhysicalMaterial color="#C7203A" roughness={0.15} clearcoat={1} />
          </mesh>
        </group>
      );
    case "tin":
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.12, 40]} />
            <meshStandardMaterial color={item.color} metalness={0.85} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.03, 40]} />
            <meshStandardMaterial color={accent} metalness={0.9} roughness={0.18} />
          </mesh>
        </group>
      );
    case "macaron":
      return (
        <group>
          {[0.045, -0.045].map((y) => (
            <mesh key={y} position={[0, y, 0]} scale={[1, 0.45, 1]}>
              <sphereGeometry args={[0.13, 24, 16]} />
              <meshStandardMaterial color={item.color} roughness={0.75} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.115, 0.115, 0.04, 24]} />
            <meshStandardMaterial color="#FFF7EE" roughness={0.5} />
          </mesh>
        </group>
      );
    case "gift":
      return (
        <group>
          <RoundedBox args={[0.26, 0.26, 0.26]} radius={0.02} smoothness={2}>
            <meshPhysicalMaterial color={item.color} roughness={0.4} clearcoat={0.6} />
          </RoundedBox>
          <mesh>
            <boxGeometry args={[0.27, 0.27, 0.05]} />
            <meshStandardMaterial color={accent} metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.05, 0.27, 0.27]} />
            <meshStandardMaterial color={accent} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      );
  }
}
