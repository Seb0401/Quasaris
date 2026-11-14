"use client";

import { useSyncExternalStore } from "react";

/** Estado del modo granja (persistido en el celular). La zona, el agua y el riego viven en farm-store. */
export type GranjaState = {
  zoneSet: boolean;
  cols: number;
  rows: number;
  haPerTile: number;
  tiles: string[]; // id de rotación por casilla
  year: number;
  badges: string[]; // medallas ganadas (persisten entre partidas)
  lastWon: string[]; // medallas nuevas por celebrar
  tutorialDone: boolean;
  sound: boolean;
  tempDelta: number; // escenario: °C sumados a todas las temperaturas
  waterFactor: number; // escenario: fracción del agua disponible (1 = normal)
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
  badges: [],
  lastWon: [],
  tutorialDone: false,
  sound: true,
  tempDelta: 0,
  waterFactor: 1,
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
    tiles: Array.from({ length: n }, (_, i) => s.tiles[i] ?? "actual"),
  }));
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
