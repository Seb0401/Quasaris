/**
 * Simulación del modo granja: combina los resultados del motor (por hectárea, por año y por mes)
 * con el reparto de rotaciones en las casillas de la chacra. Todo es aritmética sobre datos reales;
 * el motor ya hizo la ciencia (NASA POWER + FAO-56).
 */
import paletteJson from "@/data/rotations_palette.json";
import type { MonthStatus, Rotation, SimulateResponse } from "@/lib/contract";
import { CROPS, MONTH_START, cropOnDay, cycleDays, sowDay } from "@/lib/crop-calendar";

export const PALETTE = paletteJson.rotations as Rotation[];
export const BASELINE_ID = "actual";

export const ROTATION_COLOR: Record<string, string> = {
  actual: "#6dbb7a",
  ingreso: "#d4a017",
  suelo_agua: "#4f9fd8",
  papa_haba: "#a87348",
  cebolla_frijol: "#b07cc6",
  maiz_haba: "#e07b39",
  descanso: "#9b8f7a",
};

export const CROP_EMOJI: Record<string, string> = {
  alfalfa: "🌿",
  papa: "🥔",
  cebolla: "🧅",
  maiz_chala: "🌽",
  haba: "🫘",
  frijol: "🫘",
};

const CUSTOM_COLORS = ["#e0607e", "#3fb6a8", "#c9a227", "#7a6ad8", "#d77a3a"];

/** Color de una rotación (las propias reciben un color estable según su id). */
export function rotationColor(id: string): string {
  if (ROTATION_COLOR[id]) return ROTATION_COLOR[id];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CUSTOM_COLORS[h % CUSTOM_COLORS.length];
}

/** Paleta del modo granja: las 7 de base más las rotaciones propias del agricultor. */
export function buildPalette(farmRotations: Rotation[]): Rotation[] {
  const ids = new Set(PALETTE.map((r) => r.id));
  return [...PALETTE, ...farmRotations.filter((r) => !ids.has(r.id) && r.crops.length > 0)];
}

export function rotationEmoji(id: string, palette: Rotation[] = PALETTE) {
  const r = palette.find((p) => p.id === id);
  if (!r || r.crops.length === 0) return "⬜";
  return r.crops.map((c) => CROP_EMOJI[c.cropId] ?? "🌱").join("");
}

export type Stage = "sprout" | "grow" | "flower" | "harvest";

export type TileState = {
  rotationId: string;
  cropId: string | null;
  growth: number; // 0..1 dentro del ciclo
  stage: Stage | null;
  status: MonthStatus | "dry"; // dry = el reservorio se vació
};

export function stageOf(growth: number): Stage {
  return growth < 0.18 ? "sprout" : growth < 0.55 ? "grow" : growth < 0.85 ? "flower" : "harvest";
}

export type MonthSnapshot = {
  month: number; // 0..11
  tiles: TileState[];
  waterUsedM3: number; // acumulado hasta este mes (incluido)
  waterCapacityM3: number;
  incomePEN: number; // acumulado
  harvests: { tile: number; cropId: string }[]; // cosechas de este mes
  events: { kind: "water_stress" | "climate_risk" | "dry"; tiles: number }[];
};

export type YearSummary = {
  waterM3: number;
  capacityM3: number;
  incomePEN: number;
  soil: number; // promedio ponderado 0..1
  bareTileMonths: number;
  baseline: { waterM3: number; incomePEN: number };
  distinctRotations: number;
};

function harvestMonths(r: Rotation): number[] {
  return r.crops.map((rc) => {
    if (CROPS[rc.cropId]?.perennial) return -1; // perenne: cortes todo el año
    const end = (sowDay(rc) + cycleDays(rc.cropId) - 1) % 365;
    return MONTH_START.findLastIndex((s) => s <= end);
  });
}

/** Fracción del ingreso anual de una rotación que entra en cada mes. */
function incomeShare(r: Rotation): number[] {
  const share = Array(12).fill(0);
  if (r.crops.length === 0) return share;
  const months = harvestMonths(r);
  const per = 1 / r.crops.length;
  months.forEach((m) => {
    if (m === -1) for (let i = 0; i < 12; i++) share[i] += per / 12;
    else share[m] += per;
  });
  return share;
}

function cropAt(r: Rotation, month: number): { cropId: string | null; growth: number } {
  const doy = MONTH_START[month] + 14;
  let best: { cropId: string | null; growth: number; kc: number } = { cropId: null, growth: 0, kc: 0 };
  for (const rc of r.crops) {
    const d = cropOnDay(rc, doy);
    // alfalfa (perenne): se corta cada ~2 meses, así que alterna rebrote y floración
    if (d && d.kc > best.kc) best = { cropId: rc.cropId, growth: CROPS[rc.cropId].perennial ? (month % 2 === 0 ? 0.4 : 0.75) : d.dayInCycle / cycleDays(rc.cropId), kc: d.kc };
  }
  return best;
}

export function simulateYear(
  data: SimulateResponse,
  tiles: string[],
  haPerTile: number,
  year: number,
  waterAvailableM3ha: number,
  palette: Rotation[] = PALETTE,
): { months: MonthSnapshot[]; summary: YearSummary } {
  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const rot = new Map(palette.map((r) => [r.id, r]));
  const yearOf = (id: string) => byId.get(id)?.byYear.find((y) => y.year === year);
  const totalHa = tiles.length * haPerTile;
  const capacity = waterAvailableM3ha * totalHa;

  const months: MonthSnapshot[] = [];
  let used = 0;
  let income = 0;
  let dryFrom = 12;
  let bare = 0;

  for (let m = 0; m < 12; m++) {
    const harvests: MonthSnapshot["harvests"] = [];
    let monthWater = 0;
    tiles.forEach((id) => {
      const y = yearOf(id);
      monthWater += (y?.monthlyWaterM3ha?.[m] ?? (y ? y.waterM3ha / 12 : 0)) * haPerTile;
    });
    used += monthWater;
    if (used > capacity && dryFrom === 12) dryFrom = m;

    const tileStates: TileState[] = tiles.map((id, i) => {
      const r = rot.get(id);
      const y = yearOf(id);
      const { cropId, growth } = r ? cropAt(r, m) : { cropId: null, growth: 0 };
      let status: TileState["status"] = y?.months[m] ?? "bare";
      if (!cropId) status = "bare";
      else if (m >= dryFrom) status = "dry";
      if (status === "bare") bare++;
      if (r) {
        const share = incomeShare(r)[m];
        if (share > 0 && y) {
          // si el reservorio se vació, la cosecha rinde menos (proporcional al agua que faltó)
          const waterFactor = m >= dryFrom ? Math.max(0.3, capacity / used) : 1;
          income += y.incomePEN * haPerTile * share * waterFactor;
          harvestMonths(r).forEach((hm, k) => hm === m && harvests.push({ tile: i, cropId: r.crops[k].cropId }));
        }
      }
      return { rotationId: id, cropId, growth, stage: cropId ? stageOf(growth) : null, status };
    });

    const count = (k: TileState["status"]) => tileStates.filter((t) => t.status === k).length;
    const events: MonthSnapshot["events"] = [];
    if (count("dry")) events.push({ kind: "dry", tiles: count("dry") });
    if (count("climate_risk")) events.push({ kind: "climate_risk", tiles: count("climate_risk") });
    if (count("water_stress")) events.push({ kind: "water_stress", tiles: count("water_stress") });

    months.push({ month: m, tiles: tileStates, waterUsedM3: used, waterCapacityM3: capacity, incomePEN: income, harvests, events });
  }

  const base = yearOf(BASELINE_ID);
  const soil = tiles.reduce((a, id) => a + (byId.get(id)?.soil ?? 0), 0) / Math.max(tiles.length, 1);
  return {
    months,
    summary: {
      waterM3: used,
      capacityM3: capacity,
      incomePEN: income,
      soil,
      bareTileMonths: bare,
      baseline: { waterM3: (base?.waterM3ha ?? 0) * totalHa, incomePEN: (base?.incomePEN ?? 0) * totalHa },
      distinctRotations: new Set(tiles.filter((t) => t !== "descanso")).size,
    },
  };
}

// ---------- metas y medallas ----------

export type Goal = { id: string; icon: string; done: boolean; progress: number };

export function evaluateGoals(s: YearSummary, tilesCount: number): Goal[] {
  const saving = s.baseline.waterM3 > 0 ? 1 - s.waterM3 / s.baseline.waterM3 : 0;
  const bareShare = s.bareTileMonths / Math.max(tilesCount * 12, 1);
  return [
    { id: "waterFits", icon: "💧", done: s.waterM3 <= s.capacityM3, progress: Math.min(1, s.capacityM3 / Math.max(s.waterM3, 1)) },
    { id: "save20", icon: "🏅", done: saving >= 0.2, progress: Math.max(0, Math.min(1, saving / 0.2)) },
    { id: "healthySoil", icon: "🌱", done: s.soil >= 0.7, progress: Math.min(1, s.soil / 0.7) },
    { id: "coveredSoil", icon: "🛡️", done: bareShare <= 0.1, progress: Math.max(0, Math.min(1, 1 - (bareShare - 0.1) / 0.4)) },
    { id: "beatIncome", icon: "💰", done: s.incomePEN >= s.baseline.incomePEN && s.baseline.incomePEN > 0, progress: s.baseline.incomePEN > 0 ? Math.max(0, Math.min(1, s.incomePEN / s.baseline.incomePEN)) : 0 },
    { id: "diversity", icon: "🔄", done: s.distinctRotations >= 3, progress: Math.min(1, s.distinctRotations / 3) },
  ];
}

/** Años con eventos notables para el selector (a partir de la rotación de referencia). */
export function notableYears(data: SimulateResponse): { year: number; tag: "driest" | "frost" | "heat" | "wettest" | null }[] {
  const base = data.rotations.find((r) => r.id === BASELINE_ID) ?? data.rotations[0];
  if (!base) return [];
  const driest = [...base.byYear].sort((a, b) => b.waterM3ha - a.waterM3ha)[0]?.year;
  const wettest = [...base.byYear].sort((a, b) => a.waterM3ha - b.waterM3ha)[0]?.year;
  const allFrost = data.rotations.flatMap((r) => r.byYear);
  return base.byYear.map((y) => {
    const frost = allFrost.some((b) => b.year === y.year && b.frostDays > 0);
    const heat = allFrost.some((b) => b.year === y.year && b.heatDays > 0);
    const tag = y.year === driest ? "driest" : frost ? "frost" : heat ? "heat" : y.year === wettest ? "wettest" : null;
    return { year: y.year, tag };
  });
}


// ---------- gemelo digital: factores por casilla ----------

export type Lens = "crop" | "water" | "temp" | "soil" | "income";

export type TileFactors = {
  waterM3: number; // riego bruto de la casilla en el mes
  waterM3ha: number; // por hectárea
  tempStress: number; // 0 (lejos de los límites del cultivo) .. 1 (en o más allá del límite)
  tminAbs: number | null;
  tmaxAbs: number | null;
  frostLimit: number | null;
  heatLimit: number | null;
  soilHealth: number; // 0..1 (rotación)
  incomeYear: number; // S/ de la casilla en el año
  kc: number | null;
};

/** Factores de una casilla en un mes: lo que usan las capas y la ficha. */
export function tileFactors(data: SimulateResponse, tile: TileState, year: number, month: number, haPerTile: number, palette: Rotation[] = PALETTE): TileFactors {
  const res = data.rotations.find((r) => r.id === tile.rotationId);
  const y = res?.byYear.find((b) => b.year === year);
  const clim = data.source.climateByYear?.find((c) => c.year === year)?.months[month];
  const crop = tile.cropId ? CROPS[tile.cropId] : null;
  const waterM3ha = y?.monthlyWaterM3ha?.[month] ?? 0;
  let tempStress = 0;
  if (crop && clim) {
    const margin = Math.min(clim.tminAbs - crop.tFrostC, crop.tHeatC - clim.tmaxAbs);
    tempStress = Math.max(0, Math.min(1, 1 - margin / 8));
  }
  const rot = palette.find((r) => r.id === tile.rotationId);
  const rc = rot?.crops.find((c) => c.cropId === tile.cropId);
  const day = rc ? cropOnDay(rc, MONTH_START[month] + 14) : null;
  return {
    waterM3: waterM3ha * haPerTile,
    waterM3ha,
    tempStress,
    tminAbs: clim?.tminAbs ?? null,
    tmaxAbs: clim?.tmaxAbs ?? null,
    frostLimit: crop?.tFrostC ?? null,
    heatLimit: crop?.tHeatC ?? null,
    soilHealth: res?.soil ?? 0,
    incomeYear: (y?.incomePEN ?? 0) * haPerTile,
    kc: day?.kc ?? null,
  };
}

/** Escala de color de cada capa: 0..1 → color (verde = bien, rojo = mal). */
const RAMP_GOOD_BAD = ["#3f9e5a", "#9cc65a", "#f0c94a", "#ec8a3c", "#d9473a"];
const RAMP_BLUE = ["#e8f3fb", "#9fd0ef", "#4fa3dc", "#2b6cb0", "#1b3f7a"];

function ramp(colors: string[], v: number) {
  const x = Math.max(0, Math.min(0.999, v)) * (colors.length - 1);
  return colors[Math.floor(x + 0.5)];
}

/** Color de la casilla para una capa (null = color normal del suelo). */
export function lensColor(lens: Lens, f: TileFactors, maxWaterM3ha: number, maxIncome: number, minIncome: number): string | null {
  switch (lens) {
    case "water":
      return ramp(RAMP_BLUE, maxWaterM3ha > 0 ? f.waterM3ha / maxWaterM3ha : 0);
    case "temp":
      return ramp(RAMP_GOOD_BAD, f.tempStress);
    case "soil":
      return ramp(RAMP_GOOD_BAD, 1 - f.soilHealth);
    case "income":
      return ramp(RAMP_GOOD_BAD, maxIncome > minIncome ? 1 - (f.incomeYear - minIncome) / (maxIncome - minIncome) : 0);
    default:
      return null;
  }
}

export const LENS_RAMP: Record<Exclude<Lens, "crop">, string[]> = {
  water: RAMP_BLUE,
  temp: RAMP_GOOD_BAD,
  soil: [...RAMP_GOOD_BAD],
  income: [...RAMP_GOOD_BAD],
};
