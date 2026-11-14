"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { GEO, MAT } from "./low-poly";

type Look = "ok" | "dry" | "frost";

function leafMat(look: Look) {
  return look === "dry" ? MAT.leafDry : look === "frost" ? MAT.leafFrost : MAT.leaf;
}

function Alfalfa({ look, growth }: { look: Look; growth: number }) {
  return (
    <group>
      <mesh geometry={GEO.bush} material={leafMat(look)} position={[0, 0.15, 0]} scale={[1.1, 0.6, 1.1]} />
      <mesh geometry={GEO.bushSmall} material={look === "ok" ? MAT.leafDark : leafMat(look)} position={[0.15, 0.22, 0.1]} />
      {growth > 0.6 && look === "ok" && <mesh geometry={GEO.flower} material={MAT.flowerPurple} position={[-0.05, 0.38, 0]} />}
    </group>
  );
}

function Potato({ look, growth }: { look: Look; growth: number }) {
  return (
    <group>
      <mesh geometry={GEO.bush} material={look === "ok" ? MAT.leafDark : leafMat(look)} position={[0, 0.25, 0]} scale={[1, 0.9, 1]} />
      {growth > 0.45 && growth < 0.8 && look === "ok" && <mesh geometry={GEO.flower} material={MAT.potatoFlower} position={[0.05, 0.52, 0.05]} />}
    </group>
  );
}

function Onion({ look }: { look: Look; growth?: number }) {
  const m = leafMat(look);
  return (
    <group>
      <mesh geometry={GEO.bulb} material={MAT.onionBulb} position={[0, 0.08, 0]} />
      <mesh geometry={GEO.blade} material={m} position={[0, 0.4, 0]} />
      <mesh geometry={GEO.blade} material={m} position={[0.06, 0.36, 0]} rotation={[0, 0, -0.25]} />
      <mesh geometry={GEO.blade} material={m} position={[-0.06, 0.36, 0]} rotation={[0, 0, 0.25]} />
    </group>
  );
}

function Corn({ look, growth }: { look: Look; growth: number }) {
  const m = leafMat(look);
  return (
    <group>
      <mesh geometry={GEO.stalk} material={look === "ok" ? MAT.cornStalk : m} position={[0, 0.7, 0]} />
      <mesh geometry={GEO.cornLeaf} material={m} position={[0.18, 0.6, 0]} rotation={[0, 0, -1]} />
      <mesh geometry={GEO.cornLeaf} material={m} position={[-0.18, 0.9, 0]} rotation={[0, 0, 1]} />
      {growth > 0.55 && <mesh geometry={GEO.cob} material={MAT.cob} position={[0.09, 0.95, 0]} rotation={[0, 0, -0.4]} />}
    </group>
  );
}

function Bean({ look, growth }: { look: Look; growth: number }) {
  return (
    <group>
      <mesh geometry={GEO.bushSmall} material={leafMat(look)} position={[0, 0.2, 0]} />
      <mesh geometry={GEO.bushSmall} material={look === "ok" ? MAT.leafDark : leafMat(look)} position={[0.08, 0.36, 0.04]} scale={0.8} />
      {growth > 0.5 && <mesh geometry={GEO.pod} material={MAT.pod} position={[-0.14, 0.24, 0.05]} rotation={[0, 0, 0.6]} />}
    </group>
  );
}

/** Una planta que crece suavemente hacia su tamaño objetivo. */
export function Plant({ cropId, growth, look, position, rotationY }: { cropId: string; growth: number; look: Look; position: [number, number, number]; rotationY: number }) {
  const ref = useRef<THREE.Group>(null);
  const target = 0.25 + 0.75 * Math.min(1, growth * 1.4);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 4);
    g.scale.setScalar(s);
  });
  const Comp = { alfalfa: Alfalfa, papa: Potato, cebolla: Onion, maiz_chala: Corn, haba: Bean, frijol: Bean }[cropId] ?? Bean;
  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]} scale={0.25}>
      <Comp look={look} growth={growth} />
    </group>
  );
}
