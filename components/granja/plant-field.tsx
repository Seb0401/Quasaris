"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Stage, TileState } from "@/lib/granja-sim";
import { GEO, MAT, rand } from "./low-poly";
import { isOrchard } from "@/lib/crop-calendar";

/**
 * Todas las plantas de la chacra con InstancedMesh: una malla por (geometría, material).
 * ~15 llamadas de dibujo en lugar de cientos, para que corra en celulares de gama baja.
 */

type GeoKey = keyof typeof GEO;
type MatKey = keyof typeof MAT;
type Look = "ok" | "dry" | "frost";
type Part = { g: GeoKey; m: MatKey; p: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] };

const leaf = (look: Look, ok: MatKey = "leaf"): MatKey => (look === "dry" ? "leafDry" : look === "frost" ? "leafFrost" : ok);

/** Piezas de cada cultivo según su etapa: brote, crecimiento, flor y cosecha (bien distintas entre cultivos). */
function parts(cropId: string, look: Look, stage: Stage): Part[] {
  if (stage === "sprout") {
    const m = leaf(look, "leafLight");
    return [
      { g: "sproutLeaf", m, p: [0.05, 0.1, 0], r: [0, 0, -0.5] },
      { g: "sproutLeaf", m, p: [-0.05, 0.1, 0], r: [0, 0, 0.5] },
    ];
  }
  const late = stage === "harvest";
  switch (cropId) {
    case "alfalfa":
      return [
        { g: "bush", m: leaf(look, "leafLight"), p: [0, 0.15, 0], s: [1.15, 0.65, 1.15] },
        { g: "bushSmall", m: leaf(look, "leaf"), p: [0.16, 0.24, 0.1] },
        ...(stage !== "grow" && look === "ok"
          ? ([
              { g: "flower", m: "flowerPurple", p: [-0.06, 0.4, 0] },
              { g: "flower", m: "flowerPurple", p: [0.14, 0.38, 0.12] },
              { g: "flower", m: "flowerPurple", p: [0.02, 0.36, -0.15] },
            ] as Part[])
          : []),
      ];
    case "papa":
      return [
        { g: "bush", m: late ? leaf(look, "leafYellow") : leaf(look, "leafDark"), p: [0, 0.27, 0], s: [1.05, 0.95, 1.05] },
        ...(stage === "flower" && look === "ok"
          ? ([
              { g: "flower", m: "whiteFlower", p: [0.06, 0.55, 0.05] },
              { g: "flower", m: "whiteFlower", p: [-0.1, 0.5, -0.04] },
            ] as Part[])
          : []),
        ...(late
          ? ([
              { g: "tuber", m: "tuber", p: [0.22, 0.05, 0.1] },
              { g: "tuber", m: "tuber", p: [-0.2, 0.05, -0.08] },
            ] as Part[])
          : []),
      ];
    case "cebolla": {
      const m = late ? leaf(look, "leafYellow") : leaf(look, "onionLeaf");
      const bulb: GeoKey = stage === "grow" ? "bulb" : "bulbBig";
      const lean = late ? 0.9 : 0.25; // en cosecha las hojas se acuestan
      return [
        { g: bulb, m: "onionBulb", p: [0, 0.1, 0] },
        { g: "blade", m, p: [0, late ? 0.25 : 0.42, 0], r: [late ? 0.6 : 0, 0, 0] },
        { g: "blade", m, p: [0.07, 0.36, 0], r: [0, 0, -lean] },
        { g: "blade", m, p: [-0.07, 0.36, 0], r: [0, 0, lean] },
      ];
    }
    case "maiz_chala": {
      const tall = stage === "grow" ? 0.7 : 1;
      const m = late ? leaf(look, "leafYellow") : leaf(look);
      return [
        { g: "stalk", m: late ? "leafYellow" : look === "ok" ? "cornStalk" : leaf(look), p: [0, 0.7 * tall, 0], s: [1, tall, 1] },
        { g: "cornLeaf", m, p: [0.18, 0.55 * tall, 0], r: [0, 0, -1] },
        { g: "cornLeaf", m, p: [-0.18, 0.85 * tall, 0], r: [0, 0, 1] },
        ...(stage !== "grow" ? ([{ g: "tassel", m: "tassel", p: [0, 1.5, 0] }] as Part[]) : []),
        ...(stage !== "grow" ? ([{ g: "cob", m: "cob", p: [0.09, 0.95, 0], r: [0, 0, -0.4] }] as Part[]) : []),
      ];
    }
    case "haba":
      return [
        { g: "bushSmall", m: leaf(look, "habaLeaf"), p: [0, 0.22, 0], s: [0.9, 1.4, 0.9] },
        { g: "bushSmall", m: leaf(look, "habaLeaf"), p: [0.05, 0.45, 0.03], s: [0.75, 1.1, 0.75] },
        ...(stage === "flower" && look === "ok" ? ([{ g: "flower", m: "whiteFlower", p: [-0.1, 0.5, 0.06] }] as Part[]) : []),
        ...(stage !== "grow"
          ? ([
              { g: "pod", m: late ? "podDark" : "pod", p: [-0.14, 0.3, 0.05], r: [0, 0, 0.6] },
              { g: "pod", m: late ? "podDark" : "pod", p: [0.13, 0.36, -0.05], r: [0, 0, -0.6] },
            ] as Part[])
          : []),
      ];
    case "quinua": {
      const tall = stage === "grow" ? 0.6 : 0.85;
      const head: MatKey = late ? "grainGold" : "quinoaHead";
      return [
        { g: "stalk", m: leaf(look, late ? "leafYellow" : "leaf"), p: [0, 0.6 * tall, 0], s: [0.8, tall, 0.8] },
        { g: "bushSmall", m: leaf(look, late ? "leafYellow" : "leaf"), p: [0, 0.45 * tall, 0], s: [1.1, 0.9, 1.1] },
        ...(stage !== "grow" ? ([{ g: "panicle", m: look === "ok" ? head : leaf(look), p: [0, 1.25 * tall + 0.1, 0] }] as Part[]) : []),
      ];
    }
    case "trigo":
    case "cebada":
    case "avena": {
      const forage = cropId === "avena";
      const m = late && !forage ? leaf(look, "grainGold") : leaf(look, forage ? "oatGreen" : "leafLight");
      const heads = stage !== "grow";
      return [
        { g: "blade", m, p: [0, 0.3, 0], s: [0.7, 1, 0.7] },
        { g: "blade", m, p: [0.09, 0.28, 0.04], r: [0, 0, -0.25], s: [0.7, 0.95, 0.7] },
        { g: "blade", m, p: [-0.09, 0.28, -0.04], r: [0, 0, 0.25], s: [0.7, 0.95, 0.7] },
        ...(heads
          ? ([
              { g: "grainHead", m: late && !forage ? "grainGold" : m, p: [0, 0.66, 0] },
              { g: "grainHead", m: late && !forage ? "grainGold" : m, p: [0.15, 0.6, 0.05], r: [0, 0, -0.25] },
              { g: "grainHead", m: late && !forage ? "grainGold" : m, p: [-0.15, 0.6, -0.05], r: [0, 0, 0.25] },
            ] as Part[])
          : []),
      ];
    }
    case "ajo": {
      const m = late ? leaf(look, "leafYellow") : leaf(look, "onionLeaf");
      return [
        { g: stage === "grow" ? "bulb" : "bulbBig", m: "garlicBulb", p: [0, 0.08, 0], s: [0.85, 0.75, 0.85] },
        { g: "blade", m, p: [0, 0.38, 0], s: [0.7, 0.9, 0.7] },
        { g: "blade", m, p: [0.06, 0.34, 0], r: [0, 0, late ? -0.8 : -0.18], s: [0.7, 0.85, 0.7] },
        { g: "blade", m, p: [-0.06, 0.34, 0], r: [0, 0, late ? 0.8 : 0.18], s: [0.7, 0.85, 0.7] },
      ];
    }
    case "zanahoria": {
      const m = leaf(look, "leafLight");
      return [
        { g: "sproutLeaf", m, p: [0, 0.22, 0], s: [1.3, 1.6, 1.3] },
        { g: "sproutLeaf", m, p: [0.08, 0.2, 0.03], r: [0, 0, -0.5], s: [1.2, 1.5, 1.2] },
        { g: "sproutLeaf", m, p: [-0.08, 0.2, -0.03], r: [0, 0, 0.5], s: [1.2, 1.5, 1.2] },
        ...(stage !== "grow" ? ([{ g: "root", m: "carrotRoot", p: [0, 0.04, 0], r: [Math.PI, 0, 0] }] as Part[]) : []),
      ];
    }
    case "arveja":
      return [
        { g: "bushSmall", m: late ? leaf(look, "leafYellow") : leaf(look, "leafLight"), p: [0, 0.22, 0], s: [0.85, 1.2, 0.85] },
        { g: "bushSmall", m: leaf(look, "leaf"), p: [-0.06, 0.4, 0.03], s: [0.7, 0.9, 0.7] },
        ...(stage === "flower" && look === "ok" ? ([{ g: "flower", m: "whiteFlower", p: [0.1, 0.45, 0.05] }, { g: "flower", m: "flowerPurple", p: [-0.12, 0.36, -0.05] }] as Part[]) : []),
        ...(stage !== "grow" ? ([{ g: "pod", m: late ? "podDark" : "pod", p: [0.14, 0.28, 0.05], r: [0, 0, -0.6] }] as Part[]) : []),
      ];
    case "zapallo":
      return [
        { g: "bush", m: late ? leaf(look, "leafYellow") : leaf(look, "leafDark"), p: [0, 0.1, 0], s: [1.6, 0.42, 1.6] },
        { g: "bushSmall", m: leaf(look, "leaf"), p: [0.2, 0.16, -0.12], s: [1.2, 0.5, 1.2] },
        ...(stage === "flower" && look === "ok" ? ([{ g: "flower", m: "yellowFlower", p: [-0.12, 0.24, 0.1] }] as Part[]) : []),
        ...(stage !== "grow" ? ([{ g: "squash", m: "squash", p: [0.16, 0.13, 0.18], s: late ? [1.1, 0.8, 1.1] : [0.7, 0.55, 0.7] }] as Part[]) : []),
      ];
    case "tomate":
    case "paprika": {
      const fruitM: MatKey = cropId === "tomate" ? "tomatoRed" : "paprikaRed";
      const ripe = late ? fruitM : "pod";
      return [
        { g: "bush", m: leaf(look, "leafDark"), p: [0, 0.3, 0], s: [0.95, 1.05, 0.95] },
        ...(stage === "flower" && look === "ok" ? ([{ g: "flower", m: "yellowFlower", p: [0.12, 0.5, 0.08] }] as Part[]) : []),
        ...(stage === "flower" || late
          ? cropId === "tomate"
            ? ([
                { g: "fruit", m: ripe, p: [0.22, 0.28, 0.08] },
                { g: "fruit", m: ripe, p: [-0.18, 0.22, -0.12] },
                { g: "fruit", m: ripe, p: [0.04, 0.2, 0.24] },
              ] as Part[])
            : ([
                { g: "pod", m: ripe, p: [0.2, 0.22, 0.08], r: [0, 0, 0.2] },
                { g: "pod", m: ripe, p: [-0.18, 0.2, -0.1], r: [0, 0, -0.2] },
              ] as Part[])
          : []),
      ];
    }
    case "alcachofa":
      return [
        { g: "bush", m: leaf(look, "habaLeaf"), p: [0, 0.2, 0], s: [1.4, 0.6, 1.4] },
        { g: "stalk", m: leaf(look), p: [0, 0.35, 0], s: [0.65, 0.45, 0.65] },
        { g: "bulbBig", m: look === "ok" ? "artichoke" : leaf(look), p: [0, 0.67, 0], s: late ? [1.2, 1.4, 1.2] : [0.8, 1, 0.8] },
      ];
    case "palta":
    case "mandarina":
    case "granada": {
      const fruitM: MatKey = cropId === "palta" ? "avocado" : cropId === "mandarina" ? "mandarin" : "pomegranate";
      return [
        { g: "trunk", m: "trunk", p: [0, 0.4, 0], s: [0.55, 1, 0.55] },
        { g: "crownRound", m: leaf(look, "leafDark"), p: [0, 1, 0], s: [0.65, 0.7, 0.65] },
        ...(stage === "flower" ? [{ g: "flower", m: "whiteFlower", p: [0.2, 1.15, 0.3] } as Part] : []),
        ...(late ? [
          { g: "fruit", m: fruitM, p: [0.28, 0.85, 0.3], s: [1.3, cropId === "palta" ? 1.8 : 1.3, 1.3] },
          { g: "fruit", m: fruitM, p: [-0.3, 1.1, 0.16], s: [1.2, 1.4, 1.2] },
          { g: "fruit", m: fruitM, p: [0.1, 1.3, -0.28] },
        ] as Part[] : []),
      ];
    }
    case "uva":
      return [
        { g: "trunk", m: "trunk", p: [0, 0.4, 0], s: [0.4, 1, 0.4] },
        { g: "bush", m: leaf(look, "leafLight"), p: [0, 0.85, 0], s: [1.6, 0.55, 1.2] },
        ...(stage === "flower" ? [{ g: "flower", m: "whiteFlower", p: [0.2, 0.8, 0.15] } as Part] : []),
        ...(late ? [
          { g: "panicle", m: "grape", p: [0.23, 0.57, 0.14], r: [Math.PI, 0, 0] },
          { g: "panicle", m: "grape", p: [-0.18, 0.6, -0.15], r: [Math.PI, 0, 0] },
        ] as Part[] : []),
      ];
    default: // frijol
      return [
        { g: "bushSmall", m: late ? leaf(look, "leafYellow") : leaf(look), p: [0, 0.2, 0] },
        { g: "bushSmall", m: leaf(look, "leafDark"), p: [0.08, 0.34, 0.04], s: [0.8, 0.8, 0.8] },
        ...(stage === "flower" && look === "ok" ? ([{ g: "flower", m: "redFlower", p: [-0.08, 0.42, 0.04] }] as Part[]) : []),
        ...(stage !== "grow" ? ([{ g: "pod", m: "pod", p: [-0.14, 0.24, 0.05], r: [0, 0, 0.6] }] as Part[]) : []),
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
      // solo se ven secas si el reservorio se vació; la alta demanda mensual es normal en Majes
      const look: Look = t.status === "dry" ? "dry" : t.status === "climate_risk" ? "frost" : "ok";
      // asociación: los cultivos se alternan en damero dentro de la casilla
      const kinds = [parts(t.cropId, look, t.stage ?? "grow"), ...(t.mix ?? []).map((x) => parts(x.cropId, look, x.stage))];
      const [cx, cz] = tileCenter(i);
      for (let a = 0; a < perSide; a++)
        for (let b = 0; b < perSide; b++) {
          const s = i * 31 + a * 7 + b;
          const x = cx - tileSize / 2 + cell * (a + 0.5) + (rand(s) - 0.5) * 0.25;
          const z = cz - tileSize / 2 + cell * (b + 0.5) + (rand(s + 3) - 0.5) * 0.25;
          const plant = new THREE.Matrix4().compose(tmpV.set(x, soilTop, z), tmpQ.setFromEuler(tmpE.set(0, rand(s + 9) * Math.PI * 2, 0)), tmpS.set(1, 1, 1));
          for (const p of kinds[(a + b) % kinds.length]) {
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
  const targets = tiles.map((t) => (t.cropId ? isOrchard(t.cropId) ? 1 : 0.25 + 0.75 * Math.min(1, t.growth * 1.4) : 0));
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
