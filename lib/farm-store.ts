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
