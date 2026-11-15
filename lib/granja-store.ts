"use client";

import { useSyncExternalStore } from "react";
import type { FarmEvent } from "@/lib/granja-events";
import { setFarm } from "@/lib/farm-store";
import { isOn, shapeFromBoundary, toggleCell } from "@/lib/farm-shape";
import type { LatLon } from "@/lib/geo";
import type { Irrigation } from "@/lib/contract";

/** Escenarios de la próxima campaña: cada uno se arma con un año real análogo de los 21 de NASA POWER. */
export type Scenario = "typical" | "dry" | "nino" | "warm";
export const SCENARIOS: Scenario[] = ["typical", "dry", "nino", "warm"];
/** Calentamiento del escenario "más calor" (°C sumados al año típico). */
export const WARM_DELTA = 1.5;

/** Distribución guardada para compararla en distintos años (pasados y venideros). */
export type SavedPlan = {
  id: string;
  name: string;
  cols: number;
  rows: number;
  tiles: string[];
  haPerTile: number;
  irrigation: Irrigation;
  savedAt: number;
};

/** Estado del modo granja (persistido en el celular). La zona, el agua y el riego viven en farm-store. */
export type GranjaState = {
  zoneSet: boolean;
  cols: number;
  rows: number;
  haPerTile: number;
  tiles: string[]; // id de rotación por casilla ("off" = fuera del terreno)
  /** "past" = un año real 2005-2025 (year); "future" = la próxima campaña con un escenario */
  mode: "past" | "future";
  year: number;
  scenario: Scenario;
  plans: SavedPlan[];
  badges: string[]; // medallas ganadas (persisten entre partidas)
  lastWon: string[]; // medallas nuevas por celebrar
  tutorialDone: boolean;
  sound: boolean;
  tempDelta: number; // escenario: °C sumados a todas las temperaturas
  waterFactor: number; // escenario: fracción del agua disponible (1 = normal)
  events: FarmEvent[]; // fenómenos activados sobre el año real
};

const KEY = "farmtwin.granja.v1";

export const FARM_SIZES = [
  { ha: 2, cols: 4, rows: 2 },
  { ha: 3, cols: 4, rows: 3 },
  { ha: 5, cols: 5, rows: 4 },
  { ha: 10, cols: 5, rows: 8 },
] as const;

const DEFAULT: GranjaState = {
  zoneSet: false,
  cols: 5,
  rows: 4,
  haPerTile: 0.25,
  tiles: Array(20).fill("actual"),
  year: 2016,
  scenario: "typical",
  mode: "future",
  plans: [],
  badges: [],
  lastWon: [],
  tutorialDone: false,
  sound: true,
  tempDelta: 0,
  waterFactor: 1,
  events: [],
};

let state: GranjaState = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
}

export function setGranja(patch: Partial<GranjaState> | ((s: GranjaState) => Partial<GranjaState>)) {
  load();
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export function resizeFarm(ha: number) {
  const size = FARM_SIZES.find((s) => s.ha === ha) ?? FARM_SIZES[2];
  const n = size.cols * size.rows;
  setGranja((s) => ({
    cols: size.cols,
    rows: size.rows,
    haPerTile: size.ha / n,
    tiles: Array.from({ length: n }, (_, i) => (s.tiles[i] && isOn(s.tiles[i]) ? s.tiles[i] : "actual")),
  }));
}

/** Arma la granja con la forma del terreno dibujado: casillas cuadradas dentro del contorno. */
export function shapeFarmFromBoundary(pts: LatLon[], areaHa: number) {
  if (pts.length < 3 || !(areaHa > 0)) return;
  setGranja((s) => {
    const sown = s.tiles.filter(isOn);
    const shape = shapeFromBoundary(pts, areaHa, (i) => sown[i % Math.max(sown.length, 1)] ?? "actual");
    return { cols: shape.cols, rows: shape.rows, tiles: shape.tiles, haPerTile: shape.haPerTile };
  });
}

/** Suma (vecina) o quita (del borde) una casilla desde la granja. r y c pueden quedar fuera de la rejilla actual. */
export function editShape(r: number, c: number, rotationId: string) {
  setGranja((s) => {
    const next = toggleCell({ cols: s.cols, rows: s.rows, tiles: s.tiles }, r, c, rotationId);
    return { cols: next.cols, rows: next.rows, tiles: next.tiles };
  });
}

/** Ajusta la granja al área real dibujada en el mapa: elige la cuadrícula más parecida y reparte el área exacta. */
export function resizeFarmToArea(areaHa: number) {
  if (!(areaHa > 0)) return;
  const size = [...FARM_SIZES].sort((x, y) => Math.abs(Math.log(x.ha / areaHa)) - Math.abs(Math.log(y.ha / areaHa)))[0];
  const n = size.cols * size.rows;
  setGranja((s) => ({
    cols: size.cols,
    rows: size.rows,
    haPerTile: areaHa / n,
    tiles: Array.from({ length: n }, (_, i) => (s.tiles[i] && isOn(s.tiles[i]) ? s.tiles[i] : "actual")),
  }));
}

/** Guarda el contorno dibujado y su área, y ajusta la granja a ese tamaño real. */
export function saveBoundary(pts: [number, number][] | undefined, areaHa: number | undefined) {
  setFarm({ boundary: pts, areaHa });
  if (pts && pts.length >= 3 && areaHa) shapeFarmFromBoundary(pts, areaHa);
  else if (areaHa) resizeFarmToArea(areaHa);
}

export function useGranja(): GranjaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => DEFAULT,
  );
}

export function newPlanId() {
  return `plan-${Date.now().toString(36)}`;
}
