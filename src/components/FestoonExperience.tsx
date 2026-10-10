'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, ContactShadows, Environment, Float, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { detectQuality, mulberry32, subscribeNoop } from '@/components/three/capability';
import { SceneBoundary } from '@/components/three/SceneBoundary';

type Quality = 'high' | 'low';

// ==========================================
// 1. DIMENSIONS
// ==========================================
// Rigid two-piece box: a hollow base and a deep tray lid whose lip overlaps the base.
const W = 2.0; // base outer width & depth
const H = 1.36; // base height
const T = 0.05; // base wall thickness
const R = 0.07; // outer corner radius
const B = 0.008; // edge bevel
const LW = W + 0.07; // lid outer width & depth
const LH = 0.34; // lid height
const LT = 0.045; // lid top-plate thickness
const LIP = 0.035; // lid lip thickness
const RIBBON = 0.24;
const FACES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

const LID_CLOSED = { y: H + LT + 0.003, z: 0, rx: 0, rz: 0 };
const LID_OPEN = { y: H + LT + 1.05, z: -0.5, rx: -0.72, rz: 0.06 };

// ==========================================
// 2. PROCEDURAL TEXTURES
// ==========================================
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Paints into a canvas texture; repaints once web fonts are ready so foil lettering uses the brand faces. */
function useCanvasTexture(paint: Painter, w: number, h: number, srgb: boolean, repeat = 1) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d')!, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat !== 1) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
    }
    t.anisotropy = 8;
    return t;
  }, [paint, w, h, srgb, repeat]);

  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (!live) return;
      paint((tex.image as HTMLCanvasElement).getContext('2d')!, w, h);
      tex.needsUpdate = true;
    });
    return () => {
      live = false;
      tex.dispose();
    };
  }, [tex, paint, w, h]);

  return tex;
}

/** Fine paper-board grain, used as a roughness map so highlights break up like real soft-touch stock. */
const paintGrain: Painter = (ctx, w, h) => {
  const rand = mulberry32(42);
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + rand() * 55;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

/** Hot-foil confetti print (white = foil). Density is per 1024² so every face gets the same scatter. */
const makeConfettiPrint =
  (seed: number, density: number): Painter =>
  (ctx, w, h) => {
    const rand = mulberry32(seed);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    const n = Math.round((density * w * h) / (1024 * 1024));
    for (let i = 0; i < n; i++) {
      const s = 5 + rand() * 13;
      const kind = rand();
      ctx.save();
      ctx.translate(rand() * w, rand() * h);
      ctx.rotate(rand() * Math.PI * 2);
      if (kind < 0.4) {
        ctx.fillRect(-s / 2, -s / 5, s, s / 2.5);
      } else if (kind < 0.65) {
        ctx.beginPath();
        ctx.arc(0, 0, s / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind < 0.85) {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const r = k % 2 === 0 ? s * 0.6 : s * 0.16;
          const a = (k / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.lineWidth = s / 5;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.bezierCurveTo(-s / 2, -s, s / 2, s, s, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
  };
const paintConfettiDense = makeConfettiPrint(7, 300);
const paintConfettiSparse = makeConfettiPrint(19, 170);

/** Front-face foil stamp: double frame, wordmark, rule and sub-line. */
const paintWordmark: Painter = (ctx, w, h) => {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--font-clash').trim() || 'serif';
  const body = css.getPropertyValue('--font-satoshi').trim() || 'sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(22, 22, w - 44, h - 44, 18);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(38, 38, w - 76, h - 76, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 150px ${display}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('festoon', w / 2 + 3, h * 0.42);

  const y = h * 0.64;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 170, y);
  ctx.lineTo(w / 2 - 22, y);
  ctx.moveTo(w / 2 + 22, y);
  ctx.lineTo(w / 2 + 170, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, y - 9);
  ctx.lineTo(w / 2 + 9, y);
  ctx.lineTo(w / 2, y + 9);
  ctx.lineTo(w / 2 - 9, y);
  ctx.closePath();
  ctx.fill();

  ctx.font = `500 36px ${body}`;
  ctx.letterSpacing = '14px';
  ctx.fillText('MIDNIGHT FOIL', w / 2 + 7, h * 0.78);
};

/** Soft violet-and-gold pool of light on the floor under the box. */
const paintFloorGlow: Painter = (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(245,208,97,0.55)');
  g.addColorStop(0.25, 'rgba(167,139,250,0.45)');
  g.addColorStop(0.6, 'rgba(110,80,220,0.15)');
  g.addColorStop(1, 'rgba(80,60,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

// ==========================================
// 3. GEOMETRY HELPERS
// ==========================================
function roundedRect(p: THREE.Path, w: number, d: number, r: number) {
  const x = w / 2;
  const y = d / 2;
  p.moveTo(-x + r, -y);
  p.lineTo(x - r, -y);
  p.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x, y - r);
  p.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  p.lineTo(-x + r, y);
  p.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(-x, -y + r);
  p.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
}

/**
 * Rounded-rectangle prism standing on y=0, outer size `w`×`d` after bevelling.
 * `wall > 0` makes it a hollow ring (box walls, lid lip, piping); 0 makes a solid slab.
 */
function useShell(w: number, d: number, r: number, height: number, wall: number, bevel: number) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    roundedRect(shape, w - 2 * bevel, d - 2 * bevel, r - bevel);
    if (wall > 0) {
      const hole = new THREE.Path();
      roundedRect(hole, w - 2 * wall + 2 * bevel, d - 2 * wall + 2 * bevel, Math.max(0.005, r - wall + bevel));
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: height - 2 * bevel,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 12,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    g.computeVertexNormals();
    return g;
  }, [w, d, r, height, wall, bevel]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/** Closed cake wedge (a cylinder with thetaLength would leave the cut faces open). */
function useWedge(radius: number, height: number, angle = Math.PI / 3.4) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(radius, 0);
    shape.absarc(0, 0, radius, 0, angle, false);
    shape.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -height / 2, 0);
    return g;
  }, [radius, height, angle]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/** Flat ribbon tail with a V-notched end, lying in the XZ plane and running along +x. */
function useRibbonTail(length: number, width: number) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -width / 2);
    s.lineTo(length, -width / 2);
    s.lineTo(length - width * 0.4, 0);
    s.lineTo(length, width / 2);
    s.lineTo(0, width / 2);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [length, width]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

// ==========================================
// 4. MATERIALS
// ==========================================
function useMaterials() {
  const grain = useCanvasTexture(paintGrain, 256, 256, false, 6);
  const printDense = useCanvasTexture(paintConfettiDense, 1024, 1024, false);
  const printSparse = useCanvasTexture(paintConfettiSparse, 1024, 640, false);
  const printStrip = useCanvasTexture(paintConfettiSparse, 1024, 160, false);
  const wordmark = useCanvasTexture(paintWordmark, 1024, 512, false);

  const mats = useMemo(() => {
    // Obsidian soft-touch board with a faint violet velvet sheen at grazing angles.
    const board = new THREE.MeshPhysicalMaterial({
      color: '#0B0B13',
      roughness: 0.62,
      roughnessMap: grain,
      metalness: 0.04,
      sheen: 0.6,
      sheenColor: new THREE.Color('#4B3C8F'),
      sheenRoughness: 0.55,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
    });
    // Champagne-gold hot foil.
    const foil = new THREE.MeshPhysicalMaterial({
      color: '#E7BE5C',
      metalness: 1,
      roughness: 0.2,
      roughnessMap: grain,
      clearcoat: 0.3,
      clearcoatRoughness: 0.15,
    });
    // Foil stamping: the foil, masked by a print. A faint emissive keeps it legible when it isn't catching a light.
    const print = (alphaMap: THREE.Texture) => {
      const m = foil.clone();
      m.alphaMap = alphaMap;
      m.alphaTest = 0.5;
      m.roughness = 0.28;
      m.emissive.set('#B88A2A');
      m.emissiveIntensity = 0.55;
      return m;
    };
    return {
      board,
      foil,
      printDense: print(printDense),
      printSparse: print(printSparse),
      printStrip: print(printStrip),
      wordmark: print(wordmark),
      // Double-faced satin: anisotropic streak highlights along the weave.
      satin: new THREE.MeshPhysicalMaterial({
        color: '#D9B25A',
        metalness: 0.35,
        roughness: 0.3,
        sheen: 1,
        sheenColor: new THREE.Color('#FFE6A3'),
        sheenRoughness: 0.35,
        anisotropy: 0.7,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      velvet: new THREE.MeshPhysicalMaterial({
        color: '#24123A',
        roughness: 0.9,
        sheen: 1,
        sheenColor: new THREE.Color('#9A6BE0'),
        sheenRoughness: 0.5,
        side: THREE.DoubleSide,
      }),
      tissue: new THREE.MeshPhysicalMaterial({
        color: '#C9A257',
        metalness: 0.6,
        roughness: 0.42,
        flatShading: true,
        sheen: 0.7,
        sheenColor: new THREE.Color('#FFF3C8'),
        side: THREE.DoubleSide,
      }),
    };
  }, [grain, printDense, printSparse, printStrip, wordmark]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

type Mats = ReturnType<typeof useMaterials>;

// ==========================================
// 5. TREATS THAT RISE OUT OF THE BOX
// ==========================================
function CakeSlice() {
  const layer = useWedge(0.5, 0.09);
  const cream = useWedge(0.5, 0.03);
  const frosting = useWedge(0.51, 0.06);
  return (
    <group rotation={[0.15, -2.3, 0.1]}>
      {[0, 0.12, 0.24].map((y) => (
        <mesh key={y} geometry={layer} position={[0, y, 0]}>
          <meshPhysicalMaterial color="#F2CF86" roughness={0.85} sheen={0.6} sheenColor="#FFE9B8" />
        </mesh>
      ))}
      {[0.06, 0.18].map((y) => (
        <mesh key={y} geometry={cream} position={[0, y, 0]}>
          <meshPhysicalMaterial color="#FFF6E6" roughness={0.45} />
        </mesh>
      ))}
      <mesh geometry={frosting} position={[0, 0.33, 0]}>
        <meshPhysicalMaterial color="#FFF8EE" roughness={0.3} sheen={1} sheenColor="#ffffff" clearcoat={0.3} />
      </mesh>
      <mesh position={[0.33, 0.42, -0.14]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshPhysicalMaterial color="#C8102E" roughness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
    </group>
  );
}

function Macaron({ color }: { color: string }) {
  return (
    <group>
      {[0.065, -0.065].map((y) => (
        <mesh key={y} position={[0, y, 0]} scale={[1, 0.5, 1]}>
          <sphereGeometry args={[0.19, 32, 20]} />
          <meshPhysicalMaterial color={color} roughness={0.65} sheen={1} sheenColor="#ffffff" sheenRoughness={0.5} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.168, 0.168, 0.06, 32]} />
        <meshPhysicalMaterial color="#FFF3E0" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Truffle({ dusted }: { dusted?: boolean }) {
  return (
    <mesh scale={[0.16, 0.15, 0.16]}>
      <sphereGeometry args={[1, 32, 32]} />
      {dusted ? (
        <meshPhysicalMaterial color="#4A2A1A" roughness={0.95} sheen={1} sheenColor="#8A5A3C" />
      ) : (
        <meshPhysicalMaterial color="#2A150D" roughness={0.15} clearcoat={0.9} clearcoatRoughness={0.08} />
      )}
    </mesh>
  );
}

/** Small wrapped present: lavender paper, satin cross-ribbon and a twin-loop bow. */
function Present({ satin, size = 0.42 }: { satin: THREE.Material; size?: number }) {
  const h = size * 0.85;
  return (
    <group>
      <mesh>
        <boxGeometry args={[size, h, size]} />
        <meshPhysicalMaterial color="#A98AEB" roughness={0.45} clearcoat={0.5} clearcoatRoughness={0.2} sheen={0.5} sheenColor="#E4D8FF" />
      </mesh>
      <mesh material={satin}>
        <boxGeometry args={[size + 0.006, h + 0.006, size * 0.18]} />
      </mesh>
      <mesh material={satin}>
        <boxGeometry args={[size * 0.18, h + 0.006, size + 0.006]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * size * 0.13, h / 2 + 0.035, 0]} rotation={[0, 0, s * -0.5]} scale={[1, 0.75, 2.2]} material={satin}>
          <torusGeometry args={[size * 0.14, size * 0.04, 12, 32]} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingTreats({ isOpen, mats }: { isOpen: boolean; mats: Mats }) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);
    const s = isOpen ? 1 : 0.001;
    g.scale.lerp(target.set(s, s, s), Math.min(1, d * 4));
    g.position.y = THREE.MathUtils.damp(g.position.y, isOpen ? H - 0.25 : H * 0.3, 3.5, d);
  });

  return (
    <group ref={groupRef} position={[0, H * 0.3, 0]} scale={0.001}>
      <Float speed={2.2} rotationIntensity={0.45} floatIntensity={0.5}>
        <group position={[0.55, 0.5, 0.35]} rotation={[0.2, -0.4, 0.2]}>
          <Present satin={mats.satin} />
        </group>
      </Float>
      <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.45}>
        <group position={[-0.42, 0.95, 0.05]} scale={0.85}>
          <CakeSlice />
        </group>
      </Float>
      <Float speed={2.8} rotationIntensity={0.7} floatIntensity={0.7}>
        <group position={[0.42, 1.2, -0.25]} rotation={[0.5, 0, 0.2]}>
          <Macaron color="#F1AFB3" />
        </group>
      </Float>
      <Float speed={2.4} rotationIntensity={0.6} floatIntensity={0.6}>
        <group position={[-0.62, 0.42, -0.35]} rotation={[0.3, 0, -0.3]}>
          <Macaron color="#B7D39A" />
        </group>
      </Float>
      <Float speed={3.2} rotationIntensity={0.8} floatIntensity={0.8}>
        <group position={[0.05, 0.4, 0.6]}>
          <Truffle />
          <group position={[-0.32, 0.36, -0.2]}>
            <Truffle dusted />
          </group>
        </group>
      </Float>
    </group>
  );
}

/** Crumpled champagne tissue tucked into the cavity, peeking above the rim. */
function Tissue({ material }: { material: THREE.Material }) {
  const bits = useMemo(() => {
    const r = mulberry32(11);
    return Array.from({ length: 22 }, () => ({
      p: [(r() - 0.5) * 1.6, H - 0.3 + r() * 0.1, (r() - 0.5) * 1.6] as [number, number, number],
      rot: [(r() - 0.5) * 1.2, r() * Math.PI, (r() - 0.5) * 1.2] as [number, number, number],
      s: [0.16 + r() * 0.12, 0.02 + r() * 0.025, 0.13 + r() * 0.08] as [number, number, number],
    }));
  }, []);
  return (
    <>
      {bits.map((b, i) => (
        <mesh key={i} position={b.p} rotation={b.rot} scale={b.s} material={material}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  );
}

// ==========================================
// 6. THE LUXURY "MIDNIGHT FOIL" GIFT BOX
// ==========================================
function Bow({ mats }: { mats: Mats }) {
  const tail = useRibbonTail(0.62, RIBBON * 0.9);
  // A torus whose tube is stretched along its axis reads as a wide satin band; squashing the ring
  // and leaning it outward gives the teardrop of a tied loop. Two pairs, crossed, make a full bow.
  const loops = [
    { ry: 0, size: 1, lean: 0.95 },
    { ry: Math.PI / 2, size: 0.78, lean: 1.15 },
  ];
  return (
    <group position={[0, 0.006, 0]}>
      {loops.map(({ ry, size, lean }) =>
        [1, -1].map((s) => (
          <group key={`${ry}${s}`} rotation={[0, ry, 0]} scale={size}>
            <mesh position={[s * 0.25, 0.27, 0]} rotation={[0, 0, s * -lean]} scale={[1.35, 0.8, RIBBON / 0.065]} material={mats.satin}>
              <torusGeometry args={[0.22, 0.03, 20, 64]} />
            </mesh>
          </group>
        )),
      )}
      {[0.55, Math.PI - 0.55, -0.9, Math.PI + 0.9].map((ry, i) => (
        <mesh key={i} geometry={tail} rotation={[0, ry, 0]} position={[0, 0.004 + i * 0.001, 0]} material={mats.satin} />
      ))}
      <mesh position={[0, 0.12, 0]} scale={[0.17, 0.2, RIBBON * 0.95]} material={mats.satin}>
        <sphereGeometry args={[0.5, 32, 24]} />
      </mesh>
    </group>
  );
}

function LuxuryMidnightBox({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const mats = useMaterials();
  const lid = useRef<THREE.Group>(null);

  const baseShell = useShell(W, W, R, H, T, B);
  const baseFloor = useShell(W - 2 * T + 0.004, W - 2 * T + 0.004, R - T, T, 0, 0);
  const baseLining = useShell(W - 2 * T - 0.002, W - 2 * T - 0.002, R - T, H - T - 0.03, 0.004, 0);
  const gilt = useShell(W - 2 * B, W - 2 * B, R - B, 0.0015, T - 2 * B, 0);
  const basePiping = useShell(W + 0.014, W + 0.014, R + 0.007, 0.032, 0.03, 0.006);

  const lidPlate = useShell(LW, LW, R + 0.035, LT, 0, B);
  const lidLip = useShell(LW - 0.0016, LW - 0.0016, R + 0.034, LH - LT + B + 0.002, LIP, 0);
  const lidPiping = useShell(LW + 0.012, LW + 0.012, R + 0.041, 0.03, 0.03, 0.006);

  useFrame((_, delta) => {
    const l = lid.current;
    if (!l) return;
    const d = Math.min(delta, 0.05);
    const to = isOpen ? LID_OPEN : LID_CLOSED;
    l.position.y = THREE.MathUtils.damp(l.position.y, to.y, 4, d);
    l.position.z = THREE.MathUtils.damp(l.position.z, to.z, 4, d);
    l.rotation.x = THREE.MathUtils.damp(l.rotation.x, to.rx, 4, d);
    l.rotation.z = THREE.MathUtils.damp(l.rotation.z, to.rz, 4, d);
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta < 6) onToggle(); // ignore the click that ends an orbit drag
  };

  const face = W / 2 + 0.0015;
  const lidFace = LW / 2 + 0.0009;
  return (
    <group
      onClick={click}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* --- BASE --- */}
      <mesh geometry={baseShell} material={mats.board} />
      <mesh geometry={baseFloor} material={mats.board} />
      <mesh geometry={baseLining} position={[0, T, 0]} material={mats.velvet} />
      <mesh position={[0, T + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.velvet}>
        <planeGeometry args={[W - 2 * T - 0.01, W - 2 * T - 0.01]} />
      </mesh>
      {/* Gilded rim, seen when the lid is off */}
      <mesh geometry={gilt} position={[0, H + 0.0004, 0]} material={mats.foil} />
      <mesh geometry={basePiping} position={[0, -0.002, 0]} material={mats.foil} />

      {/* Foil-stamped wordmark on the front; confetti print on the other three faces */}
      <mesh position={[0, 0.555, face]} material={mats.wordmark}>
        <planeGeometry args={[W - 0.16, 0.9]} />
      </mesh>
      {FACES.slice(1).map((ry) => (
        <group key={ry} rotation={[0, ry, 0]}>
          <mesh position={[0, 0.55, face]} material={mats.printSparse}>
            <planeGeometry args={[W - 0.12, 0.92]} />
          </mesh>
        </group>
      ))}

      <Tissue material={mats.tissue} />
      <FloatingTreats isOpen={isOpen} mats={mats} />

      {/* --- LID (origin at its top surface) --- */}
      <group ref={lid} position={[0, LID_CLOSED.y, 0]}>
        <mesh geometry={lidPlate} position={[0, -LT, 0]} material={mats.board} />
        <mesh geometry={lidLip} position={[0, -LH, 0]} material={mats.board} />
        <mesh geometry={lidPiping} position={[0, -LH - 0.002, 0]} material={mats.foil} />
        <mesh position={[0, -LT - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.velvet}>
          <planeGeometry args={[LW - 2 * LIP - 0.004, LW - 2 * LIP - 0.004]} />
        </mesh>

        <mesh position={[0, 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.printDense}>
          <planeGeometry args={[LW - 0.06, LW - 0.06]} />
        </mesh>
        {FACES.map((ry) => (
          <group key={ry} rotation={[0, ry, 0]}>
            <mesh position={[0, -LH / 2 + 0.01, lidFace]} material={mats.printStrip}>
              <planeGeometry args={[LW - 0.08, LH - 0.08]} />
            </mesh>
            {/* Satin ribbon wrapping down each lip */}
            <mesh position={[0, -LH / 2, LW / 2 + 0.0028]} material={mats.satin}>
              <boxGeometry args={[RIBBON, LH + 0.004, 0.004]} />
            </mesh>
          </group>
        ))}
        {[0, Math.PI / 2].map((ry) => (
          <mesh key={ry} position={[0, 0.0028, 0]} rotation={[0, ry, 0]} material={mats.satin}>
            <boxGeometry args={[RIBBON, 0.004, LW + 0.006]} />
          </mesh>
        ))}
        <Bow mats={mats} />
      </group>
    </group>
  );
}

// ==========================================
// 7. CONFETTI: FULL-SCREEN FALL + POPPER BURST
// ==========================================
const PAPER = ['#F472B6', '#5EEAD4', '#A78BFA', '#FF8A80', '#93C5FD', '#FFFFFF', '#FDE68A'];
const FOIL = ['#F5D061', '#E5B842', '#F9E29A', '#D9D9E3'];

interface Flake {
  u: number;
  v: number;
  depth: number;
  fall: number;
  sway: number;
  swaySpeed: number;
  spin: number;
  axis: THREE.Vector3;
  phase: number;
  w: number;
  h: number;
}

function makeFlakes(count: number, seed: number): Flake[] {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const depth = 2.4 + r() ** 0.8 * 9;
    const w = (0.03 + r() * 0.025) * (0.7 + depth * 0.08);
    return {
      u: r() * 2 - 1,
      v: r() * 2 - 1,
      depth,
      fall: 0.22 + r() * 0.35,
      sway: 0.05 + r() * 0.15,
      swaySpeed: 0.6 + r() * 1.2,
      spin: 1.5 + r() * 3,
      axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      phase: r() * Math.PI * 2,
      w,
      h: w * (1.3 + r() * 1.1),
    };
  });
}

function colorInstances(m: THREE.InstancedMesh | null, palette: string[]) {
  if (!m) return;
  const c = new THREE.Color();
  for (let i = 0; i < m.count; i++) m.setColorAt(i, c.set(palette[i % palette.length]!));
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

const wrap = (x: number, lo: number, hi: number) => lo + ((((x - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));
const dummy = new THREE.Object3D();

/** Lays out one camera-space confetti layer for time `t`; `tanHalf` is the padded half-FOV tangent. */
function placeFlakes(m: THREE.InstancedMesh | null, flakes: Flake[], t: number, tanHalf: number, aspect: number) {
  if (!m) return;
  flakes.forEach((f, i) => {
    const halfH = f.depth * tanHalf;
    const halfW = halfH * aspect;
    dummy.position.set(
      f.u * halfW + Math.sin(t * f.swaySpeed + f.phase) * f.sway,
      wrap(f.v * halfH - t * f.fall, -halfH, halfH),
      -f.depth,
    );
    dummy.quaternion.setFromAxisAngle(f.axis, t * f.spin + f.phase);
    dummy.scale.set(f.w, f.h, 1);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
  });
  m.instanceMatrix.needsUpdate = true;
}

/**
 * Confetti that rains across the entire viewport. The layer rides along with the camera, so it
 * fills the screen from every orbit angle; flakes sit at several depths, some in front of the box.
 */
function ScreenConfetti({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const paper = useRef<THREE.InstancedMesh>(null);
  const foil = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const paperCount = Math.round(count * 0.65);
  const foilCount = count - paperCount;
  const paperFlakes = useMemo(() => makeFlakes(paperCount, 101), [paperCount]);
  const foilFlakes = useMemo(() => makeFlakes(foilCount, 202), [foilCount]);
  useLayoutEffect(() => colorInstances(paper.current, PAPER), [paperCount]);
  useLayoutEffect(() => colorInstances(foil.current, FOIL), [foilCount]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.1;
    placeFlakes(paper.current, paperFlakes, clock.elapsedTime, tanHalf, camera.aspect);
    placeFlakes(foil.current, foilFlakes, clock.elapsedTime, tanHalf, camera.aspect);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={paper} args={[undefined, undefined, paperCount]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        {/* A little self-light so flakes turned away from the key light read as colour, not black specks. */}
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.6} metalness={0.05} emissive="#ffffff" emissiveIntensity={0.14} />
      </instancedMesh>
      <instancedMesh ref={foil} args={[undefined, undefined, foilCount]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.3} metalness={0.85} emissive="#7A5E22" emissiveIntensity={0.45} />
      </instancedMesh>
    </group>
  );
}

const BURST_LIFE = 5;
const BURST_COLORS = [...PAPER, ...FOIL];

/** Party-popper blast out of the box mouth; fires whenever `fire` changes. */
function PopperBurst({ fire, count }: { fire: number; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(
    () => ({
      pos: new Float32Array(count * 3),
      vel: new Float32Array(count * 3),
      axis: Array.from({ length: count }, () => new THREE.Vector3(0, 1, 0)),
      spin: new Float32Array(count),
      size: new Float32Array(count),
      age: BURST_LIFE,
      fired: 0,
    }),
    [count],
  );
  useLayoutEffect(() => colorInstances(mesh.current, BURST_COLORS), [count]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const s = state;
    const d = Math.min(delta, 0.05);

    if (fire !== s.fired) {
      s.fired = fire;
      s.age = 0;
      for (let i = 0; i < count; i++) {
        s.pos.set([(Math.random() - 0.5) * 1.2, 0.3, (Math.random() - 0.5) * 1.2], i * 3);
        const dir = new THREE.Vector3((Math.random() - 0.5) * 1.6, 1.4 + Math.random(), (Math.random() - 0.5) * 1.6).normalize();
        dir.multiplyScalar(4 + Math.random() * 3.5);
        s.vel.set([dir.x, dir.y, dir.z], i * 3);
        s.axis[i]!.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        s.spin[i] = 4 + Math.random() * 8;
        s.size[i] = 0.05 + Math.random() * 0.04;
      }
    }
    if (s.age >= BURST_LIFE) {
      if (m.visible) m.visible = false;
      return;
    }
    m.visible = true;
    s.age += d;
    const drag = Math.exp(-1.8 * d);
    const fade = THREE.MathUtils.clamp((BURST_LIFE - s.age) / 1.2, 0, 1);

    for (let i = 0; i < count; i++) {
      const o = i * 3;
      s.vel[o + 1]! -= 6 * d;
      s.vel[o]! *= drag;
      s.vel[o + 2]! *= drag;
      s.vel[o + 1] = Math.max(s.vel[o + 1]! * drag, -0.9); // paper hits terminal velocity fast
      s.pos[o]! += (s.vel[o]! + Math.sin(s.age * 4 + i) * 0.25) * d;
      s.pos[o + 1]! += s.vel[o + 1]! * d;
      s.pos[o + 2]! += s.vel[o + 2]! * d;
      dummy.position.set(s.pos[o]!, s.pos[o + 1]!, s.pos[o + 2]!);
      dummy.quaternion.setFromAxisAngle(s.axis[i]!, s.age * s.spin[i]!);
      const size = s.size[i]! * fade;
      dummy.scale.set(size, size * 1.6, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.35} metalness={0.45} emissive="#ffffff" emissiveIntensity={0.12} />
    </instancedMesh>
  );
}

function FloorGlow() {
  const glow = useCanvasTexture(paintFloorGlow, 512, 512, false);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.148, 0]}>
      <planeGeometry args={[5, 5]} />
      <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.6} />
    </mesh>
  );
}

// ==========================================
// 8. STUDIO LIGHT RIG
// ==========================================
/**
 * Product-shot studio: procedural softboxes (no CDN HDR, which the CSP blocks). Long strip
 * lights give the foil and satin clean, believable highlights; violet back light rims the edges.
 */
function StudioLights({ high }: { high: boolean }) {
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 8, 4]} intensity={2.0} color="#FFF1D6" />
      <directionalLight position={[-6, -1.5, -5]} intensity={3.6} color="#8B5CF6" />
      <pointLight position={[-4, 3, 3]} intensity={0.9} color="#A78BFA" />
      <Environment resolution={high ? 512 : 128} frames={1} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={3} color="#FFF4E0" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={5} color="#FFE8C2" position={[5, 1.5, 2.5]} target={[0, 0, 0]} scale={[1.2, 7, 1]} />
        <Lightformer form="rect" intensity={3} color="#FFFFFF" position={[-5, 1.5, 1.5]} target={[0, 0, 0]} scale={[1.2, 7, 1]} />
        <Lightformer form="rect" intensity={4} color="#8B5CF6" position={[-2, 1, -6]} target={[0, 0, 0]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#FFE2A8" position={[0, -1, 6]} target={[0, 0, 0]} scale={[8, 1.5, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#FFF6E5" position={[3, 4, -4]} target={[0, 0, 0]} scale={2} />
      </Environment>
    </>
  );
}

// ==========================================
// 9. MASTER CANVAS
// ==========================================
export type LandingShot = 'arrive' | 'logo' | 'zoom' | 'unveil' | 'wide';

export type MidnightBoxStageProps = {
  isOpen: boolean;
  burst: number;
  onToggle: () => void;
  quality: Quality;
  onFallback?: () => void;
  /** Pause the render loop when the stage is off-screen. */
  active?: boolean;
  /** Wheel-zoom is off so the page can scroll; drag-to-orbit stays on. */
  enableZoom?: boolean;
  /** `right` parks the box on the landing's right third so copy can sit on the left. */
  framing?: 'center' | 'right';
  /** Authored camera + yaw for the homepage scroll film. Omit on /experience. */
  shot?: LandingShot;
};

const FRAMING = {
  center: { camera: [4.3, 2.7, 5.4] as [number, number, number], target: [0, -0.05, 0] as [number, number, number], box: [0, -1.15, 0] as [number, number, number] },
  right: { camera: [0.35, 2.15, 6.6] as [number, number, number], target: [1.55, -0.2, 0] as [number, number, number], box: [1.35, -1.15, 0] as [number, number, number] },
};

/** yawOffset is added to the angle that points the foil wordmark at the camera. */
const SHOT: Record<LandingShot, { yawOffset: number; zoom: number; lookY: number; fov: number }> = {
  arrive: { yawOffset: 2.05, zoom: 1, lookY: -0.12, fov: 42 },
  logo: { yawOffset: 0, zoom: 0.88, lookY: -0.22, fov: 36 },
  // Modest lean-in: keep the full foil stamp (frame, wordmark, rule, diamond, sub-line) in frame.
  zoom: { yawOffset: 0, zoom: 0.78, lookY: -0.28, fov: 35 },
  unveil: { yawOffset: 0.38, zoom: 0.82, lookY: 0.22, fov: 40 },
  wide: { yawOffset: 0.32, zoom: 1, lookY: -0.05, fov: 42 },
};

function DirectedBox({
  yawOffset,
  position,
  children,
}: {
  yawOffset: number;
  position: [number, number, number];
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const primed = useRef(false);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const faceCam = Math.atan2(camera.position.x - position[0], camera.position.z - position[2]);
    const target = faceCam + yawOffset;
    if (!primed.current) {
      g.rotation.y = target;
      primed.current = true;
      return;
    }
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target, 2.5, Math.min(dt, 0.05));
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function CameraDirector({ shot, framing }: { shot: LandingShot; framing: 'center' | 'right' }) {
  const pose = SHOT[shot];
  const frame = FRAMING[framing];
  const home = useMemo(() => new THREE.Vector3(...frame.camera), [frame]);
  const target = useMemo(() => new THREE.Vector3(...frame.target), [frame]);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const d = Math.min(dt, 0.05);
    desired.copy(home).sub(target).multiplyScalar(pose.zoom).add(target);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 2.4, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 2.4, d);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 2.4, d);
    look.set(target.x, pose.lookY, target.z);
    camera.lookAt(look);
    camera.fov = THREE.MathUtils.damp(camera.fov, pose.fov, 2.4, d);
    camera.updateProjectionMatrix();
  });

  return null;
}

export function MidnightBoxStage({
  isOpen,
  burst,
  onToggle,
  quality: initial,
  onFallback,
  active = true,
  enableZoom = true,
  framing = 'center',
  shot,
}: MidnightBoxStageProps) {
  const [quality, setQuality] = useState(initial);
  const high = quality === 'high';
  const frame = FRAMING[framing];
  const pose = shot ? SHOT[shot] : null;
  const tight = shot === 'zoom';

  return (
    <Canvas
      key={framing}
      camera={{ position: frame.camera, fov: 42 }}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: high, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.1;
      }}
      className="cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Midnight Foil gift box. Drag to rotate, tap the box to open or close it."
    >
      {/* Step down a tier if frame rate drops; only hand over to the static image after several dips. */}
      <PerformanceMonitor onDecline={() => setQuality('low')} onFallback={onFallback} flipflops={6} />
      <AdaptiveDpr pixelated={false} />
      <StudioLights high={high} />

      {shot && <CameraDirector shot={shot} framing={framing} />}

      <Float
        speed={tight ? 0.6 : 1.4}
        rotationIntensity={tight ? 0.04 : 0.12}
        floatIntensity={tight ? 0.06 : 0.2}
        floatingRange={tight ? [-0.01, 0.01] : [-0.04, 0.04]}
      >
        {pose ? (
          <DirectedBox yawOffset={pose.yawOffset} position={frame.box}>
            <LuxuryMidnightBox isOpen={isOpen} onToggle={onToggle} />
            <PopperBurst fire={burst} count={high ? 160 : 70} />
          </DirectedBox>
        ) : (
          <group position={frame.box}>
            <LuxuryMidnightBox isOpen={isOpen} onToggle={onToggle} />
            <PopperBurst fire={burst} count={high ? 160 : 70} />
          </group>
        )}
      </Float>

      <group position={[frame.box[0], 0, 0]}>
        <FloorGlow />
      </group>
      <ContactShadows
        position={[frame.box[0], -1.16, 0]}
        opacity={0.85}
        scale={7}
        blur={2.2}
        far={3}
        color="#000000"
        resolution={high ? 512 : 256}
        frames={high ? Infinity : 1}
      />

      <ScreenConfetti count={high ? 240 : 110} />

      {!shot && (
        <OrbitControls
          target={frame.target}
          enablePan={false}
          enableZoom={enableZoom}
          minDistance={4}
          maxDistance={9}
          maxPolarAngle={Math.PI / 2 + 0.05}
          enableDamping
        />
      )}
    </Canvas>
  );
}

/** Pre-rendered frame of this scene for devices without WebGL, low memory, save-data or reduced motion. */
export function StaticStudio() {
  return (
    <div className="relative mx-auto h-full w-full max-w-3xl">
      <Image
        src="/hero/midnight-foil.png"
        alt="Obsidian Midnight Foil gift box with gold foil lettering, its lid lifted over a cake slice, macarons, truffles and a small wrapped present, with confetti falling"
        fill
        priority
        sizes="100vw"
        className="object-contain"
      />
    </div>
  );
}

const NAV = [
  { href: '/build', label: 'Build a box', active: true },
  { href: '/sos', label: 'SOS express' },
  { href: '/plan', label: 'Party calculator' },
  { href: '/decor', label: 'Decor' },
  { href: '/dashboard', label: 'My celebrations' },
];

// ==========================================
// 10. MASTER PAGE CONTAINER WITH FROSTED UI
// ==========================================
export default function FestoonExperience() {
  const [isOpen, setIsOpen] = useState(true); // Default open to show floating treats
  const [burst, setBurst] = useState(1); // Pops once on load
  const quality = useSyncExternalStore(subscribeNoop, detectQuality, () => null);
  const [fallback, setFallback] = useState(false);
  const useStatic = quality === 'static' || fallback;

  const toggle = () => {
    if (!isOpen) setBurst((b) => b + 1);
    setIsOpen(!isOpen);
  };

  return (
    // A <div>, not <main>: the root layout already provides the page's <main> landmark.
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050608] font-sans text-slate-100 select-none">
      {/* Background Volumetric Glow Overlays */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      {/* TOP FLOATING FROSTED NAVBAR */}
      <header className="fixed inset-x-0 top-4 z-50 mx-auto max-w-6xl px-4">
        <div className="relative flex items-center justify-between rounded-2xl border border-white/10 bg-[#0D0E17]/65 px-6 py-3.5 shadow-2xl backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold tracking-tight text-white">festoon</span>
          </Link>

          <nav className="hidden items-center gap-1 text-xs font-medium text-slate-400 md:flex" aria-label="Main">
            {NAV.map((n) =>
              n.active ? (
                <Link key={n.href} href={n.href} className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white shadow-inner">
                  {n.label}
                </Link>
              ) : (
                <Link key={n.href} href={n.href} className="px-4 py-2 transition-colors hover:text-white">
                  {n.label}
                </Link>
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={toggle}
            aria-pressed={isOpen}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-all hover:bg-white/10 active:scale-95"
          >
            {isOpen ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} className="text-amber-400" />}
            <span>Peek inside</span>
          </button>
        </div>
      </header>

      {/* 3D WEBGL INTERACTION VIEWPORT */}
      <div className="relative h-screen w-full">
        {quality === null ? null : useStatic ? (
          <StaticStudio />
        ) : (
          <SceneBoundary name="festoon-experience" fallback={<StaticStudio />}>
            <MidnightBoxStage isOpen={isOpen} burst={burst} onToggle={toggle} quality={quality} onFallback={() => setFallback(true)} />
          </SceneBoundary>
        )}
      </div>

      {/* BOTTOM CONTROL & DIETARY PILLS BAR */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto max-w-6xl px-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-[#12131F]/80 px-3.5 py-1.5 text-xs font-medium text-amber-300/90 shadow-lg backdrop-blur-lg">
              <span className="text-[10px]" aria-hidden>
                ⊘
              </span>{' '}
              Eggless
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12131F]/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-lg transition-colors hover:border-emerald-500/40">
              <span className="text-emerald-400" aria-hidden>
                🍃
              </span>{' '}
              Vegan
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12131F]/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-lg transition-colors hover:border-amber-500/40">
              <span className="text-amber-400" aria-hidden>
                🌾
              </span>{' '}
              Gluten-free
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-[#12131F]/60 px-4 py-1.5 text-xs font-medium text-slate-400 backdrop-blur-md sm:flex">
            <span>Drag to rotate • tap the box or &quot;Peek inside&quot; to open it</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
