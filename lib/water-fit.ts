import type { RotationResult } from "@/lib/contract";

export type WaterFit = {
  /** m³/ha que faltan para cubrir la mediana de la rotación (0 si alcanza). */
  shortfallM3ha: number;
  /** Años de la simulación en que el agua disponible cubrió toda la rotación. */
  yearsFit: number;
  /** Años simulados. */
  years: number;
};

/** Cuánta agua falta y en cuántos años reales alcanzó, a partir del resultado del motor. */
export function waterFit(result: RotationResult, waterAvailableM3ha: number): WaterFit {
  return {
    shortfallM3ha: Math.max(0, Math.round(result.water.median - waterAvailableM3ha)),
    yearsFit: result.byYear.filter((y) => y.waterM3ha <= waterAvailableM3ha).length,
    years: result.byYear.length,
  };
}
