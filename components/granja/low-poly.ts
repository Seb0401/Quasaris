import * as THREE from "three";

/** Geometrías y materiales low poly compartidos (se crean una sola vez para todas las plantas). */
const flat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra });

export const MAT = {
  leaf: flat("#5fa84a"),
  leafDark: flat("#3f7d35"),
  leafDry: flat("#b9a14e"),
  leafFrost: flat("#9fc3c9"),
  flowerPurple: flat("#8e6ac8"),
  onionBulb: flat("#c9627a"),
  cornStalk: flat("#88b04b"),
  cob: flat("#f1c232"),
  pod: flat("#4e8f3a"),
  potatoFlower: flat("#f4f1e8"),
  trunk: flat("#7a5236"),
  roof: flat("#b5523b"),
  wall: flat("#efe6d2"),
  rock: flat("#a59a86"),
  ground: flat("#d9c49b"),
  groundDark: flat("#c7ae80"),
  water: new THREE.MeshStandardMaterial({ color: "#3d8fd6", roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85, flatShading: true }),
  tank: flat("#8c8f94"),
  coin: flat("#f2c037", { metalness: 0.4, roughness: 0.4, emissive: "#6b4e00", emissiveIntensity: 0.3 }),
  snow: new THREE.PointsMaterial({ color: "#ffffff", size: 0.12, transparent: true, opacity: 0.9 }),
  dust: new THREE.PointsMaterial({ color: "#e0b770", size: 0.1, transparent: true, opacity: 0.6 }),
};

export const SOIL: Record<string, THREE.MeshStandardMaterial> = {
  ok: flat("#6e4a2f"),
  water_stress: flat("#7d5638"),
  climate_risk: flat("#6f7f93"),
  dry: flat("#cdb487"),
  bare: flat("#8d6a48"),
};

export const GEO = {
  bush: new THREE.IcosahedronGeometry(0.28, 0),
  bushSmall: new THREE.IcosahedronGeometry(0.18, 0),
  blade: new THREE.ConeGeometry(0.05, 0.6, 4),
  bulb: new THREE.IcosahedronGeometry(0.12, 0),
  stalk: new THREE.CylinderGeometry(0.04, 0.06, 1.4, 5),
  cornLeaf: new THREE.ConeGeometry(0.08, 0.7, 3),
  cob: new THREE.CylinderGeometry(0.07, 0.05, 0.3, 6),
  flower: new THREE.TetrahedronGeometry(0.07, 0),
  pod: new THREE.CapsuleGeometry(0.04, 0.16, 2, 4),
  soil: new THREE.BoxGeometry(1, 1, 1),
  trunk: new THREE.CylinderGeometry(0.12, 0.18, 0.8, 5),
  crown: new THREE.ConeGeometry(0.7, 1.6, 6),
  crownRound: new THREE.IcosahedronGeometry(0.7, 0),
  rock: new THREE.DodecahedronGeometry(0.4, 0),
  roof: new THREE.ConeGeometry(1.6, 1, 4),
  coin: new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10),
};

/** Pseudoaleatorio determinista (misma granja = mismas posiciones). */
export function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
