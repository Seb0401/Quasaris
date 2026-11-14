/**
 * Evalúa una agrupación de cultivos, en rotación (uno después de otro) o en asociación (juntos),
 * con reglas agronómicas transparentes: nutrientes, fijación de nitrógeno, familias y plagas,
 * raíces, alturas, agua y cuidados. Cada regla deja un motivo "a favor" o "en contra" explicable.
 * Las reglas son orientativas y están pensadas para validarse con un agrónomo.
 */
import cropsJson from "@/data/crops.json";
import type { RotationCrop } from "@/lib/contract";
import { CROPS, cropSegments } from "@/lib/crop-calendar";
import { bareMonths, overlapDays } from "@/lib/rotation-utils";

export type GroupMode = "rotation" | "association";
type Level = "low" | "med" | "high";
type Agronomy = {
  nDemandKg: number;
  nFixKg: number;
  P: Level;
  K: Level;
  height: "low" | "mid" | "tall";
  labor: Level;
  cares: string[];
  pests: string[];
  diseases: string[];
  humiditySensitive: boolean;
  weedSensitive: boolean;
};
type Companion = { a: string; b: string; effect: number; reason: string };

const RAW = cropsJson as unknown as { crops: Record<string, { agronomy: Agronomy; family: string; rootDepthM: number; kc: { mid: number } }>; companions: Companion[] };
export const agronomy = (id: string): Agronomy | null => RAW.crops[id]?.agronomy ?? null;

export type Point = { key: string; params?: Record<string, string | number>; weight: number };

export type GroupEvaluation = {
  score: number; // 0..100
  verdict: "good" | "fair" | "poor";
  pros: Point[];
  cons: Point[];
  nitrogen: { demandKg: number; fixedKg: number; balanceKg: number };
  phosphorus: Level;
  potassium: Level;
  labor: Level;
  cares: { cropId: string; keys: string[] }[];
  sharedPests: string[];
};

const LEVEL_N: Record<Level, number> = { low: 1, med: 2, high: 3 };
const maxLevel = (ls: Level[]): Level => (ls.reduce((a, l) => Math.max(a, LEVEL_N[l]), 1) === 3 ? "high" : ls.some((l) => l === "med") ? "med" : "low");

function companion(a: string, b: string): Companion | null {
  return (
    RAW.companions.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)) ??
    RAW.companions.find((c) => c.b === "*" && (c.a === a || c.a === b)) ??
    null
  );
}

export function evaluateGroup(crops: RotationCrop[], mode: GroupMode, names: (id: string) => string): GroupEvaluation {
  const ids = crops.map((c) => c.cropId).filter((id) => agronomy(id));
  const ag = ids.map((id) => agronomy(id)!);
  const fam = ids.map((id) => CROPS[id].family);
  const pros: Point[] = [];
  const cons: Point[] = [];

  const demand = ag.reduce((a, x) => a + x.nDemandKg, 0);
  const fixed = ag.reduce((a, x) => a + x.nFixKg, 0);

  if (ids.length === 0) {
    return { score: 0, verdict: "poor", pros, cons: [{ key: "empty", weight: 0 }], nitrogen: { demandKg: 0, fixedKg: 0, balanceKg: 0 }, phosphorus: "low", potassium: "low", labor: "low", cares: [], sharedPests: [] };
  }

  // ---------- reglas comunes ----------
  const legumes = ids.filter((id) => CROPS[id].fixesNitrogen);
  if (legumes.length) pros.push({ key: "legumeN", params: { crops: legumes.map(names).join(", "), kg: fixed }, weight: 12 });
  else if (ids.length > 1) cons.push({ key: "noLegume", weight: 8 });

  if (fixed - demand < -200) cons.push({ key: "nDeficit", params: { kg: demand - fixed }, weight: 10 });
  else if (fixed >= demand * 0.5 && demand > 0) pros.push({ key: "nBalanced", weight: 6 });

  const pestCounts = new Map<string, number>();
  ag.forEach((x) => [...x.pests, ...x.diseases].forEach((p) => pestCounts.set(p, (pestCounts.get(p) ?? 0) + 1)));
  const sharedPests = [...pestCounts.entries()].filter(([, n]) => n > 1).map(([p]) => p);

  const highLabor = ids.filter((_, i) => ag[i].labor === "high");
  if (highLabor.length >= 2) cons.push({ key: "laborPeak", params: { crops: highLabor.map(names).join(", ") }, weight: 6 });

  const depths = ids.map((id) => RAW.crops[id].rootDepthM);
  if (ids.length > 1 && Math.max(...depths) - Math.min(...depths) >= 0.4) pros.push({ key: "roots", weight: 7 });

  if (mode === "rotation") {
    // familias seguidas (incluye el cierre del ciclo: el último antes del primero del año siguiente)
    let repeated = false;
    for (let i = 0; i < fam.length && fam.length > 1; i++) if (fam[i] === fam[(i + 1) % fam.length]) repeated = true;
    if (repeated) cons.push({ key: "sameFamily", weight: 14 });
    else if (new Set(fam).size >= 3) pros.push({ key: "breaksPests", weight: 10 });
    else if (new Set(fam).size === 2) pros.push({ key: "twoFamilies", weight: 5 });

    // leguminosa antes de un cultivo exigente: deja nitrógeno al siguiente
    for (let i = 0; i < ids.length && ids.length > 1; i++) {
      const cur = ag[i];
      const next = ag[(i + 1) % ids.length];
      if (cur.nFixKg > 0 && next.nDemandKg >= 150) pros.push({ key: "legumeBeforeHungry", params: { a: names(ids[i]), b: names(ids[(i + 1) % ids.length]) }, weight: 10 });
      if (cur.nDemandKg >= 150 && next.nDemandKg >= 150) cons.push({ key: "hungryAfterHungry", params: { a: names(ids[i]), b: names(ids[(i + 1) % ids.length]) }, weight: 8 });
    }
    if (ids.includes("papa") && fam.filter((f) => f === "solanacea").length > 1) cons.push({ key: "potatoRepeat", weight: 12 });

    const overlap = overlapDays({ id: "x", name: "x", isCurrent: false, crops });
    if (overlap > 0) cons.push({ key: "overlap", params: { days: overlap }, weight: 10 });
    const bare = bareMonths({ id: "x", name: "x", isCurrent: false, crops });
    if (bare.length >= 3) cons.push({ key: "bareMonths", params: { n: bare.length }, weight: 8 });
    else if (bare.length === 0) pros.push({ key: "alwaysCovered", weight: 8 });
    if (sharedPests.length && fam.length > 1) cons.push({ key: "sharedPestsRotation", params: { n: sharedPests.length }, weight: 4 });
  } else {
    // asociación: compañeros conocidos
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const c = companion(ids[i], ids[j]);
        if (!c) continue;
        const pt = { key: `companion.${c.reason}`, params: { a: names(ids[i]), b: names(ids[j]) }, weight: Math.abs(c.effect) * 9 };
        (c.effect > 0 ? pros : cons).push(pt);
      }
    if (new Set(fam).size < fam.length) cons.push({ key: "sameFamilyTogether", weight: 12 });
    const hungry = ids.filter((_, i) => ag[i].nDemandKg >= 150);
    if (hungry.length >= 2) cons.push({ key: "nCompetition", params: { crops: hungry.map(names).join(", ") }, weight: 10 });
    const heights = new Set(ag.map((x) => x.height));
    if (heights.size >= 2) pros.push({ key: "heights", weight: 6 });
    const thirsty = ids.filter((id) => RAW.crops[id].kc.mid >= 1.1);
    if (thirsty.length >= 2) cons.push({ key: "waterCompetition", params: { crops: thirsty.map(names).join(", ") }, weight: 7 });
    if (ag.some((x) => x.weedSensitive) && ids.length > 1) cons.push({ key: "weedSensitive", params: { crops: ids.filter((_, i) => ag[i].weedSensitive).map(names).join(", ") }, weight: 5 });
    // ciclos que no coinciden: solo se asocian si comparten meses en el campo
    if (ids.length > 1) {
      const cover = crops.map((rc) => {
        const set = new Set<number>();
        cropSegments(rc).forEach((s) => {
          for (let d = s.start; d < s.end; d++) set.add(d);
        });
        return set;
      });
      const shared = [...cover[0]].filter((d) => cover.slice(1).every((c) => c.has(d))).length;
      if (shared < 30) cons.push({ key: "noSharedSeason", weight: 12 });
    }
    if (sharedPests.length) cons.push({ key: "sharedPestsTogether", params: { n: sharedPests.length }, weight: 6 });
  }

  const raw = 60 + pros.reduce((a, p) => a + p.weight, 0) - cons.reduce((a, p) => a + p.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    verdict: score >= 65 ? "good" : score >= 45 ? "fair" : "poor",
    pros: pros.sort((a, b) => b.weight - a.weight),
    cons: cons.sort((a, b) => b.weight - a.weight),
    nitrogen: { demandKg: demand, fixedKg: fixed, balanceKg: fixed - demand },
    phosphorus: maxLevel(ag.map((x) => x.P)),
    potassium: maxLevel(ag.map((x) => x.K)),
    labor: maxLevel(ag.map((x) => x.labor)),
    cares: ids.map((id, i) => ({ cropId: id, keys: ag[i].cares })),
    sharedPests,
  };
}
