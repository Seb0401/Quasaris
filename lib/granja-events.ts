/**
 * Fenómenos meteorológicos y peligros para el gemelo digital de la granja.
 * Los eventos que el agricultor activa se aplican encima del año real de NASA POWER;
 * las alertas también salen solas de los datos (heladas o calor reales, reservorio vacío, monocultivo).
 */
import { CROPS } from "@/lib/crop-calendar";
import { agronomy } from "@/lib/grouping";

export type HazardKind = "frost" | "heat" | "drought" | "heavyRain" | "pests";

export type FarmEvent = {
  id: string;
  kind: HazardKind;
  month: number; // 0..11
  /** sequía: fracción de agua recortada (0.1..0.6) */
  intensity?: number;
};

export type AlertKind = HazardKind | "dry" | "climate" | "waterPeak" | "monoculture" | "erosion";

export type FarmAlert = {
  month: number;
  kind: AlertKind;
  severity: "low" | "med" | "high";
  tiles: number[];
  crops: string[];
  fromEvent: boolean; // true si lo activó el agricultor
};

export const EVENT_FROST_C = -3;
export const EVENT_HEAT_C = 34;
export const HEAT_WATER_FACTOR = 1.15;
export const RAIN_DAMAGE = 0.75;
export const FROST_DAMAGE = 0.55;
export const HEAT_DAMAGE = 0.75;

/** Años con El Niño y La Niña relevantes para el sur del Perú (verano austral), según NOAA ONI y ENFEN. */
export const ENSO_YEARS: Record<number, "nino" | "nina"> = {
  2010: "nino",
  2016: "nino",
  2017: "nino", // El Niño costero
  2023: "nino",
  2008: "nina",
  2011: "nina",
  2021: "nina",
  2022: "nina",
};

/** Daño (factor de rendimiento, 1 = sin daño) de un evento sobre un cultivo; null si no lo afecta. */
export function hazardDamage(kind: HazardKind, cropId: string | null, familyShare = 0): number | null {
  if (!cropId || !CROPS[cropId]) return null;
  const c = CROPS[cropId];
  const ag = agronomy(cropId);
  switch (kind) {
    case "frost":
      return c.tFrostC >= EVENT_FROST_C ? FROST_DAMAGE : null;
    case "heat":
      return c.tHeatC <= EVENT_HEAT_C ? HEAT_DAMAGE : null;
    case "heavyRain":
      return ag?.humiditySensitive ? RAIN_DAMAGE : null;
    case "pests":
      // el daño crece con el monocultivo: muchas casillas de la misma familia
      return familyShare >= 0.3 ? Math.max(0.5, 1 - 0.5 * familyShare) : null;
    default:
      return null;
  }
}

export function newEventId() {
  return `ev-${Math.random().toString(36).slice(2, 8)}`;
}
