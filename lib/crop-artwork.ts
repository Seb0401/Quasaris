/** Generated botanical artwork, shared by crop selectors and farm summaries. */
export const CROP_ARTWORK_IDS = [
  "alfalfa", "papa", "cebolla", "maiz_chala", "haba", "frijol", "quinua", "ajo",
  "zanahoria", "arveja", "trigo", "cebada", "avena", "zapallo", "tomate", "paprika",
  "alcachofa", "palta", "uva", "mandarina", "granada",
] as const;

export function cropArtworkPath(cropId: string) {
  return CROP_ARTWORK_IDS.some((id) => id === cropId) ? `/images/crops/${cropId}.webp` : null;
}
