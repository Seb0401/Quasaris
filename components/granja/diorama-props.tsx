"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GEO, MAT, rand } from "./low-poly";

/** Piezas decorativas del diorama (todas low poly, hechas en código, sin archivos externos). */

const m = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

export const DM = {
  grass: m("#a6d17f"),
  grassDark: m("#8cc06a"),
  dirt1: m("#c99e6e"),
  dirt2: m("#a97c55"),
  rock: m("#8e8578"),
  rockDark: m("#6f675d"),
  snow: m("#f7f9fb"),
  volcano: m("#9b8a7a"),
  wood: m("#9c6b43"),
  woodDark: m("#7a5236"),
  wall: m("#fbf1dc"),
  roof: m("#e06a4f"),
  window: m("#5b7fa8"),
  white: m("#ffffff"),
  black: m("#2b2b2b"),
  pink: m("#f2a7a0"),
  shirt: m("#4f8fd8"),
  pants: m("#3d4a63"),
  skin: m("#d9a37a"),
  hat: m("#e8c766"),
  cloud: m("#ffffff", { roughness: 1, transparent: true, opacity: 0.95 }),
  stone: m("#b9b1a3"),
  blade: m("#f3eadb"),
  treeLight: m("#7fbf5f"),
};

const BOX = GEO.soil; // caja unitaria

export function Island({ w, d }: { w: number; d: number }) {
  return (
    <group>
      {/* césped superior */}
      <mesh position={[0, -0.15, 0]} scale={[w, 0.3, d]} geometry={BOX} material={DM.grass} receiveShadow />
      {/* capas de tierra */}
      <mesh position={[0, -0.75, 0]} scale={[w - 0.2, 0.9, d - 0.2]} geometry={BOX} material={DM.dirt1} />
      <mesh position={[0, -1.6, 0]} scale={[w - 0.8, 0.8, d - 0.8]} geometry={BOX} material={DM.dirt2} />
      {/* roca colgante */}
      <mesh position={[0, -3.1, 0]} rotation={[Math.PI, Math.PI / 4, 0]} scale={[w * 0.55, 2.6, d * 0.55]} material={DM.rock}>
        <coneGeometry args={[1, 1, 4]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh
          key={k}
          position={[(rand(k + 1) - 0.5) * w * 0.7, -2.2 - rand(k + 2) * 1.2, (rand(k + 3) - 0.5) * d * 0.7]}
          geometry={GEO.rock}
          material={k % 2 ? DM.rock : DM.rockDark}
          scale={0.8 + rand(k) * 0.9}
        />
      ))}
    </group>
  );
}

export function Fence({ w, d }: { w: number; d: number }) {
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    const step = 1.1;
    for (let x = -w / 2; x <= w / 2 + 0.01; x += step) {
      out.push([x, -d / 2], [x, d / 2]);
    }
    for (let z = -d / 2 + step; z < d / 2; z += step) {
      out.push([-w / 2, z], [w / 2, z]);
    }
    return out;
  }, [w, d]);
  return (
    <group>
      <instancedMesh
        ref={(mesh) => {
          if (!mesh) return;
          const mat = new THREE.Matrix4();
          posts.forEach(([x, z], i) => mesh.setMatrixAt(i, mat.compose(new THREE.Vector3(x, 0.3, z), new THREE.Quaternion(), new THREE.Vector3(0.12, 0.6, 0.12))));
          mesh.instanceMatrix.needsUpdate = true;
        }}
        args={[BOX, DM.wood, posts.length]}
        castShadow
      />
      {/* travesaños */}
      {[
        [0, -d / 2, w, 0],
        [0, d / 2, w, 0],
        [-w / 2, 0, d, Math.PI / 2],
        [w / 2, 0, d, Math.PI / 2],
      ].map(([x, z, len, rot], k) => (
        <mesh key={k} position={[x, 0.42, z]} rotation={[0, rot, 0]} scale={[len, 0.07, 0.07]} geometry={BOX} material={DM.wood} />
      ))}
    </group>
  );
}

export function House({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.75, 0]} scale={[2.2, 1.5, 1.7]} geometry={BOX} material={DM.wall} castShadow receiveShadow />
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.75, 0.95, 1.75]} geometry={GEO.roof} material={DM.roof} castShadow />
      <mesh position={[0.6, 2.15, -0.3]} scale={[0.3, 0.7, 0.3]} geometry={BOX} material={DM.stone} castShadow />
      <mesh position={[0, 0.45, 0.86]} scale={[0.5, 0.9, 0.05]} geometry={BOX} material={DM.woodDark} />
      <mesh position={[-0.7, 0.95, 0.86]} scale={[0.45, 0.4, 0.05]} geometry={BOX} material={DM.window} />
      <mesh position={[0.7, 0.95, 0.86]} scale={[0.45, 0.4, 0.05]} geometry={BOX} material={DM.window} />
    </group>
  );
}

export function Windmill({ x, z }: { x: number; z: number }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 1.2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.55, 2.8, 6]} />
        <meshStandardMaterial color="#f3eadb" flatShading />
      </mesh>
      <mesh position={[0, 3, 0]} castShadow>
        <coneGeometry args={[0.45, 0.6, 6]} />
        <meshStandardMaterial color="#e06a4f" flatShading />
      </mesh>
      <group ref={blades} position={[0, 2.6, 0.5]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.18, 1.7, 0.04]} />
            <meshStandardMaterial color="#f3eadb" flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Pond({ x, z, level }: { x: number; z: number; level: number }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const w = water.current;
    if (!w) return;
    const target = 0.04 + Math.max(0.02, level) * 0.3; // reservorio elevado: el nivel se ve
    w.position.y += (target - w.position.y) * Math.min(1, dt * 3);
    w.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
  });
  const stones = useMemo(() => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2), []);
  return (
    <group position={[x, 0, z]}>
      {/* fondo y muro del reservorio */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.04, 14]} />
        <meshStandardMaterial color="#7a6a55" flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.5, 1.55, 0.4, 14, 1, true]} />
        <meshStandardMaterial color="#b9b1a3" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={water} position={[0, 0.3, 0]} material={MAT.water}>
        <cylinderGeometry args={[1.44, 1.44, 0.06, 14]} />
      </mesh>
      {stones.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 1.62, 0.38, Math.sin(a) * 1.62]} geometry={GEO.rock} material={DM.stone} scale={0.28 + rand(i) * 0.12} castShadow />
      ))}
    </group>
  );
}

export function Tree({ x, z, s = 1, variant = 0 }: { x: number; z: number; s?: number; variant?: number }) {
  const crown = variant % 2 ? DM.grassDark : DM.treeLight;
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.45, 0]} geometry={GEO.trunk} material={DM.wood} castShadow />
      <mesh position={[0, 1.35, 0]} geometry={GEO.crownRound} material={crown} castShadow />
      <mesh position={[0.3, 1.0, 0.2]} geometry={GEO.bushSmall} material={crown} scale={1.6} castShadow />
    </group>
  );
}

export function Volcano({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.4, 0]} material={DM.volcano} castShadow>
        <coneGeometry args={[2.2, 2.8, 7]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} material={DM.snow}>
        <coneGeometry args={[0.98, 0.95, 7]} />
      </mesh>
    </group>
  );
}

export function Cow({ x, z, rot = 0, seed = 0 }: { x: number; z: number; rot?: number; seed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.children[1].rotation.x = Math.sin(clock.elapsedTime * 1.5 + seed) * 0.25 + 0.2; // pasta
  });
  return (
    <group ref={ref} position={[x, 0.3, z]} rotation={[0, rot, 0]} scale={0.55}>
      <group>
        <mesh position={[0, 0.75, 0]} scale={[1.3, 0.75, 0.75]} geometry={BOX} material={DM.white} castShadow />
        <mesh position={[0.2, 0.95, 0.38]} scale={[0.4, 0.35, 0.02]} geometry={BOX} material={DM.black} />
        <mesh position={[-0.35, 0.8, -0.38]} scale={[0.35, 0.3, 0.02]} geometry={BOX} material={DM.black} />
        {[
          [0.45, 0.25],
          [-0.45, 0.25],
          [0.45, -0.25],
          [-0.45, -0.25],
        ].map(([lx, lz], k) => (
          <mesh key={k} position={[lx, 0.2, lz]} scale={[0.16, 0.45, 0.16]} geometry={BOX} material={DM.white} />
        ))}
      </group>
      <group position={[0.75, 0.9, 0]}>
        <mesh position={[0.2, 0, 0]} scale={[0.45, 0.42, 0.45]} geometry={BOX} material={DM.white} castShadow />
        <mesh position={[0.45, -0.08, 0]} scale={[0.1, 0.22, 0.32]} geometry={BOX} material={DM.pink} />
        <mesh position={[0.15, 0.25, 0.22]} scale={[0.08, 0.15, 0.08]} geometry={BOX} material={DM.black} />
        <mesh position={[0.15, 0.25, -0.22]} scale={[0.08, 0.15, 0.08]} geometry={BOX} material={DM.black} />
      </group>
    </group>
  );
}

export function Farmer({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2)) * 0.06;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group ref={ref} scale={0.6}>
        <mesh position={[0.12, 0.35, 0]} scale={[0.18, 0.7, 0.2]} geometry={BOX} material={DM.pants} />
        <mesh position={[-0.12, 0.35, 0]} scale={[0.18, 0.7, 0.2]} geometry={BOX} material={DM.pants} />
        <mesh position={[0, 0.98, 0]} scale={[0.55, 0.6, 0.32]} geometry={BOX} material={DM.shirt} castShadow />
        <mesh position={[0, 1.45, 0]} scale={[0.36, 0.36, 0.36]} geometry={BOX} material={DM.skin} castShadow />
        <mesh position={[0, 1.7, 0]} material={DM.hat}>
          <cylinderGeometry args={[0.42, 0.42, 0.06, 8]} />
        </mesh>
        <mesh position={[0, 1.8, 0]} material={DM.hat}>
          <cylinderGeometry args={[0.2, 0.22, 0.2, 8]} />
        </mesh>
      </group>
    </group>
  );
}

export function Clouds({ radius }: { radius: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03;
  });
  const clouds = useMemo(
    () =>
      [0, 1, 2, 3].map((i) => ({
        a: (i / 4) * Math.PI * 2 + rand(i) * 0.6,
        y: 5 + rand(i + 4) * 2.5,
        s: 0.8 + rand(i + 8) * 0.6,
      })),
    [],
  );
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[Math.cos(c.a) * radius, c.y, Math.sin(c.a) * radius]} scale={c.s}>
          <mesh geometry={GEO.crownRound} material={DM.cloud} scale={[1.4, 0.8, 1]} />
          <mesh position={[0.9, -0.1, 0.1]} geometry={GEO.crownRound} material={DM.cloud} scale={[1, 0.65, 0.9]} />
          <mesh position={[-0.9, -0.15, -0.1]} geometry={GEO.crownRound} material={DM.cloud} scale={[0.9, 0.6, 0.8]} />
        </group>
      ))}
    </group>
  );
}
