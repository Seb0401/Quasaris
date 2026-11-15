import majes from "@/data/rotations_majes.json";
import palette from "@/data/rotations_palette.json";
import type { Locale, Rotation } from "@/lib/contract";
import { CROPS, cropName, cropSegments } from "@/lib/crop-calendar";

export const MAX_ROTATIONS = 5;
export const MAX_CROPS = 4;

export function newRotationId() {
  return `custom-${Date.now().toString(36)}`;
}

/** Nombres con que vienen las rotaciones de ejemplo (en español, en los JSON de datos). */
const DEFAULT_NAMES = new Map<string, string>([...majes.rotations, ...palette.rotations].map((r) => [r.id, r.name]));

function autoName(r: Rotation, locale: Locale) {
  if (r.id === "actual" && r.crops.length === 1 && r.crops[0].cropId === "alfalfa") return locale === "es" ? "Alfalfa permanente" : "Permanent alfalfa";
  if (r.crops.length === 0) return locale === "es" ? "Descanso" : "Fallow";
  return r.crops.map((c) => cropName(c.cropId, locale)).join(r.mode === "association" ? " + " : " · ");
}

/** Las rotaciones de ejemplo se muestran en el idioma de la página; las que el agricultor renombró, tal cual. */
export function rotationLabel(r: Rotation, locale: Locale): string {
  const original = DEFAULT_NAMES.get(r.id);
  if (original === undefined) return r.name;
  const untouched = r.name === original || r.name === autoName(r, "es") || r.name === autoName(r, "en");
  return untouched ? autoName(r, locale) : r.name;
}

export function localizeRotations(rotations: Rotation[], locale: Locale): Rotation[] {
  return rotations.map((r) => {
    const name = rotationLabel(r, locale);
    return name === r.name ? r : { ...r, name };
  });
}


/** Días del año en que dos o más cultivos de la rotación se traslapan. */
export function overlapDays(r: Rotation): number {
  const count = new Uint8Array(365);
  for (const rc of r.crops) {
    if (!CROPS[rc.cropId]) continue;
    for (const seg of cropSegments(rc)) for (let d = seg.start; d < seg.end; d++) count[d]++;
  }
  return count.reduce((a, c) => a + (c > 1 ? 1 : 0), 0);
}

/** Meses (0..11) sin ningún cultivo: suelo desnudo. */
export function bareMonths(r: Rotation): number[] {
  const cover = new Uint8Array(365);
  for (const rc of r.crops) {
    if (!CROPS[rc.cropId]) continue;
    for (const seg of cropSegments(rc)) for (let d = seg.start; d < seg.end; d++) cover[d] = 1;
  }
  const starts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  const out: number[] = [];
  for (let m = 0; m < 12; m++) {
    let covered = 0;
    for (let d = starts[m]; d < starts[m + 1]; d++) covered += cover[d];
    if (covered / (starts[m + 1] - starts[m]) < 0.5) out.push(m);
  }
  return out;
}
