import type { Rotation } from "@/lib/contract";
import { CROPS, cropSegments } from "@/lib/crop-calendar";

export const MAX_ROTATIONS = 5;
export const MAX_CROPS = 4;

export function newRotationId() {
  return `custom-${Date.now().toString(36)}`;
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
