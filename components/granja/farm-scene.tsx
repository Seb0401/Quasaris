"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TileState } from "@/lib/granja-sim";
import { ROTATION_COLOR } from "@/lib/granja-sim";
import { Clouds, Cow, Farmer, Fence, House, Island, Pond, Tree, Volcano, Windmill } from "./diorama-props";
import { GEO, MAT, SOIL, rand } from "./low-poly";
import { PlantField } from "./plant-field";

const TILE = 2;
const GAP = 0.22;
const STEP = TILE + GAP;
const SOIL_H = 0.3;
const MARGIN_X = 3.4;
const MARGIN_Z = 2.8;

export type Weather = "clear" | "frost" | "heat" | "dry";

/** Fondo CSS detrás del canvas transparente (cielo pastel según el clima del mes). */
export const SKY_GRADIENT: Record<Weather, string> = {
  clear: "linear-gradient(180deg,#bfe6fb 0%,#e9f6ee 100%)",
  frost: "linear-gradient(180deg,#d6e4f3 0%,#f3f6fa 100%)",
  heat: "linear-gradient(180deg,#ffd9a8 0%,#fff1dc 100%)",
  dry: "linear-gradient(180deg,#f0d3a2 0%,#f8ecd6 100%)",
};

type Props = {
  cols: number;
  rows: number;
  tiles: TileState[];
  reservoir: number; // 0..1 de agua que queda
  weather: Weather;
  harvestTiles: number[];
  harvestKey: string;
  selectedTile: number | null;
  onTileTap: (i: number) => void;
};

function tilePos(i: number, cols: number, rows: number): [number, number] {
  const c = i % cols;
  const r = Math.floor(i / cols);
  return [(c - (cols - 1) / 2) * STEP, (r - (rows - 1) / 2) * STEP];
}

function Plot({ i, x, z, state, selected, onTap }: { i: number; x: number; z: number; state: TileState; selected: boolean; onTap: (i: number) => void }) {
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // fue un arrastre de cámara
    onTap(i);
  };
  const frame = selected ? "#ffffff" : (ROTATION_COLOR[state.rotationId] ?? "#999");
  return (
    <group>
      <mesh position={[x, 0.06, z]} scale={[TILE + 0.16, 0.12, TILE + 0.16]} geometry={GEO.soil} receiveShadow>
        <meshStandardMaterial color={frame} flatShading emissive={selected ? "#ffffff" : "#000000"} emissiveIntensity={selected ? 0.4 : 0} />
      </mesh>
      <mesh position={[x, SOIL_H / 2 + 0.06, z]} scale={[TILE, SOIL_H, TILE]} geometry={GEO.soil} material={SOIL[state.status] ?? SOIL.bare} onClick={tap} receiveShadow />
      {[-0.66, 0, 0.66].map((d) => (
        <mesh key={d} position={[x + d, SOIL_H + 0.08, z]} scale={[0.16, 0.06, TILE * 0.92]} geometry={GEO.soil} material={SOIL.bare} receiveShadow />
      ))}
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
      c.position.y = 1 + t * 1.8;
      c.rotation.z = t * 6;
    });
    g.visible = t < 1.6;
  });
  return (
    <group ref={group}>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 1, z]} rotation={[Math.PI / 2, 0, 0]} geometry={GEO.coin} material={MAT.coin} scale={1.4} />
      ))}
    </group>
  );
}

function Particles({ kind, width }: { kind: "snow" | "dust"; width: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 220;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rand(i) - 0.5) * width;
      arr[i * 3 + 1] = rand(i + 1) * 9;
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
      if (y < 0) y = 9;
      if (x > width / 2) x = -width / 2;
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={kind === "snow" ? MAT.snow : MAT.dust} />;
}

/** Ajusta el zoom ortográfico para que todo el diorama entre en pantalla. */
function AutoZoom({ span, height }: { span: number; height: number }) {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  useEffect(() => {
    const zx = size.width / (span * 0.82);
    const zy = size.height / (span * 0.5 + height);
    const cam = get().camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(zx, zy);
    cam.updateProjectionMatrix();
  }, [get, size, span, height]);
  return null;
}

export default function FarmScene({ cols, rows, tiles, reservoir, weather, harvestTiles, harvestKey, selectedTile, onTileTap }: Props) {
  const w = cols * STEP;
  const d = rows * STEP;
  const W = w + MARGIN_X * 2;
  const D = d + MARGIN_Z * 2;
  const span = (W + D) * 0.72;
  const center = useCallback((i: number) => tilePos(i, cols, rows), [cols, rows]);
  const coinPos = harvestTiles.map((i) => tilePos(i, cols, rows));

  // vacas sobre las casillas con alfalfa (máximo 3)
  const cows = tiles
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.cropId === "alfalfa")
    .slice(0, 3)
    .map(({ i }) => {
      const [x, z] = tilePos(i, cols, rows);
      return { x: x + (rand(i) - 0.5) * 0.6, z: z + (rand(i + 5) - 0.5) * 0.6, rot: rand(i + 2) * Math.PI * 2, i };
    });

  const shadowExtent = Math.max(W, D) * 0.75;

  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [30, 26, 30], zoom: 20, near: -100, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: typeof window !== "undefined" && window.location.search.includes("shot") }}
      className="touch-none"
    >
      <AutoZoom span={span} height={4} />
      <hemisphereLight args={["#ffffff", "#c9b28a", 1.15]} />
      <directionalLight
        position={[14, 22, 8]}
        intensity={1.7}
        color={weather === "heat" || weather === "dry" ? "#ffd29a" : weather === "frost" ? "#e6f0ff" : "#fff6e6"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0005}
      />

      <Island w={W} d={D} />
      <Fence w={W - 0.5} d={D - 0.5} />

      {tiles.map((t, i) => {
        const [x, z] = tilePos(i, cols, rows);
        return <Plot key={i} i={i} x={x} z={z} state={t} selected={selectedTile === i} onTap={onTileTap} />;
      })}
      <PlantField tiles={tiles} tileCenter={center} tileSize={TILE} soilTop={SOIL_H + 0.06} />
      {cows.map((c) => (
        <Cow key={c.i} x={c.x} z={c.z} rot={c.rot} seed={c.i} />
      ))}

      {/* decoración alrededor de la chacra */}
      <House x={-w / 2 - 1.9} z={-d / 2 + 0.6} rot={0.4} />
      <Windmill x={-w / 2 - 2} z={d / 2 - 0.4} />
      <Farmer x={-w / 2 - 0.55} z={0.4} rot={Math.PI / 2} />
      <Pond x={w / 2 + 1.85} z={-d / 2 + 0.9} level={reservoir} />
      <mesh position={[w / 2 + 0.45, 0.02, -d / 2 + 0.9]} scale={[1.2, 0.05, 0.4]} geometry={GEO.soil} material={MAT.water} />
      <Tree x={w / 2 + 1.9} z={d / 2 - 0.6} s={0.9} />
      <Tree x={w / 2 + 2.3} z={0.6} s={0.7} variant={1} />
      <Tree x={-w / 2 - 2.6} z={0.9} s={0.65} variant={1} />
      <Volcano x={-W / 2 + 1.2} z={-D / 2 + 0.9} s={0.55} />

      {coinPos.length > 0 && <Coins key={harvestKey} positions={coinPos} />}
      <Clouds radius={Math.max(W, D) * 0.62} />
      {weather === "frost" && <Particles kind="snow" width={Math.max(W, D)} />}
      {weather === "dry" && <Particles kind="dust" width={Math.max(W, D)} />}

      <OrbitControls enablePan={false} minPolarAngle={0.85} maxPolarAngle={1.05} minZoom={8} maxZoom={120} enableDamping target={[0, 0, 0]} />
    </Canvas>
  );
}
