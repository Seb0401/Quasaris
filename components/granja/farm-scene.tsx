"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TileState } from "@/lib/granja-sim";
import { rotationColor } from "@/lib/granja-sim";
import { OFF, addableCells, groundCells, isOn } from "@/lib/farm-shape";
import { Clouds, Cow, Farmer, House, Pond, ShapeFence, ShapedIsland, Tree, Volcano, Windmill } from "./diorama-props";
import { GEO, MAT, SOIL, rand } from "./low-poly";
import { PlantField } from "./plant-field";

const TILE = 2;
const GAP = 0.22;
const STEP = TILE + GAP;
const SOIL_H = 0.3;

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
  /** Casillas afectadas por una alerta en este mes (marco rojo). */
  alertTiles?: number[];
  /** Modo pintar: la cámara se bloquea y arrastrar el dedo pinta casillas. */
  paintMode: boolean;
  onPaint: (i: number, start: boolean) => void;
  onSelect: (i: number) => void;
  /** Color de capa por casilla (null = suelo normal). */
  tints?: (string | null)[];
  /** Modo forma: tocar una casilla del borde la quita y tocar una vecina vacía la suma. */
  editShape?: boolean;
  onEditCell?: (r: number, c: number) => void;
};

const tintCache = new Map<string, THREE.MeshStandardMaterial>();
function tintMat(color: string) {
  let m = tintCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
    tintCache.set(color, m);
  }
  return m;
}

function cellPos(r: number, c: number, cols: number, rows: number): [number, number] {
  return [(c - (cols - 1) / 2) * STEP, (r - (rows - 1) / 2) * STEP];
}

function tilePos(i: number, cols: number, rows: number): [number, number] {
  return cellPos(Math.floor(i / cols), i % cols, cols, rows);
}

/** Casilla vacía que se puede sumar a la chacra (modo forma). */
function Ghost({ x, z, onTap }: { x: number; z: number; onTap: () => void }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 4, 0]}>
      <mesh
        position={[0, 0.06, 0]}
        rotation={[0, -Math.PI / 4, 0]}
        scale={[TILE * 0.92, 0.12, TILE * 0.92]}
        geometry={GEO.soil}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 6) onTap();
        }}
      >
        <meshStandardMaterial color="#f4ffe6" transparent opacity={0.7} emissive="#b9ff63" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[0.9, 0.05, 0.2]} geometry={GEO.soil}>
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[0.2, 0.05, 0.9]} geometry={GEO.soil}>
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>
    </group>
  );
}

function Plot({
  i,
  x,
  z,
  state,
  selected,
  alert,
  tint,
  paintMode,
  paintingRef,
  onPaint,
  onSelect,
}: {
  i: number;
  x: number;
  z: number;
  state: TileState;
  selected: boolean;
  alert: boolean;
  tint: string | null;
  paintMode: boolean;
  paintingRef: React.RefObject<boolean>;
  onPaint: (i: number, start: boolean) => void;
  onSelect: (i: number) => void;
}) {
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!paintMode) return;
    e.stopPropagation();
    paintingRef.current = true;
    onPaint(i, true);
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!paintMode || !paintingRef.current) return;
    e.stopPropagation();
    onPaint(i, false);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (paintMode || e.delta > 6) return; // en modo ver: tocar abre la ficha
    onSelect(i);
  };
  const frame = selected ? "#ffffff" : alert ? "#ff5a4f" : rotationColor(state.rotationId);
  const soilMat = tint ? tintMat(tint) : (SOIL[state.status] ?? SOIL.bare);
  return (
    <group>
      <mesh position={[x, 0.06, z]} scale={[TILE + 0.16, 0.12, TILE + 0.16]} geometry={GEO.soil} receiveShadow>
        <meshStandardMaterial color={frame} flatShading emissive={selected ? "#ffffff" : "#000000"} emissiveIntensity={selected ? 0.4 : 0} />
      </mesh>
      <mesh
        position={[x, SOIL_H / 2 + 0.06, z]}
        scale={[TILE, SOIL_H, TILE]}
        geometry={GEO.soil}
        material={soilMat}
        onPointerDown={down}
        onPointerOver={over}
        onClick={click}
        receiveShadow
      />
      {!tint &&
        [-0.66, 0, 0.66].map((d) => (
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

export default function FarmScene({ cols, rows, tiles, reservoir, weather, harvestTiles, harvestKey, selectedTile, alertTiles, paintMode, onPaint, onSelect, tints, editShape, onEditCell }: Props) {
  const paintingRef = useRef(false);
  useEffect(() => {
    const stop = () => {
      paintingRef.current = false;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);
  const ids = useMemo(() => tiles.map((t) => t.rotationId), [tiles]);
  const shapeKey = ids.map((id) => (isOn(id) ? 1 : 0)).join("") + `${cols}x${rows}`;
  // terreno: las casillas de la chacra más un borde de pasto de una casilla
  const layout = useMemo(() => {
    const on = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols && isOn(ids[r * cols + c]);
    const ground = groundCells({ cols, rows, tiles: ids }, 1).map((g) => {
      const [x, z] = cellPos(g.r, g.c, cols, rows);
      return { ...g, x, z };
    });
    // cerca: un tramo por cada lado de casilla que da al exterior
    const h = STEP / 2 + 0.05;
    const segments: { x1: number; z1: number; x2: number; z2: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (!on(r, c)) continue;
        const [x, z] = cellPos(r, c, cols, rows);
        if (!on(r - 1, c)) segments.push({ x1: x - h, z1: z - h, x2: x + h, z2: z - h });
        if (!on(r + 1, c)) segments.push({ x1: x - h, z1: z + h, x2: x + h, z2: z + h });
        if (!on(r, c - 1)) segments.push({ x1: x - h, z1: z - h, x2: x - h, z2: z + h });
        if (!on(r, c + 1)) segments.push({ x1: x + h, z1: z - h, x2: x + h, z2: z + h });
      }
    // decoración sobre el borde de pasto, en lugares distintos y separados entre sí
    const free = ground.filter((g) => !on(g.r, g.c));
    const used: { x: number; z: number }[] = [];
    const pick = (score: (g: { x: number; z: number }) => number) => {
      const g = free.filter((f) => used.every((u) => Math.hypot(u.x - f.x, u.z - f.z) > STEP * 1.4)).sort((a, b) => score(a) - score(b))[0];
      if (g) used.push(g);
      return g ?? null;
    };
    const house = pick((g) => g.x + g.z);
    const pond = pick((g) => -g.x + g.z);
    const mill = pick((g) => g.x - g.z);
    const volcano = pick((g) => -g.x - g.z);
    const trees = [pick((g) => -g.x), pick((g) => g.z), pick((g) => -g.z)].filter((g): g is NonNullable<typeof g> => g !== null);
    const xs = ground.map((g) => g.x);
    const zs = ground.map((g) => g.z);
    const W = Math.max(...xs) - Math.min(...xs) + STEP;
    const D = Math.max(...zs) - Math.min(...zs) + STEP;
    return { ground, segments, house, pond, mill, volcano, trees, W, D };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey]);
  const ghosts = useMemo(() => (editShape ? addableCells({ cols, rows, tiles: ids }) : []), [editShape, cols, rows, ids]);
  const { W, D } = layout;
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

      <ShapedIsland cells={layout.ground} step={STEP} />
      <ShapeFence segments={layout.segments} />

      {tiles.map((t, i) => {
        if (t.rotationId === OFF) return null;
        const [x, z] = tilePos(i, cols, rows);
        return (
          <Plot
            key={i}
            i={i}
            x={x}
            z={z}
            state={t}
            selected={selectedTile === i}
            alert={alertTiles?.includes(i) ?? false}
            tint={tints?.[i] ?? null}
            paintMode={paintMode && !editShape}
            paintingRef={paintingRef}
            onPaint={onPaint}
            onSelect={editShape && onEditCell ? () => onEditCell(Math.floor(i / cols), i % cols) : onSelect}
          />
        );
      })}
      {ghosts.map((g) => {
        const [x, z] = cellPos(g.r, g.c, cols, rows);
        return <Ghost key={`${g.r}:${g.c}`} x={x} z={z} onTap={() => onEditCell?.(g.r, g.c)} />;
      })}
      <PlantField tiles={tiles} tileCenter={center} tileSize={TILE} soilTop={SOIL_H + 0.06} />
      {cows.map((c) => (
        <Cow key={c.i} x={c.x} z={c.z} rot={c.rot} seed={c.i} />
      ))}

      {/* decoración sobre el borde de pasto */}
      {layout.house && <House x={layout.house.x} z={layout.house.z} rot={0.4} />}
      {layout.house && <Farmer x={layout.house.x + 1.1} z={layout.house.z + 0.6} rot={Math.PI / 2} />}
      {layout.mill && <Windmill x={layout.mill.x} z={layout.mill.z} />}
      {layout.pond && <Pond x={layout.pond.x} z={layout.pond.z} level={reservoir} s={0.68} />}
      {layout.trees.map((tr, k) => <Tree key={k} x={tr.x} z={tr.z} s={0.75 - k * 0.05} variant={k} />)}
      {layout.volcano && <Volcano x={layout.volcano.x} z={layout.volcano.z} s={0.45} />}

      {coinPos.length > 0 && <Coins key={harvestKey} positions={coinPos} />}
      <Clouds radius={Math.max(W, D) * 0.62} />
      {weather === "frost" && <Particles kind="snow" width={Math.max(W, D)} />}
      {weather === "dry" && <Particles kind="dust" width={Math.max(W, D)} />}

      <OrbitControls enabled={!paintMode} enablePan={false} minPolarAngle={0.85} maxPolarAngle={1.05} minZoom={8} maxZoom={120} enableDamping target={[0, 0, 0]} />
    </Canvas>
  );
}
