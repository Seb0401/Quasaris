/**
 * Calendario de cultivo en TypeScript (cliente y servidor).
 * Replica la lógica de engine/crops.py y engine/rotation.py: si cambias una, cambia la otra.
 */
import cropsJson from "@/data/crops.json";
import type { ClimateWeek, Irrigation, Locale, RotationCrop, SoilTexture } from "@/lib/contract";

export type CropCategory = "vegetable" | "grain" | "legume" | "forage";
export const CATEGORIES: CropCategory[] = ["vegetable", "grain", "legume", "forage"];

type CropJson = {
  name: Record<Locale, string>;
  family: string;
  category: CropCategory;
  fixesNitrogen: boolean;
  perennial?: boolean;
  kc: { ini: number; mid: number; end: number };
  kcAvg?: number;
  stagesDays: number[];
  tFrostC: number;
  tHeatC: number;
};

export const CROPS = cropsJson.crops as unknown as Record<string, CropJson>;
export const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export type Stage = "ini" | "dev" | "mid" | "late";

const EFFICIENCY: Record<Irrigation, number> = { gravedad: 0.45, aspersion: 0.75, goteo: 0.9 };
const SOIL_FACTOR: Record<SoilTexture, Record<Irrigation, number>> = {
  arenoso: { gravedad: 0.85, aspersion: 0.95, goteo: 1 },
  franco: { gravedad: 1, aspersion: 1, goteo: 1 },
  arcilloso: { gravedad: 1.05, aspersion: 1, goteo: 1 },
};

export function efficiency(irrigation: Irrigation, soil: SoilTexture) {
  return Math.min(0.95, EFFICIENCY[irrigation] * SOIL_FACTOR[soil][irrigation]);
}

export function cropName(cropId: string, locale: Locale) {
  return CROPS[cropId]?.name[locale] ?? cropId;
}

/** Cultivos de una categoría, en el orden del catálogo. */
export function cropsIn(category: CropCategory | "all"): string[] {
  return Object.keys(CROPS).filter((id) => category === "all" || CROPS[id].category === category);
}

/** Color de cada familia botánica (líneas de tiempo de rotaciones y calendario). */
/** Variables CSS con respaldo: cada tema define su versión legible en app/globals.css. */
export const FAMILY_COLOR: Record<string, string> = {
  leguminosa: "var(--fam-leguminosa, #b9ff63)",
  solanacea: "var(--fam-solanacea, #e39a5d)",
  aliacea: "var(--fam-aliacea, #b69cff)",
  graminea: "var(--fam-graminea, #f6b94c)",
  amarantacea: "var(--fam-amarantacea, #e0607e)",
  apiacea: "var(--fam-apiacea, #ff9f43)",
  cucurbitacea: "var(--fam-cucurbitacea, #3fb6a8)",
};

export function cycleDays(cropId: string) {
  const c = CROPS[cropId];
  return c.perennial ? 365 : c.stagesDays.reduce((a, b) => a + b, 0);
}

export function sowDay(rc: RotationCrop) {
  return CROPS[rc.cropId].perennial ? 0 : MONTH_START[rc.sowMonth - 1];
}

/** Día del año 0..364 (sin 29/2) en la zona horaria dada. */
export function dayOfYear(date = new Date(), timeZone = "America/Lima") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return Math.min(364, MONTH_START[m - 1] + (m === 2 && d === 29 ? 27 : d - 1));
}

/** daysToHarvest es null en cultivos perennes (alfalfa: se corta varias veces al año). */
export type CropDay = { cropId: string; dayInCycle: number; stage: Stage; kc: number; daysToHarvest: number | null };

/** Estado del cultivo en un día del año, o null si no está sembrado. */
export function cropOnDay(rc: RotationCrop, doy: number): CropDay | null {
  const c = CROPS[rc.cropId];
  if (!c) return null;
  const total = cycleDays(rc.cropId);
  const k = (doy - sowDay(rc) + 365) % 365;
  if (k >= total) return null;
  if (c.perennial) return { cropId: rc.cropId, dayInCycle: k, stage: "mid", kc: c.kcAvg ?? c.kc.mid, daysToHarvest: null };
  const [ini, dev, mid, late] = c.stagesDays;
  let stage: Stage;
  let kc: number;
  if (k < ini) {
    stage = "ini";
    kc = c.kc.ini;
  } else if (k < ini + dev) {
    stage = "dev";
    kc = c.kc.ini + ((c.kc.mid - c.kc.ini) * (k - ini)) / dev;
  } else if (k < ini + dev + mid) {
    stage = "mid";
    kc = c.kc.mid;
  } else {
    stage = "late";
    kc = c.kc.mid + ((c.kc.end - c.kc.mid) * (k - ini - dev - mid)) / Math.max(late - 1, 1);
  }
  return { cropId: rc.cropId, dayInCycle: k, stage, kc, daysToHarvest: total - k };
}

/** Segmentos [inicio, fin) dentro del año 0..365 que ocupa un cultivo (se parte si cruza diciembre). */
export function cropSegments(rc: RotationCrop): { start: number; end: number; stageBreaks: number[] }[] {
  if (!CROPS[rc.cropId] || rc.sowMonth < 1 || rc.sowMonth > 12) return [];
  const start = sowDay(rc);
  const total = cycleDays(rc.cropId);
  const c = CROPS[rc.cropId];
  const breaks = c.perennial ? [] : c.stagesDays.slice(0, 3).reduce<number[]>((acc, d) => [...acc, (acc.at(-1) ?? 0) + d], []);
  const end = start + total;
  if (end <= 365) return [{ start, end, stageBreaks: breaks.map((b) => start + b) }];
  return [
    { start, end: 365, stageBreaks: breaks.map((b) => start + b).filter((b) => b < 365) },
    { start: 0, end: end - 365, stageBreaks: breaks.map((b) => start + b - 365).filter((b) => b > 0) },
  ];
}

export function weekOf(doy: number) {
  return Math.min(51, Math.floor(doy / 7)); // 0..51, igual que engine/simulate.py
}

export type WeekOutlook = {
  doy: number;
  active: (CropDay & { waterM3ha: number; pFrost: number; pHeat: number; frostSensitive: boolean; heatSensitive: boolean })[];
  waterM3ha: number;
  et0Mm: number;
};

/** Lo que viene en los próximos 7 días según la climatología NASA POWER de la parcela. */
export function weekOutlook(crops: RotationCrop[], weeks: ClimateWeek[], irrigation: Irrigation, soil: SoilTexture, doy = dayOfYear()): WeekOutlook {
  const eff = efficiency(irrigation, soil);
  const next = (d: number) => weeks[weekOf((doy + d) % 365)];
  const active = crops
    .map((rc) => ({ rc, cd: cropOnDay(rc, doy) }))
    .filter((item): item is { rc: RotationCrop; cd: CropDay } => item.cd !== null)
    .map(({ rc, cd }) => {
      let mm = 0;
      for (let d = 0; d < 7; d++) {
        const day = cropOnDay(rc, (doy + d) % 365);
        if (day) mm += day.kc * next(d).et0MeanMm;
      }
      const w0 = next(0);
      const w1 = next(7);
      const c = CROPS[cd.cropId];
      return {
        ...cd,
        waterM3ha: (mm / eff) * 10,
        pFrost: Math.max(w0.pFrost, w1.pFrost),
        pHeat: Math.max(w0.pHeat, w1.pHeat),
        frostSensitive: c.tFrostC >= 0,
        heatSensitive: c.tHeatC <= 32,
      };
    });
  // Total de la parcela: si dos cultivos se traslapan, manda el de mayor Kc (como el motor).
  let et0 = 0;
  let totalMm = 0;
  for (let d = 0; d < 7; d++) {
    const e = next(d).et0MeanMm;
    et0 += e;
    totalMm += Math.max(0, ...crops.map((rc) => cropOnDay(rc, (doy + d) % 365)?.kc ?? 0)) * e;
  }
  return { doy, active, waterM3ha: (totalMm / eff) * 10, et0Mm: et0 / 7 };
}
