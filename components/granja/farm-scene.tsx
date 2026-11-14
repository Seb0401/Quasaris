"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { TileState } from "@/lib/granja-sim";
import { ROTATION_COLOR } from "@/lib/granja-sim";
import { GEO, MAT, SOIL, rand } from "./low-poly";
import { Plant } from "./plants";

const TILE = 2;
const GAP = 0.22;
const STEP = TILE + GAP;
const SOIL_H = 0.3;
const PLANTS_PER_SIDE = 3;

export type Weather = "clear" | "frost" | "heat" | "dry";

type Props = {
  cols: number;
  rows: number;
  tiles: TileState[];
  reservoir: number; // 0..1 de agua que queda
  weather: Weather;
  harvestTiles: number[];
  harvestKey: string; // cambia cada mes para relanzar la animación de monedas
  selectedTile: number | null;
  onTileTap: (i: number) => void;
};

function tilePos(i: number, cols: number, rows: number): [number, number] {
  const c = i % cols;
  const r = Math.floor(i / cols);
  return [(c - (cols - 1) / 2) * STEP, (r - (rows - 1) / 2) * STEP];
}

function Tile({ i, x, z, state, selected, onTap }: { i: number; x: number; z: number; state: TileState; selected: boolean; onTap: (i: number) => void }) {
  const look = state.status === "dry" || state.status === "water_stress" ? "dry" : state.status === "climate_risk" ? "frost" : "ok";
  const plants = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    const cell = TILE / PLANTS_PER_SIDE;
    for (let a = 0; a < PLANTS_PER_SIDE; a++)
      for (let b = 0; b < PLANTS_PER_SIDE; b++) {
        const s = i * 31 + a * 7 + b;
        out.push({
          pos: [x - TILE / 2 + cell * (a + 0.5) + (rand(s) - 0.5) * 0.25, SOIL_H, z - TILE / 2 + cell * (b + 0.5) + (rand(s + 3) - 0.5) * 0.25],
          rot: rand(s + 9) * Math.PI * 2,
        });
      }
    return out;
  }, [i, x, z]);

  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // fue un arrastre de cámara, no un toque
    onTap(i);
  };

  const frameColor = selected ? "#ffffff" : (ROTATION_COLOR[state.rotationId] ?? "#999");

  return (
    <group>
      {/* marco de color = rotación asignada */}
      <mesh position={[x, 0.04, z]} scale={[TILE + 0.18, 0.08, TILE + 0.18]} geometry={GEO.soil}>
        <meshStandardMaterial color={frameColor} flatShading emissive={selected ? "#ffffff" : "#000000"} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
      <mesh position={[x, SOIL_H / 2 + 0.05, z]} scale={[TILE, SOIL_H, TILE]} geometry={GEO.soil} material={SOIL[state.status] ?? SOIL.bare} onClick={tap} />
      {/* surcos */}
      {state.cropId === null &&
        [-0.6, 0, 0.6].map((d) => <mesh key={d} position={[x + d, SOIL_H + 0.06, z]} scale={[0.12, 0.05, TILE * 0.9]} geometry={GEO.soil} material={SOIL.ok} />)}
      {state.cropId && plants.map((p, k) => <Plant key={k} cropId={state.cropId!} growth={state.growth} look={look} position={p.pos} rotationY={p.rot} />)}
    </group>
  );
}

function Reservoir({ x, z, level }: { x: number; z: number; level: number }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const m = water.current;
    if (!m) return;
    const target = Math.max(0.02, level) * 1.1;
    m.scale.y += (target - m.scale.y) * Math.min(1, dt * 3);
    m.position.y = 0.1 + m.scale.y / 2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[1.6, 1.7, 1.3, 10, 1, true]} />
        <meshStandardMaterial color="#8c8f94" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={water} material={MAT.water} scale={[1, 1, 1]}>
        <cylinderGeometry args={[1.5, 1.55, 1, 10]} />
      </mesh>
    </group>
  );
}

function House({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.7, 0]} scale={[2.2, 1.4, 1.8]} geometry={GEO.soil} material={MAT.wall} />
      <mesh position={[0, 1.9, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]} geometry={GEO.roof} material={MAT.roof} />
    </group>
  );
}

function Tree({ x, z, round, s = 1 }: { x: number; z: number; round?: boolean; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.4, 0]} geometry={GEO.trunk} material={MAT.trunk} />
      <mesh position={[0, round ? 1.3 : 1.5, 0]} geometry={round ? GEO.crownRound : GEO.crown} material={MAT.leafDark} />
    </group>
  );
}

function Coins({ positions }: { positions: [number, number][] }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    g.children.forEach((c) => {
      c.position.y = 0.8 + t * 1.6;
      c.rotation.y = t * 6;
    });
    g.visible = t < 1.6;
  });
  return (
    <group ref={group}>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]} rotation={[Math.PI / 2, 0, 0]} geometry={GEO.coin} material={MAT.coin} />
      ))}
    </group>
  );
}

function Particles({ kind, width }: { kind: "snow" | "dust"; width: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 260;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rand(i) - 0.5) * width;
      arr[i * 3 + 1] = rand(i + 1) * 8;
      arr[i * 3 + 2] = (rand(i + 2) - 0.5) * width;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [width]);
  useFrame((_, dt) => {
    const p = ref.current;
    if (!p) return;
    const pos = p.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * (kind === "snow" ? 1.2 : 0.4);
      let x = pos.getX(i) + (kind === "dust" ? dt * 1.5 : Math.sin(y + i) * dt * 0.2);
      if (y < 0) y = 8;
      if (x > width / 2) x = -width / 2;
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={kind === "snow" ? MAT.snow : MAT.dust} />;
}

const SKY: Record<Weather, string> = { clear: "#bfe3f5", frost: "#dfe9f2", heat: "#f6d7a8", dry: "#ecd9b4" };
const SUN: Record<Weather, string> = { clear: "#fff4dd", frost: "#e6f0ff", heat: "#ffc27a", dry: "#ffd89a" };

export default function FarmScene({ cols, rows, tiles, reservoir, weather, harvestTiles, harvestKey, selectedTile, onTileTap }: Props) {
  const w = cols * STEP;
  const d = rows * STEP;
  const size = Math.max(w, d);
  const coinPos = harvestTiles.map((i) => tilePos(i, cols, rows));

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [size * 0.55, size * 0.75, size * 0.95], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: "low-power", preserveDrawingBuffer: typeof window !== "undefined" && window.location.search.includes("shot") }}
      className="touch-none"
    >
      <color attach="background" args={[SKY[weather]]} />
      <fog attach="fog" args={[SKY[weather], size * 1.6, size * 3.2]} />
      <hemisphereLight args={["#ffffff", "#b49a6c", 1.1]} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} color={SUN[weather]} />

      {/* terreno desértico de Majes */}
      <mesh position={[0, -0.05, 0]} scale={[size * 3, 0.1, size * 3]} geometry={GEO.soil} material={MAT.ground} />
      <mesh position={[0, -0.02, 0]} scale={[w + 1.4, 0.06, d + 1.4]} geometry={GEO.soil} material={MAT.groundDark} />

      {tiles.map((t, i) => {
        const [x, z] = tilePos(i, cols, rows);
        return <Tile key={i} i={i} x={x} z={z} state={t} selected={selectedTile === i} onTap={onTileTap} />;
      })}

      <Reservoir x={w / 2 + 2.6} z={-d / 2 + 1.6} level={reservoir} />
      {/* canal */}
      <mesh position={[w / 2 + 0.9, 0.06, -d / 2 + 1.6]} scale={[2.2, 0.06, 0.35]} geometry={GEO.soil} material={MAT.water} />
      <House x={-w / 2 - 2.8} z={-d / 2 + 1.2} />
      <Tree x={-w / 2 - 2.4} z={d / 2 - 0.5} />
      <Tree x={-w / 2 - 3.6} z={d / 2 + 0.6} round s={0.8} />
      <Tree x={w / 2 + 2.4} z={d / 2 + 0.4} s={0.9} />
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[(rand(k + 50) - 0.5) * size * 2.2, 0.1, d / 2 + 3 + rand(k + 60) * 4]} geometry={GEO.rock} material={MAT.rock} scale={0.6 + rand(k) * 0.6} />
      ))}

      {coinPos.length > 0 && <Coins key={harvestKey} positions={coinPos} />}
      {weather === "frost" && <Particles kind="snow" width={size * 1.4} />}
      {weather === "dry" && <Particles kind="dust" width={size * 1.4} />}

      <OrbitControls
        enablePan={false}
        target={[0, 0, 0]}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        minDistance={size * 0.6}
        maxDistance={size * 2.2}
        enableDamping
      />
    </Canvas>
  );
}
