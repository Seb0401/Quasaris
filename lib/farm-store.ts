"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useLocale } from "@/components/i18n-provider";
import type { Irrigation, Priorities, Rotation, SoilTexture } from "@/lib/contract";
import rotationsMajes from "@/data/rotations_majes.json";
import { localizeRotations } from "@/lib/rotation-utils";

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

/** Tope de agua por campaña (el mismo que acepta el asistente): más que eso es un error de tipeo. */
export const MAX_WATER_M3HA = 1_000_000;

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

/**
 * Deja el estado dentro de lo que el motor acepta, venga de un campo del formulario o de una versión
 * guardada antigua: agua entre 0 y el tope, prioridades entre 0 y 1, y ninguna rotación sin cultivos
 * (el motor la daría como "la que menos agua gasta" y la recomendaría).
 */
/** Versiones antiguas de las rotaciones de ejemplo, que no cabían en 365 días (cultivos cruzados). */
const LEGACY_EXAMPLES: Record<string, string> = {
  ingreso: "cebolla@3,papa@8,maiz_chala@12",
  suelo_agua: "cebolla@3,haba@8,maiz_chala@12",
};
const signature = (r: Rotation) => r.crops.map((c) => `${c.cropId}@${c.sowMonth}`).join(",");

function sanitize(s: FarmState): FarmState {
  const priorities = s.priorities ?? DEFAULT.priorities;
  let rotations = Array.isArray(s.rotations) ? s.rotations.filter((r) => Array.isArray(r?.crops) && r.crops.length > 0) : [];
  // si el agricultor no las tocó, las rotaciones de ejemplo antiguas pasan a la versión actual
  rotations = rotations.map((r) => {
    const current = DEFAULT.rotations.find((d) => d.id === r.id);
    return current && LEGACY_EXAMPLES[r.id] === signature(r) ? { ...current, isCurrent: r.isCurrent } : r;
  });
  if (rotations.length === 0) rotations = DEFAULT.rotations;
  if (!rotations.some((r) => r.isCurrent)) rotations = rotations.map((r, i) => (i === 0 ? { ...r, isCurrent: true } : r));
  return {
    ...s,
    lat: clamp(s.lat, -90, 90, DEFAULT.lat),
    lon: clamp(s.lon, -180, 180, DEFAULT.lon),
    waterAvailableM3ha: clamp(s.waterAvailableM3ha, 0, MAX_WATER_M3HA, DEFAULT.waterAvailableM3ha),
    priorities: {
      water: clamp(priorities.water, 0, 1, 0.5),
      income: clamp(priorities.income, 0, 1, 0.5),
      soil: clamp(priorities.soil, 0, 1, 0.5),
      risk: clamp(priorities.risk, 0, 1, 0.5),
    },
    rotations,
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = sanitize({ ...DEFAULT, ...JSON.parse(raw) });
  } catch {
    /* sin almacenamiento: se usa el estado por defecto */
  }
}

export function setFarm(patch: Partial<FarmState>) {
  load();
  state = sanitize({ ...state, ...patch });
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

/** Estado del agricultor; las rotaciones de ejemplo llegan con el nombre en el idioma de la página. */
export function useFarm(): FarmState {
  const locale = useLocale();
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => DEFAULT,
  );
  return useMemo(() => ({ ...raw, rotations: localizeRotations(raw.rotations, locale) }), [raw, locale]);
}
