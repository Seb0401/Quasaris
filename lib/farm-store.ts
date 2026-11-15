"use client";

import { useSyncExternalStore } from "react";
import type { Irrigation, Priorities, Rotation, SoilTexture } from "@/lib/contract";
import rotationsMajes from "@/data/rotations_majes.json";

/** Estado del agricultor, persistido en localStorage (funciona offline). */
export type FarmState = {
  lat: number;
  lon: number;
  soilTexture: SoilTexture;
  irrigation: Irrigation;
  waterAvailableM3ha: number;
  priorities: Priorities;
  rotations: Rotation[];
  /** contorno dibujado en el mapa [lat, lon][] y su área en hectáreas (opcional) */
  boundary?: [number, number][];
  areaHa?: number;
};

const KEY = "farmtwin.state.v2";

export const MAJES = { lat: -16.36, lon: -72.19 };

const DEFAULT: FarmState = {
  ...MAJES,
  soilTexture: "arenoso",
  irrigation: "aspersion",
  waterAvailableM3ha: 15000, // estimado para Majes, a validar con AUTODEMA
  priorities: { water: 0.5, income: 0.5, soil: 0.5, risk: 0.5 },
  rotations: rotationsMajes.rotations as Rotation[],
};

let state: FarmState = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: se usa el estado por defecto */
  }
}

export function setFarm(patch: Partial<FarmState>) {
  load();
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignorar */
  }
  listeners.forEach((l) => l());
}

/** Distancia aproximada en km (suficiente para decidir si el contorno sigue siendo de esta parcela). */
function km(a: [number, number], b: [number, number]) {
  const dLat = (a[0] - b[0]) * 111.32;
  const dLon = (a[1] - b[1]) * 111.32 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Mueve la parcela. Si se aleja más de 1 km del contorno dibujado, ese contorno deja de valer y se borra. */
export function moveFarm(lat: number, lon: number) {
  load();
  const b = state.boundary;
  if (b?.length) {
    const c: [number, number] = [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length];
    if (km(c, [lat, lon]) > 1) return setFarm({ lat, lon, boundary: undefined, areaHa: undefined });
  }
  setFarm({ lat, lon });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useFarm(): FarmState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => DEFAULT,
  );
}
