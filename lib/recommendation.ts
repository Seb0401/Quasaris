/**
 * Recomendación clara a partir de la simulación: qué rotación conviene, cuánto cambia frente a la actual
 * y por qué. No agrega ciencia nueva: ordena lo que ya calculó el motor (NASA POWER + FAO-56).
 */
import type { Irrigation, Rotation, RotationResult, SimulateResponse, SoilTexture } from "@/lib/contract";
import { efficiency } from "@/lib/crop-calendar";

export type Reason = { kind: "water" | "income" | "soil" | "risk"; value: number };

export type Recommendation = {
  verdict: "switch" | "keep" | "noneViable";
  best: RotationResult;
  bestRotation: Rotation;
  current: RotationResult | null;
  currentRotation: Rotation | null;
  waterSavingM3ha: number; // positivo = ahorra
  waterSavingPct: number;
  incomeDeltaPEN: number; // por ha
  soilDelta: number; // puntos 0..1
  riskDelta: number; // positivo = menos riesgo
  reasons: Reason[];
  checks: string[]; // claves i18n de "qué revisar"
  // si ninguna alcanza: cuánto necesitaría con goteo y qué fracción de la chacra se puede sembrar
  dripWaterM3ha: number | null;
  plantableShare: number | null;
};

export function recommend(
  data: SimulateResponse,
  rotations: Rotation[],
  opts: { waterAvailableM3ha: number; irrigation: Irrigation; soilTexture: SoilTexture },
): Recommendation | null {
  const results = rotations.map((r) => ({ rot: r, res: data.rotations.find((x) => x.id === r.id) })).filter((x): x is { rot: Rotation; res: RotationResult } => Boolean(x.res));
  if (!results.length) return null;

  const viable = results.filter((x) => x.res.viable);
  const pool = viable.length ? viable : results;
  const top = [...pool].sort((a, b) => b.res.score - a.res.score)[0];
  const cur = results.find((x) => x.rot.isCurrent) ?? null;

  const verdict: Recommendation["verdict"] = !viable.length ? "noneViable" : cur && top.rot.id === cur.rot.id ? "keep" : "switch";
  const base = cur?.res ?? null;
  const waterSavingM3ha = base ? base.water.median - top.res.water.median : 0;
  const incomeDeltaPEN = base ? top.res.income.median - base.income.median : 0;
  const soilDelta = base ? top.res.soil - base.soil : 0;
  const riskDelta = base ? base.risk.median - top.res.risk.median : 0;

  const reasons: Reason[] = [];
  if (waterSavingM3ha > 0 && base && waterSavingM3ha / base.water.median > 0.03) reasons.push({ kind: "water", value: waterSavingM3ha });
  if (incomeDeltaPEN > 0) reasons.push({ kind: "income", value: incomeDeltaPEN });
  if (soilDelta > 0.02) reasons.push({ kind: "soil", value: soilDelta });
  if (riskDelta > 0.02) reasons.push({ kind: "risk", value: riskDelta });

  let dripWaterM3ha: number | null = null;
  let plantableShare: number | null = null;
  if (verdict === "noneViable") {
    if (opts.irrigation !== "goteo") {
      dripWaterM3ha = (top.res.water.median * efficiency(opts.irrigation, opts.soilTexture)) / efficiency("goteo", opts.soilTexture);
    }
    plantableShare = Math.max(0, Math.min(1, opts.waterAvailableM3ha / top.res.water.median));
  }

  return {
    verdict,
    best: top.res,
    bestRotation: top.rot,
    current: base,
    currentRotation: cur?.rot ?? null,
    waterSavingM3ha,
    waterSavingPct: base && base.water.median > 0 ? waterSavingM3ha / base.water.median : 0,
    incomeDeltaPEN,
    soilDelta,
    riskDelta,
    reasons: reasons.slice(0, 3),
    checks: top.res.explain.reviewWithExpert.slice(0, 2),
    dripWaterM3ha,
    plantableShare,
  };
}
