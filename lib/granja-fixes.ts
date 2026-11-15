/**
 * Qué cambiar ante cada alerta del modo granja, con un cambio concreto que se puede aplicar de un toque:
 * repintar ciertos lotes con otra rotación de la paleta o pasar a riego por goteo.
 * Las alternativas se eligen con los mismos datos del motor (21 años de NASA POWER + FAO-56).
 */
import type { Irrigation, Rotation, SimulateResponse } from "@/lib/contract";
import { CROPS, isOrchard } from "@/lib/crop-calendar";
import { isOn } from "@/lib/farm-shape";
import { hazardDamage, type FarmAlert, type HazardKind } from "@/lib/granja-events";
import { cropAt } from "@/lib/granja-sim";

export type Fix = {
  /** clave de texto en granja.fix.* */
  key: "swap" | "cover" | "mix" | "drip" | "saveWater" | "peak" | "none";
  from?: string; // id de rotación actual
  to?: string; // id de rotación propuesta
  tiles: number[]; // lotes que cambian
  /** el cambio a aplicar (null = solo consejo) */
  apply: { tiles?: string[]; irrigation?: Irrigation } | null;
};

type Ctx = {
  data: SimulateResponse;
  tiles: string[];
  palette: Rotation[];
  year: number;
  irrigation: Irrigation;
  waterAvailableM3ha: number;
};

const SKIP = new Set(["descanso"]);

function candidates(ctx: Ctx) {
  const ids = new Set(ctx.data.rotations.map((r) => r.id));
  return ctx.palette.filter((r) => r.crops.length > 0 && !r.crops.some((c) => isOrchard(c.cropId)) && !SKIP.has(r.id) && ids.has(r.id));
}

const result = (ctx: Ctx, id: string) => ctx.data.rotations.find((r) => r.id === id);

/** Fracción de los 21 años en que la rotación tiene helada o calor en ese mes. */
function climateRisk(ctx: Ctx, id: string, month: number) {
  const r = result(ctx, id);
  if (!r?.byYear.length) return 1;
  return r.byYear.filter((y) => y.months[month] === "climate_risk").length / r.byYear.length;
}

/** Rotación más repetida entre unos lotes. */
function dominant(tiles: string[], idx: number[]) {
  const count = new Map<string, number>();
  idx.forEach((i) => isOn(tiles[i]) && count.set(tiles[i], (count.get(tiles[i]) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function paint(ctx: Ctx, idx: number[], to: string) {
  const next = [...ctx.tiles];
  idx.forEach((i) => isOn(next[i]) && (next[i] = to));
  return next;
}

function income(ctx: Ctx, id: string) {
  return result(ctx, id)?.income.median ?? 0;
}

/** Cambio de rotación para lotes con riesgo en un mes: la alternativa con menos riesgo y más ingreso. */
function swapFor(ctx: Ctx, idx: number[], month: number, risky: (rotationId: string) => number): Fix | null {
  const from = dominant(ctx.tiles, idx);
  if (!from) return null;
  const lots = idx.filter((i) => ctx.tiles[i] === from);
  const now = risky(from);
  const best = candidates(ctx)
    .filter((r) => r.id !== from)
    .map((r) => ({ id: r.id, risk: risky(r.id), income: income(ctx, r.id) }))
    .sort((a, b) => a.risk - b.risk || b.income - a.income)[0];
  if (!best || best.risk >= now) return null;
  return { key: "swap", from, to: best.id, tiles: lots, apply: { tiles: paint(ctx, lots, best.id) } };
}

/** El riesgo de un fenómeno activado (helada, calor, lluvia) para el cultivo que la rotación tiene en ese mes. */
function hazardRisk(ctx: Ctx, kind: HazardKind, month: number) {
  return (id: string) => {
    const r = ctx.palette.find((p) => p.id === id);
    const crops = r ? [cropAt(r, month).cropId, ...(cropAt(r, month).mix?.map((m) => m.cropId) ?? [])] : [];
    return crops.some((c) => hazardDamage(kind, c) !== null) ? 1 : 0;
  };
}

/** Lotes que pasan a una rotación de menor consumo hasta que el agua alcance todo el año. */
function saveWater(ctx: Ctx): Fix | null {
  const water = (id: string) => result(ctx, id)?.byYear.find((y) => y.year === ctx.year)?.waterM3ha ?? result(ctx, id)?.water.median ?? 0;
  const thrifty = candidates(ctx).sort((a, b) => water(a.id) - water(b.id))[0];
  if (!thrifty) return null;
  const orchardIds = new Set(ctx.palette.filter((r) => r.crops.some((c) => isOrchard(c.cropId))).map((r) => r.id));
  const on = ctx.tiles.flatMap((id, i) => (isOn(id) && !orchardIds.has(id) ? [i] : []));
  const cap = ctx.waterAvailableM3ha * on.length;
  let need = on.reduce((a, i) => a + water(ctx.tiles[i]), 0);
  const order = [...on].filter((i) => ctx.tiles[i] !== thrifty.id).sort((a, b) => water(ctx.tiles[b]) - water(ctx.tiles[a]));
  const change: number[] = [];
  for (const i of order) {
    if (need <= cap) break;
    need -= water(ctx.tiles[i]) - water(thrifty.id);
    change.push(i);
  }
  if (!change.length) return null;
  return { key: "saveWater", from: dominant(ctx.tiles, change) ?? undefined, to: thrifty.id, tiles: change, apply: { tiles: paint(ctx, change, thrifty.id) } };
}

export function fixFor(alert: FarmAlert, ctx: Ctx): Fix {
  // A one-tap annual crop change must not imply removing a producing orchard.
  const orchardTiles = new Set(ctx.palette.filter((r) => r.crops.some((c) => isOrchard(c.cropId))).map((r) => r.id));
  if (alert.tiles.some((i) => orchardTiles.has(ctx.tiles[i]))) return { key: "none", tiles: alert.tiles, apply: null };
  const none: Fix = { key: "none", tiles: alert.tiles, apply: null };
  const m = Math.max(0, alert.month);
  switch (alert.kind) {
    case "climate":
      return swapFor(ctx, alert.tiles, m, (id) => climateRisk(ctx, id, m)) ?? none;
    case "frost":
    case "heat":
    case "heavyRain":
      return swapFor(ctx, alert.tiles, m, hazardRisk(ctx, alert.kind, m)) ?? none;
    case "dry":
    case "drought":
      if (ctx.irrigation !== "goteo") return { key: "drip", tiles: [], apply: { irrigation: "goteo" } };
      return saveWater(ctx) ?? none;
    case "erosion": {
      // lotes sin cultivo ese mes: una rotación que tenga algo sembrado y cuide el suelo
      const best = candidates(ctx)
        .filter((r) => cropAt(r, m).cropId)
        .sort((a, b) => (result(ctx, b.id)?.soil ?? 0) - (result(ctx, a.id)?.soil ?? 0))[0];
      return best ? { key: "cover", from: dominant(ctx.tiles, alert.tiles) ?? undefined, to: best.id, tiles: alert.tiles, apply: { tiles: paint(ctx, alert.tiles, best.id) } } : none;
    }
    case "pests":
    case "monoculture": {
      // mezclar familias: la mitad de los lotes (alternados) pasa a una rotación de otra familia
      const from = dominant(ctx.tiles, alert.tiles);
      const fam = (id: string) => new Set(ctx.palette.find((p) => p.id === id)?.crops.map((c) => CROPS[c.cropId]?.family));
      const mine = from ? fam(from) : new Set<string>();
      const best = candidates(ctx)
        .filter((r) => r.id !== from && ![...fam(r.id)].some((f) => mine.has(f)))
        .sort((a, b) => (result(ctx, b.id)?.soil ?? 0) - (result(ctx, a.id)?.soil ?? 0) || income(ctx, b.id) - income(ctx, a.id))[0];
      const lots = alert.tiles.filter((i) => ctx.tiles[i] === from).filter((_, k) => k % 2 === 1);
      return best && lots.length ? { key: "mix", from: from ?? undefined, to: best.id, tiles: lots, apply: { tiles: paint(ctx, lots, best.id) } } : none;
    }
    case "waterPeak":
      return { key: "peak", tiles: alert.tiles, apply: null };
    default:
      return none;
  }
}
