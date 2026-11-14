"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TileState } from "@/lib/granja-sim";
import { GEO, MAT, rand } from "./low-poly";

/**
 * Todas las plantas de la chacra con InstancedMesh: una malla por (geometría, material).
 * ~15 llamadas de dibujo en lugar de cientos, para que corra en celulares de gama baja.
 */

type GeoKey = keyof typeof GEO;
type MatKey = keyof typeof MAT;
type Look = "ok" | "dry" | "frost";
type Part = { g: GeoKey; m: MatKey; p: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] };

const leaf = (look: Look): MatKey => (look === "dry" ? "leafDry" : look === "frost" ? "leafFrost" : "leaf");
const dark = (look: Look): MatKey => (look === "ok" ? "leafDark" : leaf(look));

function parts(cropId: string, look: Look, growth: number): Part[] {
  switch (cropId) {
    case "alfalfa":
      return [
        { g: "bush", m: leaf(look), p: [0, 0.15, 0], s: [1.1, 0.6, 1.1] },
        { g: "bushSmall", m: dark(look), p: [0.15, 0.22, 0.1] },
        ...(growth > 0.6 && look === "ok" ? [{ g: "flower", m: "flowerPurple", p: [-0.05, 0.38, 0] } as Part] : []),
      ];
    case "papa":
      return [
        { g: "bush", m: dark(look), p: [0, 0.25, 0], s: [1, 0.9, 1] },
        ...(growth > 0.45 && growth < 0.8 && look === "ok" ? [{ g: "flower", m: "potatoFlower", p: [0.05, 0.52, 0.05] } as Part] : []),
      ];
    case "cebolla":
      return [
        { g: "bulb", m: "onionBulb", p: [0, 0.08, 0] },
        { g: "blade", m: leaf(look), p: [0, 0.4, 0] },
        { g: "blade", m: leaf(look), p: [0.06, 0.36, 0], r: [0, 0, -0.25] },
        { g: "blade", m: leaf(look), p: [-0.06, 0.36, 0], r: [0, 0, 0.25] },
      ];
    case "maiz_chala":
      return [
        { g: "stalk", m: look === "ok" ? "cornStalk" : leaf(look), p: [0, 0.7, 0] },
        { g: "cornLeaf", m: leaf(look), p: [0.18, 0.6, 0], r: [0, 0, -1] },
        { g: "cornLeaf", m: leaf(look), p: [-0.18, 0.9, 0], r: [0, 0, 1] },
        ...(growth > 0.55 ? [{ g: "cob", m: "cob", p: [0.09, 0.95, 0], r: [0, 0, -0.4] } as Part] : []),
      ];
    default: // haba, frijol
      return [
        { g: "bushSmall", m: leaf(look), p: [0, 0.2, 0] },
        { g: "bushSmall", m: dark(look), p: [0.08, 0.36, 0.04], s: [0.8, 0.8, 0.8] },
        ...(growth > 0.5 ? [{ g: "pod", m: "pod", p: [-0.14, 0.24, 0.05], r: [0, 0, 0.6] } as Part] : []),
      ];
  }
}

type Instance = { tile: number; plant: THREE.Matrix4; local: THREE.Matrix4 };

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const scaleM = new THREE.Matrix4();

function localMatrix(p: Part) {
  return new THREE.Matrix4().compose(tmpV.set(...p.p), tmpQ.setFromEuler(tmpE.set(...(p.r ?? [0, 0, 0]))), tmpS.set(...(p.s ?? [1, 1, 1])));
}

export function PlantField({
  tiles,
  tileCenter,
  tileSize,
  soilTop,
  perSide = 3,
}: {
  tiles: TileState[];
  tileCenter: (i: number) => [number, number];
  tileSize: number;
  soilTop: number;
  perSide?: number;
}) {
  // agrupa las piezas por (geometría|material)
  const groups = useMemo(() => {
    const map = new Map<string, { g: GeoKey; m: MatKey; items: Instance[] }>();
    const cell = tileSize / perSide;
    tiles.forEach((t, i) => {
      if (!t.cropId) return;
      const look: Look = t.status === "dry" || t.status === "water_stress" ? "dry" : t.status === "climate_risk" ? "frost" : "ok";
      const ps = parts(t.cropId, look, t.growth);
      const [cx, cz] = tileCenter(i);
      for (let a = 0; a < perSide; a++)
        for (let b = 0; b < perSide; b++) {
          const s = i * 31 + a * 7 + b;
          const x = cx - tileSize / 2 + cell * (a + 0.5) + (rand(s) - 0.5) * 0.25;
          const z = cz - tileSize / 2 + cell * (b + 0.5) + (rand(s + 3) - 0.5) * 0.25;
          const plant = new THREE.Matrix4().compose(tmpV.set(x, soilTop, z), tmpQ.setFromEuler(tmpE.set(0, rand(s + 9) * Math.PI * 2, 0)), tmpS.set(1, 1, 1));
          for (const p of ps) {
            const key = `${p.g}|${p.m}`;
            if (!map.has(key)) map.set(key, { g: p.g, m: p.m, items: [] });
            map.get(key)!.items.push({ tile: i, plant, local: localMatrix(p) });
          }
        }
    });
    return [...map.entries()];
  }, [tiles, tileCenter, tileSize, soilTop, perSide]);

  // escala animada por casilla (crecimiento suave)
  const scales = useRef<number[]>([]);
  const targets = tiles.map((t) => (t.cropId ? 0.25 + 0.75 * Math.min(1, t.growth * 1.4) : 0));
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);

  const write = () => {
    groups.forEach(([, grp], k) => {
      const mesh = meshes.current[k];
      if (!mesh) return;
      grp.items.forEach((it, j) => {
        const sc = scales.current[it.tile] ?? 0.25;
        scaleM.makeScale(sc, sc, sc);
        tmpM.copy(it.plant).multiply(scaleM).multiply(it.local);
        mesh.setMatrixAt(j, tmpM);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  useLayoutEffect(() => {
    tiles.forEach((_, i) => {
      if (scales.current[i] === undefined) scales.current[i] = 0.25;
    });
    write();
  });

  useFrame((_, dt) => {
    let moving = false;
    targets.forEach((tg, i) => {
      const cur = scales.current[i] ?? 0.25;
      if (Math.abs(tg - cur) > 0.002) {
        scales.current[i] = cur + (tg - cur) * Math.min(1, dt * 4);
        moving = true;
      }
    });
    if (moving) write();
  });

  return (
    <>
      {groups.map(([key, grp], k) => (
        <instancedMesh
          key={`${key}:${grp.items.length}`}
          ref={(m) => {
            meshes.current[k] = m;
          }}
          args={[GEO[grp.g], MAT[grp.m] as THREE.Material, grp.items.length]}
          frustumCulled={false}
          castShadow
        />
      ))}
    </>
  );
}
