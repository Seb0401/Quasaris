import type { Irrigation, SoilTexture } from "@/lib/contract";

/** Un color por rotación, el mismo en todas las pantallas (la actual siempre va primero). */
export const ROTATION_COLORS = ["#5cc8f5", "#b9ff63", "#f6b94c", "#b69cff", "#ff8a7a"] as const;

export function rotationColor(index: number) {
  return ROTATION_COLORS[index % ROTATION_COLORS.length];
}

/** Eficiencia de aplicación del riego (igual que engine/rotation.py). */
export const IRRIGATION_EFFICIENCY: Record<Irrigation, number> = { gravedad: 0.45, aspersion: 0.75, goteo: 0.9 };

/** Ajuste por textura de suelo (igual que engine/rotation.py): >1 aprovecha mejor, <1 pierde por percolación. */
export const SOIL_FACTOR: Record<SoilTexture, Record<Irrigation, number>> = {
  arenoso: { gravedad: 0.85, aspersion: 0.95, goteo: 1.0 },
  franco: { gravedad: 1.0, aspersion: 1.0, goteo: 1.0 },
  arcilloso: { gravedad: 1.05, aspersion: 1.0, goteo: 1.0 },
};

export function effectiveEfficiency(irrigation: Irrigation, soil: SoilTexture) {
  return Math.min(1, IRRIGATION_EFFICIENCY[irrigation] * SOIL_FACTOR[soil][irrigation]);
}
