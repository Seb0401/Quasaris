/** Plan de la chacra: agrupa lotes por rotación y resume agua, ingresos y calendario. */
import type { Rotation, RotationResult, SimulateResponse } from "@/lib/contract";
import { CROPS, MONTH_START, cycleDays, sowDay } from "@/lib/crop-calendar";

export type PlanGroup = {
  rotation: Rotation;
  result: RotationResult | null;
  tiles: number[]; // índices de lote (0-based)
  ha: number;
  waterM3: number; // mediana anual del grupo
  incomePEN: number; // mediana anual del grupo
  monthlyM3: number[]; // mediana por mes del grupo
};

export type Plan = {
  groups: PlanGroup[];
  totalHa: number;
  waterM3: number;
  capacityM3: number;
  incomePEN: number;
  soil: number;
  monthlyM3: number[];
  monthlyQuotaM3: number;
  checks: string[];
  missing: string[];
};

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function buildPlan(data: SimulateResponse, palette: Rotation[], tiles: string[], haPerTile: number, waterAvailableM3ha: number): Plan {
  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const groups = new Map<string, PlanGroup>();
  tiles.forEach((id, i) => {
    const rotation = palette.find((p) => p.id === id);
    if (!rotation) return;
    if (!groups.has(id)) groups.set(id, { rotation, result: byId.get(id) ?? null, tiles: [], ha: 0, waterM3: 0, incomePEN: 0, monthlyM3: Array(12).fill(0) });
    const g = groups.get(id)!;
    g.tiles.push(i);
    g.ha += haPerTile;
  });

  for (const g of groups.values()) {
    const r = g.result;
    if (!r) continue;
    g.waterM3 = r.water.median * g.ha;
    g.incomePEN = r.income.median * g.ha;
    g.monthlyM3 = Array.from({ length: 12 }, (_, m) => median(r.byYear.map((y) => y.monthlyWaterM3ha?.[m] ?? y.waterM3ha / 12)) * g.ha);
  }

  const list = [...groups.values()].sort((a, b) => b.ha - a.ha);
  const totalHa = tiles.length * haPerTile;
  const monthlyM3 = Array.from({ length: 12 }, (_, m) => list.reduce((a, g) => a + g.monthlyM3[m], 0));
  const checks = Array.from(new Set(list.flatMap((g) => g.result?.explain.reviewWithExpert ?? [])));
  const missing = Array.from(new Set(list.flatMap((g) => g.result?.explain.missing ?? [])));
  return {
    groups: list,
    totalHa,
    waterM3: list.reduce((a, g) => a + g.waterM3, 0),
    capacityM3: waterAvailableM3ha * totalHa,
    incomePEN: list.reduce((a, g) => a + g.incomePEN, 0),
    soil: list.reduce((a, g) => a + (g.result?.soil ?? 0) * g.ha, 0) / Math.max(totalHa, 1e-9),
    monthlyM3,
    monthlyQuotaM3: (waterAvailableM3ha * totalHa) / 12,
    checks,
    missing,
  };
}

/** Mes (0..11) de cosecha de un cultivo, o null si es perenne. */
export function harvestMonth(cropId: string, sowMonth: number): number | null {
  if (!CROPS[cropId] || CROPS[cropId].perennial) return null;
  const end = (sowDay({ cropId, sowMonth }) + cycleDays(cropId) - 1) % 365;
  return MONTH_START.findLastIndex((s) => s <= end);
}

/** "Lotes 1–4, 7" a partir de índices 0-based. */
export function lotRanges(idx: number[]): string {
  const s = [...idx].sort((a, b) => a - b).map((i) => i + 1);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return out.join(", ");
}
